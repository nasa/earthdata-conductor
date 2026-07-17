import React from "react";
import { useToolInfo } from "../helpers.js";
import type { TimeAveragedMapInput } from "../schemas/time-averaged-map.schema.js";
import "@/index.css";

// Satisfy noUnusedLocals check
if (React) {
  // noop
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "terra-time-average-map": any;
    }
  }
}


export default function TimeAveragedMapView() {
  const toolInfo = useToolInfo<"show-time-averaged-map">();
  const input = (toolInfo.input || {}) as TimeAveragedMapInput;

  return (
    <div className="p-4 space-y-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
          Time-Averaged Map Plot
        </h3>
        <p className="text-[11px] text-zinc-500">
          Mapping variable <strong>{input.variable || "N/A"}</strong> for
          collection <strong>{input.collection || "N/A"}</strong>
        </p>
      </div>

      <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900 min-h-[350px] p-2 flex items-center justify-center">
        {input.collection && input.variable ? (
          <terra-time-average-map
            className="w-full h-full min-h-[320px]"
            collection={input.collection}
            variable={input.variable}
            start-date={input.startDate}
            end-date={input.endDate}
            location={input.location}
          />
        ) : (
          <span className="text-xs text-zinc-400">
            Loading map parameters...
          </span>
        )}
      </div>
    </div>
  );
}
