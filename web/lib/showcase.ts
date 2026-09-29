// The Studio page (/studio): the exhibits, the page copy and the checks that keep both honest.
//
// Exhibits are chosen by Core and written here by hand, in the order they stand in the hall. Only real, working things
// go in: each one needs a link that opens, the GitHub usernames of everyone who built it, and a phase that says plainly
// whether it has shipped. Every number shown in "Take a closer look" is measured (lib/showcase.build.json, written by
// scripts/build-facts.cjs), never typed. The empty monoliths after the exhibits are the reserved slots, not data.
//
// Copy rules (as for the whole site): plain British English, no em or en dashes, no emojis, nothing invented.

import build from "./showcase.build.json";
import media from "./showcase.media.json";
import works from "./showcase.works.json";
import { normaliseLogin, safeUrl } from "./github";

export type Fact = { label: string; value: string };

export type Excerpt = { file: string; startLine: number; endLine: number; code: string };

export type Exhibit = {
  /** Url-safe id, also the #anchor for "Take a closer look" (for example #exhibit-01). */
  slug: string;
  /** Two digits, the order in the hall. */
  number: string;
  title: string;
  /** One or two plain sentences, 200 characters at most. */
  summary: string;
  /** Shipped: live for anyone. Testing: built and working, not switched on for everyone yet. */
  phase: "shipped" | "testing";
  /** Where it can be opened: a path on this site or an https address. */
  url: string;
  urlLabel: string;
  /** Repository, if it is public and the makers want it shown. */
  source?: string;
  /** GitHub usernames of everyone who built it. */
  authors: string[];
  stack: string[];
  /** Year and month it first went live, "YYYY-MM". */
  shipped: string;
  /** This exhibit is the site the visitor is on. */
  youAreHere?: boolean;
  /** The loop on the monolith's window and its still (added by scripts/make-showcase-media.cjs). */
  media?: { poster?: string; webm?: string; mp4?: string };
  closer: {
    brief: string;
    built: string;
    excerpt?: { key: keyof typeof build.excerpts; caption: string };
    shipped: Fact[];
  };
};

const day = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const mb = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)} MB`;

const siteFacts: Fact[] = [
  ...(build.git
    ? [
        { label: "Commits", value: String(build.git.commits) },
        { label: "First commit", value: day(build.git.firstCommit) },
      ]
    : []),
  { label: "Framework", value: `Next.js ${build.versions.next}, React ${build.versions.react}` },
  { label: "3D", value: `Three.js ${build.versions.three}, ${build.webgl.blenderModels} models made in Blender` },
  { label: "Motion", value: `GSAP ${build.versions.gsap}, Lenis ${build.versions.lenis}` },
  { label: "WebGL assets", value: mb(build.webgl.bytes) },
];

const list: Exhibit[] = [
  {
    slug: "exhibit-01",
    number: "01",
    title: "This website",
    summary:
      "The site you are on. A pitch-black home for the Legion with a live marble hero, scroll-driven 3D and objects rendered in Blender for it.",
    phase: "shipped",
    url: "/",
    urlLabel: "Open the home page",
    authors: ["Andrew-Kevin-007"],
    stack: ["Next.js", "Three.js", "GSAP", "Lenis", "Blender"],
    shipped: "2026-09",
    youAreHere: true,
    closer: {
      brief:
        "edith needed one site for two kinds of visitor: builders deciding whether to join, and clients deciding whether to hire. It had to feel made by hand without ever getting in the way of reading.",
      built:
        "Next.js and React for the pages, Three.js for the live marble and the objects, GSAP and Lenis for scroll. Every 3D object and rendered sequence on the site was made in Blender for it. The header you scrolled past moves on a damped spring, the same maths as a real one:",
      excerpt: { key: "header-spring", caption: "How the header's button pushes the links along, one frame at a time." },
      shipped: siteFacts,
    },
  },
  {
    slug: "exhibit-02",
    number: "02",
    title: "The Catalyst join flow, with Friday",
    summary:
      "How people join edith: sign in with Discord and GitHub, fill in one short form, and Friday, the edith bot, takes it from there. One person, one entry.",
    phase: "testing",
    url: "/join",
    urlLabel: "See the join page",
    authors: ["Andrew-Kevin-007"],
    stack: ["Next.js", "Discord API", "GitHub OAuth", "Upstash Redis"],
    shipped: "2026-09",
    closer: {
      brief:
        "Anyone can click a Discord invite. edith wanted every new member to be a real person with a real profile, without keeping a list of who they are.",
      built:
        "You sign in with Discord, then with GitHub, so the GitHub account is proven to be yours. Each pairing is stored as two one-way codes, so one person gets one entry and nobody can read the list back. If the second half cannot be written, the first is undone:",
      excerpt: { key: "join-claim", caption: "The claim: both halves of an entry, or neither." },
      shipped: [
        { label: "Automated checks", value: String(build.join.checks) },
        ...(build.join.maxRemovalsPerRun ? [{ label: "Most removals in one run", value: String(build.join.maxRemovalsPerRun) }] : []),
        { label: "Stored about you", value: "Two one-way codes" },
        { label: "Status", value: "Built, in final testing" },
      ],
    },
  },
];

/** The exhibits, each with its captured loop and still when scripts/make-showcase-media.cjs has made them. */
export const exhibits: Exhibit[] = list.map((e) => {
  const m = (works as Record<string, Exhibit["media"]>)[e.slug];
  return m ? { ...e, media: m } : e;
});

/** Monoliths that wait, sealed, after the exhibits. */
export const reservedSlots = 3;

export const showcasePage = {
  eyebrow: "Studio",
  title: "Don't take our word for it.",
  subtitle: "Everything here was designed and built by edith. So was this page.",
  scroll: "Scroll",
  handoff: { mouse: "This stopped being a video a second ago. Move your cursor.", touch: "This stopped being a video a second ago. Drag it." },
  hall: {
    label: "Exhibits",
    youAreHere: "You are here",
    phase: { shipped: "Shipped", testing: "In final testing" } as Record<Exhibit["phase"], string>,
    closer: "Take a closer look",
    source: "Source",
    builtBy: "Built by",
    reserved: {
      title: "Reserved for the first member launch.",
      text: "Ship something in `ship-it` and it could stand here.",
    },
  },
  closer: {
    tabs: { brief: "The brief", built: "How it's built", shipped: "What shipped" },
    close: "Close",
    drag: "Drag to turn it",
  },
  hood: {
    eyebrow: "Under the hood",
    title: "This page, with the lights on.",
    intro: "Nothing here is a mock-up. These numbers are measured in your browser, right now, and they never leave it.",
    passes: ["Final", "Wireframe", "Normals", "Light only", "Final"],
    readouts: {
      fps: "Frames per second",
      triangles: "Triangles on screen",
      calls: "Draw calls",
      loaded: "Loaded in",
      bytes: "Downloaded so far",
      webgl: "Graphics",
    },
    facts: "Measured from the repository when this page was built",
  },
  people: {
    eyebrow: "The people",
    title: "Who builds this",
    intro: "edith is run by its Maintainers. Everyone starts as a Catalyst, and Maintainers earned their seat.",
    seats: "How to earn a seat",
  },
  resolve: {
    title: "Let's build yours.",
    pitched: (from: string, forName: string) => `${from} prepared this for ${forName}.`,
    book: "Book a call",
    bookWith: (first: string) => `Book a call with ${first}`,
    email: "Email us",
    join: "Become a Catalyst",
  },
  sound: { on: "Sound on", off: "Sound off" },
};

// --------------------------------------------------------------------------- films (scripts/make-showcase-media.cjs)

export type FilmVariant = { w: number; h: number; count: number; path: string; poster: string };
export type Film = { hold: number; variants: Record<string, FilmVariant> };
export const showcaseMedia = media as { placeholder?: boolean; films: Record<"ignition" | "exploded", Film> };

/** The URL of frame `i` (0-based) of a film variant. */
export const frameUrl = (v: FilmVariant, i: number) => v.path.replace("{n}", String(i + 1).padStart(4, "0"));

// --------------------------------------------------------------------------- checks (run at build and in scripts/showcase-test.ts)

const DASHES = /[–—]/;

/** Exhibit links are stricter than profile links: https only, never a bare domain or a protocol-relative "//host". */
const httpsOnly = (u: string) => /^https:\/\//i.test(u) && !!safeUrl(u);
const sitePathOrHttps = (u: string) => /^\/(?!\/)/.test(u) || httpsOnly(u);

/** Every problem with the exhibit list, as readable sentences. An empty list means it is fine to publish. */
export function validateExhibits(list: Exhibit[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  const texts = (e: Exhibit) => [e.title, e.summary, e.urlLabel, e.closer.brief, e.closer.built, ...e.stack, ...e.closer.shipped.flatMap((f) => [f.label, f.value])];
  list.forEach((e, i) => {
    const at = `Exhibit ${e.number || i + 1} (${e.slug || "no slug"})`;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(e.slug)) problems.push(`${at}: the slug must be lowercase letters, digits and single hyphens.`);
    if (seen.has(e.slug)) problems.push(`${at}: the slug is used twice.`);
    seen.add(e.slug);
    if (!/^\d{2}$/.test(e.number)) problems.push(`${at}: the number must be two digits.`);
    if (!e.title.trim()) problems.push(`${at}: it needs a title.`);
    if (!e.summary.trim() || e.summary.length > 200) problems.push(`${at}: the summary must be 1 to 200 characters.`);
    if (!sitePathOrHttps(e.url)) problems.push(`${at}: the link must be a path on this site or an https address.`);
    if (e.source && !httpsOnly(e.source)) problems.push(`${at}: the source link must be an https address.`);
    if (!e.authors.length) problems.push(`${at}: credit at least one builder.`);
    for (const a of e.authors) if (!normaliseLogin(a)) problems.push(`${at}: "${a}" is not a GitHub username.`);
    if (!e.stack.length || e.stack.length > 8 || e.stack.some((s) => !s.trim() || s.length > 24)) problems.push(`${at}: list 1 to 8 stack items of up to 24 characters.`);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(e.shipped)) problems.push(`${at}: shipped must be "YYYY-MM".`);
    for (const m of Object.values(e.media ?? {})) if (m && !m.startsWith("/showcase/")) problems.push(`${at}: media must live under /showcase/.`);
    if (texts(e).some((t) => DASHES.test(t))) problems.push(`${at}: the copy contains an em or en dash.`);
  });
  if (list.filter((e) => e.youAreHere).length > 1) problems.push("Only one exhibit can be the site the visitor is on.");
  return problems;
}

/** The order they stand in the hall: by number. */
export const orderExhibits = (list: Exhibit[]) => [...list].sort((a, b) => a.number.localeCompare(b.number));

/** Every GitHub username the page shows, for resolving names and pictures in one go. */
export const exhibitAuthors = (list: Exhibit[]) => [...new Set(list.flatMap((e) => e.authors))];
