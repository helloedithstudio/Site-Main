// The site's colours. The site keeps the original Saffron palette (cream text, gold accents, warm browns, the
// magenta/orange WebGL glows), with two deliberate changes:
//  - the thin divider lines are translucent white, so they take their tone from the background behind them.
//    `scripts/retheme.cjs` writes them into the stylesheet; keep its LINE value in sync with `line` below.
//  - the button hover fill is a gradient in the hero marble's own colours (components/ui/Button.tsx).

export const theme = {
  /** Accent for the logo, social and menu-toggle hover wipes: the original gold. */
  accent: "#FFBC09",
  /** The thin divider lines (section borders, column and row dividers). */
  line: "rgb(255 255 255 / 14%)",
  /**
   * Button hover fill, from the centre of the glow outward. Sampled from the hero marble's colour ramp
   * (public/gl/images/hero/colorA.jpg), so the fill reads as the background bleeding into the button.
   * Every stop keeps the button's black text above 4.5:1 contrast; the ramp's deep violet was left out for that.
   */
  hoverStops: ["#FEAF01", "#FF8301", "#FF3702", "#F70C5A", "#E803D1", "#CE3AAD"],
  /** The marble ramp as one gradient, for a single highlighted word (`.edith-gradword`). Keep in sync with `--edith-ramp` in styles/edith.css. */
  ramp: "linear-gradient(90deg, #FEAF01 0%, #FF8301 30%, #F70C5A 68%, #E803D1 100%)",
  /** The Apple-style rule for highlight sections (the reference gradient), see `.edith-rule`. */
  gradient: "linear-gradient(90deg, #0A84FF 0%, #6F5BFF 28%, #BC4BFF 48%, #FF4B8B 70%, #FF8A3D 88%, #FFB13D 100%)",
} as const;
