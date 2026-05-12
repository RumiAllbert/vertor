import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { getModel, type ModelOption } from "./models";

/*
 * resolveModel — returns an AI SDK LanguageModel for a given model id.
 *
 * Strategy: prefer the direct provider API when its key is set (cheaper, free
 * tier on Google AI Studio, faster path, no Gateway markup). Fall back to the
 * Vercel AI Gateway string when only AI_GATEWAY_API_KEY is configured.
 *
 * This means a user can set GOOGLE_GENERATIVE_AI_API_KEY alone and every
 * Google model works without ever touching the Gateway.
 */
export function resolveModel(modelId: string): LanguageModel | string {
  const model: ModelOption = getModel(modelId);

  if (model.provider === "google" && process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });
    return google(model.id);
  }

  if (model.provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    return anthropic(model.id);
  }

  if (model.provider === "openai" && process.env.OPENAI_API_KEY) {
    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    return openai(model.id);
  }

  // Fallback: the AI SDK treats a plain "provider/model" string as a Gateway
  // request. Requires AI_GATEWAY_API_KEY to be set in the environment.
  return model.gateway;
}
