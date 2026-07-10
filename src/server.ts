import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { McpServer } from "skybridge/server";
import csp from "./csp.js";
import { BrowseDataInputSchema } from "./schemas/browse-data.schema.js";
import { SearchCollectionsInputSchema } from "./schemas/search-collections.schema.js";

const server = new McpServer(
  {
    name: "earthdata-ui-mcp",
    version: "0.0.1",
  },
  { capabilities: {} },
)
  .registerTool(
    {
      name: "browse-data",
      description: "Browse data files directly from the archive.",
      inputSchema: BrowseDataInputSchema.shape,
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
        domain: "https://nasa.gov", // TODO: replace with URL the widget will be served from in production
        description: "Browse data files directly from the archive.",
        csp,
      },
    },
    async ({ shortName, version, spatialArea, startDate, endDate }) => {
      return {
        structuredContent: {
          shortName,
          version,
          spatialArea,
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
        "Search NASA Earthdata collections by keyword, spatial area, and date range.",
      inputSchema: SearchCollectionsInputSchema.shape,
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
        domain: "https://nasa.gov",
        description: "Search and choose datasets.",
        csp,
      },
    },
    async ({
      keyword,
      spatialArea,
      spatialWkt: inputSpatialWkt,
      startDate,
      endDate,
    }) => {
      let spatialWkt = inputSpatialWkt;

      // 1. Geocode spatialArea to a bounding box WKT if provided
      if (spatialArea && !spatialWkt) {
        try {
          const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            spatialArea,
          )}&format=json&limit=1`;
          const geoRes = await fetch(url, {
            headers: {
              "User-Agent":
                "earthdata-ui-mcp/0.0.1 (contact: nasa-mcp-integration)",
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
        { name: "earthdata-ui-mcp-client", version: "0.0.1" },
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
        const mcpRes = (await mcpClient.callTool({
          name: "get_collections",
          arguments: args,
        })) as { content?: { type: string; text: string }[] };

        if (mcpRes.content?.[0] && mcpRes.content[0].type === "text") {
          const rawText = mcpRes.content[0].text;

          try {
            const parsed = JSON.parse(rawText);
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

      return {
        structuredContent: {
          query: { keyword, spatialArea, spatialWkt, startDate, endDate },
          collections: collectionsList,
        },
        content: [
          {
            type: "text",
            text: `Found ${collectionsList.length} collections matching '${keyword}'.`,
          },
        ],
        isError: false,
      };
    },
  );

export default await server.run();

export type AppType = typeof server;
