// Checks for the Showcase page: the exhibit rules, signed pitch links, and the film list. Run:
//
//   npx tsx scripts/showcase-test.ts            (also fails if the page still points at stand-in film frames, when
//   SHOWCASE_RELEASE=1 is set, so a release can never ship placeholders)

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { exhibits, reservedSlots, showcaseMedia, showcasePage, validateExhibits, frameUrl, type Exhibit } from "../lib/showcase";
import { cleanFor, signPitch, verifyPitch, PITCH_FOR_MAX } from "../lib/pitch";
import { hallPosition } from "../lib/gl/showcaseState";

let passed = 0;
let failed = 0;
async function t(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`ok    ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL  ${name}\n      ${e instanceof Error ? e.message : String(e)}`);
  }
}

const good: Exhibit = { ...exhibits[0] };
const variant = (over: Partial<Exhibit>) => validateExhibits([{ ...good, ...over }]);
const SECRET = "x".repeat(48);
const now = Date.UTC(2026, 8, 25, 12);
const exp = Math.floor(now / 1000) + 3600;

(async () => {
  // ------------------------------------------------------------------ exhibits
  await t("exhibits: the published list passes every rule", () => assert.deepEqual(validateExhibits(exhibits), []));
  await t("exhibits: at least one live exhibit and some reserved slots", () => {
    assert.ok(exhibits.length >= 1);
    assert.ok(reservedSlots >= 1);
  });
  await t("exhibits: a bad slug is caught", () => assert.ok(variant({ slug: "Exhibit 01" }).length));
  await t("exhibits: a repeated slug is caught", () => assert.ok(validateExhibits([good, { ...good, number: "02" }]).some((p) => p.includes("twice"))));
  await t("exhibits: a plain http link is caught", () => assert.ok(variant({ url: "http://example.com" }).length));
  await t("exhibits: a protocol-relative link is caught", () => assert.ok(variant({ url: "//evil.example" }).length));
  await t("exhibits: a site path and an https link are both fine", () => {
    assert.deepEqual(variant({ url: "/join" }), []);
    assert.deepEqual(variant({ url: "https://example.com/app" }), []);
  });
  await t("exhibits: every builder must be a GitHub username", () => assert.ok(variant({ authors: ["not a user!"] }).length));
  await t("exhibits: nobody credited is caught", () => assert.ok(variant({ authors: [] }).length));
  await t("exhibits: a summary over 200 characters is caught", () => assert.ok(variant({ summary: "a".repeat(201) }).length));
  await t("exhibits: shipped must be YYYY-MM", () => {
    assert.ok(variant({ shipped: "2026-13" }).length);
    assert.ok(variant({ shipped: "Sept 2026" }).length);
  });
  await t("exhibits: media outside /showcase/ is caught", () => assert.ok(variant({ media: { poster: "https://cdn.example/x.webp" } }).length));
  await t("exhibits: an em or en dash in the copy is caught", () => {
    assert.ok(variant({ summary: "Fast — and simple." }).length);
    assert.ok(variant({ title: "One – two" }).length);
  });
  await t("exhibits: only one can be the site the visitor is on", () =>
    assert.ok(validateExhibits([good, { ...good, slug: "exhibit-02", number: "02", youAreHere: true }]).some((p) => p.includes("Only one"))));

  // ------------------------------------------------------------------ page copy
  await t("copy: no em or en dashes anywhere in the page's own words", () => {
    const words: string[] = [];
    const walk = (v: unknown) => {
      if (typeof v === "string") words.push(v);
      else if (typeof v === "function") words.push(String((v as (...a: string[]) => string)("A", "B")));
      else if (v && typeof v === "object") Object.values(v).forEach(walk);
    };
    walk(showcasePage);
    walk(exhibits);
    const bad = words.filter((w) => /[–—]/.test(w));
    assert.deepEqual(bad, []);
  });

  // ------------------------------------------------------------------ pitch links
  const token = signPitch(SECRET, { v: 1, from: "Andrew-Kevin-007", for: "Acme Ltd", exp });
  await t("pitch: a signed link verifies and carries who and for whom", () => {
    const c = verifyPitch(SECRET, token, now);
    assert.equal(c?.from, "Andrew-Kevin-007");
    assert.equal(c?.for, "Acme Ltd");
  });
  await t("pitch: the wrong secret is refused", () => assert.equal(verifyPitch("y".repeat(48), token, now), null));
  await t("pitch: no secret, or a short one, refuses everything", () => {
    assert.equal(verifyPitch(undefined, token, now), null);
    assert.equal(verifyPitch("short", token, now), null);
  });
  await t("pitch: an expired link is refused", () => assert.equal(verifyPitch(SECRET, token, (exp + 1) * 1000), null));
  await t("pitch: changing the client name breaks the signature", () => {
    const [body, sig] = token.split(".");
    const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    claims.for = "Someone Else";
    const forged = `${Buffer.from(JSON.stringify(claims)).toString("base64url")}.${sig}`;
    assert.equal(verifyPitch(SECRET, forged, now), null);
  });
  await t("pitch: changing who sent it breaks the signature", () => {
    const [body, sig] = token.split(".");
    const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    claims.from = "someone-else";
    assert.equal(verifyPitch(SECRET, `${Buffer.from(JSON.stringify(claims)).toString("base64url")}.${sig}`, now), null);
  });
  await t("pitch: junk tokens are refused without throwing", () => {
    for (const junk of ["", ".", "abc", "a.b.c", "!!!.???", "x".repeat(700), `${token}x`]) assert.equal(verifyPitch(SECRET, junk, now), null);
  });
  await t("pitch: a token signed with markup in the name cannot be made", () => {
    assert.throws(() => signPitch(SECRET, { v: 1, from: "Andrew-Kevin-007", for: "<script>alert(1)</script>", exp }));
  });
  await t("pitch: client names are cleaned, and unsafe ones refused", () => {
    assert.equal(cleanFor("  Acme   Ltd "), "Acme Ltd");
    assert.equal(cleanFor("O'Neill & Co."), "O'Neill & Co.");
    assert.equal(cleanFor("Zoë Studio"), "Zoë Studio");
    assert.equal(cleanFor("<b>Acme</b>"), null);
    assert.equal(cleanFor("Acme\nLtd"), "Acme Ltd");
    assert.equal(cleanFor("a".repeat(PITCH_FOR_MAX + 1)), null);
    assert.equal(cleanFor(""), null);
  });

  // ------------------------------------------------------------------ hall motion
  await t("hall: the camera rests exactly at each monolith and ends on the last", () => {
    const slots = 5;
    for (let i = 0; i < slots; i++) assert.ok(Math.abs(hallPosition(i / (slots - 1), slots) - i) < 1e-9, `slot ${i}`);
  });
  await t("hall: the camera never moves backwards as the visitor scrolls on", () => {
    let last = -1;
    for (let p = 0; p <= 1.0001; p += 0.002) {
      const pos = hallPosition(p, 5);
      assert.ok(pos >= last - 1e-12);
      last = pos;
    }
  });

  // ------------------------------------------------------------------ films
  const root = path.join(__dirname, "..", "public");
  await t("films: every variant lists a frame count, a size, and a poster that exists", () => {
    for (const [shot, film] of Object.entries(showcaseMedia.films)) {
      assert.ok(film.hold > 0 && film.hold < 1, `${shot} hold`);
      for (const [name, v] of Object.entries(film.variants)) {
        assert.ok(v.count > 1 && v.w > 0 && v.h > 0, `${shot}/${name} numbers`);
        assert.ok(fs.existsSync(path.join(root, v.poster)), `${shot}/${name} poster ${v.poster}`);
        for (const i of [0, Math.floor(v.count / 2), v.count - 1]) assert.ok(fs.existsSync(path.join(root, frameUrl(v, i))), `${shot}/${name} frame ${i + 1}`);
      }
    }
  });
  await t("films: a release never points at stand-in frames", () => {
    if (process.env.SHOWCASE_RELEASE === "1") assert.ok(!showcaseMedia.placeholder, "lib/showcase.media.json still lists placeholder frames");
    else if (showcaseMedia.placeholder) console.log("      (note: the films are still stand-ins; set SHOWCASE_RELEASE=1 to make this a failure)");
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
