import { languageName } from "./languages";

export function translationSystem(targetLang: string, instruction?: string) {
  const base = [
    `You are a professional literary translator working for editors and writers.`,
    `Translate the user's text into ${languageName(targetLang)}.`,
    `Preserve the author's voice, tone, register, and rhythm.`,
    `Preserve paragraph breaks exactly. Do not add or remove paragraphs.`,
    `Preserve markdown, code, citations, numbers, and proper nouns unless translation is required.`,
    `Translate idioms naturally; do not calque.`,
    `Do not add commentary, notes, prefaces, or quotation marks around the result.`,
    `Output ONLY the translation as plain text.`,
  ];
  if (instruction?.trim()) {
    base.push(`Additional instructions from the user (apply throughout): ${instruction.trim()}`);
  }
  return base.join("\n");
}

export function titleSystem() {
  return [
    "Generate a short, evocative title for the following text.",
    "The title MUST be in the same language as the text itself.",
    "Maximum 6 words. No quotation marks, no trailing punctuation.",
    "Title-case for English; sentence-case for other languages.",
    "If the text is too short or fragmentary to title, return: Untitled",
    "Return ONLY the title — no commentary, no prefix, no quotes.",
  ].join("\n");
}

export function detectionSystem() {
  return [
    `Identify the language of the input.`,
    `Reply with ONLY a BCP-47 language code (e.g. "en", "es", "zh", "pt-br"). No prose.`,
  ].join("\n");
}

export type VariationKind = "word" | "phrase" | "paragraph" | "document";

export function variationsSystem(opts: {
  kind: VariationKind;
  sourceLang: string;
  targetLang: string;
  instruction?: string;
}) {
  const target = languageName(opts.targetLang);
  const source = opts.sourceLang === "auto" ? "the source text" : languageName(opts.sourceLang);
  const subject =
    opts.kind === "word"
      ? "single word"
      : opts.kind === "phrase"
        ? "phrase or sentence"
        : opts.kind === "paragraph"
          ? "paragraph"
          : "full text";
  const lines = [
    `You are a literary translator producing alternative renderings.`,
    `The source is in ${source}. The target language is ${target}.`,
    `Given a ${subject} from the current translation and the surrounding source/translation context, produce three meaningfully different alternatives.`,
    `Each alternative should be high-quality, natural ${target}, faithful to the original meaning.`,
    `Vary tone, register, syntax, or word choice — not just synonyms.`,
    `Each alternative should fit grammatically into the surrounding translation.`,
    `Return ONLY the alternatives. No commentary, no numbering, no quotes.`,
  ];
  if (opts.instruction?.trim()) {
    lines.push(`Additional user instruction: ${opts.instruction.trim()}`);
  }
  return lines.join("\n");
}
