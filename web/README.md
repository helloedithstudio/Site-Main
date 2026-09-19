# edith

The website for **edith**, a club of builders that runs itself: developers and technologists across Web2,
Web3, AI and whatever comes next. Built with Next.js (App Router). The design, scroll choreography, Rive
animations and three.js WebGL layer come from a pixel-accurate port of a Nuxt site; the content is edith's.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## Where things live

| Path | What it is |
| --- | --- |
| `lib/brand.ts` | Brand name, title, description, Discord invite, site URL, socials. **Change links here.** |
| `lib/content.ts` | All page copy (hero, loop, membership, hubs, safety, beliefs, decisions, show-off, FAQ, footer) |
| `app/layout.tsx`, `app/page.tsx` | Root layout (fonts, metadata, structured data) and the home page |
| `components/sections/` | `Hero`, `Loop`, `Membership`, `Hubs`, `Safety`, `Beliefs`, `Decisions`, `ShowOff`, `Faq`, `Franchise` |
| `components/` | Site chrome: `SiteShell`, `Header`, `MobileMenu`, `QuickMenu`, `GlCanvas`, `Footer` |
| `components/ui/` | Shared pieces: noise-hover `Button`, `Pager`, `DragCarousel`, `RiveCanvas`, `Seal`, `ShowCard`, ... |
| `lib/runtime/` | Lenis scroll, resize, device, event bus, GSAP eases and effects, UI flag store |
| `lib/gl/` | The WebGL engine (three r180): asset loader, DOM trackers, marble, archway hallway, spinning models, shaders |
| `styles/` | `site.css`, `scoped.css`, `chunks.css` are verbatim copies of the original compiled stylesheet (do not edit by hand). `edith.css` holds edith's additions. |
| `public/` | Images, KTX2 textures, GLB models, Draco/Basis decoders, Rive file + wasm, flower frames |

Library versions match the original bundle: three 0.180.0, gsap 3.13.0, lenis 1.3.17,
@rive-app/canvas 2.35.0, @use-gesture/vanilla 10.3.1, postprocessing 6.38.0.

## Working with the styles

The original stylesheet only contains the utility classes the original site used. A class that is not in
`site.css` (for example `mt-auto`) silently does nothing, so new rules go in `styles/edith.css`.

## Notes

- `reactStrictMode` is off: the WebGL context and GSAP/Lenis singletons mount once per page.
- `NEXT_PUBLIC_SITE_URL` sets the canonical and social URLs (defaults to `http://localhost:3000`).
- Section links (`#membership` and so on) scroll through Lenis. For the pinned loop section they resolve to
  the top of its GSAP pin wrapper (`lib/runtime/scroll.ts`), so they always land on the first card.
- The home page is static; there is no backend and no `/api` route.
- Instagram, LinkedIn and X are not wired yet. Add them to `socialLinks` in `lib/brand.ts` and give each an
  icon in `components/ui/Social.tsx` once the URLs are confirmed.

## The 3D layer

Eight sculptures, built in Blender from `docs/edith-3d-brief.md` and delivered in `D:\page_content\blender`
(sources, previews and a handover note live there; the site only needs the files below).

- `public/gl/models/loop-1-pitch.glb` to `loop-6-launch.glb`: one per carousel card, keyed `loop-N-model`
  in `lib/gl/resources.ts` and tracked from the `[data-js="gl-loop-N"]` anchors in `Loop.tsx`. They share
  the stone surface (`hero-model-diffuse` and `hero-model-normal`).
- `membership-pr.glb` and `decisions-rfc.glb` for the two portrait sections, each with its own baked
  engraving in `public/gl/images/<name>/` (normal PNG plus a greyscale ink JPEG, 1024 square). These are
  plain textures rather than KTX2, because there is no KTX2 encoder here, and they set `flipY: false`
  since the UVs follow the glTF convention.
- Tuning for the two spinning models is in `lib/gl/theatre.ts` under `Spinning-membership-model` and
  `Spinning-decisions-model`: noise 0.5, normal scale 0.25, pointer yaw 1.5.
- The carousel tilt now sits on a parent of the spinning pivot (`HomeHero.ts`), so the camera keeps
  seeing a little of the top instead of swinging between the top and the underside.
- Rive is gone: the card charts, `RiveCanvas`, `vaults.riv`, `rive.wasm` and `@rive-app/canvas`.

Known, and inherited from the original site: while the carousel is still settling, the pager ignores an
arrow click. The original does the same at the same point, so a click can be swallowed once on the way in.

To re-check the models: `D:\blender\blender.exe -b --factory-startup -P D:\page_content\blender\scripts\verify.py`

## Still Saffron (temporary)

- **FAQ ornament** (`public/images/saffron-art-1.png`).
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

## Logo

The logo is the sample edith wordmark (dark version, cut out onto a transparent background). To swap in the
final logo, run `node scripts/make-logo.cjs "<path to the dark logo png>"`: it rewrites
`public/images/edith-logo.png`, `edith-letters.png`, the favicons and `lib/logo.ts` (size and red-dot position).
It expects cream letters and a red dot on a dark background; other colours are set at the top of the script.
The header, loading screen and footer all read those files.

## Next

- Final logo (see above).
- Work section, `/work` page and Maintainer booking (Calendly).
