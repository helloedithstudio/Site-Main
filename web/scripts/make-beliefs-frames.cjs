// Turns the raw Blender renders of the Beliefs sequence into the WebP frames the page loads.
//
//   node scripts/make-beliefs-frames.cjs [rawDir] [outDir]
//
// Reads blender/work/beliefs/raw_NNNN.png (RGBA, transparent film, from blender/scripts/beliefs_orbit.py), flattens each
// onto pure black (the page is #000, so the frame edge must be invisible), adds a soft bloom (Cycles has none, and the
// glyph and edge lights need it to look lit), and writes public/images/beliefs/frame_NNNN.webp.
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const RAW = path.resolve(process.argv[2] || path.join(ROOT, "..", "blender", "work", "beliefs"));
const OUT = path.resolve(process.argv[3] || path.join(ROOT, "public", "images", "beliefs"));
const QUALITY = 80;

// Bloom: keep only what is bright, blur it at two radii, add it back with "screen" so it can only brighten.
const THRESHOLD = 0.42; // fraction of full white below which nothing blooms
const GAIN = 2.4;
const TIGHT = { sigma: 7, strength: 0.55 };
const WIDE = { sigma: 26, strength: 0.4 };

async function frame(file, outFile) {
  const flat = await sharp(file).flatten({ background: "#000000" }).removeAlpha().toColourspace("srgb").png().toBuffer();
  const bright = await sharp(flat).linear(GAIN, -THRESHOLD * GAIN * 255).png().toBuffer();
  const tight = await sharp(bright).blur(TIGHT.sigma).linear(TIGHT.strength, 0).png().toBuffer();
  const wide = await sharp(bright).blur(WIDE.sigma).linear(WIDE.strength, 0).png().toBuffer();
  await sharp(flat)
    .composite([
      { input: tight, blend: "screen" },
      { input: wide, blend: "screen" },
    ])
    .webp({ quality: QUALITY, effort: 5 })
    .toFile(outFile);
}

(async () => {
  const files = fs.readdirSync(RAW).filter((f) => /^raw_\d+\.png$/.test(f)).sort();
  if (!files.length) {
    console.error(`no raw_NNNN.png frames in ${RAW}. Render them first: blender -b --factory-startup -P blender/scripts/beliefs_orbit.py -- final all`);
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });
  let bytes = 0;
  for (const f of files) {
    const n = f.match(/raw_(\d+)\.png/)[1];
    const outFile = path.join(OUT, `frame_${n}.webp`);
    await frame(path.join(RAW, f), outFile);
    bytes += fs.statSync(outFile).size;
  }
  console.log(`${files.length} frames -> ${OUT}, ${(bytes / 1024 / 1024).toFixed(2)} MB total`);
})();
