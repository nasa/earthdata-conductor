import { describe, expect, it } from "vitest";
import {
  sanitizeCollection,
  sanitizeCollections,
} from "../utils/collections.js";

describe("Collection Payload Sanitizer", () => {
  it("should retain only allowed fields and drop heavy CMR metadata", () => {
    const rawCollection = {
      concept_id: "C12345-PROVIDER",
      entry_title: "Test Collection Title",
      short_name: "TEST_SHORT",
      version: "01",
      abstract:
        "This is a detailed abstract that should be converted to summary.",
      provider_id: "PROVIDER",
      processing_level_id: "3",
      platforms: [{ short_name: "PLATFORM_A" }],
      instruments: ["INST_1"],
      time_start: "2020-01-01T00:00:00Z",
      time_end: "2025-01-01T00:00:00Z",
      granule_count: 42,
      // Heavy unused CMR fields that must be dropped:
      related_urls: [{ url: "https://example.com", description: "Heavy" }],
      science_keywords: [{ Category: "EARTH SCIENCE" }],
      data_centers: [{ role: "ARCHIVER" }],
      archive_and_distribution_information: [{ name: "Archive" }],
      doi: "10.1000/test",
      native_id: "NATIVE_123",
      revision_id: 99,
    };

    const sanitized = sanitizeCollection(rawCollection);

    expect(sanitized).toEqual({
      concept_id: "C12345-PROVIDER",
      entry_title: "Test Collection Title",
      short_name: "TEST_SHORT",
      version: "01",
      summary:
        "This is a detailed abstract that should be converted to summary.",
      provider_id: "PROVIDER",
      processing_level_id: "3",
      platforms: ["PLATFORM_A"],
      instruments: ["INST_1"],
      time_start: "2020-01-01T00:00:00Z",
      time_end: "2025-01-01T00:00:00Z",
      granule_count: 42,
    });

    expect(sanitized).not.toHaveProperty("related_urls");
    expect(sanitized).not.toHaveProperty("science_keywords");
    expect(sanitized).not.toHaveProperty("data_centers");
    expect(sanitized).not.toHaveProperty("abstract");
    expect(sanitized).not.toHaveProperty("doi");
  });

  it("should collapse whitespace and truncate summaries exceeding 300 characters", () => {
    const longAbstract = `
      Paragraph 1:  This is line 1.   Line 2 has extra spaces.   
      
      Paragraph 2: ${"A".repeat(350)}
    `;

    const sanitized = sanitizeCollection({
      concept_id: "C1",
      entry_title: "Title",
      abstract: longAbstract,
    });

    expect(sanitized.summary).toBeDefined();
    expect(sanitized.summary?.length).toBeLessThanOrEqual(303); // 300 + '...'
    expect(sanitized.summary).not.toContain("\n");
    expect(sanitized.summary?.endsWith("...")).toBe(true);
  });

  it("should handle empty or minimal collection objects safely", () => {
    const sanitized = sanitizeCollection({});
    expect(sanitized).toEqual({
      concept_id: "",
      entry_title: "",
    });
  });

  it("should sanitize array of collections", () => {
    const list = [
      { concept_id: "C1", entry_title: "T1", abstract: "Abstract 1" },
      { concept_id: "C2", entry_title: "T2", summary: "Summary 2" },
    ];
    const sanitizedList = sanitizeCollections(list);
    expect(sanitizedList).toHaveLength(2);
    expect(sanitizedList[0].summary).toBe("Abstract 1");
    expect(sanitizedList[1].summary).toBe("Summary 2");
  });
});
