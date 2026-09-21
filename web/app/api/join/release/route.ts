import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { joinConfig } from "@/lib/join/config";
import { storeFor } from "@/lib/join/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// For the maintainer of the site only (CRON_SECRET): forget one person's entry, for example when they lost their Discord
// account and need to start again, or asked to be deleted. Body: { "discordId": "123456789012345678" }.
// This only clears the record that stops a second entry; it does not change roles or delete their form message.
export async function POST(req: Request) {
  const c = joinConfig();
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer /i, "");
  if (!c.ok || !given || !same(given, c.cfg.cronSecret)) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { discordId?: unknown };
  const id = typeof body.discordId === "string" ? body.discordId.trim() : "";
  if (!/^\d{5,25}$/.test(id)) return NextResponse.json({ ok: false, message: "discordId must be the numeric Discord user id" }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, released: await storeFor(c.cfg).release(id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "failed" }, { status: 502 });
  }
}
