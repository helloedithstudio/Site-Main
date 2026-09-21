import { NextResponse } from "next/server";
import { joinConfig } from "@/lib/join/config";
import { handleSubmit } from "@/lib/join/flow";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BODY = 8_000;

export async function POST(req: Request) {
  const c = joinConfig();
  if (!c.ok) return NextResponse.json({ ok: false, message: "The join form is not switched on yet." }, { status: 503 });
  const text = await req.text();
  if (text.length > MAX_BODY) return NextResponse.json({ ok: false, message: "That is too much text." }, { status: 413 });
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false, message: "Something went wrong. Please try again." }, { status: 400 });
  }
  const r = await handleSubmit(c.cfg, body);
  return NextResponse.json(r.body, { status: r.status, headers: { "Cache-Control": "no-store" } });
}
