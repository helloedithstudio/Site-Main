// The person-facing steps of the join flow: sign in with Discord, then with GitHub (to prove the GitHub account is theirs),
// then submit the form. Each returns a plain result, so the route handlers stay thin and the logic can be tested against a
// fake Discord, a fake GitHub and an in-memory store.
//
// No cookies: the sign-in "state", the hand-over between the two sign-ins and the form token are all signed and expire.
// The only record kept is the one-way entry store (lib/join/store.ts), plus the Catalyst role in Discord.

import type { JoinConfig } from "./config";
import { discord, type DiscordClient } from "./discord";
import { esc, validateForm } from "./form";
import { ageDays, discordCreatedMs, githubAuthorizeUrl, githubRevoke, githubToken, githubUser } from "./ghoauth";
import { storeFor, type Claim, type EntryStore } from "./store";
import { signToken, verifyToken } from "./token";
import { readDirectoryEntry, removeDirectoryEntry, writeDirectoryEntry } from "../legion/directory";
import { writeMember } from "./members";

const HOUR = 3_600_000;
export const FORM_TOKEN_HOURS = 2;
const STATE_MINUTES = 15;

export const callbackUrl = (cfg: JoinConfig) => `${cfg.siteUrl}/api/join/callback`;

/** Where to send the person to sign in with Discord (identify only: their id and username, nothing else). */
export function startUrl(cfg: JoinConfig, now = Date.now()): string {
  const state = signToken(cfg.signingSecret, { p: "state", u: "", n: "", d: "", j: "", e: now + STATE_MINUTES * 60_000 });
  const q = new URLSearchParams({ client_id: cfg.clientId, response_type: "code", redirect_uri: callbackUrl(cfg), scope: "identify", state, prompt: "none" });
  return `https://discord.com/oauth2/authorize?${q}`;
}

type Deps = { now?: number; client?: DiscordClient; store?: EntryStore };
export type CallbackResult = { redirect: string };

const to = (cfg: JoinConfig, status: string, extra = "") => ({ redirect: `${cfg.siteUrl}/join?status=${status}${extra}` });

/** Discord sends the person back here. We learn who they are, check they are in the server, then hand over to GitHub. */
export async function handleCallback(cfg: JoinConfig, params: { code?: string | null; state?: string | null; error?: string | null }, deps: Deps = {}): Promise<CallbackResult> {
  const now = deps.now ?? Date.now();
  if (params.error || !params.code) return to(cfg, "cancelled");
  if (!verifyToken(cfg.signingSecret, params.state, "state", now)) return to(cfg, "expired");
  const d = deps.client ?? discord(cfg);
  try {
    const access = await d.exchangeCode(params.code, callbackUrl(cfg));
    const user = await d.currentUser(access);
    const member = await d.getMember(user.id);
    if (!member) return to(cfg, "not-member");
    // Someone who already has the Catalyst role (given by hand, or joined before the system started) is not turned away: they
    // sign in the same way to set up their Legion profile ("profile mode"). The account age rule is for new members only.
    const catalyst = member.roles.includes(cfg.roleCatalyst);
    const dcMade = discordCreatedMs(user.id);
    if (!catalyst && cfg.minDiscordDays && ageDays(dcMade, now) < cfg.minDiscordDays) return to(cfg, "account-young", `&days=${cfg.minDiscordDays}&until=${dcMade + cfg.minDiscordDays * 86_400_000}`);

    if (cfg.requireGithub) {
      // Hand over to GitHub. Only the ids travel in the state (which GitHub sees), not the name.
      const link = signToken(cfg.signingSecret, { p: "link", u: user.id, n: "", d: "", j: member.joinedAt, e: now + STATE_MINUTES * 60_000 });
      return { redirect: githubAuthorizeUrl(cfg, link) };
    }
    const token = signToken(cfg.signingSecret, { p: "form", u: user.id, n: user.username, d: user.global_name ?? "", j: member.joinedAt, e: now + FORM_TOKEN_HOURS * HOUR, ...(catalyst ? { pm: true } : {}) });
    return { redirect: `${cfg.siteUrl}/join#t=${token}` };
  } catch {
    return to(cfg, "error");
  }
}

const conflictStatus: Record<Exclude<Claim, "ok">, string> = { "github-taken": "github-taken", "discord-linked": "discord-linked" };

/** GitHub sends the person back here. The code proves they own the account; we read the public profile once, then cancel the token. */
export async function handleGithubCallback(cfg: JoinConfig, params: { code?: string | null; state?: string | null; error?: string | null }, deps: Deps = {}): Promise<CallbackResult> {
  const now = deps.now ?? Date.now();
  if (params.error || !params.code) return to(cfg, "cancelled");
  const link = verifyToken(cfg.signingSecret, params.state, "link", now);
  if (!link) return to(cfg, "expired");
  const d = deps.client ?? discord(cfg);
  const store = deps.store ?? storeFor(cfg);
  try {
    const member = await d.getMember(link.u);
    if (!member) return to(cfg, "not-member");
    const catalyst = member.roles.includes(cfg.roleCatalyst); // profile mode, see handleCallback

    const access = await githubToken(cfg, params.code);
    const gh = await githubUser(cfg, access);
    await githubRevoke(cfg, access);
    if (gh.type !== "User") return to(cfg, "github-type");
    const ghMade = Date.parse(gh.createdAt);
    if (!catalyst && cfg.minGithubDays && ageDays(ghMade, now) < cfg.minGithubDays) return to(cfg, "github-young", `&days=${cfg.minGithubDays}&until=${ghMade + cfg.minGithubDays * 86_400_000}`);

    const verdict = await store.check(link.u, gh.id);
    if (verdict !== "ok") return to(cfg, conflictStatus[verdict]);

    const token = signToken(cfg.signingSecret, {
      p: "form",
      u: link.u,
      n: member.username,
      d: member.displayName,
      j: member.joinedAt,
      e: now + FORM_TOKEN_HOURS * HOUR,
      gh: { i: gh.id, l: gh.login, n: gh.name, c: gh.createdAt },
      ...(catalyst ? { pm: true } : {}),
    });
    return { redirect: `${cfg.siteUrl}/join#t=${token}` };
  } catch {
    return to(cfg, "error");
  }
}

export type SubmitResult = { status: number; body: { ok: boolean; message?: string; errors?: Record<string, string>; state?: string; profile?: boolean; listed?: boolean } };

const conflictMessage: Record<Exclude<Claim, "ok">, string> = {
  "github-taken": "That GitHub account is already linked to another member. Each person has one entry. If that was you, ask a Core member for help.",
  "discord-linked": "This Discord account is already linked to a different GitHub account. Sign in with the GitHub account you used before, or ask a Core member for help.",
};

export async function handleSubmit(cfg: JoinConfig, body: unknown, deps: Deps = {}): Promise<SubmitResult> {
  const now = deps.now ?? Date.now();
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const tok = verifyToken(cfg.signingSecret, b.token, "form", now);
  if (!tok || (cfg.requireGithub && !tok.gh)) return { status: 401, body: { ok: false, state: "expired", message: "Your sign-in has expired. Please start again." } };
  const form = validateForm(b.fields, { githubLogin: tok.gh?.l });
  if (!form.ok) return { status: 422, body: { ok: false, errors: form.errors } };

  const d = deps.client ?? discord(cfg);
  const store = deps.store ?? storeFor(cfg);
  try {
    const member = await d.getMember(tok.u);
    if (!member) return { status: 410, body: { ok: false, state: "removed", message: "You are no longer in the server. Join again with the link on the site, then complete the form." } };
    // Profile mode is decided here from their live Discord roles, never from the token: someone who already has the Catalyst
    // role only sets up their Legion profile. Their role is not touched, there is no deadline, and the age rules were skipped.
    const profile = member.roles.includes(cfg.roleCatalyst);

    // One person, one entry. Doing this before anything is granted; repeating it for the same pair is harmless.
    if (tok.gh) {
      const c = await store.claim(tok.u, tok.gh.i);
      if (c !== "ok") return { status: 409, body: { ok: false, state: c, message: conflictMessage[c] } };
    }

    const v = form.value;
    const due = Math.floor((Date.parse(member.joinedAt) + cfg.hours * HOUR) / 1000);
    const dcMade = Math.floor(discordCreatedMs(tok.u) / 1000);
    // The private record for the mediators.
    await d.post(cfg.channelForms, {
      allowed_mentions: { parse: [] },
      embeds: [
        {
          title: profile ? "Legion profile saved" : "New Catalyst form",
          color: profile ? 0x8a857f : 0xffbc09,
          description: `<@${tok.u}> (${esc(tok.n)})`,
          fields: [
            { name: "Name", value: esc(v.name), inline: true },
            { name: "GitHub", value: `https://github.com/${v.github}${tok.gh ? " (verified)" : ""}`, inline: true },
            { name: "Areas", value: v.interests.join(", ") },
            ...(v.portfolio ? [{ name: "Portfolio", value: v.portfolio }] : []),
            ...(v.about ? [{ name: "Building", value: esc(v.about) }] : []),
            { name: "Public listing", value: v.listPublicly ? "Asked to be listed on the Legion page" : "Not listed (private)" },
            { name: "Accounts", value: `Discord made <t:${dcMade}:D>${tok.gh?.c ? `, GitHub made <t:${Math.floor(Date.parse(tok.gh.c) / 1000)}:D>` : ""}` },
            ...(profile ? [{ name: "Already a Catalyst", value: "Profile only, no role was changed" }] : [{ name: "Deadline was", value: `<t:${due}:F>` }]),
          ],
        },
      ],
    });
    if (!profile) {
      await d.addRole(tok.u, cfg.roleCatalyst, "Catalyst form completed");
      await d.removeRole(tok.u, cfg.rolePending, "Catalyst form completed");
      if (cfg.roleReminded) await d.removeRole(tok.u, cfg.roleReminded, "Catalyst form completed");
    }
    // Best effort from here: a database hiccup never fails the form itself, since the record in Discord (and the role, for a
    // new member) already went through.
    // The member record is what lets Friday look at their GitHub work for a promotion nomination later.
    await writeMember(cfg, tok.u, { github: v.github, name: v.name, since: profile ? member.joinedAt : new Date(now).toISOString(), listed: v.listPublicly }).catch(() => {});
    const prior = await readDirectoryEntry(cfg, v.github);
    if (v.listPublicly) {
      // Keep what the form does not set (a Maintainer role after a promotion, a booking link, the original join date).
      const keep = { ...(prior?.role ? { role: prior.role } : {}), ...(prior?.booking ? { booking: prior.booking } : {}), ...(prior?.discord ? { discord: prior.discord } : {}) };
      const joined = prior?.joined ?? (profile ? member.joinedAt : new Date(now).toISOString()).slice(0, 10);
      await writeDirectoryEntry(cfg, { ...keep, github: v.github, name: v.name, interests: v.interests, portfolio: v.portfolio, x: v.x, note: v.about, joined }).catch(() => {});
    } else if (profile && prior) {
      // An existing Catalyst who unticks "show me" is taken off the page now. (Someone with a Maintainer role keeps their entry.)
      if (!prior.role || prior.role === "Catalyst") await removeDirectoryEntry(cfg, v.github).catch(() => {});
    }
    return { status: 200, body: { ok: true, state: "done", ...(profile ? { profile: true, listed: v.listPublicly } : {}) } };
  } catch {
    return { status: 502, body: { ok: false, message: "We could not save your form just now. Please try again in a minute." } };
  }
}
