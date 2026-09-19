// Builds styles/site.css from the untouched original, styles/site.src.css, applying the one edith change to the
// Saffron palette: the thin divider lines.
//
//   node scripts/retheme.cjs [--check]
//
// The compiled stylesheet carries its palette as colour literals inside utility classes, so the line colour is
// swapped by value. Only border colours change (`.border-brown-dark`, `.divide-brown-dark` and their variants);
// `.bg-brown-dark` uses the same brown as a background and is left alone.
//
// The lines are translucent white rather than a fixed grey: they read as a soft grey on black and as a warm grey
// over the brown panels, so they take their tone from whatever background they sit on.
// Keep LINE in sync with `theme.line` in lib/theme.ts. Never hand-edit styles/site.css, and never edit
// styles/site.src.css at all: it is the pristine original every run starts from, so runs never stack.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "styles/site.src.css");
const OUT = path.join(ROOT, "styles/site.css");
const check = process.argv.includes("--check");

const LINE = { rgb: "255 255 255", opacity: ".14" }; // theme.line: rgb(255 255 255 / 14%)

const SWAPS = [
  ["--tw-border-opacity:1;border-color:rgb(71 20 11", `--tw-border-opacity:${LINE.opacity};border-color:rgb(${LINE.rgb}`],
  ["--tw-divide-opacity:1;border-color:rgb(71 20 11", `--tw-divide-opacity:${LINE.opacity};border-color:rgb(${LINE.rgb}`],
];

if (!fs.existsSync(SRC)) throw new Error("styles/site.src.css is missing: it is the untouched original this script builds from");
let css = fs.readFileSync(SRC, "utf8");
let total = 0;
for (const [from, to] of SWAPS) {
  total += css.split(from).length - 1;
  css = css.split(from).join(to);
}
const leftover = css.split("border-color:rgb(71 20 11").length - 1;
if (leftover) throw new Error(`${leftover} line rule(s) did not match the expected pattern`);

const current = fs.readFileSync(OUT, "utf8");
if (check) {
  console.log(current === css ? "[check] site.css is up to date" : "[check] site.css is stale: run without --check");
  process.exit(current === css ? 0 : 1);
}
fs.writeFileSync(OUT, css);
console.log(`site.css rebuilt from site.src.css: ${total} line rule(s) set to rgb(${LINE.rgb} / ${LINE.opacity})`);
