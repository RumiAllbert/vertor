import type { UserInstructionValue, UserPreset } from "./db/schema";

export type { UserInstructionValue, UserPreset };

export interface InstructionStore {
  get(): Promise<UserInstructionValue>;
  setCurrent(text: string): Promise<void>;
  setPresets(presets: UserPreset[]): Promise<void>;
}

const KEY = "vertor.instruction.v1";

const EMPTY: UserInstructionValue = { current: "", presets: [] };

export class LocalInstructionStore implements InstructionStore {
  async get(): Promise<UserInstructionValue> {
    if (typeof window === "undefined") return EMPTY;
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return EMPTY;
      const parsed = JSON.parse(raw) as Partial<UserInstructionValue>;
      return {
        current: typeof parsed.current === "string" ? parsed.current : "",
        presets: Array.isArray(parsed.presets) ? parsed.presets : [],
      };
    } catch {
      return EMPTY;
    }
  }

  async setCurrent(text: string): Promise<void> {
    if (typeof window === "undefined") return;
    const all = await this.get();
    localStorage.setItem(KEY, JSON.stringify({ ...all, current: text }));
  }

  async setPresets(presets: UserPreset[]): Promise<void> {
    if (typeof window === "undefined") return;
    const all = await this.get();
    localStorage.setItem(KEY, JSON.stringify({ ...all, presets }));
  }
}

export class CloudInstructionStore implements InstructionStore {
  constructor(private fetcher: typeof fetch = fetch.bind(globalThis)) {}

  async get(): Promise<UserInstructionValue> {
    try {
      const res = await this.fetcher("/api/user/instruction");
      if (!res.ok) return EMPTY;
      const data = (await res.json()) as Partial<UserInstructionValue>;
      return {
        current: typeof data.current === "string" ? data.current : "",
        presets: Array.isArray(data.presets) ? data.presets : [],
      };
    } catch {
      return EMPTY;
    }
  }

  async setCurrent(text: string): Promise<void> {
    await this.fetcher("/api/user/instruction", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current: text }),
    });
  }

  async setPresets(presets: UserPreset[]): Promise<void> {
    await this.fetcher("/api/user/instruction", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ presets }),
    });
  }
}
