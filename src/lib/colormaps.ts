/**
 * colormaps.ts — Scientific Color Gradient Definitions
 *
 * A colormap maps a normalized value (0 to 1) to an RGB color.
 * These are used to visualize elevation and intensity data —
 * for example, low elevations might be purple and high elevations yellow.
 *
 * Each colormap is an array of "color stops" — [position, R, G, B] tuples.
 * To get the color at any value, we interpolate between the two nearest stops.
 *
 * SYNTAX EXPLAINED:
 *
 * `as const` — Makes the array deeply readonly and narrows types to literal
 *   values. Without it, TypeScript would type `[0, 68, 1, 84]` as `number[]`.
 *   With `as const`, it becomes `readonly [0, 68, 1, 84]` — a fixed-length tuple.
 *
 * `Record<string, T>` — A TypeScript utility type that creates an object type
 *   where all keys are strings and all values are type T.
 *   Record<ColormapName, ColorStop[]> means: { viridis: ColorStop[], plasma: ColorStop[], ... }
 *
 * `readonly` — Prevents modification after creation. This is good practice
 *   for constant data that should never change at runtime.
 */

import type { ColormapName } from '../types';

// A color stop: [position (0-1), red (0-255), green (0-255), blue (0-255)]
export type ColorStop = readonly [number, number, number, number];

/**
 * Colormap definitions — each is an array of color stops.
 * Position values go from 0.0 (minimum) to 1.0 (maximum).
 * Colors are interpolated linearly between stops.
 */
export const COLORMAPS: Record<ColormapName, readonly ColorStop[]> = {
  // Viridis: perceptually uniform, colorblind-friendly (matplotlib default)
  viridis: [
    [0.0, 68, 1, 84],
    [0.1, 72, 35, 116],
    [0.2, 64, 67, 135],
    [0.3, 52, 94, 141],
    [0.4, 41, 120, 142],
    [0.5, 32, 144, 140],
    [0.6, 34, 167, 132],
    [0.7, 68, 190, 112],
    [0.8, 121, 209, 81],
    [0.9, 189, 222, 38],
    [1.0, 253, 231, 37],
  ],

  // Plasma: purple → orange → yellow
  plasma: [
    [0.0, 13, 8, 135],
    [0.1, 75, 3, 161],
    [0.2, 125, 3, 168],
    [0.3, 168, 34, 150],
    [0.4, 203, 70, 121],
    [0.5, 229, 107, 93],
    [0.6, 248, 148, 65],
    [0.7, 253, 195, 40],
    [0.8, 240, 228, 66],
    [0.9, 222, 244, 113],
    [1.0, 240, 249, 33],
  ],

  // Inferno: black → purple → orange → yellow (high contrast)
  inferno: [
    [0.0, 0, 0, 4],
    [0.1, 22, 11, 57],
    [0.2, 66, 10, 104],
    [0.3, 106, 23, 110],
    [0.4, 147, 38, 103],
    [0.5, 188, 55, 84],
    [0.6, 221, 81, 58],
    [0.7, 243, 118, 27],
    [0.8, 252, 165, 10],
    [0.9, 246, 215, 70],
    [1.0, 252, 255, 164],
  ],

  // Turbo: improved rainbow (better perceptual uniformity than jet)
  turbo: [
    [0.0, 48, 18, 59],
    [0.1, 67, 85, 189],
    [0.2, 45, 150, 228],
    [0.3, 24, 196, 193],
    [0.4, 68, 227, 135],
    [0.5, 147, 244, 73],
    [0.6, 209, 234, 43],
    [0.7, 249, 195, 35],
    [0.8, 253, 141, 33],
    [0.9, 228, 74, 25],
    [1.0, 163, 16, 16],
  ],

  // Magma: black → purple → pink → white
  magma: [
    [0.0, 0, 0, 4],
    [0.1, 23, 11, 58],
    [0.2, 66, 15, 117],
    [0.3, 114, 31, 129],
    [0.4, 163, 50, 120],
    [0.5, 211, 67, 94],
    [0.6, 248, 107, 78],
    [0.7, 254, 155, 87],
    [0.8, 252, 205, 127],
    [0.9, 252, 253, 191],
    [1.0, 252, 253, 255],
  ],

  // Cividis: Blue → Yellow (Colorblind safe)
  cividis: [
    [0.0, 0, 32, 77],
    [0.2, 0, 53, 107],
    [0.4, 65, 77, 107],
    [0.6, 124, 123, 120],
    [0.8, 190, 186, 118],
    [1.0, 255, 234, 70],
  ],

  // Jet: Blue → Cyan → Yellow → Red
  jet: [
    [0.0, 0, 0, 128],
    [0.125, 0, 0, 255],
    [0.375, 0, 255, 255],
    [0.625, 255, 255, 0],
    [0.875, 255, 0, 0],
    [1.0, 128, 0, 0],
  ],

  // Rainbow: Blue → Green → Yellow → Red → Purple
  rainbow: [
    [0.0, 0, 0, 255],
    [0.2, 0, 255, 255],
    [0.4, 0, 255, 0],
    [0.6, 255, 255, 0],
    [0.8, 255, 0, 0],
    [1.0, 255, 0, 255],
  ],

  // Coolwarm: Blue → White → Red (Diverging)
  coolwarm: [
    [0.0, 59, 76, 192],
    [0.25, 119, 154, 229],
    [0.5, 221, 221, 221],
    [0.75, 241, 142, 105],
    [1.0, 180, 4, 38],
  ],

  // Terrain: green → brown → white (geographic/topographic look)
  terrain: [
    [0.0, 51, 128, 51],
    [0.2, 102, 179, 102],
    [0.3, 179, 204, 102],
    [0.4, 204, 179, 102],
    [0.6, 179, 128, 77],
    [0.8, 204, 179, 153],
    [1.0, 255, 255, 255],
  ],

  // Gray: simple black-to-white gradient
  gray: [
    [0.0, 0, 0, 0],
    [1.0, 255, 255, 255],
  ],
};

/**
 * sampleColormap — Get the RGB color at a given position in a colormap.
 *
 * @param name  — Which colormap to sample (e.g., 'viridis')
 * @param t     — Position in the gradient, 0.0 to 1.0
 * @returns     — [red, green, blue] each 0–255
 *
 * HOW IT WORKS:
 * 1. Clamp t to [0, 1] to handle out-of-range values
 * 2. Find the two color stops that bracket the value t
 * 3. Linearly interpolate RGB between those two stops
 *
 * Linear interpolation formula: result = a + (b - a) * fraction
 * where `fraction` is how far between the two stops we are (0 to 1).
 */
export function sampleColormap(
  name: ColormapName,
  t: number
): [number, number, number] {
  const stops = COLORMAPS[name];

  // Clamp t to valid range
  // Math.max/min ensures we don't go below 0 or above 1
  t = Math.max(0, Math.min(1, t));

  // Find the two stops that bracket our value
  for (let i = 0; i < stops.length - 1; i++) {
    const [pos0, r0, g0, b0] = stops[i];
    const [pos1, r1, g1, b1] = stops[i + 1];

    if (t >= pos0 && t <= pos1) {
      // Calculate how far between the two stops we are (0 to 1)
      const fraction = (t - pos0) / (pos1 - pos0);

      // Linear interpolation: lerp(a, b, f) = a + (b - a) * f
      return [
        Math.round(r0 + (r1 - r0) * fraction),
        Math.round(g0 + (g1 - g0) * fraction),
        Math.round(b0 + (b1 - b0) * fraction),
      ];
    }
  }

  // Fallback: return the last stop's color
  const last = stops[stops.length - 1];
  return [last[1], last[2], last[3]];
}
