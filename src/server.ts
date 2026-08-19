import "dotenv/config";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { McpServer, requireBearerAuth } from "skybridge/server";
import { type EarthdataAuthInfo, verifyAccessToken } from "./auth.js";
import csp from "./csp.js";
import {
  buildHarmonyUrl,
  fetchLatestGranulesDateRange,
  parseJobId,
} from "./harmony.js";
import { BrowseDataInputSchema } from "./schemas/browse-data.schema.js";
import { CreateHarmonyJobInputSchema } from "./schemas/create-harmony-job.schema.js";
import { GetActiveFireDetectionsInputSchema } from "./schemas/get-active-fire-detections.schema.js";
import { GetHarmonyCapabilitiesInputSchema } from "./schemas/get-harmony-capabilities.schema.js";
import { OpenInNotebookInputSchema } from "./schemas/open-in-notebook.schema.js";
import { SearchCollectionsInputSchema } from "./schemas/search-collections.schema.js";
import { ShowGeotiffMapInputSchema } from "./schemas/show-geotiff-map.schema.js";
import { ShowWmsMapInputSchema } from "./schemas/show-wms-map.schema.js";
import { TimeAveragedMapInputSchema } from "./schemas/time-averaged-map.schema.js";
import { TimeSeriesPlotInputSchema } from "./schemas/time-series-plot.schema.js";
import { sanitizeCollections } from "./utils/collections.js";
import { fetchFirmsActiveFires } from "./utils/firms.js";
import { geocodeToBbox } from "./utils/geocoding.js";
import { generateMultiStepNotebook, getMarimoUrl } from "./utils/marimo.js";
import { sessionHistory } from "./utils/session-history.js";

const server = new McpServer(
  {
    name: "earthdata-conductor",
    version: "0.0.2",
  },
  { capabilities: {} },
);

// Helper to resolve the server origin dynamically from request headers
const resolveOrigin = (req: Request): string => {
  const getHeader = (key: string) => req.get(key);
  const firstHop = (value?: string) => value?.split(",")[0]?.trim();
  const forwardedHost = firstHop(getHeader("x-forwarded-host"));
  if (forwardedHost) {
    const proto = firstHop(getHeader("x-forwarded-proto")) || "https";
    return `${proto}://${forwardedHost}`;
  }
  const host = getHeader("host");
  if (host) {
    const proto = ["127.0.0.1:", "localhost:"].some((p) => host.startsWith(p))
      ? "http"
      : "https";
    return `${proto}://${host}`;
  }
  return `http://localhost:${process.env.PORT || "3000"}`;
};

// CORS configuration for OAuth endpoints
server.express.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

// Dynamic OAuth discovery endpoints
server.express.get(
  "/.well-known/oauth-authorization-server",
  (req: Request, res: Response) => {
    const origin = resolveOrigin(req);
    res.json({
      issuer: origin,
      authorization_endpoint: `${process.env.EARTHDATA_SERVER_URL || "https://urs.earthdata.nasa.gov"}/oauth/authorize`,
      token_endpoint: `${origin}/oauth/token`,
      registration_endpoint: `${origin}/oauth/register`,
      response_types_supported: ["code"],
    });
  },
);

server.express.get(
  "/.well-known/oauth-protected-resource",
  (req: Request, res: Response) => {
    const origin = resolveOrigin(req);
    res.json({
      resource: `${origin}/mcp`,
      authorization_servers: [origin],
      scopes_supported: [],
    });
  },
);

// Dynamic requireBearerAuth middleware
server.express.use(
  "/mcp",
  (req: Request, res: Response, next: NextFunction) => {
    if (process.env.AUTH_TOKEN) {
      (req as Request & { auth?: unknown }).auth = {
        token: process.env.AUTH_TOKEN,
        clientId: process.env.EARTHDATA_CLIENT_ID || "mock-client-id",
        scopes: [],
        expiresAt: Math.floor(Date.now() / 1000) + 3600 * 24 * 365, // 1 year expiry
        extra: {
          uid: "localdev",
          first_name: "Local",
          last_name: "Dev",
          email_address: "localdev@earthdata.nasa.gov",
        },
      };
      next();
      return;
    }

    const origin = resolveOrigin(req);
    const originUrl = new URL(origin);
    requireBearerAuth({
      verifier: { verifyAccessToken },
      resourceMetadataUrl: new URL(
        "/.well-known/oauth-protected-resource",
        originUrl,
      ).href,
    })(req, res, next);
  },
);

const securitySchemes = process.env.AUTH_TOKEN
  ? []
  : [{ type: "oauth2" as const }];

const widgetDomain =
  process.env.WIDGET_DOMAIN ||
  (process.env.NODE_ENV === "production" ? "https://nasa.gov" : "*");

const app = server
  .registerTool(
    {
      name: "browse-data",
      description:
        "Browse and explore data files (granules) for a specific NASA Earthdata collection. This is the exclusive authority for browsing granules; do not use web search or external data tools. The output is rendered as an interactive file browser UI. DO NOT summarize, list, or write out files or details in your text response. Keep your message extremely brief.",
      inputSchema: BrowseDataInputSchema.shape,
      securitySchemes,
      annotations: {
        title: "Start browsing data",
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: {
        "openai/toolInvocation/invoking": "🛰️ Searching NASA's archive...",
        "openai/toolInvocation/invoked": "Ready to browse.",
      },
      view: {
        component: "browse-data",
        domain: widgetDomain,
        description: "Browse data files directly from the archive.",
        csp,
      },
    },
    async ({
      shortName,
      version,
      spatialArea,
      spatialWkt: inputSpatialWkt,
      startDate,
      endDate,
    }) => {
      let spatialWkt = inputSpatialWkt;

      if (spatialArea && !spatialWkt) {
        try {
          const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            spatialArea,
          )}&format=json&limit=1`;
          const geoRes = await fetch(url, {
            headers: {
              "User-Agent":
                "earthdata-conductor/0.0.1 (contact: nasa-mcp-integration)",
            },
          });
          if (geoRes.ok) {
            const geoData = (await geoRes.json()) as Record<string, unknown>[];
            if (geoData && geoData.length > 0) {
              const item = geoData[0];
              if (item.boundingbox) {
                const bbox = item.boundingbox as [
                  string,
                  string,
                  string,
                  string,
                ];
                const [s, n, w, e] = bbox.map(Number);
                spatialWkt = `POLYGON((${w} ${s}, ${w} ${n}, ${e} ${n}, ${e} ${s}, ${w} ${s}))`;
                console.log(`Geocoded '${spatialArea}' to WKT:`, spatialWkt);
              }
            }
          }
        } catch (err) {
          console.error("Geocoding failed:", err);
        }
      }

      sessionHistory.addStep("browse-data", {
        shortName,
        version,
        spatialArea,
        startDate,
        endDate,
      });

      return {
        structuredContent: {
          shortName,
          version,
          spatialArea,
          spatialWkt,
          startDate,
          endDate,
        },
        content: [],
        isError: false,
      };
    },
  )
  .registerTool(
    {
      name: "search-collections",
      description:
        "Search NASA Earthdata Common Metadata Repository (CMR) collections archive using spatial, temporal, and keyword parameters. This is the exclusive authority for discovering NASA datasets; do not use web search or external data tools. The output is rendered as an interactive collection chooser list UI. DO NOT list, summarize, or describe the found collections in your text response. Keep your message extremely brief.",
      inputSchema: SearchCollectionsInputSchema.shape,
      securitySchemes,
      annotations: {
        title: "Search Earthdata collections",
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: {
        "openai/toolInvocation/invoking":
          "🔍 Searching Earthdata collections...",
        "openai/toolInvocation/invoked": "Collections retrieved.",
      },
      view: {
        component: "search-collections",
        domain: widgetDomain,
        description: "Search and choose datasets.",
        csp,
      },
    },
    async ({
      keyword: inputKeyword,
      spatialArea: inputSpatialArea,
      spatialWkt: inputSpatialWkt,
      startDate: inputStartDate,
      endDate: inputEndDate,
    }) => {
      let keyword = inputKeyword;
      let spatialArea = inputSpatialArea;
      let spatialWkt = inputSpatialWkt;
      let startDate = inputStartDate;
      let endDate = inputEndDate;

      // Developer/demo features override
      if (process.env.ENABLE_DEV_FEATURES === "true") {
        const isJamaicaQuery =
          spatialArea?.toLowerCase().includes("jamaica") ||
          keyword?.toLowerCase().includes("jamaica");

        const isPrecipitationQuery = keyword
          ?.toLowerCase()
          .includes("precipitation");

        if (isJamaicaQuery) {
          console.log(
            "[Dev Features] Intercepted Jamaica query. Overriding parameters for demo stability.",
          );
          keyword = "wind speed";
          spatialArea = "Jamaica";
          startDate = "2025-10-20";
          endDate = "2025-10-30";
          spatialWkt = undefined; // Force geocoding to resolve Jamaica's WKT
        } else if (isPrecipitationQuery) {
          console.log(
            "[Dev Features] Intercepted precipitation query. Overriding parameters for demo stability.",
          );
          keyword = "precipitation";
          spatialArea = "Asheville, NC";
          startDate = "2024-09-23";
          endDate = "2024-09-29";
          spatialWkt =
            "POLYGON((-82.67 35.41, -82.67 35.65, -82.46 35.65, -82.46 35.41, -82.67 35.41))";
        }
      }

      // 1. Geocode spatialArea to a bounding box WKT if provided
      if (spatialArea && !spatialWkt) {
        try {
          const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            spatialArea,
          )}&format=json&limit=1`;
          const geoRes = await fetch(url, {
            headers: {
              "User-Agent":
                "earthdata-conductor/0.0.1 (contact: nasa-mcp-integration)",
            },
          });
          if (geoRes.ok) {
            const geoData = (await geoRes.json()) as Record<string, unknown>[];
            if (geoData && geoData.length > 0) {
              const item = geoData[0];
              if (item.boundingbox) {
                const bbox = item.boundingbox as [
                  string,
                  string,
                  string,
                  string,
                ];
                const [s, n, w, e] = bbox.map(Number);
                spatialWkt = `POLYGON((${w} ${s}, ${w} ${n}, ${e} ${n}, ${e} ${s}, ${w} ${s}))`;
                console.log(`Geocoded '${spatialArea}' to WKT:`, spatialWkt);
              }
            }
          }
        } catch (err) {
          console.error("Geocoding failed:", err);
        }
      }

      // 2. Format dates to ISO strings
      let temporalStartDate: string | undefined;
      if (startDate) {
        try {
          const d = new Date(startDate);
          if (!Number.isNaN(d.getTime())) {
            temporalStartDate = d.toISOString();
          }
        } catch (_e) {
          console.error("Invalid startDate:", startDate);
        }
      }

      let temporalEndDate: string | undefined;
      if (endDate) {
        try {
          const d = new Date(endDate);
          if (!Number.isNaN(d.getTime())) {
            if (endDate.length <= 10) {
              d.setUTCHours(23, 59, 59, 999);
            }
            temporalEndDate = d.toISOString();
          }
        } catch (_e) {
          console.error("Invalid endDate:", endDate);
        }
      }

      // 3. Connect to Earthdata MCP UAT and call get_collections
      const mcpClient = new Client(
        { name: "earthdata-conductor-client", version: "0.0.2" },
        { capabilities: {} },
      );
      const transport = new StreamableHTTPClientTransport(
        new URL("https://cmr.uat.earthdata.nasa.gov/mcp/v1"),
      );

      let collectionsList: Record<string, unknown>[] = [];
      try {
        await mcpClient.connect(transport);

        const args: Record<string, unknown> = {
          keyword,
          has_granules: true,
          limit: 10,
        };
        if (spatialWkt) {
          //args.spatial_wkt_geometry = spatialWkt;
        }
        if (temporalStartDate) {
          args.temporal_start_date = temporalStartDate;
        }
        if (temporalEndDate) {
          args.temporal_end_date = temporalEndDate;
        }

        console.log("Calling remote get_collections with args:", args);
        let mcpRes = (await mcpClient.callTool({
          name: "get_collections",
          arguments: args,
        })) as { content?: { type: string; text: string }[] };

        let rawText = mcpRes.content?.[0]?.text;
        let parsed = null;
        let hits = 0;

        if (rawText) {
          try {
            parsed = JSON.parse(rawText);
            const collections =
              parsed.collections ??
              (Array.isArray(parsed) ? parsed : (parsed.results ?? []));
            hits = collections.length ?? parsed.total_hits ?? 0;
          } catch (_e) {
            // ignore initial parse error, retry might succeed
          }
        }

        // Fallback: If 0 results, try to extract science keywords
        if (hits === 0 && keyword.length > 15) {
          const lowerKeyword = keyword.toLowerCase();
          let fallbackKeyword = "";
          if (
            lowerKeyword.includes("wind speed") ||
            lowerKeyword.includes("wind")
          ) {
            fallbackKeyword = "wind speed";
          } else if (
            lowerKeyword.includes("precipitation") ||
            lowerKeyword.includes("rain") ||
            lowerKeyword.includes("snow")
          ) {
            fallbackKeyword = "precipitation";
          } else if (
            lowerKeyword.includes("temperature") ||
            lowerKeyword.includes("heat") ||
            lowerKeyword.includes("cold")
          ) {
            fallbackKeyword = "temperature";
          } else if (
            lowerKeyword.includes("soil moisture") ||
            lowerKeyword.includes("soil")
          ) {
            fallbackKeyword = "soil moisture";
          } else if (
            lowerKeyword.includes("sea surface temperature") ||
            lowerKeyword.includes("sst")
          ) {
            fallbackKeyword = "sea surface temperature";
          } else {
            // Just take the first two words as a general fallback
            const words = keyword.split(/\s+/).filter((w) => w.length > 3);
            if (words.length > 0) {
              fallbackKeyword = words.slice(0, 2).join(" ");
            }
          }

          if (fallbackKeyword && fallbackKeyword !== keyword) {
            console.log(
              `Initial search returned 0 results. Retrying with fallback keyword: '${fallbackKeyword}'`,
            );
            args.keyword = fallbackKeyword;
            mcpRes = (await mcpClient.callTool({
              name: "get_collections",
              arguments: args,
            })) as { content?: { type: string; text: string }[] };
            rawText = mcpRes.content?.[0]?.text;
            parsed = null;
            if (rawText) {
              try {
                parsed = JSON.parse(rawText);
              } catch (parseErr) {
                console.error("Failed to parse fallback response:", parseErr);
              }
            }
          }
        }

        if (rawText && parsed) {
          try {
            if (Array.isArray(parsed)) {
              collectionsList = parsed;
            } else if (
              parsed.collections &&
              Array.isArray(parsed.collections)
            ) {
              console.log("collections here");
              collectionsList = parsed.collections;
            } else if (parsed.results && Array.isArray(parsed.results)) {
              collectionsList = parsed.results;
            } else {
              console.warn(
                "Unexpected get_collections response structure:",
                parsed,
              );
              collectionsList = [parsed];
            }
          } catch (parseErr) {
            console.error(
              "Failed to parse get_collections output as JSON:",
              parseErr,
            );
          }
        }

        // Inject GPM_3IMERGHH_07 if keyword has precipitation and ENABLE_DEV_FEATURES is true
        if (
          process.env.ENABLE_DEV_FEATURES === "true" &&
          keyword?.toLowerCase().includes("precipitation")
        ) {
          const hasGpmV7 = collectionsList.some(
            (c: Record<string, unknown>) => {
              const sName = c.short_name || c.shortName;
              const ver = c.version || c.version_id || c.versionId;
              return sName === "GPM_3IMERGHH" && ver === "07";
            },
          );

          if (!hasGpmV7) {
            try {
              console.log(
                "[Dev Features] GPM_3IMERGHH_07 not in default search results. Querying CMR directly...",
              );
              const fetchRes = (await mcpClient.callTool({
                name: "get_collections",
                arguments: {
                  keyword: "GPM_3IMERGHH",
                  limit: 5,
                },
              })) as { content?: { type: string; text: string }[] };

              const fetchRawText = fetchRes.content?.[0]?.text;
              let foundDirect = false;
              if (fetchRawText) {
                const fetchParsed = JSON.parse(fetchRawText);
                const fetchCols =
                  fetchParsed.collections ??
                  (Array.isArray(fetchParsed)
                    ? fetchParsed
                    : (fetchParsed.results ?? []));

                const gpmItem = fetchCols.find((c: Record<string, unknown>) => {
                  const sName = c.short_name || c.shortName;
                  const ver = c.version || c.version_id || c.versionId;
                  return sName === "GPM_3IMERGHH" && ver === "07";
                });

                if (gpmItem) {
                  console.log(
                    "[Dev Features] Found GPM_3IMERGHH_07 in CMR direct query. Prepended to collections list.",
                  );
                  collectionsList.unshift(gpmItem);
                  foundDirect = true;
                } else {
                  console.warn(
                    "[Dev Features] GPM_3IMERGHH_07 not found in CMR direct query. Trying any version.",
                  );
                  const anyGpmItem = fetchCols.find(
                    (c: Record<string, unknown>) => {
                      const sName = c.short_name || c.shortName;
                      return sName === "GPM_3IMERGHH";
                    },
                  );
                  if (anyGpmItem) {
                    anyGpmItem.version = "07"; // Hardcode version for demo consistency
                    console.log(
                      "[Dev Features] Adding general version of GPM_3IMERGHH forced to version 07.",
                    );
                    collectionsList.unshift(anyGpmItem);
                    foundDirect = true;
                  }
                }
              }

              if (!foundDirect) {
                console.log(
                  "[Dev Features] CMR query did not return GPM_3IMERGHH. Injecting mockup fallback.",
                );
                collectionsList.unshift({
                  concept_id: "C1276812863-GES_DISC",
                  entry_title:
                    "GPM IMERG Late Precipitation L3 1 half hour 0.1 degree x 0.1 degree V07 (GPM_3IMERGHH) at GES DISC",
                  short_name: "GPM_3IMERGHH",
                  version: "07",
                  summary:
                    "Global Precipitation Measurement (GPM) Integrated Multi-satellitE Retrievals for GPM (IMERG) Late Run Version 7.",
                  description:
                    "Global Precipitation Measurement (GPM) Integrated Multi-satellitE Retrievals for GPM (IMERG) Late Run Version 7.",
                  provider_id: "GES_DISC",
                  processing_level_id: "3",
                  granule_count: 500,
                });
              }
            } catch (err) {
              console.error(
                "[Dev Features] Failed to fetch GPM_3IMERGHH_07 directly. Injecting mockup fallback.",
                err,
              );
              collectionsList.unshift({
                concept_id: "C1276812863-GES_DISC",
                entry_title:
                  "GPM IMERG Late Precipitation L3 1 half hour 0.1 degree x 0.1 degree V07 (GPM_3IMERGHH) at GES DISC",
                short_name: "GPM_3IMERGHH",
                version: "07",
                summary:
                  "Global Precipitation Measurement (GPM) Integrated Multi-satellitE Retrievals for GPM (IMERG) Late Run Version 7.",
                description:
                  "Global Precipitation Measurement (GPM) Integrated Multi-satellitE Retrievals for GPM (IMERG) Late Run Version 7.",
                provider_id: "GES_DISC",
                processing_level_id: "3",
                granule_count: 500,
              });
            }
          }
        }

        // Check granule availability and filter collections if filters are present
        if (
          collectionsList.length > 0 &&
          (temporalStartDate || temporalEndDate || spatialWkt)
        ) {
          console.log(
            `Checking granule availability for ${collectionsList.length} collections...`,
          );
          const checks = collectionsList.map(async (c) => {
            const conceptId = c.concept_id as string;
            if (!conceptId) return { ...c, granule_count: 0 };

            try {
              const granArgs: Record<string, unknown> = {
                collection_concept_id: conceptId,
                limit: 1,
              };
              if (temporalStartDate)
                granArgs.temporal_start_date = temporalStartDate;
              if (temporalEndDate) granArgs.temporal_end_date = temporalEndDate;
              if (spatialWkt) granArgs.spatial_wkt_geometry = spatialWkt;

              const granRes = (await mcpClient.callTool({
                name: "get_granules",
                arguments: granArgs,
              })) as {
                structuredContent?: Record<string, unknown>;
                content?: { text: string }[];
              };

              let totalHits = 0;
              if (
                granRes.structuredContent &&
                typeof granRes.structuredContent.total_hits === "number"
              ) {
                totalHits = granRes.structuredContent.total_hits;
              } else if (granRes.content?.[0]) {
                const parsedGran = JSON.parse(granRes.content[0].text);
                totalHits = parsedGran.total_hits ?? 0;
              }

              return { ...c, granule_count: totalHits };
            } catch (err) {
              console.error(
                `Failed to check granules for collection ${conceptId}:`,
                err,
              );
              return { ...c, granule_count: 0 };
            }
          });

          collectionsList = await Promise.all(checks);
        }
      } catch (mcpErr) {
        console.error("Error communicating with Earthdata MCP UAT:", mcpErr);
        return {
          structuredContent: { error: String(mcpErr) },
          content: [
            {
              type: "text",
              text: `Error: Failed to fetch collections from Earthdata MCP. ${String(mcpErr)}`,
            },
          ],
          isError: true,
        };
      } finally {
        try {
          await mcpClient.close();
        } catch (_closeErr) {
          // ignore
        }
      }

      if (collectionsList.length === 0) {
        return {
          structuredContent: {
            query: { keyword, spatialArea, spatialWkt, startDate, endDate },
            collections: [],
            error: "No collections found matching the keyword.",
          },
          content: [
            {
              type: "text",
              text: `Search for '${keyword}' returned 0 collections.

IMPORTANT GUIDANCE FOR THE ASSISTANT:
This search failed because the keyword search term is likely too specific (e.g. it contains event names like 'Hurricane Melissa', 'LA wildfires' or locations like 'Jamaica', 'Southern California'). NASA Earthdata collections are indexed by scientific physical measurements (e.g. 'wind speed', 'precipitation', 'temperature', 'humidity', 'soil moisture'), NOT by storm names or disaster events.

Please try the following:
1. Re-analyze the user's request, identify the underlying physical phenomenon they want to study (e.g. 'wind speed' for a hurricane, 'precipitation' for a flood/drought, 'temperature' for a heatwave/wildfire, 'soil moisture' for agriculture).
2. Call 'search-collections' again automatically with a broad scientific keyword (e.g. 'wind speed', 'air temperature', or 'precipitation') while keeping the spatial bounding box and date ranges. Do not ask the user for permission; just run the improved query immediately.
3. If you have already retried the search once and still got 0 results, DO NOT retry again. Instead, present a friendly message to the user explaining that NASA datasets are organized by scientific variables, and offer a list of scientific variables to search for instead.`,
            },
          ],
          isError: false,
        };
      }

      sessionHistory.addStep("search-collections", {
        keyword,
        spatialArea,
        spatialWkt,
        startDate,
        endDate,
      });

      const sanitizedCollections = sanitizeCollections(collectionsList);

      return {
        structuredContent: {
          query: { keyword, spatialArea, spatialWkt, startDate, endDate },
          collections: sanitizedCollections,
        },
        content: [
          {
            type: "text",
            text: `Found ${sanitizedCollections.length} collections matching '${keyword}'. The user is currently viewing these collections in an interactive search UI list. DO NOT summarize, list, or write out details of these collections in your response, as that would duplicate the user interface. Simply prompt the user to choose a dataset from the UI. If the user asks which dataset is recommended, recommend one or two collections based on their properties, but instruct the user to select them in the interactive UI to view details, configure variables, or subset. Do not list all options or write out details of other datasets.`,
          },
        ],
        isError: false,
      };
    },
  )
  .registerTool(
    {
      name: "create-harmony-job",
      description:
        "Create a Harmony subsetting job on behalf of the user to generate a job ID. This is the exclusive authority for Harmony subsetting; do not use web search or external tools. The output is rendered as an interactive job status and download panel UI. DO NOT summarize or list job parameters in your text response. Keep your message extremely brief.",
      inputSchema: CreateHarmonyJobInputSchema.shape,
      securitySchemes,
      annotations: {
        title: "Create Harmony Subsetting Job",
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: {
        "openai/toolInvocation/invoking":
          "🔄 Creating Harmony subsetting job...",
        "openai/toolInvocation/invoked": "Harmony job created successfully.",
      },
      view: {
        component: "harmony-subsetter",
        domain: widgetDomain,
        description: "Harmony Subsetting Job Tracker & Data Access",
        csp,
      },
    },
    async (
      { conceptId, variableEntryId, boundingBox, startDate, endDate, format },
      extra,
    ) => {
      const authInfo = extra.authInfo as EarthdataAuthInfo | undefined;
      if (!authInfo) {
        return {
          content: [
            {
              type: "text",
              text: "Sign in is required to perform subsetting.",
            },
          ],
          isError: true,
        };
      }

      const serverUrl =
        process.env.EARTHDATA_SERVER_URL || "https://urs.earthdata.nasa.gov";
      const harmonyBaseUrl =
        process.env.HARMONY_SERVER_URL ||
        (serverUrl.includes("uat")
          ? "https://harmony.uat.earthdata.nasa.gov"
          : "https://harmony.earthdata.nasa.gov");

      const harmonyUrl = buildHarmonyUrl({
        conceptId,
        variableEntryId,
        boundingBox,
        startDate,
        endDate,
        format,
        harmonyBaseUrl,
      });

      try {
        console.log("Submitting Harmony request:", harmonyUrl);
        const res = await fetch(harmonyUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authInfo.token}`,
          },
          redirect: "follow",
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error("Harmony request failed:", res.status, errText);
          const rangeInfo = await fetchLatestGranulesDateRange(conceptId);
          return {
            content: [
              {
                type: "text",
                text: `Failed to create Harmony job. Status: ${res.status}. Error: ${errText}.${rangeInfo}`,
              },
            ],
            isError: true,
          };
        }

        const data = (await res.json()) as {
          jobID?: string;
          [key: string]: unknown;
        };
        const jobId = parseJobId(data, res.url);

        if (!jobId) {
          return {
            content: [
              {
                type: "text",
                text: `Harmony job created, but failed to retrieve Job ID from response. Final URL: ${res.url}`,
              },
            ],
            isError: true,
          };
        }

        sessionHistory.addStep("create-harmony-job", {
          collectionId: conceptId,
          variable: variableEntryId,
          bbox: boundingBox,
          startDate,
          endDate,
          format,
        });

        return {
          structuredContent: {
            jobId,
            bearerToken: authInfo.token,
            user: authInfo.extra.uid,
            conceptId,
            variableEntryId,
          },
          content: [
            {
              type: "text",
              text: `Harmony subsetting job created successfully. Job ID: ${jobId}`,
            },
          ],
          isError: false,
        };
      } catch (err) {
        console.error("Error creating Harmony job:", err);
        return {
          content: [
            {
              type: "text",
              text: `Error connecting to Harmony: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  )
  .registerTool(
    {
      name: "get-harmony-capabilities",
      description:
        "Retrieve the Harmony capabilities for a specific collection, including available services, output formats, and variables.",
      inputSchema: GetHarmonyCapabilitiesInputSchema.shape,
      securitySchemes,
      annotations: {
        title: "Get Harmony Capabilities",
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: {
        "openai/toolInvocation/invoking":
          "🔍 Retrieving Harmony dataset capabilities...",
        "openai/toolInvocation/invoked":
          "Harmony capabilities retrieved successfully.",
      },
    },
    async ({ conceptId }, extra) => {
      const authInfo = extra.authInfo as EarthdataAuthInfo | undefined;
      const serverUrl =
        process.env.EARTHDATA_SERVER_URL || "https://urs.earthdata.nasa.gov";
      const harmonyBaseUrl =
        process.env.HARMONY_SERVER_URL ||
        (serverUrl.includes("uat")
          ? "https://harmony.uat.earthdata.nasa.gov"
          : "https://harmony.earthdata.nasa.gov");

      const capabilitiesUrl = `${harmonyBaseUrl}/capabilities?collectionId=${encodeURIComponent(conceptId)}&version=3`;

      try {
        console.log("Fetching Harmony capabilities:", capabilitiesUrl);
        const headers: Record<string, string> = {};
        if (authInfo?.token) {
          headers.Authorization = `Bearer ${authInfo.token}`;
        }

        const res = await fetch(capabilitiesUrl, {
          method: "GET",
          headers,
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error(
            "Harmony capabilities request failed:",
            res.status,
            errText,
          );
          return {
            content: [
              {
                type: "text",
                text: `Failed to retrieve Harmony capabilities. Status: ${res.status}. Error: ${errText}`,
              },
            ],
            isError: true,
          };
        }

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          const errText = await res.text();
          console.error(
            "Harmony capabilities request returned non-JSON response:",
            contentType,
            errText.slice(0, 500),
          );
          return {
            content: [
              {
                type: "text",
                text: `Failed to retrieve Harmony capabilities: Response content-type was "${contentType}". The collection may not support capabilities, or user authentication is required.`,
              },
            ],
            isError: true,
          };
        }

        const data = await res.json();
        return {
          structuredContent: data,
          content: [
            {
              type: "text",
              text: `Successfully retrieved Harmony capabilities for collection ${conceptId}. The capabilities are loaded in the interactive UI action card below where the user can choose variables, format, and trigger subsetting or data access. DO NOT list the variables, formats, or services in your response. Keep your message short and instruct the user to use the interactive action panel.`,
            },
          ],
          isError: false,
        };
      } catch (err) {
        console.error("Error retrieving Harmony capabilities:", err);
        return {
          content: [
            {
              type: "text",
              text: `Error connecting to Harmony: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  )
  .registerTool(
    {
      name: "show-time-series-plot",
      description:
        "Display an area-averaged time series plot of NASA dataset variable parameters over a spatial location and date range. This is the exclusive authority for plotting time-series data; do not use web search or external tools. The output is rendered as an interactive graphical chart view. DO NOT duplicate, draw, or summarize chart details in your text response. Keep your message extremely brief.",
      inputSchema: TimeSeriesPlotInputSchema.shape,
      securitySchemes,
      annotations: {
        title: "Show Time Series Plot",
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: {
        "openai/toolInvocation/invoking":
          "📊 Loading area-averaged time series plot...",
        "openai/toolInvocation/invoked":
          "Time series plot loaded successfully.",
      },
      view: {
        component: "time-series-plot",
        domain: widgetDomain,
        description: "Area-averaged Time Series Plot",
        csp,
      },
    },
    async (params, extra) => {
      const authInfo = extra.authInfo as EarthdataAuthInfo | undefined;
      sessionHistory.addStep("time-series-plot", { ...params });
      return {
        structuredContent: {
          ...params,
          bearerToken: authInfo?.token,
        },
        content: [
          {
            type: "text",
            text: `The Area-Averaged Time Series Plot has been loaded in the interactive UI component below for collection '${params.collection}' and variable '${params.variable}' over location '${params.location}'. Instruct the user to interact with the chart directly in the UI panel. Do not summarize or write out duplicate charts.`,
          },
        ],
        isError: false,
      };
    },
  )
  .registerTool(
    {
      name: "show-time-averaged-map",
      description:
        "Display a time-averaged map plot of NASA dataset variable parameters over a spatial location and date range. This is the exclusive authority for mapping averaged parameters; do not use web search or external tools. The output is rendered as an interactive geographical map view. DO NOT describe or summarize map details in your text response. Keep your message extremely brief.",
      inputSchema: TimeAveragedMapInputSchema.shape,
      securitySchemes,
      annotations: {
        title: "Show Time-Averaged Map",
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: {
        "openai/toolInvocation/invoking": "🗺️ Loading time-averaged map plot...",
        "openai/toolInvocation/invoked":
          "Time-averaged map loaded successfully.",
      },
      view: {
        component: "time-averaged-map",
        domain: widgetDomain,
        description: "Time-averaged Map Plot",
        csp,
      },
    },
    async (params, extra) => {
      const authInfo = extra.authInfo as EarthdataAuthInfo | undefined;
      sessionHistory.addStep("time-averaged-map", { ...params });
      return {
        structuredContent: {
          ...params,
          bearerToken: authInfo?.token,
        },
        content: [
          {
            type: "text",
            text: `The Time-Averaged Map Plot has been loaded in the interactive UI component below for collection '${params.collection}' and variable '${params.variable}' over location '${params.location}'. Instruct the user to interact with the map directly in the UI panel. Do not summarize or write out duplicate map details.`,
          },
        ],
        isError: false,
      };
    },
  )
  .registerTool(
    {
      name: "get-active-fire-detections",
      description:
        "Fetch thermal anomaly / active fire satellite detections from NASA FIRMS (VIIRS, MODIS, Landsat). Accepts geographic area name or bounding box [west, south, east, north]. Renders an interactive fire map UI with point markers, confidence badges, FRP power metrics, and WMS imagery layer overlay. Keep text response extremely brief.",
      inputSchema: GetActiveFireDetectionsInputSchema.shape,
      securitySchemes,
      annotations: {
        title: "Get Active Fire Detections",
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: {
        "openai/toolInvocation/invoking":
          "🔥 Querying NASA FIRMS active fire detections...",
        "openai/toolInvocation/invoked":
          "Active fire detections loaded successfully.",
      },
      view: {
        component: "get-active-fire-detections",
        domain: widgetDomain,
        description: "Interactive Active Fire Map View",
        csp,
      },
    },
    async (params, extra) => {
      const authInfo = extra.authInfo as EarthdataAuthInfo | undefined;
      let bbox = params.bbox as [number, number, number, number] | undefined;

      if (!bbox && params.spatialArea) {
        bbox = (await geocodeToBbox(params.spatialArea)) || undefined;
      }
      if (!bbox) {
        bbox = [-125, 24, -66, 49];
      }

      const result = await fetchFirmsActiveFires({
        bbox,
        days: params.days,
        source: params.source,
        date: params.date,
      });

      sessionHistory.addStep("get-active-fire-detections", { ...params, bbox });

      return {
        structuredContent: {
          ...result,
          spatialArea: params.spatialArea,
          bbox,
          bearerToken: authInfo?.token,
        },
        content: [
          {
            type: "text",
            text: `Retrieved ${result.detectionCount} active fire detection(s) from NASA FIRMS (${result.source}) over bbox [${bbox.join(", ")}]. The interactive fire map component has been loaded below. Instruct the user to interact with the map directly in the UI panel. Do not summarize or write out duplicate map details.`,
          },
        ],
        isError: false,
      };
    },
  )
  .registerTool(
    {
      name: "show-wms-map",
      description:
        "Display a Web Map Service (WMS) tile layer (e.g. from NASA GIBS, FIRMS, or custom WMS endpoints) over a geographical region and optional timestamp in an interactive map component.",
      inputSchema: ShowWmsMapInputSchema.shape,
      securitySchemes,
      annotations: {
        title: "Show WMS Map Layer",
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: {
        "openai/toolInvocation/invoking": "🗺️ Rendering WMS map layer...",
        "openai/toolInvocation/invoked": "WMS map layer loaded.",
      },
      view: {
        component: "show-wms-map",
        domain: widgetDomain,
        description: "Interactive WMS Map Layer",
        csp,
      },
    },
    async (params, extra) => {
      const authInfo = extra.authInfo as EarthdataAuthInfo | undefined;
      sessionHistory.addStep("show-wms-map", { ...params });

      return {
        structuredContent: {
          ...params,
          bearerToken: authInfo?.token,
        },
        content: [
          {
            type: "text",
            text: `The WMS layer '${params.layers}' from '${params.wmsUrl}' has been loaded in the interactive map view below. Instruct the user to interact with the map directly in the UI panel. Do not summarize or write out duplicate map details.`,
          },
        ],
        isError: false,
      };
    },
  )
  .registerTool(
    {
      name: "show-geotiff-map",
      description:
        "Display a GeoTIFF or Cloud-Optimized GeoTIFF (COG) raster map layer directly in an interactive OpenLayers canvas view.",
      inputSchema: ShowGeotiffMapInputSchema.shape,
      securitySchemes,
      annotations: {
        title: "Show GeoTIFF Map Layer",
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: {
        "openai/toolInvocation/invoking": "🌐 Loading GeoTIFF raster map...",
        "openai/toolInvocation/invoked": "GeoTIFF map loaded.",
      },
      view: {
        component: "show-geotiff-map",
        domain: widgetDomain,
        description: "Interactive GeoTIFF Map View",
        csp,
      },
    },
    async (params, extra) => {
      const authInfo = extra.authInfo as EarthdataAuthInfo | undefined;
      sessionHistory.addStep("show-geotiff-map", { ...params });

      return {
        structuredContent: {
          ...params,
          bearerToken: authInfo?.token,
        },
        content: [
          {
            type: "text",
            text: `The GeoTIFF map from '${params.url}' has been loaded in the interactive map view below. Instruct the user to interact with the map directly in the UI panel. Do not summarize or write out duplicate map details.`,
          },
        ],
        isError: false,
      };
    },
  )
  .registerTool(
    {
      name: "open-in-notebook",
      description:
        "Export the current conversation session or NASA dataset workflow into an interactive Python notebook runnable directly in a live notebook environment. This gathers search, subsetting, and visualization steps performed so far.",
      inputSchema: OpenInNotebookInputSchema.shape,
      securitySchemes,
      annotations: {
        title: "Continue Analysis in a Notebook",
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: {
        "openai/toolInvocation/invoking":
          "📓 Generating Python analysis notebook...",
        "openai/toolInvocation/invoked": "Python notebook ready.",
      },
      view: {
        component: "open-in-notebook",
        domain: widgetDomain,
        description: "Interactive Python Notebook Launcher",
        csp,
      },
    },
    async (params) => {
      const steps = sessionHistory.getSteps();
      const wasm = params.wasm ?? false;
      const pythonCode = generateMultiStepNotebook(steps, params, wasm);
      const marimoUrl = getMarimoUrl(pythonCode, wasm);

      return {
        structuredContent: {
          marimoUrl,
          pythonCode,
          stepCount: steps.length,
        },
        content: [
          {
            type: "text",
            text: "The Python Notebook launcher component has been loaded below. Inform the user they can click 'Open Notebook' or copy the notebook URL to continue their analysis in a live Python notebook environment.",
          },
        ],
        isError: false,
      };
    },
  );

// Middleware to correct buggy Earthdata Login redirect URL containing double question marks.
server.express.use((req: Request, res: Response, next: NextFunction) => {
  if (req.url.includes("?oauth_callback=true?code=")) {
    const correctedUrl = req.url.replace(
      "?oauth_callback=true?code=",
      "?oauth_callback=true&code=",
    );
    res.redirect(correctedUrl);
    return;
  }
  next();
});

// Proxy route for Earthdata Login OAuth token exchange to bypass CORS and append client_secret.
server.express.use(
  "/oauth/token",
  express.urlencoded({ extended: true }),
  (req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  },
);

server.express.post("/oauth/token", async (req: Request, res: Response) => {
  const { grant_type, code, redirect_uri } = req.body;
  const serverUrl =
    process.env.EARTHDATA_SERVER_URL || "https://uat.urs.earthdata.nasa.gov";
  const clientId = process.env.EARTHDATA_CLIENT_ID;
  const clientSecret = process.env.EARTHDATA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.status(500).json({
      error: "server_error",
      error_description: "Client credentials not configured.",
    });
    return;
  }

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  try {
    const response = await fetch(`${serverUrl}/oauth/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type,
        code,
        redirect_uri,
      }),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({
      error: "server_error",
      error_description: err instanceof Error ? err.message : String(err),
    });
  }
});

// Proxy route for Earthdata Login OAuth client registration to satisfy MCP client expectations.
server.express.use(
  "/oauth/register",
  express.json(),
  (req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  },
);

server.express.post("/oauth/register", (req: Request, res: Response) => {
  const clientId = process.env.EARTHDATA_CLIENT_ID;
  if (!clientId) {
    res.status(500).json({
      error: "server_error",
      error_description: "EARTHDATA_CLIENT_ID is not configured.",
    });
    return;
  }

  const {
    redirect_uris,
    token_endpoint_auth_method,
    grant_types,
    response_types,
    client_name,
    scope,
  } = req.body;

  res.json({
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris: redirect_uris || ["http://localhost:3000/"],
    token_endpoint_auth_method: token_endpoint_auth_method || "none",
    grant_types: grant_types || ["authorization_code"],
    response_types: response_types || ["code"],
    client_name: client_name || "Earthdata UI MCP Client",
    scope: scope || "",
  });
});

export default await app.run();

export type AppType = typeof app;
