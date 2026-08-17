import z from "zod";

export const GetHarmonyCapabilitiesInputSchema = z.object({
  conceptId: z
    .string()
    .describe("The collection concept ID (e.g., 'C1276812863-GES_DISC')"),
});

export type GetHarmonyCapabilitiesInput = z.infer<
  typeof GetHarmonyCapabilitiesInputSchema
>;
