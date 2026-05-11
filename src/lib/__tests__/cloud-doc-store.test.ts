import { describe, expect, it, vi } from "vitest";
import { CloudDocStore } from "../cloud-doc-store";
import { newLocalDoc } from "../doc-store";

function mockFetcher(impl: (url: string, init?: RequestInit) => Response) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    impl(typeof input === "string" ? input : input.toString(), init),
  ) as unknown as typeof fetch;
}

describe("CloudDocStore", () => {
  it("lists docs from /api/documents", async () => {
    const fetcher = mockFetcher(() =>
      new Response(
        JSON.stringify({
          documents: [
            {
              id: "x",
              title: "T",
              sourceText: "s",
              translatedText: "t",
              sourceLang: "auto",
              targetLang: "en",
              modelId: "m",
              createdAt: "2026-01-01T00:00:00Z",
              updatedAt: "2026-01-02T00:00:00Z",
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const store = new CloudDocStore(fetcher);
    const docs = await store.list();
    expect(docs).toHaveLength(1);
    expect(docs[0].id).toBe("x");
    expect(docs[0].updatedAt).toBe(new Date("2026-01-02T00:00:00Z").getTime());
  });

  it("returns empty list when API fails", async () => {
    const fetcher = mockFetcher(() => new Response(null, { status: 500 }));
    const store = new CloudDocStore(fetcher);
    expect(await store.list()).toEqual([]);
  });

  it("save: PATCH first; on 404 falls back to POST", async () => {
    const calls: { url: string; method?: string }[] = [];
    const fetcher = mockFetcher((url, init) => {
      calls.push({ url, method: init?.method });
      if (init?.method === "PATCH") return new Response(null, { status: 404 });
      return new Response(JSON.stringify({ document: { id: "x" } }), { status: 200 });
    });
    const store = new CloudDocStore(fetcher);
    await store.save(newLocalDoc({ id: "missing" }));
    expect(calls.map((c) => c.method)).toEqual(["PATCH", "POST"]);
  });

  it("save: PATCH success does not POST", async () => {
    const calls: { method?: string }[] = [];
    const fetcher = mockFetcher((_, init) => {
      calls.push({ method: init?.method });
      return new Response(null, { status: 200 });
    });
    const store = new CloudDocStore(fetcher);
    await store.save(newLocalDoc());
    expect(calls.map((c) => c.method)).toEqual(["PATCH"]);
  });

  it("remove DELETEs the doc", async () => {
    const calls: { url: string; method?: string }[] = [];
    const fetcher = mockFetcher((url, init) => {
      calls.push({ url, method: init?.method });
      return new Response(null, { status: 200 });
    });
    const store = new CloudDocStore(fetcher);
    await store.remove("abc");
    expect(calls).toEqual([{ url: "/api/documents/abc", method: "DELETE" }]);
  });
});
