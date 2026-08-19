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

  const needsEarthaccess =
    steps.length === 0 ||
    steps.some((s) =>
      [
        "search-collections",
        "browse-data",
        "create-harmony-job",
        "time-series-plot",
        "time-averaged-map",
      ].includes(s.toolName),
    );

  const needsXarrayPlot =
    steps.length === 0 ||
    steps.some((s) =>
      [
        "search-collections",
        "browse-data",
        "create-harmony-job",
        "time-series-plot",
        "time-averaged-map",
      ].includes(s.toolName),
    );

  // Setup cell 1 (WASM only): micropip installs deps the browser runtime lacks
  if (wasm) {
    const micropipDeps: string[] = [
      "pandas",
      "requests",
      "folium",
      "rioxarray",
    ];

    if (needsEarthaccess) {
      micropipDeps.unshift(
        "aiobotocore==3.8.0",
        "earthaccess==0.18.0",
        "harmony-py==1.6.0",
      );
    }

    cells.push(`@app.cell
async def _():
    import micropip

    await micropip.install(${JSON.stringify(micropipDeps, null, 8)})

    return (micropip,)`);
  }

  // Setup cell 2: Imports
  const importsList = ["marimo as mo"];
  if (needsEarthaccess) {
    importsList.push("earthaccess");
  }
  if (needsXarrayPlot) {
    importsList.push("xarray as xr", "matplotlib.pyplot as plt");
  }

  const importReturns = ["mo"];
  if (needsEarthaccess) importReturns.push("earthaccess");
  if (needsXarrayPlot) importReturns.push("plt", "xr");

  cells.push(`@app.cell
def _():
    ${importsList.map((i) => `import ${i}`).join("\n    ")}
    return ${importReturns.join(", ")}`);

  // Setup cell 3: Auth (Only if earthaccess is required)
  if (needsEarthaccess) {
    cells.push(`@app.cell
def _(earthaccess):
    # Authenticate with NASA Earthdata
    auth = earthaccess.login()
    return (auth,)`);
  }

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
          isMap ? "Time-Averaged Spatial Map" : "Area-Averaged Time Series Plot"
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

    if (step.toolName === "get-active-fire-detections") {
      hasPlot = true;
      const source = (step.params.source as string) || "VIIRS_SNPP_NRT";
      const days = (step.params.days as number) || 2;
      const bbox = (step.params.bbox as number[]) || [-83, 34, -81, 36];
      const date = (step.params.date as string) || "";

      // Interactive API key input prompt cell
      cells.push(`@app.cell
def _(mo):
    import os

    firms_env_key = os.getenv("FIRMS_MAP_KEY", "").strip()

    mo.md(
        """
        ## NASA FIRMS API Access Setup
        To query active fire detection point markers from NASA FIRMS, a free **MAP_KEY** is required.
        * Sign up for your free key at: [https://firms.modaps.eosdis.nasa.gov/api/map_key/](https://firms.modaps.eosdis.nasa.gov/api/map_key/)
        * Set it as an environment variable \`export FIRMS_MAP_KEY="your_key"\` or enter it below:
        """
    )

    firms_key_input = mo.ui.text(
        label="FIRMS MAP_KEY",
        value=firms_env_key,
        placeholder="Paste your FIRMS MAP_KEY here...",
    )
    firms_key_input
    return (firms_key_input,)`);

      // Data fetch & interactive map display cell
      cells.push(`@app.cell
def _(firms_key_input, mo):
    import os
    import pandas as pd
    import requests
    import folium
    from folium.plugins import MarkerCluster

    mo.md("## NASA FIRMS Active Fire Detections Analysis")

    MAP_KEY = (firms_key_input.value or os.getenv("FIRMS_MAP_KEY", "")).strip()
    source = "${source}"
    days = ${days}
    bbox = [${bbox[0]}, ${bbox[1]}, ${bbox[2]}, ${bbox[3]}]
    bbox_str = f"{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}"
    date_param = "${date}"

    has_valid_key = bool(MAP_KEY and MAP_KEY != "YOUR_FIRMS_MAP_KEY")
    df_fires = pd.DataFrame()

    if has_valid_key:
        status_url = f"https://firms.modaps.eosdis.nasa.gov/mapserver/mapkey_status/?MAP_KEY={MAP_KEY}"
        try:
            status_res = requests.get(status_url)
            if status_res.status_code == 200:
                print("FIRMS MAP_KEY Status:", status_res.json())
        except Exception as e:
            print("Could not query key status:", e)

        url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{source}/{bbox_str}/{days}"
        if date_param:
            url += f"/{date_param}"

        print(f"FIRMS Query URL: {url}")
        try:
            df_fires = pd.read_csv(url)
            print(f"Retrieved {len(df_fires)} fire detection record(s)")
        except Exception as err:
            print(f"Error fetching FIRMS CSV data: {err}")
    else:
        print("⚠️ No FIRMS MAP_KEY provided. Enter your key in the input box above or set FIRMS_MAP_KEY.")
        print("Displaying NASA GIBS satellite thermal anomaly WMS layer below.")

    center_lat = (bbox[1] + bbox[3]) / 2.0
    center_lon = (bbox[0] + bbox[2]) / 2.0

    m = folium.Map(location=[center_lat, center_lon], zoom_start=9, tiles="cartodbpositron")

    wms_layer = "MODIS_Thermal_Anomalies_Day" if source.startswith("MODIS") else "VIIRS_SNPP_Thermal_Anomalies_375m_Day"
    folium.WmsTileLayer(
        url="https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi",
        layers=wms_layer,
        name="NASA GIBS Thermal Anomalies Overlay",
        fmt="image/png",
        transparent=True,
        overlay=True,
    ).add_to(m)

    if not df_fires.empty and "latitude" in df_fires.columns and "longitude" in df_fires.columns:
        cluster = MarkerCluster(name="Active Fire Points").add_to(m)
        for _, row in df_fires.iterrows():
            lat, lon = row["latitude"], row["longitude"]
            frp = row.get("frp", 0)
            conf = row.get("confidence", "nominal")
            sat = row.get("satellite", "Unknown")
            acq_d = row.get("acq_date", "")
            acq_t = row.get("acq_time", "")

            popup_html = f"<b>FRP:</b> {frp} MW<br><b>Confidence:</b> {conf}<br><b>Satellite:</b> {sat}<br><b>Date:</b> {acq_d} {acq_t}"
            folium.CircleMarker(
                location=[lat, lon],
                radius=min(max(4 + (frp ** 0.5), 4), 16),
                color="#ef4444" if str(conf).lower() in ["h", "high"] else "#f97316",
                fill=True,
                fill_opacity=0.85,
                popup=popup_html,
            ).add_to(cluster)

    folium.LayerControl().add_to(m)
    mo.Html(m._repr_html_())
    return (df_fires, m)`);
    }

    if (step.toolName === "show-wms-map") {
      hasPlot = true;
      const wmsUrl =
        (step.params.wmsUrl as string) ||
        "https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi";
      const layers =
        (step.params.layers as string) ||
        "MODIS_Terra_CorrectedReflectance_TrueColor";
      const title = (step.params.title as string) || "WMS Map Layer";
      const bbox = (step.params.bbox as number[]) || [-180, -90, 180, 90];
      const time = (step.params.time as string) || "";

      cells.push(`@app.cell
def _(mo):
    import folium

    mo.md("## OGC WMS Map Layer Visualization")

    wms_url = "${wmsUrl}".replace("/wms/epsg4326/", "/wms/epsg3857/")
    bbox = [${bbox[0]}, ${bbox[1]}, ${bbox[2]}, ${bbox[3]}]
    center_lat = (bbox[1] + bbox[3]) / 2.0
    center_lon = (bbox[0] + bbox[2]) / 2.0

    m = folium.Map(location=[center_lat, center_lon], zoom_start=5)

    wms_params = {
        "LAYERS": "${layers}",
        "TRANSPARENT": "TRUE",
        "FORMAT": "image/png",
    }
    ${time ? `wms_params["TIME"] = "${time}"` : ""}

    folium.WmsTileLayer(
        url=wms_url,
        layers="${layers}",
        name="${title}",
        fmt="image/png",
        transparent=True,
        overlay=True,
    ).add_to(m)

    folium.LayerControl().add_to(m)
    mo.Html(m._repr_html_())
    return (m,)`);
    }

    if (step.toolName === "show-geotiff-map") {
      hasPlot = true;
      const geotiffUrl = (step.params.url as string) || "";
      const title = (step.params.title as string) || "GeoTIFF Raster Layer";

      cells.push(`@app.cell
def _(mo):
    import rioxarray as rxr
    import matplotlib.pyplot as plt

    mo.md("## Cloud-Optimized GeoTIFF (COG) Raster Analysis")

    url = "${geotiffUrl}"
    print(f"Opening GeoTIFF from: {url}")

    rds = rxr.open_rasterio(url)
    print("Dataset Dimensions:", rds.dims)
    print("CRS:", rds.rio.crs)
    print("Bounds:", rds.rio.bounds())

    fig, ax = plt.subplots(figsize=(10, 6))
    if len(rds.shape) == 3 and rds.shape[0] >= 3:
        rds.isel(band=[0, 1, 2]).plot.imshow(ax=ax)
    else:
        rds.sel(band=1).plot(ax=ax, cmap="terrain")

    ax.set_title("${title}", fontweight="bold")
    plt.tight_layout()

    return (ax, fig, rds)`);
    }
  }

  // Default cell if no specific steps occurred
  if (!hasSearch && !hasSubset && !hasPlot) {
    const coll =
      explicitParams?.collection || explicitParams?.shortName || "GPM_3IMERGDF";

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

  const scriptDeps = ["pandas", "requests", "folium", "rioxarray"];
  if (needsEarthaccess) {
    scriptDeps.unshift(
      "earthaccess==0.18.0",
      "aiobotocore==3.8.0",
      "harmony-py==1.6.0",
      "xarray",
      "matplotlib",
    );
  }

  const formattedDeps = scriptDeps.map((d) => `#     "${d}",`).join("\n");

  return `# /// script
# requires-python = ">=3.12"
# dependencies = [
${formattedDeps}
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
