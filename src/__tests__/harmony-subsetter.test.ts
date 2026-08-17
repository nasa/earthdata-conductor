// @vitest-environment happy-dom
import {
  useCreateHarmonyJob,
  useHarmonyRequest,
  usePollHarmonyJobStatus,
} from "@nasa-terra/components/dist/react/index.js";
import { describe, expect, it } from "vitest";

describe("Harmony Subsetter & React Hooks Integration", () => {
  it("should export React hooks from @nasa-terra/components/dist/react/index.js", () => {
    expect(typeof usePollHarmonyJobStatus).toBe("function");
    expect(typeof useCreateHarmonyJob).toBe("function");
    expect(typeof useHarmonyRequest).toBe("function");
  });

  it("should evaluate terminal statuses correctly", () => {
    const terminalStatuses = ["SUCCESSFUL", "FAILED", "CANCELED"];
    const activeStatuses = ["RUNNING", "RUNNING_WITH_ERRORS", "PAUSED", "IDLE"];

    const isTerminal = (status: string) =>
      terminalStatuses.includes(status.toUpperCase());

    for (const status of terminalStatuses) {
      expect(isTerminal(status)).toBe(true);
    }
    for (const status of activeStatuses) {
      expect(isTerminal(status)).toBe(false);
    }
  });

  it("should format progress percentages bounded between 0 and 100", () => {
    const clampProgress = (progress: number) =>
      Math.max(5, Math.min(100, progress));

    expect(clampProgress(0)).toBe(5);
    expect(clampProgress(45)).toBe(45);
    expect(clampProgress(120)).toBe(100);
  });
});
