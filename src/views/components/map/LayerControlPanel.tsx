import { Eye, EyeOff, Layers, Sliders, X } from "lucide-react";
import type React from "react";

export type BasemapType = "osm" | "satellite" | "dark";

interface LayerControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  basemap: BasemapType;
  onChangeBasemap: (basemap: BasemapType) => void;
  showWms: boolean;
  onToggleWms: () => void;
  wmsOpacity: number;
  onChangeWmsOpacity: (opacity: number) => void;
  showGeotiff: boolean;
  onToggleGeotiff: () => void;
  showDetections: boolean;
  onToggleDetections: () => void;
  hasWms: boolean;
  hasGeotiff: boolean;
  hasDetections: boolean;
}

export const LayerControlPanel: React.FC<LayerControlPanelProps> = ({
  isOpen,
  onClose,
  basemap,
  onChangeBasemap,
  showWms,
  onToggleWms,
  wmsOpacity,
  onChangeWmsOpacity,
  showGeotiff,
  onToggleGeotiff,
  showDetections,
  onToggleDetections,
  hasWms,
  hasGeotiff,
  hasDetections,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="absolute top-4 left-4 z-20 w-72 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-4 transition-all animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-zinc-500" />
          <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
            Map Layer Settings
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Basemap Selection */}
        <div>
          <div className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
            Base Map Style
          </div>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
            <button
              type="button"
              onClick={() => onChangeBasemap("osm")}
              className={`py-1.5 px-2 text-[11px] font-medium rounded-lg transition-all ${
                basemap === "osm"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              Street
            </button>
            <button
              type="button"
              onClick={() => onChangeBasemap("satellite")}
              className={`py-1.5 px-2 text-[11px] font-medium rounded-lg transition-all ${
                basemap === "satellite"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              Satellite
            </button>
            <button
              type="button"
              onClick={() => onChangeBasemap("dark")}
              className={`py-1.5 px-2 text-[11px] font-medium rounded-lg transition-all ${
                basemap === "dark"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              Dark
            </button>
          </div>
        </div>

        {/* Data Layers */}
        <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
            Data Overlays
          </div>

          {hasDetections && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800/80">
              <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                Fire Detection Markers
              </span>
              <button
                type="button"
                onClick={onToggleDetections}
                className="p-1 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                {showDetections ? (
                  <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <EyeOff className="w-4 h-4 text-zinc-400" />
                )}
              </button>
            </div>
          )}

          {hasWms && (
            <div className="space-y-2 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                  WMS Imagery Layer
                </span>
                <button
                  type="button"
                  onClick={onToggleWms}
                  className="p-1 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  {showWms ? (
                    <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-zinc-400" />
                  )}
                </button>
              </div>

              {showWms && (
                <div className="pt-1.5 border-t border-zinc-200/50 dark:border-zinc-700/50">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                    <span className="flex items-center gap-1">
                      <Sliders className="w-3 h-3" /> Opacity
                    </span>
                    <span>{Math.round(wmsOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={wmsOpacity}
                    onChange={(e) => onChangeWmsOpacity(Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              )}
            </div>
          )}

          {hasGeotiff && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800/80">
              <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                GeoTIFF / COG Raster Layer
              </span>
              <button
                type="button"
                onClick={onToggleGeotiff}
                className="p-1 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                {showGeotiff ? (
                  <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <EyeOff className="w-4 h-4 text-zinc-400" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
