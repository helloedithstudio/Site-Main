// A small Discord REST client for the join flow (roles, members, messages, OAuth). Server only. It uses the built-in
// fetch, retries once or twice when Discord asks to slow down, and never logs the bot token.

import type { JoinConfig } from "./config";
import type { Member } from "./plan";

export class DiscordError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Call = { json?: unknown; form?: Record<string, string>; bearer?: string; reason?: string };
type Raw = { user: { id: string; username: string; bot?: boolean; global_name?: string | null }; roles: string[]; joined_at: string };

const toMember = (m: Raw): Member => ({ id: m.user.id, roles: m.roles ?? [], joinedAt: m.joined_at, bot: !!m.user.bot, username: m.user.username });

export type Message = { content?: string; embeds?: unknown[]; allowed_mentions?: unknown };

export function discord(cfg: JoinConfig) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Discord replies are read field by field and checked at the point of use
  async function call(method: string, path: string, opts: Call = {}): Promise<{ status: number; data: any }> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const headers: Record<string, string> = { "User-Agent": `DiscordBot (${cfg.siteUrl}, 1.0)` };
      let body: string | undefined;
      if (opts.form) {
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        body = new URLSearchParams(opts.form).toString();
      } else if (opts.json !== undefined) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(opts.json);
      }
      if (opts.bearer) headers.Authorization = `Bearer ${opts.bearer}`;
      else if (!opts.form) headers.Authorization = `Bot ${cfg.botToken}`;
      if (opts.reason) headers["X-Audit-Log-Reason"] = encodeURIComponent(opts.reason);
      const res = await fetch(cfg.apiBase + path, { method, headers, body, signal: AbortSignal.timeout(10_000) });
      if (res.status === 429) {
        const j = (await res.json().catch(() => ({}))) as { retry_after?: number };
        await new Promise((r) => setTimeout(r, Math.min(5000, Math.max(200, (j.retry_after ?? 1) * 1000))));
        continue;
      }
      const text = await res.text();
      let data: unknown = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }
      return { status: res.status, data };
    }
    throw new DiscordError(429, "Discord is rate limiting this app");
  }

  const ok = (r: { status: number }) => r.status >= 200 && r.status < 300;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const must = (r: { status: number; data: any }, what: string) => {
    if (!ok(r)) throw new DiscordError(r.status, `${what} failed (${r.status})`);
    return r.data;
  };
  const g = `/guilds/${cfg.guildId}`;

  return {
    async ownerId(): Promise<string | undefined> {
      return must(await call("GET", g), "reading the server")?.owner_id;
    },
    async listMembers(): Promise<Member[]> {
      const out: Member[] = [];
      let after = "0";
      for (let page = 0; page < 50; page++) {
        const rows = must(await call("GET", `${g}/members?limit=1000&after=${after}`), "listing members") as Raw[];
        out.push(...rows.map(toMember));
        if (rows.length < 1000) break;
        after = rows[rows.length - 1].user.id;
      }
      return out;
    },
    async getMember(id: string): Promise<(Member & { displayName: string }) | null> {
      const r = await call("GET", `${g}/members/${encodeURIComponent(id)}`);
      if (r.status === 404) return null;
      const m = must(r, "reading a member") as Raw;
      return { ...toMember(m), displayName: m.user.global_name ?? "" };
    },
    async addRole(id: string, role: string, reason: string) {
      must(await call("PUT", `${g}/members/${id}/roles/${role}`, { reason }), "adding a role");
    },
    async removeRole(id: string, role: string, reason: string) {
      const r = await call("DELETE", `${g}/members/${id}/roles/${role}`, { reason });
      if (r.status !== 404) must(r, "removing a role");
    },
    async kick(id: string, reason: string) {
      const r = await call("DELETE", `${g}/members/${id}`, { reason });
      if (r.status !== 404) must(r, "removing a member");
    },
    /** True if the message was delivered; false if the person has direct messages closed or cannot be reached. */
    async dm(userId: string, msg: Message): Promise<boolean> {
      const ch = await call("POST", "/users/@me/channels", { json: { recipient_id: userId } });
      if (!ok(ch) || !ch.data?.id) return false;
      return ok(await call("POST", `/channels/${ch.data.id}/messages`, { json: msg }));
    },
    async post(channelId: string, msg: Message) {
      must(await call("POST", `/channels/${channelId}/messages`, { json: msg }), "posting a message");
    },
    async exchangeCode(code: string, redirectUri: string): Promise<string> {
      const data = must(
        await call("POST", "/oauth2/token", {
          form: { client_id: cfg.clientId, client_secret: cfg.clientSecret, grant_type: "authorization_code", code, redirect_uri: redirectUri },
        }),
        "signing in with Discord",
      );
      if (typeof data?.access_token !== "string") throw new DiscordError(502, "Discord sent no access token");
      return data.access_token;
    },
    async currentUser(accessToken: string): Promise<{ id: string; username: string; global_name: string | null }> {
      const u = must(await call("GET", "/users/@me", { bearer: accessToken }), "reading your Discord profile");
      if (typeof u?.id !== "string") throw new DiscordError(502, "Discord sent no user");
      return { id: u.id, username: String(u.username ?? ""), global_name: u.global_name ?? null };
    },
  };
}

export type DiscordClient = ReturnType<typeof discord>;
