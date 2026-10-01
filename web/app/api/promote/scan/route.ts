import { NextResponse } from "next/server";
import { cronAuthorised } from "@/lib/join/cron";
import { discord } from "@/lib/join/discord";
import { withLock } from "@/lib/join/lock";
import { upstash } from "@/lib/join/store";
import { scanNominations } from "@/lib/promote/actions";
import { promoteConfig } from "@/lib/promote/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Run once a day by a timer (a second QStash schedule, see docs/onboarding-setup.md, "Promotion"). Friday looks at every
// recorded Catalyst and posts a nomination, with Promote and Not yet buttons, for those who qualify. Protected by CRON_SECRET.
// Add ?dry=1 to see who would be nominated without posting anything.
async function handle(req: Request) {
  const c = promoteConfig();
  const secret = process.env.CRON_SECRET ?? "";
  if (!cronAuthorised(req, secret)) return NextResponse.json({ ok: false }, { status: 401 });
  if (!c.ok) return NextResponse.json({ ok: false, missing: c.missing }, { status: 503 });
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  try {
    const run = () => scanNominations(c.cfg, discord(c.cfg), { dry });
    // A dry run posts nothing, so it needs no lock; a live one takes it so two scans can never nominate the same person twice.
    const out = dry ? { ran: true as const, value: await run() } : await withLock(upstash(c.cfg), "promote-scan", 120, run, { failOpen: true });
    if (!out.ran) return NextResponse.json({ ok: true, ran: false, note: "Another scan is already running." });
    return NextResponse.json({ ok: out.value.errors.length === 0, ran: true, ...out.value }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "failed" }, { status: 502 });
  }
}

export const GET = handle;
export const POST = handle;
