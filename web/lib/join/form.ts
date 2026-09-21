// The Catalyst form: what is asked, and the server-side checks. The browser is never trusted: everything is cleaned and
// validated again here. Collect only what the directory and the community need (data minimisation).

import { normaliseLogin, safeUrl } from "@/lib/github";
import { legionInterests } from "@/lib/legion";

export type FormValue = {
  name: string;
  github: string;
  interests: string[];
  portfolio?: string;
  about?: string;
  /** A separate, clearly worded tick: being shown on the public Legion page. */
  listPublicly: boolean;
};

export type FormResult = { ok: true; value: FormValue } | { ok: false; errors: Record<string, string> };

/** Removes control characters and collapses spaces. */
export const clean = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";

export function validateForm(raw: unknown): FormResult {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};

  // A hidden field only a bot fills in.
  if (clean(r.website, 100)) return { ok: false, errors: { form: "Something went wrong. Please try again." } };

  const name = clean(r.name, 60);
  if (!name) errors.name = "Tell us what to call you.";

  const github = normaliseLogin(clean(r.github, 120));
  if (!github) errors.github = "Enter your GitHub username, for example octocat.";

  const chosen = Array.isArray(r.interests) ? r.interests.filter((i): i is string => typeof i === "string") : [];
  const interests = legionInterests.filter((i) => chosen.includes(i));
  if (!interests.length) errors.interests = "Pick at least one area.";

  let portfolio: string | undefined;
  const p = clean(r.portfolio, 300);
  if (p) {
    portfolio = safeUrl(p);
    if (!portfolio) errors.portfolio = "Enter a web address, for example https://example.com.";
  }

  const about = clean(r.about, 160) || undefined;

  if (r.rulesAck !== true) errors.rulesAck = "Please confirm that you have read the community rules.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, github: github!, interests, portfolio, about, listPublicly: r.listPublicly === true } };
}

/** Discord markdown and mentions are neutralised so nothing a person types can format or ping anyone. */
export const esc = (s: string) => s.replace(/([\\*_~`|>[\]()#-])/g, "\\$1").replace(/@/g, "@\u200b");
