import { describe, expect, it } from "vitest";
import {
  ShowWmsMapInputSchema,
  ShowWmsMapOutputSchema,
} from "../schemas/show-wms-map.schema.js";

describe("show-wms-map Schema Validation", () => {
  it("should validate input schema with default format and transparent flag", () => {
    const parsed = ShowWmsMapInputSchema.parse({
      wmsUrl: "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi",
      layers: "MODIS_Terra_CorrectedReflectance_TrueColor",
    });

    expect(parsed.wmsUrl).toBe(
      "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi",
    );
    expect(parsed.layers).toBe("MODIS_Terra_CorrectedReflectance_TrueColor");
    expect(parsed.format).toBe("image/png");
    expect(parsed.transparent).toBe(true);
  });

  it("should validate output schema", () => {
    const output = ShowWmsMapOutputSchema.parse({
      wmsUrl: "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi",
      layers: "VIIRS_SNPP_CorrectedReflectance_TrueColor",
      title: "VIIRS True Color WMS Map",
      bbox: [-180, -90, 180, 90],
      time: "2026-08-18",
      format: "image/png",
      transparent: true,
    });

    expect(output.title).toBe("VIIRS True Color WMS Map");
    expect(output.time).toBe("2026-08-18");
  });
});
