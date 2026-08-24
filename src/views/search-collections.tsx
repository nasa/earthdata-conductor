import TerraBadge from "@nasa-terra/components/dist/react/badge/index.js";
import TerraButton from "@nasa-terra/components/dist/react/button/index.js";
import TerraCard from "@nasa-terra/components/dist/react/card/index.js";
import TerraLoader from "@nasa-terra/components/dist/react/loader/index.js";
import TerraTab from "@nasa-terra/components/dist/react/tab/index.js";
import TerraTabPanel from "@nasa-terra/components/dist/react/tab-panel/index.js";
import type { TerraTabShowEvent } from "@nasa-terra/components/dist/react/tabs/index.js";
import TerraTabs from "@nasa-terra/components/dist/react/tabs/index.js";
import TerraTag from "@nasa-terra/components/dist/react/tag/index.js";
import {
  ArrowRight,
  Calendar,
  Compass,
  Database,
  Info,
  MapPin,
  Search,
  SquareArrowOutUpRight
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSendFollowUpMessage } from "skybridge/web";
import { useCallTool, useToolInfo } from "../helpers.js";
import {
  getRecommendations,
  type RecommendedVariable,
} from "../utils/recommendations.js";
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
  granule_count?: number;
}

interface HarmonyVariable {
  name: string;
  longName?: string;
  href: string;
  units?: string;
}

interface HarmonyService {
  name: string;
  href: string;
  capabilities: Record<string, unknown>;
}

interface HarmonyOutputFormat {
  name: string;
  mimeType: string;
}

interface HarmonyCapabilities {
  conceptId: string;
  shortName: string;
  summary: {
    subsetting: {
      bbox: boolean;
      dimension: boolean;
      shape: boolean;
      temporal: boolean;
      variable: boolean;
    };
    outputFormats: HarmonyOutputFormat[];
  };
  services: HarmonyService[];
  variables: HarmonyVariable[];
}

export default function SearchCollections() {
  const toolInfo = useToolInfo<"search-collections">();

  interface SearchCollectionsOutput {
    query?: {
      keyword?: string;
      spatialArea?: string;
      spatialWkt?: string;
      startDate?: string;
      endDate?: string;
    };
    collections?: Collection[];
    error?: string;
  }

  const output = toolInfo.output as SearchCollectionsOutput | undefined;

  const query = {
    ...(toolInfo.input || {}),
    ...(output?.query || {}),
  } as {
    keyword?: string;
    spatialArea?: string;
    spatialWkt?: string;
    startDate?: string;
    endDate?: string;
  };

  const sendFollowUp = useSendFollowUpMessage();
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [isSubmittingSubset, setIsSubmittingSubset] = useState(false);
  const [isPlottingSeries, setIsPlottingSeries] = useState(false);
  const [isMappingAveraged, setIsMappingAveraged] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [selectedVariableId, setSelectedVariableId] = useState<string | null>(
    null,
  );
  const [selectedFormat, setSelectedFormat] =
    useState<string>("application/netcdf");
  const [activeTab, setActiveTab] = useState<"original" | "subset" | "plot">(
    "original",
  );

  const {
    callTool: fetchCapabilities,
    isPending: loadingCaps,
    data: capabilitiesData,
  } = useCallTool("get-harmony-capabilities");

  const [lastFetchedId, setLastFetchedId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedId && lastFetchedId !== selectedId) {
      setLastFetchedId(selectedId);
      fetchCapabilities({ conceptId: selectedId });
    }
  }, [selectedId, lastFetchedId, fetchCapabilities]);

  useEffect(() => {
    if (capabilitiesData?.structuredContent) {
      const caps =
        capabilitiesData.structuredContent as unknown as HarmonyCapabilities;
      const vars = caps.variables || [];
      if (vars.length > 0) {
        const recommended = getRecommendations(query.keyword || "", vars);
        const topRec = recommended.find((v) => v.isRecommended);
        if (topRec) {
          const varId = topRec.href.split("/").pop() || null;
          setSelectedVariableId(varId);
        } else {
          const firstVarHref = vars[0].href || "";
          const firstVarId = firstVarHref.split("/").pop() || null;
          setSelectedVariableId(firstVarId);
        }
      }

      const formats = caps.summary?.outputFormats || [];
      const netcdfFormat = formats.find((f: HarmonyOutputFormat) =>
        f.mimeType?.includes("netcdf"),
      );
      if (netcdfFormat) {
        setSelectedFormat(netcdfFormat.mimeType);
      } else if (formats.length > 0) {
        setSelectedFormat(formats[0].mimeType);
      }
    }
  }, [capabilitiesData, query.keyword]);

  const [cachedCollections, setCachedCollections] = useState<Collection[]>([]);

  useEffect(() => {
    if (output?.collections) {
      setCachedCollections(output.collections);
    }
  }, [output]);

  const collections = cachedCollections;
  const error = output?.error;

  // Select the first collection by default
  useEffect(() => {
    if (collections.length > 0 && !selectedId) {
      setSelectedId(collections[0].concept_id);
    }
  }, [collections, selectedId]);

  const selectedCollection = collections.find(
    (c) => c.concept_id === selectedId,
  );

  const handleAccess = async (collection: Collection) => {
    if (!collection.short_name) return;
    setIsBrowsing(true);
    try {
      const versionStr = collection.version
        ? ` version ${collection.version}`
        : "";
      const spatialStr = query.spatialArea ? ` over ${query.spatialArea}` : "";
      const dateStr =
        query.startDate || query.endDate
          ? ` for time range ${query.startDate || ""} to ${query.endDate || ""}`
          : "";
      await sendFollowUp(
        `Please call the 'browse-data' tool for collection ${collection.short_name}${versionStr}${spatialStr}${dateStr}.`,
      );
    } catch (err) {
      console.error("Failed to trigger browse data view:", err);
    } finally {
      setIsBrowsing(false);
    }
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
        {/* Header section with minimalistic Terra UI style */}
        <div className="relative border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                <Compass className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  Dataset Search Results
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Click on the matching NASA Earth science collections below.
                </p>
              </div>
            </div>
          </div>

          {/* Active Search Parameters Summary */}
          <div className="mt-4 flex flex-wrap gap-2">
            <TerraTag variant="content" size="small">
              <span className="flex items-center gap-1">
                <Search className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                Keyword: <strong>{query.keyword || "N/A"}</strong>
              </span>
            </TerraTag>
            {query.spatialArea && (
              <TerraTag variant="content" size="small">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-cyan-500" />
                  Area: <strong>{query.spatialArea}</strong>
                </span>
              </TerraTag>
            )}
            {(query.startDate || query.endDate) && (
              <TerraTag variant="content" size="small">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-purple-500" />
                  Time:{" "}
                  <strong>
                    {query.startDate ? formatDate(query.startDate) : "Anytime"}
                  </strong>{" "}
                  –{" "}
                  <strong>
                    {query.endDate ? formatDate(query.endDate) : "Anytime"}
                  </strong>
                </span>
              </TerraTag>
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
        ) : !output ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <TerraLoader indeterminate />
            <span className="text-xs text-zinc-500 font-medium">
              Loading NASA Earthdata collections...
            </span>
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
            <div className="md:col-span-2 border-r border-zinc-200 dark:border-zinc-800 max-h-[650px] overflow-y-auto p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-950/50">
              <div className="text-[11px] font-semibold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase px-1 mb-2">
                Search Results ({collections.length})
              </div>
              {collections.map((c) => {
                const isSelected = c.concept_id === selectedId;
                return (
                  <button
                    type="button"
                    key={c.concept_id}
                    onClick={() => setSelectedId(c.concept_id)}
                    className="w-full text-left focus:outline-hidden transition-all"
                  >
                    <TerraCard
                      className={`block w-full transition-all duration-200 ${
                        isSelected
                          ? "[--border-color:var(--color-blue-600)] bg-blue-50/10 dark:bg-blue-950/5 shadow-xs"
                          : "hover:[--border-color:var(--color-blue-300)] hover:shadow-xs"
                      }`} style={{overflow: 'hidden'}}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <TerraBadge variant="neutral" pill>
                            {c.short_name || "Unknown"}
                          </TerraBadge>
                          {c.granule_count !== undefined && (
                            <TerraBadge variant="success" pill>
                              {c.granule_count} granules
                            </TerraBadge>
                          )}
                        </div>
                        {c.version && (
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                            v{c.version}
                          </span>
                        )}
                      </div>
                      <h4
                        className={`text-xs font-semibold mt-2 line-clamp-2 transition-colors ${
                          isSelected
                            ? "text-blue-600 dark:text-blue-400 font-bold"
                            : "text-zinc-800 dark:text-zinc-200"
                        }`}
                      >
                        {c.entry_title}
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {c.summary || c.description || "No summary available."}
                      </p>
                    </TerraCard>
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
                      <div className="flex flex-wrap gap-2 items-center text-xs mb-2">
                        <TerraTag variant="topic" size="small">
                          ID: {selectedCollection.concept_id}
                        </TerraTag>
                        {selectedCollection.provider_id && (
                          <TerraBadge variant="information">
                            Provider: {selectedCollection.provider_id}
                          </TerraBadge>
                        )}
                        {selectedCollection.processing_level_id && (
                          <TerraBadge variant="success">
                            Level: {selectedCollection.processing_level_id}
                          </TerraBadge>
                        )}
                        {selectedCollection.granule_count !== undefined && (
                          <TerraBadge variant="success">
                            {selectedCollection.granule_count} granules
                          </TerraBadge>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100 leading-snug">
                        {selectedCollection.entry_title}
                      </h3>
                      <div className="text-xs font-mono text-blue-600 dark:text-blue-400 font-bold mt-1">
                        {selectedCollection.short_name} v
                        {selectedCollection.version || "1.0"}
                      </div>
                    </div>

                    {/* Scrollable Summary */}
                    <div className="space-y-1">
                      <span className="text-[12px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Description
                      </span>
                      <div className="text-[12px] text-zinc-600 dark:text-zinc-300 max-h-[160px] overflow-y-auto leading-relaxed border border-zinc-100 dark:border-zinc-800 rounded-lg p-3 bg-zinc-50/30 dark:bg-zinc-900/30">
                        {selectedCollection.summary ||
                          selectedCollection.description ||
                          "No detailed description available."}
                      </div>
                    </div>

                    {/* Metadata attributes */}
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      {/* Temporal Range */}
                      <div className="space-y-1">
                        <span className="text-[12px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
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
                        <span className="text-[12px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
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

                    {/* Related Collections */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="text-sm flex items-center gap-1 text-blue-600 dark:text-blue-400 underline">
                        See Related Collections
                        <SquareArrowOutUpRight className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      </span>
                    </div>
                  </div>

                  {/* Action Tabs & Subsetting / Plotting Panel */}
                  {selectedCollection && (
                    <div className="border-t border-zinc-300 dark:border-zinc-600 pt-4 mt-2">
                      <span className="text-[12px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-2">
                        Access Actions
                      </span>

                      {(() => {
                        const caps = capabilitiesData?.structuredContent as
                          | HarmonyCapabilities
                          | undefined;
                        const rawVariables = caps?.variables || [];
                        const recommended = getRecommendations(
                          query.keyword || "",
                          rawVariables,
                        );
                        const variables = [
                          ...recommended
                            .filter((v) => v.isRecommended)
                            .sort((a, b) => b.score - a.score),
                          ...recommended.filter((v) => !v.isRecommended),
                        ];
                        const services = caps?.services || [];

                        const hasSubsetting =
                          services.some(
                            (s: HarmonyService) =>
                              !s.name?.toLowerCase().includes("giovanni"),
                          ) || caps?.summary?.subsetting?.variable;
                        const hasGiovanni = services.some((s: HarmonyService) =>
                          s.name?.toLowerCase().includes("giovanni"),
                        );

                        return loadingCaps ? (
                          <div className="flex flex-col items-center justify-center gap-3 py-10">
                            <TerraLoader indeterminate />
                            <span className="text-xs text-zinc-500 font-medium">
                              Loading capabilities...
                            </span>
                          </div>
                        ) : (
                          <TerraTabs
                            onTerraTabShow={(e: TerraTabShowEvent) =>
                              setActiveTab(
                                e.detail.name as "original" | "subset" | "plot",
                              )
                            }
                          >
                            <TerraTab
                              slot="nav"
                              panel="original"
                              active={activeTab === "original"}
                            >
                              <span className="flex flex-wrap gap-2 items-center">
                                Browse Files 
                                <TerraBadge variant="primary" pill>
                                {selectedCollection?.granule_count !== undefined
                                  ? `${selectedCollection.granule_count} granules`
                                  : 'Browse'}
                                </TerraBadge>
                              </span>
                            </TerraTab>
                            {hasSubsetting && (
                              <TerraTab
                                slot="nav"
                                panel="subset"
                                active={activeTab === "subset"}
                              >
                                Subset Data
                              </TerraTab>
                            )}
                            {hasGiovanni && (
                              <TerraTab
                                slot="nav"
                                panel="plot"
                                active={activeTab === "plot"}
                              >
                                Plot Data
                              </TerraTab>
                            )}

                            <TerraTabPanel
                              name="original"
                              active={activeTab === "original"}
                            >
                              <div className="space-y-4 pt-4">
                                <p className="text-[12px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                  Access the original dataset files directly
                                  from the archive. You will be able to select
                                  and download raw granules.
                                </p>
                                <div className="flex justify-end pt-2">
                                  <TerraButton
                                    disabled={isBrowsing}
                                    loading={isBrowsing}
                                    onClick={() =>
                                      handleAccess(selectedCollection)
                                    }
                                    className="w-full sm:w-auto"
                                  >
                                    Browse Original Files
                                    <ArrowRight
                                      className="h-4 w-4 ml-1.5"
                                      slot="suffix"
                                    />
                                  </TerraButton>
                                </div>
                              </div>
                            </TerraTabPanel>

                            {hasSubsetting && (
                              <TerraTabPanel
                                name="subset"
                                active={activeTab === "subset"}
                              >
                                <div className="space-y-4 pt-4">
                                  <div className="space-y-1.5">
                                    <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                                      Select Variable of Interest
                                    </span>
                                    <div className="max-h-[140px] overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-1">
                                      {variables.map((v: HarmonyVariable) => {
                                        const varId =
                                          v.href?.split("/").pop() || "";
                                        const isSelected =
                                          selectedVariableId === varId;
                                        const recVar = v as RecommendedVariable;
                                        return (
                                          <button
                                            type="button"
                                            key={varId}
                                            onClick={() =>
                                              setSelectedVariableId(varId)
                                            }
                                            className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors border ${
                                              isSelected
                                                ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 font-semibold"
                                                : "hover:bg-zinc-100 dark:hover:bg-zinc-800 border-transparent text-zinc-700 dark:text-zinc-300"
                                            }`}
                                          >
                                            <div className="flex flex-col w-full">
                                              <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5">
                                                  <span className="font-mono">
                                                    {v.name}
                                                  </span>
                                                  {recVar.isRecommended && (
                                                    <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] px-1.5 py-0.5 rounded font-semibold font-sans tracking-wide uppercase">
                                                      Recommended
                                                    </span>
                                                  )}
                                                </div>
                                                <span className="text-[10px] text-zinc-400 truncate max-w-[200px]">
                                                  {v.longName || v.name}
                                                </span>
                                              </div>
                                              {recVar.isRecommended &&
                                                recVar.reason && (
                                                  <span className="text-[9px] text-emerald-600 dark:text-emerald-500 font-normal mt-0.5 italic">
                                                    💡 {recVar.reason}
                                                  </span>
                                                )}
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  <div className="space-y-1.5">
                                    <label
                                      htmlFor="format-select"
                                      className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block"
                                    >
                                      Output Format
                                    </label>
                                    <select
                                      id="format-select"
                                      value={selectedFormat}
                                      onChange={(e) =>
                                        setSelectedFormat(e.target.value)
                                      }
                                      className="w-full text-xs border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:border-blue-600 focus:outline-hidden"
                                    >
                                      {caps?.summary?.outputFormats?.map(
                                        (f: HarmonyOutputFormat) => (
                                          <option
                                            key={f.mimeType}
                                            value={f.mimeType}
                                          >
                                            {f.name} ({f.mimeType})
                                          </option>
                                        ),
                                      )}
                                    </select>
                                  </div>

                                  <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900/60 p-3 border border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 space-y-1">
                                    <span className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                                      Constraints (from search):
                                    </span>
                                    {query.spatialArea && (
                                      <div>
                                        • Spatial bounding box:{" "}
                                        <strong>{query.spatialArea}</strong>
                                      </div>
                                    )}
                                    {(query.startDate || query.endDate) && (
                                      <div>
                                        • Temporal bounds:{" "}
                                        <strong>
                                          {query.startDate
                                            ? formatDate(query.startDate)
                                            : "Anytime"}
                                        </strong>{" "}
                                        to{" "}
                                        <strong>
                                          {query.endDate
                                            ? formatDate(query.endDate)
                                            : "Anytime"}
                                        </strong>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex justify-end pt-2">
                                    <TerraButton
                                      disabled={
                                        isBrowsing ||
                                        isSubmittingSubset ||
                                        !selectedVariableId
                                      }
                                      loading={isSubmittingSubset}
                                      onClick={() => {
                                        if (!selectedVariableId) return;

                                        let bbox: number[] | undefined;
                                        if (query.spatialWkt) {
                                          const matches = [
                                            ...query.spatialWkt.matchAll(
                                              /(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/g,
                                            ),
                                          ];
                                          if (matches.length >= 4) {
                                            const lons = matches.map((m) =>
                                              Number(m[1]),
                                            );
                                            const lats = matches.map((m) =>
                                              Number(m[2]),
                                            );
                                            bbox = [
                                              Math.min(...lons),
                                              Math.min(...lats),
                                              Math.max(...lons),
                                              Math.max(...lats),
                                            ];
                                          }
                                        }

                                        const handleSubmittingSubset =
                                          async () => {
                                            setIsSubmittingSubset(true);
                                            try {
                                              const bboxStr = bbox
                                                ? ` with bounding box [${bbox.join(", ")}]`
                                                : "";
                                              const varStr = selectedVariableId
                                                ? ` for variable ${selectedVariableId}`
                                                : "";
                                              const dateStr =
                                                query.startDate || query.endDate
                                                  ? ` for time range ${query.startDate || ""} to ${query.endDate || ""}`
                                                  : "";
                                              const formatStr = selectedFormat
                                                ? ` in format ${selectedFormat}`
                                                : "";

                                              await sendFollowUp(
                                                `Please call the 'create-harmony-job' tool for collection ${selectedCollection.concept_id}${varStr}${bboxStr}${dateStr}${formatStr}.`,
                                              );
                                            } catch (err) {
                                              console.error(
                                                "Failed to submit subsetting job:",
                                                err,
                                              );
                                            } finally {
                                              setIsSubmittingSubset(false);
                                            }
                                          };

                                        handleSubmittingSubset();
                                      }}
                                      className="w-full sm:w-auto"
                                    >
                                      Subset & Transform
                                      <ArrowRight
                                        className="h-4 w-4 ml-1.5"
                                        slot="suffix"
                                      />
                                    </TerraButton>
                                  </div>
                                </div>
                              </TerraTabPanel>
                            )}

                            {hasGiovanni && (
                              <TerraTabPanel
                                name="plot"
                                active={activeTab === "plot"}
                              >
                                <div className="space-y-4 pt-4">
                                  <div className="space-y-1.5">
                                    <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                                      Select Variable to Plot
                                    </span>
                                    <div className="max-h-[140px] overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-1">
                                      {variables.map((v: HarmonyVariable) => {
                                        const varId =
                                          v.href?.split("/").pop() || "";
                                        const isSelected =
                                          selectedVariableId === varId;
                                        const recVar = v as RecommendedVariable;
                                        return (
                                          <button
                                            type="button"
                                            key={varId}
                                            onClick={() =>
                                              setSelectedVariableId(varId)
                                            }
                                            className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors border ${
                                              isSelected
                                                ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 font-semibold"
                                                : "hover:bg-zinc-100 dark:hover:bg-zinc-800 border-transparent text-zinc-700 dark:text-zinc-300"
                                            }`}
                                          >
                                            <div className="flex flex-col w-full">
                                              <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5">
                                                  <span className="font-mono">
                                                    {v.name}
                                                  </span>
                                                  {recVar.isRecommended && (
                                                    <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] px-1.5 py-0.5 rounded font-semibold font-sans tracking-wide uppercase">
                                                      Recommended
                                                    </span>
                                                  )}
                                                </div>
                                                <span className="text-[10px] text-zinc-400 truncate max-w-[200px]">
                                                  {v.longName || v.name}
                                                </span>
                                              </div>
                                              {recVar.isRecommended &&
                                                recVar.reason && (
                                                  <span className="text-[9px] text-emerald-600 dark:text-emerald-500 font-normal mt-0.5 italic">
                                                    💡 {recVar.reason}
                                                  </span>
                                                )}
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  <p className="text-xs text-zinc-500 leading-relaxed">
                                    Plot and visualize data using the{" "}
                                    <strong>Giovanni</strong> averaging and
                                    mapping service. Custom charting and map
                                    overlays will be rendered directly inside
                                    the chat.
                                  </p>

                                  <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
                                    <TerraButton
                                      disabled={
                                        isBrowsing ||
                                        isSubmittingSubset ||
                                        isPlottingSeries ||
                                        isMappingAveraged ||
                                        !selectedVariableId
                                      }
                                      loading={isPlottingSeries}
                                      onClick={() => {
                                        if (!selectedVariableId) return;

                                        let bbox: number[] | undefined;
                                        if (query.spatialWkt) {
                                          const matches = [
                                            ...query.spatialWkt.matchAll(
                                              /(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/g,
                                            ),
                                          ];
                                          if (matches.length >= 4) {
                                            const lons = matches.map((m) =>
                                              Number(m[1]),
                                            );
                                            const lats = matches.map((m) =>
                                              Number(m[2]),
                                            );
                                            bbox = [
                                              Math.min(...lons),
                                              Math.min(...lats),
                                              Math.max(...lons),
                                              Math.max(...lats),
                                            ];
                                          }
                                        }

                                        const handleTimeSeriesPlot =
                                          async () => {
                                            setIsPlottingSeries(true);
                                            try {
                                              const formatToMMDDYYYY = (
                                                dateStr?: string,
                                              ) => {
                                                if (!dateStr) return "";
                                                try {
                                                  const d = new Date(dateStr);
                                                  if (Number.isNaN(d.getTime()))
                                                    return dateStr;
                                                  const mm = String(
                                                    d.getUTCMonth() + 1,
                                                  ).padStart(2, "0");
                                                  const dd = String(
                                                    d.getUTCDate(),
                                                  ).padStart(2, "0");
                                                  const yyyy =
                                                    d.getUTCFullYear();
                                                  return `${mm}/${dd}/${yyyy}`;
                                                } catch (_e) {
                                                  return dateStr;
                                                }
                                              };

                                              const formattedStart =
                                                formatToMMDDYYYY(
                                                  query.startDate,
                                                ) || "01/01/2009";
                                              const formattedEnd =
                                                formatToMMDDYYYY(
                                                  query.endDate,
                                                ) || "01/05/2009";

                                              const locationStr = bbox
                                                ? `${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}`
                                                : "62,5,95,40";

                                              const version =
                                                selectedCollection.version ||
                                                "";
                                              const sanitizedVersion =
                                                version.replace(/\./g, "_");
                                              const collectionParam = version
                                                ? `${selectedCollection.short_name}_${sanitizedVersion}`
                                                : selectedCollection.short_name;

                                              const selectedVarObj =
                                                variables.find(
                                                  (v) =>
                                                    (v.href?.split("/").pop() ||
                                                      "") ===
                                                    selectedVariableId,
                                                );
                                              const varName = selectedVarObj
                                                ? selectedVarObj.name
                                                : selectedVariableId;

                                              await sendFollowUp(
                                                `Please call the 'show-time-series-plot' tool for collection ${collectionParam} for variable ${varName} for time range ${formattedStart} to ${formattedEnd} at location ${locationStr}.`,
                                              );
                                            } catch (err) {
                                              console.error(
                                                "Failed to trigger time series plot:",
                                                err,
                                              );
                                            } finally {
                                              setIsPlottingSeries(false);
                                            }
                                          };

                                        handleTimeSeriesPlot();
                                      }}
                                      className="w-full sm:w-auto"
                                    >
                                      Time Series Plot
                                      <ArrowRight
                                        className="h-4 w-4 ml-1.5"
                                        slot="suffix"
                                      />
                                    </TerraButton>

                                    <TerraButton
                                      disabled={
                                        isBrowsing ||
                                        isSubmittingSubset ||
                                        isPlottingSeries ||
                                        isMappingAveraged ||
                                        !selectedVariableId
                                      }
                                      loading={isMappingAveraged}
                                      onClick={() => {
                                        if (!selectedVariableId) return;

                                        let bbox: number[] | undefined;
                                        if (query.spatialWkt) {
                                          const matches = [
                                            ...query.spatialWkt.matchAll(
                                              /(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/g,
                                            ),
                                          ];
                                          if (matches.length >= 4) {
                                            const lons = matches.map((m) =>
                                              Number(m[1]),
                                            );
                                            const lats = matches.map((m) =>
                                              Number(m[2]),
                                            );
                                            bbox = [
                                              Math.min(...lons),
                                              Math.min(...lats),
                                              Math.max(...lons),
                                              Math.max(...lats),
                                            ];
                                          }
                                        }

                                        const handleTimeAveragedMap =
                                          async () => {
                                            setIsMappingAveraged(true);
                                            try {
                                              const formatToMMDDYYYY = (
                                                dateStr?: string,
                                              ) => {
                                                if (!dateStr) return "";
                                                try {
                                                  const d = new Date(dateStr);
                                                  if (Number.isNaN(d.getTime()))
                                                    return dateStr;
                                                  const mm = String(
                                                    d.getUTCMonth() + 1,
                                                  ).padStart(2, "0");
                                                  const dd = String(
                                                    d.getUTCDate(),
                                                  ).padStart(2, "0");
                                                  const yyyy =
                                                    d.getUTCFullYear();
                                                  return `${mm}/${dd}/${yyyy}`;
                                                } catch (_e) {
                                                  return dateStr;
                                                }
                                              };

                                              const formattedStart =
                                                formatToMMDDYYYY(
                                                  query.startDate,
                                                ) || "01/01/2009";
                                              const formattedEnd =
                                                formatToMMDDYYYY(
                                                  query.endDate,
                                                ) || "01/05/2009";

                                              const locationStr = bbox
                                                ? `${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}`
                                                : "62,5,95,40";

                                              const version =
                                                selectedCollection.version ||
                                                "";
                                              const sanitizedVersion =
                                                version.replace(/\./g, "_");
                                              const collectionParam = version
                                                ? `${selectedCollection.short_name}_${sanitizedVersion}`
                                                : selectedCollection.short_name;

                                              const selectedVarObj =
                                                variables.find(
                                                  (v) =>
                                                    (v.href?.split("/").pop() ||
                                                      "") ===
                                                    selectedVariableId,
                                                );
                                              const varName = selectedVarObj
                                                ? selectedVarObj.name
                                                : selectedVariableId;

                                              await sendFollowUp(
                                                `Please call the 'show-time-averaged-map' tool for collection ${collectionParam} for variable ${varName} for time range ${formattedStart} to ${formattedEnd} at location ${locationStr}.`,
                                              );
                                            } catch (err) {
                                              console.error(
                                                "Failed to trigger time averaged map:",
                                                err,
                                              );
                                            } finally {
                                              setIsMappingAveraged(false);
                                            }
                                          };

                                        handleTimeAveragedMap();
                                      }}
                                      className="w-full sm:w-auto"
                                    >
                                      Time-Averaged Map
                                      <ArrowRight
                                        className="h-4 w-4 ml-1.5"
                                        slot="suffix"
                                      />
                                    </TerraButton>
                                  </div>
                                </div>
                              </TerraTabPanel>
                            )}
                          </TerraTabs>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500 dark:text-zinc-400">
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
