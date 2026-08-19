export interface ActiveFireDetection {
  latitude: number;
  longitude: number;
  bright_ti4?: number;
  bright_ti5?: number;
  acq_date: string;
  acq_time: string;
  satellite: string;
  instrument: string;
  confidence: string;
  frp: number;
  daynight: string;
}

export interface FetchFirmsParams {
  bbox: [number, number, number, number];
  days?: number;
  source?: string;
  date?: string;
  mapKey?: string;
}

export interface FetchFirmsResult {
  title: string;
  bbox: [number, number, number, number];
  source: string;
  days: number;
  date?: string;
  detectionCount: number;
  detections: ActiveFireDetection[];
  apiKeyMissing?: boolean;
  wmsOverlay?: {
    url: string;
    layers: string;
    time?: string;
  };
}

/**
 * Normalizes satellite code string to human readable satellite name
 */
export function normalizeSatellite(sat: string): string {
  const code = sat.trim().toUpperCase();
  switch (code) {
    case "N":
    case "NPP":
    case "SUOMI NPP":
      return "Suomi NPP";
    case "N20":
    case "NOAA20":
    case "NOAA-20":
      return "NOAA-20";
    case "N21":
    case "NOAA21":
    case "NOAA-21":
      return "NOAA-21";
    case "T":
    case "TERRA":
      return "Terra";
    case "A":
    case "AQUA":
      return "Aqua";
    case "L":
    case "LANDSAT":
      return "Landsat";
    default:
      return sat;
  }
}

/**
 * Parses FIRMS CSV output into structured ActiveFireDetection objects
 */
export function parseFirmsCsv(csvText: string): ActiveFireDetection[] {
  if (!csvText?.trim()) {
    return [];
  }

  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length <= 1) {
    return [];
  }

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const latIdx = header.indexOf("latitude");
  const lonIdx = header.indexOf("longitude");
  const ti4Idx =
    header.indexOf("bright_ti4") !== -1
      ? header.indexOf("bright_ti4")
      : header.indexOf("brightness");
  const ti5Idx =
    header.indexOf("bright_ti5") !== -1
      ? header.indexOf("bright_ti5")
      : header.indexOf("bright_t31");
  const dateIdx = header.indexOf("acq_date");
  const timeIdx = header.indexOf("acq_time");
  const satIdx = header.indexOf("satellite");
  const instIdx = header.indexOf("instrument");
  const confIdx = header.indexOf("confidence");
  const frpIdx = header.indexOf("frp");
  const dayIdx = header.indexOf("daynight");

  if (latIdx === -1 || lonIdx === -1) {
    return [];
  }

  const detections: ActiveFireDetection[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(",").map((cell) => cell.trim());
    if (row.length <= Math.max(latIdx, lonIdx)) {
      continue;
    }

    const lat = Number(row[latIdx]);
    const lon = Number(row[lonIdx]);

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      continue;
    }

    const frpVal = frpIdx !== -1 ? Number(row[frpIdx]) : 0;
    const ti4Val = ti4Idx !== -1 ? Number(row[ti4Idx]) : undefined;
    const ti5Val = ti5Idx !== -1 ? Number(row[ti5Idx]) : undefined;

    detections.push({
      latitude: lat,
      longitude: lon,
      bright_ti4: Number.isNaN(ti4Val) ? undefined : ti4Val,
      bright_ti5: Number.isNaN(ti5Val) ? undefined : ti5Val,
      acq_date: dateIdx !== -1 ? row[dateIdx] : "",
      acq_time: timeIdx !== -1 ? row[timeIdx] : "",
      satellite: satIdx !== -1 ? normalizeSatellite(row[satIdx]) : "Unknown",
      instrument: instIdx !== -1 ? row[instIdx] : "VIIRS",
      confidence: confIdx !== -1 ? row[confIdx] : "nominal",
      frp: Number.isNaN(frpVal) ? 0 : frpVal,
      daynight: dayIdx !== -1 ? row[dayIdx] : "D",
    });
  }

  return detections;
}

/**
 * Fetches active fire detections from NASA FIRMS API
 */
export async function fetchFirmsActiveFires(
  params: FetchFirmsParams,
): Promise<FetchFirmsResult> {
  const mapKey = params.mapKey || process.env.FIRMS_MAP_KEY;
  const source = params.source || "VIIRS_SNPP_NRT";
  const days =
    params.days && params.days >= 1 && params.days <= 5 ? params.days : 2;
  const [west, south, east, north] = params.bbox;

  let detections: ActiveFireDetection[] = [];
  const apiKeyMissing = !mapKey || !mapKey.trim();

  if (mapKey && mapKey.trim()) {
    const bboxStr = `${west},${south},${east},${north}`;
    let url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/${source}/${bboxStr}/${days}`;
    if (params.date) {
      url += `/${params.date}`;
    }

    try {
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        detections = parseFirmsCsv(text);
      } else {
        console.warn(
          `FIRMS API returned status ${res.status}: ${await res.text()}`,
        );
      }
    } catch (err) {
      console.error("Failed to query FIRMS API:", err);
    }
  } else {
    console.warn(
      "No FIRMS_MAP_KEY provided in environment. Returning empty detections with WMS overlay fallback.",
    );
  }

  const wmsLayer = source.startsWith("MODIS")
    ? "MODIS_Thermal_Anomalies_Day"
    : "VIIRS_SNPP_Thermal_Anomalies_375m_Day";

  const todayStr = new Date().toISOString().split("T")[0];

  return {
    title: apiKeyMissing
      ? `Active Fire Satellite Imagery (${source})`
      : `Active Fire Detections (${source})`,
    bbox: params.bbox,
    source,
    days,
    date: params.date,
    detectionCount: detections.length,
    detections,
    apiKeyMissing,
    wmsOverlay: {
      url: "https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi",
      layers: wmsLayer,
      time: params.date || todayStr,
    },
  };
}
