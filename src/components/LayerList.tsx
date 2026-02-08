import { Layer } from '../types';
import './LayerList.css';

interface Props {
    layers: Layer[];
    onLayerUpdate: (layerId: string, updates: Partial<Layer>) => void;
    onLayerRemove: (layerId: string) => void;
    onZoomToLayer: (layerId: string) => void;
}

export default function LayerList({ layers, onLayerUpdate, onLayerRemove, onZoomToLayer }: Props) {
    if (layers.length === 0) {
        return <div className="layer-list-empty">No layers loaded.</div>;
    }

    return (
        <div className="layer-list">
            {layers?.map((layer) => (
                <div key={layer.id} className="layer-item">
                    <div className="layer-header">
                        <div className="layer-title-row">
                            <input
                                type="checkbox"
                                className="layer-checkbox"
                                checked={layer.visible}
                                onChange={(e) =>
                                    onLayerUpdate(layer.id, { visible: e.target.checked })
                                }
                            />
                            <span className="layer-name" title={layer.name}>
                                {layer.name}
                            </span>
                            <button
                                className="icon-button"
                                onClick={() => onZoomToLayer(layer.id)}
                                title="Zoom to layer"
                            >
                                ⌖
                            </button>
                            <button
                                className="remove-button"
                                onClick={() => onLayerRemove(layer.id)}
                                title="Remove layer"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                    {layer.visible && (
                        <div className="layer-controls">
                            <div className="control-row">
                                <label>Opacity</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={layer.opacity}
                                    onChange={(e) =>
                                        onLayerUpdate(layer.id, { opacity: parseFloat(e.target.value) })
                                    }
                                />
                            </div>
                            <div className="control-row">
                                <label>Z-Offset</label>
                                <input
                                    type="range"
                                    min="-50"
                                    max="50"
                                    step="0.5"
                                    value={layer.zOffset}
                                    onChange={(e) => onLayerUpdate(layer.id, { zOffset: parseFloat(e.target.value) })}
                                />
                                <span className="value-display">{layer.zOffset}m</span>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
