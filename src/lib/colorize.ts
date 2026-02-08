/**
 * colorize.ts — Point Cloud Color Generation
 *
 * This module converts raw point cloud attributes (elevation, intensity,
 * classification codes) into RGBA color arrays that deck.gl can render.
 *
 * SYNTAX EXPLAINED:
 *
 * `Uint8Array` — A typed array where every element is an unsigned 8-bit integer
 *   (0–255). Perfect for RGBA colors since each channel is 0–255.
 *   Created with `new Uint8Array(length)` — all values initialize to 0.
 *
 * `switch` statement — Tests a value against multiple cases. When a match is
 *   found, that case's code runs. `break` prevents falling through to the next
 *   case. `default` is the fallback if no case matches.
 *
 * Destructuring: `const [r, g, b] = someFunction()` — Unpacks array values
 *   into individual variables in one line. Same as:
 *   const result = someFunction(); const r = result[0]; const g = result[1]; ...
 */

import type { PointCloudData, ColorScheme, ViewSettings } from '../types';
import { sampleColormap } from './colormaps';

/**
 * ASPRS LAS Classification color mapping.
 * These are standard classification codes used in LIDAR data worldwide.
 * Each code maps to an [R, G, B] color tuple.
 *
 * Record<number, [number, number, number]> means:
 *   An object where keys are numbers and values are RGB tuples.
 */
const CLASSIFICATION_COLORS: Record<number, [number, number, number]> = {
  0: [180, 180, 180],  // Created/Never classified — gray
  1: [180, 180, 180],  // Unclassified — gray
  2: [139, 90, 43],    // Ground — brown
  3: [0, 200, 0],      // Low Vegetation — light green
  4: [0, 150, 0],      // Medium Vegetation — medium green
  5: [0, 100, 0],      // High Vegetation — dark green
  6: [255, 165, 0],    // Building — orange
  7: [255, 0, 0],      // Low Point (Noise) — red
  9: [0, 100, 255],    // Water — blue
  17: [200, 200, 0],   // Bridge Deck — yellow
};

/**
 * colorizePoints — Generate RGBA colors for every point in the cloud.
 *
 * @param data       — The loaded point cloud data
 * @param scheme     — Which attribute to colorize by
 * @param colormap   — Which color gradient to use (for elevation/intensity)
 * @returns          — Uint8Array of [R,G,B,A, R,G,B,A, ...] for all points
 *
 * HOW IT WORKS:
 * 1. Create output array: 4 bytes per point (RGBA)
 * 2. Based on the color scheme, loop through all points
 * 3. For each point, compute its color and write R,G,B,A into the array
 * 4. Return the completed color array
 *
 * The `i * 4` indexing works because each point has 4 color values:
 *   Point 0: colors[0]=R, colors[1]=G, colors[2]=B, colors[3]=A
 *   Point 1: colors[4]=R, colors[5]=G, colors[6]=B, colors[7]=A
 *   ...and so on. So point i starts at index i*4.
 */
export function colorizePoints(
  data: PointCloudData,
  settings: ViewSettings
): Uint8Array {
  const { colorScheme, colormap, classificationVisibility } = settings;
  const count = data.pointCount;
  // 4 channels per point: Red, Green, Blue, Alpha
  const colors = new Uint8Array(count * 4);

  switch (colorScheme) {
    // ── Elevation Coloring ───────────────────────────────────────────
    // Maps the Z (height) value to a color gradient.
    case 'elevation': {
      const { minZ, maxZ } = data.bounds;
      const range = maxZ - minZ || 1; // Avoid division by zero with `|| 1`

      for (let i = 0; i < count; i++) {
        // Z value is every 3rd element starting at index 2 (x,y,Z,x,y,Z,...)
        const z = data.positions[i * 3 + 2];
        // Normalize to 0–1 range: (value - min) / range
        const t = (z - minZ) / range;
        const [r, g, b] = sampleColormap(colormap, t);
        colors[i * 4] = r;
        colors[i * 4 + 1] = g;
        colors[i * 4 + 2] = b;
        colors[i * 4 + 3] = 255; // Fully opaque
      }
      break;
    }

    // ── Intensity Coloring ───────────────────────────────────────────
    // Maps the laser return intensity to a color gradient.
    case 'intensity': {
      if (!data.intensities) {
        // Fallback: if no intensity data, color everything gray
        fillSolidColor(colors, count, 180, 180, 180);
        break;
      }
      // Find min/max intensity for normalization
      let minI = Infinity,
        maxI = -Infinity;
      for (let i = 0; i < count; i++) {
        const v = data.intensities[i];
        if (v < minI) minI = v;
        if (v > maxI) maxI = v;
      }
      const range = maxI - minI || 1;

      for (let i = 0; i < count; i++) {
        const t = (data.intensities[i] - minI) / range;
        const [r, g, b] = sampleColormap(colormap, t);
        colors[i * 4] = r;
        colors[i * 4 + 1] = g;
        colors[i * 4 + 2] = b;
        colors[i * 4 + 3] = 255;
      }
      break;
    }

    // ── Classification Coloring ──────────────────────────────────────
    // Uses fixed colors per ASPRS classification code.
    case 'classification': {
      if (!data.classifications) {
        fillSolidColor(colors, count, 180, 180, 180);
        break;
      }
      for (let i = 0; i < count; i++) {
        const code = data.classifications[i];

        // Check visibility - if explicit false, hide it (alpha=0)
        // Default to visible if not in the map
        const isVisible = classificationVisibility[code] !== false;

        if (isVisible) {
          // Look up color for this classification code, default to gray
          const [r, g, b] = CLASSIFICATION_COLORS[code] ?? [180, 180, 180];
          colors[i * 4] = r;
          colors[i * 4 + 1] = g;
          colors[i * 4 + 2] = b;
          colors[i * 4 + 3] = 255;
        } else {
          // Transparent
          colors[i * 4 + 3] = 0;
        }
      }
      break;
    }

    // ── RGB Coloring ─────────────────────────────────────────────────
    // Uses the original colors captured by the LIDAR sensor.
    case 'rgb': {
      if (data.colors) {
        // If the source has RGBA (4-channel), copy directly
        // If it has RGB (3-channel), we need to add alpha
        colors.set(
          data.colors.length === count * 4 ? data.colors : data.colors
        );
        // Ensure alpha channel is set to 255
        for (let i = 0; i < count; i++) {
          colors[i * 4 + 3] = 255;
        }
      } else {
        // No RGB data: fall back to elevation coloring
        return colorizePoints(data, settings);
      }
      break;
    }
  }

  return colors;
}

/**
 * fillSolidColor — Fill the entire color array with one solid color.
 *
 * Helper function to avoid duplicating the loop logic.
 * The `function` keyword inside a module creates a module-scoped function —
 * not exported, so it's private to this file.
 */
function fillSolidColor(
  colors: Uint8Array,
  count: number,
  r: number,
  g: number,
  b: number
): void {
  for (let i = 0; i < count; i++) {
    colors[i * 4] = r;
    colors[i * 4 + 1] = g;
    colors[i * 4 + 2] = b;
    colors[i * 4 + 3] = 255;
  }
}

/**
 * getAvailableSchemes — Returns which color schemes are usable
 * based on what attributes exist in the loaded point cloud.
 * Elevation always works because every point has a Z coordinate.
 */
export function getAvailableSchemes(data: PointCloudData | null): Record<ColorScheme, boolean> {
  return {
    elevation: true,                          // Z always exists
    intensity: !!data?.intensities,           // !! converts to boolean
    classification: !!data?.classifications,
    rgb: !!data?.colors,
  };
}
