import { describe, expect, it } from "vitest";
import { SearchCollectionsInputSchema } from "../schemas/search-collections.schema.js";

describe("SearchCollections Input Schema", () => {
  it("should validate a correct input with keyword", () => {
    const input = { keyword: "precipitation" };
    const parsed = SearchCollectionsInputSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.keyword).toBe("precipitation");
    }
  });

  it("should validate a correct input with all optional parameters", () => {
    const input = {
      keyword: "soil moisture",
      spatialArea: "Virginia",
      spatialWkt:
        "POLYGON((-83.67 36.54, -83.67 39.46, -75.16 39.46, -75.16 36.54, -83.67 36.54))",
      startDate: "2026-05-11",
      endDate: "2026-07-11",
    };
    const parsed = SearchCollectionsInputSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.spatialArea).toBe("Virginia");
      expect(parsed.data.startDate).toBe("2026-05-11");
    }
  });

  it("should reject inputs missing keyword", () => {
    const input = { spatialArea: "Virginia" };
    const parsed = SearchCollectionsInputSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });
});
