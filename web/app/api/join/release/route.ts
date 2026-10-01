import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { joinConfig } from "@/lib/join/config";
import { removeInvite } from "@/lib/join/invite";
import { removeMember } from "@/lib/join/members";
import { removePromotionData } from "@/lib/promote/store";
import { storeFor } from "@/lib/join/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// For the maintainer of the site only (CRON_SECRET): forget one person's entry, for example when they lost their Discord
// account and need to start again, or asked to be deleted. Body: { "discordId": "123456789012345678" }.
// This clears the record that stops a second entry, the member record that links their Discord id to their GitHub username,
// and their credit notes and promotion state; it does not change roles, delete their form message or take them off the
// Legion page.
export async function POST(req: Request) {
  const c = joinConfig();
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer /i, "");
  if (!c.ok || !given || !same(given, c.cfg.cronSecret)) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { discordId?: unknown };
  const id = typeof body.discordId === "string" ? body.discordId.trim() : "";
  if (!/^\d{5,25}$/.test(id)) return NextResponse.json({ ok: false, message: "discordId must be the numeric Discord user id" }, { status: 400 });
  try {
    const released = await storeFor(c.cfg).release(id);
    await removeMember(c.cfg, id);
    await removePromotionData(c.cfg, id);
    await removeInvite(c.cfg, id);
    return NextResponse.json({ ok: true, released }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "failed" }, { status: 502 });
  }
}
