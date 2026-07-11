import z from "zod";

export const CreateHarmonyJobInputSchema = z.object({
  conceptId: z
    .string()
    .describe("The collection concept ID (e.g., 'C1276812863-GES_DISC')"),
  variableEntryId: z
    .string()
    .describe("The variable concept ID (e.g., 'V2296950155-GES_DISC')"),
  boundingBox: z
    .array(z.number())
    .min(4)
    .max(4)
    .optional()
    .describe(
      "Bounding box bounds formatted as [minLon, minLat, maxLon, maxLat]",
    ),
  startDate: z
    .string()
    .optional()
    .describe("The start date of the subsetting period (ISO format)"),
  endDate: z
    .string()
    .optional()
    .describe("The end date of the subsetting period (ISO format)"),
  format: z
    .string()
    .optional()
    .default("application/netcdf")
    .describe("The output format (e.g., 'application/netcdf')"),
});

export type CreateHarmonyJobInput = z.infer<typeof CreateHarmonyJobInputSchema>;
