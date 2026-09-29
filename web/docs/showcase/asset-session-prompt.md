# Prompt for the Blender asset session

Kevin: start the session as in "How to start it", then either paste the prompt below, or just tell that session:
`Read D:\page_content\web\docs\showcase\asset-session-prompt.md and do everything in "The prompt".`

The web session reads deliverables from the paths in section 4 of the prompt. That section is the contract between the
two sessions: change it only in this file, and tell both sessions.

## How to start it (on D:, so even Claude's own temp files avoid C:)

In a new PowerShell window:

```powershell
New-Item -ItemType Directory -Force D:\tmp, D:\tools | Out-Null
$env:TEMP = 'D:\tmp'; $env:TMP = 'D:\tmp'
Set-Location D:\page_content
claude
```

Then type `/model opus` (best quality), and paste the prompt below. Keep the laptop plugged in and set to not sleep
while it renders.

## The prompt

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
