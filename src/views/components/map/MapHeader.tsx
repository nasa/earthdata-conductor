import { Flame, Layers, Map as MapIcon, Sparkles } from "lucide-react";
import type React from "react";
import { useSendFollowUpMessage } from "skybridge/web";

interface MapHeaderProps {
  title: string;
  sourceBadge?: string;
  detectionCount?: number;
  showLayerPanel: boolean;
  onToggleLayerPanel: () => void;
}

export const MapHeader: React.FC<MapHeaderProps> = ({
  title,
  sourceBadge,
  detectionCount,
  showLayerPanel,
  onToggleLayerPanel,
}) => {
  const sendFollowUpMessage = useSendFollowUpMessage();

  const handleOpenNotebook = () => {
    sendFollowUpMessage(
      "Generate a Python notebook for this map analysis workflow.",
    );
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
      <div className="flex items-center gap-2.5">
        <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
          <MapIcon className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            {title}
            {sourceBadge && (
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 rounded-full border border-amber-200/50 dark:border-amber-800/50">
                {sourceBadge}
              </span>
            )}
          </h2>
          {typeof detectionCount === "number" && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span>{detectionCount} Active Thermal Anomalies Detected</span>
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleLayerPanel}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition-all border ${
            showLayerPanel
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent shadow-xs"
              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-750"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Layers</span>
        </button>

        <button
          type="button"
          onClick={handleOpenNotebook}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:text-amber-300 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 border border-amber-200/60 dark:border-amber-800/50 rounded-xl transition-all shadow-2xs"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Open Notebook</span>
        </button>
      </div>
    </div>
  );
};
