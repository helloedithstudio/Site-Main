// Signed pitch links for the Studio page. A Maintainer runs scripts/pitch-link.ts to make a link such as
// /studio?p=<token>; the page then greets the client ("Kevin Andrew prepared this for Acme") and its last button books a
// call with that Maintainer.
//
// The token is the claims as base64url JSON, a dot, and an HMAC-SHA256 of that text made with PITCH_LINK_SECRET, which
// only the server and the Maintainers who make links hold. Without it nobody can make or change a link, so the client
// name on the page is always one a Maintainer wrote. Rotating the secret ends every link made before. Server only.

import { createHmac, timingSafeEqual } from "node:crypto";

export type PitchClaims = { v: 1; from: string; for: string; exp: number };

export const PITCH_SECRET_MIN = 32;
export const PITCH_TOKEN_MAX = 600;
export const PITCH_FOR_MAX = 60;

// Letters in any language, digits, spaces and a little punctuation: enough for "Acme Ltd", "O'Neill & Co." or "Zoë".
const FOR_RE = /^[\p{L}\p{N} &.,'’]+$/u;

/** A client name made safe to show, or null if it cannot be. Rendered as text either way, never as HTML. */
export function cleanFor(raw: string): string | null {
  const s = raw.replace(/\s+/g, " ").trim();
  if (!s || s.length > PITCH_FOR_MAX || !FOR_RE.test(s)) return null;
  return s;
}

const b64 = (buf: Buffer) => buf.toString("base64url");
const mac = (secret: string, body: string) => createHmac("sha256", secret).update(`pitch.v1.${body}`).digest();

export function signPitch(secret: string, claims: PitchClaims): string {
  if (secret.length < PITCH_SECRET_MIN) throw new Error(`PITCH_LINK_SECRET must be at least ${PITCH_SECRET_MIN} characters`);
  const clean = cleanFor(claims.for);
  if (!clean) throw new Error(`the client name must be 1 to ${PITCH_FOR_MAX} letters, digits, spaces or & . , '`);
  const body = b64(Buffer.from(JSON.stringify({ v: 1, from: claims.from, for: clean, exp: Math.floor(claims.exp) })));
  return `${body}.${b64(mac(secret, body))}`;
}

/** The claims of a genuine, unexpired token, or null for anything else (including a forged or altered one). */
export function verifyPitch(secret: string | undefined, token: string, nowMs = Date.now()): PitchClaims | null {
  if (!secret || secret.length < PITCH_SECRET_MIN || !token || token.length > PITCH_TOKEN_MAX) return null;
  const dot = token.indexOf(".");
  if (dot < 1 || dot !== token.lastIndexOf(".")) return null;
  const body = token.slice(0, dot);
  let given: Buffer;
  try {
    given = Buffer.from(token.slice(dot + 1), "base64url");
  } catch {
    return null;
  }
  const expected = mac(secret, body);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const c = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<PitchClaims>;
    if (c.v !== 1 || typeof c.from !== "string" || typeof c.for !== "string" || typeof c.exp !== "number") return null;
    if (c.exp * 1000 <= nowMs) return null;
    const forName = cleanFor(c.for);
    if (!forName) return null;
    return { v: 1, from: c.from, for: forName, exp: c.exp };
  } catch {
    return null;
  }
}
