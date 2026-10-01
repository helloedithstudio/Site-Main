// Checks that a request to /api/discord/interactions really came from Discord. Discord signs "timestamp + body" with Ed25519
// and sends the signature and timestamp in two headers; our application's public key (DISCORD_PUBLIC_KEY, a 64 character hex
// string from the developer portal) verifies it. Uses Node's own crypto, so there is no extra dependency. Server only.

import { createPublicKey, verify } from "node:crypto";

/** The fixed start of an Ed25519 public key in DER (SPKI) form; the 32 key bytes follow it. */
const SPKI_ED25519_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

const HEX = /^[0-9a-f]+$/i;

/**
 * True only if the signature is valid for this exact timestamp and body, and the timestamp is recent.
 * The timestamp check stops someone replaying an old, genuinely signed request.
 */
export function verifyDiscordSignature(opts: {
  publicKeyHex: string;
  signatureHex: string | null | undefined;
  timestamp: string | null | undefined;
  body: string;
  /** Seconds since the epoch; a parameter so tests can fix the clock. */
  nowSeconds?: number;
  /** How far the timestamp may be from now, in seconds. */
  maxSkewSeconds?: number;
}): boolean {
  const { publicKeyHex, signatureHex, timestamp, body } = opts;
  if (!signatureHex || !timestamp || !HEX.test(signatureHex) || signatureHex.length !== 128) return false;
  if (!HEX.test(publicKeyHex) || publicKeyHex.length !== 64) return false;
  const ts = Number(timestamp);
  const now = opts.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > (opts.maxSkewSeconds ?? 300)) return false;
  try {
    const key = createPublicKey({ key: Buffer.concat([SPKI_ED25519_PREFIX, Buffer.from(publicKeyHex, "hex")]), format: "der", type: "spki" });
    return verify(null, Buffer.from(timestamp + body), key, Buffer.from(signatureHex, "hex"));
  } catch {
    return false;
  }
}
