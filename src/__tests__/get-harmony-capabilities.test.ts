import { describe, expect, it } from "vitest";
import { GetHarmonyCapabilitiesInputSchema } from "../schemas/get-harmony-capabilities.schema.js";

describe("GetHarmonyCapabilities Input Schema", () => {
  it("should validate a correct input with conceptId", () => {
    const input = { conceptId: "C1276812863-GES_DISC" };
    const parsed = GetHarmonyCapabilitiesInputSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.conceptId).toBe("C1276812863-GES_DISC");
    }
  });

  it("should reject empty inputs or missing conceptId", () => {
    const input = {};
    const parsed = GetHarmonyCapabilitiesInputSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });

  it("should reject non-string inputs for conceptId", () => {
    const input = { conceptId: 12345 };
    const parsed = GetHarmonyCapabilitiesInputSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });
});
