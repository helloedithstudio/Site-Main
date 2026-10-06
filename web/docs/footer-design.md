# Footer design (edith, Apple-style)

A portable spec of the edith site footer, written so it can be rebuilt on another site. Source of truth in this repo:
`components/Footer.tsx` (markup), `styles/edith.css` lines 158 to 308 (styles, every class starts `edith-apf`), `lib/content.ts`
(`footer` data), `lib/runtime/useAccordion.ts` (phone accordion).

## 1. What it is

A quiet, dark, text-only footer in the manner of Apple's. No logo, no wordmark, no imagery, no buttons. Hierarchy comes
from three levels of cream-on-black opacity, small type, and thin hairlines. It reads as fine print, not as a section.

Order, top to bottom:

1. A hairline across the top of the footer.
2. **Notes**: one to three short sentences of small print (what the site is, a trust line).
3. A hairline.
4. **Link groups**: headed lists. Five columns on desktop, three on tablet, one accordion per group on phones.
5. A hairline.
6. **Bar**: copyright, legal links separated by thin vertical rules, credit, region.

## 2. Tokens

Values are in px at a 1440 px wide viewport. The edith site scales `rem` with the viewport (1rem is about 9 px at 1440), so its
CSS shows rem; the numbers here are the resolved sizes, which is what to use on a site with a normal 16 px root.

| Token | Value | Use |
| --- | --- | --- |
| Background | `#000` | Footer and page behind it |
| Cream (base) | `rgb(236 231 224)` | All text, at different opacities |
| Text, title | cream at 100% | Group titles, and link hover |
| Text, link and small print | cream at 68% | Links, credit, region, chevron |
| Text, notes and copyright | cream at 55% | The quietest text (set on the footer itself) |
| Hairline | `rgb(255 255 255 / 0.14)` | All horizontal dividers |
| Vertical rule | `rgb(255 255 255 / 0.20)` | Between legal links |
| Focus ring | `2px solid #ffbc09`, offset 3px, radius 2px | Keyboard focus on links |
| Font | The site body font (Host Grotesk on edith; any neutral grotesque or system sans works) | Everything |
| Small print size | 12px, line-height 1.6 | Footer base, copyright, legal, credit |
| Link and title size | 12.5px | Links and group titles |
| Title weight | 600, no uppercase, no letter-spacing | Group titles |
| Link weight | 400 | Links |
| Hover | colour 240ms `cubic-bezier(0.4, 0, 0.6, 1)` | Colour only |
| Chevron flip | 320ms, same curve | Accordion arrow |
| Accordion open/close | 500ms, a snappy ease | Panel height |

Rules the look depends on:

- Only three text strengths (100, 68, 55). Do not add more.
- Titles are the only bold text. Everything else is regular.
- Hover brightens a link to full cream and underlines it (offset 0.3em). Hover is gated to `(hover: hover) and (pointer: fine)`,
  so touch screens never get a stuck hover.
- Nothing animates except colour, the chevron and the accordion height.

## 3. Layout

Container: centred, content width about 1200 to 1400 px with a side gutter (edith uses its own `site-max --l` wrapper, about 15rem
of gutter at 1440). On phones keep a 16 to 20 px side gutter.

| Part | Spec |
| --- | --- |
| Footer | `border-top` hairline, background `#000` |
| Notes | Column flex, gap 11px, `max-width` 972px, padding `29px 0 22px` |
| Body | `border-top` hairline |
| Columns | Grid, `padding: 27px 0 36px` |
| Group | `padding-bottom: 23px`; title has `margin-bottom: 7px` |
| Link | `display: inline-block`, `padding: 3px 0` (a comfortable tap and click row) |
| Bar | `border-top` hairline, `padding: 20px 0 31px`, column flex with gap 9px on phones |
| Legal row | Flex, wrap, gap `0 13px`; each item after the first has `padding-left: 13px` and a 1px vertical rule inset `0.55em` from the top and bottom of the line |

### Breakpoints

| Width | Behaviour |
| --- | --- |
| under 650px | Accordions, one per group, one open at a time. The column grid is hidden. |
| 650 to 899px | Three equal columns, column gap 22px |
| 900px and up | Five equal columns, column gap 27px. The bar becomes one row: copyright left, legal links centre (`flex: 1`, `margin-left: 9px`), region right, gap 27px, items vertically centred. |

Columns are made of stacked groups. In the edith data the five columns hold 2, 2, 2, 1, 1 groups, so a column can be tall or short;
group order matters more than balance. Keep each group to roughly 3 to 6 links.

## 4. Content model

```ts
type LinkItem = { id: string; label: string; href: string; external?: boolean };
type FooterGroup = { id: string; title: string; links: LinkItem[] };

footer = {
  notes: string[];              // 1 to 3 sentences of small print
  columns: FooterGroup[][];     // columns, each a stack of groups
  legal: LinkItem[];            // privacy, terms, rules, docs
}
```

Bar text on edith: `Copyright © {year} {brand}. All rights reserved.`, then the legal links, then `Designed by {brand}`, then the location
string. The year comes from `new Date().getFullYear()`.

edith's groups, for reference: Explore, Docs, Community, Get involved, Trust, Built with, For Maintainers, About edith.

## 5. Phone accordion

- Each group is a row: title on the left, a small chevron on the right, a hairline underneath (`border-bottom`).
- The row button has `padding: 13.5px 0`, full width, left-aligned text.
- Opening a row closes the others. The chevron is the 12 x 25 arrow glyph drawn 7px wide and flips with `scaleY(-1)`.
- Panel links sit in a list with `padding-bottom: 14px`.
- Accessibility: the button has `aria-expanded` and `aria-controls`; the panel id matches; closed panels are `visibility: hidden`
  once collapsed so their links leave the tab order.
- On edith the height tween is GSAP (`useAccordion`). A CSS-only version (grid rows `0fr` to `1fr`) is in section 7 and looks the same.

Chevron path (viewBox `0 0 12 25`, filled with `currentColor`):

```
M4.99262 24.2803C5.28551 24.5732 5.76039 24.5732 6.05328 24.2803L10.8262 19.5074C11.1191 19.2145 11.1191 18.7396 10.8262 18.4467C10.5334 18.1538 10.0585 18.1538 9.76559 18.4467L5.52295 22.6893L1.28031 18.4467C0.987415 18.1538 0.512541 18.1538 0.219648 18.4467C-0.0732459 18.7396 -0.0732459 19.2145 0.219648 19.5074L4.99262 24.2803ZM5.52295 0L4.77295 -3.27835e-08L4.77295 23.75L5.52295 23.75L6.27295 23.75L6.27295 3.27835e-08L5.52295 0Z
```

## 6. Accessibility notes

- `<footer role="contentinfo">`; each group is a `<section aria-labelledby>` with an `<h2>` title (visually small, structurally a heading).
- Cream at 68% on black is about 7.8:1 and at 55% about 5.3:1 (my own calculation from the colour values, not a tool reading), both above the AA 4.5:1 minimum for small text. Re-check if you change the background.
- The accordion and the column grid both exist in the DOM on edith (one hidden per breakpoint). On a new site, render only one, or keep
  the hidden one `display: none` so screen readers do not read the links twice. Hiding with CSS `display: none` is enough.
- Honour `prefers-reduced-motion`: drop the accordion tween and chevron transition.

## 7. Portable version (plain HTML and CSS, no framework)

Drop-in. Change `--apf-bg` and the cream if the new site is not black.

```html
<footer class="apf" role="contentinfo">
  <div class="apf-wrap">
    <div class="apf-notes">
      <p>One or two sentences about what the site is.</p>
      <p>A trust line, for example how data is handled.</p>
    </div>

    <div class="apf-body">
      <!-- 650px and up -->
      <div class="apf-cols">
        <div class="apf-col">
          <section class="apf-group" aria-labelledby="apf-explore">
            <h2 id="apf-explore" class="apf-title">Explore</h2>
            <ul>
              <li><a class="apf-link" href="#">Link one</a></li>
              <li><a class="apf-link" href="#">Link two</a></li>
            </ul>
          </section>
          <!-- more groups; more .apf-col -->
        </div>
      </div>

      <!-- under 650px: repeat the same groups -->
      <ul class="apf-acc">
        <li class="apf-acc-item">
          <button class="apf-acc-btn" aria-expanded="false" aria-controls="apf-p0">
            <span class="apf-title">Explore</span>
            <span class="apf-chev" aria-hidden="true">
              <svg viewBox="0 0 12 25" fill="none"><path fill="currentColor" d="PASTE CHEVRON PATH"/></svg>
            </span>
          </button>
          <div id="apf-p0" class="apf-panel"><div>
            <ul class="apf-acc-links">
              <li><a class="apf-link" href="#">Link one</a></li>
            </ul>
          </div></div>
        </li>
      </ul>
    </div>

    <div class="apf-bar">
      <p class="apf-copy">Copyright © 2026 Your Name. All rights reserved.</p>
      <ul class="apf-legal">
        <li><a class="apf-link apf-link--legal" href="#">Privacy policy</a></li>
        <li><a class="apf-link apf-link--legal" href="#">Terms of use</a></li>
        <li><span class="apf-credit">Designed by Your Name</span></li>
      </ul>
      <p class="apf-region">City, Country</p>
    </div>
  </div>
</footer>
```

```css
.apf {
  --apf-bg: #000;
  --apf-cream: 236 231 224;
  --apf-line: rgb(255 255 255 / 0.14);
  --apf-ease: cubic-bezier(0.4, 0, 0.6, 1);
  background: var(--apf-bg);
  color: rgb(var(--apf-cream) / 0.55);
  border-top: 1px solid var(--apf-line);
  font-size: 12px;
  line-height: 1.6;
}
.apf ul { list-style: none; margin: 0; padding: 0; }
.apf-wrap { max-width: 1320px; margin: 0 auto; padding: 0 20px; }

.apf-notes { display: flex; flex-direction: column; gap: 11px; max-width: 972px; padding: 29px 0 22px; }
.apf-notes p, .apf-copy, .apf-region { margin: 0; }
.apf-body { border-top: 1px solid var(--apf-line); }

.apf-title {
  margin: 0; color: rgb(var(--apf-cream));
  font: inherit; font-size: 12.5px; font-weight: 600; line-height: 1.5;
}
.apf-link {
  display: inline-block; padding: 3px 0;
  color: rgb(var(--apf-cream) / 0.68); font-size: 12.5px; text-decoration: none;
  transition: color 240ms var(--apf-ease);
}
.apf-link:focus-visible { outline: 2px solid #ffbc09; outline-offset: 3px; border-radius: 2px; }
@media (hover: hover) and (pointer: fine) {
  .apf-link:hover { color: rgb(var(--apf-cream)); text-decoration: underline; text-underline-offset: 0.3em; }
}

/* columns (650px and up) */
.apf-cols { display: none; }
@media (min-width: 650px) {
  .apf-cols { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0 22px; padding: 27px 0 36px; }
  .apf-acc { display: none; }
}
@media (min-width: 900px) {
  .apf-cols { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 0 27px; }
}
.apf-group { padding-bottom: 23px; }
.apf-group .apf-title { margin-bottom: 7px; }

/* accordion (under 650px) */
.apf-acc-item { border-bottom: 1px solid var(--apf-line); }
.apf-acc-btn {
  display: flex; align-items: center; justify-content: space-between; width: 100%;
  padding: 13.5px 0; text-align: left; background: none; border: 0; cursor: pointer; color: inherit; font: inherit;
}
.apf-chev { flex: none; display: block; width: 7px; color: rgb(var(--apf-cream) / 0.68); transition: transform 320ms var(--apf-ease); }
.apf-chev svg { display: block; width: 100%; height: auto; }
.apf-acc-btn[aria-expanded="true"] .apf-chev { transform: scaleY(-1); }
.apf-panel { display: grid; grid-template-rows: 0fr; visibility: hidden;
  transition: grid-template-rows 500ms var(--apf-ease), visibility 0s linear 500ms; }
.apf-panel > div { overflow: hidden; }
.apf-acc-btn[aria-expanded="true"] + .apf-panel { grid-template-rows: 1fr; visibility: visible; transition-delay: 0s; }
.apf-acc-links { padding: 0 0 14px; }

/* bar */
.apf-bar { display: flex; flex-direction: column; gap: 9px; padding: 20px 0 31px; border-top: 1px solid var(--apf-line); }
.apf-legal { display: flex; flex-wrap: wrap; gap: 0 13px; }
.apf-legal li + li { position: relative; padding-left: 13px; }
.apf-legal li + li::before { content: ""; position: absolute; left: 0; top: 0.55em; bottom: 0.55em; width: 1px; background: rgb(255 255 255 / 0.2); }
.apf-link--legal, .apf-credit { font-size: 12px; }
.apf-credit, .apf-region { color: rgb(var(--apf-cream) / 0.68); }
@media (min-width: 900px) {
  .apf-bar { flex-direction: row; align-items: center; justify-content: space-between; gap: 27px; }
  .apf-legal { flex: 1; margin-left: 9px; }
}
@media (prefers-reduced-motion: reduce) {
  .apf-link, .apf-chev, .apf-panel { transition: none; }
}
```

```js
// One open row at a time.
document.querySelectorAll(".apf-acc-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const open = btn.getAttribute("aria-expanded") === "true";
    document.querySelectorAll(".apf-acc-btn").forEach((b) => b.setAttribute("aria-expanded", "false"));
    btn.setAttribute("aria-expanded", open ? "false" : "true");
  });
});
```

## 8. Checklist when moving it to another site

1. Copy section 7, replace the groups, notes, legal links and bar text. Paste the chevron path.
2. Keep the three text strengths and the hairline colour; change the background only if you also re-check contrast.
3. Use a neutral sans at 12 to 12.5px. No logo, no icons, no buttons in the footer.
4. Keep legal links in the bar, not in the columns, and keep 3 to 6 links per group.
5. If the new site is a freelancing site, expect groups such as Services, Work, Process, Contact, and a legal row. Do not reuse
   edith's wording (Catalyst, Maintainer, Legion): it belongs to the dev community site.
6. Test at 375, 700 and 1440 px, with keyboard only, and with reduced motion on.
