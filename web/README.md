# edith

The website for **edith**, a club of builders that runs itself: developers and technologists across Web2,
Web3, AI and whatever comes next. Built with Next.js (App Router). The design, scroll choreography and three.js
WebGL layer come from a pixel-accurate port of a Nuxt site; the content, structure and 3D objects are edith's.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## Pages

- `/` the story: hero, Why builders stick around, Hubs, How an idea becomes a launch, Membership, Show off,
  Studio, Decisions, Safety, Beliefs, footer. The FAQ lives only in the docs. The navbar lists separate pages only (`nav` in `lib/content.ts`).
- `/legion` the Legion: one directory of Maintainers and Catalysts (Maintainers first) with search, filters by what people
  build, sort and show more, plus how to earn a Maintainer seat. Everyone is added in `lib/legion.ts` (opt-in, by GitHub
  username).
- `/join` the Catalyst form for new members (not in the sitemap, not indexed). See "The Catalyst join flow" below.
- `/docs` top projects, discussions, FAQ, community rules and the legal documents. Footer links such as `/docs#terms`
  deep-link to a section. `/handbook` and `/catalysts` are the old addresses and redirect (`next.config.ts`). **The rules and legal text are a draft that has not been
  reviewed by a lawyer** (the page says so); have a lawyer read them before launch.

## Where things live

| Path | What it is |
| --- | --- |
| `lib/brand.ts` | Brand name, title, description, Discord invite, socials, founder, contact email, location. **Change links and contact details here.** |
| `lib/content.ts` | Home page copy, header and footer menus |
| `lib/people.ts`, `lib/github.ts` | A person is just a GitHub username: name, picture and portfolio are read from the public GitHub API at build time (daily revalidation, optional `GITHUB_TOKEN` for a long list) and shown with quick links. Add Maintainers and Catalysts in `lib/legion.ts`. |
| `lib/docs.ts` | Docs content: projects, discussions, FAQ, rules, terms, privacy, customer terms, Maintainer licence |
| `lib/legion.ts` | The people: Maintainers and Catalysts (by GitHub username) and the Legion page copy |
| `app/` | Root layout (fonts, metadata, structured data), `page.tsx` (home), `docs/page.tsx`, `legion/page.tsx` |
| `components/sections/` | Home sections: `Hero`, `WhatIsEdith`, `Hubs`, `Loop`, `Membership`, `ShowOff`, `Franchise`, `Decisions`, `Safety`, `Beliefs` |
| `components/docs/`, `components/legion/` | The docs page and the Legion directory |
| `components/` | Site chrome: `SiteShell`, `Header`, `MobileMenu`, `QuickMenu`, `GlCanvas`, `Footer` (Apple style: small print, five columns of link groups from `footer.columns` in `lib/content.ts`, legal row; accordions on phones) |
| `components/ui/` | Shared pieces: gradient-hover `Button`, `Pager`, `DragCarousel`, `Seal`, `ShowCard`, ... |
| `lib/runtime/` | Lenis scroll, resize, device, event bus, GSAP eases and effects, UI flag store |
| `lib/gl/` | The WebGL engine (three r180): asset loader, DOM trackers, hero marble, carousel boxes, spinning models, shaders |
| `styles/` | `site.css`, `scoped.css`, `chunks.css` come from the original compiled stylesheet (never edit `site.css` by hand, see Colours). `edith.css`, `docs.css` and `legion.css` hold edith's additions. |
| `public/` | Images, KTX2 textures, GLB models, Draco/Basis decoders, the Beliefs frame sequence, share images, self-hosted fonts |
| `scripts/` | `make-logo.cjs`, `make-hub-images.cjs`, `make-beliefs-frames.cjs`, `retheme.cjs` |
| `docs/` | Design notes: `apple-aesthetics.md` (the Apple product-site study behind the type ladder, motion and corner tokens), `affinity-brief.md` (three pieces to build in Affinity), `onboarding-setup.md` (setting up the join flow), **`kevin-todo.md` (everything only Kevin can do; kept up to date every session)**, `edith-3d-brief*.md` |
| `assets-in/` | Where finished Affinity pieces are dropped, named as in `docs/affinity-brief.md` |

## Working with the styles

The original stylesheet only contains the utility classes the original site used. A class that is not in
`site.css` (for example `mt-auto`) silently does nothing, so new rules go in `styles/edith.css` (home) or
`styles/docs.css` (docs) or `styles/legion.css` (Legion).

## Notes

- `reactStrictMode` is off: the WebGL context and GSAP/Lenis singletons mount once per page.
- `NEXT_PUBLIC_SITE_URL` sets the canonical and social URLs (defaults to `http://localhost:3000`).
- Section links (`#membership` and so on) scroll through Lenis. For the pinned loop section they resolve to
  the top of its GSAP pin wrapper (`lib/runtime/scroll.ts`), so they always land on the first card. On other
  pages they become `/#section`.
- The pages are static. The only server code is the Catalyst join flow (`app/api/join/*`, `lib/join/*`), which stores
  nothing. The site uses no cookies, storage or analytics, and the privacy policy says so: update it before adding any.
- Socials (Discord, Instagram, LinkedIn) live in `lib/brand.ts`. To add X, add its entry there and an icon in
  `components/ui/Social.tsx`.

## The Catalyst join flow

When someone joins the Discord from the site they get a message with a link to `/join`. They sign in with Discord (username only),
then with GitHub (public profile only, no scope; this proves the GitHub account is theirs), fill in a short form and get the
Catalyst role. One GitHub account is linked to one Discord account and the other way round (one person, one entry), names that
pass someone off as edith or a Maintainer are refused, and optional minimum account ages can turn away brand new accounts. If
they have not finished 24 hours after joining they are removed and can rejoin. There is no server to run: a GitHub Actions job
(`.github/workflows/join-sweep.yml`, every ten minutes) calls `/api/join/sweep`. Discord roles hold the state (Pending, and an
optional Reminded), and one small Upstash Redis database keeps only one-way codes of Discord and GitHub ids to enforce the single
entry. Answers are posted to a private Discord channel for Core (the mediators); being listed on the Legion page is a separate,
optional tick and is added to `lib/legion.ts` by hand.

- **Code:** `lib/join/plan.ts` (who is invited, reminded or removed: pure), `sweep.ts`, `flow.ts` (sign in and submit),
  `discord.ts` (REST client), `ghoauth.ts` (GitHub sign-in), `store.ts` (the one-entry database), `form.ts` (validation and reserved
  names), `token.ts` (signed, expiring tokens; no cookies), `config.ts`. Routes: `app/api/join/{start,callback,github/callback,submit,sweep,release}`.
- **Safe by default:** dry run until `ONBOARDING_DRY_RUN=false`; nothing happens until `ONBOARDING_START` is set; people who
  joined before it, bots, the owner, exempt roles and Catalysts are never touched; at most 10 removals per run; only people
  invited with at least half the window left are ever removed.
- **What the public pages say** about the 24 hour form appears only when `NEXT_PUBLIC_JOIN_LIVE=true` (`lib/join/constants.ts`).
- **Tests:** `npx tsx scripts/join-test.ts` runs 39 checks against fakes of Discord, GitHub and the database. It has not been run against the real services.
- **Setup steps and settings:** `docs/onboarding-setup.md` and `.env.example`.

## The backdrop

The page is pitch black (`#000`). There is no backdrop image or plane: the WebGL layer draws only the hero marble, the
carousel boxes and the spinning Membership and Decisions objects, and the docs page uses a plain black fixed layer. The
WebGL clear colour, the loader, the menu and the Safety section are black too, so nothing shows a slightly lighter edge
against the canvas (`setClearColor(0x000000)` in `lib/gl/core.ts`).

## How an idea becomes a launch

Each card in the pinned carousel (`Loop.tsx`) carries a small worked-example panel (`LoopCard.tsx`) instead of a 3D
object: what a good post at that step contains (a brainstorm post, a team request, a work-in-progress update, a
rubber-duck thread, a ship-it post, the launch path). Each one is labelled "Example", uses no real people or numbers,
and is a cream panel with a black pill button, like an Apple sheet on a black page. The WebGL layer only tracks the
card boxes (`.js-slide-box`).

## Showcase renders (hub stack and project lineup)

"Every project starts the same way" (`components/sections/Hubs.tsx`, copy in `home.hubs` in `lib/content.ts`) is a
scroll story written in the second person: six beats, one per hub of the Discord server, next to one sticky image. The
beat in the middle of the screen is live (an `IntersectionObserver`) and lights its layer of the image. The image is a
stack of six glossy layers, one per hub, each engraved with a glyph. It is rendered in
Blender (Cycles, transparent film), not drawn in the WebGL engine:

- `blender/scripts/hub_stack.py` builds and renders it (`blender -b --factory-startup -P blender/scripts/hub_stack.py --
  final base 0 1 2 3 4 5 cam=30,27,46,70 size=1400x2200 samples=128`; `preview` for a fast look). Frames are `base` (nothing
  lit) and `0` to `5` (one hub lit each). Raw 16-bit PNGs go to `blender/work/hub/` (not committed).
- `node scripts/make-hub-images.cjs` turns them into `public/images/hubs/`: `stack-base-{1x,2x}.webp` and six
  `stack-glow-N-{1x,2x}.webp`. Each glow is an RGBA layer that is transparent except for the light that hub adds
  (glyph, edge line and a soft bloom), so drawing it over the base with normal alpha reproduces the lit render. The
  base is a soft resting image, the glow layers are 40 to 100 KB each, and the bloom is faded out before the image edge
  so the stack blends into the page.
- The hub colours are the marble ramp (`theme.hoverStops`), the same six stops in the render, the row dots and the
  colour pool behind the stack (`--hub`).
- Behaviour: scrolling moves the live beat and its lit layer together. On a phone the image sits above the beats.

- **Project lineup** ("Shipped by members", `components/sections/ShowOff.tsx`): three plinths with floating skeleton project
  cards that rise left to right (ship it, show it, launch it), the middle one largest. `blender/scripts/ship_lineup.py`
  renders it, `node scripts/make-hub-images.cjs ship` writes `lineup-base-*` and `lineup-glow-N-*`. The three steps beneath
  select and light a card. They autoplay (the row hairline is the timer, drawn by a CSS animation in
  `lib/runtime/useLitCycle.ts`) until you pick one; a visible Pause button stops it, hovering or focusing the list
  pauses it, and reduced motion turns it off. On a phone the image is cropped to one card and pans to the lit one.
  Nothing is invented: the cards are placeholders because nothing has shipped yet.
- **Studio** ("Build under the edith name", `Franchise.tsx`): a left-aligned statement over one wide panel of the footer
  marble (`data-js="gl-marble-footer"`), no boxes.

## The 3D layer

Two hard-surface objects (machined, chamfered, engraved), built in Blender by `blender/scripts/v2_objects.py`
(see `docs/edith-3d-brief-v2.md`). There are no baked maps: the finish is the geometry under the site matcap.

- `membership-pr.glb` (git merge glyph made of hex nuts and rods) and `decisions-rfc.glb` (document slab with a
  check badge) for the two portrait sections.
- Tuning for the two spinning models is in `lib/gl/theatre.ts` under `Spinning-membership-model` and
  `Spinning-decisions-model`.
- The six loop sculptures (bulb, gears, chip, padlock, crate, rocket) were replaced by the example panels above; their
  Blender sources are still in `blender/` if they are ever wanted again.
- The carousel tilt sits on a parent of the carousel group (`HomeHero.ts`), so the camera keeps seeing a little of the
  top of each card.

Known, and inherited from the original site: while the carousel is still settling, the pager ignores an
arrow click. The original does the same at the same point, so a click can be swallowed once on the way in.

To rebuild the objects: `D:\blender\blender.exe -b --factory-startup -P blender\scripts\v2_objects.py`
(or add object numbers after `--`). Each run checks the mesh (closed, one shell, triangle budget) and writes the
GLB and a preview sheet.

## The Beliefs sequence

`Beliefs.tsx` scrubs 96 frames as you scroll: the six hub layers of the server open, light one by one in the hub colours
and the camera settles. It replaced the original template's crocus footage. Made in Blender (`blender/scripts/beliefs_orbit.py`,
about 20 minutes on 16 cores at 1000x1400, 40 samples) and turned into WebP by `node scripts/make-beliefs-frames.cjs`, which
flattens each frame onto pure black (the page is `#000`, so the frame edge is invisible) and adds a soft glow. The frames are
a tall crop (the stack fills only the middle of a wide screen) drawn fitted to the canvas height, and neighbouring frames
are cross-faded so 96 frames scrub smoothly. To change the look, edit the script (`dist=`, `shift=` set the framing so the
stack sits between the header and the caption plate) and rerun both steps.

## Motion, type and corner tokens

`styles/edith.css` starts with shared tokens taken from a rendered study of 36 Apple product pages
(`docs/apple-aesthetics.md`): three easings (`--ease-ui`, `--ease-out`, `--ease-glide`), four durations (240, 320, 500 and
900 ms) and two corner radii (`--r-panel` 28 px, `--r-inner` 16 px). New transitions should use them. The same file has the
type ladder for the four template sections. Apple is a source of composition only: no Apple fonts, colours or copy.

## Performance

- **Beliefs sequence** (`Beliefs.tsx`): 96 WebP frames (about 1.7 MB, down from 5.5 MB for the old 267). They are not
  fetched at page load. Four at a time, in passes (every 8th frame, then 4th, 2nd, the rest), once the section is
  within three screens or about 9 s after mount (only near the section on a slow or data-saving connection).
  Scrubbing draws the nearest frame that has arrived and fades the next one in.
- **WebGL assets** are listed once in `lib/gl/manifest.ts`. `components/GlPreload.tsx` reads that list on the server and
  emits `<link rel="preload">` hints, so downloads start with the HTML instead of after the scripts run. Add a new
  asset to the manifest and it is preloaded automatically. Responsive textures use the `-desktop` variant on every
  device on purpose (the `-mobile` ones make the marble blocky).
- **Images**: an 8-bit `blue-noise.png` (only its red channel is used).
- **Fonts** are self-hosted in `public/fonts` (latin subset, variable weight) and declared in `styles/fonts.css`, with
  preload hints in the layout. Nothing is fetched from Google. The monospace is JetBrains Mono (SIL Open Font
  License), declared under the family name "Roboto Mono" so every existing rule uses it without other edits.
- **Share image:** `app/opengraph-image.jpg` and `app/twitter-image.jpg` (1200x630, made from the real hero). `/docs` and
  `/legion` set their own `openGraph`, which would drop the root image, so each has its own copy of `opengraph-image.jpg`.
- **Caching** (`next.config.ts`): `/gl`, `/images` one day plus a week of stale-while-revalidate, `/fonts` one year.
  Replaced files reach returning visitors within a day. Give a file a new name to force it sooner.

## Colours

The site keeps the original Saffron palette: cream text, gold accents, warm brown panels and the magenta and
orange WebGL glows. Two deliberate changes:

- **Divider lines** are translucent white (14%), so they read as grey on black and as a warm grey over the brown
  panels. `node scripts/retheme.cjs` rebuilds `styles/site.css` from the untouched original
  `styles/site.src.css` (never edit either by hand); `--check` reports whether it is up to date.
- **Button hover** (`components/ui/Button.tsx`) fills with a radial gradient in the hero marble's colours
  (`theme.hoverStops` in `lib/theme.ts`). Its centre follows the pointer on a damped spring, fast movement
  stretches it and drags the hot spot behind, and it drifts slowly at rest. Touch and reduced-motion users get the
  same gradient, centred and still. Every stop keeps the black label above 4.5:1 contrast.

The short Apple-style gradient rule (`.edith-rule`) is used only above highlight sections.

## Logo

The logo is the sample edith wordmark (dark version, cut out onto a transparent background). To swap in the
final logo, run `node scripts/make-logo.cjs "<path to the dark logo png>"`: it rewrites
`public/images/edith-logo.png`, `edith-letters.png`, the favicons and `lib/logo.ts` (size and red-dot position).
It expects cream letters and a red dot on a dark background; other colours are set at the top of the script.
The header, loading screen and footer all read those files.

## Next

- Final logo (see above).
- A lawyer's review of the docs page's rules and legal documents, and the legal entity details for the terms.
- Work section and per-Maintainer booking (the general edith booking link is `brand.booking`).
- X (Twitter) link once the page exists.
