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

* **Harmony Subsetting Integration** (Planned):
  - [ ] **Job Creation Tool**: Create a Harmony subsetting job on behalf of the user to generate a job ID.
  - [ ] **Harmony Subsetter View**: Load the Harmony subsetter UI component pre-populated with the generated job ID.

* **UI/Component Enhancements** (Planned):
  - [ ] **Dataset Chooser Component**: A streamlined widget for selecting and switching between active datasets.
  - [ ] **Output Format Component**: Elegant UI to select output formats (e.g. NetCDF), select granules, view estimated download sizes, and run the transformation.
  - [ ] **Parameter Mapping**: Ensure the Data Access component accepts spatial, temporal, and other subsetting constraints.
  - [ ] **Browser-side Subsetter**: Configure the Subsetter component to handle Harmony wrangling directly in the user's browser and trigger a completion event when done.

* **Visualization & Analysis** (Planned):
  - [ ] **Area-averaged Time Series Plots**: Generate inline charts of area-averaged temporal trends.
  - [ ] **Area-averaged Map Plots**: Display mapped spatial representations of subsetted data.
  - [ ] **Giovanni Integration**: Render Giovanni time-series and spatial maps.

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
