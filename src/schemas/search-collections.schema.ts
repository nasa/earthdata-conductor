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

export const SearchCollectionsOutputSchema = z
  .object({
    query: z
      .object({
        keyword: z.string().optional(),
        spatialArea: z.string().optional(),
        spatialWkt: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
      .passthrough()
      .optional(),
    collections: z.array(z.record(z.string(), z.unknown())).optional(),
    error: z.string().optional(),
  })
  .passthrough();

export type SearchCollectionsInput = z.infer<
  typeof SearchCollectionsInputSchema
>;
export type SearchCollectionsOutput = z.infer<
  typeof SearchCollectionsOutputSchema
>;
