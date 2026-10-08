// POST /api/catalyst — Catalyst registration endpoint.
//
// Security checklist:
//   ✓ Server-side validation via shared schema (same as client)
//   ✓ Input length limits on every field (enforced in schema.ts clean())
//   ✓ Honeypot field rejects bots silently
//   ✓ Duplicate Discord ID → 409 (via DuplicateError from the store, or Postgres 23505 via Supabase)
//   ✓ Per-IP rate limiting (in-memory LRU, resets on redeploy — adequate for a low-traffic form)
//   ✓ Body size cap (8 KB)
//   ✓ No sensitive data logged
//   ✓ Portfolio URL never rendered as raw HTML (stored only)
//   ✓ Optional Discord webhook notification behind CATALYST_WEBHOOK_URL feature flag

import { NextResponse } from "next/server";
import { validateCatalyst } from "@/lib/catalyst/schema";
import { getCatalystStore, DuplicateError } from "@/lib/catalyst/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BODY = 8_000; // bytes

// ---------------------------------------------------------------------------
// In-memory rate limiter — max RATE_LIMIT_MAX requests per RATE_LIMIT_WINDOW ms per IP.
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 5;

type RateBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  let bucket = rateBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
    rateBuckets.set(ip, bucket);
  }
  bucket.count += 1;
  if (rateBuckets.size > 2_000) {
    for (const [k, v] of rateBuckets) {
      if (now > v.resetAt) rateBuckets.delete(k);
    }
  }
  return bucket.count > RATE_LIMIT_MAX;
}

// ---------------------------------------------------------------------------
// Discord webhook notification (optional, behind CATALYST_WEBHOOK_URL)
// ---------------------------------------------------------------------------
async function notifyWebhook(record: {
  name: string;
  discordId: string;
  githubId: string;
  xId: string;
  linkedinId: string;
  portfolioUrl: string;
  createdAt: string;
}) {
  const url = process.env.CATALYST_WEBHOOK_URL?.trim();
  if (!url) return;
  try {
    const lines = [
      `**New Catalyst registered** · ${record.createdAt}`,
      `**Name:** ${record.name}`,
      `**Discord:** ${record.discordId}`,
      `**GitHub:** https://github.com/${encodeURIComponent(record.githubId)}`,
      `**X:** https://x.com/${encodeURIComponent(record.xId)}`,
      `**LinkedIn:** https://linkedin.com/in/${encodeURIComponent(record.linkedinId)}`,
      `**Portfolio:** ${record.portfolioUrl}`,
    ];
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: lines.join("\n") }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    console.warn("[catalyst] Discord webhook delivery failed");
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { success: false, message: "Too many requests. Please wait a minute and try again." },
      { status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" } },
    );
  }

  // ── Body ───────────────────────────────────────────────────────────────────
  const text = await req.text();
  if (text.length > MAX_BODY) {
    return NextResponse.json(
      { success: false, message: "Request body too large." },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  const result = validateCatalyst(raw as Record<string, unknown>);
  if (!result.ok) {
    return NextResponse.json(
      { success: false, message: "Please fix the highlighted fields.", errors: result.errors },
      { status: 422, headers: { "Cache-Control": "no-store" } },
    );
  }

  const payload = result.value;

  // ── Initialise store ───────────────────────────────────────────────────────
  let store;
  try {
    store = getCatalystStore();
  } catch (e) {
    console.error("[catalyst] store init failed:", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { success: false, message: "Service temporarily unavailable. Please try again." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  // ── Persist (duplicate detection is inside save()) ─────────────────────────
  // The Supabase adapter relies on the unique constraint on discord_id and throws DuplicateError
  // on Postgres error 23505, so there is no separate read-before-write round trip.
  // The Upstash and JSON adapters also throw DuplicateError on conflict.
  let record;
  try {
    record = await store.save(payload);
  } catch (e) {
    if (e instanceof DuplicateError) {
      return NextResponse.json(
        {
          success: false,
          message: "This Discord ID is already registered as a Catalyst.",
          errors: { discordId: "This Discord ID is already registered as a Catalyst." },
        },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("[catalyst] save failed:", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { success: false, message: "Could not save your registration. Please try again." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  // ── Webhook (fire-and-forget) ──────────────────────────────────────────────
  void notifyWebhook(record);

  return NextResponse.json(
    { success: true, message: "You are now a Catalyst." },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
