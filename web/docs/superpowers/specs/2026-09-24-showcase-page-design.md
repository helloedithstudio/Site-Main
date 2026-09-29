# Showcase page (`/showcase`): design

Date: 2026-09-24. Status: **superseded on 2026-09-25** by the immersive design in `web/docs/showcase/plan.md` (Kevin
asked for an experience, not a list). The data model and the honesty rules below carry over.

## 1. Purpose and success

A page, separate from every other page, where edith's top shipped work is displayed. It is where the club proves it ships
(brief section 8.5: "a showcase area for shipped projects, and space for Demo Day") and where a client or a would-be
member can open real work and see who built it.

Success looks like:

- A visitor opens `/showcase` from the header and sees real projects, each with a link that opens, and the people who built it.
- With nothing shipped yet (today), the page is honest and still looks finished: "Nothing here yet", how to get listed, no fake projects.
- Adding a project later is one small, reviewable change to one file. No code changes, no database.
- It reads as edith: pitch black, Saffron accents, marble gradient used once, mono eyebrows, plain British copy.

## 2. What Kevin said, and what I assumed

Said (24 Sep): a separate showcase page "where the top works will be displayed", following the brand guidelines. At launch it
is **ready to fill, with an honest empty state** (Kevin chose this over seeding it with edith-made work).

Assumed (correct me):

- "Top works" means projects members shipped, chosen by hand. The site does not rank or score them.
- The page is public and linked from the header, the footer and the sitemap.
- Members are listed only if they ask (the same opt-in rule as `/legion`).

## 3. Brand rules this page must obey

From `EDITH-brief.md`, `lib/theme.ts` and Kevin's standing feedback:

- Name is `edith`, lowercase. Plain, dry, human copy. British spelling. No hype, no corporate filler.
- **No em or en dashes** anywhere a visitor can read. No emojis.
- **Real items only.** No invented projects, testimonials, counts or dates. Placeholders are marked as such.
- No token, DAO, treasury or wallet language. No mention of Chennai.
- Palette frozen: pitch black `#000`, cream text, gold `#FFBC09` accent, hairlines `rgb(255 255 255 / 14%)`, the marble ramp
  (`theme.ramp`, `theme.hoverStops`) for a single highlighted word or a hover, never as a fill everywhere.
- Type and motion: `type-display-xl edith-hero-title`, `type-h2`, `type-h3`, `type-body-*`, mono `type-caption uppercase`
  eyebrows; panel radius `var(--r-panel)`; motion tokens `--t-fast` and `--ease-ui`; reduced motion respected.
- Dark only. Mobile first: 390px and 1440px are both checked.

## 4. What already exists and is reused

| Need | Reuse |
| --- | --- |
| Page shell (black backdrop, hero block, footer) | `.hb-main`, `.hb-bg`, `.hb-hero` from `styles/docs.css`, as `/legion` does |
| Empty-state copy | `projects` in `lib/docs.ts` ("Nothing here yet", "What members have shipped", "Your project here", the Demo Day line). Single source, not copied |
| Empty-state markup | `.hb-status`, `.hb-cards`, `.hb-card--open`, `.edith-rule` |
| Person avatars and names from a GitHub username | `resolvePeople` (`lib/github.ts`, daily cache) and `PersonAvatar` (`components/ui/PersonBits.tsx`) |
| URL safety | `safeUrl`, `normaliseLogin` from `lib/github.ts` |
| Filter tags | `legionInterests` (Web2, Web3, AI, Hardware, Design) from `lib/legion.ts` |
| Buttons, footer | `components/ui/Button.tsx`, `components/Footer.tsx` |

## 5. Design

### 5.1 Files

New:

- `lib/showcase.ts`: the data (`workEntries`, empty today), the page copy, and small pure functions (`validateWorks`, `orderWorks`, `pickFeatured`, `filterWorks`).
- `app/showcase/page.tsx`: server component. Metadata, resolves authors, renders `<Showcase />`.
- `components/showcase/Showcase.tsx`: client component (filter state), the page body.
- `styles/showcase.css`: `.sc-*` classes only. Nothing edited in `site.css`.
- `app/showcase/opengraph-image.jpg` and `.alt.txt`: a copy of the root share image (pages that set `openGraph` drop the parent image).
- `public/showcase/`: one WebP per project that has a screenshot.
- `scripts/showcase-test.ts`: data and logic checks, run with `npx tsx scripts/showcase-test.ts` like `join-test.ts`.

Edited (small):

- `lib/content.ts`: `nav` gains `{ label: "Showcase", href: "/showcase" }` between The Legion and Docs; the footer "Top projects" link (`docs#projects`) becomes "Showcase" (`/showcase`), and Community gains it too.
- `app/sitemap.ts`: one more URL.
- `components/docs/Docs.tsx` (Top projects section): one link, "See the showcase".
- `docs/kevin-todo.md`: the open decisions in section 9 (already added as B11 and B12).

The header needs no code change: `HeaderNav` already renders `nav`, and I checked the header at 651px to 1280px wide
(204px clear space at 651px with two links, so about 100px with three; re-checked at build time).

### 5.2 Data model (`lib/showcase.ts`)

```ts
export type WorkEntry = {
  slug: string;          // unique, url-safe, lowercase, e.g. "pocket-linter"
  title: string;         // as the makers call it
  summary: string;       // one plain sentence, up to 140 characters
  url: string;           // the live project or demo, https only
  source?: string;       // repository, https only
  authors: string[];     // GitHub usernames, at least one (credit everyone who helped)
  tags: string[];        // from legionInterests
  shipped: string;       // "YYYY-MM"
  image?: { src: string; alt: string };   // /showcase/<slug>.webp, 16:10, alt required
  featured?: boolean;    // the first featured entry becomes the large panel
  demoDay?: string;      // "YYYY-MM-DD", only once a Demo Day has actually shown it
};
export const workEntries: WorkEntry[] = [];
```

Validation runs at build time (`validateWorks`) and fails the build with a message naming the entry: duplicate slug, `http:`
or non-URL links, unknown tag, no authors, invalid GitHub username, summary too long, image without alt or with a file that
does not exist, malformed dates. A bad pull request cannot ship a broken page.

Order: featured first, then newest `shipped`, then title. "Featured" is a flag written by hand. The site never decides
what is "top".

### 5.3 Page states

**Empty (today).** Hero, then the docs "Top projects" content: status pill "Nothing here yet", heading "What members have
shipped", the intro, three open cards ("Your project here", "Post it in `ship-it` with a demo and credit the people who
helped."), the Demo Day line ("first date is yet to be announced"), then the Become a Catalyst button.

**Populated.** Hero, the featured work as one large panel, filter chips (Everyone plus the tags in use, with counts) and a
"3 projects" status line, a two-column grid of cards (one column on phones) with "Show more" after 12, then the Demo Day
line and the button. If a `demoDay` date exists on entries, cards show "Shown at Demo Day" as a mono chip.

**No filter match.** "Nothing matches that filter. Clear it to see everything." with a clear button.

### 5.4 Layout and styling

- Hero: gold mono eyebrow "Showcase", `type-display-xl` headline, one lead sentence. One word of the headline uses `.edith-gradword` (the marble ramp), the only gradient on the page.
- Featured panel: rounded `var(--r-panel)` black surface with a 14% white hairline. Desktop: screenshot on the left (about 58%), text on the right (title, summary, authors, tags, "View project" and "Source"). Phone: stacked.
- Card: 16:10 image (lazy, fixed `width` and `height`, no layout shift), title (`type-h3`), summary, an overlapping row of author avatars with names, mono tag chips, and two text links. Hover raises the hairline to 30% white and eases the image scale to 1.02 with `--ease-ui`. No box shadows, no neon.
- No screenshot: a code-drawn panel (black, hairline, the first letter of the title large in the marble ramp). No stock imagery, ever.
- Chips and status line mirror `/legion` so the two directory pages feel like siblings.

### 5.5 Draft copy (for Kevin to edit)

- Eyebrow: "Showcase".
- Headline: "What the Legion<br>has shipped" (`shipped` in the marble ramp).
- Lead: "Real projects, built by people in the Legion, each with a link you can open and the names of everyone who helped. Nothing here is a mock-up."
- Empty state: reuses `projects` from `lib/docs.ts` word for word.
- Listing line (under the cards): "Listing is opt in. To show your work here, post it in `ship-it` and say you would like it listed." (Kevin to confirm the process, see section 9.)
- Buttons: "View project", "Source", "Become a Catalyst" (`brand.cta`).

All copy is plain British English, contains no dashes and no emojis. A scan for U+2013 and U+2014 over the rendered page is part of the tests.

### 5.6 Accessibility, performance, security

- One `h1`, section `h2`s, card titles `h3`. Chips are `aria-pressed` buttons; the count is a `role="status"` region, as on `/legion`. Gold focus outlines. Every link has a name that says what it opens ("View Pocket Linter"), and outbound links use `rel="noopener noreferrer"` in a new tab.
- Images lazy, WebP, at most 250 KB each, 1600 by 1000. Static render with the daily GitHub cache (no `force-dynamic`, because the data is in the repository). Exact Next 16 route options to be read from `node_modules/next/dist/docs` before writing the page.
- Member text is rendered as text, never as HTML. Links pass `safeUrl` (https only). Usernames pass `normaliseLogin`.
- `prefers-reduced-motion`: hover scale and any transitions are off.

## 6. Testing

1. `npx tsx scripts/showcase-test.ts`: validation accepts a good entry and rejects each bad case in 5.2; ordering, featured pick and tag filtering behave; the shipped `workEntries` passes validation.
2. `npx tsc --noEmit`, `npx eslint` on the changed files, and `npm run build`.
3. Browser (Playwright, 1440x900 and 390x844): empty state renders; header shows Showcase as the active link; no horizontal scroll; no U+2013 or U+2014 in visible text; footer and sitemap link to it. Then, with **temporary local sample entries that are never committed**, the populated state: featured panel, grid, chip filtering, "Show more", keyboard order, and screenshots that I look at.
4. Header re-check with three links at 651, 768, 1024 and 1440px.

## 7. Out of scope (deliberately)

A database or form for submissions, one page per project, search, a Demo Day calendar, comments or likes, a teaser on the
home page, and any ranking or scoring. Each can be added later without changing this design.

## 8. Risks

- Adding a third header link narrows the header at 651px. Checked with two links (fine); re-checked with three before finishing.
- The page is empty on day one. That is intended and honest, and the empty state reuses reviewed copy, but it is the first thing a visitor to `/showcase` sees, so the hero and the three open cards need to look deliberate, not unfinished.

## 9. Open questions for Kevin (I will not invent these)

1. **What makes a work "top", and who decides?** Core alone, a Maintainer vote, or the makers' own pick? Until you say, the page only says "featured" and the flag is set by hand.
2. **How does a member ask to be listed?** My draft says "post it in `ship-it` and ask". If the real process differs (for example a PR to `lib/showcase.ts`), tell me and I will change the line.
3. **Headline and lead copy in 5.5.** Change any wording you like.
