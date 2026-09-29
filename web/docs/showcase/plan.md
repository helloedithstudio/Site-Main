# edith Showcase: "Don't take our word for it"

An immersive `/showcase` page that edith members send to leads and clients. The page proves the craft by being the
craft.

Status (25 Sep 2026): direction agreed. Kevin runs a second Claude session for the Blender renders (Part B holds its
paste-ready prompt); this session builds everything else (Part A). This replaces the flat design in
`web/docs/superpowers/specs/2026-09-24-showcase-page-design.md` (its data model and honesty rules carry over).

## Context

Kevin wants the page a Maintainer sends when pitching a client to be unforgettable, curiosity-building, and to let the
site speak for itself, with Apple's MacBook Pro page as the benchmark. He wants the best output regardless of tool, is
powering up Blender, and is cleaning drive C: (it had 204 MB free), so **all asset work must stay on D:**.

| Decision | Answer |
| --- | --- |
| Day-one exhibits | edith's own real builds: 01 this website, 02 the Catalyst join flow with Friday; then three sealed "reserved" slots |
| Pitch links | Signed "from + for" links ("Kevin Andrew prepared this for Acme"), and the final button books that Maintainer |
| Sound | Opt-in, generated in code (Web Audio), off by default |
| 3D tool | **Blender 5.2.2 (Cycles, OptiX) at full quality.** Unreal adds nothing a web page can use: it only outputs video, the laptop is below Epic's spec (16 GB RAM vs 32, 6 GB VRAM vs 8+), and only Blender also produces the live GLB from the same scene, which the film-to-live handoff depends on. |
| Films vs live | Two pre-rendered films (Ignition, Exploded) at 2560 masters; everything that must respond or change (hall, closer look, X-ray, finale) is live, so adding a work never needs a re-render |

Constraints: pitch-black site, Saffron palette (gold `#FFBC09`, marble ramp `#FEAF01 #FF8301 #F70C5A #E803D1`, cream,
14% white hairlines, red `#D64238` only for the spark and logo dot). No em or en dashes in visible copy, British spelling,
nothing invented, no token or crypto language, Apple is composition and motion only, no stock imagery, no text inside renders.

## Research (checked 24 Sep 2026)

| Reference | Taken |
| --- | --- |
| Apple MacBook Pro | Chapter rhythm (hero film, highlights, "Take a closer look" viewer with tabs, deep chapters, the ask); scroll animations as pre-rendered frame sequences on canvas; exploded product views |
| Iventions (SOTD, CSSDA WOTY finalist 2025) | Each project as a spotlit installation in one scene; reveals paced as a guided walk-through |
| Hubtown, Unseen Studio (SOTD Jun 2026) | A 3D monolith hero with mouse reveal over a reflective backdrop |
| Cartier Watches & Wonders, Immersive Garden | One alcove per product, Lenis, a Web Audio score |
| Igloo Inc (Site of the Year 2024) | Blender and Houdini to web, aggressive compression, background shader compile, sound synced to motion |
| Utsubo, best Three.js sites 2026 | "Commit to one hard idea and budget everything around it" |

**The one hard idea: a film that turns live.** The visitor watches a cinematic render, then discovers it now answers
their cursor. It happens twice (the opening and "Under the hood"), and the page ends by opening its own hood.

---

# Part A: the experience and the web build (this session)

## A1. Chapters (about 22 to 26 screens on desktop)

The signature object is **the Monolith**: a standing slab of the home hero's own black marble (`marble.jpg`) whose veins
glow through the hero colour field (`colorA.jpg`), with a 16:10 display window and a brushed gold seam. It is lit by the
red spark of the logo's dot: the Catalyst.

| # | Chapter | What happens | Made with |
| --- | --- | --- | --- |
| 0 | Arrival | Pitch black, one breathing red point. On a pitch link: "Kevin Andrew prepared this for Acme." | CSS and canvas |
| 1 | Ignition | Scroll drives the film: the spark falls onto raw stone, veins ignite, the shell burns away, the polished monolith rises and turns to camera. During the final hold the headline lands: **"Don't take our word for it."** / "Everything here was designed and built by edith. So was this page." | Blender film, desktop and portrait cuts |
| 2 | Handoff | The film dissolves into the live scene at the identical camera. Veins and a rim light follow the cursor (drag on touch). Caption: "This stopped being a video a second ago. Move your cursor." | Live Three.js |
| 3 | The Hall | The camera glides from that monolith (it is **Exhibit 01, this website**, "You are here") along a row: **Exhibit 02, the Catalyst join flow and Friday**, then **three sealed monoliths**, "Reserved for the first member launch". Each lights at centre; its window plays a real loop of the product. The HTML plaque shows the title, one line, builders' avatars, stack chips, and "Open live" and "Source". | Live, data-driven |
| 4 | Take a closer look | An Apple-style viewer: drag to turn, with tabs The brief / How it's built / What shipped. Only real artefacts: a clip, a real code excerpt, measured numbers. It deep-links as `#exhibit-01`. | Live and HTML |
| 5 | Under the hood | The **Exploded film**: the monolith separates into its layers (glass, display, seam, stone) in an Apple exploded view, then hands off to the **live X-ray**. Scroll steps wireframe, normals, lighting, final, and the layout grid draws over the page. Live readouts measured in the visitor's browser: fps, triangles, draw calls, load time, bytes. Build facts from git: commits, days. | Blender film, then live |
| 6 | The people | The Maintainers from `lib/legion.ts` | HTML (`PersonBits`) |
| 7 | Resolve | The camera pulls back along the real row (always the true exhibit count), the spark rises, the seams light in sequence. The ask: "Kevin Andrew prepared this for Acme. Let's build yours." with **Book a call with Kevin** and email. Without a link: **Book a call**, with "Become a Catalyst" as a quiet second link. | Live and HTML |

All copy is a draft for Kevin to edit. It contains no dashes, and every claim is true. Header on `/showcase`: the
existing push behaviour (hidden during Ignition), the button reads **Book a call**, and the nav becomes The Legion,
Showcase, Docs.

## A2. Architecture

Rule: **pre-render what must look impossible, render live what must respond or change.** Both come from the same
Blender scene, with shared cameras (`cameras.json`) and material values (`look.json`).

Reuse, nothing rebuilt:

| Need | Existing code |
| --- | --- |
| Engine, loop, resize, mouse | `lib/gl/Engine.ts`, `lib/gl/core.ts` |
| GLB and KTX2 loading | `lib/gl/resources.ts` (add `setMeshoptDecoder`) |
| Scroll-scrubbed frames (progressive passes, nearest frame, crossfade, slow-connection guard) | `components/sections/Beliefs.tsx`, lines 34 to 189, **extracted** to `lib/runtime/frameSequence.ts`; Beliefs moves onto it unchanged |
| Lenis, ScrollTrigger, SplitText | `lib/runtime/scroll.ts`, `lib/runtime/gsap` |
| Header push and hero hand-over | `components/HeaderNav.tsx` (`measureHeroEnd` reads `[data-hero]`) |
| People | `lib/people.ts`, `lib/github.ts` (`resolvePeople`, `safeUrl`, `normaliseLogin`), `components/ui/PersonBits.tsx` |
| Shell, chips, tokens | `.hb-main`, `.hb-bg` (styles/docs.css), `.cat__chip` (styles/legion.css), `--ease-*`, `.edith-gradword`, `.edith-lit` (styles/edith.css) |

New or changed (web):

| File | Purpose |
| --- | --- |
| `app/showcase/page.tsx` | Static server component: metadata, JSON-LD (`CreativeWork` per exhibit), resolves authors and Maintainers |
| `components/showcase/*` | `Arrival`, `FilmChapter`, `Hall`, `CloserLook`, `UnderTheHood`, `People`, `Resolve`, `SoundToggle` |
| `lib/showcase.ts` | Exhibits plus `validateExhibits`, `orderExhibits` (the earlier spec's model plus `media`, `closer`, `status: live \| reserved`) |
| `lib/showcase.media.json` | Written by the media script: frame counts and sizes per film variant, GL paths. The page reads it, so re-renders need no code change. |
| `lib/gl/scenes.ts` | `ShowcaseScene` with its own perspective camera, hall, video textures, two handoff poses, X-ray passes, finale. `Engine.#buildScene` picks it for `page === "showcase"`. |
| `lib/gl/manifest.ts` | `manifestFor(page)`, so each page loads only its own assets (`GlPreload` too) |
| `lib/gl/post.ts` | Bloom, AgX tone mapping, grain (`postprocessing`, already installed), high tier only |
| `lib/runtime/frameSequence.ts` | The extracted scrubber, plus a windowed ImageBitmap cache so phones stay within memory |
| `lib/runtime/tier.ts` | `high` / `mid` / `low` from WebGL2, device memory, cores, save-data, connection, reduced motion and a one-second frame probe; `?tier=` overrides |
| `lib/runtime/sound.ts` | The Web Audio soundscape |
| `lib/pitch.ts`, `app/api/pitch/route.ts`, `scripts/pitch-link.ts` | Signed pitch links |
| `lib/legion.ts` | Maintainers gain an optional `booking` URL (Kevin: `brand.booking`) |
| `scripts/build-facts.cjs` | `lib/showcase.build.json` from git at prebuild; it keeps the committed file on shallow clones |
| `scripts/make-showcase-media.cjs` | Raw renders to web frames (sharp: AVIF plus WebP fallback), work loops (ffmpeg), budgets, media JSON |
| `lib/content.ts`, `app/sitemap.ts`, `components/Header.tsx` | Nav, footer, sitemap, `heroPages = ["/", "/showcase"]`, per-page button label |
| `styles/showcase.css` | `.sc-*` only |

Tiers (identical HTML content on every tier):

| Tier | What they get |
| --- | --- |
| high | Films at 2560 or 1920 wide (portrait 1080x1920), live scene at DPR up to 2 with bloom, video textures |
| mid | Portrait or 1920 films, live scene at DPR 1 with no post effects, posters on sealed monoliths |
| low, and reduced motion | No pinning or scrubbing. Poster stills, the hall as a readable list, the X-ray readouts as numbers |

Budgets (enforced by the media script and the tests): **600 KB** extra before the first film frame. Ignition: 1920
wide ≤ 7 MB, 2560 ≤ 11 MB, portrait ≤ 5 MB. Exploded: 1920 ≤ 4 MB, 2560 ≤ 6 MB, portrait ≤ 3 MB. Live scene ≤ 3 MB.
Each work loop ≤ 1.5 MB. Everything streams coarse to fine by proximity. 60 fps on Kevin's RTX laptop. Only web outputs
enter git; masters stay in `blender/work/showcase/` (already git-ignored).

## A3. The two handoffs (seamless by construction)

1. Each film's last frames hold the camera still at `cam_handoff` or `cam_xray`. Those values come from `cameras.json`,
   read from a real glTF export.
2. The live scene starts from exactly that pose with the `look.json` values: vein strength, seam glow, and the exploded
   offsets from `exploded.json`.
3. AgX at both ends (Blender view transform, three.js `AgXToneMapping`), and frames are flattened on pure black.
4. The crossfade (about 400 ms, `--ease-out`) runs inside the hold.
5. QA gate: a Playwright capture of the live scene compared with the film's last frame (sharp). Mean difference must be
   under 3% for all four variants.

## A4. Signed pitch links

- **Making a link:** `npx tsx scripts/pitch-link.ts --from Andrew-Kevin-007 --for "Acme Ltd" --days 60` prints
  `/showcase?p=<token>`.
- **The token:** base64url `{v, from, for, exp}` plus an HMAC-SHA256 made with `PITCH_LINK_SECRET` (Vercel and
  `.env.local` only).
- **Verification:** the page stays static; the client calls `/api/pitch`, which checks the signature
  (`timingSafeEqual`) and the expiry, and that `from` is a Maintainer. It returns name, avatar, booking and `for` with
  `Cache-Control: private, no-store`.
- **Safety:** `for` is limited to 60 safe characters and rendered as text. Bad tokens fall back to the normal page
  silently, and the canonical URL stays `/showcase`.

## A5. Sound (opt-in)

- **What plays:** a detuned pad through a slow low-pass filter, soft noise air, and cues: a glass tick when an exhibit
  lights, a swell at each handoff, a low bloom at Resolve. Zero audio files.
- **How it behaves:** a "Sound" toggle (`aria-pressed`) sits in the page corner. It fades over 600 ms, suspends when the
  tab is hidden, and the choice is remembered in `localStorage` (try/catch).

## A6. Day-one content (all real, captured by this session)

| Exhibit | Window loop | Closer look |
| --- | --- | --- |
| 01 This website | 10 s capture of the live home page (headed Chrome on the real GPU, a screenshot every frame at 30 fps, then ffmpeg to AV1 WebM plus H.264 MP4 plus poster) | the stack, live page weight measured at build, git facts, one real code excerpt |
| 02 Join flow and Friday | capture of `/join` against a local fake Discord and GitHub, plus Kevin's real screenshot of Friday's welcome DM | one-person-one-entry design, 42 unit checks, the sweep's safety rules |
| Reserved x3 | sealed face | "Reserved for the first member launch. Ship something in `ship-it` and it could stand here." |

## A7. Build order (this session, starting in parallel with the renders)

1. Commit the finished header push work (with Kevin's OK). Save the prompt as `web/docs/showcase/asset-session-prompt.md`
   (its section 4 is the contract between the two sessions).
2. Skeleton: route, data, tiers, all chapters as HTML with the complete low-tier layout. Synthetic placeholder frames
   (numbered, correct sizes) so the films can be wired before any render exists.
3. `frameSequence.ts` extraction, Beliefs moved onto it and re-tested; both films wired to placeholders, then to the
   greybox renders.
4. `ShowcaseScene` with a stand-in monolith at the true proportions: hall, camera path, video textures, cursor response,
   handoff.
5. Closer look; Under the hood (passes, readouts, build facts).
6. Pitch links; sound.
7. Final assets swapped in (GLB compressed with Meshopt, textures to KTX2), handoff QA gate, tuning.
8. QA (A8), an optional jarvis audit against the elite bar, and Kevin's phone test.

GPU sharing: while Blender renders, my browser checks use software WebGL. Real-GPU checks and captures run between
render chunks, so neither job runs out of the 6 GB VRAM.

## A8. Verification

- `npx tsx scripts/showcase-test.ts`:
  - exhibit validation;
  - pitch tokens: valid, tampered, expired, unknown Maintainer, oversized `for`;
  - `for` sanitising;
  - the media JSON matches the files on disk.
- `tsc`, `eslint`, `npm run build`; `join-test.ts` still passes.
- Playwright at 1440x900 and 390x844 with tiers forced:
  - frames advance with scroll, and both handoffs complete with the canvas visible;
  - exhibits activate in order;
  - `#exhibit-01` opens the closer look;
  - X-ray readouts are numbers;
  - a signed link greets by name and books the right person, while a forged one falls back;
  - reduced motion and the low tier show all the content;
  - no U+2013 or U+2014, no horizontal scroll, no console errors, budgets met.
- Real GPU in headed Chrome: 60 fps scrubbing the hall, at least 50 with 4x CPU throttle. Handoff difference under 3%.
- Kevin: one pass on his phone, and one pitch link opened from WhatsApp.

---

# Part B: the asset session (Kevin runs it; paste-ready)

## B1. Start it on D: (so even Claude's own temp files avoid C:)

In a new PowerShell window:

```powershell
New-Item -ItemType Directory -Force D:\tmp, D:\tools | Out-Null
$env:TEMP = 'D:\tmp'; $env:TMP = 'D:\tmp'
Set-Location D:\page_content
claude
```

Then type `/model opus` (best quality), and paste the prompt in B2. Keep the laptop plugged in and set to not sleep
while it renders.

## B2. The prompt

```text
You are the 3D asset lead for the edith website's new Showcase page. You produce film-quality Blender renders and the
real-time 3D assets that go with them. A separate Claude session (the "web session") builds the page and integrates
everything you deliver. The goal is the best possible quality. Quality is the constraint, not time.

== 0. HARD RULES ==
1. Drive C: is being cleaned and is nearly full. NEVER write anything to C:. Every file, cache, temp file, download
   and install goes on D:.
   - First create D:\tools\env.ps1 containing these lines, and dot-source it (. D:\tools\env.ps1) at the start of
     every PowerShell command that runs Blender, ffmpeg, node or python:
       $env:TEMP='D:\tmp'; $env:TMP='D:\tmp'
       $env:npm_config_cache='D:\tmp\npm-cache'; $env:PIP_CACHE_DIR='D:\tmp\pip-cache'; $env:PYTHONUSERBASE='D:\tools\py'
       $env:CUDA_CACHE_PATH='D:\tmp\cuda-cache'; $env:OPTIX_CACHE_PATH='D:\tmp\optix-cache'
       $env:BLENDER_USER_CONFIG='D:\tools\blender-user\config'; $env:BLENDER_USER_SCRIPTS='D:\tools\blender-user\scripts'
       $env:BLENDER_USER_DATAFILES='D:\tools\blender-user\datafiles'; $env:BLENDER_USER_EXTENSIONS='D:\tools\blender-user\extensions'
   - In every Blender script set bpy.context.preferences.filepaths.temporary_directory = r"D:\tmp".
   - No winget, choco or installers (they write to C:). Use portable zips unpacked into D:\tools\. If Python packages
     are needed, use Blender's bundled Python or pip install --target D:\tools\py.
   - Before any long job, confirm at least 60 GB free on D:, and log disk use in STATUS.md.
2. Your area is D:\page_content\blender\ (plus D:\tools\ and D:\tmp\). You may READ anything under
   D:\page_content\web\ but never create, edit or delete anything there; the web session owns it. No git commands
   that write (no add, commit, push). Do not install Unreal or any other engine.
3. Nothing fake and no text in renders: no lettering or numbers in any image (all page text is HTML), no logos, no
   Apple devices or likenesses, no stock photos. CC0 materials or HDRIs from Poly Haven or ambientCG are allowed but
   must never be visible as a background; the world stays pitch black.
4. Keep D:\page_content\blender\work\showcase\STATUS.md current: done, in progress, measured seconds per frame, file
   paths, sizes, anything off-spec and why. Report facts, never guesses.

== 1. CONTEXT AND QUALITY BAR ==
edith is a community of builders ("a legion of builders that runs itself") that also designs and builds for clients.
The site is pitch black with cream text, a gold accent, and a signature material: black marble whose veins glow.
Study these before building anything:
- D:\page_content\web\public\gl\images\hero\marble.jpg (4522x3015): the black marble with thin white veins from the
  home page. Use THIS texture as the monolith's stone and as the source of its vein mask. It is cleared for reuse.
- D:\page_content\web\public\gl\images\hero\colorA.jpg: the colour field the veins glow with on the home page (red,
  magenta, violet, orange, gold). Veins take their emission colour from this image.
- D:\page_content\.claude\design-intel\friday-apple-shots\ : screenshots of the current site (files named now-*).
- Brand colours: gold #FFBC09; marble ramp #FEAF01 #FF8301 #F70C5A #E803D1; red #D64238 (the spark only);
  cream #ECE7E0.
- D:\page_content\blender\scripts\lib.py: reuse its helpers (fresh, clean, bevel, unwrap, analyze, export_glb,
  glb_info). beliefs_orbit.py, hub_stack.py and ship_lineup.py show how Cycles scenes and the command line are set up
  here. Blender is D:\blender\blender.exe (5.2.2 LTS). Blender 5 changed some Python APIs (for example the compositor
  node tree); the existing scripts run on 5.2, so check them before writing 4.x-style code.
Quality bar: an Apple product film. Studio product lighting, flawless polished surfaces with clean gradient
reflections, crisp chamfer highlights, true deep blacks, restrained glow, a slow and confident camera. Not a game
render, not sci-fi: no lens flares, no chromatic aberration, no clutter.

== 2. THE OBJECT: THE MONOLITH ==
Build it procedurally in D:\page_content\blender\scripts\showcase_monolith.py.
- A standing slab 1.20 m wide x 2.60 m tall x 0.32 m deep, base on the floor at the origin, front face toward -Y
  (it becomes +Z in glTF, the house convention in lib.py). 3 mm chamfers on every edge (3 segments), watertight.
- body: polished black marble from marble.jpg (roughness about 0.08 to 0.14, subtly varied by the vein map;
  clearcoat about 0.25). Veins: an emission layer masked by the veins of marble.jpg (threshold its luminance), coloured
  by colorA.jpg mapped in object space (U across the slab width, V from floor 0 to top 1). Keep it low, so the veins
  read as light inside the stone, not neon.
- Display window on the front face: exactly 16:10, 1.00 m x 0.625 m, horizontally centred, top edge 0.30 m below
  the top of the slab, recessed 4 mm.
- Separate named objects: body, glass (black glass, IOR 1.5, roughness 0.02, sitting in the window), display (a flat
  plane just behind the glass, UVs exactly 0 to 1 over the 16:10 area, black; the web puts video on it), seam (a 2 mm
  inlay of physically based brushed gold, base colour about #F5C35B, metallic 1, roughness about 0.28, anisotropic,
  framing the window and running down the face to the floor, with a very thin emissive gold line #FFBC09 inside its
  groove that can be switched on).
- Sealed variant for reserved slots: same meshes; frosted glass (roughness about 0.35), display off, only the seam line
  faintly lit.
- Web export budget: body under 12k triangles, all parts together under 20k. Film renders may use a denser version
  (subdivision or adaptive displacement) if it looks better and VRAM allows.

== 3. LIGHT, CAMERA, RENDER ==
- World strength 0 (pitch-black background). Product-studio rig: two long strip softboxes (rectangle area lights,
  about 4:1) out of frame behind left and right for clean gradient reflections along the polished faces; one large
  soft top light; one small warm kicker for the gold seam. No light source ever visible in frame.
- Colour management: View Transform AgX, Look None, exposure 0. The live WebGL scene uses AgX, so never change this.
- Camera: physical, 35 to 50 mm, subtle depth of field (f/4 to f/8), MOTION BLUR OFF (every frame is shown as a still
  while the visitor scrolls), eased Bezier moves only, slow: under about 1 percent of frame width of apparent motion
  per frame.
- Final renders: Cycles on OptiX; adaptive sampling (noise threshold 0.005, min 64, max 1024; raise max if a shot
  needs it); OIDN on the GPU with albedo and normal passes, prefilter Accurate; FIXED seed (animated seed off) for
  temporal stability; a blue-noise sampling pattern if the build offers one; caustics off unless they visibly help.
  Output 16-bit PNG plus a multilayer EXR master per frame. Compositor: a restrained Glare node in Bloom mode for the
  veins and the spark. Always on pure black.
- Composition: desktop 16:9 puts the monolith right of centre at about 70 percent of frame height, with the left 45
  percent quiet dark space for the HTML headline. Portrait 9:16 centres it in the lower 60 percent, with the top 35
  percent quiet.

== 4. DELIVERABLES (all under D:\page_content\blender\work\showcase\, which git ignores) ==
Scripts: D:\page_content\blender\scripts\showcase_*.py, following the existing pattern
  blender -b --factory-startup -P script.py -- preview|final <range> size=WxH samples=N
and resumable (skip frames already on disk). Keep every scene as a .blend in work\showcase\blend\.

- lookdev\                         3 stills at 2560x1440, plus notes.md
- films\ignition\desktop\          raw_NNNN.png, 2560x1440, 180 frames (EXR masters in exr\)
- films\ignition\portrait\         1440x2560, 150 frames
- films\exploded\desktop\          2560x1440, 120 frames
- films\exploded\portrait\         1440x2560, 100 frames
- films\<shot>\<variant>\greybox\  EEVEE previews of every frame at 960 px wide (early, see step 5)
- stills\og.png                    2400x1260, the monolith at the hero angle, no text
- gl\showcase-monolith.glb         parts body, seam, glass, display; PBR materials WITHOUT emission (the web adds the
                                   glowing veins with its own shader); UV0; Y-up; no Draco, no cameras (the web
                                   compresses it)
- gl\textures\                     basecolor, orm (R occlusion, G roughness, B metallic), normal (OpenGL, +Y), veins
                                   (the emission mask, 4096 wide, the same UV layout as the GLB), seam (mask),
                                   contact (baked floor occlusion under one monolith, 2048, greyscale with alpha).
                                   2048 max except veins.
- gl\showcase-env.hdr              2048x1024 equirect of the studio rig and glossy floor from the monolith's position
                                   (monolith hidden), used for live reflections
- gl\cameras.json                  for cam_handoff, cam_handoff_portrait, cam_xray, cam_xray_portrait: position [x,y,z]
                                   and quaternion [x,y,z,w] in glTF Y-up metres, yfov in radians, aspect, near, far.
                                   Take the values from a real glTF export of each camera (export_cameras on, Y-up,
                                   scene resolution set to that camera's aspect first) and read the glTF JSON; do not
                                   convert by hand.
- gl\exploded.json                 translation in metres (Y-up) of body, seam, glass and display at full explosion
- gl\look.json                     the exact values at each film's final hold: vein emission strength, seam line
                                   strength, roughness values, and how colorA is mapped
- qa\                              contact sheets (every 10th frame per film), QA notes
- STATUS.md

== 5. THE FILMS, BEAT BY BEAT (frame numbers; the visitor's scroll drives the playhead) ==
IGNITION (the page opener, the most important asset):
- 000 to 024 Spark: black frame; a tiny red spark (#D64238, emissive, a short soft trail) appears high in frame and
  drifts down; the camera, low and close, eases forward.
- 025 to 060 Contact: the spark touches the top of a larger raw block of the same stone (rough, matte, chipped
  edges). A red light kiss spreads from the contact point, and the veins begin to light outward from it (an animated
  emission burn front through the vein mask).
- 061 to 105 Ignite: the veins race through the whole block along the marble's own vein lines, coloured by colorA;
  the camera cranes up and orbits about 20 degrees. One thin haze shaft from the top rim light (the only volumetric
  in either film; subtle).
- 106 to 140 Reveal: the rough outer shell burns away along the veins (a shader dissolve with a glowing edge, not
  physics debris), revealing the polished monolith inside.
- 141 to 160 Rise: the monolith rises slightly and turns to face camera, the seam line lights along its length, and
  the camera eases into cam_handoff.
- 161 to 179 Hold: camera exactly still at cam_handoff; the veins breathe very gently. The page crossfades to the live
  scene here, so the final frame must be drawable live: the polished monolith, seam lit, veins at a calm level (write
  it to look.json), no haze, no spark in frame.
- Portrait cut: the same beats in the same proportions over 150 frames, recomposed for 9:16, ending on
  cam_handoff_portrait.
EXPLODED (opens the "Under the hood" chapter):
- 000 to 020: the monolith in a front three-quarter view, still.
- 021 to 080: the parts separate along the depth axis with an eased stagger (glass forward first, then display, then
  seam; the body stays), a slow light sweep crosses the faces, and the camera orbits about 35 degrees to a side
  three-quarter view so the layers read clearly (an Apple exploded-view shot).
- 081 to 119: gentle drift, then fully still at cam_xray for the last 14 frames, with the parts at the offsets written
  to exploded.json.
- Portrait cut: 100 frames, ending on cam_xray_portrait.

== 6. ORDER OF WORK ==
1. Setup: create D:\tmp, D:\tools and env.ps1 (section 0). Download the gyan.dev ffmpeg "full" release zip into
   D:\tools\ffmpeg and confirm ffmpeg -encoders lists libsvtav1, libx264 and libvpx-vp9 (the web session uses it for
   video). Optional: KTX-Software (toktx) portable into D:\tools\ktx. Confirm Blender sees the RTX 4050 through
   OptiX. Record free space on C: and D: in STATUS.md.
2. Read and view everything in section 1.
3. Model the monolith (section 2), run lib.analyze, export the GLB, bake the textures, save the .blend.
4. Lookdev with a real critique loop. Render at 2560x1440: (a) the raw block with veins starting to light; (b) the
   polished monolith at the hero angle; (c) three monoliths 3.2 m apart on a glossy black floor, one lit (display
   showing a dim neutral glow), two sealed. Look at each image yourself, write an honest critique against the quality
   bar (reflections, blacks, vein colour and restraint, chamfer highlights, noise, anything that looks cheap), fix it
   and re-render. At least two full iterations. Save the finals and notes.md in lookdev\. THEN STOP and ask Kevin to
   approve the three stills. If he says "ask the web session", wait until lookdev\REVIEW.md exists and apply its
   notes. Do not start the final film renders until Kevin says go.
5. While waiting: animate both films and render every frame with EEVEE at 960 px wide (desktop and portrait) into
   the greybox folders; write cameras.json, exploded.json and look.json; tell Kevin "greybox ready" (the web session
   wires the page to it).
6. Render showcase-env.hdr and the contact texture.
7. Final renders, after approval: measure seconds per frame first and put the projected total in STATUS.md. Render
   in chunks of about 30 frames (resumable), overnight if needed. If any shot projects over 12 hours, tell Kevin
   before reducing quality; never reduce it silently.
8. QA before handover:
   - every frame is present at the exact size;
   - mean luminance per frame stays in a sensible band (no black, blown or missing frames);
   - temporal stability: mean absolute difference between neighbouring frames, with spikes flagged, inspected and
     fixed (re-render flickering or firefly frames with more samples);
   - contact sheets in qa\;
   - the cam_handoff and cam_xray values in cameras.json equal the scene's final-hold cameras.
9. Handover: STATUS.md lists every deliverable (path, size, frame count, seconds per frame, known issues). Then tell
   Kevin "assets ready".
Do not encode video, AVIF or WebP, and do not copy anything into D:\page_content\web: the web session does that.
```

## B3. How the two sessions meet

| Session | Writes to |
| --- | --- |
| The asset session | `D:\page_content\blender\` (scripts under `blender/scripts/showcase_*.py`, everything else under `blender/work/showcase/`), `D:\tools`, `D:\tmp` |
| This session | only `D:\page_content\web\`, plus `lookdev\REVIEW.md` when Kevin asks it to review the lookdev |

Signals pass through files: `STATUS.md` (theirs) and `REVIEW.md` (mine). Kevin says "greybox ready" or "assets ready"
to this session, and it takes it from there. The new `showcase_*.py` scripts are committed by this session after review;
renders never enter git.

---

## Kevin's part

| Task | When |
| --- | --- |
| Finish freeing C: (aim for 20 GB or more) | now |
| Start the asset session (B1) and paste the prompt (B2) | now |
| Approve the three lookdev stills (Gate 1), or say "ask the web session" | when it stops |
| Keep the laptop plugged in and awake during the final renders | overnight |
| Screenshot Friday's welcome DM in Discord (Exhibit 02) | any time |
| Approve or edit the draft copy in A1 | before launch |
| Set `PITCH_LINK_SECRET` on Vercel (I give the one-line command) | before launch |
| Phone pass and one WhatsApp pitch link | before launch |

B11 (what counts as "top") is answered: Core picks exhibits by hand. B12 (how members get listed) stays open until the
first member launch. Both go into `web/docs/kevin-todo.md` when work starts.

## Risks

| Risk | Handling |
| --- | --- |
| Long renders or thermal throttling on a laptop GPU | greybox first so the web never waits, chunked resumable renders, the 12-hour warning rule |
| 6 GB VRAM | one volumetric only, 2K textures, a denser mesh only where it fits; renders and my GPU checks never overlap |
| Film and live differ at a handoff | shared cameras and look values from real exports, AgX at both ends, a still hold under the crossfade, the 3% gate |
| Phone memory on frame sequences | windowed bitmap cache, the portrait cut, mid and low tiers |
| It reads as a gimmick | one hard idea, minimal copy, only real exhibits, and everything readable with effects off |
| Safari (video textures, AVIF) | WebM plus MP4, WebP fallback frames, `playsinline muted`, a Safari check in A8 |
