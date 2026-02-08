/**
 * MapView.tsx — Map + Point Cloud Rendering Component
 *
 * This is the heart of the visualization. It:
 *   1. Creates a MapLibre GL map (the base map with streets/terrain)
 *   2. Overlays a deck.gl PointCloudLayer on top for LIDAR points
 *   3. Updates the layer whenever data or settings change
 *   4. Handles cross-section drawing tools
 */

import { useRef, useEffect, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css'; // MapLibre's required CSS
import { MapboxOverlay } from '@deck.gl/mapbox';
import { PointCloudLayer, LineLayer, ScatterplotLayer } from '@deck.gl/layers';
import { COORDINATE_SYSTEM } from '@deck.gl/core'; // PostProcessEffect
import type { Layer, ViewSettings, CrossSectionState } from '../types';
import { colorizePoints } from '../lib/colorize';
// import { brightnessContrastShader } from '../lib/shaders';
import './MapView.css';

// ─── Props Interface ─────────────────────────────────────────────────
interface Props {
  layers: Layer[];      // List of loaded layers
  settings: ViewSettings;            // Current visualization settings
  darkBasemap: boolean;              // Whether to use dark or light map style
  crossSection?: CrossSectionState;
  onMapClick?: (lngLat: [number, number]) => void;
  focusedLayerId?: string | null;
}

// ─── Basemap Style URLs ──────────────────────────────────────────────
const BASEMAPS = {
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
};

/**
 * MapView Component
 *
 * Renders the interactive map with LIDAR point cloud overlay.
 */
export default function MapView({ layers, settings, darkBasemap, crossSection, onMapClick, focusedLayerId }: Props) {
  // ── Refs: persist across re-renders without triggering them ──────
  const containerRef = useRef<HTMLDivElement>(null); // The <div> that holds the map
  const mapRef = useRef<maplibregl.Map | null>(null);        // MapLibre map instance
  const overlayRef = useRef<MapboxOverlay | null>(null);     // deck.gl overlay instance

  // ── Effect 1: Initialize the map (runs once on mount) ───────────
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: darkBasemap ? BASEMAPS.dark : BASEMAPS.light,
      center: [7.6261, 51.9607], // Münster, Germany
      zoom: 14,
      pitch: 50,
      maxPitch: 85,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-left');

    const overlay = new MapboxOverlay({
      interleaved: false,
      layers: [],
      // Effects property is passed via setProps in useEffect, but can be init here too.
      // Actually MapboxOverlay constructor can take effects.
    });

    map.addControl(overlay as unknown as maplibregl.IControl);

    mapRef.current = map;
    overlayRef.current = overlay;

    return () => {
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, []);

  // ── Effect 2: Switch basemap style ──────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(darkBasemap ? BASEMAPS.dark : BASEMAPS.light);
  }, [darkBasemap]);

  // ── Effect 3b: Update FOV (Hack specific to MapLibre/Mapbox) ────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // MapLibre's FOV is stored in the internal transform object.
    const transform = (map as any).transform;
    if (transform) {
      try {
        // Attempt to set FOV. This might fail on newer MapLibre versions.
        // If it fails, we catch it and ignore it to prevent crash.
        transform.fov = settings.fov;
        map.triggerRepaint();
      } catch (e) {
        console.warn('Could not set map FOV:', e);
      }
    }
  }, [settings.fov]);

  // ── Memoized layer builder ──────────────────────────────────────
  const deckLayers = useMemo(() => {
    const pointCloudLayers = (layers || [])
      .filter((layer) => layer.visible && layer.pointCloud)
      .map((layer) => {
        const pointCloud = layer.pointCloud!;
        const layerSettings = {
          ...settings,
          opacity: layer.opacity,
        };
        const colors = colorizePoints(pointCloud, layerSettings);

        return new PointCloudLayer({
          id: `lidar-${layer.id}-${settings.colorScheme}-${settings.colormap}`,
          data: {
            length: Math.min(pointCloud.pointCount, settings.pointBudget),
            attributes: {
              getPosition: { value: pointCloud.positions, size: 3 },
              getColor: { value: colors, size: 4 },
            },
          },
          coordinateSystem: COORDINATE_SYSTEM.LNGLAT_OFFSETS,
          coordinateOrigin: pointCloud.coordinateOrigin,
          pointSize: settings.pointSize,
          opacity: layer.opacity,
          modelMatrix: [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, layer.zOffset + settings.zOffset, 1
          ],
          sizeUnits: 'pixels',
          getNormal: [0, 0, 1],
          updateTriggers: {
            getColor: [settings.colorScheme, settings.colormap, settings.classificationVisibility],
          },
        });
      });

    // Add Cross Section Visuals
    const overlays: any[] = [];
    if (crossSection) {
      if (crossSection.mode !== 'idle' && 'start' in crossSection) {
        // Start point (Green)
        overlays.push(
          new ScatterplotLayer({
            id: 'cross-section-start',
            data: [crossSection.start],
            getPosition: (d: any) => d,
            getRadius: 10,
            getFillColor: [0, 255, 0],
            pickable: false,
            radiusMinPixels: 5
          })
        );
      }
      if (crossSection.mode === 'complete' && crossSection.end) {
        // End point (Red)
        overlays.push(
          new ScatterplotLayer({
            id: 'cross-section-end',
            data: [crossSection.end],
            getPosition: (d: any) => d,
            getRadius: 10,
            getFillColor: [255, 0, 0],
            pickable: false,
            radiusMinPixels: 5
          })
        );
        // Line (Yellow)
        overlays.push(
          new LineLayer({
            id: 'cross-section-line',
            data: [{ source: crossSection.start, target: crossSection.end }],
            getSourcePosition: (d: any) => d.source,
            getTargetPosition: (d: any) => d.target,
            getColor: [255, 255, 0],
            getWidth: 3,
            widthMinPixels: 2
          })
        );
      }
    }

    return [...pointCloudLayers, ...overlays];
  }, [layers, settings, crossSection]);

  // ── Memoized Effects ────────────────────────────────────────────
  /*
  const effects = useMemo(() => {
    const postProcessEffect = new PostProcessEffect(brightnessContrastShader, {
        brightness: settings.brightness,
        contrast: settings.contrast,
        saturation: settings.saturation
    });
    return [postProcessEffect];
  }, [settings.brightness, settings.contrast, settings.saturation]);
  */
  const effects: any[] = [];

  // ── Effect 4: Update deck.gl overlay ─────────────────────────────
  useEffect(() => {
    const overlay = overlayRef.current;
    if (overlay) {
      overlay.setProps({
        layers: deckLayers,
        effects: effects, // Apply post-processing effects
        // Click handler for deck.gl to capture map clicks
        onClick: (info: any) => {
          if (onMapClick && info.coordinate) {
            onMapClick([info.coordinate[0], info.coordinate[1]]);
          }
        }
      });
    }
  }, [deckLayers, effects, onMapClick]);

  // ── Effect 5: Fly to data when loaded OR when focused ───────────
  // We combine these because "loaded" is effectively "focused" implicitly.
  const lastLayerIdRef = useRef<string | null>(null);

  // Handle explicit focus requests
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusedLayerId) return;

    const layer = layers?.find(l => l.id === focusedLayerId);
    if (layer && layer.pointCloud) {
      map.flyTo({
        center: [
          layer.pointCloud.coordinateOrigin[0],
          layer.pointCloud.coordinateOrigin[1],
        ],
        zoom: 15,
        pitch: 50,
        duration: 2000,
      });
    }
  }, [focusedLayerId, layers]);

  // Handle auto-focus on load (only new layers)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layers || layers.length === 0) return;

    const lastLayer = layers[layers.length - 1];
    if (lastLayer.id !== lastLayerIdRef.current && lastLayer.pointCloud) {
      map.flyTo({
        center: [
          lastLayer.pointCloud.coordinateOrigin[0],
          lastLayer.pointCloud.coordinateOrigin[1],
        ],
        zoom: 15,
        pitch: 50,
        duration: 1500,
      });
      lastLayerIdRef.current = lastLayer.id;
    }
  }, [layers]);

  return <div ref={containerRef} className="map-container" />;
}
