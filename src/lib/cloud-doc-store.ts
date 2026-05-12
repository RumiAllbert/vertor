import type { DocStore, LocalDoc } from "./doc-store";

type ServerDoc = {
  id: string;
  title: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  modelId: string;
  createdAt: string;
  updatedAt: string;
};

function toLocalDoc(s: ServerDoc): LocalDoc {
  return {
    id: s.id,
    title: s.title,
    sourceText: s.sourceText,
    translatedText: s.translatedText,
    sourceLang: s.sourceLang,
    targetLang: s.targetLang,
    modelId: s.modelId,
    createdAt: new Date(s.createdAt).getTime(),
    updatedAt: new Date(s.updatedAt).getTime(),
  };
}

export class CloudDocStore implements DocStore {
  constructor(private fetcher: typeof fetch = fetch.bind(globalThis)) {}

  async list(): Promise<LocalDoc[]> {
    const res = await this.fetcher("/api/documents");
    if (!res.ok) return [];
    const { documents } = (await res.json()) as { documents: ServerDoc[] };
    return documents.map(toLocalDoc);
  }

  async save(doc: LocalDoc): Promise<void> {
    const patchRes = await this.fetcher(`/api/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: doc.title,
        sourceText: doc.sourceText,
        translatedText: doc.translatedText,
        sourceLang: doc.sourceLang,
        targetLang: doc.targetLang,
        modelId: doc.modelId,
      }),
    });
    if (patchRes.status === 404 || patchRes.status === 401) {
      // Include the client id so the server creates the row with the same
      // identifier the client is tracking — subsequent PATCH calls will hit.
      await this.fetcher("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: doc.id,
          title: doc.title,
          sourceText: doc.sourceText,
          translatedText: doc.translatedText,
          sourceLang: doc.sourceLang,
          targetLang: doc.targetLang,
          modelId: doc.modelId,
        }),
      });
    }
  }

  async remove(id: string): Promise<void> {
    await this.fetcher(`/api/documents/${id}`, { method: "DELETE" });
  }
}
