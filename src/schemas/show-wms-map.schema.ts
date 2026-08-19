import { z } from "zod";

export const ShowWmsMapInputSchema = z.object({
  wmsUrl: z
    .string()
    .url()
    .describe(
      "WMS endpoint URL (e.g. 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi')",
    ),
  layers: z
    .string()
    .describe(
      "Comma-separated WMS layer name(s) to render (e.g. 'MODIS_Terra_CorrectedReflectance_TrueColor')",
    ),
  title: z
    .string()
    .optional()
    .describe("Optional display title for the map view"),
  bbox: z
    .array(z.number())
    .length(4)
    .optional()
    .describe("Optional bounding box coordinates [west, south, east, north]"),
  time: z
    .string()
    .optional()
    .describe(
      "Optional time parameter for time-enabled WMS layers (YYYY-MM-DD)",
    ),
  styles: z.string().optional().describe("Optional WMS styles parameter"),
  format: z
    .string()
    .default("image/png")
    .describe("WMS image format (default 'image/png')"),
  transparent: z
    .boolean()
    .default(true)
    .describe("Whether WMS image background is transparent (default true)"),
});

export const ShowWmsMapOutputSchema = z.object({
  wmsUrl: z.string(),
  layers: z.string(),
  title: z.string().optional(),
  bbox: z.array(z.number()).length(4).optional(),
  time: z.string().optional(),
  styles: z.string().optional(),
  format: z.string(),
  transparent: z.boolean(),
  bearerToken: z.string().optional(),
});

export type ShowWmsMapInput = z.infer<typeof ShowWmsMapInputSchema>;
export type ShowWmsMapOutput = z.infer<typeof ShowWmsMapOutputSchema>;
