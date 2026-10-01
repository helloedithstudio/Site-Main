// Runs the fake Discord, GitHub and Redis (scripts/fakes/discord.ts) on a fixed port so a real browser or HTTP client can walk
// the join and promotion flows against the real site. Usage:  PORT=4455 npx tsx scripts/fakes/serve.ts
// What it holds, and what it shows at GET /__state (members, messages, edits to replies, registered commands, Redis keys):
//   join flow:   "cat-1" already has the Catalyst role, "a-new" joined an hour ago. Both are in the server.
//   promotion:   "70001" and "70002" are Catalysts of 40 days with member records; 70001 is listed on the Legion page and has
//                five merged pull requests (qualifies), 70002 has one (does not). "70003" has the role but never signed in.

import { fakeDiscord } from "./discord";

const port = Number(process.env.PORT ?? 4455);
const fake = fakeDiscord();
const DAY = 86_400_000;

fake.add("owner-1", 200);
fake.add("cat-1", 30, ["r-cat"]);
fake.add("a-new", 1);
// A GitHub login that does not exist on the real GitHub, so the Legion page never pulls in a stranger's profile.
const created = new Date(Date.now() - 400 * DAY).toISOString();
fake.ghUsers.set("501", { login: "zz-ada-lovelace-test", name: "Ada Lovelace", created_at: created, type: "User" });
fake.ghUsers.set("502", { login: "zz-grace-hopper-test", name: "Grace Hopper", created_at: created, type: "User" });

const since = new Date(Date.now() - 40 * DAY).toISOString();
fake.add("70001", 24 * 40, ["r-cat"]);
fake.add("70002", 24 * 40, ["r-cat"]);
fake.add("70003", 24 * 40, ["r-cat"]);
fake.redis.set("member:70001", JSON.stringify({ github: "zz-promo-one-test", name: "Promo One", since, listed: true }));
fake.redis.set("member:70002", JSON.stringify({ github: "zz-promo-two-test", name: "Promo Two", since, listed: false }));
fake.redisSets.set("member:index", new Set(["70001", "70002"]));
fake.redis.set("legion:profile:zz-promo-one-test", JSON.stringify({ github: "zz-promo-one-test", name: "Promo One", interests: ["AI"], joined: since.slice(0, 10) }));
fake.redisSets.set("legion:index", new Set(["zz-promo-one-test"]));
fake.prCounts.set("zz-promo-one-test|orgA", 5);
fake.prCounts.set("zz-promo-two-test|orgA", 1);

// A fuller Legion page, for checking the two sections, the filters and "Show more" (LEGION_SEED=1 npx tsx scripts/fakes/serve.ts):
// one extra Maintainer, three Catalysts with different areas and join dates, and 26 filler Catalysts so there are more than
// one page of them. Not seeded by default, because other browser runs count the people on the page.
if (process.env.LEGION_SEED === "1") {
  const list = (e: { github: string; name: string; interests: string[]; joined: string; role?: string; note?: string }) => {
    fake.redis.set(`legion:profile:${e.github}`, JSON.stringify(e));
    fake.redisSets.get("legion:index")!.add(e.github);
  };
  list({ github: "zz-mara-test", name: "Mara Maintainer", role: "Maintainer", interests: ["Web2", "Design"], joined: "2026-09-20", note: "Runs the design hub." });
  list({ github: "zz-nina-test", name: "Nina Webthree", interests: ["Web3"], joined: "2026-09-30", note: "Building a wallet for people who dislike wallets." });
  list({ github: "zz-omar-test", name: "Omar Webtwo", interests: ["Web2", "AI"], joined: "2026-09-25" });
  for (let i = 1; i <= 26; i++) {
    const n = String(i).padStart(2, "0");
    list({ github: `zz-filler-${n}-test`, name: `Filler ${n}`, interests: ["Hardware"], joined: "2026-08-01" });
  }
}

// Channels and roles for the audit (GET /api/discord/audit). A sensible layout, plus one deliberate leak: "maintainer-notes" sits in
// Community with no overwrites, so everyone can see a channel that looks like it is for Maintainers.
const VIEW = "1024";
const hide = (...allowed: string[]) => [{ id: "G", type: 0 as const, allow: "0", deny: VIEW }, ...allowed.map((id) => ({ id, type: 0 as const, allow: VIEW, deny: "0" }))];
fake.roles.push(
  { id: "G", name: "@everyone", permissions: VIEW },
  { id: "r-pend", name: "Pending", permissions: "0" },
  { id: "r-cat", name: "Catalyst", permissions: "0" },
  { id: "r-maint", name: "Maintainer", permissions: "0" },
);
fake.channels.push(
  { id: "k1", name: "Start here", type: 4, parent_id: null, permission_overwrites: [] },
  { id: "k2", name: "Community", type: 4, parent_id: null, permission_overwrites: [] },
  { id: "k3", name: "Maintainers", type: 4, parent_id: null, permission_overwrites: hide("r-maint") },
  { id: "c1", name: "welcome", type: 0, parent_id: "k1", permission_overwrites: [] },
  { id: "c2", name: "general", type: 0, parent_id: "k2", permission_overwrites: [] },
  { id: "c3", name: "maintainers-lounge", type: 0, parent_id: "k3", permission_overwrites: hide("r-maint") },
  { id: "c4", name: "maintainer-notes", type: 0, parent_id: "k2", permission_overwrites: [] },
);

fake.server.listen(port, "127.0.0.1", () => console.log(`fake services ready on ${port}`));
