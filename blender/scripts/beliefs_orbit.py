"""The Beliefs scroll sequence: the six layers of the edith server, drawn together, then opening up and lighting one by one
while the camera swings round to the front. It replaces the flower footage that came with the original site. One frame per
scroll step, so the page scrubs it like a film.

    blender -b --factory-startup -P blender/scripts/beliefs_orbit.py -- preview            # every 12th frame, small
    blender -b --factory-startup -P blender/scripts/beliefs_orbit.py -- final 0 30         # frames 0 to 29 at full size
    blender -b --factory-startup -P blender/scripts/beliefs_orbit.py -- final all frames=96 size=1000x1400 samples=40

Raw RGBA PNGs go to blender/work/beliefs/; web/scripts/make-beliefs-frames.cjs flattens them onto black and writes the WebP
frames the page loads (public/images/beliefs/frame_NNNN.webp).
"""
import bpy
import os
import sys
import time
from math import cos, sin, radians

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.argv_backup = list(sys.argv)
import lib  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
MODE = ARGS[0] if ARGS else "preview"
OUT = os.path.join(lib.WORK, "beliefs")
os.makedirs(OUT, exist_ok=True)

import importlib.util  # noqa: E402

_spec = importlib.util.spec_from_file_location("hub_stack_helpers", os.path.join(os.path.dirname(os.path.abspath(__file__)), "hub_stack.py"))
sys.argv = ["x", "--", "preview"]
h = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(h)
sys.argv = sys.argv_backup

N = h.N
FRAMES = 96
# The page draws this full-bleed under the header (top ~8%) and above the caption plate (bottom ~35%), so the stack is pulled
# back and shifted up to sit in the free band. dist= and shift= tune that; both are measured with web/scripts (bbox of the last frame).
DIST = 78.0
SHIFT = -0.13
for a in ARGS:
    if a.startswith("frames="):
        FRAMES = int(a[7:])
    if a.startswith("dist="):
        DIST = float(a[5:])
    if a.startswith("shift="):
        SHIFT = float(a[6:])


def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def seg(t, a, b):
    return smooth((t - a) / (b - a))


def pose(sc, glows, cam, mid, t):
    """t in 0..1 over the whole sequence."""
    # 1) the layers open: from nearly stacked to the full spacing, done by 55%
    open_ = seg(t, 0.02, 0.55)
    pitch = 0.9 + (h.PITCH - 0.9) * open_
    for k in range(N):
        dz = (N - 1 - k) * (pitch - h.PITCH)
        for name in (f"plate{k}", f"groove{k}", f"inlay{k}"):
            ob = bpy.data.objects.get(name)
            if ob is not None:
                ob.location.z = dz
    # 2) they light from the bottom up, each with its own colour, all lit by the end
    for k in range(N):
        start = 0.42 + 0.075 * (N - 1 - k)
        lit = seg(t, start, start + 0.1)
        h.set_glow(glows[k][0], 1.0 * lit)
        h.set_glow(glows[k][1], 0.35 + 0.65 * lit)
    # 3) the camera swings round from the side and above to the front angle used on the page
    swing = seg(t, 0.0, 0.92)
    az = 30.0 + (1.0 - swing) * 130.0
    el = 27.0 + (1.0 - swing) * 22.0
    dist = DIST + (1.0 - swing) * 4.0
    top = (N - 1) * (pitch) / 2.0
    h.aim(cam, (0.0, 0.0, top + 0.4), az, el, dist, 70.0)
    # A wide frame would otherwise take its field of view from the width and crop the tall stack: fix it to the height.
    cam.data.sensor_fit = 'VERTICAL'
    cam.data.sensor_height = 36
    cam.data.shift_y = SHIFT


def main():
    t0 = time.time()
    sc, glows, mid = h.build()
    # A tall crop, not a wide frame: the stack only fills the middle fifth of a 16:9 canvas, and the page draws this
    # fitted to the canvas height. The vertical field of view is fixed in pose(), so the crop only trims the black sides.
    size = (1000, 1400)
    samples = 40
    which = None
    explicit = False
    for a in ARGS:
        if a.startswith("size="):
            size = tuple(int(v) for v in a[5:].split("x"))
            explicit = True
        if a.startswith("samples="):
            samples = int(a[8:])
    nums = [a for a in ARGS[1:] if a.isdigit()]
    if MODE == "preview":
        if not explicit:
            size = (500, 700)
        samples = 16
        which = list(range(0, FRAMES, 12)) + [FRAMES - 1]
    elif "all" in ARGS:
        which = list(range(FRAMES))
    elif len(nums) == 2:
        which = list(range(int(nums[0]), int(nums[1])))
    else:
        which = list(range(FRAMES))
    cam = h.setup_render(sc, size[0], size[1], samples)
    for f in which:
        t = f / (FRAMES - 1)
        pose(sc, glows, cam, mid, t)
        path = os.path.join(OUT, "%s_%04d.png" % ("prev" if MODE == "preview" else "raw", f + 1))
        sc.render.filepath = path
        t1 = time.time()
        bpy.ops.render.render(write_still=True)
        print("frame %d/%d -> %s (%.1fs)" % (f + 1, FRAMES, os.path.basename(path), time.time() - t1))
    print("done in %.1fs" % (time.time() - t0))


if __name__ == "__main__":
    main()
