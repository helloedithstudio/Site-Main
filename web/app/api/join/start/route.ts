import { NextResponse } from "next/server";
import { joinConfig } from "@/lib/join/config";
import { startUrl } from "@/lib/join/flow";
import { brand } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Sends the person to Discord to sign in (identify only). If the join system is not switched on yet, back to the form page.
export function GET() {
  const c = joinConfig();
  if (!c.ok) return NextResponse.redirect(`${brand.siteUrl}/join?status=unavailable`, 303);
  return NextResponse.redirect(startUrl(c.cfg), 303);
}
