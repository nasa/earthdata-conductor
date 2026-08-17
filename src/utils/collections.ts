export interface SanitizedCollection {
  concept_id: string;
  entry_title: string;
  short_name?: string;
  version?: string;
  summary?: string;
  provider_id?: string;
  processing_level_id?: string;
  platforms?: string[];
  instruments?: string[];
  time_start?: string;
  time_end?: string;
  granule_count?: number;
}

/**
 * Sanitizes a raw collection record from Earthdata CMR API / MCP response.
 * Drops heavy, unused properties (such as full abstract, related_urls, science_keywords)
 * and truncates long text descriptions to prevent context overload in LLM prompts.
 */
export function sanitizeCollection(
  c: Record<string, unknown>,
): SanitizedCollection {
  const concept_id = String(c.concept_id || c.id || "");
  const entry_title = String(c.entry_title || c.title || "");
  const short_name =
    c.short_name || c.shortName
      ? String(c.short_name || c.shortName)
      : undefined;
  const version =
    c.version || c.version_id || c.versionId
      ? String(c.version || c.version_id || c.versionId)
      : undefined;

  let rawSummary = (c.summary || c.description || c.abstract || "") as string;
  if (typeof rawSummary !== "string") {
    rawSummary = "";
  }
  // Collapse whitespace and newlines for clean JSON
  rawSummary = rawSummary.replace(/\s+/g, " ").trim();

  // Truncate multi-paragraph abstracts down to ~300 characters
  const summary =
    rawSummary.length > 300
      ? `${rawSummary.slice(0, 300).trim()}...`
      : rawSummary || undefined;

  const provider_id =
    c.provider_id || c.providerId
      ? String(c.provider_id || c.providerId)
      : undefined;
  const processing_level_id =
    c.processing_level_id || c.processingLevelId
      ? String(c.processing_level_id || c.processingLevelId)
      : undefined;

  let platforms: string[] | undefined;
  if (Array.isArray(c.platforms)) {
    const list = c.platforms
      .map((p) =>
        typeof p === "object" && p !== null
          ? (p as Record<string, unknown>).short_name ||
            (p as Record<string, unknown>).ShortName ||
            String(p)
          : String(p),
      )
      .filter(Boolean);
    if (list.length > 0) {
      platforms = list as string[];
    }
  }

  let instruments: string[] | undefined;
  if (Array.isArray(c.instruments)) {
    const list = c.instruments.map((i) => String(i)).filter(Boolean);
    if (list.length > 0) {
      instruments = list;
    }
  }

  const time_start = c.time_start ? String(c.time_start) : undefined;
  const time_end = c.time_end ? String(c.time_end) : undefined;
  const granule_count =
    typeof c.granule_count === "number" ? c.granule_count : undefined;

  return {
    concept_id,
    entry_title,
    ...(short_name ? { short_name } : {}),
    ...(version ? { version } : {}),
    ...(summary ? { summary } : {}),
    ...(provider_id ? { provider_id } : {}),
    ...(processing_level_id ? { processing_level_id } : {}),
    ...(platforms && platforms.length > 0 ? { platforms } : {}),
    ...(instruments && instruments.length > 0 ? { instruments } : {}),
    ...(time_start ? { time_start } : {}),
    ...(time_end ? { time_end } : {}),
    ...(granule_count !== undefined ? { granule_count } : {}),
  };
}

/**
 * Sanitizes an array of raw collection records.
 */
export function sanitizeCollections(
  collections: Record<string, unknown>[],
): SanitizedCollection[] {
  return collections.map(sanitizeCollection);
}
