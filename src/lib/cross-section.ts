import type { PointCloudData, ProfilePoint } from '../types';

/**
 * Extract points within a corridor defined by start and end points.
 * 
 * @param data Point cloud data
 * @param start [lng, lat]
 * @param end [lng, lat]
 * @param width Width of the corridor in meters (default 2m)
 * @returns Array of points with distance along the line and elevation
 */
export function getProfile(
    data: PointCloudData,
    start: [number, number],
    end: [number, number],
    width: number = 2
): ProfilePoint[] {
    const { positions, pointCount, coordinateOrigin, colors, intensities, classifications } = data;
    const [ox, oy] = coordinateOrigin;

    // Convert start/end to offset range (relative to origin)
    // 1 degree lat ~ 111,320 meters.
    // 1 degree lng ~ 111,320 * cos(lat) meters.

    const cosLat = Math.cos(oy * Math.PI / 180);
    const metersPerDegLat = 111320;
    const metersPerDegLng = 111320 * cosLat;

    const x1 = (start[0] - ox) * metersPerDegLng;
    const y1 = (start[1] - oy) * metersPerDegLat;

    const x2 = (end[0] - ox) * metersPerDegLng;
    const y2 = (end[1] - oy) * metersPerDegLat;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    const len = Math.sqrt(lenSq);

    if (len === 0) return [];

    // Unit vector along line
    const ux = dx / len;
    const uy = dy / len;

    // Normal vector
    const nx = -uy;
    const ny = ux;

    const halfWidth = width / 2;
    const profile: ProfilePoint[] = [];

    for (let i = 0; i < pointCount; i++) {
        // Point position in meters
        const px = positions[i * 3] * metersPerDegLng;
        const py = positions[i * 3 + 1] * metersPerDegLat;
        const z = positions[i * 3 + 2];

        // Vector from start to point
        const vx = px - x1;
        const vy = py - y1;

        // Project V onto U (distance along line)
        const dist = vx * ux + vy * uy;

        // Project V onto N (offset from line)
        const offset = vx * nx + vy * ny;

        if (dist >= 0 && dist <= len && Math.abs(offset) <= halfWidth) {
            let color: [number, number, number] = [255, 255, 255];
            if (colors) {
                color = [colors[i * 4], colors[i * 4 + 1], colors[i * 4 + 2]];
            }

            profile.push({
                distance: dist,
                elevation: z,
                color,
                intensity: intensities ? intensities[i] : 0,
                classification: classifications ? classifications[i] : 0
            });
        }
    }

    // Sort by distance
    profile.sort((a, b) => a.distance - b.distance);

    return profile;
}
