// The public Legion directory, stored in the same Upstash Redis as the join flow's one-way entry store (a separate key
// space, "legion:*"). Unlike that store, this one holds plain, readable profile data on purpose: it only exists because
// the person ticked "Show me on the public Legion page", so it is meant to be public. Written once, on a completed
// Catalyst form; read on every visit to /legion so a new Catalyst appears without anyone doing it by hand.

import type { JoinConfig } from "../join/config";
import type { PersonEntry } from "../people";
import { upstash } from "../join/store";

const INDEX = "legion:index";
const key = (login: string) => `legion:profile:${login.toLowerCase()}`;

/** Just the database credentials, read directly from the environment. The Legion page needs only these, not every
 *  setting the join flow itself requires, so a missing Discord or GitHub secret can never take this page down. */
export function storeCredsFromEnv(env: Record<string, string | undefined> = process.env): Pick<JoinConfig, "storeUrl" | "storeToken"> | null {
  const storeUrl = (env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL || "").trim().replace(/\/$/, "");
  const storeToken = (env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN || "").trim();
  return storeUrl && storeToken ? { storeUrl, storeToken } : null;
}

/** Adds or replaces one person's public entry. Filling in the form again just overwrites their old entry. */
export async function writeDirectoryEntry(cfg: Pick<JoinConfig, "storeUrl" | "storeToken">, entry: PersonEntry): Promise<void> {
  const run = upstash(cfg);
  await run("SET", key(entry.github), JSON.stringify(entry));
  await run("SADD", INDEX, entry.github.toLowerCase());
}

/** Removes a person (they asked to be taken off, or a Core member cleans up an entry). */
export async function removeDirectoryEntry(cfg: Pick<JoinConfig, "storeUrl" | "storeToken">, login: string): Promise<void> {
  const run = upstash(cfg);
  await run("DEL", key(login));
  await run("SREM", INDEX, login.toLowerCase());
}

/** Everyone currently listed. Never throws: a store problem just means the page falls back to the hand-written list. */
export async function readDirectory(cfg: Pick<JoinConfig, "storeUrl" | "storeToken">): Promise<PersonEntry[]> {
  try {
    const run = upstash(cfg);
    const logins = (await run("SMEMBERS", INDEX)) as string[] | null;
    if (!logins?.length) return [];
    const rows = (await run("MGET", ...logins.map(key))) as (string | null)[];
    const out: PersonEntry[] = [];
    for (const row of rows) {
      if (!row) continue;
      try {
        const e = JSON.parse(row) as PersonEntry;
        if (e && typeof e.github === "string") out.push(e);
      } catch {
        // one bad row never breaks the page
      }
    }
    return out;
  } catch (e) {
    console.warn(`[legion] could not read the directory (${e instanceof Error ? e.message : "unknown error"}), showing the hand-written list only`);
    return [];
  }
}
