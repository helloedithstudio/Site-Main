// A fake Discord, GitHub and Redis in one small HTTP server, for the join and promotion tests (scripts/*-test.ts) and for
// browser runs (scripts/fakes/serve.ts). It keeps members, roles, messages and removals in memory and answers the same
// endpoints the real clients in lib/join call, so the real code runs unchanged against it.

import http from "node:http";

export type FM = { user: { id: string; username: string; bot?: boolean; global_name?: string | null }; roles: string[]; joined_at: string };

/** `ago` says what time "N hours ago" is; tests pass a fixed clock, a browser run uses the real one. */
export function fakeDiscord(opts: { ago?: (hoursAgo: number) => string } = {}) {
  const ago = opts.ago ?? ((h: number) => new Date(Date.now() - h * 3_600_000).toISOString());
  const members = new Map<string, FM>();
  const dmClosed = new Set<string>();
  const messages: { channel: string; body: any }[] = [];
  const kicked: { id: string; reason: string }[] = [];
  // `ghAuthAs` is only for browser runs: GitHub's consent page does not exist here, so the fake approves as this GitHub id.
  const state = { owner: "owner-1", ghAuthAs: "501" };
  const ghUsers = new Map<string, { login: string; name: string; created_at: string; type: string }>();
  const revoked: string[] = [];
  const redis = new Map<string, string>();
  const redisSets = new Map<string, Set<string>>();
  const redisCalls: string[][] = [];
  const add = (id: string, hoursAgo: number, roles: string[] = [], extra: Partial<FM["user"]> = {}) =>
    members.set(id, { user: { id, username: "user" + id, ...extra }, roles: [...roles], joined_at: ago(hoursAgo) });
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url!, "http://x");
    const send = (status: number, body?: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(body === undefined ? "" : JSON.stringify(body));
    };
    let raw = "";
    for await (const c of req) raw += c;
    const auth = req.headers.authorization ?? "";
    const path = url.pathname.replace(/^\/api\/v10/, "");
    if (path === "/gh/login/oauth/authorize" && req.method === "GET") {
      const back = new URL(url.searchParams.get("redirect_uri") ?? "http://x/");
      back.searchParams.set("code", "gh-" + state.ghAuthAs);
      back.searchParams.set("state", url.searchParams.get("state") ?? "");
      res.writeHead(302, { Location: back.toString() });
      return res.end();
    }
    if (path === "/gh/login/oauth/access_token" && req.method === "POST") {
      const code = String(JSON.parse(raw).code ?? "");
      return /^gh-\d+$/.test(code) && ghUsers.has(code.slice(3)) ? send(200, { access_token: "ghtok-" + code.slice(3) }) : send(200, { error: "bad_verification_code" });
    }
    if (path === "/ghapi/user" && auth.startsWith("Bearer ghtok-")) {
      const id = auth.replace("Bearer ghtok-", "");
      const u = ghUsers.get(id);
      return u ? send(200, { id: Number(id), ...u }) : send(401, { message: "Bad credentials" });
    }
    if (path.startsWith("/ghapi/applications/") && req.method === "DELETE") { revoked.push(JSON.parse(raw).access_token); return send(204); }
    if (path === "/redis" && req.method === "POST") {
      if (auth !== "Bearer store-token") return send(401, { error: "unauthorized" });
      const cmd: string[] = JSON.parse(raw).map(String);
      redisCalls.push(cmd);
      const [op, ...a] = cmd;
      if (op === "SET") { if (a.includes("NX") && redis.has(a[0])) return send(200, { result: null }); redis.set(a[0], a[1]); return send(200, { result: "OK" }); }
      if (op === "GET") return send(200, { result: redis.get(a[0]) ?? null });
      if (op === "MGET") return send(200, { result: a.map((k) => redis.get(k) ?? null) });
      if (op === "DEL") return send(200, { result: a.reduce((n, k) => n + (redis.delete(k) ? 1 : 0), 0) });
      if (op === "SADD") { const s = redisSets.get(a[0]) ?? new Set<string>(); const before = s.size; a.slice(1).forEach((v) => s.add(v)); redisSets.set(a[0], s); return send(200, { result: s.size - before }); }
      if (op === "SMEMBERS") return send(200, { result: [...(redisSets.get(a[0]) ?? [])] });
      if (op === "SREM") { const s = redisSets.get(a[0]); const before = s?.size ?? 0; a.slice(1).forEach((v) => s?.delete(v)); return send(200, { result: before - (s?.size ?? 0) }); }
      return send(200, { error: "ERR unknown command" });
    }
    if (path === "/oauth2/token" && req.method === "POST") {
      const code = new URLSearchParams(raw).get("code") ?? "";
      return code.startsWith("code-") ? send(200, { access_token: "tok-" + code }) : send(400, { error: "invalid_grant" });
    }
    if (path === "/users/@me" && auth.startsWith("Bearer tok-code-")) {
      const id = auth.replace("Bearer tok-code-", "");
      return send(200, { id, username: "user" + id, global_name: "Name " + id });
    }
    if (auth !== "Bot test-token") return send(401, { message: "401: Unauthorized" });
    const m = path.match(/^\/guilds\/G(\/.*)?$/);
    if (m) {
      const rest = m[1] ?? "";
      if (rest === "") return send(200, { owner_id: state.owner });
      if (rest === "/members" && req.method === "GET") {
        const after = url.searchParams.get("after") ?? "0";
        const rows = [...members.values()].filter((x) => x.user.id > after).sort((a, b) => (a.user.id < b.user.id ? -1 : 1)).slice(0, Number(url.searchParams.get("limit") ?? 1000));
        return send(200, rows);
      }
      const one = rest.match(/^\/members\/([^/]+)(?:\/roles\/([^/]+))?$/);
      if (one) {
        const mem = members.get(one[1]);
        if (req.method === "GET") return mem ? send(200, mem) : send(404, { message: "Unknown Member" });
        if (!mem) return send(404, { message: "Unknown Member" });
        if (one[2] && req.method === "PUT") { if (!mem.roles.includes(one[2])) mem.roles.push(one[2]); return send(204); }
        if (one[2] && req.method === "DELETE") { mem.roles = mem.roles.filter((r) => r !== one[2]); return send(204); }
        if (req.method === "DELETE") { members.delete(one[1]); kicked.push({ id: one[1], reason: decodeURIComponent(String(req.headers["x-audit-log-reason"] ?? "")) }); return send(204); }
      }
    }
    if (path === "/users/@me/channels" && req.method === "POST") return send(200, { id: "dm-" + JSON.parse(raw).recipient_id });
    const msg = path.match(/^\/channels\/([^/]+)\/messages$/);
    if (msg && req.method === "POST") {
      if (msg[1].startsWith("dm-") && dmClosed.has(msg[1].slice(3))) return send(403, { code: 50007, message: "Cannot send messages to this user" });
      messages.push({ channel: msg[1], body: JSON.parse(raw) });
      return send(200, { id: "m" + messages.length });
    }
    send(404, { message: "Not found " + path });
  });
  return { members, dmClosed, messages, kicked, state, add, server, ghUsers, revoked, redis, redisSets, redisCalls };
}
