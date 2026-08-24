import TerraTimeAverageMap from "@nasa-terra/components/dist/react/time-average-map/index.js";
import { useEffect, useState } from "react";
import { useToolInfo } from "../helpers.js";
import type { TimeAveragedMapInput } from "../schemas/time-averaged-map.schema.js";
import { findMatchingHarmonyJob } from "../utils/harmony-jobs.js";
import TerraProvider from "./components/TerraProvider.js";
import "@/index.css";

export default function TimeAveragedMapView() {
  const toolInfo = useToolInfo<"show-time-averaged-map">();
  const input = (toolInfo.input || {}) as TimeAveragedMapInput;
  const output = toolInfo.output as { bearerToken?: string } | undefined;

  const parsedVariable = input.variable?.split("/").pop() || input.variable;

  const [matchedJobId, setMatchedJobId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function checkExistingJobs() {
      if (!input.collection || !parsedVariable) {
        return;
      }

      const existingJobId = await findMatchingHarmonyJob(
        {
          requestType: "time-average-map",
          collection: input.collection,
          variable: parsedVariable,
          startDate: input.startDate,
          endDate: input.endDate,
          location: input.location,
        },
        output?.bearerToken,
      );

      if (isMounted && existingJobId) {
        setMatchedJobId(existingJobId);
      }
    }

    checkExistingJobs();
    return () => {
      isMounted = false;
    };
  }, [
    input.collection,
    parsedVariable,
    input.startDate,
    input.endDate,
    input.location,
    output?.bearerToken,
  ]);

  return (
    <TerraProvider>
      <div className="w-full min-h-[450px] flex flex-col gap-2">
        {input.collection && parsedVariable ? (
          <TerraTimeAverageMap
            className="w-full h-full"
            collection={input.collection}
            variable={parsedVariable}
            startDate={input.startDate}
            endDate={input.endDate}
            location={input.location}
            bearerToken={output?.bearerToken}
            jobId={matchedJobId || undefined}
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
