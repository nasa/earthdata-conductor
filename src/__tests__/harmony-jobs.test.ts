import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  findMatchingHarmonyJob,
  type HarmonyJob,
  type HarmonyJobQuery,
  isJobMatch,
  normalizeDate,
  parseHarmonyJobRequest,
  parseLocationBounds,
} from "../utils/harmony-jobs.js";

describe("Harmony Job Reuse & Matching Utility", () => {
  describe("normalizeDate", () => {
    it("should format ISO strings to YYYY-MM-DD", () => {
      expect(normalizeDate('"2024-09-23T04:00:00.000Z"')).toBe("2024-09-23");
      expect(normalizeDate("2024-09-29T23:59:59Z")).toBe("2024-09-29");
      expect(normalizeDate("2024-09-23")).toBe("2024-09-23");
    });

    it("should return null for invalid or empty dates", () => {
      expect(normalizeDate(undefined)).toBeNull();
      expect(normalizeDate("")).toBeNull();
    });
  });

  describe("parseLocationBounds", () => {
    it("should parse 4-coordinate bounding box strings", () => {
      const bounds = parseLocationBounds("-82.67, 35.41, -82.46, 35.65");
      expect(bounds).toEqual({
        west: -82.67,
        south: 35.41,
        east: -82.46,
        north: 35.65,
      });
    });

    it("should parse 2-coordinate point strings", () => {
      const bounds = parseLocationBounds("35.41, -82.67");
      expect(bounds).toEqual({
        west: -82.67,
        south: 35.41,
        east: -82.67,
        north: 35.41,
      });
    });

    it("should return null for invalid location strings", () => {
      expect(parseLocationBounds(undefined)).toBeNull();
      expect(parseLocationBounds("invalid")).toBeNull();
    });
  });

  describe("parseHarmonyJobRequest", () => {
    it("should parse a time series job request URL and labels", () => {
      const requestUrl =
        "https://harmony.earthdata.nasa.gov/C2723754847-GES_DISC/ogc-api-coverages/1.0.0/collections/parameter_vars/coverage/rangeset?subset=lat(35.41%3A35.65)&subset=lon(-82.67%3A-82.46)&subset=time(%222024-09-23T04%3A00%3A00.000Z%22%3A%222024-09-29T23%3A59%3A59.999Z%22)&format=text%2Fcsv&variable=GPM_3IMERGHH_07_precipitation&average=area";
      const labels = [
        "collection: gpm_3imerghh_07",
        "terra-time-series",
        "units: mm/hr",
      ];

      const parsed = parseHarmonyJobRequest(requestUrl, labels);
      expect(parsed.requestType).toBe("time-series");
      expect(parsed.collection).toBe("gpm_3imerghh_07");
      expect(parsed.variables).toContain("GPM_3IMERGHH_07_precipitation");
      expect(parsed.startDate).toBe("2024-09-23T04:00:00.000Z");
      expect(parsed.endDate).toBe("2024-09-29T23:59:59.999Z");
      expect(parsed.latMin).toBe(35.41);
      expect(parsed.latMax).toBe(35.65);
      expect(parsed.lonMin).toBe(-82.67);
      expect(parsed.lonMax).toBe(-82.46);
    });

    it("should parse a time average map job request URL and labels", () => {
      const requestUrl =
        "https://harmony.earthdata.nasa.gov/C2723754847-GES_DISC/ogc-api-coverages/1.0.0/collections/parameter_vars/coverage/rangeset?subset=lat(35.41%3A35.65)&subset=lon(-82.67%3A-82.46)&subset=time(%222024-09-23T04%3A00%3A00.000Z%22%3A%222024-09-29T04%3A00%3A00.000Z%22)&format=image%2Ftiff&variable=GPM_3IMERGHH_07_precipitation&average=time";
      const labels = ["collection: gpm_3imerghh_07", "terra-time-average-map"];

      const parsed = parseHarmonyJobRequest(requestUrl, labels);
      expect(parsed.requestType).toBe("time-average-map");
      expect(parsed.collection).toBe("gpm_3imerghh_07");
      expect(parsed.average).toBe("time");
    });
  });

  describe("isJobMatch", () => {
    const sampleTimeSeriesJob: HarmonyJob = {
      jobID: "4391a254-9ab0-48ad-bb0b-4b5e5f2d56c9",
      status: "successful",
      labels: [
        "collection: gpm_3imerghh_07",
        "terra-time-series",
        "units: mm/hr",
      ],
      request:
        "https://harmony.earthdata.nasa.gov/C2723754847-GES_DISC/ogc-api-coverages/1.0.0/collections/parameter_vars/coverage/rangeset?subset=lat(35.41%3A35.65)&subset=lon(-82.67%3A-82.46)&subset=time(%222024-09-23T04%3A00%3A00.000Z%22%3A%222024-09-29T23%3A59%3A59.999Z%22)&format=text%2Fcsv&label=terra-time-series&variable=GPM_3IMERGHH_07_precipitation&average=area",
    };

    it("should match a valid time-series job matching all criteria", () => {
      const query: HarmonyJobQuery = {
        requestType: "time-series",
        collection: "GPM_3IMERGHH_07",
        variable: "GPM_3IMERGHH_07_precipitation",
        startDate: "2024-09-23T04:00:00Z",
        endDate: "2024-09-29T23:59:59Z",
        location: "-82.67, 35.41, -82.46, 35.65",
      };

      expect(isJobMatch(sampleTimeSeriesJob, query)).toBe(true);
    });

    it("should reject jobs with failed or canceled status", () => {
      const failedJob = { ...sampleTimeSeriesJob, status: "failed" };
      const query: HarmonyJobQuery = {
        requestType: "time-series",
        collection: "GPM_3IMERGHH_07",
      };

      expect(isJobMatch(failedJob, query)).toBe(false);
    });

    it("should reject jobs matching wrong requestType", () => {
      const query: HarmonyJobQuery = {
        requestType: "time-average-map",
        collection: "GPM_3IMERGHH_07",
      };

      expect(isJobMatch(sampleTimeSeriesJob, query)).toBe(false);
    });
  });

  describe("findMatchingHarmonyJob API integration", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should return matching jobID when fetch succeeds", async () => {
      const sampleJobs: HarmonyJob[] = [
        {
          jobID: "target-job-123",
          status: "successful",
          labels: ["collection: gpm_3imerghh_07", "terra-time-series"],
          request:
            "https://harmony.earthdata.nasa.gov/C2723754847-GES_DISC/ogc-api-coverages/1.0.0/collections/parameter_vars/coverage/rangeset?subset=lat(35.41%3A35.65)&subset=lon(-82.67%3A-82.46)&subset=time(%222024-09-23T04%3A00%3A00.000Z%22%3A%222024-09-29T23%3A59%3A59.999Z%22)&format=text%2Fcsv&variable=GPM_3IMERGHH_07_precipitation&average=area",
        },
      ];

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ jobs: sampleJobs }),
      } as Response);

      const query: HarmonyJobQuery = {
        requestType: "time-series",
        collection: "GPM_3IMERGHH_07",
        variable: "precipitation",
        startDate: "2024-09-23",
        endDate: "2024-09-29",
      };

      const matchedId = await findMatchingHarmonyJob(query, "mock-token");
      expect(matchedId).toBe("target-job-123");
    });

    it("should return null if no jobs match query", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ jobs: [] }),
      } as Response);

      const query: HarmonyJobQuery = {
        requestType: "time-series",
        collection: "NON_EXISTENT",
      };

      const matchedId = await findMatchingHarmonyJob(query, "mock-token");
      expect(matchedId).toBeNull();
    });

    it("should return null if fetch throws an error", async () => {
      globalThis.fetch = vi
        .fn()
        .mockRejectedValue(new Error("Network failure"));

      const query: HarmonyJobQuery = {
        requestType: "time-series",
        collection: "GPM_3IMERGHH_07",
      };

      const matchedId = await findMatchingHarmonyJob(query, "mock-token");
      expect(matchedId).toBeNull();
    });
  });
});
