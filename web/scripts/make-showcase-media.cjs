// Turns the Blender session's raw renders into what the Showcase page loads, and checks them against the budgets.
//
//   node scripts/make-showcase-media.cjs            films and posters (frames from ../blender/work/showcase/films)
//   node scripts/make-showcase-media.cjs --loops    also encode the exhibit loops (needs ffmpeg, see below)
//
// Films: raw_NNNN.png per frame (16-bit, on black) in films/<shot>/<desktop|portrait>/, as the asset prompt
// (docs/showcase/asset-session-prompt.md, section 4) describes. Each shot becomes three cuts:
//   desktop-2560  2560 x 1440 (large, high-density screens)
//   desktop-1920  1920 x 1080
//   portrait      1080 x 1920 (phones)
// as WebP frames in public/showcase/films/<shot>/<cut>/f_NNNN.webp. If a cut is over its budget the quality steps down
// until it fits; if it still does not fit at the lowest quality the script stops and says so.
//
// Loops: blender/work/showcase/works/<slug>/frame_NNNN.png (from scripts/capture-exhibit.py) become
// public/showcase/works/<slug>/{loop.webm, loop.mp4, poster.webp}. ffmpeg is looked for at D:\tools\ffmpeg\bin, then on
// PATH; it must be a full build (libsvtav1 and libx264).
//
// Writes lib/showcase.media.json (read by the page), replacing the stand-in list from make-showcase-placeholders.cjs.
const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const sharp = require("sharp");

const WEB = path.resolve(__dirname, "..");
// (the environment overrides exist for dry runs into scratch folders)
const WORK = process.env.SHOWCASE_WORK || path.resolve(WEB, "..", "blender", "work", "showcase");
const PUB = process.env.SHOWCASE_PUB || path.join(WEB, "public", "showcase");
const MEDIA = process.env.SHOWCASE_MEDIA || path.join(WEB, "lib", "showcase.media.json");
const WORKS_JSON = process.env.SHOWCASE_WORKS || path.join(WEB, "lib", "showcase.works.json");

// The contract: frame counts and where the hold starts (the frame the page hands over to the live scene).
const SHOTS = {
  ignition: { hold: 161 / 180, frames: { desktop: 180, portrait: 150 } },
  exploded: { hold: 106 / 120, frames: { desktop: 120, portrait: 100 } },
};
const CUTS = [
  { name: "desktop-2560", from: "desktop", w: 2560, h: 1440, budget: { ignition: 11e6, exploded: 6e6 } },
  { name: "desktop-1920", from: "desktop", w: 1920, h: 1080, budget: { ignition: 7e6, exploded: 4e6 } },
  { name: "portrait", from: "portrait", w: 1080, h: 1920, budget: { ignition: 5e6, exploded: 3e6 } },
];
const QUALITIES = [80, 74, 68, 62, 56];
const LOOP_BUDGET = 1.5e6;

const pad = (n) => String(n).padStart(4, "0");
const mb = (b) => `${(b / 1e6).toFixed(2)} MB`;

function rawFrames(shot, variant) {
  const dir = path.join(WORK, "films", shot, variant);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^raw_\d+\.png$/.test(f))
    .sort()
    .map((f) => path.join(dir, f));
}

async function encodeCut(files, cut, quality, outDir) {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  let total = 0;
  for (let i = 0; i < files.length; i++) {
    const out = path.join(outDir, `f_${pad(i + 1)}.webp`);
    const info = await sharp(files[i])
      .resize(cut.w, cut.h, { fit: "cover" })
      .flatten({ background: "#000000" })
      .toColourspace("srgb")
      .webp({ quality, effort: 5, smartSubsample: true })
      .toFile(out);
    total += info.size;
  }
  return total;
}

async function films() {
  const media = { placeholder: false, films: {} };
  let complete = true;
  for (const [shot, spec] of Object.entries(SHOTS)) {
    media.films[shot] = { hold: spec.hold, variants: {} };
    for (const cut of CUTS) {
      const files = rawFrames(shot, cut.from);
      if (!files.length) {
        console.log(`${shot}/${cut.name}: no raw frames in films/${shot}/${cut.from} yet`);
        complete = false;
        continue;
      }
      const expected = spec.frames[cut.from];
      if (files.length !== expected) console.warn(`${shot}/${cut.from}: ${files.length} frames (the contract says ${expected}); using what is there`);
      const meta = await sharp(files[0]).metadata();
      if (meta.width * cut.h !== meta.height * cut.w) console.warn(`${shot}/${cut.from}: raw frames are ${meta.width}x${meta.height}, not ${cut.w}:${cut.h}; they are cropped to fit`);
      const outDir = path.join(PUB, "films", shot, cut.name);
      const budget = cut.budget[shot];
      let size = 0;
      let used = 0;
      for (const q of QUALITIES) {
        size = await encodeCut(files, cut, q, outDir);
        used = q;
        if (size <= budget) break;
        console.log(`${shot}/${cut.name}: ${mb(size)} at quality ${q} is over ${mb(budget)}, stepping down`);
      }
      if (size > budget) throw new Error(`${shot}/${cut.name} is ${mb(size)} even at quality ${used}; over its ${mb(budget)} budget. Ask the asset session for darker, calmer frames or fewer of them.`);
      const holdFrame = Math.round(spec.hold * (files.length - 1));
      media.films[shot].variants[cut.name] = {
        w: cut.w,
        h: cut.h,
        count: files.length,
        path: `/showcase/films/${shot}/${cut.name}/f_{n}.webp`,
        poster: `/showcase/films/${shot}/${cut.name}/f_${pad(holdFrame + 1)}.webp`,
      };
      console.log(`${shot}/${cut.name}: ${files.length} frames, ${mb(size)} at quality ${used} (budget ${mb(budget)})`);
    }
  }
  if (!complete) {
    console.log("\nNot every cut has frames yet, so lib/showcase.media.json was left as it is (the page keeps its stand-ins).");
    return;
  }
  fs.writeFileSync(MEDIA, JSON.stringify(media, null, 2) + "\n");
  console.log(`\nwrote ${path.relative(WEB, MEDIA)}`);
}

function findFfmpeg() {
  const local = "D:\\tools\\ffmpeg\\bin\\ffmpeg.exe";
  const candidates = fs.existsSync(local) ? [local] : [];
  candidates.push("ffmpeg");
  for (const c of candidates) {
    const r = spawnSync(c, ["-hide_banner", "-encoders"], { encoding: "utf8" });
    if (r.status === 0 && /libsvtav1/.test(r.stdout) && /libx264/.test(r.stdout)) return c;
  }
  return null;
}

async function loops() {
  const ff = findFfmpeg();
  if (!ff) throw new Error("no full ffmpeg found (needs libsvtav1 and libx264): unpack the gyan.dev full build into D:\\tools\\ffmpeg");
  const root = path.join(WORK, "works");
  const works = fs.existsSync(WORKS_JSON) ? JSON.parse(fs.readFileSync(WORKS_JSON, "utf8")) : {};
  for (const slug of fs.existsSync(root) ? fs.readdirSync(root) : []) {
    const dir = path.join(root, slug);
    const frames = fs.readdirSync(dir).filter((f) => /^frame_\d+\.png$/.test(f)).sort();
    if (frames.length < 30) continue;
    const out = path.join(PUB, "works", slug);
    fs.mkdirSync(out, { recursive: true });
    const input = ["-y", "-hide_banner", "-loglevel", "error", "-framerate", "30", "-i", path.join(dir, "frame_%04d.png")];
    const scale = ["-vf", "scale=1280:-2:flags=lanczos,format=yuv420p", "-an"];
    execFileSync(ff, [...input, ...scale, "-c:v", "libsvtav1", "-crf", "38", "-preset", "5", "-g", "60", path.join(out, "loop.webm")]);
    execFileSync(ff, [...input, ...scale, "-c:v", "libx264", "-crf", "24", "-preset", "slow", "-profile:v", "high", "-movflags", "+faststart", path.join(out, "loop.mp4")]);
    await sharp(path.join(dir, frames[Math.floor(frames.length / 3)])).resize(1280).webp({ quality: 80 }).toFile(path.join(out, "poster.webp"));
    const sizes = ["loop.webm", "loop.mp4"].map((f) => fs.statSync(path.join(out, f)).size);
    for (const [f, s] of [["loop.webm", sizes[0]], ["loop.mp4", sizes[1]]]) {
      if (s > LOOP_BUDGET) throw new Error(`${slug}/${f} is ${mb(s)}, over the ${mb(LOOP_BUDGET)} budget; capture a shorter or calmer loop`);
    }
    works[slug] = { poster: `/showcase/works/${slug}/poster.webp`, webm: `/showcase/works/${slug}/loop.webm`, mp4: `/showcase/works/${slug}/loop.mp4` };
    console.log(`${slug}: ${frames.length} frames, webm ${mb(sizes[0])}, mp4 ${mb(sizes[1])}`);
  }
  fs.writeFileSync(WORKS_JSON, JSON.stringify(works, null, 2) + "\n");
  console.log(`wrote ${path.relative(WEB, WORKS_JSON)}`);
}

(async () => {
  await films();
  if (process.argv.includes("--loops")) await loops();
})().catch((e) => {
  console.error(`make-showcase-media: ${e.message}`);
  process.exit(1);
});
