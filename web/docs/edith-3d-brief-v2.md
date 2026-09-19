# edith 3D objects, version 2: hard-surface dev gear

Written 20 September 2026. This replaces the objects and the material direction of `edith-3d-brief.md`. The engine
contract in that file (axes, size, one mesh, no extras) still applies and is summarised below.

## Why version 2

The first set was soft and blobby, read poorly at 190 px, and included a rubber duck that did not suit a
professional community that also doubles as a client pitch page. Version 2 is hard-surface dev gear: machined
parts with clean chamfers, engraved details and readable silhouettes, built to look like hardware a developer
would recognise. The colour comes from the site's existing matcap (the magenta, orange and gold of the
Saffron palette, which the site keeps), so there is no material to author.

## The set

| # | File | Object | Story beat | Triangles |
| --- | --- | --- | --- | ---: |
| 1 | `loop-1-pitch.glb` | Faceted bulb on a threaded base | Pitch it | 1,648 |
| 2 | `loop-2-crew.glb` | Two meshing gears | Find your crew | 1,700 |
| 3 | `loop-3-build.glb` | CPU package, 32 pins, heat spreader | Build in public | 1,816 |
| 4 | `loop-4-unstuck.glb` | Open padlock with keyhole and rivets | Get unstuck | 1,026 |
| 5 | `loop-5-ship.glb` | Crate with a raised frame and a big up arrow | Ship it | 892 |
| 6 | `loop-6-launch.glb` | Faceted rocket with porthole and four fins | Launch it | 3,126 |
| 7 | `membership-pr.glb` | Git merge glyph: three hex nuts and octagonal rods | Membership | 698 |
| 8 | `decisions-rfc.glb` | Document slab with text bars and a check badge, on both faces | Decisions | 1,272 |

All eight together are about 530 KB. They have no textures and no materials.

## Engine contract (unchanged)

- +Z is up in Blender and the front of every object faces -Y (this becomes +Z in glTF).
- The longest of width (X) and height (Z) is 10 units, the origin is the bounding box centre, transforms applied.
- One closed, single-shell mesh with outward normals. Only `POSITION`, `NORMAL` and `TEXCOORD_0` are exported.
- Each file is at most 200 KB and at most 5,000 triangles. Depth (Y) stays well inside 12.
- The site shades everything with `model-matcap.jpg`. Do not add colours, maps or materials.
- Loop objects sit in a 253 px box (about 266 px at 1.05x), the portrait pieces in larger slots. Design the
  silhouette for the small size first: it has to read as one solid white shape at 117 px.

## Style rules for new objects

- Real chamfers, not soft blobs: bevel width about 0.1 to 0.4 on a 10 unit object, 1 to 3 segments.
- Flat faces should be flat and round parts round. Use 8 to 10 sided lathes when a faceted, machined look helps.
- Add small engraved or raised detail (recesses, rivets, bands) that survives at 190 px. Anything below about
  0.15 units disappears.
- Avoid coincident faces and near-touching parts before a boolean union. Overlap parts by at least 0.1 units, or
  build the chamfer into a revolved profile. The QA step rejects open edges.
- Nothing playful or cartoonish. No characters, animals or mascots.

## Build and check

`blender/scripts/v2_objects.py` builds all eight from code using the helpers in `blender/scripts/lib.py`
(lathe, extrusion, sweep, boolean, bevel, export). Run:

```
D:\blender\blender.exe -b --factory-startup -P blender\scripts\v2_objects.py             # all eight
D:\blender\blender.exe -b --factory-startup -P blender\scripts\v2_objects.py -- 3 4      # only objects 3 and 4
```

Every object is finished by `lib.finalize`: normalise, smooth by angle, unwrap, check the mesh (watertight, one
shell, positive volume, triangle range, no open edges after a glTF round trip), export the GLB, save
`blender/<name>.blend` and render an eight-angle preview sheet under the site matcap. The output line
`PROBLEMS none` is the pass condition. Copy the new GLB into `web/public/gl/models/` to use it.

## Changing or adding an object

1. Add a `build_<name>()` function to `v2_objects.py` that returns the finished object, and register it in `BUILDS`.
2. Run it and open the preview sheet in `blender/work/`. Check it at 117 px, since that is what phones show.
3. Copy the GLB into `web/public/gl/models/`. The loop cards use `loop-N-model` in `lib/gl/resources.ts`.
4. If it changes a card's meaning, update the copy in `lib/content.ts` (`home.intro.slides`).
