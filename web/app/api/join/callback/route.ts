import { NextResponse } from "next/server";
import { joinConfig } from "@/lib/join/config";
import { handleCallback } from "@/lib/join/flow";
import { brand } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Discord sends the person back here with a one-time code. We check the signed state, ask Discord who they are, and
// hand them a short-lived signed form token in the address fragment. Nothing is stored and no cookie is set.
export async function GET(req: Request) {
  const c = joinConfig();
  if (!c.ok) return NextResponse.redirect(`${brand.siteUrl}/join?status=unavailable`, 303);
  const q = new URL(req.url).searchParams;
  const r = await handleCallback(c.cfg, { code: q.get("code"), state: q.get("state"), error: q.get("error") });
  return NextResponse.redirect(r.redirect, 303);
}
