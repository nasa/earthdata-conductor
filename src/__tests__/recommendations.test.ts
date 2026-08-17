import { describe, expect, it } from "vitest";
import { getRecommendations } from "../utils/recommendations.js";

describe("getRecommendations helper function", () => {
  const dummyVariables = [
    {
      name: "SPEED",
      longName: "10-meter wind speed",
      href: "http://example.com/variables/SPEED",
    },
    {
      name: "T2M",
      longName: "2-meter air temperature",
      href: "http://example.com/variables/T2M",
    },
    {
      name: "QV2M",
      longName: "2-meter specific humidity",
      href: "http://example.com/variables/QV2M",
    },
    {
      name: "PRECTOT",
      longName: "Total precipitation",
      href: "http://example.com/variables/PRECTOT",
    },
    {
      name: "UNKNOWN",
      longName: "Some unrelated variable",
      href: "http://example.com/variables/UNKNOWN",
    },
  ];

  it("should return variables marked as not recommended when keyword is empty", () => {
    const results = getRecommendations("", dummyVariables);
    expect(results).toHaveLength(5);
    for (const r of results) {
      expect(r.isRecommended).toBe(false);
    }
  });

  it("should match wind speed and return correct reasons", () => {
    const results = getRecommendations(
      "Hurricane wind speed Jamaica",
      dummyVariables,
    );
    const speedVar = results.find((r) => r.name === "SPEED");
    const tempVar = results.find((r) => r.name === "T2M");

    expect(speedVar?.isRecommended).toBe(true);
    expect(speedVar?.reason).toContain("wind/storm");
    expect(tempVar?.isRecommended).toBe(false);
  });

  it("should match temperature and return correct reasons", () => {
    const results = getRecommendations(
      "diurnal temperature cycle",
      dummyVariables,
    );
    const tempVar = results.find((r) => r.name === "T2M");
    const speedVar = results.find((r) => r.name === "SPEED");

    expect(tempVar?.isRecommended).toBe(true);
    expect(tempVar?.reason).toContain("temperature/heat");
    expect(speedVar?.isRecommended).toBe(false);
  });

  it("should match humidity and return correct reasons", () => {
    const results = getRecommendations(
      "extreme dryness and low humidity",
      dummyVariables,
    );
    const qvVar = results.find((r) => r.name === "QV2M");

    expect(qvVar?.isRecommended).toBe(true);
    expect(qvVar?.reason).toContain("humidity/moisture");
  });

  it("should perform direct word match if not covered by categories", () => {
    const results = getRecommendations(
      "I am studying unrelated data",
      dummyVariables,
    );
    const unknownVar = results.find((r) => r.name === "UNKNOWN");

    expect(unknownVar?.isRecommended).toBe(true);
    expect(unknownVar?.reason).toBe(
      "Matches 'unrelated' directly from your query",
    );
  });

  it("should score wind speed higher than humidity when wind is mentioned in the query", () => {
    const results = getRecommendations(
      "Hurricane Melissa wind speed track Jamaica",
      dummyVariables,
    );
    const speedVar = results.find((r) => r.name === "SPEED");
    const qvVar = results.find((r) => r.name === "QV2M");

    expect(speedVar?.isRecommended).toBe(true);
    expect(speedVar?.score).toBeGreaterThan(qvVar?.score || 0);
  });
});
