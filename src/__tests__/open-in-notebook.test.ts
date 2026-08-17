import { beforeEach, describe, expect, it } from "vitest";
import {
  OpenInNotebookInputSchema,
  OpenInNotebookOutputSchema,
} from "../schemas/open-in-notebook.schema.js";
import { generateMultiStepNotebook, getMarimoUrl } from "../utils/marimo.js";
import { sessionHistory } from "../utils/session-history.js";

describe("Session History & Open in Notebook Generator", () => {
  beforeEach(() => {
    sessionHistory.clear();
  });

  it("should record session steps in sessionHistory manager", () => {
    sessionHistory.addStep("search-collections", { keyword: "precipitation" });
    sessionHistory.addStep("create-harmony-job", {
      collectionId: "C12345-TEST",
      bbox: [-180, -90, 180, 90],
    });

    const steps = sessionHistory.getSteps();
    expect(steps).toHaveLength(2);
    expect(steps[0].toolName).toBe("search-collections");
    expect(steps[1].toolName).toBe("create-harmony-job");
  });

  it("should generate a multi-step notebook from session history", () => {
    sessionHistory.addStep("search-collections", {
      keyword: "precipitation",
      startDate: "2026-01-01",
      endDate: "2026-06-01",
    });
    sessionHistory.addStep("create-harmony-job", {
      collectionId: "C1276812863-GES_DISC",
      variable: "precipitation",
      bbox: [-122.5, 37.5, -122.0, 38.0],
    });
    sessionHistory.addStep("time-series-plot", {
      collection: "GPM_3IMERGHH_07",
      variable: "precipitation",
    });

    const code = generateMultiStepNotebook(sessionHistory.getSteps());

    expect(code).toContain("import marimo");
    expect(code).toContain("import earthaccess");
    expect(code).toContain("search-collections");
    expect(code).toContain("create-harmony-job");
    expect(code).toContain("time-series-plot");
    expect(code).toContain("from harmony import Client");
  });

  it("should generate a fallback notebook when no session steps are present", () => {
    const code = generateMultiStepNotebook([], {
      collection: "GPM_3IMERGDF",
    });

    expect(code).toContain("import marimo");
    expect(code).toContain('short_name="GPM_3IMERGDF"');
  });

  it("should compress multi-step notebook code into a valid WASM URL", () => {
    const code = generateMultiStepNotebook([]);
    const url = getMarimoUrl(code);

    expect(url).toContain("https://molab.marimo.io/new/wasm/?edit=true#code/");
  });

  it("should validate input and output schemas", () => {
    const inputParsed = OpenInNotebookInputSchema.parse({
      collection: "GPM_3IMERGDF",
      variable: "precipitation",
    });
    expect(inputParsed.collection).toBe("GPM_3IMERGDF");

    const outputParsed = OpenInNotebookOutputSchema.parse({
      marimoUrl: "https://molab.marimo.io/new/wasm/?edit=true#code/123",
      pythonCode: "import marimo",
      stepCount: 2,
    });
    expect(outputParsed.stepCount).toBe(2);
  });
});
