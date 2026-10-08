// Shared validation and normalisation for the Catalyst registration form.
// Runs identically on the client (useCatalystForm) and on the server (POST /api/catalyst).
// No Zod dependency — keeps the bundle lean and matches the project's existing pattern.

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

/** Strip control characters and collapse internal whitespace. */
export const clean = (v: unknown, max: number): string =>
  typeof v === "string"
    ? v
        .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max)
    : "";

// ---------------------------------------------------------------------------
// Field normalisers — each returns the normalised value or null on rejection.
// ---------------------------------------------------------------------------

/**
 * Discord username / legacy tag / numeric ID.
 *
 * Accepts:
 *  - `username` or `@username`  (2-32 chars, lowercase letters, digits, underscores, dots;
 *    no consecutive dots)
 *  - `DisplayName#1234`  (legacy discriminator format — we keep only the part before `#`)
 *  - `123456789012345678`  (17-20 digit numeric user ID — returned as-is)
 */
export function normaliseDiscord(raw: string): string | null {
  const v = raw.trim().replace(/^@/, "");
  if (!v) return null;

  // Numeric-only strings are treated exclusively as snowflake user IDs.
  // This prevents a 16 or 21-digit all-digit string from accidentally
  // validating as a username.
  if (/^\d+$/.test(v)) {
    // Valid Discord snowflake: 17-20 digits
    return /^\d{17,20}$/.test(v) ? v : null;
  }

  // Legacy discriminator: strip the #0000 suffix, keep the display part lowercased
  const legacy = v.match(/^(.+)#\d{4}$/);
  const candidate = legacy ? legacy[1].toLowerCase() : v.toLowerCase();

  // Current username rules
  if (candidate.length < 2 || candidate.length > 32) return null;
  if (!/^[a-z0-9_.]+$/.test(candidate)) return null;
  if (/\.\./.test(candidate)) return null; // no consecutive dots

  return candidate;
}

const GH_LOGIN = /^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/i;

/**
 * GitHub username.
 * Accepts `username`, `@username`, or a full github.com URL.
 */
export function normaliseGitHub(raw: string): string | null {
  let v = raw.trim().replace(/^@/, "");
  const m = v.match(/github\.com\/([^/?#\s]+)/i);
  if (m) v = m[1];
  // Strip trailing .git
  v = v.replace(/\.git$/i, "");
  return GH_LOGIN.test(v) ? v : null;
}

/**
 * X (Twitter) handle.
 * Accepts `handle`, `@handle`, or an x.com / twitter.com profile URL.
 */
export function normaliseX(raw: string): string | null {
  let v = raw.trim().replace(/^@/, "");
  const m = v.match(/(?:x|twitter)\.com\/([^/?#\s]+)/i);
  if (m) v = m[1];
  // X handles: 1-15 word characters
  return v && /^\w{1,15}$/.test(v) ? v : null;
}

/**
 * LinkedIn profile slug.
 * Accepts `slug`, `@slug`, or a linkedin.com/in/... URL.
 */
export function normaliseLinkedIn(raw: string): string | null {
  let v = raw.trim().replace(/^@/, "");
  const m = v.match(/linkedin\.com\/in\/([^/?#\s]+)/i);
  if (m) v = m[1];
  // Slugs: 3-100 alphanumeric + hyphens
  return v && /^[a-z0-9-]{3,100}$/i.test(v) ? v : null;
}

/**
 * Portfolio URL.
 * Prepends https:// if no protocol is given.
 * Rejects javascript:, data:, and other unsafe schemes.
 * Returns the normalised URL string or null.
 */
export function normalisePortfolio(raw: string): string | null {
  const v = raw.trim();
  if (!v || v.length > 200) return null;
  if (/^(javascript|data|vbscript|file|blob|mailto|tel):/i.test(v)) return null;
  const hasScheme = /^https?:\/\//i.test(v);
  // Reject other explicit schemes and bare user@host patterns
  if (!hasScheme && (/^[a-z][a-z0-9+.-]*:\/\//i.test(v) || v.includes("@"))) return null;
  try {
    const u = new URL(hasScheme ? v : `https://${v}`);
    if ((u.protocol !== "http:" && u.protocol !== "https:") || u.username || u.password) return null;
    // Must have at least one dot in the hostname (rules out "localhost" etc.)
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Canonical form value type (after normalisation)
// ---------------------------------------------------------------------------

export type CatalystPayload = {
  /** Full name, 2-80 chars. */
  name: string;
  /** Normalised Discord username / ID. */
  discordId: string;
  /** Normalised GitHub username. */
  githubId: string;
  /** Normalised X handle (without @). */
  xId: string;
  /** Normalised LinkedIn slug. */
  linkedinId: string;
  /** Normalised portfolio URL (https://…). */
  portfolioUrl: string;
  /** Honeypot — must be empty. Never stored. */
  hp?: string;
};

// Raw shape coming over the wire (everything is a string; we do not trust types)
export type RawPayload = Record<string, unknown>;

export type FieldErrors = Record<keyof CatalystPayload | string, string>;

export type ValidationResult =
  | { ok: true; value: CatalystPayload }
  | { ok: false; errors: FieldErrors };

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

export function validateCatalyst(raw: RawPayload): ValidationResult {
  const errors: Partial<FieldErrors> = {};

  // ── Honeypot ──────────────────────────────────────────────────────────────
  if (clean(raw.hp, 200)) {
    // Silently reject bots with a generic message so they do not learn the field name
    return { ok: false, errors: { form: "Something went wrong. Please try again." } };
  }

  // ── Full Name ─────────────────────────────────────────────────────────────
  const name = clean(raw.name, 80);
  if (!name || name.length < 2) {
    errors.name = "Enter your full name (at least 2 characters).";
  }

  // ── Discord ID ────────────────────────────────────────────────────────────
  const rawDiscord = clean(raw.discordId, 64);
  const discordId = rawDiscord ? normaliseDiscord(rawDiscord) : null;
  if (!discordId) {
    errors.discordId =
      "Enter your Discord username — the one in your profile settings, not your display name.";
  }

  // ── GitHub ID ─────────────────────────────────────────────────────────────
  const rawGitHub = clean(raw.githubId, 200);
  const githubId = rawGitHub ? normaliseGitHub(rawGitHub) : null;
  if (!githubId) {
    errors.githubId = "Enter your GitHub username, for example octocat.";
  }

  // ── X (Twitter) handle ────────────────────────────────────────────────────
  const rawX = clean(raw.xId, 200);
  const xId = rawX ? normaliseX(rawX) : null;
  if (!xId) {
    errors.xId = "Enter your X handle, for example octocat.";
  }

  // ── LinkedIn slug ─────────────────────────────────────────────────────────
  const rawLinkedIn = clean(raw.linkedinId, 200);
  const linkedinId = rawLinkedIn ? normaliseLinkedIn(rawLinkedIn) : null;
  if (!linkedinId) {
    errors.linkedinId =
      "Enter your LinkedIn profile slug or full linkedin.com/in/… URL.";
  }

  // ── Portfolio URL ─────────────────────────────────────────────────────────
  const rawPortfolio = clean(raw.portfolioUrl, 200);
  const portfolioUrl = rawPortfolio ? normalisePortfolio(rawPortfolio) : null;
  if (!portfolioUrl) {
    errors.portfolioUrl =
      "Enter a website URL, for example https://example.com (http and https only).";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors: errors as FieldErrors };
  }

  return {
    ok: true,
    value: {
      name,
      discordId: discordId!,
      githubId: githubId!,
      xId: xId!,
      linkedinId: linkedinId!,
      portfolioUrl: portfolioUrl!,
    },
  };
}
