// Stand-in frames for the two Showcase films, so the page can be wired and tested before the Blender renders exist.
// Each frame shows the shot's beat name, the frame number and where the monolith will sit, at the real sizes and counts
// of the asset contract (docs/showcase/asset-session-prompt.md, section 4).
//
//   node scripts/make-showcase-placeholders.cjs
//
// Frames go to public/showcase/_placeholder/ (git ignores it, so stand-ins can never ship). lib/showcase.media.json is
// written with "placeholder": true; scripts/make-showcase-media.cjs replaces both when the real renders arrive.
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const WEB = path.resolve(__dirname, "..");
const ROOT = path.join(WEB, "public", "showcase", "_placeholder");
const MEDIA = path.join(WEB, "lib", "showcase.media.json");

// Frame counts and beats come from the asset prompt. The hold is where the page hands over to the live scene.
const FILMS = {
  ignition: {
    hold: 161 / 180,
    beats: [
      [0, "Spark"],
      [25 / 180, "Contact"],
      [61 / 180, "Ignite"],
      [106 / 180, "Reveal"],
      [141 / 180, "Rise"],
      [161 / 180, "Hold"],
    ],
    variants: { desktop: { w: 1920, h: 1080, count: 180 }, portrait: { w: 1080, h: 1920, count: 150 } },
  },
  exploded: {
    hold: 106 / 120,
    beats: [
      [0, "Front view"],
      [21 / 120, "Separate"],
      [81 / 120, "Drift"],
      [106 / 120, "Hold"],
    ],
    variants: { desktop: { w: 1920, h: 1080, count: 120 }, portrait: { w: 1080, h: 1920, count: 100 } },
  },
};

const pad = (n) => String(n).padStart(4, "0");
const beatAt = (beats, t) => beats.filter(([at]) => t >= at - 1e-9).pop()[1];

function svg(shot, film, v, i) {
  const t = i / (v.count - 1);
  const portrait = v.h > v.w;
  // The monolith's place in the final composition: right of centre on desktop, centred low on portrait.
  const mh = v.h * (portrait ? 0.5 : 0.7);
  const mw = mh * (1.2 / 2.6);
  const cx = portrait ? v.w / 2 : v.w * 0.64;
  const top = portrait ? v.h * 0.42 : (v.h - mh) / 2 + v.h * 0.04;
  const settle = Math.min(1, Math.max(0, (t - 0.55) / 0.35));
  const exploded = shot === "exploded" ? Math.min(1, Math.max(0, (t - 21 / 120) / (60 / 120))) : 0;
  const spark = shot === "ignition" && t < 0.34 ? `<circle cx="${cx}" cy="${v.h * 0.08 + (top - v.h * 0.08) * Math.min(1, t / 0.33)}" r="${v.w * 0.006}" fill="#D64238"/>` : "";
  const glow = shot === "ignition" ? Math.min(1, Math.max(0, (t - 0.14) / 0.45)) : 0.6;
  const layers = [0, 1, 2, 3]
    .map((k) => {
      const dx = exploded * k * mw * 0.28;
      const op = k === 0 ? 0.9 : 0.35;
      return `<rect x="${cx - mw / 2 + dx}" y="${top - dx * 0.25}" width="${mw}" height="${mh}" rx="${mw * 0.02}" fill="none" stroke="rgba(236,231,224,${op})" stroke-width="2"/>`;
    })
    .join("");
  const label = `${shot} / ${beatAt(film.beats, t)} / frame ${i + 1} of ${v.count}`;
  const fs1 = Math.round(v.w * (portrait ? 0.03 : 0.014));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${v.w}" height="${v.h}">
  <rect width="100%" height="100%" fill="#000"/>
  <radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#F70C5A" stop-opacity="${0.22 * glow}"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  <circle cx="${cx}" cy="${top + mh / 2}" r="${mh * (0.55 + 0.1 * settle)}" fill="url(#g)"/>
  ${layers}
  ${spark}
  <text x="${v.w * 0.04}" y="${v.h - v.h * 0.05}" fill="rgba(236,231,224,.55)" font-family="Consolas, monospace" font-size="${fs1}">PLACEHOLDER  ${label}</text>
</svg>`;
}

(async () => {
  fs.rmSync(ROOT, { recursive: true, force: true });
  const media = { placeholder: true, films: {} };
  for (const [shot, film] of Object.entries(FILMS)) {
    media.films[shot] = { hold: film.hold, variants: {} };
    for (const [name, v] of Object.entries(film.variants)) {
      const dir = path.join(ROOT, shot, name);
      fs.mkdirSync(dir, { recursive: true });
      for (let i = 0; i < v.count; i++) {
        await sharp(Buffer.from(svg(shot, film, v, i))).webp({ quality: 70 }).toFile(path.join(dir, `f_${pad(i + 1)}.webp`));
      }
      media.films[shot].variants[name] = {
        w: v.w,
        h: v.h,
        count: v.count,
        path: `/showcase/_placeholder/${shot}/${name}/f_{n}.webp`,
        poster: `/showcase/_placeholder/${shot}/${name}/f_${pad(Math.round(film.hold * (v.count - 1)) + 1)}.webp`,
      };
      console.log(`${shot}/${name}: ${v.count} frames`);
    }
  }
  fs.writeFileSync(MEDIA, JSON.stringify(media, null, 2) + "\n");
  console.log(`wrote ${path.relative(WEB, MEDIA)}`);
})();
