import { describe, expect, it } from "vitest";
import {
  fetchFirmsActiveFires,
  normalizeSatellite,
  parseFirmsCsv,
} from "../utils/firms.js";

describe("FIRMS Parser & Utilities", () => {
  it("should normalize satellite codes to human readable names", () => {
    expect(normalizeSatellite("N")).toBe("Suomi NPP");
    expect(normalizeSatellite("N20")).toBe("NOAA-20");
    expect(normalizeSatellite("N21")).toBe("NOAA-21");
    expect(normalizeSatellite("T")).toBe("Terra");
    expect(normalizeSatellite("A")).toBe("Aqua");
    expect(normalizeSatellite("custom")).toBe("custom");
  });

  it("should parse FIRMS VIIRS CSV output correctly", () => {
    const csvData = `latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight
35.42,-82.53,325.4,0.4,0.3,2026-08-19,0714,N,VIIRS,h,2.0,290.1,12.5,D
35.61,-82.41,310.2,0.5,0.4,2026-08-19,0714,N20,VIIRS,n,2.0,285.4,5.2,N`;

    const detections = parseFirmsCsv(csvData);

    expect(detections).toHaveLength(2);

    expect(detections[0]).toEqual({
      latitude: 35.42,
      longitude: -82.53,
      bright_ti4: 325.4,
      bright_ti5: 290.1,
      acq_date: "2026-08-19",
      acq_time: "0714",
      satellite: "Suomi NPP",
      instrument: "VIIRS",
      confidence: "h",
      frp: 12.5,
      daynight: "D",
    });

    expect(detections[1]).toEqual({
      latitude: 35.61,
      longitude: -82.41,
      bright_ti4: 310.2,
      bright_ti5: 285.4,
      acq_date: "2026-08-19",
      acq_time: "0714",
      satellite: "NOAA-20",
      instrument: "VIIRS",
      confidence: "n",
      frp: 5.2,
      daynight: "N",
    });
  });

  it("should handle empty or invalid CSV text gracefully", () => {
    expect(parseFirmsCsv("")).toEqual([]);
    expect(parseFirmsCsv("header1,header2")).toEqual([]);
    expect(parseFirmsCsv("invalid csv content")).toEqual([]);
  });

  it("should construct fetchFirmsActiveFires result with default fallback when mapKey is missing", async () => {
    const result = await fetchFirmsActiveFires({
      bbox: [-83, 34, -81, 36],
      days: 2,
      source: "VIIRS_SNPP_NRT",
    });

    expect(result.title).toBe("Active Fire Satellite Imagery (VIIRS_SNPP_NRT)");
    expect(result.apiKeyMissing).toBe(true);
    expect(result.bbox).toEqual([-83, 34, -81, 36]);
    expect(result.wmsOverlay).toBeDefined();
    expect(result.wmsOverlay?.layers).toBe(
      "VIIRS_SNPP_Thermal_Anomalies_375m_Day",
    );
  });
});
