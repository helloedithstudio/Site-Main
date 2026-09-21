import { NextResponse } from "next/server";
import { joinConfig } from "@/lib/join/config";
import { handleGithubCallback } from "@/lib/join/flow";
import { brand } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GitHub sends the person back here with a one-time code. We confirm they own the account, read only the public profile,
// and hand them a short-lived signed form token in the address fragment. No cookie is set.
export async function GET(req: Request) {
  const c = joinConfig();
  if (!c.ok) return NextResponse.redirect(`${brand.siteUrl}/join?status=unavailable`, 303);
  const q = new URL(req.url).searchParams;
  const r = await handleGithubCallback(c.cfg, { code: q.get("code"), state: q.get("state"), error: q.get("error") });
  return NextResponse.redirect(r.redirect, 303);
}
