import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export interface HarmonyUrlParams {
  conceptId: string;
  variableEntryId: string;
  boundingBox?: number[];
  startDate?: string;
  endDate?: string;
  format?: string;
  harmonyBaseUrl: string;
}

/**
 * Builds the OGC Coverages URL for creating a Harmony subsetting job.
 */
export function buildHarmonyUrl({
  conceptId,
  variableEntryId,
  boundingBox,
  startDate,
  endDate,
  format,
  harmonyBaseUrl,
}: HarmonyUrlParams): string {
  const params = new URLSearchParams();

  if (boundingBox && boundingBox.length === 4) {
    const [minLon, minLat, maxLon, maxLat] = boundingBox;
    params.append("subset", `lat(${minLat}:${maxLat})`);
    params.append("subset", `lon(${minLon}:${maxLon})`);
  }

  if (startDate || endDate) {
    const start = startDate ? `"${startDate}"` : "*";
    const end = endDate ? `"${endDate}"` : "*";
    params.append("subset", `time(${start}:${end})`);
  }

  if (format) {
    params.append("format", format);
  }

  params.append("label", "terra-data-subsetter");
  params.append("skipPreview", "true");

  return `${harmonyBaseUrl}/${conceptId}/ogc-api-coverages/1.0.0/collections/${variableEntryId}/coverage/rangeset?${params.toString()}`;
}

/**
 * Parses the job ID from the Harmony response payload or the final redirected URL.
 */
export function parseJobId(
  data: { jobID?: string; jobId?: string },
  finalUrl?: string,
): string | undefined {
  const jobId = data.jobID || data.jobId;
  if (jobId) {
    return jobId;
  }

  if (finalUrl) {
    const urlMatch = finalUrl.match(/\/jobs\/([a-f0-9-]+)/);
    if (urlMatch) {
      return urlMatch[1];
    }
  }

  return undefined;
}

/**
 * Queries the remote UAT MCP server to find the available date range of granules for a collection.
 */
export async function fetchLatestGranulesDateRange(
  conceptId: string,
): Promise<string> {
  const mcpClient = new Client(
    { name: "earthdata-conductor-client", version: "0.0.1" },
    { capabilities: {} },
  );
  const transport = new StreamableHTTPClientTransport(
    new URL("https://cmr.uat.earthdata.nasa.gov/mcp/v1"),
  );

  try {
    await mcpClient.connect(transport);
    const mcpRes = (await mcpClient.callTool({
      name: "get_granules",
      arguments: {
        collection_concept_id: conceptId,
      },
    })) as { content?: { type: string; text: string }[] };

    if (mcpRes.content?.[0] && mcpRes.content[0].type === "text") {
      const rawText = mcpRes.content[0].text;
      const parsed = JSON.parse(rawText);
      const granules = Array.isArray(parsed)
        ? parsed
        : parsed.granules || parsed.results || [];

      if (granules.length > 0) {
        const dates = (granules as Record<string, unknown>[])
          .map((g) => g.time_start)
          .filter((d): d is string => typeof d === "string")
          .map((d) => new Date(d).getTime());
        if (dates.length > 0) {
          const minDate = new Date(Math.min(...dates))
            .toISOString()
            .split("T")[0];
          const maxDate = new Date(Math.max(...dates))
            .toISOString()
            .split("T")[0];
          return ` For this collection, available granules in UAT range from ${minDate} to ${maxDate}.`;
        }
      }
    }
  } catch (e) {
    console.error("Failed to fetch granules range:", e);
  } finally {
    try {
      await mcpClient.close();
    } catch (_) {}
  }
  return "";
}
