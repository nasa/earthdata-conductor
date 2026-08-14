import z from "zod";

export const SearchCollectionsInputSchema = z.object({
  keyword: z
    .string()
    .describe(
      "The search term or topic representing physical phenomena (e.g., 'wind speed', 'precipitation', 'temperature', 'soil moisture'). IMPORTANT: Do NOT include event names (like 'Hurricane Melissa' or 'LA wildfires') or place names (like 'Jamaica' or 'Virginia') in this keyword; extract only the physical parameters/science variables to measure.",
    ),
  spatialArea: z
    .string()
    .optional()
    .describe(
      "A geographic area name (e.g., 'Virginia', 'California') to be automatically geocoded into a bounding box",
    ),
  spatialWkt: z
    .string()
    .optional()
    .describe(
      "Optional spatial area as Well-Known Text (WKT), e.g. POLYGON((west south, west north, east north, east south, west south))",
    ),
  startDate: z
    .string()
    .optional()
    .describe("The start date of the interest period (e.g., '2025-01-01')"),
  endDate: z
    .string()
    .optional()
    .describe("The end date of the interest period (e.g., '2025-12-31')"),
});

export const SearchCollectionsOutputSchema = z.object({
  query: z
    .object({
      keyword: z.string().optional(),
      spatialArea: z.string().optional(),
      spatialWkt: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })
    .optional(),
  collections: z
    .array(
      z.object({
        concept_id: z.string(),
        entry_title: z.string(),
        short_name: z.string().optional(),
        version: z.string().optional(),
        summary: z.string().optional(),
        description: z.string().optional(),
        provider_id: z.string().optional(),
        processing_level_id: z.string().optional(),
        platforms: z
          .array(z.union([z.string(), z.record(z.string(), z.unknown())]))
          .optional(),
        instruments: z.array(z.string()).optional(),
        time_start: z.string().optional(),
        time_end: z.string().optional(),
        granule_count: z.number().optional(),
      }),
    )
    .optional(),
  error: z.string().optional(),
});

export type SearchCollectionsInput = z.infer<
  typeof SearchCollectionsInputSchema
>;
export type SearchCollectionsOutput = z.infer<
  typeof SearchCollectionsOutputSchema
>;
