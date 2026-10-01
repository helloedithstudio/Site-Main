// What promotion actually does. Every function takes the Discord client as an argument, so the tests run the real logic
// against a fake Discord. Messages are written for Kevin to read in Discord, so they are plain and say what happened.
//
// The rules that matter:
//   - only Catalysts can be promoted (and never bots or the server owner);
//   - promoting is the Maintainer role in Discord PLUS, if the person opted in to the Legion page, a Maintainer entry there;
//   - everything is idempotent: doing it twice changes nothing the second time;
//   - every promotion and demotion is logged in the private promotions channel.

import type { DiscordClient } from "../join/discord";
import { clean } from "../join/form";
import { readAllMembers, readMember, type MemberRecord } from "../join/members";
import { readDirectoryEntry, removeDirectoryEntry, writeDirectoryEntry } from "../legion/directory";
import type { PromoteConfig } from "./config";
import { mergedPrCount } from "./github";
import { CREDIT_WINDOW_DAYS, PR_WINDOW_DAYS, eligibility } from "./score";
import { addCredit, readCredits, readPromo, writePromo } from "./store";

export type ActionResult = { ok: boolean; message: string };

const DAY = 86_400_000;
const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const mention = (id: string) => `<@${id}>`;
const quiet = { parse: [] as string[] };

/** Posts in the private promotions channel. Never throws: the action itself has already happened. */
async function log(cfg: PromoteConfig, d: DiscordClient, content: string) {
  try {
    await d.post(cfg.channelPromotions, { content, allowed_mentions: quiet });
  } catch {
    // the channel is a convenience record; a failure here must not undo or hide the action
  }
}

export const messages = {
  promoted: (cfg: PromoteConfig) =>
    `Congratulations: you have been promoted to Maintainer on edith. That opens the Maintainer channels, and if you chose to be listed you now appear under Maintainers on the Legion page (${cfg.siteUrl}/legion). Thank you for the work that got you here.`,
};

export async function promote(cfg: PromoteConfig, d: DiscordClient, targetId: string, byId: string, now = new Date()): Promise<ActionResult> {
  const m = await d.getMember(targetId);
  if (!m) return { ok: false, message: `${mention(targetId)} is not in the server.` };
  if (m.bot || targetId === (await d.ownerId())) return { ok: false, message: `${mention(targetId)} cannot be promoted (a bot or the server owner).` };
  if (!m.roles.includes(cfg.roleCatalyst)) return { ok: false, message: `${mention(targetId)} is not a Catalyst yet, so they cannot be promoted. Give them the Catalyst role, or they can finish the form, first.` };
  if (m.roles.includes(cfg.roleMaintainer)) return { ok: true, message: `${mention(targetId)} is already a Maintainer. Nothing changed.` };

  await d.addRole(targetId, cfg.roleMaintainer, `Promoted to Maintainer by ${byId}`);

  // The Legion page: only for people who opted in to being listed. A Maintainer role in Discord never publishes anyone.
  const rec = await readMember(cfg, targetId);
  let shown = "They are not shown on the Legion page (they have not signed in at /join and ticked the box).";
  if (rec) {
    const entry = await readDirectoryEntry(cfg, rec.github);
    if (entry) {
      await writeDirectoryEntry(cfg, { ...entry, role: "Maintainer" });
      shown = "They now appear under Maintainers on the Legion page.";
    } else if (rec.listed) {
      await writeDirectoryEntry(cfg, { github: rec.github, name: rec.name, joined: rec.since.slice(0, 10), role: "Maintainer" });
      shown = "They now appear under Maintainers on the Legion page.";
    } else {
      shown = "They are not shown on the Legion page (they did not tick the box).";
    }
  }
  await writePromo(cfg, targetId, { state: "promoted", at: now.toISOString(), by: byId }).catch(() => {});
  await d.dm(targetId, { content: messages.promoted(cfg), allowed_mentions: quiet }).catch(() => false);
  await log(cfg, d, `${mention(targetId)} was promoted to Maintainer by ${mention(byId)}.`);
  return { ok: true, message: `Promoted ${mention(targetId)} to Maintainer. ${shown} They have been sent a message.` };
}

export async function demote(cfg: PromoteConfig, d: DiscordClient, targetId: string, byId: string, now = new Date()): Promise<ActionResult> {
  const m = await d.getMember(targetId);
  if (m && (m.bot || targetId === (await d.ownerId()))) return { ok: false, message: `${mention(targetId)} cannot be demoted here (a bot or the server owner).` };
  const had = !!m?.roles.includes(cfg.roleMaintainer);
  if (had) await d.removeRole(targetId, cfg.roleMaintainer, `Demoted from Maintainer by ${byId}`);
  const rec = await readMember(cfg, targetId);
  let page = "";
  if (rec) {
    const entry = await readDirectoryEntry(cfg, rec.github);
    if (entry?.role === "Maintainer") {
      const back = { ...entry };
      delete back.role;
      await writeDirectoryEntry(cfg, back);
      page = " They are back under Catalysts on the Legion page.";
    }
  }
  // Do not nominate them again straight away.
  await writePromo(cfg, targetId, { state: "snoozed", until: new Date(now.getTime() + 90 * DAY).toISOString() }).catch(() => {});
  if (!had && !page) return { ok: true, message: `${mention(targetId)} was not a Maintainer. Nothing changed.` };
  await log(cfg, d, `${mention(targetId)} was demoted from Maintainer by ${mention(byId)}.`);
  return { ok: true, message: `Demoted ${mention(targetId)}: the Maintainer role is removed.${page} They will not be nominated again for 90 days.` };
}

export async function creditNote(cfg: PromoteConfig, d: DiscordClient, targetId: string, byId: string, reason: string, now = new Date()): Promise<ActionResult> {
  const text = clean(reason, 200);
  if (text.length < 3) return { ok: false, message: "Say what the good work was, in a few words." };
  const m = await d.getMember(targetId);
  if (!m) return { ok: false, message: `${mention(targetId)} is not in the server.` };
  if (m.bot) return { ok: false, message: "Credit notes are for people, not bots." };
  if (!m.roles.includes(cfg.roleCatalyst)) return { ok: false, message: `${mention(targetId)} is not a Catalyst yet.` };
  const n = await addCredit(cfg, targetId, { at: now.toISOString(), reason: text, by: byId });
  return { ok: true, message: `Noted for ${mention(targetId)}: "${text}". That is ${n} credit note${n === 1 ? "" : "s"} so far.` };
}

/** Adds someone to the Legion page by GitHub username, by hand. Not verified: they can confirm it by signing in at /join. */
export async function listPerson(cfg: PromoteConfig, login: string, now = new Date()): Promise<ActionResult> {
  const name = login.trim().replace(/^@/, "");
  if (!LOGIN.test(name)) return { ok: false, message: `"${clean(login, 40)}" is not a GitHub username.` };
  if (await readDirectoryEntry(cfg, name)) return { ok: true, message: `${name} is already on the Legion page. Nothing changed.` };
  await writeDirectoryEntry(cfg, { github: name, joined: now.toISOString().slice(0, 10) });
  return { ok: true, message: `Added ${name} to the Legion page. Their name and photo come from their public GitHub profile. This was added by hand and is not verified; they can confirm it by signing in at ${cfg.siteUrl}/join.` };
}

export async function unlistPerson(cfg: PromoteConfig, login: string): Promise<ActionResult> {
  const name = login.trim().replace(/^@/, "");
  if (!LOGIN.test(name)) return { ok: false, message: `"${clean(login, 40)}" is not a GitHub username.` };
  if (!(await readDirectoryEntry(cfg, name))) return { ok: true, message: `${name} is not on the Legion page. Nothing changed.` };
  await removeDirectoryEntry(cfg, name);
  return { ok: true, message: `Removed ${name} from the Legion page. If they are a Maintainer in Discord that is unchanged; use /demote for that.` };
}

/** Kevin pressed "Not yet" on a nomination: stay quiet about this person for 30 days. */
export async function snooze(cfg: PromoteConfig, targetId: string, now = new Date(), days = 30): Promise<ActionResult> {
  await writePromo(cfg, targetId, { state: "snoozed", until: new Date(now.getTime() + days * DAY).toISOString() });
  return { ok: true, message: `Not yet for ${mention(targetId)}. Friday will not suggest them again for ${days} days.` };
}

// ---------------------------------------------------------------------------------------------------- nominations

/** At most this many nominations are posted in one run, so a first run cannot flood the channel. */
export const MAX_NOMINATIONS_PER_RUN = 5;

export type ScanResult = { dryRun: boolean; checked: number; nominated: string[]; waiting: string[]; errors: string[] };

export const nominationButtons = (id: string) => [
  {
    type: 1,
    components: [
      { type: 2, style: 3, label: "Promote", custom_id: `promo:yes:${id}` },
      { type: 2, style: 2, label: "Not yet", custom_id: `promo:no:${id}` },
    ],
  },
];

function nominationMessage(cfg: PromoteConfig, id: string, rec: MemberRecord, days: number, prs: number, credits: number, points: number) {
  return {
    content: `Friday suggests a Maintainer: ${mention(id)}`,
    allowed_mentions: quiet,
    embeds: [
      {
        title: "Maintainer nomination",
        color: 0xffbc09,
        description: `${mention(id)} (${clean(rec.name ?? rec.github, 60)})`,
        fields: [
          { name: "GitHub", value: `https://github.com/${rec.github}`, inline: true },
          { name: "Catalyst for", value: `${Math.floor(days)} days`, inline: true },
          { name: `Merged pull requests (${PR_WINDOW_DAYS} days)`, value: String(prs), inline: true },
          { name: `Credit notes (${CREDIT_WINDOW_DAYS} days)`, value: String(credits), inline: true },
          { name: "Points", value: `${points} (needed: ${cfg.minPoints})`, inline: true },
        ],
        footer: { text: "Only the people who run promotions can press the buttons." },
      },
    ],
    components: nominationButtons(id),
  };
}

/**
 * Looks at every recorded Catalyst and posts a nomination for those who qualify and have not already been nominated,
 * snoozed or promoted. With `dry` it reports who would be nominated and posts nothing. `prCount` can be replaced in tests.
 */
export async function scanNominations(
  cfg: PromoteConfig,
  d: DiscordClient,
  opts: { now?: Date; dry?: boolean; prCount?: typeof mergedPrCount } = {},
): Promise<ScanResult> {
  const now = opts.now ?? new Date();
  const prCount = opts.prCount ?? mergedPrCount;
  const res: ScanResult = { dryRun: !!opts.dry, checked: 0, nominated: [], waiting: [], errors: [] };
  const members = await readAllMembers(cfg);
  for (const [id, rec] of members) {
    if (res.nominated.length >= MAX_NOMINATIONS_PER_RUN) break;
    const days = (now.getTime() - Date.parse(rec.since)) / DAY;
    if (!(days >= cfg.minDays)) continue; // not long enough yet: no GitHub call, no Discord call
    const promo = await readPromo(cfg, id);
    if (promo?.state === "promoted" || promo?.state === "nominated") continue;
    if (promo?.state === "snoozed" && Date.parse(promo.until) > now.getTime()) continue;
    res.checked++;
    try {
      const m = await d.getMember(id);
      if (!m || m.bot || !m.roles.includes(cfg.roleCatalyst) || m.roles.includes(cfg.roleMaintainer)) continue;
      const prs = await prCount(cfg, rec.github, new Date(now.getTime() - PR_WINDOW_DAYS * DAY));
      const credits = (await readCredits(cfg, id)).filter((c) => Date.parse(c.at) >= now.getTime() - CREDIT_WINDOW_DAYS * DAY).length;
      const verdict = eligibility({ days, mergedPrs: prs, credits }, cfg);
      if (!verdict.ok) {
        res.waiting.push(`${id}: ${verdict.why}`);
        continue;
      }
      if (!opts.dry) {
        await d.post(cfg.channelPromotions, nominationMessage(cfg, id, rec, days, prs, credits, verdict.score.points));
        await writePromo(cfg, id, { state: "nominated", at: now.toISOString() });
      }
      res.nominated.push(id);
    } catch (e) {
      res.errors.push(`${id}: ${e instanceof Error ? e.message : "failed"}`);
    }
  }
  return res;
}
