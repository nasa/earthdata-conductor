import TerraDataSubsetter from "@nasa-terra/components/dist/react/data-subsetter/index.js";
import { useToolInfo } from "../helpers.js";
import TerraProvider from "./components/TerraProvider.js";
import "@/index.css";
import { useEffect, useRef } from "react";
import { useOpenExternal } from "skybridge/web";

export default function HarmonySubsetter() {
  const toolInfo = useToolInfo<"create-harmony-job">();
  const output = toolInfo.output as
    | { jobId?: string; bearerToken?: string }
    | undefined;
  const { jobId, bearerToken } = output || {};

  const openExternal = useOpenExternal();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleContainerClick = (e: MouseEvent) => {
      let target = e.target as HTMLElement | null;
      while (target && target !== container) {
        if (target.tagName === "A") {
          const anchor = target as HTMLAnchorElement;
          const href = anchor.getAttribute("href");
          if (href && (anchor.target === "_blank" || href.startsWith("http"))) {
            e.preventDefault();
            e.stopPropagation();
            openExternal(href);
            return;
          }
        }
        target = target.parentElement;
      }
    };

    container.addEventListener("click", handleContainerClick, true);
    return () => {
      container.removeEventListener("click", handleContainerClick, true);
    };
  }, [openExternal]);

  return (
    <TerraProvider>
      <div
        ref={containerRef}
        className="mx-auto w-full max-w-5xl rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 overflow-hidden shadow-xl p-6"
      >
        <div className="relative overflow-hidden border-b border-zinc-200 dark:border-zinc-800 bg-linear-to-r from-indigo-50/50 via-white to-cyan-50/50 dark:from-indigo-950/20 dark:via-zinc-950 dark:to-cyan-950/20 p-6 mb-6 rounded-t-xl -mx-6 -mt-6">
          <div className="absolute top-0 left-0 h-[3px] w-full bg-linear-to-r from-indigo-500 via-purple-500 to-cyan-500" />
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Harmony Data Subsetter
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Configure spatial, temporal, and variable filters to extract the
            exact dataset you need.
          </p>
        </div>

        {jobId ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-600 dark:text-zinc-300">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                Job ID:
              </span>
              <span>{jobId}</span>
            </div>
            <TerraDataSubsetter
              jobId={jobId}
              bearerToken={bearerToken}
              showHistoryPanel={true}
            />
          </div>
        ) : (
          <div className="p-8 text-center text-red-500 bg-red-50/50 dark:bg-red-950/20 rounded-lg border border-red-100 dark:border-red-900/50">
            No active Job ID was generated. Please submit a valid subset
            request.
          </div>
        )}
      </div>
    </TerraProvider>
  );
}
