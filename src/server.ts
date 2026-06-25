import { McpServer } from "skybridge/server";
import csp from "./csp.js";
import { BrowseDataInputSchema } from "./schemas/browse-data.schema.js";

const server = new McpServer(
  {
    name: "earthdata-ui-mcp",
    version: "0.0.1",
  },
  { capabilities: {} },
).registerTool(
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
  async ({ shortName, version }) => {
    return {
      structuredContent: { shortName, version },
      content: [],
      isError: false,
    };
  },
);

export default await server.run();

export type AppType = typeof server;
