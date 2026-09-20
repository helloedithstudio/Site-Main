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
| `public/` | Images, KTX2 textures, GLB models, Draco/Basis decoders, flower frames |
| `scripts/` | `make-logo.cjs`, `make-tech-grid.cjs`, `retheme.cjs` |

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
`public/gl/images/tech-grid.png` (`node scripts/make-tech-grid.cjs` redraws it). `HomeHero.ts` draws it on a sticky
plane inside the `[data-js="gl-hero-bg-desktop"]` wrapper in `app/page.tsx` and drifts it against scroll (the image
tiles vertically). The handbook uses the same image as a fixed CSS background.

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
