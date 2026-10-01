import { NextResponse } from "next/server";
import { joinConfig } from "@/lib/join/config";
import { cronAuthorised } from "@/lib/join/cron";
import { discord } from "@/lib/join/discord";
import { inviteProfiles } from "@/lib/join/invite";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// For the maintainer of the site only (CRON_SECRET): invites Catalysts who were already in the server, and have no Legion
// profile yet, to set one up. By default it only LISTS who would be messaged and sends nothing. To send, repeat the request
// with send=1 and expect=<the number the dry run showed>. See docs/onboarding-setup.md, "Looking after it".
export async function POST(req: Request) {
  const c = joinConfig();
  if (!c.ok || !cronAuthorised(req, c.cfg.cronSecret)) return NextResponse.json({ ok: false }, { status: 401 });
  const q = new URL(req.url).searchParams;
  const send = q.get("send") === "1";
  const expectRaw = q.get("expect");
  const expect = expectRaw !== null && /^\d{1,4}$/.test(expectRaw) ? Number(expectRaw) : undefined;
  try {
    const result = await inviteProfiles(c.cfg, discord(c.cfg), { send, expect });
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "failed" }, { status: 502 });
  }
}
