import z from "zod";

export const SearchCollectionsInputSchema = z.object({
  keyword: z
    .string()
    .describe(
      "The search term or topic (e.g., 'precipitation', 'soil moisture', 'sea surface temperature')",
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

export type SearchCollectionsInput = z.infer<
  typeof SearchCollectionsInputSchema
>;
