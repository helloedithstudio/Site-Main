// Sign in with GitHub, to prove the person owns the GitHub account they name. No scope is requested, so the app can only
// read the public profile (id, username, display name, when the account was created). The access token is used once and
// then revoked. Server only.

import type { JoinConfig } from "./config";

export type GithubUser = { id: string; login: string; name: string; createdAt: string; type: string };

export const githubCallbackUrl = (cfg: JoinConfig) => `${cfg.siteUrl}/api/join/github/callback`;

export function githubAuthorizeUrl(cfg: JoinConfig, state: string): string {
  const q = new URLSearchParams({ client_id: cfg.githubClientId ?? "", redirect_uri: githubCallbackUrl(cfg), state, allow_signup: "false" });
  return `${cfg.githubOauthBase}/login/oauth/authorize?${q}`;
}

const headers = (extra: Record<string, string> = {}) => ({ Accept: "application/json", "User-Agent": "edith-site", ...extra });

/** Trades the one-time code for a short-lived token. */
export async function githubToken(cfg: JoinConfig, code: string): Promise<string> {
  const res = await fetch(`${cfg.githubOauthBase}/login/oauth/access_token`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ client_id: cfg.githubClientId, client_secret: cfg.githubClientSecret, code, redirect_uri: githubCallbackUrl(cfg) }),
    signal: AbortSignal.timeout(10_000),
  });
  const j = (await res.json().catch(() => ({}))) as { access_token?: string };
  if (!res.ok || typeof j.access_token !== "string") throw new Error("GitHub did not accept the sign-in");
  return j.access_token;
}

export async function githubUser(cfg: JoinConfig, token: string): Promise<GithubUser> {
  const res = await fetch(`${cfg.githubApiBase}/user`, { headers: headers({ Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28" }), signal: AbortSignal.timeout(10_000) });
  const u = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || typeof u.id !== "number" || typeof u.login !== "string") throw new Error("GitHub did not return a profile");
  return {
    id: String(u.id),
    login: u.login,
    name: typeof u.name === "string" ? u.name : "",
    createdAt: typeof u.created_at === "string" ? u.created_at : "",
    type: typeof u.type === "string" ? u.type : "",
  };
}

/** Best effort: the token is not needed after the profile is read, so it is cancelled. Failure is ignored. */
export async function githubRevoke(cfg: JoinConfig, token: string): Promise<void> {
  try {
    const basic = Buffer.from(`${cfg.githubClientId}:${cfg.githubClientSecret}`).toString("base64");
    await fetch(`${cfg.githubApiBase}/applications/${encodeURIComponent(cfg.githubClientId ?? "")}/token`, {
      method: "DELETE",
      headers: headers({ Authorization: `Basic ${basic}`, "Content-Type": "application/json" }),
      body: JSON.stringify({ access_token: token }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    /* nothing to do */
  }
}

/** A Discord id (a "snowflake") carries the time the account was made. */
export const discordCreatedMs = (id: string): number => (/^\d{5,25}$/.test(id) ? Number((BigInt(id) >> BigInt(22)) + BigInt(1420070400000)) : 0);

export const ageDays = (thenMs: number, nowMs: number) => (nowMs - thenMs) / 86_400_000;
