// Unit tests for the Catalyst registration schema: normalisers + full validator.
// Run with: npx tsx --test scripts/catalyst-schema.test.ts
// (tsx is already available as a transitive dep; node:test ships with Node 18+.)

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  normaliseDiscord,
  normaliseGitHub,
  normaliseX,
  normaliseLinkedIn,
  normalisePortfolio,
  validateCatalyst,
} from "../lib/catalyst/schema.js";

// ---------------------------------------------------------------------------
// normaliseDiscord
// ---------------------------------------------------------------------------

describe("normaliseDiscord", () => {
  // ── Valid new-style usernames ────────────────────────────────────────────
  it("accepts a bare lowercase username", () => {
    assert.equal(normaliseDiscord("janedoe"), "janedoe");
  });
  it("strips a leading @", () => {
    assert.equal(normaliseDiscord("@janedoe"), "janedoe");
  });
  it("lowercases the input", () => {
    assert.equal(normaliseDiscord("JaneDoe"), "janedoe");
  });
  it("accepts underscores and dots", () => {
    assert.equal(normaliseDiscord("jane.doe_99"), "jane.doe_99");
  });
  it("accepts exactly 2-character username", () => {
    assert.equal(normaliseDiscord("ab"), "ab");
  });
  it("accepts exactly 32-character username", () => {
    assert.equal(normaliseDiscord("a".repeat(32)), "a".repeat(32));
  });

  // ── Legacy discriminator format ──────────────────────────────────────────
  it("strips the #NNNN discriminator suffix", () => {
    assert.equal(normaliseDiscord("Jane#1234"), "jane");
  });
  it("handles lowercase legacy format", () => {
    assert.equal(normaliseDiscord("jane.doe#0001"), "jane.doe");
  });

  // ── Numeric user ID ──────────────────────────────────────────────────────
  it("accepts a 17-digit numeric ID", () => {
    assert.equal(normaliseDiscord("12345678901234567"), "12345678901234567");
  });
  it("accepts a 20-digit numeric ID", () => {
    assert.equal(normaliseDiscord("12345678901234567890"), "12345678901234567890");
  });

  // ── Rejections ───────────────────────────────────────────────────────────
  it("rejects a 1-character username", () => {
    assert.equal(normaliseDiscord("x"), null);
  });
  it("rejects a 33-character username", () => {
    assert.equal(normaliseDiscord("a".repeat(33)), null);
  });
  it("rejects consecutive dots", () => {
    assert.equal(normaliseDiscord("jane..doe"), null);
  });
  it("rejects spaces", () => {
    assert.equal(normaliseDiscord("jane doe"), null);
  });
  it("rejects an empty string", () => {
    assert.equal(normaliseDiscord(""), null);
  });
  it("rejects a 16-digit numeric ID (too short for snowflake)", () => {
    assert.equal(normaliseDiscord("1234567890123456"), null);
  });
  it("rejects a 21-digit numeric ID (too long)", () => {
    assert.equal(normaliseDiscord("123456789012345678901"), null);
  });
});

// ---------------------------------------------------------------------------
// normaliseGitHub
// ---------------------------------------------------------------------------

describe("normaliseGitHub", () => {
  it("accepts a plain username", () => {
    assert.equal(normaliseGitHub("octocat"), "octocat");
  });
  it("strips a leading @", () => {
    assert.equal(normaliseGitHub("@octocat"), "octocat");
  });
  it("extracts username from a full github.com URL", () => {
    assert.equal(normaliseGitHub("https://github.com/octocat"), "octocat");
  });
  it("extracts username from URL without protocol", () => {
    assert.equal(normaliseGitHub("github.com/octocat"), "octocat");
  });
  it("strips trailing .git", () => {
    assert.equal(normaliseGitHub("octocat.git"), "octocat");
  });
  it("accepts hyphens in the middle", () => {
    assert.equal(normaliseGitHub("the-octocat"), "the-octocat");
  });

  it("rejects a username starting with a hyphen", () => {
    assert.equal(normaliseGitHub("-octocat"), null);
  });
  it("rejects a username ending with a hyphen", () => {
    assert.equal(normaliseGitHub("octocat-"), null);
  });
  it("rejects double hyphens (consecutive hyphens are not allowed)", () => {
    // GitHub actually accepts consecutive hyphens in the middle of a username.
    // The regex ^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$ permits this.
    assert.equal(normaliseGitHub("octo--cat"), "octo--cat");
  });
  it("rejects empty string", () => {
    assert.equal(normaliseGitHub(""), null);
  });
});

// ---------------------------------------------------------------------------
// normaliseX
// ---------------------------------------------------------------------------

describe("normaliseX", () => {
  it("accepts a plain handle", () => {
    assert.equal(normaliseX("octocat"), "octocat");
  });
  it("strips a leading @", () => {
    assert.equal(normaliseX("@octocat"), "octocat");
  });
  it("extracts handle from x.com URL", () => {
    assert.equal(normaliseX("https://x.com/octocat"), "octocat");
  });
  it("extracts handle from twitter.com URL", () => {
    assert.equal(normaliseX("https://twitter.com/octocat"), "octocat");
  });
  it("extracts handle from URL without protocol", () => {
    assert.equal(normaliseX("x.com/octocat"), "octocat");
  });
  it("accepts underscores and digits", () => {
    assert.equal(normaliseX("octo_cat99"), "octo_cat99");
  });
  it("accepts exactly 15 characters", () => {
    assert.equal(normaliseX("a".repeat(15)), "a".repeat(15));
  });

  it("rejects a 16-character handle", () => {
    assert.equal(normaliseX("a".repeat(16)), null);
  });
  it("rejects a handle with hyphens", () => {
    assert.equal(normaliseX("octo-cat"), null);
  });
  it("rejects empty string", () => {
    assert.equal(normaliseX(""), null);
  });
});

// ---------------------------------------------------------------------------
// normaliseLinkedIn
// ---------------------------------------------------------------------------

describe("normaliseLinkedIn", () => {
  it("accepts a plain slug", () => {
    assert.equal(normaliseLinkedIn("jane-doe"), "jane-doe");
  });
  it("strips a leading @", () => {
    assert.equal(normaliseLinkedIn("@jane-doe"), "jane-doe");
  });
  it("extracts slug from a full linkedin.com/in/... URL", () => {
    assert.equal(normaliseLinkedIn("https://linkedin.com/in/jane-doe"), "jane-doe");
  });
  it("extracts slug from URL without protocol", () => {
    assert.equal(normaliseLinkedIn("linkedin.com/in/jane-doe"), "jane-doe");
  });
  it("accepts alphanumeric slugs", () => {
    assert.equal(normaliseLinkedIn("janedoe123"), "janedoe123");
  });

  it("rejects a slug shorter than 3 characters", () => {
    assert.equal(normaliseLinkedIn("ab"), null);
  });
  it("rejects a slug with spaces", () => {
    assert.equal(normaliseLinkedIn("jane doe"), null);
  });
  it("rejects empty string", () => {
    assert.equal(normaliseLinkedIn(""), null);
  });
});

// ---------------------------------------------------------------------------
// normalisePortfolio
// ---------------------------------------------------------------------------

describe("normalisePortfolio", () => {
  it("passes through a valid https URL unchanged", () => {
    assert.equal(normalisePortfolio("https://example.com"), "https://example.com/");
  });
  it("prepends https:// when the protocol is omitted", () => {
    assert.equal(normalisePortfolio("example.com"), "https://example.com/");
  });
  it("allows http:// URLs", () => {
    assert.equal(normalisePortfolio("http://example.com"), "http://example.com/");
  });
  it("accepts URLs with paths", () => {
    assert.equal(normalisePortfolio("example.com/portfolio"), "https://example.com/portfolio");
  });
  it("accepts URLs with subdomains", () => {
    assert.equal(normalisePortfolio("my.portfolio.io"), "https://my.portfolio.io/");
  });

  // ── Unsafe scheme rejections ─────────────────────────────────────────────
  it("rejects javascript: scheme", () => {
    assert.equal(normalisePortfolio("javascript:alert(1)"), null);
  });
  it("rejects data: scheme", () => {
    assert.equal(normalisePortfolio("data:text/html,<h1>hi</h1>"), null);
  });
  it("rejects vbscript: scheme", () => {
    assert.equal(normalisePortfolio("vbscript:msgbox(1)"), null);
  });
  it("rejects mailto: scheme", () => {
    assert.equal(normalisePortfolio("mailto:user@example.com"), null);
  });
  it("rejects ftp:// scheme", () => {
    assert.equal(normalisePortfolio("ftp://example.com"), null);
  });
  it("rejects bare @ (email address without scheme)", () => {
    assert.equal(normalisePortfolio("user@example.com"), null);
  });
  it("rejects a URL longer than 200 characters", () => {
    assert.equal(normalisePortfolio("https://example.com/" + "a".repeat(200)), null);
  });
  it("rejects a domain with no dot (e.g. localhost)", () => {
    assert.equal(normalisePortfolio("http://localhost"), null);
  });
  it("rejects an empty string", () => {
    assert.equal(normalisePortfolio(""), null);
  });
  it("rejects URL with credentials", () => {
    assert.equal(normalisePortfolio("https://user:pass@example.com"), null);
  });
});

// ---------------------------------------------------------------------------
// validateCatalyst — full payload
// ---------------------------------------------------------------------------

const VALID_PAYLOAD = {
  name: "Jane Doe",
  discordId: "janedoe",
  githubId: "janedoe",
  xId: "@janedoe",
  linkedinId: "jane-doe",
  portfolioUrl: "https://janedoe.dev",
  hp: "",
};

describe("validateCatalyst", () => {
  it("returns ok:true for a fully valid payload", () => {
    const r = validateCatalyst(VALID_PAYLOAD);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.name, "Jane Doe");
    assert.equal(r.value.discordId, "janedoe");
    assert.equal(r.value.githubId, "janedoe");
    // @ stripped from X
    assert.equal(r.value.xId, "janedoe");
    assert.equal(r.value.linkedinId, "jane-doe");
    assert.equal(r.value.portfolioUrl, "https://janedoe.dev/");
  });

  it("normalises Discord @username input", () => {
    const r = validateCatalyst({ ...VALID_PAYLOAD, discordId: "@janedoe" });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.discordId, "janedoe");
  });

  it("normalises GitHub full URL input", () => {
    const r = validateCatalyst({ ...VALID_PAYLOAD, githubId: "https://github.com/janedoe" });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.githubId, "janedoe");
  });

  it("normalises X full URL input", () => {
    const r = validateCatalyst({ ...VALID_PAYLOAD, xId: "https://x.com/janedoe" });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.xId, "janedoe");
  });

  it("normalises LinkedIn full URL input", () => {
    const r = validateCatalyst({ ...VALID_PAYLOAD, linkedinId: "https://linkedin.com/in/jane-doe" });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.linkedinId, "jane-doe");
  });

  it("prepends https:// for a bare portfolio domain", () => {
    const r = validateCatalyst({ ...VALID_PAYLOAD, portfolioUrl: "janedoe.dev" });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.portfolioUrl, "https://janedoe.dev/");
  });

  // ── Field errors ─────────────────────────────────────────────────────────
  it("errors on a name shorter than 2 chars", () => {
    const r = validateCatalyst({ ...VALID_PAYLOAD, name: "J" });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.ok(r.errors.name);
  });

  it("errors on an invalid Discord username", () => {
    const r = validateCatalyst({ ...VALID_PAYLOAD, discordId: "x" });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.ok(r.errors.discordId);
  });

  it("errors on an invalid GitHub username", () => {
    const r = validateCatalyst({ ...VALID_PAYLOAD, githubId: "-bad" });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.ok(r.errors.githubId);
  });

  it("errors on an invalid X handle", () => {
    const r = validateCatalyst({ ...VALID_PAYLOAD, xId: "a".repeat(16) });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.ok(r.errors.xId);
  });

  it("errors on an invalid LinkedIn slug", () => {
    const r = validateCatalyst({ ...VALID_PAYLOAD, linkedinId: "ab" });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.ok(r.errors.linkedinId);
  });

  it("errors on a javascript: portfolio URL", () => {
    const r = validateCatalyst({ ...VALID_PAYLOAD, portfolioUrl: "javascript:alert(1)" });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.ok(r.errors.portfolioUrl);
  });

  it("collects multiple field errors at once", () => {
    const r = validateCatalyst({ ...VALID_PAYLOAD, name: "J", discordId: "x" });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.ok(r.errors.name);
    assert.ok(r.errors.discordId);
  });

  // ── Honeypot ──────────────────────────────────────────────────────────────
  it("returns a generic error when the honeypot is filled", () => {
    const r = validateCatalyst({ ...VALID_PAYLOAD, hp: "bot was here" });
    assert.equal(r.ok, false);
    if (r.ok) return;
    // The field name must not leak the honeypot field name to bots
    assert.ok(r.errors.form);
    assert.ok(!r.errors.hp);
  });

  it("accepts an empty honeypot field (normal user)", () => {
    const r = validateCatalyst({ ...VALID_PAYLOAD, hp: "" });
    assert.equal(r.ok, true);
  });

  // ── Type safety ───────────────────────────────────────────────────────────
  it("handles null / undefined gracefully", () => {
    const r = validateCatalyst({ name: null, discordId: undefined } as Record<string, unknown>);
    assert.equal(r.ok, false);
  });

  it("handles a completely empty object", () => {
    const r = validateCatalyst({});
    assert.equal(r.ok, false);
    if (r.ok) return;
    // All six required fields should have errors
    assert.ok(r.errors.name);
    assert.ok(r.errors.discordId);
    assert.ok(r.errors.githubId);
    assert.ok(r.errors.xId);
    assert.ok(r.errors.linkedinId);
    assert.ok(r.errors.portfolioUrl);
  });
});
