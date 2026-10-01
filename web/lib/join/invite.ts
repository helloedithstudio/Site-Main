// A one-time message from Friday to Catalysts who are already in the server and have not set up their Legion profile, inviting
// them to do it. People who join from now on are told by the join flow itself; this is for everyone who was here before, whom
// the sweep deliberately never messages.
//
// It sends nothing unless it is told to, and then only to exactly the number of people the person running it expected:
//   1. a dry run lists who would be messaged (and changes nothing);
//   2. a send must repeat that number ("expect"), so a changed list can never be sent by surprise.
// Each person is messaged at most once ever (a note is kept), and no more than MAX_PER_RUN in one go, a pause between each,
// so Discord does not mistake it for spam. Someone whose direct messages are closed is noted and listed, not pinged in public.

import type { JoinConfig } from "./config";
import type { DiscordClient } from "./discord";
import { withLock } from "./lock";
import { readAllMembers } from "./members";
import { upstash } from "./store";
import { legionInterests } from "../legion";

/** The most people messaged in one run. The rest wait for the next one. */
export const MAX_PER_RUN = 20;
/** A pause between messages, in milliseconds. */
export const PAUSE_MS = 1200;

const key = (id: string) => `profile-invite:${id}`;

export const message = (cfg: JoinConfig) =>
  `Hello, I am Friday, with a quick one from edith.\n\n` +
  `The Legion page lists the people building in the community, and you can be on it. You are already a Catalyst, so there is no deadline and nothing about your role changes. If you would like to be shown, sign in here and save your profile (about two minutes): ${cfg.siteUrl}/join\n\n` +
  `You pick what you build (${legionInterests.join(", ")}) so people can find you by it, and you choose whether to be shown at all. If you would rather not be listed, just ignore this. I will not message you about it again.`;

export type InviteResult = {
  /** True unless it was asked to send. */
  dryRun: boolean;
  /** People who would be (or were) messaged: Catalysts with no profile who have not been invited before. */
  eligible: number;
  /** Dry run only: who. */
  would?: { id: string; username: string }[];
  sent: string[];
  /** Direct messages closed or Discord refused: not retried, so tell them another way (an announcement). */
  unreachable: string[];
  /** Waiting for a later run because of the limit per run. */
  remaining: number;
  /** Already invited before, or already have a profile: not messaged again. */
  alreadyInvited: number;
  haveProfile: number;
  note?: string;
};

type Creds = Pick<JoinConfig, "storeUrl" | "storeToken">;

/** Which of these people have been invited (or attempted) before. */
export async function readInvited(cfg: Creds, ids: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  const run = upstash(cfg);
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const rows = (await run("MGET", ...chunk.map(key))) as (string | null)[];
    chunk.forEach((id, k) => {
      if (rows[k]) out.add(id);
    });
  }
  return out;
}

/** Forget that someone was invited (used when a Core member releases them). */
export async function removeInvite(cfg: Creds, id: string): Promise<void> {
  await upstash(cfg)("DEL", key(id));
}

export async function inviteProfiles(
  cfg: JoinConfig,
  d: DiscordClient,
  opts: { send?: boolean; expect?: number; now?: Date; pause?: (ms: number) => Promise<void> } = {},
): Promise<InviteResult> {
  const send = !!opts.send;
  const now = opts.now ?? new Date();
  const pause = opts.pause ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const res: InviteResult = { dryRun: !send, eligible: 0, sent: [], unreachable: [], remaining: 0, alreadyInvited: 0, haveProfile: 0 };

  const [members, owner, records] = await Promise.all([d.listMembers(), d.ownerId(), readAllMembers(cfg)]);
  const hasProfile = new Set(records.map(([id]) => id));
  const catalysts = members.filter((m) => !m.bot && m.id !== owner && m.roles.includes(cfg.roleCatalyst));
  res.haveProfile = catalysts.filter((m) => hasProfile.has(m.id)).length;
  const invited = await readInvited(cfg, catalysts.filter((m) => !hasProfile.has(m.id)).map((m) => m.id));
  res.alreadyInvited = invited.size;
  const todo = catalysts.filter((m) => !hasProfile.has(m.id) && !invited.has(m.id));
  res.eligible = todo.length;

  if (!send) {
    res.would = todo.map((m) => ({ id: m.id, username: m.username }));
    res.note = todo.length ? `Nothing was sent. To send these ${todo.length}, repeat the request with send=1&expect=${todo.length}.` : "Nobody to message: everyone has a profile or has already been invited.";
    return res;
  }
  if (opts.expect !== todo.length) {
    res.note = `Nothing was sent. ${todo.length} ${todo.length === 1 ? "person" : "people"} would be messaged now, but you expected ${opts.expect ?? "no number"}. Run the dry run again and use the number it shows.`;
    return res;
  }

  const ran = await withLock(
    upstash(cfg),
    "profile-invite",
    300,
    async () => {
      const batch = todo.slice(0, MAX_PER_RUN);
      res.remaining = todo.length - batch.length;
      for (const [i, m] of batch.entries()) {
        let delivered: boolean;
        try {
          delivered = await d.dm(m.id, { content: message(cfg), allowed_mentions: { parse: [] } });
        } catch (e) {
          // Discord itself is struggling (for example rate limiting). Stop here and mark nobody further, so a later run tries them.
          res.note = `Stopped early: Discord did not answer properly (${e instanceof Error ? e.message : "unknown error"}). The people not reached yet were not marked, so a later run will try them.`;
          res.remaining = todo.length - res.sent.length - res.unreachable.length;
          return;
        }
        // Noted either way, so a second run never messages the same person again (and never keeps knocking on closed messages).
        await upstash(cfg)("SET", key(m.id), JSON.stringify({ at: now.toISOString(), delivered })).catch(() => {});
        (delivered ? res.sent : res.unreachable).push(m.id);
        if (i < batch.length - 1) await pause(PAUSE_MS);
      }
    },
    { failOpen: false },
  );
  if (!ran.ran) res.note = "Another invitation run is already in progress, so this one did nothing.";
  else if (!res.note && res.remaining) res.note = `${res.remaining} more are waiting: run the dry run again, then send again with the new number.`;
  return res;
}
