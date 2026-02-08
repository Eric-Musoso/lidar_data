/**
 * Sidebar.tsx — Now split into floating panels
 */

import type {
  ViewSettings,
  ColorScheme,
  ColormapName,
  Dataset,
  PointCloudData,
  Layer,
  CrossSectionState,
  ProfilePoint,
} from '../types';
import { getAvailableSchemes } from '../lib/colorize';
import { COLORMAPS } from '../lib/colormaps';
import LayerList from './LayerList';
import FileDropZone from './FileDropZone';
import UrlInput from './UrlInput';
import ElevationProfile from './ElevationProfile';
import { useState } from 'react';
import './Sidebar.css';

// ─── Props Interface ─────────────────────────────────────────────────
interface Props {
  datasets: Dataset[];
  activeDatasetId: string;
  onDatasetChange: (id: string) => void;
  onLoadDataset: () => void;
  onFileSelect: (file: File) => void;
  onUrlLoad: (url: string) => void;
  loading: boolean;
  layers: Layer[];
  onLayerUpdate: (id: string, updates: Partial<Layer>) => void;
  onLayerRemove: (id: string) => void;
  onZoomToLayer: (id: string) => void;
  settings: ViewSettings;
  onSettingsChange: (s: ViewSettings) => void;
  darkBasemap: boolean;
  onBasemapToggle: () => void;
  pointCount: number | null;
  pointCloud: PointCloudData | null;

  // Profile
  crossSection: CrossSectionState;
  profileData: ProfilePoint[];
  onStartProfile: () => void;
  onStopProfile: () => void;
}

/**
 * Sidebar Component (Floating Widget System)
 */
export default function Sidebar({
  datasets,
  activeDatasetId,
  onDatasetChange,
  onLoadDataset,
  onFileSelect,
  onUrlLoad,
  loading,
  layers,
  onLayerUpdate,
  onLayerRemove,
  onZoomToLayer,
  settings,
  onSettingsChange,
  darkBasemap,
  onBasemapToggle,
  pointCount,
  pointCloud,
  crossSection,
  profileData,
  onStartProfile,
  onStopProfile,
}: Props) {
  // Panel states
  const [showData, setShowData] = useState(true);
  const [showViz, setShowViz] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showBasemap, setShowBasemap] = useState(false);

  // Check which color schemes have data in the loaded point cloud
  const available = getAvailableSchemes(pointCloud);

  // Helper to generate gradient string
  const getGradient = (name: ColormapName) => {
    const stops = COLORMAPS[name];
    if (!stops) return 'none';
    const stopStr = stops
      // @ts-ignore
      .map(([pos, r, g, b]) => `rgb(${r},${g},${b}) ${pos * 100}%`)
      .join(', ');
    return `linear-gradient(to right, ${stopStr})`;
  };

  /**
   * ICON SVG COMPONENTS
   */
  const DataIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
  );

  // Shapes Icon (Triangle, Square, Circle) for Visualization
  const VizIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l9 16H3z" /> {/* Triangle */}
      <rect x="2" y="2" width="8" height="8" rx="1" /> {/* Square */}
      <circle cx="18" cy="6" r="4" /> {/* Circle */}
    </svg>
  );

  const ToolIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
  );

  // Grid Icon for Basemap
  const BasemapIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );

  const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
  );

  return (
    <>
      {/* ── 1. Data Window (Top Right) ───────────────────────────── */}
      <div className="panel-container panel-data">
        {showData ? (
          <div className="panel-content">
            <div className="panel-header">
              <h3 className="panel-title">Data Sources</h3>
              <button className="panel-close-btn" onClick={() => setShowData(false)}><CloseIcon /></button>
            </div>

            {/* Content */}
            <div className="control-group">
              <label className="control-label">Example Datasets</label>
              <div className="control-row-flex">
                <select
                  className="control-select"
                  value={activeDatasetId}
                  onChange={(e) => onDatasetChange(e.target.value)}
                >
                  {datasets?.map((ds) => (
                    <option key={ds.id} value={ds.id}>{ds.label}</option>
                  ))}
                </select>
                <button
                  className="control-button load-button-small"
                  onClick={onLoadDataset}
                  disabled={loading}
                >
                  Load
                </button>
              </div>
            </div>

            <div className="control-group">
              <label className="control-label">Upload File</label>
              <FileDropZone onFileSelect={onFileSelect} loading={loading} />
            </div>

            <div className="control-group">
              <label className="control-label">Load from URL</label>
              <UrlInput onUrlSubmit={onUrlLoad} loading={loading} />
            </div>

            <div className="control-group">
              <label className="control-label">Layers</label>
              <LayerList
                layers={layers}
                onLayerUpdate={onLayerUpdate}
                onLayerRemove={onLayerRemove}
                onZoomToLayer={onZoomToLayer}
              />
            </div>

            {pointCount !== null && (
              <div className="control-group stats">
                <span className="stat-label">Total Points</span>
                <span className="stat-value">{pointCount.toLocaleString()}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="widget-wrapper" style={{ alignItems: 'flex-end' }}>
            <button className="icon-btn" onClick={() => setShowData(true)} title="Data Sources">
              <DataIcon />
            </button>
            <span className="widget-label">Data</span>
          </div>
        )}
      </div>

      {/* ── LEFT DOCK (Viz -> Tools -> Basemap) ──────────────────── */}
      <div className="left-dock">

        {/* 1. Visualization Widget */}
        <div className="widget-wrapper">
          {showViz ? (
            <div className="panel-content">
              <div className="panel-header">
                <h3 className="panel-title">Visuals</h3>
                <button className="panel-close-btn" onClick={() => setShowViz(false)}><CloseIcon /></button>
              </div>

              {/* Scheme Select */}
              <div className="control-group">
                <label className="control-label">Color Scheme</label>
                <select
                  className="control-select"
                  value={settings.colorScheme}
                  onChange={(e) => onSettingsChange({ ...settings, colorScheme: e.target.value as ColorScheme })}
                >
                  <option value="elevation">Elevation</option>
                  <option value="intensity" disabled={!available.intensity}>Intensity</option>
                  <option value="classification" disabled={!available.classification}>Classification</option>
                  <option value="rgb" disabled={!available.rgb}>RGB</option>
                </select>
              </div>

              {/* Colormap + Legend */}
              {(settings.colorScheme === 'elevation' || settings.colorScheme === 'intensity') && (
                <div className="control-group">
                  <label className="control-label">Colormap</label>
                  <select
                    className="control-select"
                    value={settings.colormap}
                    onChange={(e) => onSettingsChange({ ...settings, colormap: e.target.value as ColormapName })}
                  >
                    <option value="viridis">Viridis</option>
                    <option value="plasma">Plasma</option>
                    <option value="magma">Magma</option>
                    <option value="inferno">Inferno</option>
                    <option value="cividis">Cividis</option>
                    <option value="turbo">Turbo</option>
                    <option value="jet">Jet</option>
                    <option value="rainbow">Rainbow</option>
                    <option value="coolwarm">Coolwarm</option>
                    <option value="terrain">Terrain</option>
                    <option value="gray">Grayscale</option>
                  </select>
                  <div style={{ marginTop: '12px', height: '12px', borderRadius: '4px', background: getGradient(settings.colormap), border: '1px solid rgba(255,255,255,0.2)' }} />
                </div>
              )}

              {/* Sliders */}
              <div className="control-group">
                <label className="control-label">Point Size <span>{settings.pointSize}px</span></label>
                <input type="range" min={1} max={10} step={0.5} value={settings.pointSize}
                  onChange={e => onSettingsChange({ ...settings, pointSize: Number(e.target.value) })} />
              </div>

              <div className="control-group">
                <label className="control-label">Opacity <span>{Math.round(settings.opacity * 100)}%</span></label>
                <input type="range" min={0.1} max={1} step={0.05} value={settings.opacity}
                  onChange={e => onSettingsChange({ ...settings, opacity: Number(e.target.value) })} />
              </div>

              <div className="control-group">
                <label className="control-label">Budget <span>{(settings.pointBudget / 1_000_000).toFixed(1)}M</span></label>
                <input type="range" min={100_000} max={5_000_000} step={100_000} value={settings.pointBudget}
                  onChange={e => onSettingsChange({ ...settings, pointBudget: Number(e.target.value) })} />
              </div>
            </div>
          ) : (
            <button className="icon-btn" onClick={() => setShowViz(true)} title="Visualization">
              <VizIcon />
            </button>
          )}
          <span className="widget-label">Visuals</span>
        </div>

        {/* 2. Tools Widget */}
        <div className="widget-wrapper">
          {showTools ? (
            <div className="panel-content">
              <div className="panel-header">
                <h3 className="panel-title">Tools</h3>
                <button className="panel-close-btn" onClick={() => setShowTools(false)}><CloseIcon /></button>
              </div>

              <div className="control-group">
                <p style={{ fontSize: '0.8rem', color: '#ccc', marginBottom: '12px' }}>
                  {crossSection.mode === 'idle' && 'Click to start drawing a cross-section profile.'}
                  {crossSection.mode === 'check_start' && 'Click map to set START point.'}
                  {crossSection.mode === 'check_end' && 'Click map to set END point.'}
                  {crossSection.mode === 'complete' && 'Profile generated.'}
                </p>
                {crossSection.mode === 'idle' ? (
                  <button className="control-button" onClick={onStartProfile}>Draw Profile</button>
                ) : (
                  <button className="control-button" onClick={onStopProfile} style={{ background: '#d32f2f' }}>Cancel / Clear</button>
                )}
              </div>

              {profileData.length > 0 && (
                <div className="control-group">
                  <label className="control-label">Elevation Profile</label>
                  <ElevationProfile data={profileData} width={260} height={120} />
                </div>
              )}
            </div>
          ) : (
            <button className="icon-btn" onClick={() => setShowTools(true)} title="Tools">
              <ToolIcon />
            </button>
          )}
          <span className="widget-label">Tools</span>
        </div>

        {/* 3. Basemap Widget */}
        <div className="widget-wrapper">
          {showBasemap ? (
            <div className="panel-content">
              <div className="panel-header">
                <h3 className="panel-title">Basemap</h3>
                <button className="panel-close-btn" onClick={() => setShowBasemap(false)}><CloseIcon /></button>
              </div>
              <div className="control-group">
                <div className="toggle-group">
                  <button
                    className={`toggle-button ${!darkBasemap ? 'active' : ''}`}
                    onClick={() => darkBasemap && onBasemapToggle()}
                  >Light</button>
                  <button
                    className={`toggle-button ${darkBasemap ? 'active' : ''}`}
                    onClick={() => !darkBasemap && onBasemapToggle()}
                  >Dark</button>
                </div>
              </div>
              <div className="control-group">
                <label className="control-label">FOV <span>{settings.fov}°</span></label>
                <input type="range" min={10} max={120} step={1} value={settings.fov}
                  onChange={e => onSettingsChange({ ...settings, fov: Number(e.target.value) })} />
              </div>
            </div>
          ) : (
            <button className="icon-btn" onClick={() => setShowBasemap(true)} title="Basemaps">
              <BasemapIcon />
            </button>
          )}
          <span className="widget-label">Map</span>
        </div>

      </div>
    </>
  );
}
