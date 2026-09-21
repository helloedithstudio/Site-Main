// One person, one entry. Remembers which GitHub account is linked to which Discord account, so nobody can complete the
// Catalyst form twice, use one GitHub account for two Discord accounts, or use two GitHub accounts for one Discord account.
//
// What is stored: two keys per person, each a one-way code (HMAC with JOIN_ID_SECRET) of a Discord id or a GitHub id, with the
// other code as the value. No name, no username, no email. The codes cannot be turned back into ids without the secret, which
// only the site holds. Never rotate JOIN_ID_SECRET: it would make the store forget everyone.
//
// The backing database is an Upstash Redis reached over its REST API (Vercel Marketplace, free plan). Server only.

import { createHmac } from "node:crypto";
import type { JoinConfig } from "./config";

export type Claim = "ok" | "github-taken" | "discord-linked";

export type EntryStore = {
  /** Would this pairing be allowed? Writes nothing. */
  check(discordId: string, githubId: string): Promise<Claim>;
  /** Records the pairing if it is allowed. Doing it again for the same pair is fine. */
  claim(discordId: string, githubId: string): Promise<Claim>;
  /** Forgets a person (used when they ask to be removed, so they can start again). */
  release(discordId: string): Promise<boolean>;
};

export const code = (secret: string, kind: "dc" | "gh", id: string) => createHmac("sha256", secret).update(`${kind}:${id}`).digest("hex").slice(0, 40);

/** Redis commands over Upstash's REST API: a JSON array in a POST, a bearer token, and {"result": ...} back. */
export function upstash(cfg: Pick<JoinConfig, "storeUrl" | "storeToken">) {
  return async function run(...cmd: (string | number)[]): Promise<unknown> {
    const res = await fetch(cfg.storeUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.storeToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(cmd),
      signal: AbortSignal.timeout(8000),
    });
    const j = (await res.json().catch(() => ({}))) as { result?: unknown; error?: string };
    if (!res.ok || j.error) throw new Error(`entry store: ${j.error ?? res.status}`);
    return j.result ?? null;
  };
}

type Run = (...cmd: (string | number)[]) => Promise<unknown>;

/** The store logic, on top of any function that runs a Redis command. Kept separate so it can be tested. */
export function entryStore(secret: string, run: Run): EntryStore {
  const keys = (d: string, g: string) => ({ gh: `gh:${code(secret, "gh", g)}`, dc: `dc:${code(secret, "dc", d)}`, gv: code(secret, "gh", g), dv: code(secret, "dc", d) });

  async function decide(d: string, g: string): Promise<Claim> {
    const k = keys(d, g);
    const [ghOwner, dcGithub] = (await run("MGET", k.gh, k.dc)) as (string | null)[];
    if (ghOwner && ghOwner !== k.dv) return "github-taken";
    if (dcGithub && dcGithub !== k.gv) return "discord-linked";
    return "ok";
  }

  return {
    check: decide,
    async claim(d, g) {
      const k = keys(d, g);
      const first = await run("SET", k.gh, k.dv, "NX");
      const madeGh = first === "OK";
      if (!madeGh && (await run("GET", k.gh)) !== k.dv) return "github-taken";
      const second = await run("SET", k.dc, k.gv, "NX");
      if (second !== "OK" && (await run("GET", k.dc)) !== k.gv) {
        if (madeGh) await run("DEL", k.gh); // undo the half we just wrote
        return "discord-linked";
      }
      return "ok";
    },
    async release(d) {
      const dc = `dc:${code(secret, "dc", d)}`;
      const gv = (await run("GET", dc)) as string | null;
      if (!gv) return false;
      await run("DEL", dc, `gh:${gv}`);
      return true;
    },
  };
}

export const storeFor = (cfg: JoinConfig): EntryStore => entryStore(cfg.idSecret, upstash(cfg));

/** A tiny in-memory Redis for tests: just the commands the store uses. `dump()` shows what is stored. */
export function memoryRun(): Run & { dump: () => [string, string][] } {
  const m = new Map<string, string>();
  const run: Run = async (...cmd) => {
    const [op, ...a] = cmd.map(String);
    switch (op) {
      case "GET":
        return m.get(a[0]) ?? null;
      case "MGET":
        return a.map((k) => m.get(k) ?? null);
      case "SET":
        if (a.includes("NX") && m.has(a[0])) return null;
        m.set(a[0], a[1]);
        return "OK";
      case "DEL":
        return a.reduce((n, k) => n + (m.delete(k) ? 1 : 0), 0);
      default:
        throw new Error("unsupported " + op);
    }
  };
  return Object.assign(run, { dump: () => [...m.entries()] });
}
