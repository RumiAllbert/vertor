import { nanoid } from "nanoid";

export type LocalDoc = {
  id: string;
  title: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  modelId: string;
  createdAt: number;
  updatedAt: number;
};

export interface DocStore {
  list(): Promise<LocalDoc[]>;
  save(doc: LocalDoc): Promise<void>;
  remove(id: string): Promise<void>;
}

const KEY = "vertor.docs.v1";

export class LocalDocStore implements DocStore {
  async list(): Promise<LocalDoc[]> {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as LocalDoc[];
      return Array.isArray(parsed) ? parsed.sort((a, b) => b.updatedAt - a.updatedAt) : [];
    } catch {
      return [];
    }
  }

  async save(doc: LocalDoc): Promise<void> {
    if (typeof window === "undefined") return;
    const all = await this.list();
    const idx = all.findIndex((d) => d.id === doc.id);
    if (idx >= 0) all[idx] = doc;
    else all.unshift(doc);
    localStorage.setItem(KEY, JSON.stringify(all));
  }

  async remove(id: string): Promise<void> {
    if (typeof window === "undefined") return;
    const remaining = (await this.list()).filter((d) => d.id !== id);
    localStorage.setItem(KEY, JSON.stringify(remaining));
  }
}

export function newLocalDoc(partial?: Partial<LocalDoc>): LocalDoc {
  const now = Date.now();
  return {
    id: nanoid(),
    title: "Untitled",
    sourceText: "",
    translatedText: "",
    sourceLang: "auto",
    targetLang: "en",
    modelId: "gemini-3.1-flash-lite-preview",
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function deriveTitle(source: string): string {
  const firstLine = source.split(/\n/).find((l) => l.trim().length > 0);
  if (!firstLine) return "Untitled";
  const trimmed = firstLine.trim().replace(/^#+\s*/, "");
  return trimmed.length > 60 ? trimmed.slice(0, 57) + "…" : trimmed;
}
