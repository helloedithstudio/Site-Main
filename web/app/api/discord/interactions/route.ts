import { NextResponse, after } from "next/server";
import { handleInteraction, type Interaction } from "@/lib/promote/interactions";
import { promoteConfig } from "@/lib/promote/config";
import { verifyDiscordSignature } from "@/lib/promote/signature";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

// Where Discord sends slash commands and button presses (set this address as the "Interactions Endpoint URL" in the Discord
// developer portal). Every request is checked against the application's public key first; anything not signed by Discord is
// refused with 401, as Discord requires. See docs/onboarding-setup.md, "Promotion".
export async function POST(req: Request) {
  const body = await req.text();
  if (body.length > 100_000) return new NextResponse(null, { status: 413 });
  const c = promoteConfig();
  // Not set up yet (settings missing): there is no key to check against, so nothing is answered.
  if (!c.ok) return NextResponse.json({ ok: false }, { status: 503 });
  const valid = verifyDiscordSignature({
    publicKeyHex: c.cfg.publicKey,
    signatureHex: req.headers.get("x-signature-ed25519"),
    timestamp: req.headers.get("x-signature-timestamp"),
    body,
  });
  if (!valid) return new NextResponse("invalid request signature", { status: 401 });
  let interaction: Interaction;
  try {
    interaction = JSON.parse(body) as Interaction;
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const { response, work } = handleInteraction(c.cfg, interaction);
  if (work) after(work);
  return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
}
