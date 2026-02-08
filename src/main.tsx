/**
 * main.tsx — Application Entry Point
 *
 * This is the very first file that runs when the app loads.
 * It does two things:
 *   1. Imports global styles
 *   2. Mounts the root React component (<App />) into the DOM
 *
 * SYNTAX EXPLAINED:
 * - `StrictMode` is a React wrapper that enables extra development warnings
 *   (double-renders in dev to catch side effects, warns about deprecated APIs).
 * - `createRoot()` is React 19's way of initializing the rendering engine.
 *   It replaces the older `ReactDOM.render()` from React 17 and below.
 * - The `!` after getElementById is TypeScript's "non-null assertion" —
 *   it tells the compiler "I guarantee this element exists."
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
