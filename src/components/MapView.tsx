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
import { DataFilterExtension } from '@deck.gl/extensions';
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
        transform.fov = settings.fov;
        map.triggerRepaint();
      } catch (e) {
        console.warn('Could not set map FOV:', e);
      }
    }
  }, [settings.fov]);

  // ── Effect 6: Handle 3D Terrain ─────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Wait for style to load before adding sources
    const enableTerrain = () => {
      if (settings.showTerrain) {
        if (!map.getSource('mapbox-dem')) {
          map.addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'https://demotiles.maplibre.org/terrain-tiles/tiles.json',
            tileSize: 256
          });
        }
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
      } else {
        if (map.getTerrain()) {
          map.setTerrain(null);
        }
      }
    };

    if (map.style && map.isStyleLoaded()) {
      enableTerrain();
    } else {
      map.once('style.load', enableTerrain);
    }
  }, [settings.showTerrain, darkBasemap]); // Re-run if basemap changes (style reload)


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

        // Prepare Filter
        const extensions = [];
        if (settings.showElevationFilter) {
          extensions.push(new DataFilterExtension({ filterSize: 1 }));
        }

        return new PointCloudLayer({
          id: `lidar-${layer.id}-${settings.colorScheme}-${settings.colormap}`,
          data: {
            length: Math.min(pointCloud.pointCount, settings.pointBudget),
            attributes: {
              getPosition: { value: pointCloud.positions, size: 3 },
              getColor: { value: colors, size: 4 },
              // For filtering, we need Z values.
              // Positions array is [dx, dy, z, dx, dy, z...].
              // We need the 3rd component (index 2).
              // Float32Array has 4 bytes per element.
              // Stride = 12 bytes (3 * 4).
              // Offset = 8 bytes (2 * 4) to reach Z.
              getFilterValue: { value: pointCloud.positions, size: 1, offset: 8, stride: 12 },
            },
          },
          coordinateSystem: COORDINATE_SYSTEM.LNGLAT_OFFSETS,
          coordinateOrigin: pointCloud.coordinateOrigin,
          pointSize: settings.pointSize,
          opacity: layer.opacity,

          pickable: settings.enablePointPicking, // Point Picking Toggle

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
            getFilterValue: [settings.showElevationFilter]
          },

          // Extension Props
          extensions,
          filterRange: settings.showElevationFilter ? settings.elevationRange : undefined,
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
  const effects: any[] = [];

  // ── Effect 4: Update deck.gl overlay ─────────────────────────────
  useEffect(() => {
    const overlay = overlayRef.current;
    if (overlay) {
      overlay.setProps({
        layers: deckLayers,
        effects: effects,

        // Tooltip for Point Picking
        getTooltip: ({ object, index, layer }: any) => {
          if (!settings.enablePointPicking || !object) return null;

          // 'object' in PointCloudLayer (binary mode) might be tricky.
          // In binary mode, 'index' is the index of the point.
          // But deck.gl's default tooltip handling might not extract attributes automatically for binary.
          // However, for PointCloudLayer, if pickable is true, info.object is typically the point info?
          // Actually, for binary data, 'object' is usually null or the whole data array. 
          // We rely on 'index' to fetch data.

          // Let's check if layer has attributes
          const props = layer.props;
          if (!props.data || !props.data.attributes) return null;

          const positions = props.data.attributes.getPosition.value;
          const px = positions[index * 3];
          const py = positions[index * 3 + 1];
          const pz = positions[index * 3 + 2];

          // Calculate absolute coords
          const origin = props.coordinateOrigin || [0, 0, 0];
          const lng = origin[0] + px;
          const lat = origin[1] + py;
          const elev = pz; // Z is usually relative to 0 or sea level depending on source, but positions[2] is Z.

          return {
            html: `
              <div style="font-family: 'Outfit', sans-serif; font-size: 12px; padding: 4px;">
                <div><b>Elevation:</b> ${elev.toFixed(2)}m</div>
                <div><b>Lng:</b> ${lng.toFixed(5)}</div>
                <div><b>Lat:</b> ${lat.toFixed(5)}</div>
              </div>
            `,
            style: {
              backgroundColor: '#1e293b',
              color: 'white',
              fontSize: '0.8em',
              borderRadius: '4px',
              padding: '8px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
            }
          };
        },

        // Click handler
        onClick: (info: any) => {
          if (onMapClick && info.coordinate) {
            onMapClick([info.coordinate[0], info.coordinate[1]]);
          }
        }
      });
    }
  }, [deckLayers, effects, onMapClick, settings.enablePointPicking]);

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
