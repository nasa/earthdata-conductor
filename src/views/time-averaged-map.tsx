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
      <div className="w-full min-h-[450px]">
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
