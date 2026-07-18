import TerraTimeSeries from "@nasa-terra/components/dist/react/time-series/index.js";
import { useToolInfo } from "../helpers.js";
import type { TimeSeriesPlotInput } from "../schemas/time-series-plot.schema.js";
import TerraProvider from "./components/TerraProvider.js";
import "@/index.css";

export default function TimeSeriesPlotView() {
  const toolInfo = useToolInfo<"show-time-series-plot">();
  const input = (toolInfo.input || {}) as TimeSeriesPlotInput;
  const output = toolInfo.output as { bearerToken?: string } | undefined;

  const sanitizedCollection = input.collection?.replace(/\./g, "_");
  const sanitizedVariable = input.variable?.replace(/\./g, "_");

  return (
    <TerraProvider>
      <div className="w-full min-h-[450px]">
        {sanitizedCollection && sanitizedVariable ? (
          <TerraTimeSeries
            className="w-full h-full"
            collection={sanitizedCollection}
            variable={sanitizedVariable}
            startDate={input.startDate}
            endDate={input.endDate}
            location={input.location}
            bearerToken={output?.bearerToken}
          />
        ) : (
          <div className="p-12 text-center text-xs text-zinc-400 animate-pulse">
            Loading plot parameters...
          </div>
        )}
      </div>
    </TerraProvider>
  );
}
