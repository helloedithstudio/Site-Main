// Builds the site's logo assets from a logo image: cream letters and a red dot on a dark background
// (the "dark" version of the logo). Everything is keyed onto a transparent background.
//
//   node scripts/make-logo.cjs "<path to the dark logo png>"
//
// Writes:
//   public/images/edith-logo.png      full colour wordmark (footer, loading screen)
//   public/images/edith-letters.png   letters only, used as the header's hover-wipe mask
//   public/images/dato/favicon-*.png  "e" + dot on the dark background
//   lib/logo.ts                       size and red-dot position of the wordmark (read by the header)
//
// Per pixel: p = bg*(1-a) + fg*a, with fg the cream letters or the red dot; the script solves for a.
// If the new logo uses other colours, change CREAM and RED below.

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = process.argv[2] || "C:/Users/kavin/OneDrive/Documents/Red and Black Minimalist Studio Logo/3.png";
const OUT = path.join(ROOT, "public/images");
const CREAM = [239, 238, 235];
const RED = [214, 66, 56];
const TARGET_W = 1200;

(async () => {
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const px = (x, y) => {
    const i = (y * W + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const bg = px(4, 4);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const vC = CREAM.map((c, i) => c - bg[i]);
  const vR = RED.map((c, i) => c - bg[i]);
  const cc = dot(vC, vC);
  const rr = dot(vR, vR);

  const alpha = new Uint8Array(W * H);
  const isRed = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = px(x, y);
      const d = [p[0] - bg[0], p[1] - bg[1], p[2] - bg[2]];
      if (Math.abs(d[0]) + Math.abs(d[1]) + Math.abs(d[2]) < 8) continue;
      const aC = Math.min(1, Math.max(0, dot(d, vC) / cc));
      const aR = Math.min(1, Math.max(0, dot(d, vR) / rr));
      const res = (a, v) => {
        const e = [d[0] - a * v[0], d[1] - a * v[1], d[2] - a * v[2]];
        return dot(e, e);
      };
      const useRed = res(aR, vR) < res(aC, vC);
      alpha[y * W + x] = Math.round((useRed ? aR : aC) * 255);
      isRed[y * W + x] = useRed ? 1 : 0;
    }
  }

  // the wordmark is the first block of rows that contain ink; the tagline below it is a separate block
  const rowInk = (y) => {
    for (let x = 0; x < W; x++) if (alpha[y * W + x] > 40) return true;
    return false;
  };
  let y0 = 0;
  while (y0 < H && !rowInk(y0)) y0++;
  let y1 = y0;
  let gap = 0;
  for (let y = y0; y < H; y++) {
    if (rowInk(y)) {
      y1 = y;
      gap = 0;
    } else if (++gap > 40) break;
  }
  const colInk = (x) => {
    for (let y = y0; y <= y1; y++) if (alpha[y * W + x] > 40) return true;
    return false;
  };
  let x0 = 0;
  while (x0 < W && !colInk(x0)) x0++;
  let x1 = W - 1;
  while (x1 > x0 && !colInk(x1)) x1--;
  const pad = 6;
  x0 -= pad;
  x1 += pad;
  y0 -= pad;
  y1 += pad;
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;

  // red dot geometry, in crop pixels
  let sx = 0, sy = 0, n = 0, minx = 1e9, maxx = -1, miny = 1e9, maxy = -1;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = y * W + x;
      if (isRed[i] && alpha[i] > 128) {
        sx += x; sy += y; n++;
        minx = Math.min(minx, x); maxx = Math.max(maxx, x);
        miny = Math.min(miny, y); maxy = Math.max(maxy, y);
      }
    }
  }
  const dotC = n ? { cx: sx / n - x0, cy: sy / n - y0, r: (maxx - minx + 1 + (maxy - miny + 1)) / 4 } : null;

  const build = (mode) => {
    const buf = Buffer.alloc(cw * ch * 4);
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const i = (y + y0) * W + (x + x0);
        const o = (y * cw + x) * 4;
        let a = alpha[i];
        let col = isRed[i] ? RED : CREAM;
        if (mode === "letters") {
          if (isRed[i]) a = 0;
          col = [255, 255, 255];
        }
        buf[o] = col[0]; buf[o + 1] = col[1]; buf[o + 2] = col[2]; buf[o + 3] = a;
      }
    }
    return buf;
  };
  const outH = Math.round((ch * TARGET_W) / cw);
  for (const [name, mode] of [["edith-logo.png", "color"], ["edith-letters.png", "letters"]]) {
    await sharp(build(mode), { raw: { width: cw, height: ch, channels: 4 } })
      .resize(TARGET_W, outH, { kernel: "lanczos3" })
      .png({ compressionLevel: 9 })
      .toFile(path.join(OUT, name));
  }

  // favicon: the first letter ("e") plus the red dot, on the background colour
  const isLetter = (x, y) => alpha[(y + y0) * W + x + x0] > 40 && !isRed[(y + y0) * W + x + x0];
  const colHas = (x) => {
    for (let y = 0; y < ch; y++) if (isLetter(x, y)) return true;
    return false;
  };
  let ex0 = 0;
  while (ex0 < cw && !colHas(ex0)) ex0++;
  let ex1 = ex0;
  while (ex1 < cw && colHas(ex1)) ex1++;
  ex1--;
  let ey0 = ch, ey1 = 0;
  for (let y = 0; y < ch; y++) for (let x = ex0; x <= ex1; x++) if (isLetter(x, y)) { ey0 = Math.min(ey0, y); ey1 = Math.max(ey1, y); }
  const ew = ex1 - ex0 + 1;
  const eh = ey1 - ey0 + 1;
  const eBuf = Buffer.alloc(ew * eh * 4);
  for (let y = 0; y < eh; y++) {
    for (let x = 0; x < ew; x++) {
      const i = (y + ey0 + y0) * W + x + ex0 + x0;
      const o = (y * ew + x) * 4;
      eBuf[o] = CREAM[0]; eBuf[o + 1] = CREAM[1]; eBuf[o + 2] = CREAM[2];
      eBuf[o + 3] = isRed[i] ? 0 : alpha[i];
    }
  }
  const eSharp = sharp(eBuf, { raw: { width: ew, height: eh, channels: 4 } });
  for (const s of [16, 32, 96, 192]) {
    const inner = Math.round(s * 0.62);
    const eRes = await eSharp.clone().resize({ width: inner, height: Math.round((inner * eh) / ew), fit: "inside", kernel: "lanczos3" }).png().toBuffer();
    const eMeta = await sharp(eRes).metadata();
    const left = Math.round((s - eMeta.width) / 2 - s * 0.03);
    const top = Math.round((s - eMeta.height) / 2 + s * 0.06);
    const r = Math.max(1.5, s * 0.1);
    const dotSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><circle cx="${s * 0.76}" cy="${s * 0.25}" r="${r}" fill="rgb(${RED.join(",")})"/></svg>`);
    await sharp({ create: { width: s, height: s, channels: 4, background: { r: bg[0], g: bg[1], b: bg[2], alpha: 1 } } })
      .composite([{ input: eRes, left, top }, { input: dotSvg, left: 0, top: 0 }])
      .png()
      .toFile(path.join(OUT, `dato/favicon-${s}.png`));
  }

  fs.writeFileSync(
    path.join(ROOT, "lib/logo.ts"),
    `// Generated by scripts/make-logo.cjs. Do not edit by hand.
// Size of the wordmark image (px) and the position of its red dot, in the same pixel units.
export const LOGO = ${JSON.stringify({ width: cw, height: ch, dot: dotC }, null, 2)} as const;
`,
  );
  console.log(`wordmark ${cw}x${ch} (aspect ${(cw / ch).toFixed(3)}), dot`, dotC);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
