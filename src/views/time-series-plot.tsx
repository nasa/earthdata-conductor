import TerraTimeSeries from "@nasa-terra/components/dist/react/time-series/index.js";
import { useToolInfo } from "../helpers.js";
import type { TimeSeriesPlotInput } from "../schemas/time-series-plot.schema.js";
import TerraProvider from "./components/TerraProvider.js";
import "@/index.css";

export default function TimeSeriesPlotView() {
  const toolInfo = useToolInfo<"show-time-series-plot">();
  const input = (toolInfo.input || {}) as TimeSeriesPlotInput;
  const output = toolInfo.output as { bearerToken?: string } | undefined;

  return (
    <TerraProvider>
      <div className="mx-auto w-full max-w-5xl rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-xl p-6">
        <div className="relative overflow-hidden border-b border-zinc-200 dark:border-zinc-800 bg-linear-to-r from-indigo-50/50 via-white to-cyan-50/50 dark:from-indigo-950/20 dark:via-zinc-950 dark:to-cyan-950/20 p-6 mb-6 rounded-t-xl -mx-6 -mt-6">
          <div className="absolute top-0 left-0 h-[3px] w-full bg-linear-to-r from-indigo-500 via-purple-500 to-cyan-500" />
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Area-Averaged Time Series Plot
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Visualizing variable{" "}
            <strong className="font-mono text-zinc-700 dark:text-zinc-300">
              {input.variable || "N/A"}
            </strong>{" "}
            for collection{" "}
            <strong className="font-mono text-zinc-700 dark:text-zinc-300">
              {input.collection || "N/A"}
            </strong>
          </p>
        </div>

        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-zinc-50 dark:bg-zinc-900/60 min-h-[450px] p-4 flex items-center justify-center">
          {input.collection && input.variable ? (
            <TerraTimeSeries
              className="w-full h-full min-h-[420px]"
              collection={input.collection}
              variable={input.variable}
              startDate={input.startDate}
              endDate={input.endDate}
              location={input.location}
              bearerToken={output?.bearerToken}
            />
          ) : (
            <span className="text-xs text-zinc-400 animate-pulse">
              Loading plot parameters...
            </span>
          )}
        </div>
      </div>
    </TerraProvider>
  );
}
