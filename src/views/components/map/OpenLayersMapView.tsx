import Feature from "ol/Feature.js";
import Point from "ol/geom/Point.js";
import TileLayer from "ol/layer/Tile.js";
import VectorLayer from "ol/layer/Vector.js";
import WebGLTileLayer from "ol/layer/WebGLTile.js";
import OLMap from "ol/Map.js";
import View from "ol/View.js";
import "ol/ol.css";
import { fromLonLat, transformExtent } from "ol/proj.js";
import GeoTIFF from "ol/source/GeoTIFF.js";
import OSM from "ol/source/OSM.js";
import TileWMS from "ol/source/TileWMS.js";
import VectorSource from "ol/source/Vector.js";
import XYZ from "ol/source/XYZ.js";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style.js";
import type React from "react";
import { useEffect, useRef } from "react";
import type { ActiveFireDetection } from "../../../utils/firms.js";
import type { BasemapType } from "./LayerControlPanel.js";

interface OpenLayersMapViewProps {
  bbox?: [number, number, number, number];
  basemap: BasemapType;
  showWms: boolean;
  wmsUrl?: string;
  wmsLayers?: string;
  wmsTime?: string;
  wmsOpacity: number;
  showGeotiff: boolean;
  geotiffUrl?: string;
  showDetections: boolean;
  detections?: ActiveFireDetection[];
  onSelectDetection?: (detection: ActiveFireDetection | null) => void;
}

export const OpenLayersMapView: React.FC<OpenLayersMapViewProps> = ({
  bbox,
  basemap,
  showWms,
  wmsUrl,
  wmsLayers,
  wmsTime,
  wmsOpacity,
  showGeotiff,
  geotiffUrl,
  showDetections,
  detections,
  onSelectDetection,
}) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<OLMap | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);

  // Initialize map instance
  useEffect(() => {
    if (!mapRef.current) return;

    const baseTileLayer = new TileLayer({
      source: new OSM(),
      properties: { name: "basemap" },
    });

    const vectorSource = new VectorSource();
    vectorSourceRef.current = vectorSource;

    const vectorLayer = new VectorLayer({
      source: vectorSource,
      properties: { name: "detections" },
      style: (feature) => {
        const props = feature.getProperties();
        const frp = props.frp || 0;
        const confidence = props.confidence || "n";

        let fillColor = "rgba(249, 115, 22, 0.85)"; // Orange nominal
        let strokeColor = "#ffffff";
        if (
          confidence === "h" ||
          confidence === "high" ||
          Number(confidence) >= 80
        ) {
          fillColor = "rgba(239, 68, 68, 0.9)"; // Red high conf
          strokeColor = "#fee2e2";
        } else if (confidence === "l" || confidence === "low") {
          fillColor = "rgba(234, 179, 8, 0.8)"; // Yellow low conf
        }

        const radius = Math.min(Math.max(4 + Math.sqrt(frp) * 1.5, 5), 18);

        return new Style({
          image: new CircleStyle({
            radius,
            fill: new Fill({ color: fillColor }),
            stroke: new Stroke({ color: strokeColor, width: 1.5 }),
          }),
        });
      },
    });

    const initialView = new View({
      center: fromLonLat([0, 20]),
      zoom: 2.5,
    });

    const map = new OLMap({
      target: mapRef.current,
      layers: [baseTileLayer, vectorLayer],
      view: initialView,
    });

    mapInstanceRef.current = map;

    const updateMapSize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.updateSize();
      }
    };

    // ResizeObserver to ensure OpenLayers updates canvas size on container/parent resize
    const resizeObserver = new ResizeObserver(() => {
      updateMapSize();
    });

    if (mapRef.current) {
      resizeObserver.observe(mapRef.current);
      if (mapRef.current.parentElement) {
        resizeObserver.observe(mapRef.current.parentElement);
      }
    }

    window.addEventListener("resize", updateMapSize);

    // Staggered size updates after DOM layout settles and tiles load
    requestAnimationFrame(updateMapSize);
    const timer1 = setTimeout(updateMapSize, 100);
    const timer2 = setTimeout(updateMapSize, 400);
    const timer3 = setTimeout(updateMapSize, 1200);

    map.on("pointermove", (e) => {
      const hit = map.hasFeatureAtPixel(e.pixel);
      if (mapRef.current) {
        mapRef.current.style.cursor = hit ? "pointer" : "";
      }
    });

    map.on("singleclick", (e) => {
      let clickedFeature: Feature | null = null;
      map.forEachFeatureAtPixel(e.pixel, (feature) => {
        clickedFeature = feature as unknown as Feature;
        return true;
      });

      if (clickedFeature && onSelectDetection) {
        const feat = clickedFeature as Feature;
        onSelectDetection(feat.getProperties() as ActiveFireDetection);
      } else if (onSelectDetection) {
        onSelectDetection(null);
      }
    });

    return () => {
      window.removeEventListener("resize", updateMapSize);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      resizeObserver.disconnect();
      map.setTarget(undefined);
      mapInstanceRef.current = null;
    };
  }, [onSelectDetection]);

  // Update Basemap Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const baseLayer = map
      .getLayers()
      .getArray()
      .find((l) => l.get("name") === "basemap") as
      | TileLayer<OSM | XYZ>
      | undefined;

    if (baseLayer) {
      if (basemap === "satellite") {
        baseLayer.setSource(
          new XYZ({
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            maxZoom: 19,
          }),
        );
      } else if (basemap === "dark") {
        baseLayer.setSource(
          new XYZ({
            url: "https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
            maxZoom: 19,
          }),
        );
      } else {
        baseLayer.setSource(new OSM());
      }
    }
  }, [basemap]);

  // Update WMS Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const existingWms = map
      .getLayers()
      .getArray()
      .find((l) => l.get("name") === "wms");
    if (existingWms) {
      map.removeLayer(existingWms);
    }

    if (showWms && wmsUrl && wmsLayers) {
      const todayStr = new Date().toISOString().split("T")[0];
      const timeParam = wmsTime || todayStr;

      // Automatically convert GIBS epsg4326 URL to epsg3857 for OpenLayers Web Mercator
      const targetUrl = wmsUrl.replace("/wms/epsg4326/", "/wms/epsg3857/");

      const params: Record<string, string | boolean> = {
        LAYERS: wmsLayers,
        TILED: true,
        TRANSPARENT: true,
        FORMAT: "image/png",
        VERSION: "1.1.1",
        TIME: timeParam,
      };

      const wmsLayer = new TileLayer({
        source: new TileWMS({
          url: targetUrl,
          params,
          crossOrigin: "anonymous",
        }),
        opacity: wmsOpacity,
        properties: { name: "wms" },
      });

      map.getLayers().insertAt(1, wmsLayer);
    }
  }, [showWms, wmsUrl, wmsLayers, wmsTime, wmsOpacity]);

  // Update GeoTIFF Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const existingGeotiff = map
      .getLayers()
      .getArray()
      .find((l) => l.get("name") === "geotiff");
    if (existingGeotiff) {
      map.removeLayer(existingGeotiff);
    }

    if (showGeotiff && geotiffUrl) {
      try {
        const geotiffSource = new GeoTIFF({
          sources: [{ url: geotiffUrl }],
        });
        const geotiffLayer = new WebGLTileLayer({
          source: geotiffSource,
          properties: { name: "geotiff" },
        });
        map.getLayers().insertAt(1, geotiffLayer);
      } catch (err) {
        console.error("Failed to load GeoTIFF layer:", err);
      }
    }
  }, [showGeotiff, geotiffUrl]);

  // Update Vector Detections
  useEffect(() => {
    const source = vectorSourceRef.current;
    if (!source) return;

    source.clear();

    if (showDetections && detections && detections.length > 0) {
      const features = detections.map((d) => {
        const feat = new Feature({
          geometry: new Point(fromLonLat([d.longitude, d.latitude])),
          ...d,
        });
        return feat;
      });
      source.addFeatures(features);
    }
  }, [showDetections, detections]);

  // Fit view bounds to bbox or detection extent
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.updateSize();

    if (bbox && bbox.length === 4) {
      const [west, south, east, north] = bbox;
      const extent = transformExtent(
        [west, south, east, north],
        "EPSG:4326",
        "EPSG:3857",
      );
      map.getView().fit(extent, {
        padding: [40, 40, 40, 40],
        maxZoom: 13,
        duration: 800,
      });
    } else if (detections && detections.length > 0) {
      const source = vectorSourceRef.current;
      if (source && source.getFeatures().length > 0) {
        const extent = source.getExtent();
        if (extent && Number.isFinite(extent[0])) {
          map.getView().fit(extent, {
            padding: [50, 50, 50, 50],
            maxZoom: 12,
            duration: 800,
          });
        }
      }
    }
  }, [bbox, detections]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-inner">
      <div
        ref={mapRef}
        className="w-full h-full"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
};
