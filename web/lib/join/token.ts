// Signed, expiring tokens (HMAC SHA-256) for the join flow. There are no cookies and no database: the OAuth "state" and the
// form token are both self-contained and checked with the signing secret. Server only.

import { createHmac, timingSafeEqual } from "node:crypto";

export type Purpose = "state" | "link" | "form";
export type TokenPayload = {
  p: Purpose;
  /** Discord user id. Empty for "state". */
  u: string;
  /** Discord username, shown on the form. */
  n: string;
  /** Display name, if the person has one. */
  d: string;
  /** When they joined the server (ISO), so the form can show the deadline. */
  j: string;
  /** Expiry, epoch ms. */
  e: number;
  /** Random value, so two tokens are never identical. */
  r: string;
  /** The GitHub account the person proved they own (id, username, name, created), once they have signed in with GitHub. */
  gh?: { i: string; l: string; n: string; c: string };
};

const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");
const mac = (secret: string, body: string) => createHmac("sha256", secret).update(body).digest();

export function signToken(secret: string, payload: Omit<TokenPayload, "r"> & { r?: string }): string {
  const full: TokenPayload = { ...payload, r: payload.r ?? b64(createHmac("sha256", secret).update(String(Math.random()) + Date.now()).digest()).slice(0, 12) };
  const body = b64(JSON.stringify(full));
  return `${body}.${b64(mac(secret, body))}`;
}

/** Returns the payload if the signature is right, the purpose matches and it has not expired; otherwise null. */
export function verifyToken(secret: string, token: unknown, purpose: Purpose, now = Date.now()): TokenPayload | null {
  if (typeof token !== "string" || token.length > 2000) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = mac(secret, body);
  let given: Buffer;
  try {
    given = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload;
    if (p.p !== purpose || typeof p.e !== "number" || p.e < now) return null;
    return p;
  } catch {
    return null;
  }
}
