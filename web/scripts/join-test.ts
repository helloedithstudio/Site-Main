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
import { handleCallback, handleSubmit, startUrl } from "../lib/join/flow";

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
  return { members, dmClosed, messages, kicked, state, add, server };
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
  const good = { name: "  Ada  Lovelace ", github: "https://github.com/ada-l", interests: ["AI", "Nope", "Web3"], portfolio: "ada.dev", about: "Building a\nCLI.", listPublicly: true, rulesAck: true, website: "" };
  await t("form: a valid submission is cleaned", () => {
    const r = validateForm(good);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.name, "Ada Lovelace");
      assert.equal(r.value.github, "ada-l");
      assert.deepEqual(r.value.interests, ["Web3", "AI"]);
      assert.equal(r.value.portfolio, "https://ada.dev/");
      assert.equal(r.value.about, "Building a CLI.");
      assert.equal(r.value.listPublicly, true);
    }
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

  // ------------------------------------------------------------ sign in
  const fragToken = (redirect: string) => decodeURIComponent(redirect.split("#t=")[1] ?? "");
  const state = new URL(startUrl(cfg, NOW.getTime())).searchParams.get("state")!;
  await t("sign in: the Discord link asks only for identify, with our callback and a signed state", () => {
    const u = new URL(startUrl(cfg, NOW.getTime()));
    assert.equal(u.searchParams.get("scope"), "identify");
    assert.equal(u.searchParams.get("redirect_uri"), "https://site.test/api/join/callback");
    assert.equal(verifyToken(cfg.signingSecret, state, "state", NOW.getTime())?.p, "state");
  });
  await t("sign in: a member gets a form token in the fragment, with their joined time", async () => {
    seed();
    const r = await handleCallback(cfg, { code: "code-a-new", state }, { now: NOW.getTime() });
    assert.match(r.redirect, /^https:\/\/site\.test\/join#t=/);
    const p = verifyToken(cfg.signingSecret, fragToken(r.redirect), "form", NOW.getTime())!;
    assert.equal(p.u, "a-new");
    assert.equal(p.j, fake.members.get("a-new")!.joined_at);
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

  // ------------------------------------------------------------ submit
  const formToken = (id: string, exp = NOW.getTime() + HOUR) => signToken(cfg.signingSecret, { p: "form", u: id, n: "user" + id, d: "", j: fake.members.get(id)?.joined_at ?? ago(1), e: exp });
  await t("submit: a valid form posts a private record, gives the Catalyst role and clears Pending and Reminded", async () => {
    seed();
    fake.members.get("c-soon")!.roles.push(R.reminded);
    const r = await handleSubmit(cfg, { token: formToken("c-soon"), fields: good }, { now: NOW.getTime() });
    assert.equal(r.status, 200);
    assert.equal(r.body.ok, true);
    assert.deepEqual(fake.members.get("c-soon")!.roles, [R.catalyst]);
    const post = fake.messages.find((m) => m.channel === "forms")!;
    assert.deepEqual(post.body.allowed_mentions, { parse: [] });
    const fields = post.body.embeds[0].fields.map((f: any) => f.name + ": " + f.value).join("\n");
    assert.match(fields, /GitHub: https:\/\/github\.com\/ada-l/);
    assert.match(fields, /Public listing: Asked to be listed/);
  });
  await t("submit: doing it twice does not post twice", async () => {
    const before = fake.messages.filter((m) => m.channel === "forms").length;
    const r = await handleSubmit(cfg, { token: formToken("c-soon"), fields: good }, { now: NOW.getTime() });
    assert.equal(r.body.state, "done");
    assert.equal(fake.messages.filter((m) => m.channel === "forms").length, before);
  });
  await t("submit: private by default, and typed markdown or mentions cannot ping anyone", async () => {
    seed();
    const r = await handleSubmit(cfg, { token: formToken("a-new"), fields: { ...good, listPublicly: false, about: "@everyone <@1> **hi** [x](http://e)" } }, { now: NOW.getTime() });
    assert.equal(r.status, 200);
    const post = fake.messages.filter((m) => m.channel === "forms").pop()!;
    const f = post.body.embeds[0].fields;
    assert.match(f.find((x: any) => x.name === "Public listing").value, /Not listed/);
    const about = f.find((x: any) => x.name === "Building").value;
    assert.ok(!about.includes("@e") && !about.includes("**") && !about.includes("]("));
  });
  await t("submit: an expired token, invalid fields and a member who has left get the right answers", async () => {
    seed();
    assert.equal((await handleSubmit(cfg, { token: formToken("a-new", NOW.getTime() - 1), fields: good }, { now: NOW.getTime() })).status, 401);
    assert.equal((await handleSubmit(cfg, { token: "x", fields: good })).status, 401);
    const bad = await handleSubmit(cfg, { token: formToken("a-new"), fields: { ...good, github: "" } }, { now: NOW.getTime() });
    assert.equal(bad.status, 422);
    assert.ok(bad.body.errors?.github);
    fake.members.delete("a-new");
    assert.equal((await handleSubmit(cfg, { token: formToken("a-new"), fields: good }, { now: NOW.getTime() })).status, 410);
    assert.equal((await handleSubmit(cfg, null)).status, 401);
  });
  await t("submit: nothing is granted if Discord cannot record the form", async () => {
    seed();
    const broken = cfgOf({ DISCORD_CHANNEL_FORMS: "forms", DISCORD_BOT_TOKEN: "test-token" });
    const failing = { ...broken, channelForms: "dm-closed-channel" };
    fake.dmClosed.add("closed-channel");
    const r = await handleSubmit(failing, { token: formToken("a-new"), fields: good }, { now: NOW.getTime() });
    assert.equal(r.status, 502);
    assert.ok(!fake.members.get("a-new")!.roles.includes(R.catalyst));
  });

  fake.server.close();
  console.log(`\n${passed} passed${process.exitCode ? ", some failed" : ", 0 failed"}`);
})();
