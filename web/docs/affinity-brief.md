# Affinity brief: three pieces for the edith site

For Kevin to build in Affinity, about 90 minutes in all. The site works without any of them: each piece replaces a
placeholder I have already made, so nothing waits on you. Do them in this order. If one is not ready, skip it.

| Piece | Time | Replaces | Priority |
| --- | --- | --- | --- |
| A. Share image | about 40 min | the share image made from the hero (`app/opengraph-image.jpg`) | 1 |
| B. Logo pack | about 20 min | the sample wordmark (`public/images/edith-logo.png`, favicons) | 2, only if the final logo is ready |
| C. Six hub glyphs | about 30 min | the six engraved symbols on the layer stack | 3 |

## Reference pack (already made)

In `web/assets-in/reference/`:

- `hero-marble-2400x1260.png`: the hero marble with no text, for piece A's backdrop.
- `logo-current.png`: the sample wordmark now in use.
- `palette.png`: every colour below as swatches.

## Shared rules

- **Colour space:** sRGB. Document colour format RGB/8. Do not use CMYK.
- **Palette:** cream `#ECE7E0` for text, gold `#FFBC09` for accents, black `#000000` for the page, the logo dot red
  `#D64238`, and the marble ramp `#FEAF01`, `#FF8301`, `#FF3702`, `#F70C5A`, `#E803D1`, `#CE3AAD`. Use the marble ramp only
  as small light, never as large flat areas. No white (use cream) and no grey backgrounds (use black).
- **Fonts** (all free, install them first): Funnel Display (headlines, weight Light 300), Host Grotesk (body), JetBrains
  Mono (labels and code). All three are on Google Fonts and JetBrains' own site. Convert any live text to curves before
  exporting a vector.
- **Tone:** pitch black, quiet, product-on-black. Plenty of empty space. One idea per piece.
- **Files go in** `web/assets-in/`, named exactly as below. No spaces.
- **No dashes** (long or short) in any text. British spelling.

## A. Share image (1200 x 630)

The picture shown when the link is pasted into Discord, LinkedIn, WhatsApp or X. The current one is the hero as it looks
on the site, so it is already on brand; yours should be better composed.

- **Artboard:** 2400 x 1260 px (exports at 1200 x 630 in the site; the double size keeps it sharp).
- **Backdrop:** pure black with the marble reference placed on it. You may crop, scale, blur a copy for glow, or mask it,
  but keep the middle 60 percent quiet for the headline.
- **Headline (Funnel Display Light, cream):** "A legion of builders that runs itself." on two lines, "A legion of
  builders" and "that runs itself." Tight tracking (about minus 1.5 percent), leading about 1.02. About 150 to 190 px on
  the 2400 wide artboard.
- **Logo:** top left, cream wordmark with the red dot, about 140 px tall.
- **Small line (JetBrains Mono, 44 px, cream at 70 percent):** `discord.gg/TmVeNgzw4K`, bottom left.
- **Safe area:** keep everything at least 120 px from every edge (platforms crop the edges).
- **Do not:** add a button, a photo, any colour outside the palette, or more than two lines of headline.
- **Export:** JPEG, quality 90, sRGB, 2400 x 1260, as `opengraph-image.jpg` (or PNG if you prefer, named
  `opengraph-image.png`). I resize it to 1200 x 630 and put it in the three places the site needs.
- **Check:** view it at 300 px wide. The headline must still be readable and nothing may touch an edge.

## B. Logo pack (only if the final logo is ready)

- **Wordmark, light on dark:** cream `#ECE7E0` letters with the red `#D64238` dot, exported as **SVG** (text outlined, no
  fonts, no effects, no bitmaps) and as a **transparent PNG 2400 px wide**. Names: `logo-wordmark.svg`,
  `logo-wordmark.png`. Keep clear space around it equal to the height of the letter "e".
- **Square mark:** the smallest version of the logo that still reads, on a transparent 1024 x 1024 artboard with 15
  percent padding, exported as `logo-mark.png` (and `logo-mark.svg`). It becomes the favicon and app icon.
- **Check:** at 16 px and 32 px the mark must still be recognisable. If it is not, make a simplified small version and
  export it as `logo-mark-small.svg`.
- The site's logo hover fills the letters with the marble gradient through a mask, so the letters and the dot must be
  separate shapes in the SVG (name the layers `letters` and `dot`).

## C. Six hub glyphs (512 x 512 each)

The engraved symbols on the layer stack in the Hubs and Beliefs sections. Today they are drawn in code and look a
little generic; drawing them properly is the biggest single lift for the stack. Keep the same meanings so the story
still reads.

| Order (top to bottom) | File name | Hub | Meaning |
| --- | --- | --- | --- |
| 1 | `glyph-ideas.svg` | Ideas | a spark or four point star |
| 2 | `glyph-build.svg` | Build | code brackets around a slash |
| 3 | `glyph-team-up.svg` | Team up | two linked rings |
| 4 | `glyph-help.svg` | Help | a life ring |
| 5 | `glyph-feedback.svg` | Feedback | a speech bubble |
| 6 | `glyph-show-off.svg` | Show off | a star or a launch mark |

- **One family:** the same visual weight, the same corner treatment and the same level of detail across all six.
- **Artboard:** 512 x 512, glyph centred with at least 64 px padding on every side.
- **Single colour:** solid black `#000000` shapes on transparent. No strokes (expand every stroke to a shape), no
  gradients, no effects, one compound path per glyph.
- **Minimum feature:** no line, gap or detail thinner than 24 px (they are engraved into a plate in 3D, and thinner
  detail disappears).
- **Export:** SVG (Export, SVG, "Flatten transparency" on, "Export text as curves" on) and also a 1024 px PNG named
  `glyph-ideas.png` and so on.
- **Check:** view all six at 64 px in a row. They must read as a set and each be told apart at a glance.

## What happens when a file arrives

1. **A:** I resize and drop it in `app/`, `app/docs/` and `app/legion/`, rebuild and check the tags.
2. **B:** I run `node scripts/make-logo.cjs <logo-wordmark.png>` to rebuild the header, footer and favicon assets, and
   check the hover.
3. **C:** I import the SVGs into Blender (`blender/scripts/hub_stack.py`), engrave them, re-render the seven stack frames
   and the Beliefs sequence (about 35 minutes of rendering), and rebuild the images.

Nothing above needs your time beyond building the files.
