export type ModelProvider = "google" | "openai" | "anthropic";

export type ModelOption = {
  id: string;
  label: string;
  provider: ModelProvider;
  // Gateway slug used by the AI SDK Gateway.
  // See https://vercel.com/docs/ai-gateway/models for the current catalog.
  gateway: string;
  description?: string;
};

export const MODELS: ModelOption[] = [
  {
    id: "gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro Preview",
    provider: "google",
    gateway: "google/gemini-3.1-pro-preview",
    description: "Best overall — strongest nuance, long context",
  },
  {
    id: "gemini-3-pro-preview",
    label: "Gemini 3 Pro Preview",
    provider: "google",
    gateway: "google/gemini-3-pro-preview",
    description: "Previous flagship",
  },
  {
    id: "gemini-3.1-flash-preview",
    label: "Gemini 3.1 Flash Preview",
    provider: "google",
    gateway: "google/gemini-3.1-flash-preview",
    description: "Fast 3.1",
  },
  {
    id: "gemini-3.1-flash-lite-preview",
    label: "Gemini 3.1 Flash Lite Preview",
    provider: "google",
    gateway: "google/gemini-3.1-flash-lite-preview",
    description: "Fastest, cheapest",
  },
  {
    id: "claude-opus-4-7",
    label: "Claude Opus 4.7",
    provider: "anthropic",
    gateway: "anthropic/claude-opus-4-7",
    description: "Most literary",
  },
  {
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    provider: "anthropic",
    gateway: "anthropic/claude-sonnet-4-6",
    description: "Balanced quality / cost",
  },
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    provider: "anthropic",
    gateway: "anthropic/claude-haiku-4-5",
    description: "Fast Anthropic",
  },
  {
    id: "gpt-5",
    label: "GPT-5",
    provider: "openai",
    gateway: "openai/gpt-5",
    description: "OpenAI flagship",
  },
  {
    id: "gpt-5-mini",
    label: "GPT-5 mini",
    provider: "openai",
    gateway: "openai/gpt-5-mini",
    description: "Lighter, faster",
  },
];

export const DEFAULT_MODEL_ID = "gemini-3.1-flash-lite-preview";
export const SIMPLE_MODE_MODEL_ID = "gemini-3.1-flash-lite-preview";

export function getModel(id: string): ModelOption {
  return MODELS.find((m) => m.id === id) ?? MODELS[0];
}

export const MODELS_BY_PROVIDER: Record<ModelProvider, ModelOption[]> = {
  google: MODELS.filter((m) => m.provider === "google"),
  openai: MODELS.filter((m) => m.provider === "openai"),
  anthropic: MODELS.filter((m) => m.provider === "anthropic"),
};

export const PROVIDER_LABEL: Record<ModelProvider, string> = {
  google: "Google",
  openai: "OpenAI",
  anthropic: "Anthropic",
};
