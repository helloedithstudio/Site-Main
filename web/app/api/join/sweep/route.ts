import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { joinConfig } from "@/lib/join/config";
import { runSweep } from "@/lib/join/sweep";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// The scheduled job (GitHub Actions, every ten minutes; see docs/onboarding-setup.md). Protected by CRON_SECRET.
// Add ?dry=1 to see what would happen without doing any of it.
async function handle(req: Request) {
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer /i, "");
  const c = joinConfig();
  if (!c.ok) {
    // Not set up yet. Only someone holding the secret is told which settings are missing.
    const secret = process.env.CRON_SECRET ?? "";
    const known = secret.length >= 24 && given && same(given, secret);
    return NextResponse.json(known ? { ok: false, missing: c.missing } : { ok: false }, { status: known ? 503 : 401 });
  }
  if (!given || !same(given, c.cfg.cronSecret)) return NextResponse.json({ ok: false }, { status: 401 });
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  try {
    const result = await runSweep(c.cfg, { forceDry: dry });
    return NextResponse.json({ ok: result.errors.length === 0, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "failed" }, { status: 502 });
  }
}

export const GET = handle;
export const POST = handle;
