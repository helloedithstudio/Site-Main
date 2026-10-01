// A short lock in Redis, so two callers of the same job (the GitHub schedule and the QStash schedule) never run it at the
// same time. Discord roles are the sweep's only state, so without this two overlapping runs could both see "not invited yet"
// and message the same person twice. The lock expires by itself, so a crashed run can never block the job for long.

import { randomBytes } from "node:crypto";

type Run = (...cmd: (string | number)[]) => Promise<unknown>;

export type Locked<T> = { ran: true; value: T; unlocked?: true } | { ran: false };

/**
 * Runs `fn` if nobody else holds the lock called `name`; otherwise does nothing and says so.
 * With `failOpen`, a database that cannot be reached means `fn` runs without the lock (flagged `unlocked`) instead of the
 * whole job failing. Errors thrown by `fn` itself always pass straight through.
 */
export async function withLock<T>(run: Run, name: string, seconds: number, fn: () => Promise<T>, opts: { failOpen?: boolean } = {}): Promise<Locked<T>> {
  const key = `lock:${name}`;
  const mine = randomBytes(12).toString("hex");
  let got: unknown;
  try {
    got = await run("SET", key, mine, "NX", "EX", seconds);
  } catch (e) {
    if (!opts.failOpen) throw e;
    return { ran: true, value: await fn(), unlocked: true };
  }
  if (got !== "OK") return { ran: false };
  try {
    return { ran: true, value: await fn() };
  } finally {
    // Only release our own lock: if it expired and someone else took it, leave theirs alone.
    try {
      if ((await run("GET", key)) === mine) await run("DEL", key);
    } catch {
      // the lock expires by itself in a couple of minutes
    }
  }
}
