// The scheduled job: find new members, message them their form, remind them, and remove the ones who did not finish.
// Called by GitHub Actions every ten minutes through /api/join/sweep. Discord roles are the only state (Pending, and
// optionally Reminded), so there is no database. Safe by default: see lib/join/config.ts and lib/join/plan.ts.

import type { JoinConfig } from "./config";
import { discord, type DiscordClient } from "./discord";
import { planSweep, type Member } from "./plan";

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
  skipped: number;
  errors: string[];
};

const HOUR = 3_600_000;
const stamp = (cfg: JoinConfig, m: Member) => Math.floor((Date.parse(m.joinedAt) + cfg.hours * HOUR) / 1000);
const link = (cfg: JoinConfig) => `${cfg.siteUrl}/join`;

export const messages = {
  invite: (cfg: JoinConfig, m: Member) =>
    `Welcome to edith. To stay in the community, complete your short Catalyst form <t:${stamp(cfg, m)}:R> (by <t:${stamp(cfg, m)}:F>).\n\n${link(cfg)}\n\nIt takes about two minutes. If it is not done in time you will be removed from the server automatically. You are welcome to join again with the link on the site.`,
  channel: (cfg: JoinConfig, m: Member) =>
    `<@${m.id}> we could not send you a message. Please complete your Catalyst form <t:${stamp(cfg, m)}:R> to stay in the community: ${link(cfg)}`,
  remind: (cfg: JoinConfig, m: Member) =>
    `Reminder: your Catalyst form is due <t:${stamp(cfg, m)}:R>. ${link(cfg)} It takes about two minutes, and if it is not done in time you will be removed from the server.`,
  removed: (cfg: JoinConfig) =>
    `You were removed from edith because the Catalyst form was not completed within ${cfg.hours} hours. You are welcome to join again with the link on the site: ${cfg.inviteUrl}`,
};

/** Sends by direct message; if that is closed, pings the person in the welcome channel (if one is set). */
async function notify(cfg: JoinConfig, d: DiscordClient, m: Member, text: string, fallback: string) {
  if (await d.dm(m.id, { content: text, allowed_mentions: { parse: [] } })) return;
  if (cfg.channelWelcome) await d.post(cfg.channelWelcome, { content: fallback, allowed_mentions: { users: [m.id] } });
}

export async function runSweep(cfg: JoinConfig, opts: { now?: Date; forceDry?: boolean; client?: DiscordClient } = {}): Promise<SweepResult> {
  const now = opts.now ?? new Date();
  const dryRun = cfg.dryRun || !!opts.forceDry;
  const res: SweepResult = { ran: false, dryRun, invited: [], reminded: [], removed: [], missed: [], skipped: 0, errors: [] };
  if (!cfg.startAt) {
    res.note = "ONBOARDING_START is not set, so nothing was done.";
    return res;
  }
  const d = opts.client ?? discord(cfg);
  const members = await d.listMembers();
  const plan = planSweep(members, now, { ...cfg, ownerId: await d.ownerId() });
  res.ran = true;
  res.skipped = plan.skipped;
  res.missed = plan.missed.map((m) => m.id);

  const each = async (list: Member[], bucket: string[], act: (m: Member) => Promise<void>) => {
    for (const m of list) {
      if (dryRun) {
        bucket.push(m.id);
        continue;
      }
      try {
        await act(m);
        bucket.push(m.id);
      } catch (e) {
        res.errors.push(`${m.id}: ${e instanceof Error ? e.message : "failed"}`);
      }
    }
  };

  await each(plan.invite, res.invited, async (m) => {
    await d.addRole(m.id, cfg.rolePending, "Catalyst form sent");
    await notify(cfg, d, m, messages.invite(cfg, m), messages.channel(cfg, m));
  });
  await each(plan.remind, res.reminded, async (m) => {
    if (cfg.roleReminded) await d.addRole(m.id, cfg.roleReminded, "Catalyst form reminder sent");
    await notify(cfg, d, m, messages.remind(cfg, m), messages.remind(cfg, m).replace("Reminder:", `<@${m.id}> reminder:`));
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
