import "dotenv/config";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import {
  McpServer,
  mcpAuthMetadataRouter,
  optionalBearerAuth,
} from "skybridge/server";
import { z } from "zod";
import { type EarthdataAuthInfo, verifyAccessToken } from "./auth.js";
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
  .use(
    mcpAuthMetadataRouter({
      oauthMetadata: {
        issuer: process.env.SERVER_URL || "http://localhost:3000",
        authorization_endpoint: `${process.env.EARTHDATA_SERVER_URL || "https://uat.urs.earthdata.nasa.gov"}/oauth/authorize`,
        token_endpoint: `${process.env.SERVER_URL || "http://localhost:3000"}/oauth/token`,
        registration_endpoint: `${process.env.SERVER_URL || "http://localhost:3000"}/oauth/register`,
        response_types_supported: ["code"],
      },
      resourceServerUrl: new URL(
        `${process.env.SERVER_URL || "http://localhost:3000"}/mcp`,
      ),
    }),
  )
  .use("/mcp", optionalBearerAuth({ verifier: { verifyAccessToken } }))
  .registerTool(
    {
      name: "browse-data",
      description: "Browse data files directly from the archive.",
      inputSchema: BrowseDataInputSchema.shape,
      securitySchemes: [{ type: "noauth" }, { type: "oauth2" }],
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
      securitySchemes: [{ type: "noauth" }, { type: "oauth2" }],
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
  )
  .registerTool(
    {
      name: "create-harmony-job",
      description:
        "Create a Harmony subsetting job on behalf of the user to generate a job ID.",
      inputSchema: z.object({
        collectionId: z.string(),
        subsetParams: z.record(z.string(), z.any()),
      }).shape,
      securitySchemes: [{ type: "oauth2" }],
    },
    async ({ collectionId, subsetParams }, extra) => {
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
      return {
        structuredContent: {
          jobId: "harmony-job-mock-id-1234",
          user: authInfo.extra.uid,
          collectionId,
          subsetParams,
        },
        content: [
          {
            type: "text",
            text: `Harmony subsetting job created successfully for collection ${collectionId} (user: ${authInfo.extra.uid}).`,
          },
        ],
        isError: false,
      };
    },
  );

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

export default await server.run();

export type AppType = typeof server;
