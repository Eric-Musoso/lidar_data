/**
 * vite.config.ts — Vite Build Configuration
 *
 * Vite is a modern frontend build tool that provides:
 * - Instant dev server startup (no bundling during development)
 * - Hot Module Replacement (HMR) for fast feedback
 * - Optimized production builds using Rollup under the hood
 *
 * This config file tells Vite how to process our project.
 */

import { defineConfig } from 'vite';  // Type-safe config helper
import react from '@vitejs/plugin-react'; // Enables React Fast Refresh (HMR)

// defineConfig() provides autocomplete and type checking for the config object
export default defineConfig({
  base: '/lidar_data/',
  plugins: [
    react(), // Adds React support: JSX transform + Fast Refresh
  ],
});
