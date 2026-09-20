// Turns raw Blender renders (16-bit RGBA on a transparent film) into the site images in public/images/hubs/.
// Two presets: `hub` (the six-layer stack, blender/work/hub) and `ship` (the three-card lineup, blender/work/ship).
// For the hub preset the output is:
//   stack-base.webp      the stack with nothing lit, straight alpha, with a soft bloom on its edge lights
//   stack-glow-N.webp    one RGBA layer per hub, drawn over the base with ordinary alpha compositing. Where the lit
//                        render equals the base the layer is transparent; where a glyph or edge light glows (or its
//                        bloom spills onto the page) the layer carries exactly the light that is missing, so
//                        over(layer, base) reproduces the fully lit render. No blend modes, so it works inside any
//                        stacking context.
// Each image is written at 1120 and 640 px wide (-2x / -1x suffix) for srcset.
//
// The ship preset writes lineup-base-* and lineup-glow-N-* the same way.
//
// usage: node scripts/make-hub-images.cjs [hub|ship]

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..", "blender", "work");
const OUT = path.join(__dirname, "..", "public", "images", "hubs");
const PRESETS = {
  hub: { raw: path.join(ROOT, "hub"), prefix: "stack", count: 6, widths: [["2x", 1120], ["1x", 640]], rest: 0.6, lit: 1.4 },
  ship: { raw: path.join(ROOT, "ship"), prefix: "lineup", count: 3, widths: [["2x", 1600], ["1x", 800]], rest: 0.6, lit: 1.4 },
};
const P = PRESETS[process.argv[2] || "hub"];
if (!P) throw new Error("unknown preset, use hub or ship");
const RAW = P.raw;
const WIDTHS = P.widths;
const HUBS = P.count;

const toLin = (v) => Math.pow(v, 2.2);
const toSrgb = (v) => Math.pow(Math.max(0, Math.min(1, v)), 1 / 2.2);

async function load(name) {
  const file = path.join(RAW, `raw_${name}.png`);
  // toColourspace("rgb16") is what makes sharp hand back real 16-bit values (plain raw ushort is 8-bit data in 16-bit words)
  const { data, info } = await sharp(file).toColourspace("rgb16").raw({ depth: "ushort" }).toBuffer({ resolveWithObject: true });
  const u16 = new Uint16Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.length));
  const { width, height } = info;
  const n = width * height;
  const rgb = new Float32Array(n * 3); // premultiplied, display (sRGB) values
  const a = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const al = u16[i * 4 + 3] / 65535;
    a[i] = al;
    for (let c = 0; c < 3; c++) rgb[i * 3 + c] = (u16[i * 4 + c] / 65535) * al;
  }
  return { width, height, rgb, a };
}

// one box blur pass along a row/column using a running sum, clamped at the edges
function boxPass(src, dst, w, h, r, channels, horizontal) {
  const len = horizontal ? w : h;
  const lines = horizontal ? h : w;
  const norm = 1 / (2 * r + 1);
  for (let line = 0; line < lines; line++) {
    for (let c = 0; c < channels; c++) {
      const at = (k) => {
        const kk = k < 0 ? 0 : k >= len ? len - 1 : k;
        const idx = horizontal ? line * w + kk : kk * w + line;
        return src[idx * channels + c];
      };
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += at(k);
      for (let k = 0; k < len; k++) {
        const idx = horizontal ? line * w + k : k * w + line;
        dst[idx * channels + c] = sum * norm;
        sum += at(k + r + 1) - at(k - r);
      }
    }
  }
}

function gaussian(src, w, h, sigma, channels) {
  // three box passes approximate a gaussian
  const r = Math.max(1, Math.round(Math.sqrt((12 * sigma * sigma) / 3 + 1) / 2));
  let a = Float32Array.from(src);
  let b = new Float32Array(src.length);
  for (let pass = 0; pass < 3; pass++) {
    boxPass(a, b, w, h, r, channels, true);
    boxPass(b, a, w, h, r, channels, false);
  }
  return a;
}

function halve(rgb, w, h) {
  const w2 = w >> 1, h2 = h >> 1;
  const out = new Float32Array(w2 * h2 * 3);
  for (let y = 0; y < h2; y++) {
    for (let x = 0; x < w2; x++) {
      for (let c = 0; c < 3; c++) {
        const i = ((y * 2) * w + x * 2) * 3 + c;
        out[(y * w2 + x) * 3 + c] = (rgb[i] + rgb[i + 3] + rgb[i + w * 3] + rgb[i + w * 3 + 3]) / 4;
      }
    }
  }
  return { out, w2, h2 };
}

function upsample(src, w2, h2, w, h) {
  const out = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) {
    const fy = Math.min(h2 - 1, Math.max(0, (y + 0.5) * (h2 / h) - 0.5));
    const y0 = Math.floor(fy), y1 = Math.min(h2 - 1, y0 + 1), ty = fy - y0;
    for (let x = 0; x < w; x++) {
      const fx = Math.min(w2 - 1, Math.max(0, (x + 0.5) * (w2 / w) - 0.5));
      const x0 = Math.floor(fx), x1 = Math.min(w2 - 1, x0 + 1), tx = fx - x0;
      for (let c = 0; c < 3; c++) {
        const v00 = src[(y0 * w2 + x0) * 3 + c], v10 = src[(y0 * w2 + x1) * 3 + c];
        const v01 = src[(y1 * w2 + x0) * 3 + c], v11 = src[(y1 * w2 + x1) * 3 + c];
        out[(y * w + x) * 3 + c] = (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty;
      }
    }
  }
  return out;
}

// Soft bloom of the bright, saturated parts of a premultiplied sRGB image (lit glyphs and edge lines): a linear-light
// field, faded to nothing before the image edge (or the page would show a faint rectangle around the stack).
function bloomField(img) {
  const { width: w, height: h } = img;
  const n = w * h;
  const bright = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = img.rgb[i * 3], g = img.rgb[i * 3 + 1], b = img.rgb[i * 3 + 2];
    const m = Math.max(r, g, b);
    const k = Math.min(1, Math.max(0, (m - 0.22) / 0.55));
    const gate = k * k;
    bright[i * 3] = toLin(r) * gate;
    bright[i * 3 + 1] = toLin(g) * gate;
    bright[i * 3 + 2] = toLin(b) * gate;
  }
  const { out: half, w2, h2 } = halve(bright, w, h);
  const layers = [[5, 0.5], [18, 0.5], [46, 0.35]];
  const acc = new Float32Array(w2 * h2 * 3);
  for (const [sigma, wt] of layers) {
    const bl = gaussian(half, w2, h2, sigma, 3);
    for (let i = 0; i < acc.length; i++) acc[i] += bl[i] * wt;
  }
  const bloom = upsample(acc, w2, h2, w, h);
  const margin = Math.round(Math.min(w, h) * 0.09);
  const edge = (v, size) => {
    const t = Math.max(0, Math.min(1, Math.min(v, size - 1 - v) / margin));
    return t * t * (3 - 2 * t);
  };
  for (let y = 0; y < h; y++) {
    const wy = edge(y, h);
    for (let x = 0; x < w; x++) {
      const win = edge(x, w) * wy;
      const i = (y * w + x) * 3;
      bloom[i] *= win;
      bloom[i + 1] *= win;
      bloom[i + 2] *= win;
    }
  }
  return bloom;
}

// image + bloom (both linear) -> premultiplied sRGB image whose alpha is widened to hold the spill
function applyBloom(img, bloom) {
  const { width: w, height: h } = img;
  const n = w * h;
  const rgb = new Float32Array(n * 3);
  const a = new Float32Array(n);
  const lin = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    let peak = 1;
    for (let c = 0; c < 3; c++) {
      lin[c] = toLin(img.rgb[i * 3 + c]) + Math.max(0, bloom[i * 3 + c] - 0.0006);
      if (lin[c] > peak) peak = lin[c];
    }
    // over 1.0, scale all channels together rather than clipping the strongest one, or gold drifts to lemon yellow
    let lum = 0;
    for (let c = 0; c < 3; c++) {
      const v = toSrgb(lin[c] / peak);
      rgb[i * 3 + c] = v;
      lum = Math.max(lum, v);
    }
    a[i] = Math.min(1, Math.max(img.a[i], lum < 0.03 ? 0 : lum));
  }
  return { width: w, height: h, rgb, a };
}

const scaled = (field, k) => field.map((v) => v * k);

const dither = () => Math.random() + Math.random() - 1;

function toRgba8(img) {
  const n = img.width * img.height;
  const buf = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    const a = img.a[i];
    for (let c = 0; c < 3; c++) {
      const straight = a > 1e-4 ? Math.min(1, img.rgb[i * 3 + c] / a) : 0;
      buf[i * 4 + c] = Math.max(0, Math.min(255, Math.round(straight * 255 + dither() * 0.7)));
    }
    buf[i * 4 + 3] = Math.max(0, Math.min(255, Math.round(a * 255 + dither() * 0.5)));
  }
  return buf;
}

async function save(buf, channels, w, h, name, opts) {
  for (const [suffix, width] of WIDTHS) {
    const file = path.join(OUT, `${name}-${suffix}.webp`);
    const height = Math.round((h * width) / w);
    await sharp(buf, { raw: { width: w, height: h, channels } })
      .resize({ width, height, kernel: "lanczos3" })
      .webp(opts)
      .toFile(file);
    console.log(path.relative(process.cwd(), file), (fs.statSync(file).size / 1024).toFixed(0) + " KB");
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  // Quiet at rest, brighter on the lit hub, so the glow reads as the hub switching on.
  const restGlow = P.rest;
  const litGlow = P.lit;
  const baseRaw = await load("base");
  const { width: w, height: h } = baseRaw;
  const restField = scaled(bloomField(baseRaw), restGlow);
  const base = applyBloom(baseRaw, restField);
  await save(toRgba8(base), 4, w, h, `${P.prefix}-base`, { quality: 86, alphaQuality: 92, effort: 6, smartSubsample: false });

  const n = w * h;
  for (let k = 0; k < HUBS; k++) {
    const litRaw = await load(String(k));
    // what this hub adds to the resting image, so noise between two renders never becomes a layer
    const delta = { width: w, height: h, a: litRaw.a, rgb: new Float32Array(n * 3) };
    for (let i = 0; i < n * 3; i++) delta.rgb[i] = Math.max(0, litRaw.rgb[i] - baseRaw.rgb[i]);
    const extra = scaled(bloomField(delta), litGlow);
    const field = restField.map((v, i) => v + extra[i]);
    const lit = applyBloom(litRaw, field);
    const buf = Buffer.alloc(n * 4);
    for (let i = 0; i < n; i++) {
      // premultiplied values on black: P_lit = P_ov + P_base * (1 - a_ov)
      let d = 0;
      for (let c = 0; c < 3; c++) d = Math.max(d, lit.rgb[i * 3 + c] - base.rgb[i * 3 + c]);
      const aOv = d < 0.012 ? 0 : Math.min(1, d);
      if (aOv === 0) continue; // stays fully transparent
      for (let c = 0; c < 3; c++) {
        const pOv = Math.max(0, Math.min(aOv, lit.rgb[i * 3 + c] - base.rgb[i * 3 + c] * (1 - aOv)));
        buf[i * 4 + c] = Math.max(0, Math.min(255, Math.round((pOv / aOv) * 255 + dither() * 0.6)));
      }
      buf[i * 4 + 3] = Math.max(1, Math.min(255, Math.round(aOv * 255)));
    }
    await save(buf, 4, w, h, `${P.prefix}-glow-${k}`, { quality: 80, alphaQuality: 88, effort: 6, smartSubsample: false, exact: false });
  }
})();
