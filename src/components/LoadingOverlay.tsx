/**
 * LoadingOverlay.tsx — Loading Indicator Component
 *
 * Displays a full-screen overlay with an animated spinner while
 * LIDAR data is being loaded and processed.
 *
 * REACT PATTERNS EXPLAINED:
 *
 * Conditional rendering: This component is rendered by the parent ONLY when
 *   loading is true: `{loading && <LoadingOverlay />}`. When loading becomes
 *   false, React removes this entire component from the DOM.
 *
 * `interface Props` — Even for simple components, defining props explicitly
 *   documents what the component expects and enables TypeScript checking.
 *
 * `Math.round(progress * 100)` — Converts 0–1 progress to 0–100 for display.
 *   Math.round() removes decimal places (0.567 → 57, not 56.7).
 *
 * CSS-in-JSX: The animation is done with CSS classes defined in the companion
 *   .css file. React just applies the class names; CSS handles the animation.
 */

import './LoadingOverlay.css';

interface Props {
  progress: number; // Loading progress from 0 to 1
}

export default function LoadingOverlay({ progress }: Props) {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        {/* Spinner: animated via CSS @keyframes */}
        <div className="loading-spinner" />

        <h2 className="loading-title">Loading LIDAR Data</h2>

        {/* Progress bar container */}
        <div className="loading-progress-bar">
          {/*
            Inline style with dynamic width:
            `style={{ width: `${value}%` }}` is how React applies dynamic CSS.
            Template literal `${...}` embeds a JS expression inside a string.
            The inner {} is the style object, the outer {} is the JSX expression.
          */}
          <div
            className="loading-progress-fill"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>

        <p className="loading-percent">{Math.round(progress * 100)}%</p>
      </div>
    </div>
  );
}
