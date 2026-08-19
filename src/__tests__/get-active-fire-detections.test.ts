import { describe, expect, it } from "vitest";
import {
  GetActiveFireDetectionsInputSchema,
  GetActiveFireDetectionsOutputSchema,
} from "../schemas/get-active-fire-detections.schema.js";

describe("get-active-fire-detections Schema Validation", () => {
  it("should validate input schema with defaults", () => {
    const parsed = GetActiveFireDetectionsInputSchema.parse({
      spatialArea: "Asheville, NC",
    });

    expect(parsed.spatialArea).toBe("Asheville, NC");
    expect(parsed.days).toBe(2);
    expect(parsed.source).toBe("VIIRS_SNPP_NRT");
  });

  it("should validate input schema with explicit bbox and parameters", () => {
    const parsed = GetActiveFireDetectionsInputSchema.parse({
      bbox: [-83, 34, -81, 36],
      days: 4,
      source: "MODIS_NRT",
      date: "2026-08-15",
    });

    expect(parsed.bbox).toEqual([-83, 34, -81, 36]);
    expect(parsed.days).toBe(4);
    expect(parsed.source).toBe("MODIS_NRT");
    expect(parsed.date).toBe("2026-08-15");
  });

  it("should validate output schema", () => {
    const parsedOutput = GetActiveFireDetectionsOutputSchema.parse({
      title: "Active Fire Detections (VIIRS_SNPP_NRT)",
      bbox: [-83, 34, -81, 36],
      source: "VIIRS_SNPP_NRT",
      days: 2,
      detectionCount: 1,
      detections: [
        {
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
        },
      ],
      wmsOverlay: {
        url: "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi",
        layers: "VIIRS_SNPP_Thermal_Anomalies_375m_Day",
      },
    });

    expect(parsedOutput.detectionCount).toBe(1);
    expect(parsedOutput.detections[0].frp).toBe(12.5);
  });
});
