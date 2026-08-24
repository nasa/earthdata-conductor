export interface HarmonyJobLink {
  title?: string;
  href: string;
  rel?: string;
  type?: string;
}

export interface HarmonyJob {
  jobID: string;
  username?: string;
  status:
    | "successful"
    | "running"
    | "processing"
    | "paused"
    | "failed"
    | "canceled"
    | "complete_with_errors"
    | string;
  message?: string;
  progress?: number;
  createdAt?: string;
  updatedAt?: string;
  dataExpiration?: string;
  links?: HarmonyJobLink[];
  labels?: string[];
  steps?: string;
  serviceName?: string;
  request: string;
  numInputGranules?: number;
}

export interface HarmonyJobsResponse {
  count?: number;
  jobs?: HarmonyJob[];
}

export interface HarmonyJobQuery {
  requestType: "time-series" | "time-average-map" | "subsetter";
  collection?: string;
  variable?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
}

export interface ParsedHarmonyRequest {
  requestType?: "time-series" | "time-average-map" | "subsetter";
  collection?: string;
  variables: string[];
  labels: string[];
  startDate?: string;
  endDate?: string;
  latMin?: number;
  latMax?: number;
  lonMin?: number;
  lonMax?: number;
  average?: string;
  format?: string;
}

/**
 * Normalizes a date string into YYYY-MM-DD format for robust comparisons
 */
export function normalizeDate(dateStr?: string): string | null {
  if (!dateStr) return null;
  const cleaned = dateStr.replace(/["']/g, "").trim();
  const d = new Date(cleaned);
  if (Number.isNaN(d.getTime())) {
    // If Date parsing fails, return first 10 characters if YYYY-MM-DD format
    const match = cleaned.match(/\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : null;
  }
  return d.toISOString().slice(0, 10);
}

/**
 * Parses numbers from a location string ("west,south,east,north" or "lat,lon")
 */
export function parseLocationBounds(
  locationStr?: string,
): { west?: number; south?: number; east?: number; north?: number } | null {
  if (!locationStr) return null;
  const parts = locationStr
    .split(",")
    .map((s) => Number.parseFloat(s.trim()))
    .filter((n) => !Number.isNaN(n));

  if (parts.length === 4) {
    const [west, south, east, north] = parts;
    return { west, south, east, north };
  }

  if (parts.length === 2) {
    // Single point or center coordinate [lat, lon] or [lon, lat]
    const [p1, p2] = parts;
    return { west: p2, south: p1, east: p2, north: p1 };
  }

  return null;
}

/**
 * Parses a Harmony request URL and label array into structured options
 */
export function parseHarmonyJobRequest(
  requestUrl: string,
  labels: string[] = [],
): ParsedHarmonyRequest {
  const result: ParsedHarmonyRequest = {
    variables: [],
    labels: [...labels],
  };

  try {
    const parsedUrl = new URL(requestUrl);

    // Extract labels from URL search params if present
    const urlLabels = parsedUrl.searchParams.getAll("label");
    for (const l of urlLabels) {
      if (!result.labels.includes(l)) {
        result.labels.push(l);
      }
    }

    // Extract collection from labels (e.g. "collection: gpm_3imerghh_07")
    const collectionLabel = result.labels.find((l) =>
      l.toLowerCase().startsWith("collection:"),
    );
    if (collectionLabel) {
      result.collection = collectionLabel.split(":")[1].trim();
    }

    // Extract variables
    const vars = parsedUrl.searchParams.getAll("variable");
    if (vars.length > 0) {
      result.variables = vars;
    }

    // Extract average & format
    result.average = parsedUrl.searchParams.get("average") || undefined;
    result.format = parsedUrl.searchParams.get("format") || undefined;

    // Determine request type
    if (
      result.labels.includes("terra-time-series") ||
      result.average === "area" ||
      result.format?.includes("csv")
    ) {
      result.requestType = "time-series";
    } else if (
      result.labels.includes("terra-time-average-map") ||
      result.average === "time" ||
      result.format?.includes("tiff")
    ) {
      result.requestType = "time-average-map";
    } else if (
      result.labels.includes("terra-data-subsetter") ||
      result.format?.includes("netcdf")
    ) {
      result.requestType = "subsetter";
    }

    // Extract subsets (lat, lon, time)
    const subsets = parsedUrl.searchParams.getAll("subset");
    for (const subset of subsets) {
      const latMatch = subset.match(/^lat\((.+):(.+)\)$/);
      const lonMatch = subset.match(/^lon\((.+):(.+)\)$/);
      const timeMatch = subset.match(/^time\((.+)\)$/);

      if (latMatch) {
        result.latMin = Number.parseFloat(latMatch[1]);
        result.latMax = Number.parseFloat(latMatch[2]);
      } else if (lonMatch) {
        result.lonMin = Number.parseFloat(lonMatch[1]);
        result.lonMax = Number.parseFloat(lonMatch[2]);
      } else if (timeMatch) {
        const rawTime = timeMatch[1];
        const timeParts = rawTime.split('":"');
        if (timeParts.length === 2) {
          result.startDate = timeParts[0].replace(/^"/, "");
          result.endDate = timeParts[1].replace(/"$/, "");
        } else {
          const simpleParts = rawTime.split(":");
          if (simpleParts.length === 2) {
            result.startDate = simpleParts[0].replace(/^"/, "");
            result.endDate = simpleParts[1].replace(/"$/, "");
          }
        }
      }
    }
  } catch (_err) {
    // If URL parsing fails, rely on labels
  }

  return result;
}

/**
 * Evaluates whether a Harmony job matches the given query parameters
 */
export function isJobMatch(job: HarmonyJob, query: HarmonyJobQuery): boolean {
  // Ignore non-successful/cancelled jobs
  if (
    job.status !== "successful" &&
    job.status !== "running" &&
    job.status !== "processing"
  ) {
    return false;
  }

  if (!job.request) return false;

  const parsed = parseHarmonyJobRequest(job.request, job.labels || []);

  // 1. Component / Request Type match
  if (parsed.requestType && parsed.requestType !== query.requestType) {
    return false;
  }

  // 2. Collection match
  if (query.collection) {
    const targetColl = query.collection.toLowerCase().trim();
    const parsedColl = (parsed.collection || "").toLowerCase().trim();
    const reqUrlLower = job.request.toLowerCase();
    const labelsLower = (job.labels || []).map((l) => l.toLowerCase());

    const collMatched =
      parsedColl === targetColl ||
      reqUrlLower.includes(targetColl) ||
      labelsLower.some((l) => l.includes(targetColl));

    if (!collMatched) return false;
  }

  // 3. Variable match
  if (query.variable) {
    const rawVar = query.variable.split("/").pop() || query.variable;
    const targetVar = rawVar.toLowerCase().trim();
    const reqUrlLower = job.request.toLowerCase();
    const varsLower = parsed.variables.map((v) => v.toLowerCase());
    const labelsLower = (job.labels || []).map((l) => l.toLowerCase());

    const varMatched =
      varsLower.some((v) => v.includes(targetVar)) ||
      reqUrlLower.includes(targetVar) ||
      labelsLower.some((l) => l.includes(targetVar));

    if (!varMatched) return false;
  }

  // 4. Date Range match
  if (query.startDate) {
    const queryStart = normalizeDate(query.startDate);
    const parsedStart = normalizeDate(parsed.startDate);
    if (queryStart && parsedStart && queryStart !== parsedStart) {
      return false;
    }
  }

  if (query.endDate) {
    const queryEnd = normalizeDate(query.endDate);
    const parsedEnd = normalizeDate(parsed.endDate);
    if (queryEnd && parsedEnd && queryEnd !== parsedEnd) {
      return false;
    }
  }

  // 5. Location / Bounding box match (with tolerance)
  if (query.location) {
    const queryBounds = parseLocationBounds(query.location);
    if (
      queryBounds &&
      queryBounds.west !== undefined &&
      queryBounds.south !== undefined &&
      queryBounds.east !== undefined &&
      queryBounds.north !== undefined &&
      parsed.lonMin !== undefined &&
      parsed.latMin !== undefined &&
      parsed.lonMax !== undefined &&
      parsed.latMax !== undefined
    ) {
      const tol = 0.05; // 0.05 degree tolerance
      const westDiff = Math.abs(queryBounds.west - parsed.lonMin);
      const southDiff = Math.abs(queryBounds.south - parsed.latMin);
      const eastDiff = Math.abs(queryBounds.east - parsed.lonMax);
      const northDiff = Math.abs(queryBounds.north - parsed.latMax);

      if (
        westDiff > tol ||
        southDiff > tol ||
        eastDiff > tol ||
        northDiff > tol
      ) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Fetches recent jobs from Harmony and returns the jobID of the first matching job, or null if none found
 */
export async function findMatchingHarmonyJob(
  query: HarmonyJobQuery,
  bearerToken?: string,
): Promise<string | null> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (bearerToken) {
      headers.Authorization = `Bearer ${bearerToken}`;
    }

    const response = await fetch(
      "https://harmony.earthdata.nasa.gov/jobs?limit=25",
      {
        headers,
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as HarmonyJobsResponse;
    if (!data.jobs || !Array.isArray(data.jobs)) {
      return null;
    }

    for (const job of data.jobs) {
      if (isJobMatch(job, query)) {
        return job.jobID;
      }
    }
  } catch (_err) {
    // Network or parsing error: fallback seamlessly
  }

  return null;
}
