import { describe, expect, it } from "vitest";
import { buildHarmonyUrl, parseJobId } from "../harmony.js";

describe("Harmony helper module", () => {
  describe("buildHarmonyUrl", () => {
    const harmonyBaseUrl = "https://harmony.earthdata.nasa.gov";

    it("should build simple URL with conceptId, variableId, labels, and skipPreview", () => {
      const url = buildHarmonyUrl({
        conceptId: "C12345-PROVIDER",
        variableEntryId: "V67890-PROVIDER",
        harmonyBaseUrl,
      });

      const parsedUrl = new URL(url);
      expect(parsedUrl.origin).toBe("https://harmony.earthdata.nasa.gov");
      expect(parsedUrl.pathname).toBe(
        "/C12345-PROVIDER/ogc-api-coverages/1.0.0/collections/V67890-PROVIDER/coverage/rangeset",
      );
      expect(parsedUrl.searchParams.get("label")).toBe("terra-data-subsetter");
      expect(parsedUrl.searchParams.get("skipPreview")).toBe("true");
      expect(parsedUrl.searchParams.has("subset")).toBe(false);
      expect(parsedUrl.searchParams.has("format")).toBe(false);
    });

    it("should include bounding box lat/lon subsets when boundingBox is provided", () => {
      const url = buildHarmonyUrl({
        conceptId: "C12345-PROVIDER",
        variableEntryId: "V67890-PROVIDER",
        boundingBox: [-119.83, 24.26, -65.64, 46.56],
        harmonyBaseUrl,
      });

      const parsedUrl = new URL(url);
      const subsets = parsedUrl.searchParams.getAll("subset");
      expect(subsets).toContain("lat(24.26:46.56)");
      expect(subsets).toContain("lon(-119.83:-65.64)");
    });

    it("should include time subset when only startDate is provided", () => {
      const url = buildHarmonyUrl({
        conceptId: "C12345-PROVIDER",
        variableEntryId: "V67890-PROVIDER",
        startDate: "2026-05-22T00:00:00Z",
        harmonyBaseUrl,
      });

      const parsedUrl = new URL(url);
      const subsets = parsedUrl.searchParams.getAll("subset");
      expect(subsets).toContain('time("2026-05-22T00:00:00Z":*)');
    });

    it("should include time subset when only endDate is provided", () => {
      const url = buildHarmonyUrl({
        conceptId: "C12345-PROVIDER",
        variableEntryId: "V67890-PROVIDER",
        endDate: "2026-05-24T00:00:00Z",
        harmonyBaseUrl,
      });

      const parsedUrl = new URL(url);
      const subsets = parsedUrl.searchParams.getAll("subset");
      expect(subsets).toContain('time(*:"2026-05-24T00:00:00Z")');
    });

    it("should include time subset when both startDate and endDate are provided", () => {
      const url = buildHarmonyUrl({
        conceptId: "C12345-PROVIDER",
        variableEntryId: "V67890-PROVIDER",
        startDate: "2026-05-22T00:00:00Z",
        endDate: "2026-05-24T00:00:00Z",
        harmonyBaseUrl,
      });

      const parsedUrl = new URL(url);
      const subsets = parsedUrl.searchParams.getAll("subset");
      expect(subsets).toContain(
        'time("2026-05-22T00:00:00Z":"2026-05-24T00:00:00Z")',
      );
    });

    it("should include format when provided", () => {
      const url = buildHarmonyUrl({
        conceptId: "C12345-PROVIDER",
        variableEntryId: "V67890-PROVIDER",
        format: "application/netcdf",
        harmonyBaseUrl,
      });

      const parsedUrl = new URL(url);
      expect(parsedUrl.searchParams.get("format")).toBe("application/netcdf");
    });
  });

  describe("parseJobId", () => {
    it("should extract jobId from jobID field in json response", () => {
      const res = parseJobId({ jobID: "123-abc-456" });
      expect(res).toBe("123-abc-456");
    });

    it("should extract jobId from jobId field in json response", () => {
      const res = parseJobId({ jobId: "789-def-012" });
      expect(res).toBe("789-def-012");
    });

    it("should extract jobId from final redirected URL if not present in JSON", () => {
      const res = parseJobId(
        {},
        "https://harmony.earthdata.nasa.gov/jobs/1202b23b-ef61-42ac-9116-bf008057a47f",
      );
      expect(res).toBe("1202b23b-ef61-42ac-9116-bf008057a47f");
    });

    it("should return undefined if no jobId is found in JSON or URL", () => {
      const res = parseJobId(
        {},
        "https://harmony.earthdata.nasa.gov/some-other-path",
      );
      expect(res).toBeUndefined();
    });
  });
});
