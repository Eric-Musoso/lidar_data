/**
 * App.tsx — Root Application Component
 *
 * This is the top-level component that:
 *   1. Manages all application state (which dataset, settings, loading status)
 *   2. Orchestrates data loading when the user picks a dataset
 *   3. Renders the layout: Sidebar + MapView + LoadingOverlay
 *
 * STATE MANAGEMENT PATTERN:
 * All state lives here in the root component and flows DOWN via props.
 * Child components report user interactions UP via callback props.
 * This is React's "unidirectional data flow" — the simplest architecture
 * for apps of this size. Larger apps might use Redux, Zustand, or Context.
 *
 * REACT HOOKS USED:
 *
 * `useState<T>(initial)` — Creates a reactive state variable.
 *   Returns `[value, setValue]` — a tuple of the current value and a setter.
 *   When setValue is called with a new value, React re-renders the component
 *   and all its children that depend on that state.
 *   The `<T>` generic specifies the type of the state value.
 *
 * `useEffect(callback, deps)` — Runs side effects.
 *   Here we use it to trigger data loading when the dataset changes.
 *
 * `useCallback(fn, deps)` — Memoizes callback functions.
 *   Prevents unnecessary re-renders of child components that receive these
 *   callbacks as props. Without useCallback, a new function reference would
 *   be created on every render, causing children to re-render even if
 *   nothing meaningful changed.
 *
 * TYPESCRIPT SYNTAX:
 *
 * `useState<PointCloudData | null>(null)` — Generic type parameter specifying
 *   that the state can be either a PointCloudData object OR null.
 *   The `|` is a union type: "this OR that".
 *
 * `() => void` — A function type that takes no arguments and returns nothing.
 *   Used for callback props like onBasemapToggle.
 */

import { useState, useCallback } from 'react';
import type { ViewSettings, Dataset, Layer, CrossSectionState, ProfilePoint } from './types';
import { loadPointCloud } from './lib/load-pointcloud';
import { getProfile } from './lib/cross-section';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import LoadingOverlay from './components/LoadingOverlay';
import './App.css';

// ─── Constants ───────────────────────────────────────────────────────
// We use a predefined list of datasets for now. In a real app,
// this could be fetched from an API.
const DATASETS: Dataset[] = [
  { id: 'muenster-center', label: 'Münster Center', url: '/data/3dm_32_404_5758_1_nw.laz' },
  { id: 'muenster-east', label: 'Münster East', url: '/data/3dm_32_405_5758_1_nw.laz' },
  { id: 'moers', label: 'Moers', url: '/data/3dm_32_356_5644_1_nw.laz' },
  { id: 'moers-north', label: 'Moers North', url: '/data/3dm_32_356_5645_1_nw.laz' },
];

// ─── Default Settings ────────────────────────────────────────────────
const DEFAULT_SETTINGS: ViewSettings = {
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
};

/**
 * App Component — The root of the component tree.
 *
 * COMPONENT LIFECYCLE:
 * 1. First render: Shows sidebar + empty map + no loading overlay
 * 2. useEffect fires: Starts loading the first dataset
 * 3. Loading: Shows overlay with progress bar
 * 4. Data loaded: Hides overlay, map displays point cloud
 * 5. User interactions: Settings/dataset changes trigger re-renders
 */
export default function App() {
  // ── State Declarations ──────────────────────────────────────────
  const [activeDatasetId, setActiveDatasetId] = useState(DATASETS[0].id);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [settings, setSettings] = useState<ViewSettings>(DEFAULT_SETTINGS);
  const [darkBasemap, setDarkBasemap] = useState(true);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Cross Section State
  const [crossSection, setCrossSection] = useState<CrossSectionState>({ mode: 'idle' });

  const [profileData, setProfileData] = useState<ProfilePoint[]>([]);

  // focusedLayerId is string | null
  const [focusedLayerId, setFocusedLayerId] = useState<string | null>(null);

  // ── Load Handler ────────────────────────────────────────────────
  const loadLayer = useCallback(async (source: string | File, name: string) => {
    if (loading) return;
    setLoading(true);
    setProgress(0);
    try {
      const data = await loadPointCloud(source, (p) => setProgress(p));
      const newLayer: Layer = {
        id: crypto.randomUUID(),
        name: name,
        source: typeof source === 'string' ? 'remote' : 'local',
        url: typeof source === 'string' ? source : undefined,
        pointCloud: data,
        visible: true,
        opacity: 1,
        zOffset: 0,
      };
      setLayers((prev) => [...prev, newLayer]);
    } catch (err: any) {
      console.error('Failed to load point cloud:', err);
      alert(`Failed to load point cloud: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const handleLoadDataset = useCallback(() => {
    const dataset = DATASETS.find((d) => d.id === activeDatasetId);
    if (!dataset) return;
    loadLayer(dataset.url, dataset.label);
  }, [activeDatasetId, loadLayer]);

  const handleFileSelect = useCallback((file: File) => {
    loadLayer(file, file.name);
  }, [loadLayer]);

  const handleUrlLoad = useCallback((url: string) => {
    // Extract name from URL or use generic
    const name = url.split('/').pop() || 'Remote Layer';
    loadLayer(url, name);
  }, [loadLayer]);


  // ── Layer Management ────────────────────────────────────────────
  const handleLayerUpdate = useCallback((id: string, updates: Partial<Layer>) => {
    setLayers((prev) =>
      prev.map((layer) => (layer.id === id ? { ...layer, ...updates } : layer))
    );
  }, []);

  const handleLayerRemove = useCallback((id: string) => {
    setLayers((prev) => prev.filter((layer) => layer.id !== id));
  }, []);

  // ── Memoized Callbacks ──────────────────────────────────────────
  const handleSettingsChange = useCallback((newSettings: ViewSettings) => {
    setSettings(newSettings);
  }, []);

  const handleBasemapToggle = useCallback(() => {
    setDarkBasemap((prev) => !prev);
  }, []);

  // ── Cross Section Logic ─────────────────────────────────────────
  const handleStartProfile = useCallback(() => {
    setCrossSection({ mode: 'check_start' });
    setProfileData([]);
  }, []);

  const handleStopProfile = useCallback(() => {
    setCrossSection({ mode: 'idle' });
    setProfileData([]);
  }, []);

  const handleMapClick = useCallback((lngLat: [number, number]) => {
    setCrossSection(prev => {
      if (prev.mode === 'check_start') {
        return { mode: 'check_end', start: lngLat };
      } else if (prev.mode === 'check_end') {
        // Calculate profile
        const start = prev.start;
        const end = lngLat;
        const contentLayer = layers.find(l => l.visible && l.pointCloud);
        if (contentLayer && contentLayer.pointCloud) {
          const profile = getProfile(contentLayer.pointCloud, start, end, 5.0);
          setProfileData(profile);
        }
        return { mode: 'complete', start, end, width: 5.0 };
      }
      return prev;
    });
  }, [layers]);

  // Calculate total points for display
  const totalPoints = layers.reduce(
    (sum, layer) => sum + (layer.pointCloud?.pointCount ?? 0),
    0
  );
  // Pass first loaded PointCloud for availability checks
  const firstCloud = layers.length > 0 ? layers[0].pointCloud : null;

  // ── Render ──────────────────────────────────────────────────────
  const handleZoomToLayer = useCallback((layerId: string) => {
    // Force a "change" even if clicking same layer, by resetting null first?
    // No, react state update batching might optimize it out.
    // Let's just set it. If it doesn't trigger, user can pan and click again?
    // Actually, if we set it to null then back, we need a timeout.
    // For now simple set.
    setFocusedLayerId(null);
    setTimeout(() => setFocusedLayerId(layerId), 10);
  }, []);

  return (
    <div className="app-layout">
      {/* Left sidebar — control panel */}
      <Sidebar
        datasets={DATASETS}
        activeDatasetId={activeDatasetId}
        onDatasetChange={setActiveDatasetId}
        onLoadDataset={handleLoadDataset}
        onFileSelect={handleFileSelect}
        onUrlLoad={handleUrlLoad}
        loading={loading}
        layers={layers}
        onLayerUpdate={handleLayerUpdate}
        onLayerRemove={handleLayerRemove}
        onZoomToLayer={handleZoomToLayer}
        settings={settings}
        onSettingsChange={handleSettingsChange}
        darkBasemap={darkBasemap}
        onBasemapToggle={handleBasemapToggle}
        pointCount={totalPoints}
        // Pass the first layer's point cloud for color scheme checks, or null
        pointCloud={firstCloud}

        // Profile props
        crossSection={crossSection}
        profileData={profileData}
        onStartProfile={handleStartProfile}
        onStopProfile={handleStopProfile}
      />

      <header className="app-title">
        <h1>Lidar Data Map Explore</h1>
      </header>

      {/* Main content area — the map */}
      <main className="app-map">
        <MapView
          layers={layers}
          settings={settings}
          darkBasemap={darkBasemap}
          crossSection={crossSection}
          onMapClick={handleMapClick}
          focusedLayerId={focusedLayerId}
        />
      </main>

      <footer className="app-credits">
        <p>
          <span>Created by Eric Musonera</span>
        </p>
      </footer>

      {/* Loading overlay */}
      {loading && <LoadingOverlay progress={progress} />}
    </div>
  );
}
