// What Friday remembers for promotions, in the same Upstash Redis as the rest (see lib/join/members.ts):
//   credit:<discordId>  a short list of Kevin's credit notes ({at, reason, by}), newest last
//   promo:<discordId>   where this person stands: nominated, snoozed until a date, or promoted
// Plain data, kept while someone is a member and deleted when they ask (it is covered by the privacy text). Server only.

import type { JoinConfig } from "../join/config";
import { upstash } from "../join/store";

type Creds = Pick<JoinConfig, "storeUrl" | "storeToken">;

export type Credit = { at: string; reason: string; by: string };
export type Promo =
  | { state: "nominated"; at: string }
  | { state: "snoozed"; until: string }
  | { state: "promoted"; at: string; by: string };

const MAX_CREDITS = 100;
const creditKey = (id: string) => `credit:${id}`;
const promoKey = (id: string) => `promo:${id}`;

export async function readCredits(cfg: Creds, id: string): Promise<Credit[]> {
  try {
    const row = (await upstash(cfg)("GET", creditKey(id))) as string | null;
    const rows = row ? (JSON.parse(row) as Credit[]) : [];
    return Array.isArray(rows) ? rows.filter((c) => c && typeof c.at === "string" && typeof c.reason === "string") : [];
  } catch {
    return [];
  }
}

/** Adds a credit note and returns how many are now kept. Reading and writing a short list is fine at this size. */
export async function addCredit(cfg: Creds, id: string, credit: Credit): Promise<number> {
  const run = upstash(cfg);
  const row = (await run("GET", creditKey(id))) as string | null;
  let list: Credit[] = [];
  try {
    list = row ? (JSON.parse(row) as Credit[]) : [];
  } catch {
    list = [];
  }
  list = [...(Array.isArray(list) ? list : []), credit].slice(-MAX_CREDITS);
  await run("SET", creditKey(id), JSON.stringify(list));
  return list.length;
}

export async function readPromo(cfg: Creds, id: string): Promise<Promo | null> {
  try {
    const row = (await upstash(cfg)("GET", promoKey(id))) as string | null;
    const p = row ? (JSON.parse(row) as Promo) : null;
    return p && (p.state === "nominated" || p.state === "snoozed" || p.state === "promoted") ? p : null;
  } catch {
    return null;
  }
}

export async function writePromo(cfg: Creds, id: string, promo: Promo): Promise<void> {
  await upstash(cfg)("SET", promoKey(id), JSON.stringify(promo));
}

export async function clearPromo(cfg: Creds, id: string): Promise<void> {
  await upstash(cfg)("DEL", promoKey(id));
}

/** Everything kept for one person (used when a Core member releases them). */
export async function removePromotionData(cfg: Creds, id: string): Promise<void> {
  await upstash(cfg)("DEL", creditKey(id), promoKey(id));
}
