import type { Revision } from "./db/schema";

export type CapturePayload = {
  id?: string;
  kind: "translated" | "variation" | "edit" | "restored";
  modelId?: string;
  summary?: string;
  sourceText: string;
  translatedText: string;
};

type ServerRevision = Omit<Revision, "ts"> & { ts: string };

function hydrate(r: ServerRevision): Revision {
  return { ...r, ts: new Date(r.ts) };
}

const defaultFetch: typeof fetch =
  typeof fetch !== "undefined"
    ? fetch.bind(globalThis)
    : ((() => {
        throw new Error("fetch is unavailable");
      }) as unknown as typeof fetch);

export async function listRevisions(
  documentId: string,
  fetcher: typeof fetch = defaultFetch,
): Promise<Revision[]> {
  try {
    const res = await fetcher(`/api/documents/${documentId}/revisions`);
    if (!res.ok) return [];
    const { revisions } = (await res.json()) as { revisions: ServerRevision[] };
    return revisions.map(hydrate);
  } catch {
    return [];
  }
}

export async function captureRevision(
  documentId: string,
  payload: CapturePayload,
  fetcher: typeof fetch = defaultFetch,
): Promise<Revision | null> {
  try {
    const res = await fetcher(`/api/documents/${documentId}/revisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const { revision } = (await res.json()) as { revision: ServerRevision };
    return hydrate(revision);
  } catch {
    return null;
  }
}

export async function restoreRevision(
  documentId: string,
  revisionId: string,
  fetcher: typeof fetch = defaultFetch,
): Promise<
  | {
      revision: Revision;
      document: { id: string; sourceText: string; translatedText: string };
    }
  | null
> {
  try {
    const res = await fetcher(
      `/api/documents/${documentId}/revisions/${revisionId}/restore`,
      { method: "POST" },
    );
    if (!res.ok) return null;
    const { revision, document } = (await res.json()) as {
      revision: ServerRevision;
      document: { id: string; sourceText: string; translatedText: string };
    };
    return { revision: hydrate(revision), document };
  } catch {
    return null;
  }
}

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}
