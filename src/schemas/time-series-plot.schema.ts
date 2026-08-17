import z from "zod";

export const TimeSeriesPlotInputSchema = z.object({
  collection: z
    .string()
    .describe(
      "The collection short_name with version (e.g. 'GPM_3IMERGHH_07' or 'M2T1NXAER_5_12_4')",
    ),
  variable: z
    .string()
    .describe(
      "The variable parameter name to plot (e.g., 'precipitation' or 'BCCMASS')",
    ),
  startDate: z.string().describe("The start date in MM/DD/YYYY format"),
  endDate: z.string().describe("The end date in MM/DD/YYYY format"),
  location: z
    .string()
    .describe(
      "Bounding box coordinate bounds formatted as 'minLon,minLat,maxLon,maxLat'",
    ),
});

export type TimeSeriesPlotInput = z.infer<typeof TimeSeriesPlotInputSchema>;
