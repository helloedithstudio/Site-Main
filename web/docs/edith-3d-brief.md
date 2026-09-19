# edith: 3D objects brief (Blender)

**For:** the agent or artist building the 3D objects for the edith website in Blender.
**Owner:** Kevin, founder of edith. Ask him about anything this brief leaves open; do not invent brand facts.
**Your scope:** the files listed in section 12. Wiring them into the site, shaders and compression are done on the
web side (`D:\page_content\web`, Next.js + three.js r180). You do not need to read the website code.

Every number in this brief was measured from the live build, not estimated.

---

## 1. What edith is

edith is a club of builders that runs itself: developers and technologists across Web2, Web3, AI and whatever
comes next. Members pitch ideas, form teams, build in public, get unstuck, ship, and the best projects launch
under the edith name. Maintainers (earned membership) can also take client work under the edith name.

Tone: builder in-jokes, dry, credible. **Hard brand rule:** nothing may suggest a crypto token, coin, DAO, wallet
or blockchain. edith has no token and nothing on-chain.

## 2. Why these objects exist

The site is a re-skin of an existing award-level WebGL site built for a DeFi brand. Eight 3D objects on it still
belong to that brand: a spinning coin engraved "SFI", a governance emblem, and dollar, ETH and Tether coins in a
carousel. They read as crypto tokens, so they must go. You are making the eight replacements.

## 3. Art direction

**The scene around your objects:**

- Pure black backgrounds.
- A black marble hero with glowing magenta and orange veins.
- A greyscale medieval tapestry behind the carousel, and a hall of classical archways.
- Cream text (`#ECE7E0`) and gold accents (`#FFBC09`).

**The old objects** were engraved classical medallions (floral ornament, serif lettering), lit by a psychedelic
colour map (section 5). The site's flavour is "museum relic meets rave".

**The new objects:** everyday dev-culture things (a lightbulb, a rubber duck, a rocket...) treated like cast bronze
or carved stone museum pieces.

- Solid and weighty, with generous bevels and clean, bold silhouettes.
- Restrained ornament: a few engraved lines, rivets, fluting, a small laurel or flourish motif. The ornament ties
  them to the classical setting.
- **Not:** cartoon, faceted low-poly, photoreal PBR, or toy-like plastic.
- **One family:** the same bevel language, the same density of ornament, the same visual weight. Put them side by
  side and they should look like one collection from one museum.

## 4. Deliverables at a glance

| # | Where on the site | Object (default) | Screen box | Export file |
|---|---|---|---|---|
| 1 | Loop card 1, "Pitch it" | Lightbulb | square | `loop-1-pitch.glb` |
| 2 | Loop card 2, "Find your crew" | Two interlocking jigsaw pieces (see note) | square | `loop-2-crew.glb` |
| 3 | Loop card 3, "Build in public" | Wrench crossed with a hammer | square | `loop-3-build.glb` |
| 4 | Loop card 4, "Get unstuck" | Rubber duck | square | `loop-4-unstuck.glb` |
| 5 | Loop card 5, "Ship it" | Rocket | square | `loop-5-ship.glb` |
| 6 | Loop card 6, "Launch it" | Flag planted on a summit rock | square | `loop-6-launch.glb` |
| 7 | Membership section | Pull-request glyph (branch and merge) | portrait | `membership-pr.glb` + maps |
| 8 | Decisions section | RFC scroll | portrait | `decisions-rfc.glb` + maps |

Also deliver: turntable previews and a contact sheet (section 12.2), and a handover note (section 12.3).
Optional: a scroll-driven image sequence (section 11), only if Kevin asks.

> **Note on object 2.** The approved plan said "linked rings". A chain of rings can read as "blockchain", which
> the brand rules out, so the default here is jigsaw pieces. Build the rings only if Kevin confirms.

## 5. How the objects are shaded (read this before modelling)

The site does not light your model. It uses a **matcap** (three.js `MeshMatcapMaterial`). Each pixel's colour is
looked up from a sphere image according to the surface normal in view space. The matcap is
`D:\page_content\web\public\gl\images\misc\model-matcap.jpg`: a sphere of soft red, orange, yellow, magenta and
violet blobs on black.

What that means for you:

- **Curvature is everything.** A flat face shows one flat colour patch, while curved and bevelled surfaces sweep
  through the reds, oranges and violets. That colour play is what makes the objects look alive. A sharp-edged box
  looks like a flat sticker, so bevel every edge.
- **Nothing you set up in Blender's shading is used.** Materials, lights, colours, roughness and emission are all
  thrown away.
- **Detail comes from shape.** Geometry gives the big forms. An optional tangent-space normal map gives engraving.
  The old coin had only **112 triangles**, and all of its engraving lived in a 1024 x 1024 normal map.
- **The optional colour map works as a greyscale ink layer.** It is multiplied with the matcap (at double
  brightness): white = full matcap colour, dark = darker. Use it for engraved lines or grime, not for colour.
- **A grain filter sits on top.** A blue-noise dither darkens the surface by up to 50% (a film-grain look), and
  detail smaller than about 2 px on screen is lost in it.

**Preview it in Blender exactly like the site:**

1. Edit > Preferences > Lights > MatCaps > **Install...**, and pick `model-matcap.jpg`.
2. In the viewport: Solid shading > Lighting: **MatCap**, and choose it.
3. Set the world background to black.

This is the same shading model the site uses (view-space matcap). Only the grain is missing.

## 6. Engine contract (hard technical rules)

1. **Format:** glTF 2.0 binary (`.glb`), one file per object.
2. **Axes:** +Y is up, and the front of the object faces the camera, which is **+Z** in glTF. With Blender's
   default exporter (+Y Up on), model the front facing **-Y**, so you see it in Front view (numpad 1).
3. **Origin:** at the centre of the object's bounding box, with transforms applied (Ctrl+A > All Transforms). The
   object spins around the vertical axis through the origin, so put the origin where the spin should be.
4. **Size:** longest side **10 units** (Blender metres); 9 to 12 is allowed. The site normalises size, but the
   ember particles and the dissolve effect are fixed in model units and were tuned for 10-unit objects.
5. **Proportions decide on-screen size.** The site fits the object into its screen box using only the bounding-box
   width (X) and height (Y):
   `scale = min(boxWidth / bboxX, boxHeight / bboxY) x slotFactor`.
   - Depth (Z) is ignored.
   - The bounding box is measured once, in the rest pose. The object then spins, so its apparent width changes.
   - Targets for each slot are in section 7.
6. **Meshes and objects:** one or several meshes are fine; they all get the same material. Do not export cameras,
   lights, armatures or hidden helper geometry, because they distort the measured bounding box or add weight.
   Export selected objects only.
7. **Closed, watertight solids with outward normals.** No internal faces, no single-sided planes. Two reasons:
   - Objects 7 and 8 render front faces only, so a single plane vanishes from behind.
   - Objects 1 to 6 dissolve in and out through a noise mask, which turns patches transparent and reveals
     anything inside.
8. **Shading:** smooth, with angle-based sharp edges (Blender 4.1+: the **Smooth by Angle** modifier, about 30 to
   40 degrees). Export with Apply Modifiers on so the split normals are baked in. The Normals attribute is
   required.
9. **UVs:** one UV map, with every island inside the 0 to 1 square (textures are not tiled). UVs are required even
   without bespoke maps, because objects 1 to 6 share a stone surface texture (section 8.1).
10. **Budgets:**
    - Objects 1 to 6: 500 to 5,000 triangles each. Objects 7 and 8: up to 8,000.
    - Each `.glb` at most 200 KB, all eight together at most 1 MB.
    - For comparison, the old objects were 12 to 1,080 triangles and 4 to 110 KB each.
11. **No animation in the file.** The site animates the objects (section 9). Exception: the optional idle clip in
    section 9.4.
12. **Materials and compression:** set Materials to "No export". Draco compression off (the files are small; the
    site can decode Draco if a file ever goes over 200 KB).

### Blender exporter settings (File > Export > glTF 2.0)

| Setting | Value |
|---|---|
| Format | glTF Binary (`.glb`) |
| Include > Limit to | Selected Objects; Cameras, Punctual Lights and Custom Properties unchecked |
| Transform | +Y Up checked |
| Data > Mesh | Apply Modifiers on, UVs on, Normals on, Tangents off, Vertex Colors off (4.2+: Use Vertex Color = None), Loose Edges and Points off |
| Data > Material | No export |
| Data > Compression | off |
| Animation | off (unless section 9.4) |

### Reference files to import

These are the objects being replaced, in `D:\page_content\web\public\gl\models\`. Import them into your scene and
make your objects match their scale and orientation.

| File | Bounding box (X x Y x Z) | Triangles | Notes |
|---|---|---|---|
| `coin.glb` | 10 x 10 x 1 | 112 | a flat disc; all engraving in its normal map |
| `dollar.glb` | 10.2 x 9.8 x 1.6 | 1,020 | carousel card 1 |
| `tether.glb` | 12.0 x 10.4 x 1.9 | 792 | carousel card 2 |
| `eth.glb` | about 4.3 x 7 x 4.3 | 12 | two pyramids |
| `emblem.glb` | about 6.4 x 10.2 x 2.4 in the scene | 1,080 | the mesh is 9.1 x 14.5 x 2, with node scale 0.71, 0.71, 1.2 |

## 7. The slots: where each object lives and how big it gets

**Camera:** perspective with a 30 degree vertical field of view, placed so that 1 world unit at depth 0 equals 1 CSS
pixel. The objects sit near depth 0, so the perspective is mild: think of a long lens.

Screen sizes below are for three screens: a large desktop (1900 px wide), a laptop (1440 px) and a phone
(390 x 844).

### 7.1 Loop carousel (objects 1 to 6)

- **Context:** "How an idea becomes a launch", a pinned carousel of six black cards with rounded corners.
  - Card size: 792 x 475 px at 1900 wide, 675 x 405 at 1440, 369 x 349 on a phone.
  - Behind the cards: the greyscale tapestry. Under each card: a short caption, such as "PITCH IT. Post the idea
    in brainstorm and get real feedback before you write a line."
- **Screen box:** a centred square, 253 px (1900), 216 px (1440), 156 px (phone).
- **Slot factor 0.75.** A 10-unit object with a square footprint renders about **190 px** at 1900 wide, 162 px at
  1440 and **117 px** on a phone.
- **Bounding-box footprint (X:Y):** anywhere from 0.6 to 1.6 works. The longer side fills the box, so a tall bulb
  is as tall as a square duck is wide. Avoid extremes: a pole-like object (0.3) looks like a line.
- **Legibility floor:**
  - 1 unit is about 19 px on desktop and about 11 px on a phone.
  - Details under 0.3 units disappear.
  - Minimum thickness for any bar, handle, strut or pole: **0.6 units**.
- **Surface:** the shared stone texture (section 8.1).
- **Rendering:** double-sided.

### 7.2 Membership (object 7)

- **Context:** the "Everyone starts as a Catalyst" section (Catalyst, then Maintainer: "open a PR to become a
  Maintainer").
  - The object spins in the right half of a two-column layout, over black, with red embers rising around it.
  - It is cut off at the edges of its column, which is 950 px wide on desktop.
- **Screen box:** portrait. 364 x 486 px (1900), 311 x 414 (1440), 208 x 416 (phone), so the aspect is 0.75 on
  desktop and 0.5 on a phone.
- **Slot factor 1.5.** It is deliberately oversized: a 10-unit round object renders about **546 px** wide at 1900,
  467 px at 1440 and 312 px on a phone. It overflows its box on purpose.
- **Target footprint (X:Y):** 0.6 to 0.8 (portrait), longest side 10.
- **Rendering:** front faces only, so a closed solid is mandatory.
- **Maps:** a bespoke normal map and colour map at 1024 x 1024 (recommended, section 8.2).

### 7.3 Decisions (object 8)

- **Context:** "The community decides" (anyone suggests, Maintainers vote on RFCs, Core carries out the result).
  The object sits in the left column and behaves like object 7: spin, pointer, embers, clipping.
- **Screen box:** 496 x 598 px (1900), 423 x 510 (1440), 208 x 416 (phone), so the aspect is 0.83 on desktop and
  0.5 on a phone.
- **Slot factor 0.95.** It fits inside the box; the old emblem rendered about **357 x 569 px** at 1900.
- **Target footprint (X:Y):** about 0.6 to 0.7 (portrait), longest side 10 to 12.
- **Rendering:** front faces only.
- **Maps:** a bespoke normal map and colour map at up to 2048 x 2048 (recommended, section 8.2).

## 8. Surfaces and maps

### 8.1 Objects 1 to 6: shared stone surface

The six carousel objects share one generic surface: a grey, mottled stone or plaster colour map plus its normal map
(`public/gl/images/hero/model-diffuse.png` and `model-normal.png`, 1024 x 1024). Your UVs only need to spread it
evenly:

- uniform texel density across the object
- seams hidden on the back or underside
- no heavy stretching

Do not bake bespoke maps for these six unless Kevin asks. Because the surface is generic, **their ornament must be
real geometry** (bevels, grooves, raised reliefs), not painted on.

### 8.2 Objects 7 and 8: bespoke bakes (recommended)

This is where the fine engraving lives.

- **`normal.png`:** tangent space, OpenGL convention (green = +Y, Blender's default), 8-bit RGB PNG.
  1024 x 1024 for object 7, 2048 x 2048 for object 8.
- **`diffuse.png`:** optional greyscale ink (white = full matcap colour), 8-bit PNG, same size.
- **How to bake:** sculpt a high-poly version, then bake onto the low-poly export mesh (Cycles > Bake > Normal,
  Selected to Active, with a cage or extrusion). Leave 16 px of padding between UV islands.
- **Strength:** bake at full strength. The site applies the normal map weakly (normal scale 0.25), so do not
  weaken it in advance.
- **Orientation:** do not flip, invert or pre-process anything. Compression (KTX2) and orientation fixes happen on
  the web side.
- **Reference:** the old coin's `public/gl/images/coin/diffuse.png` and `normal.png`. The front and back faces each
  got their own round UV island inside one square.

## 9. Cinematics: exactly how each object moves on the site

You do not animate these objects; the site does. Design them to look good through all of the following. Your
turntable previews (section 12.2) should imitate it.

### 9.1 Carousel objects (1 to 6)

- **Rest pose:** tilted back 0.2 rad (11.5 degrees) around X, so the camera sees a little of the top.
- **Spin:** around the vertical axis at 0.2 rad/s (one full turn about every 31 s), plus a boost proportional to
  scroll speed, so fast scrolling whips them round. They spin all the time, so **every side gets seen**.
- **Arrival:** when its card becomes the current card, the object **pops in** and **materialises** at the same
  time.
  - Pop: scale goes from 65% to 100% with a small overshoot (back-out easing), over 0.55 s after a 0.45 s delay.
  - Materialise: a noise dissolve makes patches of the surface appear first, with a **white-hot glowing edge**
    along the dissolve front.
  - The noise is mapped in model space (the model's X/Y rotated 43 degrees), so its grain scales with your model
    units. This is another reason to keep the 10-unit size.
- **Departure:** 0.3 s, scaling down with the dissolve reversed.
- **Section reveal:** the whole carousel fades up over 0.75 s (ease-out) when the section scrolls into view.
- **Dragging:** dragging the carousel bows the cards and shifts the object sideways (up to 4.5% of the card
  width), then springs back.
- **Phones:** the cards stack as a vertical deck, and the object shows at about 117 px.

**What this means for the design:**

- The silhouette must read from every angle around Y, including edge-on. Flat objects (a flat flag, a flat wrench)
  disappear when they turn edge-on.
- The glowing dissolve edge looks best on large continuous surfaces. It looks messy on many tiny separate parts.

### 9.2 Membership and Decisions (objects 7 and 8)

- **Rest pose:** rolled 0.3 rad (17 degrees) in the screen plane, plus a slight yaw.
- **Spin:** around the object's own vertical axis at 0.2 rad/s, plus the scroll-speed boost.
- **Pointer:** the object yaws toward the pointer. At the far left or right of the screen it turns up to about
  **1.5 rad (86 degrees)** on top of the spin, with smoothing.
- **Parallax:** it moves at half the page's scroll speed, so it lingers while the text scrolls past.
- **Clipping:** cut off at the edges of its column.
- **Embers:** 130 small red glowing particles rise and flicker around it (additive blending).
  - The ember cloud spans about 2 units either side of the origin, fixed in model units. With a 10-unit object
    that makes a halo about 40% of the object's size.
  - The embers speed up with scroll speed.
- **Screen time:** these sections are 1,000 to 1,400 px tall, so each object is on screen for several seconds and
  seen from all sides. **This is the hero shot**; spend the most detail here.

### 9.3 Timing summary

| Motion | Objects 1 to 6 | Objects 7 and 8 |
|---|---|---|
| Base spin | 0.2 rad/s around Y | 0.2 rad/s around Y |
| Scroll boost | + scroll velocity x 0.002 rad per frame | same |
| Static tilt | X -0.2 rad (tilted back) | Z 0.3 rad (roll) |
| Pointer | none | up to about 1.5 rad yaw, smoothed |
| Appear | pop 0.65 to 1.0, back-out, 0.55 s after 0.45 s delay, noise dissolve with glowing edge | always visible, scroll parallax x0.5 |
| Disappear | 0.3 s pop-out, dissolve reversed | clipped by its column |
| Extras | carousel drag shift, up to 4.5% of the card width | 130 rising red embers |

### 9.4 Optional: a baked idle animation

The site does not play animations from files yet. If you think an object needs one, say so in your handover note
and it will be added on the web side. Constraints:

- one clip named `idle`, a seamless loop of 4 s or less
- object-level transforms or shape keys only, no armatures
- subtle, because the object is already spinning

Examples: the duck bobs, the flag cloth ripples (shape keys), the rocket's plume pulses (scale). A glowing filament
is impossible: there is no emission.

## 10. The objects, one by one

For every object: longest side 10 units, bevels about 0.15 to 0.3 units on every visible edge, closed solid.

### 1. Lightbulb ("Pitch it", loop-1-pitch)

- **Meaning:** an idea.
- **Form:** a classic pear-shaped bulb on a screw base with 3 or 4 threads and a small contact tip. The glass is a
  **solid cast form**, like a bronze paperweight in the shape of a bulb: the material cannot show glass.
- **Detail:** suggest the filament as a raised spiral relief or engraved line on the glass surface; give the
  threads a strong, deep profile so they catch the matcap.
- **Footprint:** about 0.65 (tall). It will fill the box's height.
- **Avoid:** a hollow glass shell, a thin wire filament, separate floating rays.

### 2. Two jigsaw pieces ("Find your crew", loop-2-crew)

- **Meaning:** people who fit together.
- **Form:** two chunky jigsaw pieces locked together. Offset them in depth and rotate one about 30 degrees against
  the other, so the pair has volume from every angle and never goes paper-flat.
- **Detail:** thickness at least 1.2 units; rounded edges.
- **Footprint:** about 1:1.
- **If Kevin keeps the rings instead:** two or three thick interlocking rings with a tube radius of at least 0.8
  units.

### 3. Wrench crossed with a hammer ("Build in public", loop-3-build)

- **Meaning:** building.
- **Form:** a combination wrench and a claw hammer crossed in an X. **Turn one tool 90 degrees to the other around
  the vertical axis**, so that as the pair spins, one of them always faces the camera.
- **Detail:** handles at least 0.8 units thick. Optional grip grooves or rivets.
- **Footprint:** about 1:1.
- **Avoid:** a single flat wrench, which disappears edge-on.

### 4. Rubber duck ("Get unstuck", loop-4-unstuck)

- **Meaning:** rubber-duck debugging; this is the name of edith's help channel.
- **Form:** a classic plump bath duck with a round body, flat beak and upturned tail, facing front (-Y in Blender).
- **Detail:** the eyes are shallow recesses or small domes. There are no separate colours, so everything is shape.
- **Footprint:** about 1:1.
- **Role:** the most volumetric object. Use it as the family's reference for bevel softness and weight.

### 5. Rocket ("Ship it", loop-5-ship)

- **Meaning:** shipping.
- **Form:** a classic retro rocket: pointed nose cone, cylindrical body with one recessed porthole, 3 or 4 swept
  fins, and a short stylised exhaust plume modelled as one solid teardrop flame (not particles).
- **Pose:** to fill the square box, **tilt the whole rocket about 30 degrees off vertical** in the model, so it is
  climbing diagonally. The origin stays at the centre of the bounding box.
- **Footprint:** after the tilt, about 0.7 to 1.
- **Avoid:** thin fins (at least 0.6 units thick) and an upright pencil-thin rocket.

### 6. Flag on a summit ("Launch it", loop-6-launch)

- **Meaning:** launched, planted, done.
- **Form:** a pole planted in a small rocky summit mound, with a flag carrying a **sculpted S-curve wave**.
  - The wave gives the cloth at least 1.5 units of depth.
  - The cloth is a solid slab at least 0.3 units thick with rounded edges; the pole is at least 0.6 units thick.
- **Detail:** optional pole-top finial; stones on the mound.
- **Footprint:** about 0.9 to 1.
- **Avoid:** a flat single-sided flag.

### 7. Pull-request glyph (Membership, membership-pr)

- **Meaning:** "open a PR to become a Maintainer".
- **Form:** a generic branch-and-merge glyph (your own drawing of the idea, not a trace of any company's icon):
  - left side: two rings, top and bottom, joined by a vertical bar
  - right side: a ring at the bottom, with a bar rising from it and curving left into an arrowhead that points at
    the left bar
- **Build it as a cast sculpture, not a flat extrusion.** Bars have a round or rounded-square profile, the rings are
  chunky tori, and the total depth is about 1.5 to 2 units, so it reads from every angle while it spins and turns
  toward the pointer.
- **Detail (normal map):** fine laurel or fluting engraving along the bars, a subtle bevelled rim on the rings.
- **Footprint:** portrait, 0.6 to 0.8.

### 8. RFC scroll (Decisions, decisions-rfc)

- **Meaning:** a formal proposal, voted on in the open.
- **Form:** a parchment scroll, partly unrolled and hanging portrait.
  - Rolled ends at the top and bottom, with small rod finials.
  - The sheet between them has a gentle wave and is a solid slab at least 0.25 units thick, with rolled edges.
- **Detail (normal map):**
  - rows of engraved "text lines" (not legible text)
  - a raised wax seal or tick mark near the bottom ("the vote passed")
  - a faint paper fibre texture
- **Footprint:** portrait, about 0.6.

## 11. Optional: the scroll-driven image sequence (Beliefs section)

Do this only if Kevin asks. Today the section plays 267 frames of a crocus flower blooming, which is the old brand's
flower.

- **Context:** the Beliefs section. Six short captions swap one by one in a caption box at the bottom centre while
  the frames play: Autonomous, Decentralised, Builder-first, Stack-agnostic, Open by default, Reputation is earned.
- **Playback:**
  - The current frame follows scroll progress across 500% of the screen height (about 4 screens of scrolling).
  - Users scroll back and forth, so the motion must be continuous and reversible, with **no cuts**.
- **Framing:**
  - Each frame fills the whole screen (cover fit, centred, cropped to the screen's aspect).
  - The frame grows from 75% to 100% scale during the first third.
  - The site boosts saturation (x1.6) and contrast (x1.15), so render slightly flat.
- **Frame format:**
  - 1800 x 949 px (about 1.9:1), sRGB JPEG, quality about 80.
  - At most 40 KB per frame. The current set is 9.7 MB in total, and every frame is preloaded.
  - 267 frames (another count is fine; say which), named `frame_0001.jpg` onwards.
- **Composition:**
  - Pure black background, because the page is black.
  - Keep the lower 25% calm: the caption box sits there, about 700 px wide.
  - **A portrait phone shows only the middle quarter of the frame's width**, so keep the essential action there.
- **Ideas for Kevin to choose from:**
  - The six carousel objects arranged as one still life, with the camera drifting slowly past them.
  - A lightbulb cracking open and a rocket climbing out of it.

## 12. Files and handover

### 12.1 Folders and names

- **Sources:** `D:\page_content\blender\` (not part of the website). One `.blend` per object, or one master file with
  a collection per object.
- **Exports:** `D:\page_content\blender\export\`
  - `loop-1-pitch.glb`, `loop-2-crew.glb`, `loop-3-build.glb`, `loop-4-unstuck.glb`, `loop-5-ship.glb`,
    `loop-6-launch.glb`
  - `membership-pr.glb`, `membership-pr/normal.png`, `membership-pr/diffuse.png`
  - `decisions-rfc.glb`, `decisions-rfc/normal.png`, `decisions-rfc/diffuse.png`
- Do not write into `D:\page_content\web`. The web side copies the files in.

### 12.2 Previews (for Kevin's approval before anything is wired)

- **One turntable per object:**
  - 360 degrees, 6 s at 30 fps (180 frames), 1080 x 1080, MP4 (H.264).
  - Black background, Workbench or EEVEE with the site matcap (section 5), camera at 30 degrees FOV.
  - Tilt matching the slot: objects 1 to 6 tilted back 11.5 degrees; objects 7 and 8 rolled 17 degrees.
  - Save to `export/previews/<name>.mp4`.
- **One still per object:** a three-quarter view, 1080 x 1080 PNG.
- **One contact sheet:** all eight side by side, each at the size it appears on the site. That is 190 px and
  117 px for objects 1 to 6, 546 px for object 7 and 357 x 569 px for object 8. This checks the family
  resemblance and small-size legibility in one image.

### 12.3 Handover note (`export/README.md`)

For each object:

- triangle count
- bounding box (X, Y, Z)
- file size
- which maps are included
- any decision you made that this brief did not cover

## 13. Do not

- **No crypto imagery:** no coins, tokens, currency symbols, wallets, chains that read as "blockchain", hexagon
  crypto motifs.
- **No old-brand motifs:** no crocus or saffron flowers, no "SFI".
- **No Marvel references:** nothing from Marvel's E.D.I.T.H. (the glasses), which is a trademark risk.
- **No text that must be read:** at 117 to 190 px it will not be legible. Large relief letters on the scroll are
  optional at most.
- **No glass, transparency or emission:** the material cannot show them.
- **No thin parts:** no wires, strings, antennas or fins under 0.6 units thick.
- **Nothing extra in the `.glb`:** no embedded materials, textures, lights, cameras or animations (except the agreed
  idle clip).

## 14. Acceptance checklist (check before handing over)

- [ ] Longest side 9 to 12 units; origin at the bounding-box centre; transforms applied.
- [ ] Front faces -Y in Blender (+Z in the exported glTF), +Y up.
- [ ] Footprint (X:Y) inside the slot's target range (section 7).
- [ ] Closed and watertight, normals outward, no internal faces (Mesh Analysis or 3D-Print Toolbox: non-manifold = 0).
- [ ] Smooth by Angle applied; no shading artefacts under the site matcap.
- [ ] One UV map inside 0 to 1; texel density even (objects 1 to 6); 16 px padding (objects 7 and 8).
- [ ] Triangles within budget; each `.glb` at most 200 KB; no materials, cameras, lights or animations inside.
- [ ] **Silhouette test:** render the object as solid white on black at 117 px from 8 yaw angles, 45 degrees
      apart. Every angle must still be recognisable, and no angle may collapse to a line.
- [ ] Matcap test: under `model-matcap.jpg`, no large flat single-colour faces; bevels visibly sweep colour.
- [ ] Turntables, stills, contact sheet and handover note delivered.

## 15. Open decisions (use the default if Kevin has not answered)

| Question | Default |
|---|---|
| Object 2: jigsaw pieces or linked rings? | Jigsaw pieces |
| "Ship it" / "Launch it": rocket + flag, or parcel + rocket? | Rocket + flag |
| Bespoke engraved maps for objects 7 and 8? | Yes |
| Idle animations (section 9.4)? | No |
| Replace the crocus image sequence (section 11)? | Not now |
