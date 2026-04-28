// In-memory token-bucket rate limiter (per-isolate).
// NOTE: Each edge isolate keeps its own bucket map; this is best-effort.
// For strong limits use the database. Available but not auto-applied.
//
// Usage:
//   import { rateLimit } from "../_shared/rate-limit.ts";
//   const key = userId ?? req.headers.get("x-forwarded-for") ?? "anon";
//   const r = rateLimit(key, { limit: 30, windowMs: 60_000 });
//   if (!r.allowed) return new Response("Too Many Requests", { status: 429, headers: { "Retry-After": String(r.retryAfter) } });

interface Bucket {
  count: number;
  resetAt: number;
}

const BUCKETS = new Map<string, Bucket>();

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number; // seconds
}

export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const b = BUCKETS.get(key);
  if (!b || b.resetAt <= now) {
    BUCKETS.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { allowed: true, remaining: opts.limit - 1, retryAfter: 0 };
  }
  if (b.count >= opts.limit) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { allowed: true, remaining: opts.limit - b.count, retryAfter: 0 };
}

// Periodic cleanup to avoid leaks in long-running isolates
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of BUCKETS.entries()) {
    if (v.resetAt <= now) BUCKETS.delete(k);
  }
}, 60_000);
