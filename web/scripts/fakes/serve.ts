// Runs the fake Discord, GitHub and Redis (scripts/fakes/discord.ts) on a fixed port so a real browser can walk the join flow
// against the real site. Usage:  PORT=4455 npx tsx scripts/fakes/serve.ts
// Seeded for the join flow: "cat-1" already has the Catalyst role, "a-new" joined an hour ago. Both are in the server.

import { fakeDiscord } from "./discord";

const port = Number(process.env.PORT ?? 4455);
const fake = fakeDiscord();

fake.add("owner-1", 200);
fake.add("cat-1", 30, ["r-cat"]);
fake.add("a-new", 1);
// A GitHub login that does not exist on the real GitHub, so the Legion page never pulls in a stranger's profile.
const created = new Date(Date.now() - 400 * 86_400_000).toISOString();
fake.ghUsers.set("501", { login: "zz-ada-lovelace-test", name: "Ada Lovelace", created_at: created, type: "User" });
fake.ghUsers.set("502", { login: "zz-grace-hopper-test", name: "Grace Hopper", created_at: created, type: "User" });

fake.server.listen(port, "127.0.0.1", () => console.log(`fake services ready on ${port}`));
