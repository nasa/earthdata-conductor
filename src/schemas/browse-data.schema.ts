import z from "zod";

export const BrowseDataInputSchema = z.object({
  shortName: z.string().describe("The shortname of the collection"),
  version: z
    .string()
    .optional()
    .describe("The version of the collection (defaults to latest version)"),
  spatialArea: z
    .string()
    .optional()
    .describe("The geographic area name to filter granules"),
  spatialWkt: z
    .string()
    .optional()
    .describe("The Well-Known Text (WKT) representation of the spatial area"),
  startDate: z
    .string()
    .optional()
    .describe("The start date of the time range to filter granules"),
  endDate: z
    .string()
    .optional()
    .describe("The end date of the time range to filter granules"),
});

export type BrowseDataInput = z.infer<typeof BrowseDataInputSchema>;
