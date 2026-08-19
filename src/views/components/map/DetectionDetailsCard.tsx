import {
  Calendar,
  Clock,
  Flame,
  Satellite,
  ShieldCheck,
  Thermometer,
  X,
} from "lucide-react";
import type React from "react";
import type { ActiveFireDetection } from "../../../utils/firms.js";

interface DetectionDetailsCardProps {
  detection: ActiveFireDetection;
  onClose: () => void;
}

export const DetectionDetailsCard: React.FC<DetectionDetailsCardProps> = ({
  detection,
  onClose,
}) => {
  return (
    <div className="absolute top-4 right-4 z-20 w-80 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-4 transition-all animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              Thermal Anomaly Detection
            </h3>
            <p className="text-[10px] text-zinc-500 font-mono">
              {detection.latitude.toFixed(4)}°, {detection.longitude.toFixed(4)}
              °
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800/80">
          <div className="text-[10px] font-medium text-zinc-400 flex items-center gap-1 mb-0.5">
            <Flame className="w-3 h-3 text-orange-500" />
            <span>Fire Power (FRP)</span>
          </div>
          <div className="font-bold text-zinc-900 dark:text-zinc-100">
            {detection.frp.toFixed(1)} MW
          </div>
        </div>

        <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800/80">
          <div className="text-[10px] font-medium text-zinc-400 flex items-center gap-1 mb-0.5">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>Confidence</span>
          </div>
          <div className="font-bold capitalize text-zinc-900 dark:text-zinc-100">
            {detection.confidence}
          </div>
        </div>

        {detection.bright_ti4 !== undefined && (
          <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800/80">
            <div className="text-[10px] font-medium text-zinc-400 flex items-center gap-1 mb-0.5">
              <Thermometer className="w-3 h-3 text-red-500" />
              <span>Ch4 Temp (K)</span>
            </div>
            <div className="font-bold text-zinc-900 dark:text-zinc-100">
              {detection.bright_ti4.toFixed(1)} K
            </div>
          </div>
        )}

        {detection.bright_ti5 !== undefined && (
          <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800/80">
            <div className="text-[10px] font-medium text-zinc-400 flex items-center gap-1 mb-0.5">
              <Thermometer className="w-3 h-3 text-amber-500" />
              <span>Ch5 Temp (K)</span>
            </div>
            <div className="font-bold text-zinc-900 dark:text-zinc-100">
              {detection.bright_ti5.toFixed(1)} K
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Satellite className="w-3.5 h-3.5 text-zinc-400" />
            Satellite / Instrument:
          </span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-200">
            {detection.satellite} ({detection.instrument})
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            Acquisition Date:
          </span>
          <span className="font-medium text-zinc-900 dark:text-zinc-200">
            {detection.acq_date}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            UTC Time ({detection.daynight === "D" ? "Day" : "Night"}):
          </span>
          <span className="font-medium text-zinc-900 dark:text-zinc-200 font-mono">
            {detection.acq_time} UTC
          </span>
        </div>
      </div>
    </div>
  );
};
