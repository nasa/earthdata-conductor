import React from "react";
import { useToolInfo } from "../helpers.js";
import type { TimeSeriesPlotInput } from "../schemas/time-series-plot.schema.js";
import "@/index.css";

// Satisfy noUnusedLocals check
if (React) {
  // noop
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "terra-time-series": any;
    }
  }
}


export default function TimeSeriesPlotView() {
  const toolInfo = useToolInfo<"show-time-series-plot">();
  const input = (toolInfo.input || {}) as TimeSeriesPlotInput;

  return (
    <div className="p-4 space-y-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
          Area-Averaged Time Series Plot
        </h3>
        <p className="text-[11px] text-zinc-500">
          Visualizing variable <strong>{input.variable || "N/A"}</strong> for
          collection <strong>{input.collection || "N/A"}</strong>
        </p>
      </div>

      <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900 min-h-[350px] p-2 flex items-center justify-center">
        {input.collection && input.variable ? (
          <terra-time-series
            className="w-full h-full min-h-[320px]"
            collection={input.collection}
            variable={input.variable}
            start-date={input.startDate}
            end-date={input.endDate}
            location={input.location}
          />
        ) : (
          <span className="text-xs text-zinc-400">
            Loading plot parameters...
          </span>
        )}
      </div>
    </div>
  );
}
