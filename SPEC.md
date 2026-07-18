# Earthdata UI MCP Server (earthdata-ui-mcp)

## Value Proposition
A modern, responsive, and interactive set of web views integrated into the AI assistant workspace via the Skybridge framework. It enables users to discover, search, browse, and transform NASA Earthdata datasets (collections and granules) directly inside the chat interface.

**Core actions**:
1. **Search collections**: Find NASA Earth science datasets by keyword, geocoded spatial areas, and temporal ranges.
2. **Browse archive data**: Launch an interactive data-access browser showing files and granules for a selected collection (shortname and version).
3. **Subset and transform (Planned)**: Select output formats (e.g. NetCDF), configure spatial/temporal parameters, and run subsetting jobs via Harmony in the user's browser.

---

## Why LLM?
* **Conversational win**: Describing spatial bounds (e.g., "over California" or "bounding box around Paris") and date ranges (e.g., "for the whole year of 2024") is far easier via text than clicking through intricate map boxes and calendar controls.
* **LLM adds**: Extracting search keywords, translating geographic region names to geocodable values, parsing dates, and orchestrating workflow steps.
* **What LLM lacks**: Heavy data visualization, browsing thousands of individual science files/granules, client-side data transformations, and real-time visualization of large datasets.

---

## UI Overview

### Search Collections View
* Renders a layout showing the active search parameters (keywords, geocoded bounding box area, and date range).
* A scrollable list of matching dataset cards displaying the short name, version, and description summary.
* An interactive panel to view detailed metadata and directly invoke the `browse-data` tool for the selected collection.

### Browse Data View
* Renders the `@nasa-terra/components` `TerraDataAccess` component.
* Shows available granules, estimated data sizes, and options for file access.

---

## Product Context
* **Framework**: Skybridge MCP UI server using React, Vite, Tailwind CSS, and `@nasa-terra/components`.
* **API Schema (`search-collections` tool)**:
  - `keyword`: string (The search term or topic, e.g. 'precipitation')
  - `spatialArea`: optional string (A geographic area name to be geocoded, e.g. 'Virginia')
  - `spatialWkt`: optional string (Optional spatial area as Well-Known Text WKT)
  - `startDate`: optional string (Start date of interest period, e.g. '2025-01-01')
  - `endDate`: optional string (End date of interest period, e.g. '2025-12-31')

* **API Schema (`browse-data` tool)**:
  - `shortName`: string (The shortname of the collection)
  - `version`: optional string (The version of the collection, defaults to latest)
  - `spatialArea`: optional string (Optional spatial filter)
  - `startDate`: optional string (Optional start date)
  - `endDate`: optional string (Optional end date)

---

## Feature Roadmap

* **Dataset Discovery & Browsing** (Completed):
  - [x] Geocoding of location strings via OpenStreetMap Nominatim.
  - [x] Search Earthdata collections via the remote Earthdata MCP UAT get_collections tool.
  - [x] Interactive dataset card UI with metadata preview.
  - [x] File browsing view integrating `@nasa-terra/components` data access.

* **User Authentication & Authorization** (Completed):
  - [x] Earthdata Login OAuth Integration via Skybridge metadata discovery.
  - [x] Mixed-auth middleware allowing public search and authenticated actions.
  - [x] Custom token verification against Earthdata Login's token user validation endpoint.

* **Harmony Subsetting Integration** (Completed):
  - [x] **Job Creation Tool**: Create a Harmony subsetting job on behalf of the user to generate a job ID.
  - [x] **Harmony Subsetter View**: Load the Harmony subsetter UI component pre-populated with the generated job ID.

* **UI/Component Enhancements** (Planned):
  - [x] **Dataset Chooser Component**: A streamlined widget for selecting and switching between active datasets (Completed).
  - [x] **Output Format Component**: Elegant UI to select output formats (e.g. NetCDF), select variables, and run the transformation (Completed).
  - [x] **Parameter Mapping**: Ensure the Data Access component accepts spatial, temporal, and other subsetting constraints (Completed).
  - [ ] **Browser-side Subsetter**: Configure the Subsetter component to handle Harmony wrangling directly in the user's browser and trigger a completion event when done.

* **Visualization & Analysis** (Completed):
  - [x] **Area-averaged Time Series Plots**: Generate inline charts of area-averaged temporal trends using the `show-time-series-plot` tool.
  - [x] **Area-averaged Map Plots**: Display mapped spatial representations of subsetted data using the `show-time-averaged-map` tool.
  - [x] **Giovanni Integration**: Render Giovanni time-series and spatial maps.

---

## Decision Log

### Skybridge Framework for MCP UI (July 2026)
* **Decision**: Adopted the Skybridge framework to serve React views directly inside the MCP client/ChatGPT interface.
* **Rationale**: Bypasses typical markdown constraints, allowing rich, stateful, and interactive user interfaces (like discovery search panels and data tables) to render contextually alongside conversational chat.

### Nominatim Geocoding Integration (July 2026)
* **Decision**: Integrated OpenStreetMap's Nominatim API inside the tool handler to automatically geocode human-readable locations (e.g. "Virginia") into bounding boxes.
* **Rationale**: Simplifies the search interface, allowing the user to search naturally by region name without forcing the LLM to output precise geometric coordinates manually.

### NASA Terra Components Integration (July 2026)
* **Decision**: Integrated `@nasa-terra/components` library for data access widgets.
* **Rationale**: Reuses official, pre-styled, and battle-tested components for Earth science data access, significantly reducing development overhead while ensuring layout and functionality consistency.

### Skybridge Framework Upgrade to v1.2.7 (July 2026)
* **Decision**: Upgraded `skybridge` and `@skybridge/devtools` from `1.1.2`/`1.0.0` to `1.2.7`.
* **Rationale**: Keep the UI framework up to date with the latest features, enhancements, and bug fixes from Skybridge, while resolving any static analysis/linting issues with type-safety updates.

### NASA Earthdata Login OAuth Integration (July 2026)
* **Decision**: Configured Skybridge's OAuth metadata router and required Bearer token middleware (`requireBearerAuth`) with Earthdata Login as the Identity Provider. Added a custom validation handler querying URS's `/oauth/tokens/user` endpoint.
* **Rationale**: Enforces global authentication. Restricting all tool access (search, browse, capabilities, subsetting) to `oauth2` and using `requireBearerAuth` ensures the user logs in once at the start of the session and all subsequent actions run with a validated token automatically.

### Harmony Subsetting Integration (July 2026)
* **Decision**: Implemented the `create-harmony-job` tool using direct NASA Harmony OGC Coverages API requests, and registered a new view component `harmony-subsetter` using `@nasa-terra/components`'s `TerraDataSubsetter`.
* **Rationale**: Replaces mock job IDs with real, authenticated jobs generated on behalf of the user, and loads the official subsetter component pre-populated with the Job ID and OAuth token for seamless download and status tracking.

### Harmony Capabilities & Variable-First UI Flow (July 2026)
* **Decision**: Created the `get-harmony-capabilities` tool and updated the `SearchCollections` UI detail column to render Action Tabs (Browse Files, Subset Data, Plot Data) dynamically based on collection capabilities.
* **Rationale**: Decouples dataset exploration from subsetting details, allowing the user to browse variables, check constraints, select output formats, and create subsetting jobs with a single click.
### Granule-Aware Harmony Job Creation Error Fallback (July 2026)
* **Decision**: Configured the `create-harmony-job` tool handler on the server to catch job submission failures, fetch the latest 10 granules for the target collection from the remote UAT MCP server using the `get_granules` tool, and inject the range of available dates directly into the returned error message.
* **Rationale**: Eliminates blind date-range guessing by the assistant or the user when Harmony subsetting fails due to UAT archive sparse date coverage.

### Data Access Parameter Mapping with LatLngBounds (July 2026)
* **Decision**: Mapped `startDate`, `endDate`, and parsed geographic bounding box coordinates (as `LatLngBounds`) to the `<TerraDataAccess>` `searchParams` property in the React `browse-data` view.
* **Rationale**: Resolves empty file list displays by pre-filtering granule queries to the user's actual area of interest and selected timeframe.

### Optional Authentication for Local Development (July 2026)
* **Decision**: Added support for the `AUTH_TOKEN` environment variable override. When defined, all registered tools omit `oauth2` from their security schemes, and the `/mcp` middleware automatically bypasses standard token verification to inject a mock auth context using that static token.
* **Rationale**: Simplifies development and debugging in local environments by making OAuth sign-in optional, allowing direct test requests to execute with the configured static Bearer token.

### Client-Triggered Follow-Up Message Navigation (July 2026)
* **Decision**: Refactored the interactive buttons in the `search-collections` view (Browse Original Files and Subset & Transform) to use `useSendFollowUpMessage` instead of calling `useCallTool` directly.
* **Rationale**: Bypasses the MCP host iframe isolation by programmatically asking the LLM to invoke the corresponding view-enabled tools, ensuring that the host chat client successfully transitions the user to the `browse-data` and `harmony-subsetter` views.

### Server-Side Keyword Fallback & Granule Filtering Relaxing (July 2026)
* **Decision**: Implemented an automatic keyword extraction fallback in the `search-collections` tool and modified the granule availability check to assign `granule_count: 0` instead of filtering out collections with empty subsets.
* **Rationale**: Prevents zero-result search displays in sparse test environments like UAT, allowing users to find datasets even when entering long conversational queries or select temporal ranges for which no granules are currently archived.

### Variable-First Searching & Recommendations (July 2026)
* **Decision**: Designed and built a query-aware recommendation algorithm on the client side that categorizes and matches collection variables (e.g., wind speed, temperature, humidity, precipitation) against the user's initial search query.
* **Rationale**: Simplifies data exploration for non-technical users by highlighting matching variables, describing why they are recommended, sorting them to the top of the selection lists, and pre-selecting the best option by default.

### Giovanni Visualizations: Time-Series Plots & Time-Averaged Maps (July 2026)
* **Decision**: Implemented two new MCP tools `show-time-series-plot` and `show-time-averaged-map` along with corresponding React views rendering NASA's custom `<terra-time-series>` and `<terra-time-average-map>` web components. Added buttons to the search collections details panel under the "Plot Data" tab to trigger these tools.
* **Rationale**: Enables users to seamlessly visualize subsetted datasets inline in their chat session. Resolves parameters (collection version format, variable names, dates, coordinates) dynamically from client search state to pass accurate bounds automatically.

### Search Results Caching & Loading State (July 2026)
* **Decision**: Added a local cache state `cachedCollections` for results and added a loading check `!output` to the `search-collections` view.
* **Rationale**: Prevents search results from disappearing and flashing a "No Datasets Found" message during background capability requests or chat history re-renders when the session's active tool changes.

### GES DISC Domains Content Security Policy (July 2026)
* **Decision**: Added `https://disc.gsfc.nasa.gov` and `https://disc.uat.gsfc.nasa.gov` to the `connectDomains` array in [csp.ts](file:///Users/joncarlson/projects/earthdata-ui-mcp/src/csp.ts).
* **Rationale**: Resolves Content Security Policy (CSP) fetch violations when rendering time-series or time-averaged maps that load metadata directly from GES DISC endpoints.

