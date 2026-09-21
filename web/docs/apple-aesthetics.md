# Apple product sites: what repeats, and what edith takes

Measured on 21 September 2026 from rendered pages on apple.com/in. This is a study of composition, type scale, rhythm,
surfaces and motion. Nothing is copied: no Apple fonts (SF Pro), colours (the blue), copy or images.

## Method

- **Pages:** every product page in Apple India's own navigation, 36 in all. Mac: Mac, MacBook Neo, MacBook Air, MacBook Pro,
  iMac, Mac mini, Mac Studio, Displays. iPad: iPad, iPad Pro, iPad Air, iPad 11, iPad mini, Apple Pencil, Keyboards.
  iPhone: iPhone, iPhone Duo, iPhone 18 Pro, iPhone Air, iPhone 17, iPhone 17e. Watch: Watch, Series 12, Ultra 4, SE 3, Nike.
  AirPods: AirPods, AirPods 5, AirPods Pro, AirPods Max. Home: TV and Home, Apple TV 4K, HomePod, HomePod mini, AirTag.
  Plus Apple Intelligence. Vision Pro is not sold in India and is not in the navigation, so it is not included. All 36
  loaded. Twelve flagship pages were also measured at phone width.
- **How:** headless Chromium with software WebGL at 1440x900 and 390x844. Each page is scrolled through, then measured at
  three scroll positions: computed style of every visible text element (size, weight, tracking, leading, colour,
  alignment), gaps between an eyebrow, a headline and the text below it, section heights and background colours, corner
  radii of filled surfaces, how images and video are placed, sticky bars, buttons, and the transition and animation rules
  in the page's own stylesheets (easings and durations, counted).
- **The system is what repeats across pages.** One-off effects are left out.
- **Closest match to edith:** six pages have a pure black body (iPad Pro, Watch Ultra 4, Watch Series 12, iPhone 18 Pro,
  MacBook Pro, HomePod). They are reported separately as "dark pages".
- **Limits:** computed styles and stylesheet rules, not video. Easing counts are rules in the stylesheets, not proof of
  runtime use (the running-animation sample agrees with them). Scroll-linked effects driven by script are only partly
  visible: a probe of about 95 large elements per page saw about 6 change opacity and 4 change transform on a typical page,
  and none change text colour, so word-by-word "lighting" is not the norm on product pages.

## 1. Type

Desktop, all 36 pages. Almost everything is one weight.

| Size (px) | Pages using it | Weight | Tracking (em) | Leading |
| --- | --- | --- | --- | --- |
| 96 | 7 | 600 (700 on some) | -0.01 | 1.04 |
| 80 | 27 | 600 | -0.01 | 1.05 |
| 64 | 20 | 600 | -0.01 | 1.06 |
| 56 | 25 | 600 | 0 | 1.07 |
| 48 | 27 | 600 | 0 | 1.08 |
| 32 | 22 | 600 | 0 | 1.13 |
| 28 | 29 | 600 | +0.01 | 1.14 |
| 21 | 32 | 600 | +0.01 | 1.38 (paragraphs) |
| 17 | 35 | 400 and 600 | -0.02 | 1.24 |

- **Weight:** 84 percent of large headlines are 600 and 15 percent 700. Hierarchy comes from size and from tone, not from
  changing weight.
- **Tracking tightens as size grows** (0 at 48 to 56, -0.01em from 64) and leading falls from 1.13 at 32 to 1.04 at 96.
- **Alignment:** 43 percent centred, 57 percent left. On the dark pages 61 percent left, 39 percent centred. On phones
  headlines are mostly left aligned (63 percent, 37 percent centred) and take 87 percent of the width at 40 to 48 px.
- **Eyebrows** appear over about a third of headlines, in sentence case (0 percent uppercase), at 0.30 of the headline size,
  0.25 of the headline size above it.
- **Copy under a headline** is mostly 600 too (884 of the 1,240 cases), grey, about 0.35 of the headline size, in a
  column with a median width of 408 px (a quarter of paragraphs are under 319 px, a quarter over 664 px).
- **Colour on dark pages:** headlines `#f5f5f7` (a cool near-white, not pure white), the text under them grey `#86868b`
  in 145 of 233 cases. Text links `#0066cc`.

## 2. Rhythm

- The gap from a headline to the copy below it has a median of **0.5 times the headline size** (quarter and three
  quarters of cases: 0.24 and 1.6; dark pages 0.47).
- Sections have a median height of **1.27 screens** (dark pages 1.52), and a page is about **28 screens** long (dark
  pages 34). Apple keeps text tightly grouped and spends the whitespace between groups.
- 29 of 36 pages carry a **sticky local bar** 52 px tall: the product name on the left, its sections and a "Buy" pill on
  the right.

## 3. Surfaces and colour

- 85 percent of sections on Apple's product pages are light (`#f5f5f7` and white). The six dark pages use `#000`
  sections with `#161617`, `#111` and `#1d1d1f` panels.
- **Panels are tone on tone, not outlined.** The dominant corner radius is **28 px** (2,175 filled surfaces overall, 420 on
  the dark pages), then 30, 10, 18 and 15. Nothing else comes close.
- Gradient headline text (`background-clip: text`) appears on about 18 percent of large headlines. In the four pages read
  closely earlier it was always a product name or numeral, never running copy.

## 4. Media

Large images and video are either full bleed (810 measured) or sit in a 28 px panel (199). Product objects are big and
alone; there is almost no text on top of media.

## 5. Calls to action

- 87 percent are **pills**, 17 px text, 44 px tall, 16 px side padding.
- The filled blue primary (`#0071e3`, "Buy" or "Learn more") is about 41 percent of the calls to action measured (270 of
  652). The rest are plain text links styled as pills or with a chevron (`#0066cc`, 17 px).

## 6. Motion

Stylesheet rules, all 36 pages:

| Easing | Rules |
| --- | --- |
| `cubic-bezier(0.4, 0, 0.6, 1)` | 8,588 |
| `ease` | 2,976 |
| `linear` (scrubbed and continuous) | 1,872 |
| `cubic-bezier(0, 0, 0.2, 1)` | 1,824 |
| `ease-out` | 1,809 |
| `cubic-bezier(0.25, 0.1, 0.3, 1)` | 936 |
| `cubic-bezier(0.28, 0.11, 0.32, 1)` | 252 |

| Duration | Rules |
| --- | --- |
| 240 ms | 4,898 |
| 320 ms | 2,323 |
| 300 ms | 1,604 |
| 400 ms | 1,572 |
| 500 ms | 1,515 |
| 1,000 ms | 848 |

- **One curve does most of the work:** `cubic-bezier(0.4, 0, 0.6, 1)` at 240 to 320 ms for hover, colour and fades. A
  decelerate curve (`0, 0, 0.2, 1`) is used for things arriving, and long soft curves for large moves.
- **Only a few properties are animated:** opacity (5,589 rules), transform (3,542), then visibility, background and colour.
  Layout properties are not.
- Running animations sampled during scrolling: linear (11,350) for continuous motion, 320 ms for the navigation fade.

## What edith adopts

Measured on edith before the change (home page, desktop): headlines at 90, 65, 58, 50 and 45 px in weight 300, but four
sections (How an idea becomes a launch, Everyone starts as a Catalyst, The community decides, Moderated. Scam-free.)
still at a single 44 px; panel corners at 16 px; transitions on a mix of expo-out (53 rules) and plain `ease` (23), at
0.75, 0.5 and 0.3 s; headline-to-copy gaps of 0.29 to 0.46 of the headline, already close to Apple's 0.47 to 0.5.

Taken, in `styles/edith.css` (never in the compiled `site.css`):

1. **A type ladder for the four template sections:** 57.6 px at 1440 (the tier Hubs and Studio already use), -0.015em,
   leading 1.02. Phones keep the original size.
2. **Motion tokens:** `--ease-ui` `cubic-bezier(0.4, 0, 0.6, 1)`, `--ease-out` `cubic-bezier(0, 0, 0.2, 1)`,
   `--ease-glide` `cubic-bezier(0.28, 0.11, 0.32, 1)`, and durations 240, 320, 500 and 900 ms. Every transition edith
   owns (story beats, lit text, lineup, person links, docs and Legion hovers) now uses them. Motion stays on opacity,
   transform and colour, plus box-shadow, border colour and image position where the hub lighting needs them.
3. **Surfaces:** cards and panels take a 28 px corner (`--r-panel`, 3.1rem because the site's rem is 9 px at 1440) with
   16 px on the elements inside (`--r-inner`), and the docs cards are tone on tone (a faint lighter fill) instead of a
   stroke alone.

## Re-measured after the change

Same script, same three pages, desktop:

| | Before | After |
| --- | --- | --- |
| Headline sizes on the home page (px) | 90, 65, 58, 50, 45, and four sections at 44 | 90, 65, 58, 50, 45, and the four sections at 58 |
| Those four sections: tracking, leading | 0, 1.0 | -0.015em, 1.02 |
| Headline to copy gap, as a share of the headline | 0.29 to 0.46 | 0.43 to 0.52 (Apple 0.47 to 0.5) |
| Panel corner radius | 16 px | 28 px |
| Transitions edith owns | mixed `ease` and expo-out at 0.2 to 0.9 s | three curves, 240 to 900 ms |

The compiled template stylesheet (`site.css`, `chunks.css`) still carries its own expo-out transitions at 0.75 s for the
original components. It is a verbatim copy and is not edited, so those rules remain in the count; only the rules edith
wrote moved to the tokens.

## What edith keeps on purpose

- **Pitch black and the cream, gold and marble palette.** Apple's dark pages use a cool near-white and blue; edith does not.
- **Uppercase monospace eyebrows.** Apple uses sentence case and never capitals. The mono label is edith's developer
  signature, so it stays.
- **Light Funnel Display headlines (300).** Apple sets everything in 600. Light weight is part of edith's look and Kevin
  likes the current UI, so the weight is unchanged; only the scale and tracking follow the study.
- **Hairline dividers at 14 percent white** and the marble-gradient button hover.
- **No sticky local bar for now.** It suits a single product page; edith has a section rail and a docs index already.

## Not reproduced

SF Pro, Apple's blue and greys as brand colours, imagery, copy, and any layout that would make a page read as an Apple
page instead of an edith page.
