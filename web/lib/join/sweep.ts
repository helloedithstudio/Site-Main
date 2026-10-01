// The scheduled job: find new members, message them their form, remind them, and remove the ones who did not finish.
// Called every few minutes through /api/join/sweep (GitHub Actions, and a QStash schedule for reliable timing). Discord roles
// are the only state (Pending, and optionally Reminded), so there is no database. Safe by default: see lib/join/config.ts and
// lib/join/plan.ts.

import type { JoinConfig } from "./config";
import { discord, type DiscordClient } from "./discord";
import { withLock } from "./lock";
import { planSweep, type Member } from "./plan";
import { upstash } from "./store";

/** If more removals than this are planned in one run, none happen: it almost certainly means a wrong setting. */
export const MAX_KICKS_PER_RUN = 10;

export type SweepResult = {
  ran: boolean;
  dryRun: boolean;
  note?: string;
  invited: string[];
  reminded: string[];
  removed: string[];
  missed: string[];
  /** People who could not be messaged at all (direct messages closed and no welcome channel, or it failed). They are not
   *  marked as invited, so they are tried again next time and are never removed for a message they never received. */
  unreachable: string[];
  skipped: number;
  errors: string[];
};

const HOUR = 3_600_000;
const stamp = (cfg: JoinConfig, m: Member) => Math.floor((Date.parse(m.joinedAt) + cfg.hours * HOUR) / 1000);
const link = (cfg: JoinConfig) => `${cfg.siteUrl}/join`;

export const messages = {
  invite: (cfg: JoinConfig, m: Member) =>
    `Hello, I am Friday. Welcome to edith.\n\n` +
    `edith is six hubs in one server: pitch an idea in #brainstorm, find a crew in #find-a-team, build in public in #wip, get unstuck in #rubber-duck, ship it in #ship-it, and #touch-grass when you need to. Pick whatever fits and say hello.\n\n` +
    `One thing to do first: a short Catalyst form, due <t:${stamp(cfg, m)}:R> (by <t:${stamp(cfg, m)}:F>). It takes about two minutes: ${link(cfg)}\n\n` +
    `If it is not done in time you will be removed from the server automatically, and you are welcome to join again. I only send this one message. For anything else, ask in the server, any Core member will help.`,
  channel: (cfg: JoinConfig, m: Member) =>
    `<@${m.id}> we could not send you a message. Please complete your Catalyst form <t:${stamp(cfg, m)}:R> to stay in the community: ${link(cfg)}`,
  remind: (cfg: JoinConfig, m: Member) =>
    `Reminder: your Catalyst form is due <t:${stamp(cfg, m)}:R>. ${link(cfg)} It takes about two minutes, and if it is not done in time you will be removed from the server.`,
  removed: (cfg: JoinConfig) =>
    `You were removed from edith because the Catalyst form was not completed within ${cfg.hours} hours. You are welcome to join again with the link on the site: ${cfg.inviteUrl}`,
};

/** Sends by direct message; if that is closed, pings the person in the welcome channel (if one is set).
 *  Returns whether anyone was actually reached. */
async function notify(cfg: JoinConfig, d: DiscordClient, m: Member, text: string, fallback: string): Promise<boolean> {
  if (await d.dm(m.id, { content: text, allowed_mentions: { parse: [] } })) return true;
  if (!cfg.channelWelcome) return false;
  try {
    await d.post(cfg.channelWelcome, { content: fallback, allowed_mentions: { users: [m.id] } });
    return true;
  } catch {
    return false;
  }
}

async function sweepOnce(cfg: JoinConfig, res: SweepResult, now: Date, dryRun: boolean, client?: DiscordClient): Promise<SweepResult> {
  const d = client ?? discord(cfg);
  const members = await d.listMembers();
  const plan = planSweep(members, now, { ...cfg, ownerId: await d.ownerId() });
  res.ran = true;
  res.skipped = plan.skipped;
  res.missed = plan.missed.map((m) => m.id);

  // `act` returns false when it chose not to count the person (they could not be reached).
  const each = async (list: Member[], bucket: string[], act: (m: Member) => Promise<boolean | void>) => {
    for (const m of list) {
      if (dryRun) {
        bucket.push(m.id);
        continue;
      }
      try {
        if ((await act(m)) === false) continue;
        bucket.push(m.id);
      } catch (e) {
        res.errors.push(`${m.id}: ${e instanceof Error ? e.message : "failed"}`);
      }
    }
  };

  // Message first, mark second. The Pending role is what makes someone "invited" (and so removable after the window), so it
  // is only given once the message has really reached them. Otherwise a person whose direct messages are closed could be
  // removed after a day without ever being told about the form.
  await each(plan.invite, res.invited, async (m) => {
    if (!(await notify(cfg, d, m, messages.invite(cfg, m), messages.channel(cfg, m)))) {
      res.unreachable.push(m.id);
      return false;
    }
    await d.addRole(m.id, cfg.rolePending, "Catalyst form sent");
  });
  await each(plan.remind, res.reminded, async (m) => {
    const reached = await notify(cfg, d, m, messages.remind(cfg, m), messages.remind(cfg, m).replace("Reminder:", `<@${m.id}> reminder:`));
    if (!reached) {
      res.unreachable.push(m.id);
      return false;
    }
    if (cfg.roleReminded) await d.addRole(m.id, cfg.roleReminded, "Catalyst form reminder sent");
  });
  if (plan.kick.length > MAX_KICKS_PER_RUN) {
    res.errors.push(`Refused to remove ${plan.kick.length} people in one run (the safety limit is ${MAX_KICKS_PER_RUN}). Check ONBOARDING_START and the exempt roles.`);
  } else {
    await each(plan.kick, res.removed, async (m) => {
      await d.dm(m.id, { content: messages.removed(cfg), allowed_mentions: { parse: [] } }).catch(() => false);
      await d.kick(m.id, `Catalyst form not completed within ${cfg.hours} hours`);
    });
  }
  return res;
}

export async function runSweep(cfg: JoinConfig, opts: { now?: Date; forceDry?: boolean; client?: DiscordClient } = {}): Promise<SweepResult> {
  const now = opts.now ?? new Date();
  const dryRun = cfg.dryRun || !!opts.forceDry;
  const res: SweepResult = { ran: false, dryRun, invited: [], reminded: [], removed: [], missed: [], unreachable: [], skipped: 0, errors: [] };
  if (!cfg.startAt) {
    res.note = "ONBOARDING_START is not set, so nothing was done.";
    return res;
  }
  // A dry run changes nothing, so it never needs the lock. A live run takes it, so the GitHub and QStash schedules can never
  // overlap and message the same person twice. If the database cannot be reached the run goes ahead without the lock: a rare
  // double message is better than nobody being welcomed.
  if (dryRun) return sweepOnce(cfg, res, now, dryRun, opts.client);
  const locked = await withLock(upstash(cfg), "sweep", 120, () => sweepOnce(cfg, res, now, dryRun, opts.client), { failOpen: true });
  if (!locked.ran) {
    res.note = "Another sweep is already running, so this one did nothing.";
    return res;
  }
  if (locked.unlocked) locked.value.note = "The lock could not be taken (database unreachable), so this sweep ran without it.";
  return locked.value;
}
