import { describe, expect, it } from "vitest";
import { z } from "zod";

// Mirror of the Body schema in the route. Keep in sync.
const Body = z.object({
  docs: z
    .array(
      z.object({
        title: z.string().default("Untitled"),
        sourceText: z.string().default(""),
        translatedText: z.string().default(""),
        sourceLang: z.string().default("auto"),
        targetLang: z.string().default("en"),
        modelId: z.string().default("gemini-3.1-flash-lite-preview"),
        createdAt: z.number().optional(),
        updatedAt: z.number().optional(),
      }),
    )
    .min(1)
    .max(500),
});

describe("migrate endpoint Body schema", () => {
  it("accepts a minimal doc list", () => {
    const out = Body.safeParse({ docs: [{}] });
    expect(out.success).toBe(true);
    if (out.success) {
      expect(out.data.docs[0].title).toBe("Untitled");
      expect(out.data.docs[0].modelId).toBe("gemini-3.1-flash-lite-preview");
    }
  });

  it("rejects an empty docs array", () => {
    expect(Body.safeParse({ docs: [] }).success).toBe(false);
  });

  it("rejects more than 500 docs", () => {
    const docs = Array.from({ length: 501 }, () => ({}));
    expect(Body.safeParse({ docs }).success).toBe(false);
  });

  it("preserves explicit timestamps", () => {
    const out = Body.safeParse({ docs: [{ createdAt: 1000, updatedAt: 2000 }] });
    expect(out.success).toBe(true);
    if (out.success) {
      expect(out.data.docs[0].createdAt).toBe(1000);
      expect(out.data.docs[0].updatedAt).toBe(2000);
    }
  });
});
