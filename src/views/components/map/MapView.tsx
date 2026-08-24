import "@/index.css";
import { useEffect, useState } from "react";
import { useToolInfo } from "../../../helpers.js";
import type { GetActiveFireDetectionsOutput } from "../../../schemas/get-active-fire-detections.schema.js";
import type { ShowGeotiffMapOutput } from "../../../schemas/show-geotiff-map.schema.js";
import type { ShowWmsMapOutput } from "../../../schemas/show-wms-map.schema.js";
import type { ActiveFireDetection } from "../../../utils/firms.js";
import TerraProvider from "../TerraProvider.js";
import { DetectionDetailsCard } from "./DetectionDetailsCard.js";
import { DetectionStats } from "./DetectionStats.js";
import { type BasemapType, LayerControlPanel } from "./LayerControlPanel.js";
import { MapHeader } from "./MapHeader.js";
import { OpenLayersMapView } from "./OpenLayersMapView.js";

export function MapView({
  toolName,
}: {
  toolName: "get-active-fire-detections" | "show-wms-map" | "show-geotiff-map";
}) {
  const toolInfo = useToolInfo<typeof toolName>();
  const output = (toolInfo.output ||
    {}) as Partial<GetActiveFireDetectionsOutput> &
    Partial<ShowWmsMapOutput> &
    Partial<ShowGeotiffMapOutput>;
  const input = (toolInfo.input || {}) as Record<string, unknown>;

  // Extract structured parameters
  const title =
    output.title ||
    (input.title as string) ||
    (output.wmsUrl
      ? "WMS Map Visualization"
      : output.url
        ? "GeoTIFF Map Visualization"
        : "Interactive Map Visualization");

  const bbox = (output.bbox || input.bbox) as
    | [number, number, number, number]
    | undefined;
  const detections = output.detections as ActiveFireDetection[] | undefined;
  const detectionCount = output.detectionCount ?? detections?.length;
  const source = output.source as string | undefined;

  // WMS Layer parameters
  const wmsUrl =
    output.wmsUrl || output.wmsOverlay?.url || (input.wmsUrl as string);
  const wmsLayers =
    output.layers || output.wmsOverlay?.layers || (input.layers as string);
  const wmsTime =
    output.time || output.wmsOverlay?.time || (input.time as string);

  // GeoTIFF parameters
  const geotiffUrl = output.url || (input.url as string);

  // UI state
  const [selectedDetection, setSelectedDetection] =
    useState<ActiveFireDetection | null>(null);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [basemap, setBasemap] = useState<BasemapType>(
    detections && detections.length > 0 ? "dark" : "satellite",
  );
  const [showWms, setShowWms] = useState(Boolean(wmsUrl && wmsLayers));
  const [wmsOpacity, setWmsOpacity] = useState(0.8);
  const [showGeotiff, setShowGeotiff] = useState(Boolean(geotiffUrl));
  const [showDetections, setShowDetections] = useState(
    Boolean(detections && detections.length > 0),
  );

  // Synchronize layer visibility when toolInfo.output finishes loading
  useEffect(() => {
    if (wmsUrl && wmsLayers) {
      setShowWms(true);
    }
  }, [wmsUrl, wmsLayers]);

  useEffect(() => {
    if (geotiffUrl) {
      setShowGeotiff(true);
    }
  }, [geotiffUrl]);

  useEffect(() => {
    if (detections && detections.length > 0) {
      setShowDetections(true);
    }
  }, [detections]);

  const hasWms = Boolean(wmsUrl && wmsLayers);
  const hasGeotiff = Boolean(geotiffUrl);
  const hasDetections = Boolean(detections && detections.length > 0);

  const apiKeyMissing = output.apiKeyMissing;

  return (
    <TerraProvider>
      <div className="w-full flex flex-col gap-3 p-1">
        <MapHeader
          title={title}
          sourceBadge={source}
          detectionCount={detectionCount}
          showLayerPanel={showLayerPanel}
          onToggleLayerPanel={() => setShowLayerPanel((prev) => !prev)}
        />

        {apiKeyMissing && (
          <div className="px-3.5 py-2.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2 shadow-2xs shrink-0">
            <span className="font-medium">
              🔑 <strong>FIRMS API Key Required for Point Markers</strong>: Add{" "}
              <code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded text-[11px]">
                FIRMS_MAP_KEY
              </code>{" "}
              to your{" "}
              <code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded text-[11px]">
                .env
              </code>{" "}
              file. Displaying NASA GIBS satellite thermal anomaly imagery
              layer.
            </span>
          </div>
        )}

        {detections && detections.length > 0 && (
          <DetectionStats detections={detections} />
        )}

        <div className="relative w-full h-[520px] sm:h-[580px]">
          <OpenLayersMapView
            bbox={bbox}
            basemap={basemap}
            showWms={showWms}
            wmsUrl={wmsUrl}
            wmsLayers={wmsLayers}
            wmsTime={wmsTime}
            wmsOpacity={wmsOpacity}
            showGeotiff={showGeotiff}
            geotiffUrl={geotiffUrl}
            showDetections={showDetections}
            detections={detections}
            onSelectDetection={setSelectedDetection}
          />

          <LayerControlPanel
            isOpen={showLayerPanel}
            onClose={() => setShowLayerPanel(false)}
            basemap={basemap}
            onChangeBasemap={setBasemap}
            showWms={showWms}
            onToggleWms={() => setShowWms((prev) => !prev)}
            wmsOpacity={wmsOpacity}
            onChangeWmsOpacity={setWmsOpacity}
            showGeotiff={showGeotiff}
            onToggleGeotiff={() => setShowGeotiff((prev) => !prev)}
            showDetections={showDetections}
            onToggleDetections={() => setShowDetections((prev) => !prev)}
            hasWms={hasWms}
            hasGeotiff={hasGeotiff}
            hasDetections={hasDetections}
          />

          {selectedDetection && (
            <DetectionDetailsCard
              detection={selectedDetection}
              onClose={() => setSelectedDetection(null)}
            />
          )}
        </div>
      </div>
    </TerraProvider>
  );
}
