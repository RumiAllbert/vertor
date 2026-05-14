import type { UserPreset } from "./db/schema";

// Built-in presets that ship with the app. Marked with stable ids beginning
// with "default-" so the UI can render them distinctly (italic, no delete
// affordance) and clients can detect them regardless of whether the user is
// signed in.
export const DEFAULT_PRESETS: ReadonlyArray<UserPreset> = [
  {
    id: "default-british",
    name: "British",
    instruction: "Use British spelling and idioms throughout.",
    createdAt: 0,
  },
  {
    id: "default-casual",
    name: "Casual",
    instruction:
      "Keep the tone casual and conversational. Use contractions freely.",
    createdAt: 0,
  },
  {
    id: "default-names",
    name: "Keep names",
    instruction:
      "Translate place names but keep all personal names in their original form.",
    createdAt: 0,
  },
];

export function isDefaultPreset(id: string): boolean {
  return id.startsWith("default-");
}
