// The Catalyst form: what is asked, and the server-side checks. The browser is never trusted: everything is cleaned and
// validated again here. Collect only what the directory and the community need (data minimisation).

import { normaliseLogin, safeUrl } from "@/lib/github";
import { legionInterests, maintainerEntries } from "@/lib/legion";

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

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");
const RESERVED = ["edith", "admin", "administrator", "moderator", "mod", "core", "mediator", "maintainer", "catalyst", "staff", "official", "support", "founder", "origin", "everyone", "here"];

/** Names that would let someone pass as edith, its staff or a Maintainer. */
export function isReservedName(name: string): boolean {
  const n = norm(name);
  if (!n) return false;
  if (n.includes("edith") || RESERVED.includes(n)) return true;
  return maintainerEntries.some((m) => (m.name && norm(m.name) === n) || norm(m.github) === n);
}

/** `githubLogin` is set when the person has proved they own that GitHub account; what they typed is then ignored. */
export function validateForm(raw: unknown, opts: { githubLogin?: string } = {}): FormResult {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};

  // A hidden field only a bot fills in.
  if (clean(r.website, 100)) return { ok: false, errors: { form: "Something went wrong. Please try again." } };

  const name = clean(r.name, 60);
  if (!name) errors.name = "Tell us what to call you.";
  else if (isReservedName(name)) errors.name = "That name is reserved. Add a middle initial, or ask a Core member if it really is yours.";

  const github = opts.githubLogin ?? normaliseLogin(clean(r.github, 120));
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
