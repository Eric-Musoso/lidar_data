# Lidar Data Viewer

A high-performance web-based viewer for visualising large point cloud data (LAZ/LAS/PCD) directly in the browser. Built with [React](https://react.dev/), [deck.gl](https://deck.gl/), and [loaders.gl](https://loaders.gl/).

![Lidar Viewer Screenshot](screenshot.png) *(Add a screenshot here)*

## Features

*   **Load Large Datasets**: Efficiently parses and renders LAZ files with millions of points.
*   **3D Visualization**: Interactive 3D camera controls, terrain support, and smooth rendering.
*   **Styling Controls**:
    *   Color by Elevation, Intensity, Classification, or RGB.
    *   Adjust Point Size, Opacity, and Point Budget.
    *   A wide range of scientific colormaps (Viridis, Plasma, Turbo, etc.).
*   **Analysis Tools**:
    *   **Cross Section**: Draw lines to inspect vertical profiles.
    *   **Elevation Filter**: Slice the data by height.
    *   **Point Picking**: Inspect individual point coordinates and attributes.
*   **Drag & Drop**: Simply drag `.laz` files onto the browser window to visualize local data.

## Project Structure

```
lidar-viewer/
├── public/              # Static assets (images, sample data)
│   └── data/            # Place your .laz files here
├── src/
│   ├── components/      # React UI Components
│   │   ├── MapView.tsx  # Main 3D map component (deck.gl + MapLibre)
│   │   ├── Sidebar.tsx  # UI Controls (Visuals, Tools, Map layers)
│   │   └── ...
│   ├── lib/             # Core Logic
│   │   ├── load-pointcloud.ts  # Parsing & Projection logic
│   │   ├── colorize.ts         # Color generation logic
│   │   └── ...
│   ├── App.tsx          # Main state management
│   ├── config.ts        # Configuration (Datasets, Default settings)
│   └── types.ts         # TypeScript definitions
├── package.json         # Dependencies and scripts
└── vite.config.ts       # Build configuration
```

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/YourUsername/lidar_data.git
cd lidar_data
```

### 2. Install Dependencies

Ensure you have [Node.js](https://nodejs.org/) (version 18 or higher) installed.

```bash
npm install
```

### 3. Run Locally

Start the development server:

```bash
npm run dev
```

Open your browser at `http://localhost:5173`.

### 4. Build for Production

To create a production-ready build:

```bash
npm run build
```

To extract the files for manual hosting, check the `dist/` folder.

### 5. Deploy to GitHub Pages

This project is configured to deploy easily to GitHub Pages.

1.  Make sure your `vite.config.ts` has the correct `base` URL (matches your repo name).
2.  Run the deploy script:

```bash
npm run deploy
```

## Configuration

To add your own datasets:

1.  Place your `.laz` files in the `public/data/` folder.
2.  Open `src/config.ts`.
3.  Add a new entry to the `DATASETS` array:

```typescript
export const DATASETS: Dataset[] = [
  // ... existing items
  {
    id: 'my-new-scan',
    label: 'My City Scan',
    // Use helper to ensure correct path in production
    url: `${import.meta.env.BASE_URL}data/my-scan_file.laz`
  },
];
```

## Customization

*   **Colors**: Modify `src/lib/colorize.ts` to change how elevation/intensity is mapped to colors.
*   **UI**: Edit `src/components/Sidebar.tsx` to add new widgets or controls.
*   **Map Style**: Edit `src/components/MapView.tsx` to change the MapLibre basemap style.

## License

MIT
