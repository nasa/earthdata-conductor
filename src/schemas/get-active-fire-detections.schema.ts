import { z } from "zod";

export const GetActiveFireDetectionsInputSchema = z.object({
  spatialArea: z
    .string()
    .optional()
    .describe(
      "Geographic region name to query (e.g. 'Asheville, NC', 'California', 'Amazon'). Automatically geocoded if bbox is omitted.",
    ),
  bbox: z
    .array(z.number())
    .length(4)
    .optional()
    .describe(
      "Bounding box coordinates [west, south, east, north] (e.g. [-83.0, 34.0, -81.0, 36.0]).",
    ),
  days: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .describe("Number of days range to query (1 to 5 days, defaults to 2)."),
  source: z
    .enum([
      "VIIRS_SNPP_NRT",
      "VIIRS_NOAA20_NRT",
      "VIIRS_NOAA21_NRT",
      "MODIS_NRT",
      "LANDSAT_NRT",
    ])
    .default("VIIRS_SNPP_NRT")
    .describe("Satellite sensor data source (defaults to VIIRS_SNPP_NRT)."),
  date: z
    .string()
    .optional()
    .describe(
      "Explicit acquisition date for historical query (YYYY-MM-DD format).",
    ),
});

export const ActiveFireDetectionItemSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  bright_ti4: z.number().optional(),
  bright_ti5: z.number().optional(),
  acq_date: z.string(),
  acq_time: z.string(),
  satellite: z.string(),
  instrument: z.string(),
  confidence: z.string(),
  frp: z.number(),
  daynight: z.string(),
});

export const GetActiveFireDetectionsOutputSchema = z.object({
  title: z.string(),
  bbox: z.array(z.number()).length(4),
  source: z.string(),
  days: z.number(),
  date: z.string().optional(),
  detectionCount: z.number(),
  detections: z.array(ActiveFireDetectionItemSchema),
  apiKeyMissing: z.boolean().optional(),
  wmsOverlay: z
    .object({
      url: z.string(),
      layers: z.string(),
      time: z.string().optional(),
    })
    .optional(),
  bearerToken: z.string().optional(),
});

export type GetActiveFireDetectionsInput = z.infer<
  typeof GetActiveFireDetectionsInputSchema
>;
export type GetActiveFireDetectionsOutput = z.infer<
  typeof GetActiveFireDetectionsOutputSchema
>;
