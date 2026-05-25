import { getModel } from "@/lib/models";

export const RATE_LIMIT_ERROR = "rate_limit_exceeded";

export type RateLimitTier = "flash" | "premium";

export type RateLimitPayload = {
  error: typeof RATE_LIMIT_ERROR;
  message?: string;
  tier?: RateLimitTier;
  resetAt?: string;
  retryAfter?: number;
};

export function tierForModel(modelId: string): RateLimitTier {
  const model = getModel(modelId);
  return model.provider === "google" && model.id.includes("flash")
    ? "flash"
    : "premium";
}

export async function readRateLimitPayload(
  res: Response,
): Promise<RateLimitPayload | null> {
  try {
    const payload = (await res.json()) as RateLimitPayload;
    return payload?.error === RATE_LIMIT_ERROR ? payload : null;
  } catch {
    return null;
  }
}
