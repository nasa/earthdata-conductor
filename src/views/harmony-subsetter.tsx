import TerraDataSubsetter from "@nasa-terra/components/dist/react/data-subsetter/index.js";
import { useEffect, useRef } from "react";
import { useOpenExternal } from "skybridge/web";
import { useToolInfo } from "../helpers.js";
import TerraProvider from "./components/TerraProvider.js";
import "@/index.css";

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
        {jobId ? (
          <div className="space-y-4">
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
