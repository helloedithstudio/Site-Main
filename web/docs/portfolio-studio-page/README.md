# Portfolio Studio page: archived package

Written for: Kevin, and a Claude Code agent working in this repository (`D:\page_content\web`, edith) or in the portfolio
(`D:\Portfolio-Main\Portfolio`, kevinandrew.tech).

**What this is.** The `/studio` page of Kevin's portfolio, the "Edith Studio" client-work page, packaged whole: its source, its
styles, its copy, its translations and its assets. It was live on kevinandrew.tech until 28 September 2026 (last live commit
`ca8561b` in the portfolio repository). That day Studio was renamed Edith, its links were pointed at https://edith-plum.vercel.app,
and the page was taken off the portfolio (moved to `src/archive/studio/`, no longer routed). Nothing here is wired into edith. It
is reference material: to revive the page, or to reuse parts of it here.

**Not to be confused with** edith's own `/studio` page (the renamed Showcase, `app/studio/page.tsx`, planned in `docs/showcase/`).
That page is a gallery of builds; this one is a services page for client work.

## 1. The page, scene by scene

Apple's contrast grammar: each scene owns its surface, alternating dark and light, independent of the site's light or dark theme.

| # | Surface | Scene |
| --- | --- | --- |
| 1 | dark | Full-screen looping film (`studio1.mp4`) with the title "Studio." and a tagline. The title drifts up and fades on scroll while the film scales and darkens. |
| 2 | light | Manifesto whose words take ink as you scroll, then the Claude and OpenAI logos and "Frontier intelligence. Built right in." |
| 3 | dark | "The demo test": three bars that grow on entry, comparing what each kind of studio hands you before money moves. |
| 4 | light | Case study 01, Mamacita's Miami Eats, beside a laptop mockup running off the right edge; then "How we work" in three commitments. |
| 5 | dark | "What I build": a numbered list of seven capabilities. |
| 6 | light | FAQ accordion, six questions, one open at a time. |
| 7 | dark | "The philosophy": "Quiet on the surface. Relentless underneath." |
| 8 | house | "The door": two buttons, to the Edith Studio site and to email. |

Every visible word is listed in `copy.md`.

## 2. Contents

```
portfolio-studio-page/
  README.md                          this file
  copy.md                            every visible string on the page, in order
  source/
    app/[locale]/studio/page.tsx     the page (verbatim, commit ca8561b)
    components/studio/StudioHero.tsx scene 1, the film hero (verbatim, ca8561b)
    components/studio/CompareBars.tsx scene 3 bars (verbatim, ca8561b)
    components/studio/FaqList.tsx    scene 6 accordion (verbatim, ca8561b)
    components/studio/ScrollFill.tsx scene 2 manifesto (current version, see 4)
    components/studio/Parallax.tsx   scroll depth used in scenes 2 to 7 (current version, see 4)
    components/motion/Reveal.tsx     rise-in on scroll (current version, see 4)
    lib/seo.ts                       canonical and hreflang helper (current, unchanged in substance)
    i18n/routing.ts, navigation.ts   next-intl routing that seo.ts needs (verbatim, ca8561b)
    content/site.ts                  EMAIL and STUDIO_URL, the two values the page imports (ca8561b values)
    messages/en.json, de.json        the two translation keys the page reads: nav.studio, pageMeta.studio
    styles/studio.css                every style the page relies on, extracted from the portfolio's globals.css
  public/
    studio1.mp4                      the hero film
    logos/claude.png, openai.png     the scene 2 logos
    mockups/space-black.png          the scene 4 laptop
```

The folder layout under `source/` mirrors the portfolio's `src/`, so the `@/...` imports resolve when it is copied back in.

## 3. What it depends on

- Next.js 15 App Router, React 19, `next/image`. The page is a server component; it reads `public/logos` and `public/mockups`
  with `node:fs` at build time.
- next-intl 4 with `[locale]` routes (`en`, `de`, `localePrefix: "as-needed"`): `getTranslations`, `setRequestLocale`, and the
  routing in `source/i18n`.
- Tailwind CSS v4. `studio.css` uses Tailwind v4 syntax (`@import "tailwindcss"`, `@theme`, `@utility`), and the page and its
  components use Tailwind utility classes throughout.
- Fonts: the portfolio's self-hosted Google Sans Flex and Google Sans Code, exposed as `--font-sans-loaded` and
  `--font-mono-loaded` by `next/font/local` in its root layout. They are not in this package (check their licence before copying
  them anywhere); without them the stacks in `studio.css` fall back to system fonts.
- No animation library. `StudioHero`, `CompareBars`, `ScrollFill` and `Parallax` use requestAnimationFrame and
  IntersectionObserver; `Reveal` uses the Web Animations API.

## 4. What differs from the live page

- `page.tsx`, `StudioHero.tsx`, `CompareBars.tsx`, `FaqList.tsx`, the i18n files, the translations and the assets are exactly as
  they were live.
- `Reveal.tsx`, `ScrollFill.tsx` and `Parallax.tsx` are the portfolio's current versions, which drop in unchanged. Reveal no longer
  needs GSAP and no longer hides content until JavaScript runs (only content that starts below the fold rises in). ScrollFill and
  Parallax run their animation loop only while near the viewport. Accordingly `studio.css` leaves out the old
  `[data-reveal] { opacity: 0.001 }` rule, which would hide content permanently with the new Reveal.
- The portfolio's own archive copy in `src/archive/studio/` differs slightly: its three studio-only components sit beside it in
  `components/`, and its "Visit Edith Studio" button points at the new Edith URL. This package keeps the live imports and URL.

## 5. Behaviour worth knowing

- **Logos.** Scene 2 shows every image in `public/logos`, sorted by name. The portfolio's folder also held `apple-touch-icon.png`,
  `site-logo.png` and `site-logo-icon.png`, so the live page will have shown those too, which looks unintended. This package ships
  only the two logos the copy talks about. Give the page a folder that holds only those, or change `scanPublic("logos")`.
- **Laptop.** Scene 4 uses the first image in `public/mockups` whose name contains "space", else the first image.
- **Dark header.** The portfolio's header was pinned dark on `/studio`, because the film hero is dark in both themes. The hero's
  top blend assumes it. That logic was removed from `Nav.tsx` when the page was archived; this was it:

  ```tsx
  // Studio's own hero is a fixed dark theatre, independent of the site
  // theme (see .scene-dark in globals.css): the nav rides on top of it,
  // so it's pinned dark here too, regardless of the light/dark toggle.
  const isStudio = pathname === "/studio" || pathname.startsWith("/studio/");
  // then add `scene-dark` to the <header> and to the mobile overlay when isStudio,
  // and colour the active /studio link with `text-intel`
  ```

- **Metadata.** The title comes from `nav.studio` ("Studio") and the description from `pageMeta.studio`; alternates from
  `localeAlternates(locale, "/studio")`.

## 6. Reviving it on the portfolio

1. Copy `source/app/[locale]/studio/page.tsx` to `src/app/[locale]/studio/page.tsx`, and the three studio-only components to
   `src/components/studio/`. `ScrollFill`, `Parallax`, `Reveal`, `seo.ts` and the i18n files already exist there.
2. `STUDIO_URL` no longer exists in `src/content/site.ts` (it became `EDITH_URL`). Import `EDITH_URL` instead, or add the constant
   back.
3. The two translation keys are still in the portfolio's `messages/*.json`, and every style the page needs is still in
   `globals.css`.
4. Put `studio1.mp4`, `logos/claude.png`, `logos/openai.png` and `mockups/space-black.png` in `public/` (the portfolio still has
   all four).
5. Re-wire what was unwired on 28 September: the nav link and the dark header (section 5), the footer link, `/studio` in
   `sitemap.ts` and in `llms.txt`, and the About page links.
6. Delete `src/archive/studio/` so there are not two copies.

## 7. Reusing it on edith

This repository's rules differ from the portfolio's, so the source cannot be dropped in as it is:

- **No Tailwind utilities.** edith ships a compiled stylesheet (`styles/site.css`, never edit it); utility classes that are not
  already in it do nothing. Every class in `page.tsx` and the components has to become plain CSS in `styles/edith.css`.
- **Units.** `rem` is 9 px on a 1440 px screen here, not 16. The portfolio's sizes are in `rem` against 16, so convert them.
- **Copy and comments.** No en or em dashes, British spelling. The verbatim source and `copy.md` contain many em dashes and some
  American spelling ("color" in comments); rewrite them on the way in.
- **Name and links.** The page says "Edith Studio" throughout, and its main button points at the old Studio site. The name is now
  Edith, and edith already has a `/studio` page of its own, so decide whether this becomes a section of it, a separate page, or
  just a source of copy.
- **Palette.** The intelligence gradient (blue, violet, pink, orange) is the portfolio's accent, not edith's Saffron palette.

## 8. Things Kevin must decide or check

- **The case study.** Scene 4 names a client (Mamacita's Miami Eats) and shows their site on a laptop. Confirm you still have
  permission before it goes on any public page.
- **The logos.** The Claude and OpenAI marks belong to Anthropic and OpenAI. Check their brand guidelines before using them on a
  public page.
- **The film.** `studio1.mp4` is 2564 x 1080, 30 frames a second, 1.7 MB, with no audio track (checked). It is from your own
  Studio page; confirm it contains no third-party footage before reusing it.

## 9. Checked, and not

- The source type-checks under TypeScript strict mode against the portfolio's Next.js 15.5, next-intl 4 and React 19 types, with
  the package's own files resolving every `@/...` import. `studio.css` parses cleanly.
- Not rendered: the route no longer exists in the portfolio build, so there is no screenshot of the page in this package.
