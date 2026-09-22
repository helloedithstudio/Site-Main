// Tests for the Catalyst join flow against a fake Discord server. Run:  npx tsx scripts/join-test.ts
// The fake keeps members, roles, messages and removals in memory and answers the same endpoints the real client calls.

import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { joinConfig, type JoinConfig } from "../lib/join/config";
import { planSweep, type Member } from "../lib/join/plan";
import { signToken, verifyToken } from "../lib/join/token";
import { clean, esc, validateForm } from "../lib/join/form";
import { runSweep, MAX_KICKS_PER_RUN } from "../lib/join/sweep";
import { handleCallback, handleGithubCallback, handleSubmit, startUrl } from "../lib/join/flow";
import { entryStore, memoryRun, upstash, type EntryStore } from "../lib/join/store";
import { readDirectory, removeDirectoryEntry, writeDirectoryEntry } from "../lib/legion/directory";
import { discordCreatedMs } from "../lib/join/ghoauth";
import { isReservedName } from "../lib/join/form";

let passed = 0;
const t = async (name: string, fn: () => void | Promise<void>) => {
  try {
    await fn();
    passed++;
    console.log("PASS  " + name);
  } catch (e) {
    console.log("FAIL  " + name + "\n      " + (e instanceof Error ? e.message : e));
    process.exitCode = 1;
  }
};

const HOUR = 3_600_000;
const NOW = new Date("2026-09-22T12:00:00Z");
const ago = (h: number) => new Date(NOW.getTime() - h * HOUR).toISOString();
const START = new Date("2026-09-20T00:00:00Z");
const R = { catalyst: "r-cat", pending: "r-pend", reminded: "r-rem", exempt: "r-core" };

// ---------------------------------------------------------------- fake Discord
type FM = { user: { id: string; username: string; bot?: boolean; global_name?: string | null }; roles: string[]; joined_at: string };
function fakeDiscord() {
  const members = new Map<string, FM>();
  const dmClosed = new Set<string>();
  const messages: { channel: string; body: any }[] = [];
  const kicked: { id: string; reason: string }[] = [];
  const state = { owner: "owner-1" };
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

(async () => {
  const fake = fakeDiscord();
  await new Promise<void>((r) => fake.server.listen(0, r));
  const port = (fake.server.address() as AddressInfo).port;
  const env = {
    DISCORD_BOT_TOKEN: "test-token",
    DISCORD_CLIENT_ID: "client-1",
    DISCORD_CLIENT_SECRET: "client-secret",
    DISCORD_GUILD_ID: "G",
    DISCORD_ROLE_CATALYST: R.catalyst,
    DISCORD_ROLE_PENDING: R.pending,
    DISCORD_ROLE_REMINDED: R.reminded,
    DISCORD_ROLES_EXEMPT: R.exempt,
    DISCORD_CHANNEL_FORMS: "forms",
    DISCORD_CHANNEL_WELCOME: "welcome",
    JOIN_SIGNING_SECRET: "s".repeat(40),
    CRON_SECRET: "c".repeat(30),
    ONBOARDING_START: START.toISOString(),
    ONBOARDING_DRY_RUN: "false",
    DISCORD_API_BASE: `http://127.0.0.1:${port}/api/v10`,
    GITHUB_OAUTH_BASE: `http://127.0.0.1:${port}/gh`,
    GITHUB_API_BASE: `http://127.0.0.1:${port}/ghapi`,
    GITHUB_CLIENT_ID: "gh-client",
    GITHUB_CLIENT_SECRET: "gh-secret",
    JOIN_ID_SECRET: "i".repeat(40),
    UPSTASH_REDIS_REST_URL: `http://127.0.0.1:${port}/redis`,
    UPSTASH_REDIS_REST_TOKEN: "store-token",
    NEXT_PUBLIC_SITE_URL: "https://site.test",
  };
  const cfgOf = (over: Record<string, string | undefined> = {}): JoinConfig => {
    const c = joinConfig({ ...env, ...over });
    if (!c.ok) throw new Error("config: " + c.missing.join(", "));
    return c.cfg;
  };

  // ------------------------------------------------------------ config
  await t("config: missing settings are listed, short secrets rejected", () => {
    const c = joinConfig({ ...env, DISCORD_BOT_TOKEN: "", JOIN_SIGNING_SECRET: "short" });
    assert.equal(c.ok, false);
    if (!c.ok) assert.ok(c.missing.some((m) => m === "DISCORD_BOT_TOKEN") && c.missing.some((m) => m.startsWith("JOIN_SIGNING_SECRET")));
  });
  await t("config: dry run is the default and only the exact word false turns it off", () => {
    assert.equal(cfgOf({ ONBOARDING_DRY_RUN: undefined }).dryRun, true);
    assert.equal(cfgOf({ ONBOARDING_DRY_RUN: "no" }).dryRun, true);
    assert.equal(cfgOf({ ONBOARDING_DRY_RUN: "false" }).dryRun, false);
    assert.equal(cfgOf({ ONBOARDING_START: undefined }).startAt, null);
  });

  // ------------------------------------------------------------ plan
  const pc = { roleCatalyst: R.catalyst, rolePending: R.pending, roleReminded: R.reminded, rolesExempt: [R.exempt], ownerId: "owner-1", startAt: START, hours: 24 };
  const mem = (id: string, h: number, roles: string[] = [], bot = false): Member => ({ id, roles, joinedAt: ago(h), bot, username: id });
  await t("plan: nothing happens until a start time is set", () => {
    const p = planSweep([mem("a", 1)], NOW, { ...pc, startAt: null });
    assert.deepEqual([p.invite.length, p.remind.length, p.kick.length, p.missed.length], [0, 0, 0, 0]);
  });
  await t("plan: never touches bots, the owner, exempt roles, Catalysts, or people who joined before the start", () => {
    const list = [mem("bot", 30, [R.pending], true), mem("owner-1", 30, [R.pending]), mem("core", 30, [R.pending, R.exempt]), mem("cat", 30, [R.pending, R.catalyst]), mem("old", 24 * 5, [R.pending])];
    const p = planSweep(list, NOW, pc);
    assert.equal(p.kick.length + p.invite.length + p.remind.length + p.missed.length, 0);
    assert.equal(p.skipped, 5);
  });
  await t("plan: invite, remind, remove and missed follow the window", () => {
    const list = [mem("new", 1), mem("half", 12), mem("late", 12.1), mem("wait", 10, [R.pending]), mem("soon", 19, [R.pending]), mem("soon-done", 19, [R.pending, R.reminded]), mem("due", 24, [R.pending]), mem("over", 30, [R.pending])];
    const p = planSweep(list, NOW, pc);
    assert.deepEqual(p.invite.map((m) => m.id), ["new", "half"]);
    assert.deepEqual(p.missed.map((m) => m.id), ["late"]);
    assert.deepEqual(p.remind.map((m) => m.id), ["soon"]);
    assert.deepEqual(p.kick.map((m) => m.id), ["due", "over"]);
  });
  await t("plan: without a Reminded role, no reminders are planned", () => {
    const p = planSweep([mem("soon", 19, [R.pending])], NOW, { ...pc, roleReminded: undefined });
    assert.equal(p.remind.length, 0);
  });

  // ------------------------------------------------------------ token
  const secret = "s".repeat(40);
  const base = { u: "1", n: "n", d: "", j: ago(1) };
  await t("token: signed tokens verify, and fail when tampered, expired, wrong purpose or wrong secret", () => {
    const tok = signToken(secret, { p: "form", ...base, e: NOW.getTime() + HOUR });
    assert.equal(verifyToken(secret, tok, "form", NOW.getTime())?.u, "1");
    assert.equal(verifyToken(secret, tok, "state", NOW.getTime()), null);
    assert.equal(verifyToken("x".repeat(40), tok, "form", NOW.getTime()), null);
    assert.equal(verifyToken(secret, tok, "form", NOW.getTime() + 2 * HOUR), null);
    const [b, s] = tok.split(".");
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(b, "base64url").toString()), u: "999" })).toString("base64url");
    assert.equal(verifyToken(secret, `${forged}.${s}`, "form", NOW.getTime()), null);
    assert.equal(verifyToken(secret, "garbage", "form"), null);
    assert.equal(verifyToken(secret, 42, "form"), null);
  });

  // ------------------------------------------------------------ form
  const good = { name: "  Ada  Lovelace ", github: "https://github.com/ada-l", interests: ["AI", "Nope", "Web3"], portfolio: "ada.dev", x: "@ada_lovelace", about: "Building a\nCLI.", listPublicly: true, rulesAck: true, website: "" };
  await t("form: a valid submission is cleaned", () => {
    const r = validateForm(good);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.name, "Ada Lovelace");
      assert.equal(r.value.github, "ada-l");
      assert.deepEqual(r.value.interests, ["Web3", "AI"]);
      assert.equal(r.value.portfolio, "https://ada.dev/");
      assert.equal(r.value.x, "ada_lovelace");
      assert.equal(r.value.about, "Building a CLI.");
      assert.equal(r.value.listPublicly, true);
    }
  });
  await t("form: an X handle is cleaned, accepts a profile URL, and an invalid one is refused", () => {
    assert.equal(validateForm({ ...good, x: "https://x.com/ada_lovelace" }).ok && true, true);
    const r = validateForm({ ...good, x: "not a handle!" });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.errors.x, /X handle/);
    const empty = validateForm({ ...good, x: "" });
    assert.equal(empty.ok && empty.value.x, undefined);
  });
  await t("form: bad input is refused with messages, and public listing defaults to no", () => {
    const r = validateForm({ name: "", github: "not a user!", interests: [], portfolio: "javascript:alert(1)", rulesAck: false });
    assert.equal(r.ok, false);
    if (!r.ok) assert.deepEqual(Object.keys(r.errors).sort(), ["github", "interests", "name", "portfolio", "rulesAck"]);
    const ok = validateForm({ ...good, listPublicly: undefined });
    assert.equal(ok.ok && ok.value.listPublicly, false);
  });
  await t("form: the hidden trap field rejects bots; control characters are stripped; markdown and mentions are neutralised", () => {
    assert.equal(validateForm({ ...good, website: "http://spam" }).ok, false);
    assert.equal(clean("a\u0000b‮c\n\td", 50), "a b c d");
    assert.ok(!esc("@everyone <@1> **x**").includes("@e"));
    assert.ok(esc("**x**").startsWith("\\*"));
  });

  // ------------------------------------------------------------ sweep
  const cfg = cfgOf();
  const reset = () => {
    fake.members.clear(); fake.dmClosed.clear(); fake.messages.length = 0; fake.kicked.length = 0;
  };
  const seed = () => {
    reset();
    fake.add("owner-1", 200, [], {});
    fake.add("bot-1", 1, [], { bot: true });
    fake.add("old-1", 24 * 6, []);
    fake.add("cat-1", 30, [R.catalyst]);
    fake.add("core-1", 30, [R.exempt]);
    fake.add("a-new", 1);
    fake.add("b-dmoff", 2);
    fake.dmClosed.add("b-dmoff");
    fake.add("c-soon", 19, [R.pending]);
    fake.add("d-due", 25, [R.pending]);
    fake.add("e-missed", 15);
    fake.add("f-wait", 8, [R.pending]);
  };
  await t("sweep: a dry run reports what it would do and changes nothing", async () => {
    seed();
    const r = await runSweep(cfgOf({ ONBOARDING_DRY_RUN: undefined }), { now: NOW });
    assert.equal(r.dryRun, true);
    assert.deepEqual(r.invited.sort(), ["a-new", "b-dmoff"]);
    assert.deepEqual(r.removed, ["d-due"]);
    assert.equal(fake.kicked.length + fake.messages.length, 0);
    assert.ok(!fake.members.get("a-new")!.roles.includes(R.pending));
    const forced = await runSweep(cfg, { now: NOW, forceDry: true });
    assert.equal(forced.dryRun, true);
    assert.equal(fake.kicked.length, 0);
  });
  await t("sweep: live run invites, pings when DMs are closed, reminds once, removes the overdue, and skips everyone else", async () => {
    seed();
    const r = await runSweep(cfg, { now: NOW });
    assert.deepEqual(r.errors, []);
    assert.deepEqual(r.invited.sort(), ["a-new", "b-dmoff"]);
    assert.deepEqual(r.reminded, ["c-soon"]);
    assert.deepEqual(r.removed, ["d-due"]);
    assert.deepEqual(r.missed, ["e-missed"]);
    assert.ok(fake.members.get("a-new")!.roles.includes(R.pending));
    assert.ok(fake.members.get("c-soon")!.roles.includes(R.reminded));
    assert.ok(!fake.members.has("d-due"));
    assert.match(fake.kicked[0].reason, /not completed within 24 hours/);
    for (const keep of ["owner-1", "bot-1", "old-1", "cat-1", "core-1", "e-missed", "f-wait"]) assert.ok(fake.members.has(keep), keep + " must still be in the server");
    const dmA = fake.messages.find((m) => m.channel === "dm-a-new");
    assert.match(dmA!.body.content, /https:\/\/site\.test\/join/);
    assert.match(dmA!.body.content, /removed from the server automatically/);
    const ping = fake.messages.find((m) => m.channel === "welcome");
    assert.match(ping!.body.content, /<@b-dmoff>/);
    assert.deepEqual(ping!.body.allowed_mentions, { users: ["b-dmoff"] });
    assert.ok(fake.messages.some((m) => m.channel === "dm-d-due" && /removed from edith/.test(m.body.content)));
  });
  await t("sweep: a second run does not message or remove anyone again", async () => {
    const before = fake.messages.length;
    const r = await runSweep(cfg, { now: NOW });
    assert.deepEqual([r.invited.length, r.reminded.length, r.removed.length], [0, 0, 0]);
    assert.equal(fake.messages.length, before);
  });
  await t("sweep: more removals than the safety limit removes nobody and says so", async () => {
    reset();
    for (let i = 0; i < MAX_KICKS_PER_RUN + 1; i++) fake.add("x" + String(i).padStart(2, "0"), 30, [R.pending]);
    const r = await runSweep(cfg, { now: NOW });
    assert.equal(r.removed.length, 0);
    assert.equal(fake.kicked.length, 0);
    assert.match(r.errors[0], /safety limit/);
  });
  await t("sweep: without a start time nothing is done", async () => {
    seed();
    const r = await runSweep(cfgOf({ ONBOARDING_START: undefined }), { now: NOW });
    assert.equal(r.ran, false);
    assert.equal(fake.kicked.length + fake.messages.length, 0);
  });

  // ------------------------------------------------------------ settings, names, ages, store
  await t("config: the entry store, ID secret and GitHub sign-in are required; GitHub can be switched off; Vercel KV names work", () => {
    const c = joinConfig({ ...env, UPSTASH_REDIS_REST_URL: "", JOIN_ID_SECRET: "x", GITHUB_CLIENT_ID: "" });
    assert.equal(c.ok, false);
    if (!c.ok) assert.ok(c.missing.some((m) => m.startsWith("UPSTASH_REDIS_REST_URL")) && c.missing.some((m) => m.startsWith("JOIN_ID_SECRET")) && c.missing.includes("GITHUB_CLIENT_ID"));
    assert.equal(joinConfig({ ...env, GITHUB_CLIENT_ID: "", GITHUB_CLIENT_SECRET: "", JOIN_REQUIRE_GITHUB: "false" }).ok, true);
    assert.equal(joinConfig({ ...env, UPSTASH_REDIS_REST_URL: "", UPSTASH_REDIS_REST_TOKEN: "", KV_REST_API_URL: "https://x", KV_REST_API_TOKEN: "t" }).ok, true);
  });
  await t("names: edith, staff words and Maintainer names are reserved; ordinary names are not", () => {
    for (const n of ["Edith", "edith studio", "E.D.I.T.H", "Admin", "moderator", "Kevin Andrew", "kevin  andrew", "Andrew-Kevin-007", "Core"]) assert.equal(isReservedName(n), true, n);
    for (const n of ["Ada Lovelace", "Kevin", "Priya", "Andrew"]) assert.equal(isReservedName(n), false, n);
    const r = validateForm({ ...good, name: "Kevin Andrew" });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.errors.name, /reserved/);
  });
  await t("ages: a Discord id carries the time the account was made", () => {
    assert.equal(new Date(discordCreatedMs("175928847299117063")).toISOString(), "2016-04-30T11:18:25.796Z");
    assert.equal(discordCreatedMs("not-a-number"), 0);
  });
  await t("store: one GitHub account, one Discord account, and a failed attempt leaves nothing behind", async () => {
    const s = entryStore("k".repeat(40), memoryRun());
    assert.equal(await s.claim("d1", "g1"), "ok");
    assert.equal(await s.claim("d1", "g1"), "ok");
    assert.equal(await s.claim("d2", "g1"), "github-taken");
    assert.equal(await s.claim("d1", "g2"), "discord-linked");
    assert.equal(await s.claim("d3", "g2"), "ok", "the half written by the refused attempt was undone");
    assert.equal(await s.check("d4", "g1"), "github-taken");
    assert.equal(await s.check("d5", "g9"), "ok");
    assert.equal(await s.claim("d6", "g9"), "ok", "check writes nothing");
    assert.equal(await s.release("d1"), true);
    assert.equal(await s.claim("d2", "g1"), "ok", "released, so it can be used again");
    assert.equal(await s.release("nobody"), false);
  });
  await t("store: only one-way codes are kept, never an id or a name", async () => {
    const run = memoryRun();
    await entryStore("k".repeat(40), run).claim("184953201", "501");
    const rows = run.dump();
    assert.equal(rows.length, 2);
    for (const [k, v] of rows) {
      assert.match(k, /^(gh|dc):[0-9a-f]{40}$/);
      assert.match(v, /^[0-9a-f]{40}$/);
    }
  });
  await t("store: talks to Upstash with a bearer token and a JSON array, and raises on errors", async () => {
    const good = upstash({ storeUrl: env.UPSTASH_REDIS_REST_URL, storeToken: "store-token" });
    assert.equal(await good("SET", "k", "v", "NX"), "OK");
    assert.equal(await good("SET", "k", "v2", "NX"), null);
    assert.equal(await good("GET", "k"), "v");
    await assert.rejects(upstash({ storeUrl: env.UPSTASH_REDIS_REST_URL, storeToken: "wrong" })("GET", "k"), /entry store/);
    await assert.rejects(good("FLUSHALL"), /unknown command/);
  });
  await t("legion directory: writes, reads and removes a public profile", async () => {
    const creds = { storeUrl: env.UPSTASH_REDIS_REST_URL, storeToken: "store-token" };
    await writeDirectoryEntry(creds, { github: "octocat", name: "The Octocat", interests: ["AI"], joined: "2026-09-22" });
    await writeDirectoryEntry(creds, { github: "Hubot", name: "Hubot" });
    const rows = await readDirectory(creds);
    assert.deepEqual(rows.map((r) => r.github).sort(), ["Hubot", "octocat"]);
    assert.equal(rows.find((r) => r.github === "octocat")?.name, "The Octocat");
    await removeDirectoryEntry(creds, "octocat");
    assert.deepEqual((await readDirectory(creds)).map((r) => r.github), ["Hubot"]);
    await removeDirectoryEntry(creds, "Hubot"); // leave the shared fake store as this test found it
    assert.deepEqual(await readDirectory(creds), []);
  });
  await t("legion directory: a database problem is swallowed, never breaks the page", async () => {
    assert.deepEqual(await readDirectory({ storeUrl: env.UPSTASH_REDIS_REST_URL, storeToken: "wrong" }), []);
  });

  // ------------------------------------------------------------ sign in (Discord, then GitHub)
  const fragToken = (redirect: string) => decodeURIComponent(redirect.split("#t=")[1] ?? "");
  const state = new URL(startUrl(cfg, NOW.getTime())).searchParams.get("state")!;
  const newStore = () => entryStore(cfg.idSecret, memoryRun());
  const gh = (id: string, login: string, over: Partial<{ name: string; created_at: string; type: string }> = {}) => fake.ghUsers.set(id, { login, name: login + " Name", created_at: ago(24 * 400), type: "User", ...over });
  const linkOf = async (id: string, c = cfg) => new URL((await handleCallback(c, { code: "code-" + id, state }, { now: NOW.getTime() })).redirect).searchParams.get("state")!;
  await t("sign in: the Discord link asks only for identify, with our callback and a signed state", () => {
    const u = new URL(startUrl(cfg, NOW.getTime()));
    assert.equal(u.searchParams.get("scope"), "identify");
    assert.equal(u.searchParams.get("redirect_uri"), "https://site.test/api/join/callback");
    assert.equal(verifyToken(cfg.signingSecret, state, "state", NOW.getTime())?.p, "state");
  });
  await t("sign in: a member is handed on to GitHub with a signed link that carries only ids, not names", async () => {
    seed();
    const r = await handleCallback(cfg, { code: "code-a-new", state }, { now: NOW.getTime() });
    const u = new URL(r.redirect);
    assert.equal(u.origin + u.pathname, `${cfg.githubOauthBase}/login/oauth/authorize`);
    assert.equal(u.searchParams.get("client_id"), "gh-client");
    assert.equal(u.searchParams.get("redirect_uri"), "https://site.test/api/join/github/callback");
    assert.equal(u.searchParams.get("scope"), null, "no scope: public profile only");
    const link = verifyToken(cfg.signingSecret, u.searchParams.get("state"), "link", NOW.getTime())!;
    assert.deepEqual([link.u, link.n, link.d], ["a-new", "", ""]);
    assert.equal(verifyToken(cfg.signingSecret, u.searchParams.get("state"), "form", NOW.getTime()), null, "a link cannot be used as a form token");
  });
  await t("sign in: with GitHub switched off, the form token comes straight back", async () => {
    seed();
    const off = cfgOf({ JOIN_REQUIRE_GITHUB: "false" });
    const r = await handleCallback(off, { code: "code-a-new", state }, { now: NOW.getTime() });
    const p = verifyToken(off.signingSecret, fragToken(r.redirect), "form", NOW.getTime())!;
    assert.deepEqual([p.u, p.gh], ["a-new", undefined]);
  });
  await t("sign in: not in the server, already a Catalyst, bad state, cancelled and Discord failures each land on the right page", async () => {
    seed();
    assert.match((await handleCallback(cfg, { code: "code-ghost", state }, { now: NOW.getTime() })).redirect, /status=not-member/);
    assert.match((await handleCallback(cfg, { code: "code-cat-1", state }, { now: NOW.getTime() })).redirect, /status=done/);
    assert.match((await handleCallback(cfg, { code: "code-a-new", state: "nope" }, { now: NOW.getTime() })).redirect, /status=expired/);
    assert.match((await handleCallback(cfg, { code: "code-a-new", state }, { now: NOW.getTime() + 20 * 60_000 })).redirect, /status=expired/);
    assert.match((await handleCallback(cfg, { error: "access_denied", state }, { now: NOW.getTime() })).redirect, /status=cancelled/);
    assert.match((await handleCallback(cfg, { code: "bad", state }, { now: NOW.getTime() })).redirect, /status=error/);
  });
  await t("sign in: a Discord account younger than the minimum is turned away, older ones and the default pass", async () => {
    const young = String(BigInt(NOW.getTime() - 2 * 86_400_000 - 1420070400000) << BigInt(22));
    seed();
    fake.add(young, 1);
    const strict = cfgOf({ JOIN_MIN_DISCORD_DAYS: "7" });
    const turned = (await handleCallback(strict, { code: "code-" + young, state }, { now: NOW.getTime() })).redirect;
    assert.match(turned, /status=account-young&days=7/);
    assert.equal(Number(new URL(turned).searchParams.get("until")), discordCreatedMs(young) + 7 * 86_400_000, "the page is told the exact time the account becomes old enough");
    assert.doesNotMatch((await handleCallback(cfg, { code: "code-" + young, state }, { now: NOW.getTime() })).redirect, /account-young/);
    assert.doesNotMatch((await handleCallback(strict, { code: "code-a-new", state }, { now: NOW.getTime() })).redirect, /account-young/, "an id that is not a real snowflake is not judged");
  });

  await t("github: a proven account gets a form token with its GitHub identity, and the GitHub token is cancelled", async () => {
    seed();
    gh("501", "ada-l");
    const r = await handleGithubCallback(cfg, { code: "gh-501", state: await linkOf("a-new") }, { now: NOW.getTime(), store: newStore() });
    assert.match(r.redirect, /^https:\/\/site\.test\/join#t=/);
    const p = verifyToken(cfg.signingSecret, fragToken(r.redirect), "form", NOW.getTime())!;
    assert.deepEqual([p.u, p.gh?.i, p.gh?.l, p.n, p.j], ["a-new", "501", "ada-l", "usera-new", fake.members.get("a-new")!.joined_at]);
    assert.ok(fake.revoked.includes("ghtok-501"), "the access token was revoked");
  });
  await t("github: bad state, cancelled, left the server, already a Catalyst, an organisation and a rejected code each land on the right page", async () => {
    seed();
    gh("501", "ada-l");
    gh("777", "some-org", { type: "Organization" });
    const link = await linkOf("a-new");
    const go = (p: { code?: string; state?: string; error?: string }) => handleGithubCallback(cfg, { state: link, ...p }, { now: NOW.getTime(), store: newStore() }).then((r) => r.redirect);
    assert.match(await go({ code: "gh-501", state: "nope" }), /status=expired/);
    assert.match(await go({ code: "gh-501", state: state }), /status=expired/, "a Discord state is not a link");
    assert.match(await go({ error: "access_denied" }), /status=cancelled/);
    assert.match(await go({ code: "gh-999" }), /status=error/);
    assert.match(await go({ code: "gh-777" }), /status=github-type/);
    assert.match(await handleGithubCallback(cfg, { code: "gh-501", state: link }, { now: NOW.getTime() + 20 * 60_000, store: newStore() }).then((r) => r.redirect), /status=expired/);
    fake.members.get("a-new")!.roles.push(R.catalyst);
    assert.match(await go({ code: "gh-501" }), /status=done/);
    fake.members.delete("a-new");
    assert.match(await go({ code: "gh-501" }), /status=not-member/);
  });
  await t("github: an account younger than the minimum is turned away", async () => {
    seed();
    const made = NOW.getTime() - 5 * 86_400_000;
    gh("502", "fresh", { created_at: new Date(made).toISOString() });
    const strict = cfgOf({ JOIN_MIN_GITHUB_DAYS: "30" });
    const r = await handleGithubCallback(strict, { code: "gh-502", state: await linkOf("a-new", strict) }, { now: NOW.getTime(), store: newStore() });
    assert.match(r.redirect, /status=github-young&days=30/);
    assert.equal(Number(new URL(r.redirect).searchParams.get("until")), made + 30 * 86_400_000);
    const viaPublic = cfgOf({ JOIN_MIN_GITHUB_DAYS: undefined, NEXT_PUBLIC_JOIN_MIN_GITHUB_DAYS: "30", NEXT_PUBLIC_JOIN_MIN_DISCORD_DAYS: "7" });
    assert.deepEqual([viaPublic.minGithubDays, viaPublic.minDiscordDays], [30, 7], "the public settings drive the server too");
    assert.equal(cfgOf({ JOIN_MIN_GITHUB_DAYS: "10", NEXT_PUBLIC_JOIN_MIN_GITHUB_DAYS: "30" }).minGithubDays, 10, "a server only value wins");
  });
  await t("github: one entry per person is checked at sign in, before the form is filled", async () => {
    seed();
    gh("501", "ada-l");
    const s = newStore();
    await s.claim("someone-else", "501");
    assert.match((await handleGithubCallback(cfg, { code: "gh-501", state: await linkOf("a-new") }, { now: NOW.getTime(), store: s })).redirect, /status=github-taken/);
    const s2 = newStore();
    await s2.claim("a-new", "999");
    assert.match((await handleGithubCallback(cfg, { code: "gh-501", state: await linkOf("a-new") }, { now: NOW.getTime(), store: s2 })).redirect, /status=discord-linked/);
  });

  // ------------------------------------------------------------ submit
  const GH = { i: "501", l: "ada-l", n: "Ada Lovelace", c: ago(24 * 400) };
  const formToken = (id: string, opts: { gh?: typeof GH | null; exp?: number; c?: JoinConfig } = {}) =>
    signToken((opts.c ?? cfg).signingSecret, { p: "form", u: id, n: "user" + id, d: "", j: fake.members.get(id)?.joined_at ?? ago(1), e: opts.exp ?? NOW.getTime() + HOUR, ...(opts.gh === null ? {} : { gh: opts.gh ?? GH }) });
  const formsPosts = () => fake.messages.filter((m) => m.channel === "forms");
  await t("submit: a valid form posts a private record, gives the Catalyst role, clears Pending and Reminded, and uses the verified GitHub account", async () => {
    seed();
    fake.members.get("c-soon")!.roles.push(R.reminded);
    const r = await handleSubmit(cfg, { token: formToken("c-soon"), fields: { ...good, github: "someone-else-entirely" } }, { now: NOW.getTime(), store: newStore() });
    assert.equal(r.status, 200);
    assert.equal(r.body.ok, true);
    assert.deepEqual(fake.members.get("c-soon")!.roles, [R.catalyst]);
    const post = formsPosts()[0];
    assert.deepEqual(post.body.allowed_mentions, { parse: [] });
    const fields = post.body.embeds[0].fields.map((f: any) => f.name + ": " + f.value).join("\n");
    assert.match(fields, /GitHub: https:\/\/github\.com\/ada-l \(verified\)/);
    assert.ok(!fields.includes("someone-else-entirely"), "what was typed is ignored when the account is proven");
    assert.match(fields, /Public listing: Asked to be listed/);
    assert.match(fields, /Accounts: Discord made .*GitHub made/);
    assert.deepEqual([...(fake.redisSets.get("legion:index") ?? [])], ["ada-l"], "ticking public listing adds the verified login to the directory");
    const entry = JSON.parse(fake.redis.get("legion:profile:ada-l")!);
    assert.equal(entry.github, "ada-l");
    assert.deepEqual(entry.interests, ["Web3", "AI"]);
    assert.equal(entry.x, "ada_lovelace");
    assert.equal(entry.note, "Building a CLI.");
  });
  await t("submit: doing it twice does not post twice", async () => {
    const before = formsPosts().length;
    const r = await handleSubmit(cfg, { token: formToken("c-soon"), fields: good }, { now: NOW.getTime(), store: newStore() });
    assert.equal(r.body.state, "done");
    assert.equal(formsPosts().length, before);
  });
  await t("submit: private by default, and typed markdown or mentions cannot ping anyone", async () => {
    seed();
    const callsBefore = fake.redisCalls.length;
    const r = await handleSubmit(cfg, { token: formToken("a-new"), fields: { ...good, listPublicly: false, about: "@everyone <@1> **hi** [x](http://e)" } }, { now: NOW.getTime(), store: newStore() });
    assert.equal(r.status, 200);
    const f = formsPosts().pop()!.body.embeds[0].fields;
    assert.match(f.find((x: any) => x.name === "Public listing").value, /Not listed/);
    const about = f.find((x: any) => x.name === "Building").value;
    assert.ok(!about.includes("@e") && !about.includes("**") && !about.includes("]("));
    assert.ok(!fake.redisCalls.slice(callsBefore).some((c) => c[0] === "SADD"), "not ticking public listing never touches the directory");
  });
  await t("submit: a reserved name is refused with a message", async () => {
    seed();
    const r = await handleSubmit(cfg, { token: formToken("a-new"), fields: { ...good, name: "Edith Support" } }, { now: NOW.getTime(), store: newStore() });
    assert.equal(r.status, 422);
    assert.match(r.body.errors!.name, /reserved/);
    assert.ok(!fake.members.get("a-new")!.roles.includes(R.catalyst));
  });
  await t("submit: one person, one entry: the same GitHub account cannot be used by a second Discord account", async () => {
    seed();
    fake.add("u2", 2);
    const s = newStore();
    assert.equal((await handleSubmit(cfg, { token: formToken("a-new"), fields: good }, { now: NOW.getTime(), store: s })).status, 200);
    const posts = formsPosts().length;
    const dup = await handleSubmit(cfg, { token: formToken("u2"), fields: good }, { now: NOW.getTime(), store: s });
    assert.equal(dup.status, 409);
    assert.equal(dup.body.state, "github-taken");
    assert.ok(!fake.members.get("u2")!.roles.includes(R.catalyst));
    assert.equal(formsPosts().length, posts, "nothing was posted for the duplicate");
  });
  await t("submit: one person, one entry: a Discord account cannot switch to a different GitHub account", async () => {
    seed();
    fake.add("u3", 2);
    const s = newStore();
    await s.claim("u3", "888");
    const r = await handleSubmit(cfg, { token: formToken("u3", { gh: { ...GH, i: "889", l: "other" } }), fields: good }, { now: NOW.getTime(), store: s });
    assert.equal(r.status, 409);
    assert.equal(r.body.state, "discord-linked");
    assert.equal(await s.claim("someone", "889"), "ok", "the refused attempt did not reserve 889");
  });
  await t("submit: a form token without a GitHub identity is refused when GitHub is required, and works when it is not", async () => {
    seed();
    assert.equal((await handleSubmit(cfg, { token: formToken("a-new", { gh: null }), fields: good }, { now: NOW.getTime(), store: newStore() })).status, 401);
    const off = cfgOf({ JOIN_REQUIRE_GITHUB: "false" });
    const r = await handleSubmit(off, { token: formToken("a-new", { gh: null, c: off }), fields: good }, { now: NOW.getTime(), store: newStore() });
    assert.equal(r.status, 200);
    assert.match(formsPosts().pop()!.body.embeds[0].fields.find((x: any) => x.name === "GitHub").value, /^https:\/\/github\.com\/ada-l$/);
  });
  await t("submit: an expired token, invalid fields and a member who has left get the right answers", async () => {
    seed();
    const store = newStore();
    assert.equal((await handleSubmit(cfg, { token: formToken("a-new", { exp: NOW.getTime() - 1 }), fields: good }, { now: NOW.getTime(), store })).status, 401);
    assert.equal((await handleSubmit(cfg, { token: "x", fields: good }, { store })).status, 401);
    const bad = await handleSubmit(cfg, { token: formToken("a-new"), fields: { ...good, interests: [] } }, { now: NOW.getTime(), store });
    assert.equal(bad.status, 422);
    assert.ok(bad.body.errors?.interests);
    fake.members.delete("a-new");
    assert.equal((await handleSubmit(cfg, { token: formToken("a-new"), fields: good }, { now: NOW.getTime(), store })).status, 410);
    assert.equal((await handleSubmit(cfg, null, { store })).status, 401);
  });
  await t("submit: nothing is granted if Discord cannot record the form, and trying again then works (the entry is not double counted)", async () => {
    seed();
    const store = newStore();
    const failing = { ...cfg, channelForms: "dm-closed-channel" };
    fake.dmClosed.add("closed-channel");
    const r = await handleSubmit(failing, { token: formToken("a-new"), fields: good }, { now: NOW.getTime(), store });
    assert.equal(r.status, 502);
    assert.ok(!fake.members.get("a-new")!.roles.includes(R.catalyst));
    const again = await handleSubmit(cfg, { token: formToken("a-new"), fields: good }, { now: NOW.getTime(), store });
    assert.equal(again.status, 200);
    assert.ok(fake.members.get("a-new")!.roles.includes(R.catalyst));
  });

  fake.server.close();
  console.log(`\n${passed} passed${process.exitCode ? ", some failed" : ", 0 failed"}`);
})();
