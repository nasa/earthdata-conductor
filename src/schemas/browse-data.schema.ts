import z from "zod";

export const BrowseDataInputSchema = z.object({
  shortName: z.string().describe("The shortname of the collection"),
  version: z
    .string()
    .optional()
    .describe("The version of the collection (defaults to latest version)"),
  // TODO: clean these up, add descriptions
  spatialArea: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type BrowseDataInput = z.infer<typeof BrowseDataInputSchema>;
