import { NextResponse } from "next/server";
import { auditChannels, auditText } from "@/lib/join/audit";
import { cronAuthorised } from "@/lib/join/cron";
import { discord } from "@/lib/join/discord";
import { promoteConfig } from "@/lib/promote/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

// For the maintainer of the site only (CRON_SECRET), read only: lists every channel in the Discord server and whether a person
// with no roles, a Pending member, a Catalyst and a Maintainer can see it, then flags anything that looks wrong (for example a
// Maintainer channel a Catalyst can see). Add ?format=text for a table you can read in a terminal. It changes nothing.
async function handle(req: Request) {
  const c = promoteConfig();
  const secret = process.env.CRON_SECRET ?? "";
  if (!cronAuthorised(req, secret)) return NextResponse.json({ ok: false }, { status: 401 });
  if (!c.ok) return NextResponse.json({ ok: false, missing: c.missing }, { status: 503 });
  try {
    const d = discord(c.cfg);
    const [channels, roles] = await Promise.all([d.listChannels(), d.listRoles()]);
    const audit = auditChannels(
      channels,
      roles,
      [
        { name: "No role", roleIds: [] },
        { name: "Pending", roleIds: [c.cfg.rolePending] },
        { name: "Catalyst", roleIds: [c.cfg.roleCatalyst] },
        { name: "Maintainer", roleIds: [c.cfg.roleCatalyst, c.cfg.roleMaintainer] },
      ],
      c.cfg.guildId, // the @everyone role's id is the server's id
    );
    if (new URL(req.url).searchParams.get("format") === "text") return new NextResponse(auditText(audit) + "\n", { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
    return NextResponse.json({ ok: audit.problems.length === 0, ...audit }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "failed" }, { status: 502 });
  }
}

export const GET = handle;
export const POST = handle;
