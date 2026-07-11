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
