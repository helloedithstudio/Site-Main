// Tests for the one-time Legion profile invitation to existing Catalysts, against the fake Discord and Redis. Run:
//   npx tsx scripts/invite-test.ts

import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { joinConfig, type JoinConfig } from "../lib/join/config";
import { discord } from "../lib/join/discord";
import { MAX_PER_RUN, PAUSE_MS, inviteProfiles, message, readInvited, removeInvite } from "../lib/join/invite";
import { writeMember } from "../lib/join/members";
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
const NOW = new Date("2026-10-01T12:00:00Z");
const ago = (h: number) => new Date(NOW.getTime() - h * HOUR).toISOString();
const R = { catalyst: "r-cat", pending: "r-pend", maintainer: "r-maint" };

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
    DISCORD_CHANNEL_FORMS: "forms",
    JOIN_SIGNING_SECRET: "s".repeat(40),
    JOIN_ID_SECRET: "i".repeat(40),
    CRON_SECRET: "c".repeat(30),
    DISCORD_API_BASE: `http://127.0.0.1:${port}/api/v10`,
    GITHUB_OAUTH_BASE: `http://127.0.0.1:${port}/gh`,
    GITHUB_API_BASE: `http://127.0.0.1:${port}/ghapi`,
    GITHUB_CLIENT_ID: "gh-client",
    GITHUB_CLIENT_SECRET: "gh-secret",
    UPSTASH_REDIS_REST_URL: `http://127.0.0.1:${port}/redis`,
    UPSTASH_REDIS_REST_TOKEN: "store-token",
    NEXT_PUBLIC_SITE_URL: "https://site.test",
  };
  const c = joinConfig(env);
  if (!c.ok) throw new Error("config: " + c.missing.join(", "));
  const cfg: JoinConfig = c.cfg;
  const d = discord(cfg);
  const creds = { storeUrl: env.UPSTASH_REDIS_REST_URL, storeToken: "store-token" };
  const noPause = async () => {};

  const wipe = () => {
    fake.members.clear(); fake.dmClosed.clear(); fake.messages.length = 0;
    fake.redis.clear(); fake.redisSets.clear(); fake.redisCalls.length = 0;
  };
  const profile = (id: string) => writeMember(creds, id, { github: "gh" + id, since: ago(100), listed: true });
  /** A server: the owner, a bot, someone with no role, three Catalysts without a profile, and one Catalyst with a profile. */
  const seed = async () => {
    wipe();
    fake.add("owner-1", 400, [R.catalyst]);
    fake.add("bot-1", 100, [R.catalyst], { bot: true });
    fake.add("20001", 100); // no role at all
    fake.add("20002", 100, [R.pending]); // pending, not a Catalyst yet
    fake.add("30001", 100, [R.catalyst]);
    fake.add("30002", 90, [R.catalyst, R.maintainer]);
    fake.add("30003", 80, [R.catalyst]);
    fake.add("40001", 70, [R.catalyst]); // already has a profile
    await profile("40001");
    fake.redisCalls.length = 0;
  };
  const dms = () => fake.messages.filter((m) => m.channel.startsWith("dm-"));

  await t("dry run: lists exactly the Catalysts with no profile (not bots, the owner, people without the role, or people who have a profile) and sends nothing", async () => {
    await seed();
    const r = await inviteProfiles(cfg, d, { now: NOW });
    assert.equal(r.dryRun, true);
    assert.deepEqual(r.would!.map((p) => p.id).sort(), ["30001", "30002", "30003"]);
    assert.equal(r.would![0].username.startsWith("user"), true, "it shows who, so the person running it can judge");
    assert.deepEqual([r.eligible, r.haveProfile, r.alreadyInvited, r.sent.length], [3, 1, 0, 0]);
    assert.match(r.note!, /Nothing was sent\. To send these 3, repeat the request with send=1&expect=3/);
    assert.equal(dms().length, 0, "not one message");
    assert.equal(fake.redisCalls.some((cmd) => cmd[0] === "SET"), false, "and nothing written either");
  });

  await t("send is refused unless it repeats the number the dry run showed", async () => {
    await seed();
    for (const expect of [undefined, 0, 2, 4, 99]) {
      const r = await inviteProfiles(cfg, d, { send: true, expect, now: NOW, pause: noPause });
      assert.deepEqual([r.sent.length, r.dryRun], [0, false], String(expect));
      assert.match(r.note!, /Nothing was sent\. 3 people would be messaged now, but you expected/, String(expect));
    }
    assert.equal(dms().length, 0);
  });

  await t("send with the right number messages each of them once, with the right words, and notes it", async () => {
    await seed();
    const pauses: number[] = [];
    const r = await inviteProfiles(cfg, d, { send: true, expect: 3, now: NOW, pause: async (ms) => void pauses.push(ms) });
    assert.deepEqual([r.dryRun, r.sent.sort(), r.unreachable, r.remaining], [false, ["30001", "30002", "30003"], [], 0]);
    assert.deepEqual(dms().map((m) => m.channel).sort(), ["dm-30001", "dm-30002", "dm-30003"]);
    assert.deepEqual(pauses, [PAUSE_MS, PAUSE_MS], "a pause between messages, none after the last");
    const text = dms()[0].body.content as string;
    assert.match(text, /I am Friday/);
    assert.match(text, /already a Catalyst, so there is no deadline and nothing about your role changes/);
    assert.match(text, /https:\/\/site\.test\/join/);
    assert.match(text, /Web2, Web3, AI, Hardware, Design/);
    assert.match(text, /I will not message you about it again/);
    assert.deepEqual(dms()[0].body.allowed_mentions, { parse: [] });
    assert.ok(!/[–—]/.test(text), "no dashes");
    assert.ok(text.length < 1900, "inside Discord's message limit");
    assert.equal(text, message(cfg));
    assert.deepEqual([...(await readInvited(creds, ["30001", "30002", "30003", "20001"]))].sort(), ["30001", "30002", "30003"]);
  });

  await t("a second run messages nobody again, and even sending with the right number (0) does nothing", async () => {
    const before = dms().length;
    const dry = await inviteProfiles(cfg, d, { now: NOW });
    assert.deepEqual([dry.eligible, dry.alreadyInvited], [0, 3]);
    assert.match(dry.note!, /Nobody to message/);
    const send = await inviteProfiles(cfg, d, { send: true, expect: 0, now: NOW, pause: noPause });
    assert.equal(send.sent.length, 0);
    assert.equal(dms().length, before);
  });

  await t("someone who sets up their profile after being listed drops out of the next run", async () => {
    await seed();
    await profile("30002");
    const r = await inviteProfiles(cfg, d, { now: NOW });
    assert.deepEqual(r.would!.map((p) => p.id).sort(), ["30001", "30003"]);
  });

  await t("closed direct messages are listed, noted so they are not knocked on again, and nobody is pinged in public", async () => {
    await seed();
    fake.dmClosed.add("30002");
    const r = await inviteProfiles(cfg, d, { send: true, expect: 3, now: NOW, pause: noPause });
    assert.deepEqual([r.sent.sort(), r.unreachable], [["30001", "30003"], ["30002"]]);
    assert.equal(fake.messages.some((m) => !m.channel.startsWith("dm-")), false, "no message in any server channel");
    const again = await inviteProfiles(cfg, d, { now: NOW });
    assert.equal(again.eligible, 0, "not retried");
    assert.equal(JSON.parse(fake.redis.get("profile-invite:30002")!).delivered, false);
  });

  await t("at most 20 people per run, the rest wait, and a second run takes them", async () => {
    await seed();
    for (let i = 0; i < 22; i++) fake.add("5" + String(i).padStart(4, "0"), 60, [R.catalyst]);
    const total = 3 + 22; // the three from the seed plus these
    const pauses: number[] = [];
    const r = await inviteProfiles(cfg, d, { send: true, expect: total, now: NOW, pause: async (ms) => void pauses.push(ms) });
    assert.deepEqual([r.sent.length, r.remaining], [MAX_PER_RUN, total - MAX_PER_RUN]);
    assert.match(r.note!, /5 more are waiting/);
    assert.equal(pauses.length, MAX_PER_RUN - 1);
    const next = await inviteProfiles(cfg, d, { send: true, expect: total - MAX_PER_RUN, now: NOW, pause: noPause });
    assert.deepEqual([next.sent.length, next.remaining], [total - MAX_PER_RUN, 0]);
    assert.equal(dms().length, total);
    assert.equal(new Set(dms().map((m) => m.channel)).size, total, "nobody got two");
  });

  await t("if Discord struggles part way, it stops, marks nobody it did not reach, and a later run picks them up", async () => {
    await seed();
    let calls = 0;
    const flaky = { ...d, dm: async (id: string, msg: Parameters<typeof d.dm>[1]) => { if (++calls === 2) throw new Error("Discord is rate limiting this app"); return d.dm(id, msg); } } as typeof d;
    const r = await inviteProfiles(cfg, flaky, { send: true, expect: 3, now: NOW, pause: noPause });
    assert.equal(r.sent.length, 1);
    assert.match(r.note!, /Stopped early: Discord did not answer properly \(Discord is rate limiting this app\)/);
    assert.equal(r.remaining, 2);
    assert.equal((await readInvited(creds, ["30001", "30002", "30003"])).size, 1, "only the one who was reached is marked");
    const later = await inviteProfiles(cfg, d, { send: true, expect: 2, now: NOW, pause: noPause });
    assert.equal(later.sent.length, 2);
    assert.equal(dms().length, 3);
  });

  await t("two runs at once cannot double send, and the lock is let go afterwards", async () => {
    await seed();
    fake.redis.set("lock:profile-invite", "someone-else");
    const blocked = await inviteProfiles(cfg, d, { send: true, expect: 3, now: NOW, pause: noPause });
    assert.match(blocked.note!, /already in progress/);
    assert.equal(dms().length, 0);
    assert.equal(fake.redis.get("lock:profile-invite"), "someone-else", "another run's lock is left alone");
    fake.redis.delete("lock:profile-invite");
    await inviteProfiles(cfg, d, { send: true, expect: 3, now: NOW, pause: noPause });
    assert.equal(fake.redis.has("lock:profile-invite"), false);
  });

  await t("releasing someone clears their invitation note, so they could be invited again", async () => {
    await seed();
    await inviteProfiles(cfg, d, { send: true, expect: 3, now: NOW, pause: noPause });
    await removeInvite(creds, "30001");
    const r = await inviteProfiles(cfg, d, { now: NOW });
    assert.deepEqual(r.would!.map((p) => p.id), ["30001"]);
  });

  fake.server.close();
  console.log(`\n${passed} passed${process.exitCode ? ", some failed" : ", 0 failed"}`);
})();
