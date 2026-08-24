import TerraTimeSeries from "@nasa-terra/components/dist/react/time-series/index.js";
import { useEffect, useState } from "react";
import { useToolInfo } from "../helpers.js";
import type { TimeSeriesPlotInput } from "../schemas/time-series-plot.schema.js";
import { findMatchingHarmonyJob } from "../utils/harmony-jobs.js";
import TerraProvider from "./components/TerraProvider.js";
import "@/index.css";

export default function TimeSeriesPlotView() {
  const toolInfo = useToolInfo<"show-time-series-plot">();
  const input = (toolInfo.input || {}) as TimeSeriesPlotInput;
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
          requestType: "time-series",
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
          <TerraTimeSeries
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
            Loading plot parameters...
          </div>
        )}
      </div>
    </TerraProvider>
  );
}
