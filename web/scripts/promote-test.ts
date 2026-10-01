// Tests for promotion from Catalyst to Maintainer, against the fake Discord, GitHub and Redis. Run:  npx tsx scripts/promote-test.ts
// The real code in lib/promote runs unchanged; only the network is faked.

import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import type { AddressInfo } from "node:net";
import { auditChannels, auditText, canView } from "../lib/join/audit";
import { discord } from "../lib/join/discord";
import { readAllMembers, writeMember } from "../lib/join/members";
import { promoteConfig, type PromoteConfig } from "../lib/promote/config";
import { commandDefs } from "../lib/promote/commands";
import { handleInteraction, type Interaction } from "../lib/promote/interactions";
import { MAX_NOMINATIONS_PER_RUN, creditNote, demote, listPerson, promote, scanNominations, snooze, unlistPerson } from "../lib/promote/actions";
import { mergedPrCount } from "../lib/promote/github";
import { CREDIT_CAP, PR_CAP, eligibility, scoreOf } from "../lib/promote/score";
import { addCredit, readCredits, readPromo, removePromotionData, writePromo } from "../lib/promote/store";
import { verifyDiscordSignature } from "../lib/promote/signature";
import { readDirectoryEntry, writeDirectoryEntry } from "../lib/legion/directory";
import { fakeDiscord } from "./fakes/discord";

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
const DAY = 24 * HOUR;
const NOW = new Date("2026-10-01T12:00:00Z");
const ago = (h: number) => new Date(NOW.getTime() - h * HOUR).toISOString();
const R = { catalyst: "r-cat", pending: "r-pend", maintainer: "r-maint" };
const KEVIN = "90001";
const SOMEONE = "90002";

(async () => {
  const fake = fakeDiscord({ ago });
  await new Promise<void>((r) => fake.server.listen(0, r));
  const port = (fake.server.address() as AddressInfo).port;
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const pubHex = publicKey.export({ type: "spki", format: "der" }).subarray(-32).toString("hex");
  const env = {
    DISCORD_BOT_TOKEN: "test-token",
    DISCORD_CLIENT_ID: "client-1",
    DISCORD_CLIENT_SECRET: "client-secret",
    DISCORD_GUILD_ID: "G",
    DISCORD_ROLE_CATALYST: R.catalyst,
    DISCORD_ROLE_PENDING: R.pending,
    DISCORD_CHANNEL_FORMS: "forms",
    JOIN_SIGNING_SECRET: "s".repeat(40),
    JOIN_ID_SECRET: "i".repeat(40),
    CRON_SECRET: "c".repeat(30),
    DISCORD_API_BASE: `http://127.0.0.1:${port}/api/v10`,
    GITHUB_API_BASE: `http://127.0.0.1:${port}/ghapi`,
    GITHUB_OAUTH_BASE: `http://127.0.0.1:${port}/gh`,
    GITHUB_CLIENT_ID: "gh-client",
    GITHUB_CLIENT_SECRET: "gh-secret",
    UPSTASH_REDIS_REST_URL: `http://127.0.0.1:${port}/redis`,
    UPSTASH_REDIS_REST_TOKEN: "store-token",
    NEXT_PUBLIC_SITE_URL: "https://site.test",
    DISCORD_PUBLIC_KEY: pubHex,
    DISCORD_ROLE_MAINTAINER: R.maintainer,
    DISCORD_CHANNEL_PROMOTIONS: "promos",
    PROMOTER_IDS: KEVIN,
    PROMOTE_GITHUB_ORGS: "orgA,orgB",
  };
  const cfgOf = (over: Record<string, string | undefined> = {}): PromoteConfig => {
    const c = promoteConfig({ ...env, ...over });
    if (!c.ok) throw new Error("config: " + c.missing.join(", "));
    return c.cfg;
  };
  const cfg = cfgOf();
  const d = discord(cfg);
  const creds = { storeUrl: env.UPSTASH_REDIS_REST_URL, storeToken: "store-token" };
  const wipe = () => {
    fake.members.clear(); fake.dmClosed.clear(); fake.messages.length = 0; fake.kicked.length = 0;
    fake.redis.clear(); fake.redisSets.clear(); fake.redisCalls.length = 0;
    fake.interactionEdits.length = 0; fake.registered.length = 0; fake.prCounts.clear(); fake.ghSearches.length = 0;
  };
  const catalyst = (id: string, hours = 24 * 40, extra: string[] = []) => fake.add(id, hours, [R.catalyst, ...extra]);
  const record = (id: string, login: string, over: Partial<{ name: string; since: string; listed: boolean }> = {}) =>
    writeMember(creds, id, { github: login, name: over.name ?? login, since: over.since ?? ago(24 * 40), listed: over.listed ?? true });
  const posted = (channel: string) => fake.messages.filter((m) => m.channel === channel);

  // ------------------------------------------------------------ the signature
  const stamp = String(Math.floor(NOW.getTime() / 1000));
  const sig = (ts: string, body: string) => sign(null, Buffer.from(ts + body), privateKey).toString("hex");
  const body = JSON.stringify({ type: 1 });
  const check = (over: Partial<Parameters<typeof verifyDiscordSignature>[0]> = {}) =>
    verifyDiscordSignature({ publicKeyHex: pubHex, signatureHex: sig(stamp, body), timestamp: stamp, body, nowSeconds: NOW.getTime() / 1000, ...over });
  await t("signature: a request signed with the application's key is accepted", () => {
    assert.equal(check(), true);
  });
  await t("signature: a changed body, timestamp, key or signature is refused", () => {
    assert.equal(check({ body: JSON.stringify({ type: 2 }) }), false);
    assert.equal(check({ timestamp: String(Number(stamp) + 1) }), false);
    assert.equal(check({ publicKeyHex: generateKeyPairSync("ed25519").publicKey.export({ type: "spki", format: "der" }).subarray(-32).toString("hex") }), false);
    assert.equal(check({ signatureHex: sig(stamp, body).replace(/^./, (c) => (c === "a" ? "b" : "a")) }), false);
  });
  await t("signature: missing, malformed or stale input is refused, never an error", () => {
    assert.equal(check({ signatureHex: null }), false);
    assert.equal(check({ timestamp: undefined }), false);
    assert.equal(check({ signatureHex: "zz".repeat(64) }), false);
    assert.equal(check({ signatureHex: "ab" }), false);
    assert.equal(check({ publicKeyHex: "short" }), false);
    assert.equal(check({ timestamp: "not-a-number", signatureHex: sig("not-a-number", body) }), false);
    const old = String(Number(stamp) - 301);
    assert.equal(check({ timestamp: old, signatureHex: sig(old, body) }), false, "a genuine but old request is a replay");
    const fresh = String(Number(stamp) - 299);
    assert.equal(check({ timestamp: fresh, signatureHex: sig(fresh, body) }), true);
  });

  // ------------------------------------------------------------ settings
  await t("config: the promotion settings are required and checked, and the defaults are sensible", () => {
    const c = promoteConfig({ ...env, DISCORD_PUBLIC_KEY: "nothex", PROMOTER_IDS: "abc", DISCORD_ROLE_MAINTAINER: "" });
    assert.equal(c.ok, false);
    if (!c.ok) {
      assert.ok(c.missing.includes("DISCORD_ROLE_MAINTAINER"));
      assert.ok(c.missing.some((m) => m.startsWith("DISCORD_PUBLIC_KEY (64 hex")));
      assert.ok(c.missing.some((m) => m.startsWith("PROMOTER_IDS (comma separated numeric")));
    }
    assert.equal(promoteConfig({ ...env, DISCORD_BOT_TOKEN: "" }).ok, false, "a missing join setting is reported too");
    assert.deepEqual([cfg.minDays, cfg.minPoints, cfg.orgs, cfg.promoterIds], [30, 8, ["orgA", "orgB"], [KEVIN]]);
    const dflt = cfgOf({ PROMOTE_GITHUB_ORGS: undefined, PROMOTER_IDS: `${KEVIN}, ${SOMEONE}` });
    assert.deepEqual([dflt.orgs, dflt.promoterIds], [["helloedithstudio", "Edith-Studio"], [KEVIN, SOMEONE]]);
    assert.deepEqual([cfgOf({ PROMOTE_MIN_DAYS: "0", PROMOTE_MIN_POINTS: "4" }).minDays, cfgOf({ PROMOTE_MIN_DAYS: "0", PROMOTE_MIN_POINTS: "4" }).minPoints], [0, 4]);
    assert.equal(cfgOf({ PROMOTE_MIN_POINTS: "0" }).minPoints, 8, "zero points would nominate everyone, so it falls back");
    assert.equal(cfgOf({ DISCORD_PUBLIC_KEY: pubHex.toUpperCase() }).publicKey, pubHex, "the key is normalised");
  });
  await t("commands: five admin-only slash commands with the options the handler reads", () => {
    assert.deepEqual(commandDefs.map((c) => c.name), ["promote", "demote", "credit", "list", "unlist"]);
    for (const c of commandDefs) assert.deepEqual([c.type, c.default_member_permissions, c.dm_permission], [1, "0", false]);
    assert.deepEqual(commandDefs.find((c) => c.name === "credit")!.options.map((o) => o.name), ["user", "reason"]);
    assert.deepEqual(commandDefs.find((c) => c.name === "list")!.options.map((o) => o.name), ["github"]);
  });

  // ------------------------------------------------------------ scoring
  await t("score: two points a merged pull request and a credit note, each capped, so it takes steady work", () => {
    assert.deepEqual(scoreOf({ mergedPrs: 3, credits: 1 }), { points: 8, prs: 6, credits: 2 });
    assert.equal(scoreOf({ mergedPrs: 50, credits: 50 }).points, (PR_CAP + CREDIT_CAP) * 2, "a burst cannot outrun the caps");
    assert.equal(scoreOf({ mergedPrs: -3, credits: 2.9 }).points, 4, "negative counts are ignored, fractions rounded down");
  });
  await t("score: time alone never nominates, and points alone are not enough without the time", () => {
    const rules = { minDays: 30, minPoints: 8 };
    assert.equal(eligibility({ days: 400, mergedPrs: 0, credits: 0 }, rules).ok, false);
    assert.match(eligibility({ days: 400, mergedPrs: 1, credits: 0 }, rules).why, /2 of 8 points/);
    assert.equal(eligibility({ days: 29.9, mergedPrs: 5, credits: 5 }, rules).ok, false);
    assert.match(eligibility({ days: 12, mergedPrs: 5, credits: 5 }, rules).why, /12 of 30 days/);
    assert.equal(eligibility({ days: 30, mergedPrs: 4, credits: 0 }, rules).ok, true);
    assert.equal(eligibility({ days: 30, mergedPrs: 2, credits: 2 }, rules).ok, true);
  });

  // ------------------------------------------------------------ GitHub
  await t("github: merged pull requests are added up across the organisations, since the date, for that author", async () => {
    wipe();
    fake.prCounts.set("ada|orgA", 3);
    fake.prCounts.set("ada|orgB", 2);
    assert.equal(await mergedPrCount(cfg, "ada", new Date("2026-08-02T10:00:00Z")), 5);
    assert.equal(fake.ghSearches.length, 2);
    assert.match(decodeURIComponent(fake.ghSearches[0]), /is:pr is:merged author:ada org:orgA merged:>=2026-08-02/);
    assert.equal(await mergedPrCount(cfg, "nobody", new Date(NOW)), 0);
  });
  await t("github: an odd username or organisation never reaches the search, and an unhappy GitHub is an error, not a zero", async () => {
    await assert.rejects(mergedPrCount(cfg, "ada org:other", new Date(NOW)), /not a GitHub username/);
    await assert.rejects(mergedPrCount({ ...cfg, orgs: ["a b"] }, "ada", new Date(NOW)), /not a GitHub organisation/);
    await assert.rejects(mergedPrCount({ ...cfg, githubApiBase: `http://127.0.0.1:${port}/nowhere` }, "ada", new Date(NOW)), /answered 40\d/);
  });

  // ------------------------------------------------------------ stored notes
  await t("store: credit notes and promotion state are kept, read, capped and removed", async () => {
    wipe();
    assert.deepEqual(await readCredits(creds, "5551"), []);
    assert.equal(await addCredit(creds, "5551", { at: ago(1), reason: "helped", by: KEVIN }), 1);
    assert.equal(await addCredit(creds, "5551", { at: ago(0), reason: "shipped", by: KEVIN }), 2);
    assert.deepEqual((await readCredits(creds, "5551")).map((c) => c.reason), ["helped", "shipped"]);
    for (let i = 0; i < 120; i++) await addCredit(creds, "5551", { at: ago(0), reason: "n" + i, by: KEVIN });
    assert.equal((await readCredits(creds, "5551")).length, 100, "the list stays short");
    assert.equal(await readPromo(creds, "5551"), null);
    await writePromo(creds, "5551", { state: "nominated", at: ago(0) });
    assert.equal((await readPromo(creds, "5551"))?.state, "nominated");
    fake.redis.set("promo:bad", "{nope");
    assert.equal(await readPromo(creds, "bad"), null, "a bad row is ignored");
    await removePromotionData(creds, "5551");
    assert.deepEqual([await readCredits(creds, "5551"), await readPromo(creds, "5551")], [[], null]);
  });

  // ------------------------------------------------------------ promote and demote
  await t("promote: only a Catalyst who is in the server, and not a bot or the owner, can be promoted", async () => {
    wipe();
    fake.add("30001", 100); // in the server, no Catalyst role
    fake.add("30002", 100, [R.catalyst], { bot: true });
    fake.add("owner-1", 500, [R.catalyst]);
    for (const [id, re] of [["99999", /not in the server/], ["30001", /not a Catalyst yet/], ["30002", /cannot be promoted/], ["owner-1", /cannot be promoted/]] as const) {
      const r = await promote(cfg, d, id, KEVIN, NOW);
      assert.equal(r.ok, false, id);
      assert.match(r.message, re, id);
    }
    assert.equal(fake.messages.length, 0, "nothing was sent about anyone refused");
    assert.ok(!fake.members.get("30001")!.roles.includes(R.maintainer));
  });
  await t("promote: an opted in Catalyst gets the role, keeps Catalyst, is moved to Maintainers on the Legion page, told, and logged", async () => {
    wipe();
    catalyst("30010");
    await record("30010", "ada-l", { name: "Ada" });
    await writeDirectoryEntry(creds, { github: "ada-l", name: "Ada", interests: ["AI"], joined: "2026-08-01" });
    const r = await promote(cfg, d, "30010", KEVIN, NOW);
    assert.equal(r.ok, true);
    assert.match(r.message, /Promoted <@30010> to Maintainer\. They now appear under Maintainers/);
    assert.deepEqual(fake.members.get("30010")!.roles, [R.catalyst, R.maintainer]);
    const e = await readDirectoryEntry(creds, "ada-l");
    assert.deepEqual([e?.role, e?.name, e?.interests, e?.joined], ["Maintainer", "Ada", ["AI"], "2026-08-01"], "the rest of their entry is kept");
    assert.deepEqual(await readPromo(creds, "30010"), { state: "promoted", at: NOW.toISOString(), by: KEVIN });
    assert.match(posted("dm-30010")[0].body.content, /promoted to Maintainer on edith.*https:\/\/site\.test\/legion/);
    const log = posted("promos")[0].body;
    assert.match(log.content, /<@30010> was promoted to Maintainer by <@90001>/);
    assert.deepEqual(log.allowed_mentions, { parse: [] }, "the log never pings anyone");
  });
  await t("promote: opted in but not yet on the page gets a Maintainer entry; not opted in is promoted in Discord only; no record says so", async () => {
    wipe();
    catalyst("30020");
    catalyst("30021");
    catalyst("30022");
    await record("30020", "opted-in", { name: "Opted In", since: "2026-07-15T08:00:00.000Z", listed: true });
    await record("30021", "private-one", { listed: false });
    const a = await promote(cfg, d, "30020", KEVIN, NOW);
    assert.match(a.message, /appear under Maintainers/);
    assert.deepEqual(
      [(await readDirectoryEntry(creds, "opted-in"))?.role, (await readDirectoryEntry(creds, "opted-in"))?.joined, (await readDirectoryEntry(creds, "opted-in"))?.name],
      ["Maintainer", "2026-07-15", "Opted In"],
    );
    const b = await promote(cfg, d, "30021", KEVIN, NOW);
    assert.match(b.message, /not shown on the Legion page \(they did not tick the box\)/);
    assert.equal(await readDirectoryEntry(creds, "private-one"), null, "a Maintainer role never publishes someone who did not opt in");
    const c = await promote(cfg, d, "30022", KEVIN, NOW);
    assert.match(c.message, /not signed in at \/join/);
    for (const id of ["30020", "30021", "30022"]) assert.ok(fake.members.get(id)!.roles.includes(R.maintainer), id);
  });
  await t("promote: doing it twice changes nothing, and closed direct messages do not stop it", async () => {
    wipe();
    catalyst("30030");
    fake.dmClosed.add("30030");
    assert.equal((await promote(cfg, d, "30030", KEVIN, NOW)).ok, true);
    const before = fake.messages.length;
    const again = await promote(cfg, d, "30030", KEVIN, NOW);
    assert.deepEqual([again.ok, /already a Maintainer/.test(again.message)], [true, true]);
    assert.equal(fake.messages.length, before, "no second log, no second message");
    assert.equal(fake.members.get("30030")!.roles.filter((r) => r === R.maintainer).length, 1);
  });
  await t("demote: removes the Maintainer role, puts them back under Catalysts, and does not nominate them again for 90 days", async () => {
    wipe();
    catalyst("30040", 24 * 40, [R.maintainer]);
    await record("30040", "mo", { name: "Mo" });
    await writeDirectoryEntry(creds, { github: "mo", name: "Mo", role: "Maintainer", booking: "https://cal.test/mo" });
    const r = await demote(cfg, d, "30040", KEVIN, NOW);
    assert.match(r.message, /Demoted <@30040>.*back under Catalysts.*90 days/);
    assert.deepEqual(fake.members.get("30040")!.roles, [R.catalyst]);
    const e = await readDirectoryEntry(creds, "mo");
    assert.deepEqual([e?.role, e?.booking, e?.name], [undefined, "https://cal.test/mo", "Mo"]);
    const p = await readPromo(creds, "30040");
    assert.equal(p?.state === "snoozed" && Date.parse(p.until), NOW.getTime() + 90 * DAY);
    assert.match(posted("promos")[0].body.content, /demoted from Maintainer by <@90001>/);
    const again = await demote(cfg, d, "30040", KEVIN, NOW);
    assert.match(again.message, /was not a Maintainer\. Nothing changed/);
    fake.add("owner-1", 500, [R.maintainer]);
    assert.equal((await demote(cfg, d, "owner-1", KEVIN, NOW)).ok, false, "the server owner is never demoted from here");
    assert.ok(fake.members.get("owner-1")!.roles.includes(R.maintainer));
  });

  // ------------------------------------------------------------ credit, list, unlist, snooze
  await t("credit: a Catalyst can be credited with a reason; people who are not Catalysts, bots and empty reasons are refused", async () => {
    wipe();
    catalyst("30050");
    fake.add("30051", 50);
    fake.add("30052", 50, [R.catalyst], { bot: true });
    const first = await creditNote(cfg, d, "30050", KEVIN, "  Fixed the **docs**\n build  ", NOW);
    assert.match(first.message, /Noted for <@30050>: "Fixed the \*\*docs\*\* build"\. That is 1 credit note so far/);
    assert.match((await creditNote(cfg, d, "30050", KEVIN, "Ran the demo day", NOW)).message, /2 credit notes so far/);
    const saved = await readCredits(creds, "30050");
    assert.deepEqual([saved.length, saved[0].by, saved[0].at], [2, KEVIN, NOW.toISOString()]);
    assert.equal((await creditNote(cfg, d, "30050", KEVIN, "ok", NOW)).ok, false);
    assert.match((await creditNote(cfg, d, "30051", KEVIN, "good work here", NOW)).message, /not a Catalyst yet/);
    assert.match((await creditNote(cfg, d, "30052", KEVIN, "good work here", NOW)).message, /not bots/);
    assert.match((await creditNote(cfg, d, "99999", KEVIN, "good work here", NOW)).message, /not in the server/);
  });
  await t("list and unlist: add and remove a Legion entry by GitHub username, check the name, and never overwrite a fuller entry", async () => {
    wipe();
    const added = await listPerson(cfg, "@Grace-Hopper", NOW);
    assert.match(added.message, /Added Grace-Hopper.*not verified/);
    assert.deepEqual([(await readDirectoryEntry(creds, "Grace-Hopper"))?.joined], ["2026-10-01"]);
    await writeDirectoryEntry(creds, { github: "ada-l", name: "Ada", interests: ["AI"] });
    assert.match((await listPerson(cfg, "ada-l", NOW)).message, /already on the Legion page/);
    assert.deepEqual((await readDirectoryEntry(creds, "ada-l"))?.interests, ["AI"]);
    for (const bad of ["", "has space", "-lead", "trail-", "a".repeat(40), "ada/../x"]) assert.equal((await listPerson(cfg, bad, NOW)).ok, false, bad);
    assert.match((await unlistPerson(cfg, "Grace-Hopper")).message, /Removed Grace-Hopper/);
    assert.equal(await readDirectoryEntry(creds, "Grace-Hopper"), null);
    assert.match((await unlistPerson(cfg, "Grace-Hopper")).message, /not on the Legion page/);
  });
  await t("snooze: Not yet quiets a person for 30 days", async () => {
    wipe();
    const r = await snooze(cfg, "30060", NOW);
    assert.match(r.message, /Not yet for <@30060>.*30 days/);
    const p = await readPromo(creds, "30060");
    assert.equal(p?.state === "snoozed" && Date.parse(p.until), NOW.getTime() + 30 * DAY);
  });

  // ------------------------------------------------------------ nominations
  const counts = (m: Record<string, number>) => async (_c: unknown, login: string) => m[login] ?? 0;
  await t("scan: posts a nomination with buttons for a qualifying Catalyst, once, and says why others are waiting", async () => {
    wipe();
    catalyst("40001"); await record("40001", "strong", { name: "Strong One" });
    catalyst("40002"); await record("40002", "weak");
    catalyst("40003", 24 * 10); await record("40003", "newcomer", { since: ago(24 * 10) });
    catalyst("40004"); await record("40004", "credited");
    for (let i = 0; i < 4; i++) await addCredit(creds, "40004", { at: ago(24 * (5 + i)), reason: "good work " + i, by: KEVIN });
    for (let i = 0; i < 3; i++) await addCredit(creds, "40004", { at: ago(24 * 100), reason: "too old " + i, by: KEVIN }); // outside the 90 days
    catalyst("40006", 24 * 40, [R.maintainer]); await record("40006", "already-maint");
    await record("40007", "left-server");
    const seen: string[] = [];
    const prCount = async (_c: unknown, login: string) => (seen.push(login), ({ strong: 4, weak: 1, newcomer: 5, credited: 0, "already-maint": 9 } as Record<string, number>)[login] ?? 0);
    const r = await scanNominations(cfg, d, { now: NOW, prCount });
    assert.deepEqual(r.errors, []);
    assert.deepEqual(r.nominated.sort(), ["40001", "40004"]);
    assert.deepEqual(r.waiting, ["40002: 2 of 8 points"]);
    assert.ok(!seen.includes("newcomer"), "too new: GitHub is not even asked");
    assert.ok(!seen.includes("already-maint") && !seen.includes("left-server"), "no wasted lookups for people who cannot be promoted");
    const msg = posted("promos").find((m) => /<@40001>/.test(m.body.content))!.body;
    assert.deepEqual(msg.allowed_mentions, { parse: [] });
    assert.deepEqual(msg.components[0].components.map((c: any) => [c.label, c.custom_id]), [["Promote", "promo:yes:40001"], ["Not yet", "promo:no:40001"]]);
    const f = Object.fromEntries(msg.embeds[0].fields.map((x: any) => [x.name, x.value]));
    assert.deepEqual([f["GitHub"], f["Catalyst for"], f["Merged pull requests (60 days)"], f["Points"]], ["https://github.com/strong", "40 days", "4", "8 (needed: 8)"]);
    const credited = Object.fromEntries(posted("promos").find((m) => /<@40004>/.test(m.body.content))!.body.embeds[0].fields.map((x: any) => [x.name, x.value]));
    assert.equal(credited["Credit notes (90 days)"], "4", "credit notes older than 90 days do not count");
    assert.equal((await readPromo(creds, "40001"))?.state, "nominated");
    const again = await scanNominations(cfg, d, { now: NOW, prCount });
    assert.deepEqual(again.nominated, [], "nobody is nominated twice");
    assert.equal(posted("promos").length, 2);
  });
  await t("scan: snoozed people stay quiet until the snooze ends, promoted people never come back, and a dry run posts nothing", async () => {
    wipe();
    catalyst("40010"); await record("40010", "snoozed-now"); await writePromo(creds, "40010", { state: "snoozed", until: new Date(NOW.getTime() + 10 * DAY).toISOString() });
    catalyst("40011"); await record("40011", "snoozed-over"); await writePromo(creds, "40011", { state: "snoozed", until: new Date(NOW.getTime() - DAY).toISOString() });
    catalyst("40012"); await record("40012", "was-promoted"); await writePromo(creds, "40012", { state: "promoted", at: ago(24), by: KEVIN });
    const prCount = counts({ "snoozed-now": 9, "snoozed-over": 9, "was-promoted": 9 });
    const dry = await scanNominations(cfg, d, { now: NOW, prCount, dry: true });
    assert.deepEqual([dry.dryRun, dry.nominated], [true, ["40011"]]);
    assert.equal(posted("promos").length, 0);
    assert.equal(await readPromo(creds, "40011").then((p) => p?.state), "snoozed", "a dry run changes nothing");
    const live = await scanNominations(cfg, d, { now: NOW, prCount });
    assert.deepEqual(live.nominated, ["40011"]);
  });
  await t("scan: a GitHub problem for one person is recorded and does not stop the others", async () => {
    wipe();
    catalyst("40020"); await record("40020", "broken");
    catalyst("40021"); await record("40021", "fine");
    const prCount = async (_c: unknown, login: string) => {
      if (login === "broken") throw new Error("GitHub search answered 403");
      return 5;
    };
    const r = await scanNominations(cfg, d, { now: NOW, prCount });
    assert.deepEqual([r.nominated, r.errors], [["40021"], ["40020: GitHub search answered 403"]]);
    assert.equal(await readPromo(creds, "40020"), null, "the person who could not be checked is looked at again next time");
  });
  await t("scan: at most five nominations in one run, and the real GitHub lookup is used when none is given", async () => {
    wipe();
    for (let i = 0; i < 7; i++) {
      const id = String(40100 + i);
      catalyst(id);
      await record(id, "many" + i);
      fake.prCounts.set(`many${i}|orgA`, 5);
    }
    const r = await scanNominations(cfg, d, { now: NOW });
    assert.equal(r.nominated.length, MAX_NOMINATIONS_PER_RUN);
    assert.equal(posted("promos").length, MAX_NOMINATIONS_PER_RUN);
    const next = await scanNominations(cfg, d, { now: NOW });
    assert.equal(next.nominated.length, 2, "the rest come on the next run");
  });
  await t("members: every recorded Catalyst can be listed for the scan", async () => {
    wipe();
    await record("40200", "a");
    await record("40201", "b");
    assert.deepEqual((await readAllMembers(creds)).map(([id]) => id).sort(), ["40200", "40201"]);
  });

  // ------------------------------------------------------------ interactions
  const cmd = (name: string, options: { name: string; type: number; value: unknown }[] = [], by = KEVIN, extra: Partial<Interaction> = {}): Interaction => ({
    type: 2, token: "tok-" + name, guild_id: "G", member: { user: { id: by } }, data: { name, options }, ...extra,
  });
  const press = (custom_id: string, by = KEVIN): Interaction => ({ type: 3, token: "tok-btn", guild_id: "G", member: { user: { id: by } }, data: { custom_id } });
  const user = (id: string) => ({ name: "user", type: 6, value: id });
  const run = async (it: Interaction, over: { client?: any } = {}) => {
    const h = handleInteraction(cfg, it, { now: NOW, ...over });
    await h.work?.();
    return h;
  };
  await t("interactions: Discord's ping gets a pong, from anyone", () => {
    assert.deepEqual(handleInteraction(cfg, { type: 1, token: "x" }).response, { type: 1 });
  });
  await t("interactions: anyone who is not on the promoter list is refused privately and nothing happens", async () => {
    wipe();
    catalyst("50001");
    for (const it of [cmd("promote", [user("50001")], SOMEONE), press("promo:yes:50001", SOMEONE), cmd("promote", [user("50001")], ""), { type: 2, token: "t", guild_id: "G", data: { name: "promote" } } as Interaction]) {
      const h = await run(it);
      assert.equal(h.work, undefined);
      assert.deepEqual([(h.response as any).type, (h.response as any).data.flags], [4, 64]);
      assert.match((h.response as any).data.content, /Only the people who run edith's promotions/);
    }
    assert.ok(!fake.members.get("50001")!.roles.includes(R.maintainer));
    assert.equal(fake.interactionEdits.length, 0);
    const wrong = await run(cmd("promote", [user("50001")], KEVIN, { guild_id: "OTHER" }));
    assert.match((wrong.response as any).data.content, /only works in the edith server/);
    assert.equal(fake.members.get("50001")!.roles.includes(R.maintainer), false);
  });
  await t("interactions: /promote answers at once with a private working message, then edits it into the result", async () => {
    wipe();
    catalyst("50010");
    const h = handleInteraction(cfg, cmd("promote", [user("50010")]), { now: NOW });
    assert.deepEqual(h.response, { type: 5, data: { flags: 64 } });
    assert.ok(h.work);
    assert.ok(!fake.members.get("50010")!.roles.includes(R.maintainer), "nothing has happened before the answer is sent");
    await h.work!();
    assert.ok(fake.members.get("50010")!.roles.includes(R.maintainer));
    const edit = fake.interactionEdits.pop()!;
    assert.deepEqual([edit.app, edit.token], ["client-1", "tok-promote"]);
    assert.match(edit.body.content, /Promoted <@50010> to Maintainer/);
    assert.deepEqual(edit.body.allowed_mentions, { parse: [] });
  });
  await t("interactions: /demote, /credit, /list and /unlist run through the same gate and report back", async () => {
    wipe();
    catalyst("50020", 24 * 40, [R.maintainer]);
    catalyst("50021");
    await run(cmd("demote", [user("50020")]));
    assert.ok(!fake.members.get("50020")!.roles.includes(R.maintainer));
    assert.match(fake.interactionEdits.pop()!.body.content, /Demoted <@50020>/);
    await run(cmd("credit", [user("50021"), { name: "reason", type: 3, value: "Ran the workshop" }]));
    assert.match(fake.interactionEdits.pop()!.body.content, /Noted for <@50021>: "Ran the workshop"/);
    await run(cmd("list", [{ name: "github", type: 3, value: "grace-h" }]));
    assert.match(fake.interactionEdits.pop()!.body.content, /Added grace-h/);
    assert.ok(await readDirectoryEntry(creds, "grace-h"));
    await run(cmd("unlist", [{ name: "github", type: 3, value: "grace-h" }]));
    assert.match(fake.interactionEdits.pop()!.body.content, /Removed grace-h/);
    const unknown = await run(cmd("nonsense"));
    assert.match((unknown.response as any).data.content, /do not know that command/);
  });
  await t("interactions: the Promote button promotes, rewrites the nomination without buttons and says who decided", async () => {
    wipe();
    catalyst("50030");
    const h = handleInteraction(cfg, press("promo:yes:50030"), { now: NOW });
    assert.deepEqual(h.response, { type: 6 });
    await h.work!();
    assert.ok(fake.members.get("50030")!.roles.includes(R.maintainer));
    const edit = fake.interactionEdits.pop()!;
    assert.match(edit.body.content, /Promoted <@50030> to Maintainer[\s\S]*\nDecided by <@90001>\./);
    assert.deepEqual(edit.body.components, [], "the buttons are gone, so it cannot be pressed twice");
  });
  await t("interactions: Not yet snoozes for 30 days; a button that cannot succeed keeps its buttons; odd buttons are refused", async () => {
    wipe();
    catalyst("50040");
    fake.add("50041", 10); // not a Catalyst
    await run(press("promo:no:50040"));
    const e = fake.interactionEdits.pop()!;
    assert.match(e.body.content, /Not yet for <@50040>[\s\S]*Decided by <@90001>/);
    assert.deepEqual(e.body.components, []);
    const p = await readPromo(creds, "50040");
    assert.equal(p?.state === "snoozed" && Date.parse(p.until), NOW.getTime() + 30 * DAY);
    await run(press("promo:yes:50041"));
    const kept = fake.interactionEdits.pop()!;
    assert.match(kept.body.content, /not a Catalyst yet/);
    assert.equal("components" in kept.body, false, "a failed promote leaves the buttons so it can be tried again");
    for (const bad of ["promo:maybe:50040", "promo:yes:abc", "other:yes:50040", ""]) assert.match(((await run(press(bad))).response as any).data.content, /do not know that button/, bad);
  });
  await t("interactions: if the work fails the reply says so plainly, and nothing is thrown", async () => {
    wipe();
    const broken = { getMember: async () => { throw new Error("Discord is down"); }, ownerId: async () => "x", editInteraction: async (token: string, body: any) => { fake.interactionEdits.push({ app: "client-1", token, body }); } };
    const errors: unknown[] = [];
    const real = console.error;
    console.error = (...a: unknown[]) => void errors.push(a);
    try {
      await run(cmd("promote", [user("50050")]), { client: broken });
      await run(press("promo:yes:50050"), { client: broken });
    } finally {
      console.error = real;
    }
    assert.equal(fake.interactionEdits.length, 2);
    for (const e of fake.interactionEdits) assert.match(e.body.content, /Something went wrong and nothing may have changed/);
    assert.equal(errors.length, 2, "the cause is logged for whoever looks at the server");
  });
  await t("interactions: registering the commands sends the whole list for this server", async () => {
    wipe();
    await d.registerCommands(commandDefs);
    assert.equal(fake.registered.length, 1);
    assert.deepEqual(fake.registered[0].map((c: any) => c.name), ["promote", "demote", "credit", "list", "unlist"]);
  });

  // ------------------------------------------------------------ who can see which channel
  const VIEW = "1024";
  const ADMIN = "8";
  const roles = [
    { id: "G", name: "@everyone", permissions: VIEW }, // a server's @everyone role has the server's own id
    { id: R.pending, name: "Pending", permissions: "0" },
    { id: R.catalyst, name: "Catalyst", permissions: "0" },
    { id: R.maintainer, name: "Maintainer", permissions: "0" },
    { id: "r-admin", name: "Staff", permissions: ADMIN },
    { id: "r-viewer", name: "Viewer", permissions: VIEW },
  ];
  const ow = (id: string, allow: string, deny: string, type: 0 | 1 = 0) => ({ id, type, allow, deny });
  const chan = (id: string, name: string, parent: string | null, permission_overwrites: ReturnType<typeof ow>[] = [], type = 0) => ({ id, name, type, parent_id: parent, permission_overwrites });
  const seeA = (c: ReturnType<typeof chan>, roleIds: string[]) => canView(c, roles, roleIds, "G");
  await t("audit: with no overwrites everyone can see a channel, and a deny on @everyone hides it from people with no role", () => {
    assert.equal(seeA(chan("1", "general", null), []), true);
    assert.equal(seeA(chan("2", "hidden", null, [ow("G", "0", VIEW)]), []), false);
  });
  await t("audit: a role overwrite that allows brings the channel back, and allows beat denies from other roles", () => {
    const c = chan("3", "inner", null, [ow("G", "0", VIEW), ow(R.catalyst, VIEW, "0"), ow(R.pending, "0", VIEW)]);
    assert.equal(seeA(c, [R.catalyst]), true);
    assert.equal(seeA(c, [R.pending]), false);
    assert.equal(seeA(c, [R.catalyst, R.pending]), true, "Discord adds the allows after the denies, so the allow wins");
    assert.equal(seeA(c, [R.maintainer]), false);
  });
  await t("audit: a role's own permission lets people see a channel the @everyone role cannot, and Administrator ignores every overwrite", () => {
    const everyoneBlind = [{ ...roles[0], permissions: "0" }, ...roles.slice(1)];
    const c = chan("4", "vip", null);
    assert.equal(canView(c, everyoneBlind, [], "G"), false);
    assert.equal(canView(c, everyoneBlind, ["r-viewer"], "G"), true, "the role carries the View Channel permission itself");
    const locked = chan("5", "locked", null, [ow("G", "0", VIEW), ow("r-admin", "0", VIEW)]);
    assert.equal(seeA(locked, ["r-admin"]), true, "Administrator beats a deny");
  });
  await t("audit: overwrites for one named person are ignored, since the table is about roles", () => {
    assert.equal(seeA(chan("6", "personal", null, [ow("G", "0", VIEW), ow(R.catalyst, "0", "0"), ow("somebody", VIEW, "0", 1)]), [R.catalyst]), false);
  });

  const viewers = [
    { name: "No role", roleIds: [] },
    { name: "Pending", roleIds: [R.pending] },
    { name: "Catalyst", roleIds: [R.catalyst] },
    { name: "Maintainer", roleIds: [R.catalyst, R.maintainer] },
  ];
  const hideFromAll = (...allowed: string[]) => [ow("G", "0", VIEW), ...allowed.map((id) => ow(id, VIEW, "0"))];
  const goodServer = [
    chan("c1", "Start here", null, [], 4),
    chan("c2", "Community", null, hideFromAll(R.catalyst, R.maintainer), 4),
    chan("c3", "Maintainers", null, hideFromAll(R.maintainer), 4),
    chan("a", "welcome", "c1"),
    chan("b", "general", "c2", hideFromAll(R.catalyst, R.maintainer)),
    chan("c", "maintainers-lounge", "c3", hideFromAll(R.maintainer)),
  ];
  await t("audit: a correctly set up server has no problems, and the table says who sees what", () => {
    const a = auditChannels(goodServer, roles, viewers, "G");
    assert.deepEqual(a.problems, []);
    const row = (n: string) => a.rows.find((r) => r.name === n)!.sees;
    assert.deepEqual(row("welcome"), { "No role": true, Pending: true, Catalyst: true, Maintainer: true });
    assert.deepEqual(row("general"), { "No role": false, Pending: false, Catalyst: true, Maintainer: true });
    assert.deepEqual(row("maintainers-lounge"), { "No role": false, Pending: false, Catalyst: false, Maintainer: true });
    assert.ok(a.notes.some((n) => /1 channel is for Maintainers only: #maintainers-lounge \(in Maintainers\)/.test(n)));
    assert.ok(a.notes.some((n) => /1 channel can be seen by anyone in the server.*#welcome/.test(n)));
    assert.ok(a.notes.some((n) => /"Staff" has Administrator/.test(n)));
    assert.deepEqual(a.rows.map((r) => r.category), ["Community", "Maintainers", "Start here"].flatMap((c) => [c]), "grouped by category, categories themselves are not rows");
  });
  await t("audit: a Maintainer channel that Catalysts, Pending members or anyone can see is a problem, named plainly", () => {
    const leaky = goodServer.map((c) => (c.id === "c" ? chan("c", "maintainers-lounge", "c3", []) : c)); // no overwrites: open to all
    const a = auditChannels(leaky, roles, viewers, "G");
    assert.ok(a.problems.some((p) => /#maintainers-lounge \(in Maintainers\) looks like a Maintainer channel but anyone in the server can see it/.test(p)), a.problems.join(" | "));
    assert.ok(a.problems.some((p) => /but a Pending can see it/.test(p)));
    assert.ok(a.problems.some((p) => /but a Catalyst can see it/.test(p)));
  });
  await t("audit: no Maintainers-only channel at all means a promotion unlocks nothing, and the wrong way round is flagged", () => {
    const none = goodServer.filter((c) => c.id !== "c");
    assert.ok(auditChannels(none, roles, viewers, "G").problems.some((p) => /No channel is visible only to Maintainers/.test(p)));
    // Everyone can see it, but the Maintainer role itself is denied: Catalysts get in, Maintainers (who are Catalysts too) do not.
    const backwards = [...goodServer, chan("x", "club", null, [ow(R.maintainer, "0", VIEW)])];
    const a = auditChannels(backwards, roles, viewers, "G");
    assert.deepEqual([a.rows.find((r) => r.name === "club")!.sees["Catalyst"], a.rows.find((r) => r.name === "club")!.sees["Maintainer"]], [true, false]);
    assert.ok(a.problems.some((p) => /#club is visible to Catalysts but not to Maintainers, which is the wrong way round/.test(p)), a.problems.join(" | "));
  });
  await t("audit: the plain text table lists every channel and the verdict", () => {
    const text = auditText(auditChannels(goodServer, roles, viewers, "G"));
    assert.match(text, /^channel\s+No role\s+Pending\s+Catalyst\s+Maintainer/);
    assert.match(text, /Maintainers \/ #maintainers-lounge\s+-\s+-\s+-\s+can see/);
    assert.match(text, /No problems found\./);
    assert.match(auditText(auditChannels(goodServer.slice(0, 5), roles, viewers, "G")), /PROBLEMS\n- No channel is visible only to Maintainers/);
  });
  await t("audit: the Discord client reads the server's channels and roles", async () => {
    wipe();
    fake.channels.push(...goodServer);
    fake.roles.push(...roles);
    assert.equal((await d.listChannels()).length, goodServer.length);
    assert.deepEqual((await d.listRoles()).map((r) => r.name), roles.map((r) => r.name));
    const a = auditChannels(await d.listChannels(), await d.listRoles(), viewers, cfg.guildId);
    assert.equal(cfg.guildId, "G", "the @everyone role is found by the server's id");
    assert.deepEqual(a.problems, []);
    fake.channels.length = 0;
    fake.roles.length = 0;
  });

  fake.server.close();
  console.log(`\n${passed} passed${process.exitCode ? ", some failed" : ", 0 failed"}`);
})();
