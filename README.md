# Earthdata Conductor

**Earthdata Conductor** (`earthdata-conductor`) is a Model Context Protocol (MCP) server powered by [Skybridge](https://docs.skybridge.tech). It integrates NASA Earthdata dataset discovery, spatial/temporal search, file browsing, Harmony subsetting, interactive maps, time-series plotting, and WASM Python notebook generation directly into AI host interfaces like ChatGPT and Claude.

---

## Features & MCP Tools

| Tool | UI View / Description |
| :--- | :--- |
| **`search-collections`** | Search NASA Earth science datasets by text, spatial bounds, and date ranges. Features variable-first recommendations. |
| **`browse-data`** | Interactive file browser for collection granules using `@nasa-terra/components`. |
| **`create-harmony-job`** | Submit spatial/temporal variable subsetting jobs via NASA Harmony OGC Coverages API. |
| **`get-harmony-capabilities`** | Query collection subsetting capabilities (variables, formats, reprojection support). |
| **`show-time-series-plot`** | Inline area-averaged time series charts powered by `<terra-time-series>`. |
| **`show-time-averaged-map`** | Spatial map visualizations powered by `<terra-time-average-map>`. |
| **`get-active-fire-detections`** | Real-time NASA FIRMS thermal anomaly mapping (MODIS / VIIRS). |
| **`show-wms-map`** / **`show-geotiff-map`** | Interactive OpenLayers GIS maps rendering WMS tiles and GeoTIFF rasters. |
| **`open-in-notebook`** | Stitches conversation session history into a runnable WASM Python notebook (`earthaccess`, `harmony-py`, `xarray`). |

---

## Quickstart

### 1. Prerequisites
- **Node.js**: `v24.14.1` or higher

### 2. Setup
```bash
cp .env.example .env
npm install
```

Configure optional environment variables in `.env`:
* `AUTH_TOKEN`: Static Bearer token override for local development authentication bypass.
* `FIRMS_MAP_KEY`: NASA FIRMS MAP_KEY for thermal anomaly fire detection API queries.

### 3. Development
Start the dev server and Skybridge DevTools UI at `http://localhost:3000`:
```bash
npm run dev
```

To test with web clients (e.g. ChatGPT, Claude) via an HTTPS tunnel:
```bash
npm run dev:tunnel
```

---

## Scripts

* `npm run dev` – Launch local dev server & Skybridge DevTools
* `npm run dev:tunnel` – Launch dev server with public HTTPS tunnel
* `npm run test` – Run Vitest unit & component test suite
* `npm run lint` – Check formatting and static analysis with Biome
* `npm run lint:fix` – Automatically fix linting and formatting issues
* `npm run build` – Build production assets with Skybridge
* `npm run start` – Run built production server
* `npm run deploy` – Deploy to Alpic cloud

---

## Architecture Overview

```
├── src/
│   ├── server.ts         # MCP Server entry point & tool registration
│   ├── csp.ts            # Content Security Policy configuration
│   ├── views/            # React components for Skybridge views
│   ├── schemas/          # Zod tool input & output schemas
│   ├── utils/            # Harmony, session history, FIRMS, & geocoding helpers
│   └── index.css         # Global styles & OpenLayers CSS
├── vite.config.ts        # Vite configuration
├── SPEC.md               # Technical specification & decision log
├── alpic.json            # Deployment configuration
└── package.json
```

---

## Authentication

Earthdata Conductor supports **NASA Earthdata Login (URS)** OAuth 2.0 authentication for production tool execution. For local testing, setting `AUTH_TOKEN` in `.env` bypasses OAuth verification and executes tool requests with the static Bearer token.

---

## Resources

- [Skybridge Documentation](https://docs.skybridge.tech)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [NASA Earthdata](https://www.earthdata.nasa.gov/)
- [Alpic Cloud Documentation](https://docs.alpic.ai/)
