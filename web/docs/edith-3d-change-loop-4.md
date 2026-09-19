# Change request: replace object 4 (the rubber duck)

**For:** the agent that built the edith objects. Everything else in `edith-3d-brief.md` still applies; this file
only changes what object 4 is. The other seven objects are wired into the site and are not changing.

**Why:** the duck was built from the brief's "rubber-duck debugging" in-joke, which is the name of edith's help
channel. But this page is also the page a Maintainer shows a paying client, and the duck is the one object a
client can read as unserious. Kevin asked for it to go.

## The new object

**A rope knot coming undone** for the "Get unstuck" card.

- A thick rope tied in a loose knot (a bowline or a simple overhand loop is fine), with **one end pulling free**
  so the knot is visibly loosening rather than tightening.
- Keep it **open and legible**: large holes, a clear over-under path. A dense tangled ball turns into noise at
  117 px, which is its size on a phone.
- The free end should lift away from the body of the knot (a light S-curve), which gives the silhouette a
  direction and reads as "coming loose".
- **Rope thickness 1.2 to 1.8 units.** Add a carved strand twist along the rope (three or four strands, a slow
  helix). This is the object's only ornament and it is what makes the matcap sing.
- Optional: a frayed, slightly flared tip on the free end. Keep any fray chunky, nothing under 0.6 units.

## Everything it must still satisfy

Same as objects 1 to 6 in the brief:

- Longest side 10 units, origin at the bounding-box centre, transforms applied, +Y up, front facing -Y in Blender.
- Footprint (X:Y) about 1:1 (0.8 to 1.25). Depth is free; the knot should have real depth, not sit flat in a plane.
- Closed, watertight, outward normals, one UV map inside 0 to 1, even texel density. It uses the shared stone
  surface, so **no bespoke maps**: all its detail must be geometry.
- 500 to 5,000 triangles, the `.glb` at most 200 KB, nothing else inside the file.
- Passes `scripts/verify.py`.

## Delivery

- **Same file name: `export/loop-4-unstuck.glb`.** Keeping the name means the site picks it up with no code
  change: I copy the file in, rebuild and shoot it.
- Also refresh `export/previews/loop-4-unstuck.mp4`, `loop-4-unstuck.png`, the contact sheet and the silhouette
  test, and note the object in `export/README.md`.

## One thing to check that the duck showed up

On the site the object spins slowly and is seen from every angle. Check the knot at yaw 90 and 270 degrees: the
loop should still read as a loop, not collapse into a bundle of parallel bars. If it does collapse, rotate the
knot's plane about 30 degrees inside the model so no angle is fully side-on.
