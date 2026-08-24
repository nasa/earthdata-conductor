import TerraButton from "@nasa-terra/components/dist/react/button/index.js";
import TerraCard from "@nasa-terra/components/dist/react/card/index.js";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useToolInfo } from "../helpers.js";
import TerraProvider from "./components/TerraProvider.js";
import "@/index.css";

export default function OpenInNotebook() {
  const showCopyNotebookLink = false;
  const toolInfo = useToolInfo<"open-in-notebook">();
  const output = toolInfo.output as
    | {
      marimoUrl?: string;
    }
    | undefined;

  const marimoUrl = output?.marimoUrl || "#";

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (marimoUrl && marimoUrl !== "#") {
      navigator.clipboard.writeText(marimoUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <TerraProvider>
      <TerraCard className="space-y-4 bg-slate-900 rounded-xl text-slate-100">
        <div className="text-slate-700">
          Your Python notebook is ready! Click "Open Notebook" to continue your
          data analysis in a live interactive Python notebook environment.
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <TerraButton
            variant="primary"
            href={marimoUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>Open Notebook</span>
            <ExternalLink className="w-4 h-4" slot="suffix" />
          </TerraButton>

          {showCopyNotebookLink ? (
            <TerraButton variant="default" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" slot="prefix" />
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" slot="prefix" />
                  <span>Copy Notebook Link</span>
                </>
              )}
            </TerraButton>
          ) : undefined}
        </div>
      </TerraCard>
    </TerraProvider>
  );
}
