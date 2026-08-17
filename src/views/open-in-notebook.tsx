import TerraAlert from "@nasa-terra/components/dist/react/alert/index.js";
import TerraBadge from "@nasa-terra/components/dist/react/badge/index.js";
import TerraButton from "@nasa-terra/components/dist/react/button/index.js";
import TerraCard from "@nasa-terra/components/dist/react/card/index.js";
import { BookOpen, Check, Code, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useToolInfo } from "../helpers.js";
import TerraProvider from "./components/TerraProvider.js";
import "@/index.css";

export default function OpenInNotebook() {
  const toolInfo = useToolInfo<"open-in-notebook">();
  const output = toolInfo.output as
    | {
        marimoUrl?: string;
        pythonCode?: string;
        stepCount?: number;
      }
    | undefined;

  const marimoUrl = output?.marimoUrl || "#";
  const pythonCode = output?.pythonCode || "";
  const stepCount = output?.stepCount || 0;

  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const handleCopy = () => {
    if (marimoUrl && marimoUrl !== "#") {
      navigator.clipboard.writeText(marimoUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <TerraProvider>
      <div className="p-4 max-w-4xl mx-auto space-y-4 font-sans">
        <TerraAlert variant="info">
          Your Python notebook is ready. Continue your data analysis in a live
          interactive Python notebook environment or copy the link below.
        </TerraAlert>

        <TerraCard className="p-6 space-y-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Continue Analysis in Notebook
                </h2>
                <p className="text-xs text-slate-400">
                  {stepCount > 0
                    ? `Includes ${stepCount} workflow step${stepCount > 1 ? "s" : ""} from your conversation session.`
                    : "Standalone Python dataset analysis notebook."}
                </p>
              </div>
            </div>
            {stepCount > 0 && (
              <TerraBadge variant="info">
                {stepCount} Workflow Step{stepCount > 1 ? "s" : ""}
              </TerraBadge>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <TerraButton
              variant="primary"
              href={marimoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-sm transition-colors"
            >
              <span>Open Notebook</span>
              <ExternalLink className="w-4 h-4 ml-1" />
            </TerraButton>

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-sm transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">
                    Link Copied!
                  </span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Notebook Link</span>
                </>
              )}
            </button>
          </div>

          <div className="pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowCode(!showCode)}
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <Code className="w-3.5 h-3.5" />
              <span>
                {showCode
                  ? "Hide Python Code Preview"
                  : "Show Python Code Preview"}
              </span>
            </button>

            {showCode && (
              <div className="mt-3 p-4 bg-slate-950 rounded-lg border border-slate-800 overflow-x-auto text-xs font-mono text-slate-300 max-h-96">
                <pre>{pythonCode}</pre>
              </div>
            )}
          </div>
        </TerraCard>
      </div>
    </TerraProvider>
  );
}
