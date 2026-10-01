// How many pull requests someone has had merged into the edith organisations, from GitHub's public search. Server only.
// It reads public data only. Without a token GitHub allows 10 searches a minute, with a plain token (no scope) 30, which is
// plenty for a daily check of a few dozen people.

import type { PromoteConfig } from "./config";

const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

/** Merged pull requests by `login` in each configured organisation since `since`, added up. Throws if GitHub does not answer. */
export async function mergedPrCount(cfg: Pick<PromoteConfig, "githubApiBase" | "orgs" | "githubToken">, login: string, since: Date): Promise<number> {
  if (!LOGIN.test(login)) throw new Error(`"${login}" is not a GitHub username`);
  const day = since.toISOString().slice(0, 10);
  let total = 0;
  for (const org of cfg.orgs) {
    if (!LOGIN.test(org)) throw new Error(`"${org}" is not a GitHub organisation name`);
    const q = `is:pr is:merged author:${login} org:${org} merged:>=${day}`;
    const res = await fetch(`${cfg.githubApiBase}/search/issues?q=${encodeURIComponent(q)}&per_page=1`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "edith-site",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(cfg.githubToken ? { Authorization: `Bearer ${cfg.githubToken}` } : {}),
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`GitHub search answered ${res.status}`);
    const j = (await res.json().catch(() => ({}))) as { total_count?: unknown };
    if (typeof j.total_count !== "number") throw new Error("GitHub search sent no count");
    total += j.total_count;
  }
  return total;
}
