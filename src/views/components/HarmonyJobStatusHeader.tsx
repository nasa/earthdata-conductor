import { usePollHarmonyJobStatus } from "@nasa-terra/components/dist/react/index.js";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useState } from "react";

interface HarmonyJobStatusHeaderProps {
  jobId: string;
  bearerToken?: string;
}

export function HarmonyJobStatusHeader({
  jobId,
  bearerToken,
}: HarmonyJobStatusHeaderProps) {
  const [canceling, setCanceling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const searchOptions = bearerToken ? { bearerToken } : undefined;

  const {
    data,
    status,
    progress,
    isPolling,
    isError,
    error,
    cancelJob,
    refetch,
  } = usePollHarmonyJobStatus(jobId, searchOptions, {
    enabled: Boolean(jobId),
  });

  const handleCancel = async () => {
    try {
      setCanceling(true);
      setCancelError(null);
      await cancelJob(searchOptions);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : String(err));
    } finally {
      setCanceling(false);
    }
  };

  const currentStatus = (status || data?.status || "RUNNING").toUpperCase();
  const isTerminal = ["SUCCESSFUL", "FAILED", "CANCELED"].includes(
    currentStatus,
  );

  return (
    <div className="space-y-3 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300">
        <div className="flex items-center gap-3 font-mono">
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
            Job ID:
          </span>
          <span className="font-bold">{jobId}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-zinc-200 dark:border-zinc-800">
            {currentStatus === "SUCCESSFUL" && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Successful
              </span>
            )}
            {currentStatus === "RUNNING" && (
              <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-full">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Running ({progress}%)
              </span>
            )}
            {(currentStatus === "FAILED" || currentStatus === "CANCELED") && (
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-full">
                <XCircle className="w-3.5 h-3.5" />
                {currentStatus}
              </span>
            )}
            {!["SUCCESSFUL", "RUNNING", "FAILED", "CANCELED"].includes(
              currentStatus,
            ) && (
              <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                {currentStatus}
              </span>
            )}
          </div>

          {!isTerminal && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={canceling}
              className="px-2.5 py-1 text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors border border-rose-200 dark:border-rose-900/50 disabled:opacity-50"
            >
              {canceling ? "Canceling..." : "Cancel Job"}
            </button>
          )}

          <button
            type="button"
            onClick={() => refetch()}
            title="Refresh job status"
            className="p-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 rounded transition-colors"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isPolling ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {!isTerminal && (
        <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-indigo-600 dark:bg-indigo-500 h-full transition-all duration-500 ease-out"
            style={{ width: `${Math.max(5, Math.min(100, progress))}%` }}
          />
        </div>
      )}

      {(isError || cancelError) && (
        <div className="flex items-center gap-2 p-3 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 rounded-lg border border-rose-200 dark:border-rose-900/50">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            {cancelError ||
              error?.message ||
              "An error occurred while tracking this job."}
          </span>
        </div>
      )}
    </div>
  );
}
