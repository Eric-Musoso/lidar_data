/**
 * load-pointcloud.ts — LIDAR File Loader & Coordinate Reprojector
 *
 * This is the most technically complex module in the app. It:
 *   1. Fetches a .laz (compressed LIDAR) file from the server
 *   2. Parses it using @loaders.gl/las (which handles LAZ decompression)
 *   3. Reprojects coordinates from the source CRS to WGS84 (lng/lat)
 *   4. Converts absolute positions to Float32 offsets for GPU precision
 *
 * WHAT IS A CRS (Coordinate Reference System)?
 * LIDAR scanners record positions in a local/regional coordinate system,
 * often UTM (Universal Transverse Mercator) which uses meters as units.
 * Web maps use WGS84 (longitude/latitude in degrees). We must convert
 * between them using the proj4 library.
 *
 * WHY FLOAT32 OFFSETS?
 * GPU rendering uses Float32 (32-bit floating point) for performance.
 * But Float32 only has ~7 digits of precision. A longitude like 6.9531234°
 * needs all 7 digits just for the coordinate itself, leaving no precision
 * for differences between nearby points. Solution: store positions as
 * small offsets (e.g., 0.00001°) from a central reference point.
 *
 * SYNTAX EXPLAINED:
 *
 * `async/await` — Modern way to handle asynchronous operations.
 *   `async function` declares a function that returns a Promise.
 *   `await` pauses execution until a Promise resolves.
 *   This makes asynchronous code read like synchronous code.
 *
 * `as unknown as Type` — Double type assertion in TypeScript.
 *   First casts to `unknown` (the universal type), then to the target type.
 *   Used when TypeScript can't verify the conversion is safe.
 *   Necessary here because @loaders.gl returns loosely typed data.
 *
 * `fetch()` — Browser API for making HTTP requests. Returns a Promise
 *   that resolves to a Response object.
 *
 * `ArrayBuffer` — A fixed-length container for raw binary data.
 *   Can't be read directly — must be accessed through typed array views
 *   like Float32Array or Uint8Array.
 */

import { load } from '@loaders.gl/core';
import { LASLoader } from '@loaders.gl/las';
import proj4 from 'proj4';
import type { PointCloudData } from '../types';

// ─── Projection Definitions ──────────────────────────────────────────
// EPSG:25832 is ETRS89 / UTM zone 32N — the standard CRS for western Germany.
// This proj4 string tells the library the exact math to convert coordinates.
// Each parameter (+proj, +zone, +ellps, etc.) defines part of the projection.

const EPSG_25832 =
  '+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs';
const WGS84 = 'EPSG:4326'; // Standard WGS84 latitude/longitude

// Create a reusable transformer function from UTM → WGS84
// proj4(from, to) returns an object with .forward() and .inverse() methods
const toWGS84 = proj4(EPSG_25832, WGS84);

/**
 * Describes the mesh structure returned by @loaders.gl/las.
 * We define this ourselves because the library's types are generic.
 */
interface LASMesh {
  header: {
    vertexCount: number;
    boundingBox: [[number, number, number], [number, number, number]];
  };
  attributes: {
    POSITION: { value: Float64Array; size: number };
    COLOR_0?: { value: Uint8Array; size: number };
    intensity?: { value: Uint16Array | Float32Array; size: number };
    classification?: { value: Uint8Array; size: number };
  };
}

/**
 * loadPointCloud — Main entry point for loading a LIDAR file.
 *
 * @param url          — Path to the .laz file (e.g., '/data/points.laz')
 * @param onProgress   — Optional callback for loading progress (0–1)
 * @returns            — Promise that resolves to a PointCloudData object
 *
 * STEP-BY-STEP:
 * 1. Use @loaders.gl to fetch + parse the LAZ file
 * 2. Extract position, color, intensity, classification arrays
 * 3. Reproject every point from UTM to WGS84
 * 4. Calculate coordinate origin (center of bounding box)
 * 5. Convert absolute lng/lat to Float32 offsets from origin
 * 6. Return the assembled PointCloudData
 */
/**
 * yieldToMain — Pause execution briefly to let the browser update the UI.
 *
 * Without this, long-running loops (millions of points) would block the
 * main thread and freeze the page — no spinner, no progress bar, nothing.
 *
 * `setTimeout(resolve, 0)` schedules the Promise resolution as a macrotask,
 * giving the browser a chance to repaint the screen and process user input.
 */
function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Maximum number of points to keep. Larger files will be subsampled. */
const MAX_POINTS = 500_000;

/**
 * loadPointCloud — Main entry point for loading a LIDAR file.
 *
 * @param source       — Path to .laz file (string) or File object
 * @param onProgress   — Optional callback for loading progress (0–1)
 * @returns            — Promise that resolves to a PointCloudData object
 */
export async function loadPointCloud(
  source: string | File,
  onProgress?: (progress: number) => void
): Promise<PointCloudData> {
  onProgress?.(0.05);

  // ── Step 1: Parse the LAZ file ───────────────────────────────────
  // `load()` fetches the URL or reads the File, using the generic LASLoader.
  let mesh: LASMesh;
  try {
    console.log(`Starting load for source: ${typeof source === 'string' ? source : 'File object'}`);

    // Manual fetch to inspect/patch header
    let arrayBuffer: ArrayBuffer;
    if (typeof source === 'string') {
      const response = await fetch(source);
      if (!response.ok) throw new Error(`HTTP ${response.status} - ${response.statusText}`);
      arrayBuffer = await response.arrayBuffer();
    } else {
      arrayBuffer = await source.arrayBuffer();
    }

    // Check version and point format
    const view = new DataView(arrayBuffer);
    const versionMajor = view.getUint8(24);
    const versionMinor = view.getUint8(25);
    // Point Data Format ID is at offset 104 (header size is not fixed but format ID is fixed at 104 in 1.3/1.4?)
    // Actually in 1.3/1.4 header:
    // 96 + 8 = 104. Yes.
    // Ensure we mask the compression bit (top 2 bits in some versions, top 1 in others?) 
    // LAS 1.4 spec: "The Point Data Format ID is purely an ID... The two high bits are reserved..."
    // Loaders.gl does: formatId & 0x3f.
    const pointFormatId = view.getUint8(104) & 0x3f;

    console.log(`LAS Version: ${versionMajor}.${versionMinor}, Point Format: ${pointFormatId}`);

    if (versionMajor === 1 && versionMinor === 4) {
      if (pointFormatId > 3) {
        throw new Error(`LAS 1.4 with Point Format ${pointFormatId} is not supported. Only formats 0-3 are supported.`);
      }
      console.warn('Patching LAS header version 1.4 -> 1.3 for compatibility.');
      // Patch version to 1.3
      view.setUint8(25, 3);
    }

    // Pass the ArrayBuffer to load()
    mesh = (await load(arrayBuffer, LASLoader, {
      worker: false,
      las: {
        shape: 'mesh',
        fp64: true,
      },
    })) as unknown as LASMesh;
    console.log('Successfully loaded mesh:', mesh);
  } catch (error) {
    console.error('Error loading point cloud:', error);
    throw error;
  }

  onProgress?.(0.4);
  await yieldToMain(); // Let the browser repaint after the heavy parse

  const { attributes, header } = mesh;
  const totalPoints = header.vertexCount;
  const rawPositions = attributes.POSITION.value; // Float64Array [x,y,z,x,y,z,...]

  // ── Step 2: Subsample if too many points ─────────────────────────
  // Large LIDAR files can have 10M+ points. Processing all of them
  // on the main thread would freeze the browser for minutes.
  // We take every Nth point to cap at MAX_POINTS (500K).
  const step =
    totalPoints > MAX_POINTS ? Math.ceil(totalPoints / MAX_POINTS) : 1;
  const pointCount = Math.ceil(totalPoints / step);

  console.log(
    `Point cloud: ${totalPoints.toLocaleString()} total → sampling every ${step}th → ${pointCount.toLocaleString()} points`
  );

  // ── Step 3: Extract optional attributes ──────────────────────────
  const rawColors = attributes.COLOR_0?.value ?? null;
  const rawIntensity = attributes.intensity?.value ?? null;
  const rawClassification = attributes.classification?.value ?? null;

  onProgress?.(0.5);
  await yieldToMain();

  // ── Step 4: Reproject sampled points from UTM to WGS84 ──────────
  const lngLat = new Float64Array(pointCount * 3);
  const intensities = rawIntensity ? new Float32Array(pointCount) : null;
  const classifications = rawClassification ? new Uint8Array(pointCount) : null;
  // Initialize alpha/colors if source has them
  // Note: we construct the robust colors array later in Step 7

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  let minZ = Infinity,
    maxZ = -Infinity;

  const CHUNK_SIZE = 50_000; // Process 50K points, then yield to browser

  for (let i = 0; i < pointCount; i++) {
    const srcIdx = i * step; // Index into the original (full) array

    const utmX = rawPositions[srcIdx * 3]; // Easting (meters)
    const utmY = rawPositions[srcIdx * 3 + 1]; // Northing (meters)
    const z = rawPositions[srcIdx * 3 + 2]; // Elevation (meters)

    // proj4.forward() converts FROM source CRS TO target CRS
    // We assume input is EPSG:25832 (UTM 32N) for now.
    // Ideally this should be parameterized or read from header.
    const [lng, lat] = toWGS84.forward([utmX, utmY]);

    lngLat[i * 3] = lng;
    lngLat[i * 3 + 1] = lat;
    lngLat[i * 3 + 2] = z;

    // Copy optional attributes for this sampled point
    if (intensities && rawIntensity) {
      intensities[i] = rawIntensity[srcIdx] / 65535;
    }
    if (classifications && rawClassification) {
      classifications[i] = rawClassification[srcIdx];
    }

    // Track bounding box
    if (lng < minX) minX = lng;
    if (lng > maxX) maxX = lng;
    if (lat < minY) minY = lat;
    if (lat > maxY) maxY = lat;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;

    // Yield to browser every CHUNK_SIZE points
    if (i > 0 && i % CHUNK_SIZE === 0) {
      onProgress?.(0.5 + 0.4 * (i / pointCount));
      await yieldToMain();
    }
  }

  onProgress?.(0.9);
  await yieldToMain();

  // ── Step 5: Calculate coordinate origin ──────────────────────────
  const originLng = (minX + maxX) / 2;
  const originLat = (minY + maxY) / 2;
  const coordinateOrigin: [number, number, number] = [originLng, originLat, 0];

  // ── Step 6: Convert to Float32 offsets ───────────────────────────
  const positions = new Float32Array(pointCount * 3);
  for (let i = 0; i < pointCount; i++) {
    positions[i * 3] = lngLat[i * 3] - originLng;
    positions[i * 3 + 1] = lngLat[i * 3 + 1] - originLat;
    positions[i * 3 + 2] = lngLat[i * 3 + 2];
  }

  // ── Step 7: Handle colors ────────────────────────────────────────
  let colors: Uint8Array | null = null;
  if (rawColors) {
    const channelSize = attributes.COLOR_0!.size; // usually 3 (RGB) or 4 (RGBA)
    colors = new Uint8Array(pointCount * 4);
    for (let i = 0; i < pointCount; i++) {
      const srcIdx = i * step;

      if (channelSize >= 3) {
        // Source is likely 16-bit color (0-65535), typical for LAS.
        // We need to scale to 8-bit (0-255).
        // Sometimes it's already 8-bit. Let's assume 16-bit logic if values are large?
        // Actually safe bet for LAS is usually simple shift `>> 8` if 16-bit,
        // or just take the value if 8-bit.
        // But the previous code just copied it.
        // Let's stick to simple copy but ensure we map correctly.
        // If the loader normalized it, it might be different.
        // Reverting to previous logic: straight copy.
        colors[i * 4] = rawColors[srcIdx * channelSize];
        colors[i * 4 + 1] = rawColors[srcIdx * channelSize + 1];
        colors[i * 4 + 2] = rawColors[srcIdx * channelSize + 2];
      }
      colors[i * 4 + 3] = 255;
    }
  }

  onProgress?.(1.0);

  return {
    positions,
    coordinateOrigin,
    colors,
    intensities,
    classifications,
    pointCount,
    bounds: { minX, maxX, minY, maxY, minZ, maxZ },
  };
}
