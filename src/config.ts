
import { Dataset, ViewSettings } from './types';

// ─── Default Settings ────────────────────────────────────────────────
export const DEFAULT_SETTINGS: ViewSettings = {
    colorScheme: 'elevation',
    colormap: 'viridis',
    pointSize: 2,
    opacity: 1,
    zOffset: 0,
    classificationVisibility: {},
    fov: 50,
    pointBudget: 1_000_000,
    brightness: 0,
    contrast: 0,
    saturation: 0,
    showTerrain: false,
    enablePointPicking: false,
    showElevationFilter: false,
    elevationRange: [0, 500],
};

// ─── Datasets ────────────────────────────────────────────────────────
// Using import.meta.env.BASE_URL ensuring correct path for Github Pages
export const DATASETS: Dataset[] = [
    { id: 'muenster-center', label: 'Münster Center', url: `${import.meta.env.BASE_URL}data/3dm_32_404_5758_1_nw.laz` },
    { id: 'muenster-east', label: 'Münster East', url: `${import.meta.env.BASE_URL}data/3dm_32_405_5758_1_nw.laz` },
];
