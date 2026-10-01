import { NextResponse } from "next/server";
import { cronAuthorised } from "@/lib/join/cron";
import { discord } from "@/lib/join/discord";
import { commandDefs } from "@/lib/promote/commands";
import { promoteConfig } from "@/lib/promote/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// For the maintainer of the site only (CRON_SECRET). Run it once, and again whenever lib/promote/commands.ts changes: it tells
// Discord which slash commands Friday has in the edith server (/promote, /demote, /credit, /list, /unlist). It replaces the
// list each time, so running it twice does no harm.
export async function POST(req: Request) {
  const c = promoteConfig();
  const secret = process.env.CRON_SECRET ?? "";
  if (!cronAuthorised(req, secret)) return NextResponse.json({ ok: false }, { status: 401 });
  if (!c.ok) return NextResponse.json({ ok: false, missing: c.missing }, { status: 503 });
  try {
    await discord(c.cfg).registerCommands(commandDefs);
    return NextResponse.json({ ok: true, commands: commandDefs.map((d) => d.name) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "failed" }, { status: 502 });
  }
}
