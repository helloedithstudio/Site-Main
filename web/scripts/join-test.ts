// Tests for the Catalyst join flow against a fake Discord server. Run:  npx tsx scripts/join-test.ts
// The fake keeps members, roles, messages and removals in memory and answers the same endpoints the real client calls.

import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { fakeDiscord } from "./fakes/discord";
import { joinConfig, type JoinConfig } from "../lib/join/config";
import { planSweep, type Member } from "../lib/join/plan";
import { signToken, verifyToken } from "../lib/join/token";
import { clean, esc, validateForm } from "../lib/join/form";
import { runSweep, MAX_KICKS_PER_RUN } from "../lib/join/sweep";
import { withLock } from "../lib/join/lock";
import { handleCallback, handleGithubCallback, handleSubmit, startUrl } from "../lib/join/flow";
import { entryStore, memoryRun, upstash, type EntryStore } from "../lib/join/store";
import { readDirectory, readDirectoryEntry, removeDirectoryEntry, writeDirectoryEntry } from "../lib/legion/directory";
import { readAllMembers, readMember, removeMember, writeMember } from "../lib/join/members";
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

(async () => {
  const fake = fakeDiscord({ ago });
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
  await t("sweep: a dry run says who it skipped and why; a live run leaves the names out", async () => {
    seed();
    const r = await runSweep(cfg, { now: NOW, forceDry: true });
    assert.equal(r.skippedWhy!.length, r.skipped, "every skipped person has a reason");
    const why = Object.fromEntries(r.skippedWhy!.map((s) => [s.id, s.why]));
    assert.deepEqual(Object.keys(why).sort(), ["bot-1", "cat-1", "core-1", "f-wait", "old-1", "owner-1"]);
    assert.match(why["bot-1"], /bot/);
    assert.match(why["owner-1"], /owner/);
    assert.match(why["old-1"], /before ONBOARDING_START/);
    assert.match(why["cat-1"], /Catalyst role/);
    assert.match(why["core-1"], /exempt role/);
    assert.match(why["f-wait"], /Pending role .*already sent.*16 h left/);
    assert.equal(r.skippedWhy!.find((s) => s.id === "cat-1")!.username.length > 0, true, "it names the person");
    const live = await runSweep(cfg, { now: NOW });
    assert.equal(live.skippedWhy, undefined, "the live answer, which schedulers and GitHub keep, has no usernames");
    assert.equal("skippedWhy" in JSON.parse(JSON.stringify(live)), false);
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

  // ------------------------------------------------------------ sweep: reaching people, and the lock
  const noWelcome = cfgOf({ DISCORD_CHANNEL_WELCOME: "" });
  await t("sweep: someone who cannot be reached at all is reported, not marked invited, and is tried again", async () => {
    reset();
    fake.add("u-closed", 1);
    fake.dmClosed.add("u-closed");
    const first = await runSweep(noWelcome, { now: NOW });
    assert.deepEqual([first.invited, first.unreachable, first.errors], [[], ["u-closed"], []]);
    assert.ok(!fake.members.get("u-closed")!.roles.includes(R.pending), "no Pending role, so they can never be removed for a message they did not get");
    const again = await runSweep(noWelcome, { now: NOW });
    assert.deepEqual(again.unreachable, ["u-closed"], "still tried on the next run");
    fake.dmClosed.delete("u-closed");
    const later = await runSweep(noWelcome, { now: NOW });
    assert.deepEqual([later.invited, later.unreachable], [["u-closed"], []]);
    assert.ok(fake.members.get("u-closed")!.roles.includes(R.pending));
    assert.ok(fake.messages.some((m) => m.channel === "dm-u-closed" && /Catalyst form/.test(m.body.content)));
  });
  await t("sweep: closed direct messages plus a welcome channel that also fails is unreachable, not an error", async () => {
    reset();
    fake.add("u-both", 1);
    fake.dmClosed.add("u-both");
    fake.dmClosed.add("broken"); // a channel called dm-broken refuses posts in the fake
    const r = await runSweep(cfgOf({ DISCORD_CHANNEL_WELCOME: "dm-broken" }), { now: NOW });
    assert.deepEqual([r.invited, r.unreachable, r.errors], [[], ["u-both"], []]);
    fake.dmClosed.delete("broken");
  });
  await t("sweep: a reminder that cannot be delivered is retried, not marked as sent", async () => {
    reset();
    fake.add("u-rem", 19, [R.pending]);
    fake.dmClosed.add("u-rem");
    const r = await runSweep(noWelcome, { now: NOW });
    assert.deepEqual([r.reminded, r.unreachable], [[], ["u-rem"]]);
    assert.ok(!fake.members.get("u-rem")!.roles.includes(R.reminded));
    fake.dmClosed.delete("u-rem");
  });
  await t("sweep: a live run takes the lock and lets it go; a dry run never touches it", async () => {
    seed();
    fake.redisCalls.length = 0;
    await runSweep(cfgOf({ ONBOARDING_DRY_RUN: undefined }), { now: NOW });
    assert.ok(!fake.redisCalls.some((c) => c[1] === "lock:sweep" || c[0] === "SET"), "a dry run makes no database calls at all");
    await runSweep(cfg, { now: NOW });
    const lockCalls = fake.redisCalls.filter((c) => c.includes("lock:sweep")).map((c) => c[0]);
    assert.deepEqual(lockCalls, ["SET", "GET", "DEL"]);
    assert.equal(fake.redis.has("lock:sweep"), false, "released when done");
    const set = fake.redisCalls.find((c) => c[0] === "SET" && c[1] === "lock:sweep")!;
    assert.deepEqual(set.slice(3), ["NX", "EX", "120"], "it expires by itself");
  });
  await t("sweep: while another run holds the lock this one does nothing and says so", async () => {
    seed();
    fake.redis.set("lock:sweep", "another-runner");
    const r = await runSweep(cfg, { now: NOW });
    assert.equal(r.ran, false);
    assert.match(r.note!, /already running/);
    assert.equal(fake.messages.length + fake.kicked.length, 0);
    assert.equal(fake.redis.get("lock:sweep"), "another-runner", "someone else's lock is left alone");
    fake.redis.delete("lock:sweep");
  });
  await t("sweep: if the database cannot be reached the sweep still runs, and says it ran without the lock", async () => {
    seed();
    const r = await runSweep(cfgOf({ UPSTASH_REDIS_REST_TOKEN: "wrong-token" }), { now: NOW });
    assert.equal(r.ran, true);
    assert.deepEqual(r.invited.sort(), ["a-new", "b-dmoff"]);
    assert.match(r.note!, /without it/);
  });
  await t("lock: an error inside the job passes straight through, and only your own lock is released", async () => {
    const run = memoryRun();
    await assert.rejects(withLock(run, "x", 60, async () => { throw new Error("boom"); }), /boom/);
    assert.equal(await run("GET", "lock:x"), null, "released even after an error");
    await assert.rejects(withLock(run, "x", 60, async () => { throw new Error("boom"); }, { failOpen: true }), /boom/, "failOpen only covers the database, never the job");
    const kept = await withLock(run, "y", 60, async () => { await run("SET", "lock:y", "taken-over"); return 1; });
    assert.deepEqual(kept, { ran: true, value: 1 });
    assert.equal(await run("GET", "lock:y"), "taken-over", "an expired lock someone else took is not deleted");
    const broken = async () => { throw new Error("down"); };
    await assert.rejects(withLock(broken, "z", 60, async () => 1), /down/);
    assert.deepEqual(await withLock(broken, "z", 60, async () => 2, { failOpen: true }), { ran: true, value: 2, unlocked: true });
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
  await t("sign in: not in the server, bad state, cancelled and Discord failures each land on the right page", async () => {
    seed();
    assert.match((await handleCallback(cfg, { code: "code-ghost", state }, { now: NOW.getTime() })).redirect, /status=not-member/);
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
  await t("github: bad state, cancelled, left the server, an organisation and a rejected code each land on the right page", async () => {
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
  await t("submit: doing it again is a profile update: no second Catalyst form, no role change, and the earlier entry is kept", async () => {
    const before = formsPosts().length;
    const r = await handleSubmit(cfg, { token: formToken("c-soon"), fields: good }, { now: NOW.getTime(), store: newStore() });
    assert.equal(r.body.state, "done");
    assert.equal(r.body.profile, true);
    assert.equal(formsPosts().length, before + 1);
    assert.equal(formsPosts().pop()!.body.embeds[0].title, "Legion profile saved");
    assert.deepEqual(fake.members.get("c-soon")!.roles, [R.catalyst]);
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
    assert.ok(!fake.redisCalls.slice(callsBefore).some((c) => c[0] === "SADD" && c[1] === "legion:index"), "not ticking public listing never touches the directory");
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

  // ------------------------------------------------------------ profile mode (people who already have the Catalyst role)
  const wipeStore = () => {
    fake.redis.clear();
    fake.redisSets.clear();
  };
  const creds = { storeUrl: env.UPSTASH_REDIS_REST_URL, storeToken: "store-token" };
  await t("profile mode: an existing Catalyst signs in like anyone else and is not held to the account age rules; a new member still is", async () => {
    const young = (extraMs: number) => String(BigInt(NOW.getTime() - 2 * 86_400_000 - extraMs - 1420070400000) << BigInt(22));
    const youngCatalyst = young(0);
    const youngNewcomer = young(1000); // two days old as well
    seed();
    fake.add(youngCatalyst, 1, [R.catalyst]);
    fake.add(youngNewcomer, 1);
    const strict = cfgOf({ JOIN_MIN_DISCORD_DAYS: "7" });
    const r = await handleCallback(strict, { code: "code-" + youngCatalyst, state }, { now: NOW.getTime() });
    assert.ok(r.redirect.startsWith(`${strict.githubOauthBase}/login/oauth/authorize`), "handed on to GitHub, not turned away");
    assert.match((await handleCallback(strict, { code: "code-" + youngNewcomer, state }, { now: NOW.getTime() })).redirect, /status=account-young/);
    const off = cfgOf({ JOIN_REQUIRE_GITHUB: "false" });
    const viaCat = await handleCallback(off, { code: "code-cat-1", state }, { now: NOW.getTime() });
    assert.equal(verifyToken(off.signingSecret, fragToken(viaCat.redirect), "form", NOW.getTime())!.pm, true);
    const viaNew = await handleCallback(off, { code: "code-a-new", state }, { now: NOW.getTime() });
    assert.equal(verifyToken(off.signingSecret, fragToken(viaNew.redirect), "form", NOW.getTime())!.pm, undefined);
  });
  await t("profile mode: an existing Catalyst may use a young GitHub account, a new member may not, and one person one entry still applies", async () => {
    seed();
    gh("503", "newgh", { created_at: new Date(NOW.getTime() - 3 * 86_400_000).toISOString() });
    const strict = cfgOf({ JOIN_MIN_GITHUB_DAYS: "30" });
    const ok = await handleGithubCallback(strict, { code: "gh-503", state: await linkOf("cat-1", strict) }, { now: NOW.getTime(), store: newStore() });
    const p = verifyToken(strict.signingSecret, fragToken(ok.redirect), "form", NOW.getTime())!;
    assert.deepEqual([p.u, p.gh?.l, p.pm], ["cat-1", "newgh", true]);
    const neu = await handleGithubCallback(strict, { code: "gh-503", state: await linkOf("a-new", strict) }, { now: NOW.getTime(), store: newStore() });
    assert.match(neu.redirect, /status=github-young/);
    const taken = newStore();
    await taken.claim("someone-else", "503");
    assert.match((await handleGithubCallback(cfg, { code: "gh-503", state: await linkOf("cat-1") }, { now: NOW.getTime(), store: taken })).redirect, /status=github-taken/);
  });
  await t("profile mode: saving changes no role, leaves a profile note instead of a deadline, records the member and lists them", async () => {
    seed();
    wipeStore();
    fake.members.get("cat-1")!.roles.push("some-other-role");
    const before = formsPosts().length;
    const r = await handleSubmit(cfg, { token: formToken("cat-1"), fields: good }, { now: NOW.getTime(), store: newStore() });
    assert.deepEqual([r.status, r.body.state, r.body.profile, r.body.listed], [200, "done", true, true]);
    assert.deepEqual(fake.members.get("cat-1")!.roles, [R.catalyst, "some-other-role"], "roles are exactly as they were");
    assert.equal(formsPosts().length, before + 1);
    const names = formsPosts().pop()!.body.embeds[0].fields.map((f: any) => f.name);
    assert.ok(!names.includes("Deadline was") && names.includes("Already a Catalyst"));
    const joined = fake.members.get("cat-1")!.joined_at;
    assert.deepEqual(JSON.parse(fake.redis.get("member:cat-1")!), { github: "ada-l", name: "Ada Lovelace", since: joined, listed: true });
    assert.deepEqual([...(fake.redisSets.get("member:index") ?? [])], ["cat-1"]);
    assert.equal(JSON.parse(fake.redis.get("legion:profile:ada-l")!).joined, joined.slice(0, 10), "dated from when they joined the server");
    wipeStore();
  });
  await t("profile mode: saving again keeps a Maintainer role, a booking link and the original join date", async () => {
    seed();
    wipeStore();
    await writeDirectoryEntry(creds, { github: "ada-l", role: "Maintainer", booking: "https://cal.test/ada", joined: "2026-08-01", name: "Old Name" });
    await handleSubmit(cfg, { token: formToken("cat-1"), fields: good }, { now: NOW.getTime(), store: newStore() });
    const e = JSON.parse(fake.redis.get("legion:profile:ada-l")!);
    assert.deepEqual([e.role, e.booking, e.joined, e.name], ["Maintainer", "https://cal.test/ada", "2026-08-01", "Ada Lovelace"]);
    wipeStore();
  });
  await t("profile mode: unticking takes an ordinary Catalyst off the page, but a Maintainer keeps their entry", async () => {
    seed();
    wipeStore();
    await writeDirectoryEntry(creds, { github: "ada-l", name: "Ada" });
    const r = await handleSubmit(cfg, { token: formToken("cat-1"), fields: { ...good, listPublicly: false } }, { now: NOW.getTime(), store: newStore() });
    assert.equal(r.body.listed, false);
    assert.equal(await readDirectoryEntry(creds, "ada-l"), null);
    assert.equal(JSON.parse(fake.redis.get("member:cat-1")!).listed, false);
    await writeDirectoryEntry(creds, { github: "ada-l", name: "Ada", role: "Maintainer" });
    await handleSubmit(cfg, { token: formToken("cat-1"), fields: { ...good, listPublicly: false } }, { now: NOW.getTime(), store: newStore() });
    assert.equal((await readDirectoryEntry(creds, "ada-l"))?.role, "Maintainer");
    wipeStore();
  });
  await t("profile mode: the one entry rule still stops a second Discord account using the same GitHub account", async () => {
    seed();
    wipeStore();
    fake.add("cat-2", 40, [R.catalyst]);
    const s = newStore();
    assert.equal((await handleSubmit(cfg, { token: formToken("cat-1"), fields: good }, { now: NOW.getTime(), store: s })).status, 200);
    const dup = await handleSubmit(cfg, { token: formToken("cat-2"), fields: good }, { now: NOW.getTime(), store: s });
    assert.deepEqual([dup.status, dup.body.state], [409, "github-taken"]);
    assert.equal(fake.redis.get("member:cat-2"), undefined, "nothing was recorded for the duplicate");
    wipeStore();
  });
  await t("submit: a new member's completed form also records the member, dated now, and is not profile mode", async () => {
    seed();
    wipeStore();
    const r = await handleSubmit(cfg, { token: formToken("a-new"), fields: good }, { now: NOW.getTime(), store: newStore() });
    assert.equal(r.body.profile, undefined);
    const rec = JSON.parse(fake.redis.get("member:a-new")!);
    assert.deepEqual([rec.github, rec.since, rec.listed], ["ada-l", NOW.toISOString(), true]);
    assert.ok(fake.members.get("a-new")!.roles.includes(R.catalyst));
    wipeStore();
  });
  await t("members: write, read, list and remove; a bad row is skipped; a database problem gives nothing", async () => {
    wipeStore();
    await writeMember(creds, "d1", { github: "a", since: "2026-09-01T00:00:00.000Z", listed: false });
    await writeMember(creds, "d2", { github: "b", name: "B", since: "2026-09-02T00:00:00.000Z", listed: true });
    fake.redis.set("member:d3", "{not json");
    fake.redisSets.get("member:index")!.add("d3");
    assert.equal((await readMember(creds, "d2"))?.name, "B");
    assert.equal(await readMember(creds, "nobody"), null);
    assert.equal(await readMember(creds, "d3"), null);
    assert.deepEqual((await readAllMembers(creds)).map(([id]) => id).sort(), ["d1", "d2"]);
    await removeMember(creds, "d1");
    assert.deepEqual((await readAllMembers(creds)).map(([id]) => id), ["d2"]);
    const bad = { storeUrl: creds.storeUrl, storeToken: "wrong" };
    assert.deepEqual(await readAllMembers(bad), []);
    assert.equal(await readMember(bad, "d2"), null);
    wipeStore();
  });

  fake.server.close();
  console.log(`\n${passed} passed${process.exitCode ? ", some failed" : ", 0 failed"}`);
})();
