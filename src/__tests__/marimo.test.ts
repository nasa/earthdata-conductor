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

  it("should build non-WASM marimo.io URLs by default", () => {
    const code = "import marimo";
    const url = getMarimoUrl(code);

    expect(url).toContain("https://molab.marimo.io/new/?edit=true#code/");
    expect(url).not.toContain("/wasm/");
  });

  it("should build marimo.io WASM URLs when wasm is enabled", () => {
    const code = "import marimo";
    const url = getMarimoUrl(code, true);

    expect(url).toContain("https://molab.marimo.io/new/wasm/?edit=true#code/");
  });

  it("should omit micropip installs by default", () => {
    const code = generateMultiStepNotebook([]);

    expect(code).not.toContain("import micropip");
    expect(code).not.toContain("micropip.install");
  });

  it("should include micropip installs when wasm is enabled", () => {
    const code = generateMultiStepNotebook([], undefined, true);

    expect(code).toContain("import micropip");
    expect(code).toContain("micropip.install");
  });

  it("should include pinned script dependencies", () => {
    const code = generateMultiStepNotebook([]);

    expect(code).toContain('# requires-python = ">=3.12"');
    expect(code).toContain('"earthaccess==0.18.0"');
    expect(code).toContain('"aiobotocore==3.8.0"');
    expect(code).toContain('"harmony-py==1.6.0"');
    expect(code).toContain('"xarray"');
    expect(code).toContain('"matplotlib"');
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
    expect(code).toContain('temporal=("2026-01-01", "2026-12-31")');
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
    expect(code).toContain("earthaccess.search_data");
    expect(code).toContain('short_name="GPM_3IMERGHH"');
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
    expect(code).toContain('collection=Collection(id="C1276812863-GES_DISC")');
    expect(code).toContain("spatial=BBox(-122.5, 37.5, -122, 38)");
    expect(code).toContain('variables=["precipitation"]');
    expect(code).toContain('format=Format("application/netcdf")');
    expect(code).toContain("client.submit(request)");
    expect(code).toContain("client.wait_for_processing(job_id)");
    expect(code).toContain("client.download_all(job_id)");
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
    expect(code).toContain(
      'earthaccess.search_data(\n        short_name="GPM_3IMERGHH_07"',
    );
    expect(code).toContain("var_key = (");
    expect(code).toContain('"precipitation"');
    expect(code).toContain("ts = da.mean(");
    expect(code).toContain("ts.plot(");
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
    expect(code).toContain(
      'earthaccess.search_data(\n        short_name="M2T1NXAER_5_12_4"',
    );
    expect(code).toContain(
      'time_dim = "time" if "time" in da.dims else da.dims[0]',
    );
    expect(code).toContain("map_data = da.mean(dim=time_dim)");
    expect(code).toContain("map_data.plot(");
    expect(code).toContain('cmap="viridis"');
  });

  it("should generate default notebook when no steps are provided", () => {
    const code = generateMultiStepNotebook([]);

    expect(code).toContain("## Dataset Access & Quick Analysis");
    expect(code).toContain('short_name="GPM_3IMERGDF"');
    expect(code).toContain("files = []");
    expect(code).toContain("ds = None");
    expect(code).toContain("if results:");
  });

  it("should use explicit params for the default notebook", () => {
    const code = generateMultiStepNotebook([], {
      collection: "MERRA2_TEST",
      spatialArea: "-80,30,-70,40",
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    });

    expect(code).toContain("### Active Collection: **MERRA2_TEST**");
    expect(code).toContain("- Spatial Area: -80,30,-70,40");
    expect(code).toContain("- Time Range: 2026-01-01 to 2026-01-31");
    expect(code).toContain('short_name="MERRA2_TEST"');
  });

  it("should generate FIRMS active fire detection notebook step with pandas & folium", () => {
    const code = generateMultiStepNotebook([
      {
        toolName: "get-active-fire-detections",
        timestamp: Date.now(),
        params: {
          source: "VIIRS_SNPP_NRT",
          bbox: [-83, 34, -81, 36],
          days: 2,
        },
      },
    ]);

    expect(code).toContain("NASA FIRMS Active Fire Detections Analysis");
    expect(code).toContain("https://firms.modaps.eosdis.nasa.gov/api/map_key/");
    expect(code).toContain("firms_key_input = mo.ui.text(");
    expect(code).toContain(
      "https://firms.modaps.eosdis.nasa.gov/api/area/csv/",
    );
    expect(code).toContain("folium.WmsTileLayer(");
    expect(code).toContain("MarkerCluster(");
  });

  it("should generate WMS map visualization notebook step with folium", () => {
    const code = generateMultiStepNotebook([
      {
        toolName: "show-wms-map",
        timestamp: Date.now(),
        params: {
          wmsUrl: "https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi",
          layers: "MODIS_Terra_CorrectedReflectance_TrueColor",
          title: "NASA True Color",
        },
      },
    ]);

    expect(code).toContain("OGC WMS Map Layer Visualization");
    expect(code).toContain("folium.WmsTileLayer(");
    expect(code).toContain("MODIS_Terra_CorrectedReflectance_TrueColor");
  });

  it("should generate GeoTIFF raster notebook step with rioxarray", () => {
    const code = generateMultiStepNotebook([
      {
        toolName: "show-geotiff-map",
        timestamp: Date.now(),
        params: {
          url: "https://sentinel-cogs.s3.us-west-2.amazonaws.com/test.tif",
          title: "Sentinel COG",
        },
      },
    ]);

    expect(code).toContain("Cloud-Optimized GeoTIFF (COG) Raster Analysis");
    expect(code).toContain("rxr.open_rasterio(url)");
    expect(code).toContain("Sentinel COG");
  });

  it("should omit earthaccess import and login when only FIRMS or map tools are used", () => {
    const code = generateMultiStepNotebook([
      {
        toolName: "get-active-fire-detections",
        timestamp: Date.now(),
        params: { spatialArea: "Asheville, NC" },
      },
    ]);

    expect(code).not.toContain("import earthaccess");
    expect(code).not.toContain("earthaccess.login()");
    expect(code).toContain('source.startswith("MODIS")');
    expect(code).not.toContain("startsWith");
  });
});
