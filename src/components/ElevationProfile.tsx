import { useEffect, useRef } from 'react';
import type { ProfilePoint } from '../types';
import './ElevationProfile.css';

interface Props {
    data: ProfilePoint[];
    width?: number;
    height?: number;
}

export default function ElevationProfile({ data, width = 600, height = 200 }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || data.length === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Handle high-DPI displays
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        // Clear background
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, width, height);

        // Calculate bounds
        let minDist = Infinity, maxDist = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        for (const p of data) {
            if (p.distance < minDist) minDist = p.distance;
            if (p.distance > maxDist) maxDist = p.distance;
            if (p.elevation < minZ) minZ = p.elevation;
            if (p.elevation > maxZ) maxZ = p.elevation;
        }

        // Add padding to Z
        const zRange = maxZ - minZ;
        minZ -= zRange * 0.1;
        maxZ += zRange * 0.1;

        // Draw points
        const distRange = maxDist - minDist || 1;
        const elevRange = maxZ - minZ || 1;

        data.forEach((p) => {
            const x = ((p.distance - minDist) / distRange) * width;
            // Invert Y because canvas Y is top-down
            const y = height - ((p.elevation - minZ) / elevRange) * height;

            ctx.fillStyle = `rgb(${p.color[0]}, ${p.color[1]}, ${p.color[2]})`;
            ctx.fillRect(x, y, 2, 2); // 2x2 pixel point
        });

        // Draw axes/labels (simple)
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(width, height);
        ctx.stroke();

        ctx.fillStyle = '#888';
        ctx.font = '10px sans-serif';
        ctx.fillText(`${minZ.toFixed(1)}m`, 5, height - 5);
        ctx.fillText(`${maxZ.toFixed(1)}m`, 5, 10);
        ctx.fillText(`${minDist.toFixed(1)}m`, 0, height - 5);
        ctx.fillText(`${maxDist.toFixed(1)}m`, width - 30, height - 5);

    }, [data, width, height]);

    return (
        <div className="elevation-profile">
            <canvas ref={canvasRef} />
        </div>
    );
}
