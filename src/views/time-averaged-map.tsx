import TerraTimeAverageMap from "@nasa-terra/components/dist/react/time-average-map/index.js";
import { useToolInfo } from "../helpers.js";
import type { TimeAveragedMapInput } from "../schemas/time-averaged-map.schema.js";
import TerraProvider from "./components/TerraProvider.js";
import "@/index.css";

export default function TimeAveragedMapView() {
  const toolInfo = useToolInfo<"show-time-averaged-map">();
  const input = (toolInfo.input || {}) as TimeAveragedMapInput;
  const output = toolInfo.output as { bearerToken?: string } | undefined;

  const parsedVariable = input.variable?.split("/").pop() || input.variable;

  return (
    <TerraProvider>
      <div className="w-full min-h-[450px] flex flex-col gap-2">
        <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs">
          <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Time-Averaged Map Visualization ({input.collection} -{" "}
            {parsedVariable})
          </div>
        </div>
        {input.collection && parsedVariable ? (
          <TerraTimeAverageMap
            className="w-full h-full"
            collection={input.collection}
            variable={parsedVariable}
            startDate={input.startDate}
            endDate={input.endDate}
            location={input.location}
            bearerToken={output?.bearerToken}
          />
        ) : (
          <div className="p-12 text-center text-xs text-zinc-400 animate-pulse">
            Loading map parameters...
          </div>
        )}
      </div>
    </TerraProvider>
  );
}
