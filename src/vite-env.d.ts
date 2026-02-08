/**
 * vite-env.d.ts — TypeScript Declaration File for Vite
 *
 * WHAT IS A .d.ts FILE?
 * Declaration files tell TypeScript about types that exist at runtime
 * but aren't defined in .ts files. They don't produce any JavaScript output.
 *
 * WHAT DOES THIS DO?
 * - `/// <reference types="vite/client" />` pulls in Vite's type definitions,
 *   which teach TypeScript about:
 *     - import.meta.env (environment variables)
 *     - Importing CSS files (import './style.css')
 *     - Importing images (import logo from './logo.png')
 *     - Importing JSON (import data from './data.json')
 *     - Hot Module Replacement API (import.meta.hot)
 *
 * - The `declare module 'proj4'` block provides a minimal type declaration
 *   for the proj4 library, which doesn't ship its own TypeScript types.
 *   Without this, TypeScript would error on `import proj4 from 'proj4'`.
 */

/// <reference types="vite/client" />

declare module 'proj4' {
  function proj4(fromProjection: string, toProjection: string): {
    forward: (coord: [number, number]) => [number, number];
    inverse: (coord: [number, number]) => [number, number];
  };
  function proj4(
    fromProjection: string,
    toProjection: string,
    coord: [number, number]
  ): [number, number];
  export default proj4;
}
