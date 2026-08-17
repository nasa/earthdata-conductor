import { compressToEncodedURIComponent } from "./lz-string.js";
import type { SessionStep } from "./session-history.js";

export function getMarimoUrl(code: string, wasm = false): string {
  const compressed = compressToEncodedURIComponent(code);
  const base = wasm
    ? "https://molab.marimo.io/new/wasm/"
    : "https://molab.marimo.io/new/";

  return `${base}?edit=true#code/${compressed}`;
}

export interface ExplicitNotebookParams {
  collection?: string;
  shortName?: string;
  spatialArea?: string;
  startDate?: string;
  endDate?: string;
  variable?: string;
}

export function generateMultiStepNotebook(
  steps: SessionStep[],
  explicitParams?: ExplicitNotebookParams,
  wasm = false,
): string {
  const cells: string[] = [];

  // Setup cell 1 (WASM only): micropip installs deps the browser runtime lacks
  if (wasm) {
    cells.push(`@app.cell
async def _():
    import micropip

    await micropip.install([
        "aiobotocore==3.8.0",
        "earthaccess==0.18.0",
        "harmony-py==1.6.0",
    ])

    return (micropip,)`);
  }

  // Setup cell 2: Imports
  cells.push(`@app.cell
def _():
    import marimo as mo
    import earthaccess
    import xarray as xr
    import matplotlib.pyplot as plt
    return earthaccess, mo, plt, xr`);

  // Setup cell 3: Auth
  cells.push(`@app.cell
def _(earthaccess):
    # Authenticate with NASA Earthdata
    auth = earthaccess.login()
    return (auth,)`);

  // Build markdown header & body cells based on session steps or explicit params
  let mdIntro =
    "# NASA Earthdata Analysis Notebook\\n\\nGenerated from your MCP Assistant Session.\\n\\n";

  if (steps.length > 0) {
    mdIntro += "### Workflow Steps Included:\\n";

    steps.forEach((step, idx) => {
      mdIntro += `${idx + 1}. **${step.toolName}** - \`${JSON.stringify(
        step.params,
      )}\`\\n`;
    });
  } else if (explicitParams) {
    const coll =
      explicitParams.collection ||
      explicitParams.shortName ||
      "Earthdata Collection";

    mdIntro += `### Active Collection: **${coll}**\\n`;

    if (explicitParams.spatialArea) {
      mdIntro += `- Spatial Area: ${explicitParams.spatialArea}\\n`;
    }

    if (explicitParams.startDate && explicitParams.endDate) {
      mdIntro += `- Time Range: ${explicitParams.startDate} to ${explicitParams.endDate}\\n`;
    }
  }

  cells.push(`@app.cell
def _(mo):
    mo.md(
        """
${mdIntro}
        """
    )
    return`);

  // Process steps if present
  let hasSearch = false;
  let hasSubset = false;
  let hasPlot = false;

  for (const step of steps) {
    if (
      step.toolName === "search-collections" ||
      step.toolName === "browse-data"
    ) {
      hasSearch = true;

      const kw =
        (step.params.keyword as string) ||
        (step.params.shortName as string) ||
        "precipitation";

      const start = (step.params.startDate as string) || "";
      const end = (step.params.endDate as string) || "";

      cells.push(`@app.cell
def _(earthaccess, mo):
    mo.md("## 1. Collection Search & Granule Discovery")

    results = earthaccess.search_data(
        short_name="${kw}",
        ${start && end ? `temporal=("${start}", "${end}"),` : ""}
        count=10,
    )

    print(f"Found {len(results)} matching granules")
    return (results,)`);
    }

    if (step.toolName === "create-harmony-job") {
      hasSubset = true;

      const conceptId =
        (step.params.collectionId as string) || "C1276812863-GES_DISC";

      const bbox = (step.params.bbox as number[]) || [-180, -90, 180, 90];

      const start = (step.params.startDate as string) || "";
      const end = (step.params.endDate as string) || "";

      const variable =
        (step.params.variables as string[])?.[0] ||
        (step.params.variable as string);

      cells.push(`@app.cell
def _(mo):
    mo.md("## Harmony Spatial & Variable Subsetting")

    from harmony import Client, Collection, Request, BBox, Format

    client = Client()

    request = Request(
        collection=Collection(id="${conceptId}"),
        spatial=BBox(${bbox[0]}, ${bbox[1]}, ${bbox[2]}, ${bbox[3]}),
        ${start && end ? `temporal={"start": "${start}", "stop": "${end}"},` : ""}
        ${variable ? `variables=["${variable}"],` : ""}
        format=Format("application/netcdf")
    )

    print("Submitting Harmony Subsetting Request...")

    job_id = client.submit(request)

    print(f"Job ID: {job_id}")

    client.wait_for_processing(job_id)

    downloaded_files = client.download_all(job_id)

    return (
        BBox,
        Client,
        Collection,
        Format,
        Request,
        client,
        downloaded_files,
        job_id,
        request,
    )`);
    }

    if (
      step.toolName === "time-series-plot" ||
      step.toolName === "time-averaged-map"
    ) {
      hasPlot = true;

      const coll = (step.params.collection as string) || "PRECIP";
      const varName = (step.params.variable as string) || "precipitation";
      const isMap = step.toolName === "time-averaged-map";

      cells.push(`@app.cell
def _(earthaccess, mo, plt, xr):
    mo.md(
        "## ${
          isMap
            ? "Time-Averaged Spatial Map"
            : "Area-Averaged Time Series Plot"
        }"
    )

    # Load dataset
    search_res = earthaccess.search_data(
        short_name="${coll}",
        count=5,
    )

    files = earthaccess.open(search_res)

    ds = xr.open_mfdataset(files)

    var_key = (
        "${varName}"
        if "${varName}" in ds
        else list(ds.data_vars.values())[0].name
    )

    da = ds[var_key]

    fig, ax = plt.subplots(figsize=(10, 5))

    ${
      isMap
        ? `time_dim = "time" if "time" in da.dims else da.dims[0]

    map_data = da.mean(dim=time_dim)

    map_data.plot(
        ax=ax,
        cmap="viridis",
    )

    ax.set_title(
        "${coll} - ${varName} Time-Averaged Map",
        fontweight="bold",
    )`
        : `lat_dim = (
        [d for d in da.dims if "lat" in d or "y" in d][0]
        if any("lat" in d or "y" in d for d in da.dims)
        else da.dims[-2]
    )

    lon_dim = (
        [d for d in da.dims if "lon" in d or "x" in d][0]
        if any("lon" in d or "x" in d for d in da.dims)
        else da.dims[-1]
    )

    ts = da.mean(
        dim=[
            lat_dim,
            lon_dim,
        ]
    )

    ts.plot(
        ax=ax,
        marker="o",
        color="#1e40af",
        linewidth=2,
    )

    ax.set_title(
        "${coll} - ${varName} Time Series",
        fontweight="bold",
    )

    ax.grid(
        True,
        linestyle="--",
        alpha=0.6,
    )`
    }

    plt.tight_layout()

    return (
        ax,
        da,
        ds,
        fig,
        files,
        search_res,
    )`);
    }
  }

  // Default cell if no specific steps occurred
  if (!hasSearch && !hasSubset && !hasPlot) {
    const coll =
      explicitParams?.collection ||
      explicitParams?.shortName ||
      "GPM_3IMERGDF";

    cells.push(`@app.cell
def _(earthaccess, mo, plt, xr):
    mo.md("## Dataset Access & Quick Analysis")

    results = earthaccess.search_data(
        short_name="${coll}",
        count=5,
    )

    print(f"Found {len(results)} granules for ${coll}")

    files = []
    ds = None

    if results:
        files = earthaccess.open(results)
        ds = xr.open_mfdataset(files)
        print(ds)

    return ds, files, results`);
  }

  return `# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "earthaccess==0.18.0",
#     "aiobotocore==3.8.0",
#     "harmony-py==1.6.0",
#     "xarray",
#     "matplotlib",
# ]
# ///

import marimo

__generated_with = "0.23.15"

app = marimo.App(
    width="medium",
    auto_download=["html"],
)


${cells.join("\n\n\n")}


if __name__ == "__main__":
    app.run()
`;
}