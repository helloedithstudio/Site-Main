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
  Studio, Decisions, Safety, Beliefs, footer. The FAQ lives only in the handbook.
- `/handbook` maintainers, top projects, discussions, FAQ, community rules and the legal documents. Footer links
  such as `/handbook#terms` deep-link to a section. **The rules and legal text are a draft that has not been
  reviewed by a lawyer** (the page says so); have a lawyer read them before launch.

## Where things live

| Path | What it is |
| --- | --- |
| `lib/brand.ts` | Brand name, title, description, Discord invite, socials, founder, contact email, location. **Change links and contact details here.** |
| `lib/content.ts` | Home page copy, header and footer menus |
| `lib/handbook.ts` | Handbook content: maintainers, projects, discussions, FAQ, rules, terms, privacy, customer terms, Maintainer licence |
| `app/` | Root layout (fonts, metadata, structured data), `page.tsx` (home), `handbook/page.tsx` |
| `components/sections/` | Home sections: `Hero`, `WhatIsEdith`, `Hubs`, `Loop`, `Membership`, `ShowOff`, `Franchise`, `Decisions`, `Safety`, `Beliefs` |
| `components/handbook/` | The handbook page |
| `components/` | Site chrome: `SiteShell`, `Header`, `MobileMenu`, `QuickMenu`, `GlCanvas`, `Footer` (Apple style: small print, five columns of link groups from `footer.columns` in `lib/content.ts`, legal row; accordions on phones) |
| `components/ui/` | Shared pieces: gradient-hover `Button`, `Pager`, `DragCarousel`, `Seal`, `ShowCard`, ... |
| `lib/runtime/` | Lenis scroll, resize, device, event bus, GSAP eases and effects, UI flag store |
| `lib/gl/` | The WebGL engine (three r180): asset loader, DOM trackers, hero marble, tech-grid backdrop, spinning models, shaders |
| `styles/` | `site.css`, `scoped.css`, `chunks.css` come from the original compiled stylesheet (never edit `site.css` by hand, see Colours). `edith.css` and `handbook.css` hold edith's additions. |
| `public/` | Images, KTX2 textures, GLB models, Draco/Basis decoders, WebP flower frames, self-hosted fonts |
| `scripts/` | `make-logo.cjs`, `make-tech-grid.cjs`, `make-hub-images.cjs`, `retheme.cjs` |

## Working with the styles

The original stylesheet only contains the utility classes the original site used. A class that is not in
`site.css` (for example `mt-auto`) silently does nothing, so new rules go in `styles/edith.css` (home) or
`styles/handbook.css` (handbook).

## Notes

- `reactStrictMode` is off: the WebGL context and GSAP/Lenis singletons mount once per page.
- `NEXT_PUBLIC_SITE_URL` sets the canonical and social URLs (defaults to `http://localhost:3000`).
- Section links (`#membership` and so on) scroll through Lenis. For the pinned loop section they resolve to
  the top of its GSAP pin wrapper (`lib/runtime/scroll.ts`), so they always land on the first card. On other
  pages they become `/#section`.
- The site is static; there is no backend and no `/api` route. It uses no cookies, storage or analytics, and
  the privacy policy says so: update it before adding any.
- Socials (Discord, Instagram, LinkedIn) live in `lib/brand.ts`. To add X, add its entry there and an icon in
  `components/ui/Social.tsx`.

## The backdrop

The dark engineering grid behind the hero, Why edith, Hubs and Loop is a generated image,
`public/gl/images/tech-grid.webp` (`node scripts/make-tech-grid.cjs` redraws it). `HomeHero.ts` draws it on a sticky
plane inside the `[data-js="gl-hero-bg-desktop"]` wrapper in `app/page.tsx` and drifts it against scroll (the image
tiles vertically). The handbook uses the same image as a fixed CSS background.

## The hub stack (Blender render)

"Six hubs, one server" (`components/sections/Hubs.tsx`) is shown like an Apple product page: one lit hero image and a
list of hubs. The image is a stack of six glossy layers, one per hub, each engraved with a glyph. It is rendered in
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
- Behaviour: the live hub plays in turn (its row hairline draws left to right as the timer) until you hover, tap or
  arrow-key to another; reduced motion turns autoplay off.

## The 3D layer

Eight hard-surface objects (machined, chamfered, engraved), built in Blender by `blender/scripts/v2_objects.py`
(see `docs/edith-3d-brief-v2.md`). There are no baked maps: the finish is the geometry under the site matcap.

- `public/gl/models/loop-1-pitch.glb` to `loop-6-launch.glb`: bulb, meshing gears, CPU chip, open padlock,
  crate, rocket. One per carousel card, keyed `loop-N-model` in `lib/gl/resources.ts` and tracked from the
  `[data-js="gl-loop-N"]` anchors in `Loop.tsx`.
- `membership-pr.glb` (git merge glyph made of hex nuts and rods) and `decisions-rfc.glb` (document slab with a
  check badge) for the two portrait sections.
- Tuning for the two spinning models is in `lib/gl/theatre.ts` under `Spinning-membership-model` and
  `Spinning-decisions-model`.
- The carousel tilt sits on a parent of the spinning pivot (`HomeHero.ts`), so the camera keeps seeing a little
  of the top instead of swinging between the top and the underside.

Known, and inherited from the original site: while the carousel is still settling, the pager ignores an
arrow click. The original does the same at the same point, so a click can be swallowed once on the way in.

To rebuild every object: `D:\blender\blender.exe -b --factory-startup -P blender\scripts\v2_objects.py`
(or add object numbers after `--`). Each run checks the mesh (closed, one shell, triangle budget) and writes the
GLB and a preview sheet.

## Still Saffron (temporary)

- **Crocus frames** in the Beliefs scroll (no text, kept for now).

## Performance

- **Flower sequence** (`Beliefs.tsx`): 267 WebP frames (4.7 MB, from the original JPEG set at quality 72). They are not
  fetched at page load. Four at a time, in passes (every 8th frame, then 4th, 2nd, the rest), once the section is
  within three screens or about 9 s after mount (only near the section on a slow or data-saving connection).
  Scrubbing draws the nearest frame that has arrived.
- **WebGL assets** are listed once in `lib/gl/manifest.ts`. `components/GlPreload.tsx` reads that list on the server and
  emits `<link rel="preload">` hints, so downloads start with the HTML instead of after the scripts run. Add a new
  asset to the manifest and it is preloaded automatically. Responsive textures use the `-desktop` variant on every
  device on purpose (the `-mobile` ones make the marble blocky).
- **Images**: `tech-grid.webp` (near-lossless), an 8-bit `blue-noise.png`. Only the red channel of the blue noise is used.
- **Fonts** are self-hosted in `public/fonts` (latin subset, variable weight) and declared in `styles/fonts.css`, with
  preload hints in the layout. Nothing is fetched from Google.
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
- A lawyer's review of the handbook's rules and legal documents, and the legal entity details for the terms.
- Work section and Maintainer booking (Calendly).
- X (Twitter) link once the page exists.
