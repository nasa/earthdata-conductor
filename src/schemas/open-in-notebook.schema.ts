import z from "zod";

export const OpenInNotebookInputSchema = z.object({
  collection: z
    .string()
    .optional()
    .describe("Optional collection shortname or concept ID override"),
  shortName: z.string().optional().describe("Optional shortname override"),
  spatialArea: z.string().optional().describe("Optional spatial area name"),
  startDate: z.string().optional().describe("Optional start date filter"),
  endDate: z.string().optional().describe("Optional end date filter"),
  variable: z.string().optional().describe("Optional variable name"),
});

export const OpenInNotebookOutputSchema = z
  .object({
    marimoUrl: z.string().describe("The generated interactive notebook URL"),
    pythonCode: z.string().describe("The raw generated Marimo Python code"),
    stepCount: z.number().describe("Number of session steps included"),
  })
  .passthrough();

export type OpenInNotebookInput = z.infer<typeof OpenInNotebookInputSchema>;
export type OpenInNotebookOutput = z.infer<typeof OpenInNotebookOutputSchema>;
