import { Flame, ShieldAlert, Sun, Zap } from "lucide-react";
import type React from "react";
import type { ActiveFireDetection } from "../../../utils/firms.js";

interface DetectionStatsProps {
  detections: ActiveFireDetection[];
}

export const DetectionStats: React.FC<DetectionStatsProps> = ({
  detections,
}) => {
  if (!detections || detections.length === 0) {
    return null;
  }

  const total = detections.length;
  const maxFrp = Math.max(...detections.map((d) => d.frp || 0));
  const highConfCount = detections.filter(
    (d) =>
      d.confidence === "h" ||
      d.confidence === "high" ||
      Number(d.confidence) >= 80,
  ).length;
  const dayCount = detections.filter((d) => d.daynight === "D").length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <div className="flex items-center gap-2.5 p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xs">
        <div className="p-1.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg">
          <Flame className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">
            Total Anomalies
          </div>
          <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {total}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xs">
        <div className="p-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
          <Zap className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">
            Max FRP (Power)
          </div>
          <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {maxFrp.toFixed(1)}{" "}
            <span className="text-[10px] font-normal">MW</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xs">
        <div className="p-1.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">
            High Confidence
          </div>
          <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {highConfCount}{" "}
            <span className="text-[10px] font-normal">
              ({Math.round((highConfCount / total) * 100)}%)
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xs">
        <div className="p-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
          <Sun className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">
            Day / Night Detections
          </div>
          <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {dayCount} <span className="text-[10px] font-normal">Day</span> /{" "}
            {total - dayCount}{" "}
            <span className="text-[10px] font-normal">Night</span>
          </div>
        </div>
      </div>
    </div>
  );
};
