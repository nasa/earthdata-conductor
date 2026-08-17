import { describe, expect, it } from "vitest";
import { compressToEncodedURIComponent } from "../utils/lz-string.js";
import { generateMultiStepNotebook, getMarimoUrl } from "../utils/marimo.js";

describe("Marimo Notebook Generator & LZString Compressor", () => {
  it("should compress python code string into URI-safe encoded string", () => {
    const code = 'import marimo\nprint("hello")';
    const compressed = compressToEncodedURIComponent(code);
    expect(compressed).toBeTypeOf("string");
    expect(compressed.length).toBeGreaterThan(0);
  });

  it("should build valid marimo.io WASM URLs", () => {
    const code = "import marimo";
    const url = getMarimoUrl(code);
    expect(url).toContain("https://molab.marimo.io/new/wasm/?edit=true#code/");
  });

  it("should generate search notebook step in multi-step notebook", () => {
    const code = generateMultiStepNotebook([
      {
        toolName: "search-collections",
        timestamp: Date.now(),
        params: {
          keyword: "precipitation",
          startDate: "2026-01-01",
          endDate: "2026-12-31",
        },
      },
    ]);

    expect(code).toContain("import earthaccess");
    expect(code).toContain("earthaccess.search_data");
    expect(code).toContain('short_name="precipitation"');
    expect(code).toContain("earthaccess.login()");
  });

  it("should generate browse data step in multi-step notebook", () => {
    const code = generateMultiStepNotebook([
      {
        toolName: "browse-data",
        timestamp: Date.now(),
        params: {
          shortName: "GPM_3IMERGHH",
          version: "07",
        },
      },
    ]);

    expect(code).toContain("import earthaccess");
    expect(code).toContain("GPM_3IMERGHH");
  });

  it("should generate harmony python subsetting step in multi-step notebook", () => {
    const code = generateMultiStepNotebook([
      {
        toolName: "create-harmony-job",
        timestamp: Date.now(),
        params: {
          collectionId: "C1276812863-GES_DISC",
          variable: "precipitation",
          bbox: [-122.5, 37.5, -122.0, 38.0],
          format: "application/netcdf",
        },
      },
    ]);

    expect(code).toContain(
      "from harmony import Client, Collection, Request, BBox, Format",
    );
    expect(code).toContain("client.submit(request)");
    expect(code).toContain("client.download_all(job_id)");
    expect(code).toContain("C1276812863-GES_DISC");
  });

  it("should generate time series plot step with matplotlib and xarray", () => {
    const code = generateMultiStepNotebook([
      {
        toolName: "time-series-plot",
        timestamp: Date.now(),
        params: {
          collection: "GPM_3IMERGHH_07",
          variable: "precipitation",
        },
      },
    ]);

    expect(code).toContain("import matplotlib.pyplot as plt");
    expect(code).toContain("import xarray as xr");
    expect(code).toContain("ts.plot(ax=ax");
  });

  it("should generate time averaged map step with matplotlib and xarray", () => {
    const code = generateMultiStepNotebook([
      {
        toolName: "time-averaged-map",
        timestamp: Date.now(),
        params: {
          collection: "M2T1NXAER_5_12_4",
          variable: "BCCMASS",
        },
      },
    ]);

    expect(code).toContain("import matplotlib.pyplot as plt");
    expect(code).toContain("import xarray as xr");
    expect(code).toContain("map_data = da.mean(dim=");
    expect(code).toContain('map_data.plot(ax=ax, cmap="viridis")');
  });
});
