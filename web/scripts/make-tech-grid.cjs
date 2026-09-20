// Draws the page backdrop: a dark engineering grid with faint traces and the marble's magenta/orange as soft glows.
// The picture tiles in Y (glows are drawn at +-H too) so HomeHero can drift it with scroll.
// usage: node scripts/make-tech-grid.cjs   ->  public/gl/images/tech-grid.webp
const sharp = require("sharp");
const path = require("path");

const W = 2048;
const H = 1152;
const CELL = 64;
const MAJOR = 384;
const LINE = "255,255,255";

const glow = (id, cx, cy, r, rgb, a) => {
  const defs = `<radialGradient id="${id}" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="rgb(${rgb})" stop-opacity="${a}"/><stop offset="1" stop-color="rgb(${rgb})" stop-opacity="0"/></radialGradient>`;
  const uses = [-H, 0, H].map((dy) => `<ellipse cx="${cx}" cy="${cy + dy}" rx="${r * 1.5}" ry="${r}" fill="url(#${id})"/>`).join("");
  return { defs, uses };
};
const glows = [glow("g1", 380, 220, 520, "232,3,209", 0.17), glow("g2", 1660, 860, 560, "255,131,1", 0.11), glow("g3", 1120, 560, 700, "206,58,173", 0.09)];

let grid = "";
for (let x = 0; x <= W; x += CELL) grid += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="rgb(${LINE})" stroke-opacity="${x % MAJOR === 0 ? 0.075 : 0.035}" stroke-width="1"/>`;
for (let y = 0; y < H; y += CELL) grid += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="rgb(${LINE})" stroke-opacity="${y % MAJOR === 0 ? 0.075 : 0.035}" stroke-width="1"/>`;

let marks = "";
for (let x = 0; x <= W; x += MAJOR) for (let y = 0; y < H; y += MAJOR) {
  marks += `<path d="M${x - 9} ${y}H${x + 9}M${x} ${y - 9}V${y + 9}" stroke="rgb(${LINE})" stroke-opacity="0.26" stroke-width="1" fill="none"/>`;
}
const dots = [[128, 448], [640, 64], [896, 832], [1408, 256], [1728, 576], [1984, 1024], [320, 960], [1216, 1088]];
for (const [x, y] of dots) marks += `<circle cx="${x}" cy="${y}" r="2" fill="rgb(${LINE})" fill-opacity="0.2"/>`;

// circuit traces on the grid, 45 degree chamfers, ending in a node
const traces = [
  "M192 128V256L256 320H640",
  "M1024 64H1280L1344 128V320",
  "M1472 704H1728L1792 768V960",
  "M448 1024H704L768 960H960",
  "M1856 128V384L1920 448",
  "M64 640H256L320 704V832",
];
let tr = "";
for (const d of traces) {
  const m = d.match(/[MHVL][-\d.\s]+/g);
  let x = 0, y = 0, last;
  for (const seg of m) {
    const c = seg[0], n = seg.slice(1).trim().split(/\s+/).map(Number);
    if (c === "M" || c === "L") { x = n[0]; y = n[1]; } else if (c === "H") x = n[0]; else if (c === "V") y = n[0];
    last = [x, y];
  }
  tr += `<path d="${d}" stroke="rgb(${LINE})" stroke-opacity="0.13" stroke-width="1.5" fill="none" stroke-linejoin="round"/><circle cx="${last[0]}" cy="${last[1]}" r="4" fill="#030304" stroke="rgb(${LINE})" stroke-opacity="0.32" stroke-width="1.5"/>`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>${glows.map((g) => g.defs).join("")}</defs>
<rect width="${W}" height="${H}" fill="#030304"/>
${glows.map((g) => g.uses).join("")}
${grid}${tr}${marks}
</svg>`;

const out = path.join(__dirname, "..", "public", "gl", "images", "tech-grid.webp");
sharp(Buffer.from(svg)).removeAlpha().webp({ nearLossless: true, quality: 60, effort: 6 }).toFile(out).then((i) => console.log("wrote", out, (i.size / 1024).toFixed(0) + " KB"));
