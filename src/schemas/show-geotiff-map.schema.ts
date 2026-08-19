import { z } from "zod";

export const ShowGeotiffMapInputSchema = z.object({
  url: z
    .string()
    .url()
    .describe("URL to a GeoTIFF or Cloud-Optimized GeoTIFF (COG) file"),
  title: z
    .string()
    .optional()
    .describe("Optional display title for the map view"),
  bbox: z
    .array(z.number())
    .length(4)
    .optional()
    .describe("Optional bounding box coordinates [west, south, east, north]"),
  colormap: z
    .string()
    .optional()
    .describe("Optional colormap palette or preset name"),
  bands: z
    .array(z.number())
    .optional()
    .describe("Optional band indices to render"),
});

export const ShowGeotiffMapOutputSchema = z.object({
  url: z.string(),
  title: z.string().optional(),
  bbox: z.array(z.number()).length(4).optional(),
  colormap: z.string().optional(),
  bands: z.array(z.number()).optional(),
  bearerToken: z.string().optional(),
});

export type ShowGeotiffMapInput = z.infer<typeof ShowGeotiffMapInputSchema>;
export type ShowGeotiffMapOutput = z.infer<typeof ShowGeotiffMapOutputSchema>;
