import { sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { auth, authEnabled } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import {
  RATE_LIMIT_ERROR,
  type RateLimitTier,
  tierForModel,
} from "@/lib/rate-limit-shared";

const WINDOW_MS = 6 * 60 * 60 * 1000;
// Dev/no-DB fallback only — cap so a long-lived process can't grow unbounded.
const MEMORY_BUCKET_MAX = 2000;

type LimitSubject = {
  key: string;
  limit: number;
  scope: "user" | "ip";
};

type LimitCheck = {
  subject: LimitSubject;
  count: number;
  remaining: number;
};

export type RateLimitResult =
  | { allowed: true; tier: RateLimitTier; resetAt: Date; checks: LimitCheck[] }
  | {
      allowed: false;
      tier: RateLimitTier;
      resetAt: Date;
      retryAfter: number;
      limit: number;
      remaining: 0;
      scope: "user" | "ip";
    };

const memoryBuckets = new Map<string, { windowStart: number; count: number }>();

function limitsFor(tier: RateLimitTier) {
  return tier === "flash"
    ? { user: 240, anonymousIp: 60, signedInIp: 1000 }
    : { user: 24, anonymousIp: 8, signedInIp: 120 };
}

function currentWindow(now: number) {
  return Math.floor(now / WINDOW_MS) * WINDOW_MS;
}

function sanitizeIp(value: string | null) {
  if (!value) return "unknown";
  return value.replace(/[^a-zA-Z0-9:._-]/g, "").slice(0, 96) || "unknown";
}

function clientIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return sanitizeIp(
    forwarded ??
      req.headers.get("x-real-ip") ??
      req.headers.get("cf-connecting-ip") ??
      null,
  );
}

async function getUserId() {
  if (!authEnabled) return null;
  const session = await auth();
  return session?.user?.id ?? null;
}

async function incrementBucket(key: string, windowStart: Date) {
  const db = getDb();
  if (!db) {
    const ts = windowStart.getTime();
    const existing = memoryBuckets.get(key);
    if (!existing || existing.windowStart !== ts) {
      if (memoryBuckets.size >= MEMORY_BUCKET_MAX) {
        for (const [k, v] of memoryBuckets) {
          if (v.windowStart < ts) memoryBuckets.delete(k);
        }
        if (memoryBuckets.size >= MEMORY_BUCKET_MAX) {
          const oldest = memoryBuckets.keys().next().value;
          if (oldest) memoryBuckets.delete(oldest);
        }
      }
      memoryBuckets.set(key, { windowStart: ts, count: 1 });
      return 1;
    }
    existing.count += 1;
    return existing.count;
  }

  const [row] = await db
    .insert(schema.rateLimitBuckets)
    .values({ key, windowStart, count: 1, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: schema.rateLimitBuckets.key,
      set: {
        windowStart: sql`case when ${schema.rateLimitBuckets.windowStart} < ${windowStart} then ${windowStart} else ${schema.rateLimitBuckets.windowStart} end`,
        count: sql`case when ${schema.rateLimitBuckets.windowStart} < ${windowStart} then 1 else ${schema.rateLimitBuckets.count} + 1 end`,
        updatedAt: new Date(),
      },
    })
    .returning({ count: schema.rateLimitBuckets.count });

  return row?.count ?? 1;
}

export async function consumeRateLimit(
  req: NextRequest,
  modelId: string,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStartMs = currentWindow(now);
  const windowStart = new Date(windowStartMs);
  const resetAt = new Date(windowStartMs + WINDOW_MS);
  const retryAfter = Math.max(1, Math.ceil((resetAt.getTime() - now) / 1000));
  const tier = tierForModel(modelId);
  const limits = limitsFor(tier);
  const ip = clientIp(req);
  const userId = await getUserId();
  const subjects: LimitSubject[] = userId
    ? [
        {
          key: `model:${tier}:user:${userId}`,
          limit: limits.user,
          scope: "user",
        },
        {
          key: `model:${tier}:ip:${ip}`,
          limit: limits.signedInIp,
          scope: "ip",
        },
      ]
    : [
        {
          key: `model:${tier}:anon-ip:${ip}`,
          limit: limits.anonymousIp,
          scope: "ip",
        },
      ];

  // Increment all buckets in parallel — we charge every subject even if a peer
  // ends up rejecting the request. Over-count is at most 1 per bucket per
  // 6-hour window, which is negligible against limits of 8-1000.
  const counts = await Promise.all(
    subjects.map((s) => incrementBucket(s.key, windowStart)),
  );

  const checks: LimitCheck[] = subjects.map((subject, i) => ({
    subject,
    count: counts[i],
    remaining: Math.max(0, subject.limit - counts[i]),
  }));

  for (const check of checks) {
    if (check.count > check.subject.limit) {
      return {
        allowed: false,
        tier,
        resetAt,
        retryAfter,
        limit: check.subject.limit,
        remaining: 0,
        scope: check.subject.scope,
      };
    }
  }

  return { allowed: true, tier, resetAt, checks };
}

export function rateLimitResponse(result: Extract<RateLimitResult, { allowed: false }>) {
  return Response.json(
    {
      error: RATE_LIMIT_ERROR,
      message:
        result.tier === "flash"
          ? "You have used your Flash quota for this 6-hour window."
          : "You have used your premium-model quota for this 6-hour window.",
      tier: result.tier,
      scope: result.scope,
      limit: result.limit,
      remaining: 0,
      resetAt: result.resetAt.toISOString(),
      retryAfter: result.retryAfter,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": result.resetAt.toISOString(),
      },
    },
  );
}
