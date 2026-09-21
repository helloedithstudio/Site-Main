// The person-facing steps of the join flow: sign in with Discord (start, callback) and submit the form. Each returns
// a plain result, so the route handlers stay thin and the logic can be tested against a fake Discord.
//
// No cookies and no database: the sign-in "state" and the form token are signed and expire, and the only record of who
// has finished is the Catalyst role in Discord.

import type { JoinConfig } from "./config";
import { discord, type DiscordClient } from "./discord";
import { esc, validateForm } from "./form";
import { signToken, verifyToken } from "./token";

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

export type CallbackResult = { redirect: string };

export async function handleCallback(cfg: JoinConfig, params: { code?: string | null; state?: string | null; error?: string | null }, opts: { now?: number; client?: DiscordClient } = {}): Promise<CallbackResult> {
  const now = opts.now ?? Date.now();
  const to = (status: string) => ({ redirect: `${cfg.siteUrl}/join?status=${status}` });
  if (params.error || !params.code) return to("cancelled");
  if (!verifyToken(cfg.signingSecret, params.state, "state", now)) return to("expired");
  const d = opts.client ?? discord(cfg);
  try {
    const access = await d.exchangeCode(params.code, callbackUrl(cfg));
    const user = await d.currentUser(access);
    const member = await d.getMember(user.id);
    if (!member) return to("not-member");
    if (member.roles.includes(cfg.roleCatalyst)) return to("done");
    const token = signToken(cfg.signingSecret, {
      p: "form",
      u: user.id,
      n: user.username,
      d: user.global_name ?? "",
      j: member.joinedAt,
      e: now + FORM_TOKEN_HOURS * HOUR,
    });
    // The token travels in the address fragment (after #), which browsers never send to any server or write to logs.
    return { redirect: `${cfg.siteUrl}/join#t=${token}` };
  } catch {
    return to("error");
  }
}

export type SubmitResult = { status: number; body: { ok: boolean; message?: string; errors?: Record<string, string>; state?: string } };

export async function handleSubmit(cfg: JoinConfig, body: unknown, opts: { now?: number; client?: DiscordClient } = {}): Promise<SubmitResult> {
  const now = opts.now ?? Date.now();
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const tok = verifyToken(cfg.signingSecret, b.token, "form", now);
  if (!tok) return { status: 401, body: { ok: false, state: "expired", message: "Your sign-in has expired. Please start again." } };
  const form = validateForm(b.fields);
  if (!form.ok) return { status: 422, body: { ok: false, errors: form.errors } };

  const d = opts.client ?? discord(cfg);
  try {
    const member = await d.getMember(tok.u);
    if (!member) return { status: 410, body: { ok: false, state: "removed", message: "You are no longer in the server. Join again with the link on the site, then complete the form." } };
    if (member.roles.includes(cfg.roleCatalyst)) return { status: 200, body: { ok: true, state: "done", message: "You are already a Catalyst." } };

    const v = form.value;
    const due = Math.floor((Date.parse(member.joinedAt) + cfg.hours * HOUR) / 1000);
    // The private record for the mediators. Nothing is stored on the website.
    await d.post(cfg.channelForms, {
      allowed_mentions: { parse: [] },
      embeds: [
        {
          title: "New Catalyst form",
          color: 0xffbc09,
          description: `<@${tok.u}> (${esc(tok.n)})`,
          fields: [
            { name: "Name", value: esc(v.name), inline: true },
            { name: "GitHub", value: `https://github.com/${v.github}`, inline: true },
            { name: "Areas", value: v.interests.join(", ") },
            ...(v.portfolio ? [{ name: "Portfolio", value: v.portfolio }] : []),
            ...(v.about ? [{ name: "Building", value: esc(v.about) }] : []),
            { name: "Public listing", value: v.listPublicly ? "Asked to be listed on the Legion page" : "Not listed (private)" },
            { name: "Deadline was", value: `<t:${due}:F>` },
          ],
        },
      ],
    });
    await d.addRole(tok.u, cfg.roleCatalyst, "Catalyst form completed");
    await d.removeRole(tok.u, cfg.rolePending, "Catalyst form completed");
    if (cfg.roleReminded) await d.removeRole(tok.u, cfg.roleReminded, "Catalyst form completed");
    return { status: 200, body: { ok: true, state: "done" } };
  } catch {
    return { status: 502, body: { ok: false, message: "We could not save your form just now. Please try again in a minute." } };
  }
}
