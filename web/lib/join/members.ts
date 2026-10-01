// Who is a Catalyst, as far as the website needs to know: one small record per person, keyed by Discord id, holding their
// verified GitHub username and when they became a Catalyst. It exists so Friday can later look at a member's GitHub work for a
// promotion nomination (the entry store only keeps one-way codes, which cannot be turned back into a username).
//
// Written when someone completes the Catalyst form, or saves their profile as an existing Catalyst. It lives in the same
// Upstash Redis under its own "member:*" keys, and it is plain data on purpose: it holds a Discord id and a public GitHub
// username, nothing else of theirs. It is deleted with the entry when a Core member releases someone.

import type { JoinConfig } from "./config";
import { upstash } from "./store";

export type MemberRecord = {
  /** Verified (or, with GitHub sign-in switched off, typed) GitHub username. */
  github: string;
  /** What they asked to be called. Shown in a promotion nomination. */
  name?: string;
  /** ISO time they became a Catalyst. For someone who already had the role, the day they joined the server. */
  since: string;
  /** Whether they asked to be on the public Legion page. */
  listed: boolean;
};

type Creds = Pick<JoinConfig, "storeUrl" | "storeToken">;
const INDEX = "member:index";
const key = (discordId: string) => `member:${discordId}`;

export async function writeMember(cfg: Creds, discordId: string, rec: MemberRecord): Promise<void> {
  const run = upstash(cfg);
  await run("SET", key(discordId), JSON.stringify(rec));
  await run("SADD", INDEX, discordId);
}

export async function readMember(cfg: Creds, discordId: string): Promise<MemberRecord | null> {
  try {
    const row = (await upstash(cfg)("GET", key(discordId))) as string | null;
    if (!row) return null;
    const r = JSON.parse(row) as MemberRecord;
    return r && typeof r.github === "string" && typeof r.since === "string" ? r : null;
  } catch {
    return null;
  }
}

/** Every recorded Catalyst, as [discordId, record]. Never throws: a database problem gives an empty list. */
export async function readAllMembers(cfg: Creds): Promise<[string, MemberRecord][]> {
  try {
    const run = upstash(cfg);
    const ids = ((await run("SMEMBERS", INDEX)) as string[] | null) ?? [];
    if (!ids.length) return [];
    const rows = (await run("MGET", ...ids.map(key))) as (string | null)[];
    const out: [string, MemberRecord][] = [];
    ids.forEach((id, i) => {
      const row = rows[i];
      if (!row) return;
      try {
        const r = JSON.parse(row) as MemberRecord;
        if (r && typeof r.github === "string" && typeof r.since === "string") out.push([id, r]);
      } catch {
        // one bad row never breaks the rest
      }
    });
    return out;
  } catch {
    return [];
  }
}

export async function removeMember(cfg: Creds, discordId: string): Promise<void> {
  const run = upstash(cfg);
  await run("DEL", key(discordId));
  await run("SREM", INDEX, discordId);
}
