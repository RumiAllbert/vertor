import { describe, expect, it, vi } from "vitest";
import { captureRevision, listRevisions, restoreRevision } from "../revisions";

function mockFetcher(impl: (url: string, init?: RequestInit) => Response) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    impl(typeof input === "string" ? input : input.toString(), init),
  ) as unknown as typeof fetch;
}

describe("listRevisions", () => {
  it("GETs the revisions endpoint and returns the array", async () => {
    const fetcher = mockFetcher((url) => {
      expect(url).toBe("/api/documents/doc1/revisions");
      return new Response(
        JSON.stringify({
          revisions: [
            {
              id: "r1",
              documentId: "doc1",
              userId: "u1",
              kind: "translated",
              modelId: "gemini-3.1-pro-preview",
              summary: null,
              sourceText: "Bonjour",
              translatedText: "Hello",
              ts: "2026-05-12T10:00:00Z",
            },
          ],
        }),
        { status: 200 },
      );
    });
    const out = await listRevisions("doc1", fetcher);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("r1");
    expect(out[0].ts).toBeInstanceOf(Date);
  });

  it("returns empty array on non-OK response", async () => {
    const fetcher = mockFetcher(() => new Response(null, { status: 500 }));
    expect(await listRevisions("doc1", fetcher)).toEqual([]);
  });
});

describe("captureRevision", () => {
  it("POSTs the revision payload and returns the created row", async () => {
    const fetcher = mockFetcher((url, init) => {
      expect(url).toBe("/api/documents/doc1/revisions");
      expect(init?.method).toBe("POST");
      const body = JSON.parse(init!.body as string);
      expect(body.kind).toBe("translated");
      expect(body.modelId).toBe("gemini-3.1-pro-preview");
      return new Response(
        JSON.stringify({
          revision: {
            id: "r2",
            documentId: "doc1",
            userId: "u1",
            kind: "translated",
            modelId: "gemini-3.1-pro-preview",
            summary: null,
            sourceText: "Bonjour",
            translatedText: "Hello",
            ts: "2026-05-12T10:00:00Z",
          },
        }),
        { status: 200 },
      );
    });
    const out = await captureRevision(
      "doc1",
      {
        kind: "translated",
        modelId: "gemini-3.1-pro-preview",
        sourceText: "Bonjour",
        translatedText: "Hello",
      },
      fetcher,
    );
    expect(out?.id).toBe("r2");
  });

  it("returns null on capture failure (no throw)", async () => {
    const fetcher = mockFetcher(() => new Response("oops", { status: 500 }));
    const out = await captureRevision(
      "doc1",
      { kind: "edit", sourceText: "a", translatedText: "b" },
      fetcher,
    );
    expect(out).toBeNull();
  });
});

describe("restoreRevision", () => {
  it("POSTs to /restore and returns revision + document", async () => {
    const fetcher = mockFetcher((url, init) => {
      expect(url).toBe("/api/documents/doc1/revisions/r1/restore");
      expect(init?.method).toBe("POST");
      return new Response(
        JSON.stringify({
          revision: {
            id: "r-new",
            documentId: "doc1",
            userId: "u1",
            kind: "restored",
            modelId: null,
            summary: "Restored from May 12, 10:00 AM",
            sourceText: "old src",
            translatedText: "old text",
            ts: "2026-05-12T11:00:00Z",
          },
          document: {
            id: "doc1",
            sourceText: "old src",
            translatedText: "old text",
          },
        }),
        { status: 200 },
      );
    });
    const out = await restoreRevision("doc1", "r1", fetcher);
    expect(out?.revision.id).toBe("r-new");
    expect(out?.document.translatedText).toBe("old text");
  });

  it("returns null on failure", async () => {
    const fetcher = mockFetcher(() => new Response(null, { status: 404 }));
    expect(await restoreRevision("doc1", "r1", fetcher)).toBeNull();
  });
});
