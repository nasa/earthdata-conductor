import { describe, expect, it } from "vitest";
import {
  ShowGeotiffMapInputSchema,
  ShowGeotiffMapOutputSchema,
} from "../schemas/show-geotiff-map.schema.js";

describe("show-geotiff-map Schema Validation", () => {
  it("should validate input schema", () => {
    const parsed = ShowGeotiffMapInputSchema.parse({
      url: "https://example.com/data/sample.tif",
      title: "Sample GeoTIFF Raster",
      bbox: [-122.5, 37.5, -122.0, 38.0],
    });

    expect(parsed.url).toBe("https://example.com/data/sample.tif");
    expect(parsed.title).toBe("Sample GeoTIFF Raster");
    expect(parsed.bbox).toEqual([-122.5, 37.5, -122.0, 38.0]);
  });

  it("should validate output schema", () => {
    const output = ShowGeotiffMapOutputSchema.parse({
      url: "https://example.com/data/sample.tif",
      title: "Sample GeoTIFF Raster",
      bbox: [-122.5, 37.5, -122.0, 38.0],
      colormap: "viridis",
    });

    expect(output.url).toBe("https://example.com/data/sample.tif");
    expect(output.colormap).toBe("viridis");
  });
});
