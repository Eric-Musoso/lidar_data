/**
 * types.ts — Shared TypeScript Type Definitions
 *
 * This file defines all the data structures (interfaces and types) used
 * throughout the application. Centralizing types in one file makes them
 * easy to import and keeps the codebase consistent.
 *
 * TYPESCRIPT SYNTAX EXPLAINED:
 *
 * `interface` — Defines the shape of an object. Any object claiming to be
 *   this type MUST have all required properties with the correct types.
 *   Properties with `?` are optional. Example:
 *     interface Person { name: string; age?: number; }
 *
 * `type` — Creates a type alias. Can represent unions, primitives, or complex
 *   types that interfaces can't express. Example:
 *     type Color = 'red' | 'green' | 'blue';  // Union of string literals
 *
 * `Float32Array` / `Uint8Array` — Typed arrays for efficient binary data.
 *   Unlike regular JS arrays, every element must be the same numeric type
 *   and they have a fixed length. They're essential for GPU rendering
 *   because WebGL needs typed arrays, not regular JS arrays.
 */

// ─── Point Cloud Data ────────────────────────────────────────────────
// This is the core data structure produced by the LIDAR loader.
// It holds all point positions and attributes after parsing and reprojection.

export interface PointCloudData {
  /**
   * Flat array of XYZ positions: [dx0, dy0, z0, dx1, dy1, z1, ...]
   * dx/dy are OFFSETS from coordinateOrigin (in degrees), z is meters.
   * We use offsets instead of absolute coordinates to avoid Float32 precision
   * loss — geographic coordinates like 6.9531° would lose precision in Float32.
   */
  positions: Float32Array;

  /**
   * The reference point [longitude, latitude, 0] that positions are relative to.
   * deck.gl adds this origin back when rendering, so positions stay precise.
   */
  coordinateOrigin: [number, number, number];

  /** RGBA color per point: [r0,g0,b0,a0, r1,g1,b1,a1, ...] or null if no RGB in file */
  colors: Uint8Array | null;

  /** Laser return intensity per point (normalized 0–1), or null */
  intensities: Float32Array | null;

  /** ASPRS classification code per point (ground=2, vegetation=3-5, building=6, etc.) */
  classifications: Uint8Array | null;

  /** Total number of points in this cloud */
  pointCount: number;

  /** Bounding box in the reprojected coordinate space (WGS84 lng/lat + meters Z) */
  bounds: {
    minX: number;
    maxX: number; // Longitude range
    minY: number;
    maxY: number; // Latitude range
    minZ: number;
    maxZ: number; // Elevation range (meters)
  };
}

// ─── Layer Definition ────────────────────────────────────────────────
// Represents a single loaded point cloud layer.

export interface Layer {
  id: string;
  name: string;
  source: 'remote' | 'local' | 'url';
  url?: string;
  file?: File;
  pointCloud: PointCloudData | null;
  visible: boolean;
  opacity: number;
  zOffset: number;
}

// ─── Cross Section Types ─────────────────────────────────────────────

export interface ProfilePoint {
  distance: number; // Distance from start of line in meters
  elevation: number; // Z value
  classification: number;
  intensity: number;
  color: [number, number, number]; // RGB
}

export type CrossSectionState =
  | { mode: 'idle' }
  | { mode: 'check_start' } // Waits for user to click start
  | { mode: 'check_end'; start: [number, number] } // Waits for user to click end
  | {
    mode: 'complete';
    start: [number, number];
    end: [number, number];
    width: number;
  };

// ─── Color Scheme ────────────────────────────────────────────────────
// Determines WHICH attribute to visualize as color.

export type ColorScheme = 'elevation' | 'intensity' | 'classification' | 'rgb';

// ─── Colormap Name ───────────────────────────────────────────────────
// For elevation/intensity, determines the color gradient used.
// These are named after popular scientific colormaps from matplotlib.

export type ColormapName =
  | 'viridis' // Purple → green → yellow (perceptually uniform)
  | 'plasma' // Purple → orange → yellow
  | 'inferno' // Black → purple → orange → yellow
  | 'magma' // Black → purple → pink → white
  | 'cividis' // Blue → yellow (colorblind safe)
  | 'turbo' // Blue → green → yellow → red (rainbow-like)
  | 'jet' // Blue → cyan → yellow → red (classic)
  | 'rainbow' // Blue → green → yellow → red → purple
  | 'coolwarm' // Blue → white → red (diverging)
  | 'terrain' // Green → brown → white (topographic)
  | 'gray'; // Black → white

// ─── View Settings ───────────────────────────────────────────────────
// All the user-adjustable visualization parameters.

export interface ViewSettings {
  colorScheme: ColorScheme;
  colormap: ColormapName;
  pointSize: number; // Size of each rendered point (pixels)
  opacity: number; // 0 (transparent) to 1 (opaque)
  zOffset: number; // Vertical offset in meters
  classificationVisibility: Record<number, boolean>; // toggle specific classes
  fov: number; // Field of View (degrees)
  pointBudget: number; // Maximum points to render
  brightness: number; // -1 to 1
  contrast: number; // -1 to 1
  saturation: number; // -1 to 1
}

// ─── Dataset Definition ──────────────────────────────────────────────
// Describes one LIDAR dataset that can be loaded.

export interface Dataset {
  id: string; // Unique identifier
  label: string; // Display name in the UI
  url: string; // Path to the .laz file (relative to public/)
}
