// Makes a personal Showcase link for a client. Run:
//
//   npx tsx scripts/pitch-link.ts --from Andrew-Kevin-007 --for "Acme Ltd" [--days 60] [--base https://edith-plum.vercel.app]
//
// --from is your GitHub username (you must be a Maintainer in lib/legion.ts), --for is the client's name as it should
// appear on the page, --days is how long the link works (1 to 365, default 60). PITCH_LINK_SECRET is read from the
// environment or from .env.local, and must be the same value the site has in Vercel.
import fs from "node:fs";
import path from "node:path";
import { cleanFor, signPitch, PITCH_SECRET_MIN } from "../lib/pitch";
import { maintainerEntries } from "../lib/legion";
import { brand } from "../lib/brand";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

function secretFromEnvFile(): string | undefined {
  const file = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(file)) return undefined;
  const line = fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("PITCH_LINK_SECRET="));
  return line?.slice("PITCH_LINK_SECRET=".length).trim().replace(/^["']|["']$/g, "") || undefined;
}

function fail(msg: string): never {
  console.error(`pitch-link: ${msg}`);
  process.exit(1);
}

const from = arg("from");
const forName = arg("for");
const days = Number(arg("days") ?? 60);
const base = (arg("base") ?? process.env.NEXT_PUBLIC_SITE_URL ?? brand.siteUrl).replace(/\/+$/, "");
const secret = process.env.PITCH_LINK_SECRET ?? secretFromEnvFile();

if (!from || !forName) fail('usage: --from <your GitHub username> --for "<client name>" [--days 60]');
const maintainer = maintainerEntries.find((e) => e.github.toLowerCase() === from.toLowerCase());
if (!maintainer) fail(`${from} is not a Maintainer in lib/legion.ts`);
if (!cleanFor(forName)) fail("the client name must be up to 60 letters, digits, spaces or & . , '");
if (!Number.isInteger(days) || days < 1 || days > 365) fail("--days must be a whole number from 1 to 365");
if (!secret || secret.length < PITCH_SECRET_MIN) fail(`set PITCH_LINK_SECRET (at least ${PITCH_SECRET_MIN} characters) in the environment or .env.local`);

const exp = Math.floor(Date.now() / 1000) + days * 86400;
const token = signPitch(secret, { v: 1, from: maintainer.github, for: forName, exp });
console.log(`${base}/studio?p=${token}`);
console.error(`works until ${new Date(exp * 1000).toUTCString()}`);
