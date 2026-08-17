import z from "zod";

export const GetHarmonyCapabilitiesInputSchema = z.object({
  conceptId: z
    .string()
    .describe("The collection concept ID (e.g., 'C1276812863-GES_DISC')"),
});

export const GetHarmonyCapabilitiesOutputSchema = z
  .object({
    conceptId: z.string().optional(),
    shortName: z.string().optional(),
    summary: z
      .object({
        subsetting: z
          .object({
            bbox: z.boolean().optional(),
            dimension: z.boolean().optional(),
            shape: z.boolean().optional(),
            temporal: z.boolean().optional(),
            variable: z.boolean().optional(),
          })
          .passthrough()
          .optional(),
        outputFormats: z
          .array(
            z
              .object({
                name: z.string().optional(),
                mimeType: z.string(),
              })
              .passthrough(),
          )
          .optional(),
      })
      .passthrough()
      .optional(),
    services: z.array(z.record(z.string(), z.unknown())).optional(),
    variables: z
      .array(
        z
          .object({
            name: z.string(),
            longName: z.string().optional(),
            href: z.string(),
            units: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
    error: z.string().optional(),
  })
  .passthrough();

export type GetHarmonyCapabilitiesInput = z.infer<
  typeof GetHarmonyCapabilitiesInputSchema
>;
export type GetHarmonyCapabilitiesOutput = z.infer<
  typeof GetHarmonyCapabilitiesOutputSchema
>;
