import {
  ArrowRight,
  Calendar,
  Compass,
  Database,
  Info,
  Loader2,
  MapPin,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useCallTool, useToolInfo } from "../helpers.js";
import TerraProvider from "./components/TerraProvider.js";
import "@/index.css";

interface Collection {
  concept_id: string;
  entry_title: string;
  short_name?: string;
  version?: string;
  summary?: string;
  description?: string;
  provider_id?: string;
  processing_level_id?: string;
  platforms?: (string | Record<string, unknown>)[];
  instruments?: string[];
  time_start?: string;
  time_end?: string;
}

export default function SearchCollections() {
  const toolInfo = useToolInfo<"search-collections">();
  const { callTool, isPending } = useCallTool("browse-data");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const query = (toolInfo.input || {}) as any;
  const collections: Collection[] = (toolInfo.output as any)?.collections || [];
  const error = (toolInfo.output as any)?.error;

  // Select the first collection by default
  useEffect(() => {
    if (collections.length > 0 && !selectedId) {
      setSelectedId(collections[0].concept_id);
    }
  }, [collections, selectedId]);

  const selectedCollection = collections.find(
    (c) => c.concept_id === selectedId,
  );

  const handleAccess = (collection: Collection) => {
    if (!collection.short_name) return;
    callTool({
      shortName: collection.short_name,
      version: collection.version || "latest",
      spatialArea: query.spatialArea,
      startDate: query.startDate,
      endDate: query.endDate,
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Ongoing";
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (_e) {
      return dateStr;
    }
  };

  return (
    <TerraProvider>
      <div className="mx-auto w-full max-w-5xl rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 overflow-hidden shadow-xl">
        {/* Header section with glassmorphic style and gradient accent */}
        <div className="relative overflow-hidden border-b border-zinc-200 dark:border-zinc-800 bg-linear-to-r from-indigo-50/50 via-white to-cyan-50/50 dark:from-indigo-950/20 dark:via-zinc-950 dark:to-cyan-950/20 p-6">
          <div className="absolute top-0 left-0 h-[3px] w-full bg-linear-to-r from-indigo-500 via-purple-500 to-cyan-500" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Compass className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                Dataset Discovery
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Explore and select NASA Earth science datasets matching your
                interest.
              </p>
            </div>
          </div>

          {/* Active Search Parameters Summary */}
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/60 px-3 py-1 text-zinc-600 dark:text-zinc-300">
              <Search className="h-3.5 w-3.5 text-zinc-400" />
              <span>
                Keyword: <strong>{query.keyword || "N/A"}</strong>
              </span>
            </div>
            {query.spatialArea && (
              <div className="flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/60 px-3 py-1 text-zinc-600 dark:text-zinc-300">
                <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                <span>
                  Area: <strong>{query.spatialArea}</strong>
                </span>
              </div>
            )}
            {(query.startDate || query.endDate) && (
              <div className="flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/60 px-3 py-1 text-zinc-600 dark:text-zinc-300">
                <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                <span>
                  Time:{" "}
                  <strong>
                    {query.startDate ? formatDate(query.startDate) : "Anytime"}
                  </strong>{" "}
                  –{" "}
                  <strong>
                    {query.endDate ? formatDate(query.endDate) : "Anytime"}
                  </strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content area: Grid listing and details panel */}
        {error ? (
          <div className="p-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
              <Info className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
              Search Failed
            </h3>
            <p className="text-sm text-zinc-500 mt-1 max-w-md mx-auto">
              {error}
            </p>
          </div>
        ) : collections.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
              <Database className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold">No Datasets Found</h3>
            <p className="text-sm text-zinc-500 mt-1 max-w-md mx-auto">
              We couldn't find any NASA collections matching your search
              parameters. Try expanding your search keyword.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 min-h-[450px]">
            {/* Left side: Scrollable list of collections (cards) */}
            <div className="md:col-span-2 border-r border-zinc-200 dark:border-zinc-800 max-h-[550px] overflow-y-auto p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-950/50">
              <div className="text-[11px] font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase px-1 mb-2">
                Search Results ({collections.length})
              </div>
              {collections.map((c) => {
                const isSelected = c.concept_id === selectedId;
                return (
                  <button
                    type="button"
                    key={c.concept_id}
                    onClick={() => setSelectedId(c.concept_id)}
                    className={`w-full text-left p-3.5 rounded-lg border transition-all duration-200 group relative overflow-hidden ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/10 shadow-sm"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-300 dark:hover:border-indigo-800 hover:shadow-xs"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-0 left-0 h-full w-[3px] bg-indigo-500" />
                    )}
                    <div className="flex justify-between items-start gap-2">
                      <span className="inline-flex items-center rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-700/50">
                        {c.short_name || "Unknown"}
                      </span>
                      {c.version && (
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                          v{c.version}
                        </span>
                      )}
                    </div>
                    <h4
                      className={`text-xs font-semibold mt-2 line-clamp-2 transition-colors ${
                        isSelected
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-500"
                      }`}
                    >
                      {c.entry_title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                      {c.summary || c.description || "No summary available."}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Right side: Selected collection detail preview panel */}
            <div className="md:col-span-3 p-6 flex flex-col justify-between bg-white dark:bg-zinc-900">
              {selectedCollection ? (
                <div className="flex flex-col h-full justify-between gap-6 animate-fade-in">
                  <div className="space-y-4">
                    {/* Title and ID Info */}
                    <div>
                      <div className="flex flex-wrap gap-2 items-center text-xs mb-1">
                        <span className="font-mono text-zinc-400 dark:text-zinc-500 text-[10px]">
                          ID: {selectedCollection.concept_id}
                        </span>
                        {selectedCollection.provider_id && (
                          <span className="px-1.5 py-0.5 rounded bg-cyan-100/40 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-400 text-[9px] font-medium">
                            Provider: {selectedCollection.provider_id}
                          </span>
                        )}
                        {selectedCollection.processing_level_id && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-100/40 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 text-[9px] font-medium">
                            Level: {selectedCollection.processing_level_id}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100 leading-snug">
                        {selectedCollection.entry_title}
                      </h3>
                      <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold mt-1">
                        {selectedCollection.short_name} v
                        {selectedCollection.version || "1.0"}
                      </div>
                    </div>

                    {/* Scrollable Summary */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                        Description
                      </span>
                      <div className="text-xs text-zinc-600 dark:text-zinc-300 max-h-[160px] overflow-y-auto leading-relaxed border border-zinc-100 dark:border-zinc-800 rounded-lg p-3 bg-zinc-50/30 dark:bg-zinc-900/30">
                        {selectedCollection.summary ||
                          selectedCollection.description ||
                          "No detailed description available."}
                      </div>
                    </div>

                    {/* Metadata attributes */}
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      {/* Temporal Range */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                          Temporal Coverage
                        </span>
                        <div className="font-medium text-zinc-700 dark:text-zinc-300 flex flex-col gap-0.5">
                          <span>
                            Start: {formatDate(selectedCollection.time_start)}
                          </span>
                          <span>
                            End: {formatDate(selectedCollection.time_end)}
                          </span>
                        </div>
                      </div>

                      {/* Platforms & Instruments */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                          Sensor & Platform
                        </span>
                        <div className="text-zinc-700 dark:text-zinc-300">
                          <div className="line-clamp-1">
                            Platform:{" "}
                            <strong>
                              {selectedCollection.platforms
                                ? Array.isArray(selectedCollection.platforms)
                                  ? selectedCollection.platforms
                                      .map((p) =>
                                        typeof p === "object"
                                          ? p.short_name || p.ShortName
                                          : p,
                                      )
                                      .join(", ")
                                  : String(selectedCollection.platforms)
                                : "N/A"}
                            </strong>
                          </div>
                          <div className="line-clamp-1 mt-0.5">
                            Instrument:{" "}
                            <strong>
                              {selectedCollection.instruments
                                ? selectedCollection.instruments.join(", ")
                                : "N/A"}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 flex justify-end">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleAccess(selectedCollection)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md active:scale-98 transition-all cursor-pointer"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading Subsetter...</span>
                        </>
                      ) : (
                        <>
                          <span>Access & Browse Data</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-zinc-400 dark:text-zinc-500">
                  <Compass className="h-10 w-10 mb-2 stroke-[1.5]" />
                  <p className="text-xs">
                    Select a dataset from the list to view its details and
                    access options.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </TerraProvider>
  );
}
