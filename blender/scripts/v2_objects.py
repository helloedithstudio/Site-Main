"""edith 3D objects, second set: hard-surface dev gear (brief: web/docs/edith-3d-brief-v2.md).

    D:\\blender\\blender.exe -b --factory-startup -P v2_objects.py -- 1 2 3     (build objects 1, 2 and 3)
    D:\\blender\\blender.exe -b --factory-startup -P v2_objects.py             (build all eight)

Same engine contract as v1 (lib.finalize): +Z up, front faces -Y, longest of X and Z = 10, one closed shell,
POSITION / NORMAL / TEXCOORD_0 only. No baked maps: the finish comes from clean chamfers under the site matcap.
"""
import sys
sys.path.insert(0, r"D:\page_content\blender\scripts")
from lib import *


def bezier(p0, p1, p2, p3, n):
    """Points on a cubic Bezier curve (2D), n segments."""
    out = []
    for k in range(n + 1):
        t = k / n
        u = 1 - t
        out.append((u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
                    u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1]))
    return out


# ------------------------------------------------------------------ helpers
def cyl_y(name, r, y0, y1, x=0.0, z=0.0, seg=24, cham=0.0):
    """Cylinder along Y from y0 to y1 at (x, z), optional end chamfer."""
    h = (y1 - y0) / 2.0
    if cham > 0:
        prof = [(0, -h), (r - cham, -h), (r, -h + cham), (r, h - cham), (r - cham, h), (0, h)]
    else:
        prof = [(0, -h), (r, -h), (r, h), (0, h)]
    o = lathe(name, prof, seg)
    transform(o, rot=(90, 0, 0))
    transform(o, loc=(x, (y0 + y1) / 2.0, z))
    return o


def cyl_z(name, r, z0, z1, x=0.0, y=0.0, seg=24):
    o = lathe(name, [(0, z0), (r, z0), (r, z1), (0, z1)], seg)
    transform(o, loc=(x, y, 0))
    return o


def cut(a, b):
    return boolean(a, b, 'DIFFERENCE')


def gear_pts(cx, cz, R, N, phase, tip=0.42, root=0.42, tip_hw=0.26, root_hw=0.62):
    hp = pi / N
    pts = []
    for k in range(N):
        t = phase + 2 * hp * k
        def P(rad, ang):
            return (cx + rad * cos(ang), cz + rad * sin(ang))
        pts += [P(R - root, t - root_hw * hp), P(R + tip, t - tip_hw * hp), P(R + tip, t + tip_hw * hp),
                P(R - root, t + root_hw * hp), P(R - root, t + hp)]
    return pts


# ------------------------------------------------------------------ 1 pitch it: faceted bulb on a threaded base
def build_bulb():
    fresh()
    g = [(0, 1.3), (1.55, 1.3), (1.62, 1.7), (2.15, 2.35), (2.85, 3.3), (3.15, 4.55), (2.95, 5.75),
         (2.2, 6.85), (1.1, 7.45), (0, 7.6)]
    glass = lathe("glass", g, 8)
    transform(glass, rot=(0, 0, 22.5))
    bevel_sharp(glass, 0.1, 1, concave_angle=40, convex_angle=30)
    base = [(0, -0.6), (0.7, -0.6), (0.85, -0.45), (0.85, 0.05), (1.3, 0.05), (1.3, 0.18), (1.7, 0.3), (1.7, 0.55),
            (1.4, 0.65), (1.4, 0.85), (1.7, 0.98), (1.7, 1.25), (1.45, 1.4), (0, 1.4)]
    collar = lathe("collar", base, 32)
    bevel_sharp(collar, 0.06, 1, concave_angle=40, convex_angle=60)
    return union_all([collar, glass])


# ------------------------------------------------------------------ 2 find your crew: two meshing gears
def build_gears():
    fresh()
    Ra, Na, Rb, Nb = 3.6, 14, 2.6, 10
    ang = radians(35)
    d = Ra + Rb - 0.1
    bx, bz = d * cos(ang), d * sin(ang)
    hpb = pi / Nb
    A = extrude_outline("gearA", gear_pts(0, 0, Ra, Na, ang), 1.8)
    B = extrude_outline("gearB", gear_pts(bx, bz, Rb, Nb, ang + pi + hpb), 1.5)
    parts = [A, B, cyl_y("hubA", 1.45, -1.2, 1.2, 0, 0, 24, 0.15), cyl_y("hubB", 1.1, -1.0, 1.0, bx, bz, 24, 0.12)]
    r = union_all(parts)
    cut(r, cyl_y("holeA", 0.85, -2, 2, 0, 0, 24))
    cut(r, cyl_y("holeB", 0.62, -2, 2, bx, bz, 24))
    for k in range(5):     # lightening holes in the big gear
        a = radians(72 * k + 10)
        cut(r, cyl_y("l%d" % k, 0.5, -2, 2, 2.2 * cos(a), 2.2 * sin(a), 12))
    for k in range(4):
        a = radians(90 * k + 20)
        cut(r, cyl_y("m%d" % k, 0.34, -2, 2, bx + 1.6 * cos(a), bz + 1.6 * sin(a), 8))
    bevel_sharp(r, 0.1, 1, concave_angle=60, convex_angle=50)
    return r


# ------------------------------------------------------------------ 3 build in public: CPU package
def build_chip():
    fresh()
    body = box("body", (7.4, 1.2, 7.4))
    bevel_sharp(body, 0.22, 2)
    hs = box("hs", (5.2, 0.5, 5.2), center=(0, -0.75, 0))
    bevel_sharp(hs, 0.16, 2)
    outer = box("o", (4.2, 0.4, 4.2), center=(0, -1.0, 0))
    inner = box("i", (3.7, 0.6, 3.7), center=(0, -1.0, 0))
    cut(outer, inner)
    cut(hs, outer)
    cut(hs, cyl_y("die", 1.05, -1.3, -0.8, 0, 0, 32))
    cut(hs, cyl_y("dot", 0.22, -1.3, -0.85, -2.2, 2.2, 16))        # pin one mark
    parts = [body, hs]
    n, pitch, w, L, t = 8, 0.82, 0.44, 1.15, 0.42
    for side in range(4):
        pins = []
        for i in range(n):
            p = (i - (n - 1) / 2) * pitch
            c = 3.7 + L / 2 - 0.15
            if side == 0:
                o = box("p", (w, t, L), center=(p, 0, c))
            elif side == 1:
                o = box("p", (w, t, L), center=(p, 0, -c))
            elif side == 2:
                o = box("p", (L, t, w), center=(c, 0, p))
            else:
                o = box("p", (L, t, w), center=(-c, 0, p))
            bevel_sharp(o, 0.05, 1)
            pins.append(o)
        parts.append(join(pins, "pins%d" % side))
    return union_all(parts)


# ------------------------------------------------------------------ 4 get unstuck: open padlock
def build_lock():
    fresh()
    W, H, D = 6.6, 5.4, 2.6
    body = box("body", (W, D, H), center=(0, 0, H / 2))
    bevel_sharp(body, 0.38, 3)
    cut(body, box("plate", (W - 1.5, 0.3, H - 1.5), center=(0, -D / 2 + 0.05, H / 2)))
    cut(body, cyl_y("key", 0.62, -D / 2 - 0.2, -0.4, 0, 3.1, 24))
    cut(body, box("slot", (0.56, 0.9, 1.7), center=(0, -D / 2 + 0.25, 2.1)))
    cut(body, cyl_z("hole", 0.78, H - 0.7, H + 0.2, 2.0, 0.0, 20))
    parts = [body]
    for sx in (-1, 1):
        for zz in (1.25, H - 1.25):
            parts.append(cyl_y("rv", 0.27, -D / 2 - 0.06, -D / 2 + 0.36, sx * 1.9, zz, 8))
    zc = 8.0
    path = [(-2.0, 0, 3.4), (-2.0, 0, 5.0), (-2.0, 0, zc)]
    for k in range(1, 13):
        a = pi - pi * k / 12.0
        path.append((2.0 * cos(a), 0, zc + 2.0 * sin(a)))
    path += [(2.0, 0, zc - 0.5), (2.0, 0, 6.7)]
    shackle = sweep("shackle", path, 0.56, sides=12)
    parts.append(shackle)
    parts.append(cyl_z("collar", 0.86, H - 0.1, H + 0.35, -2.0, 0.0, 16))
    return union_all(parts)


# ------------------------------------------------------------------ 5 ship it: crate with a raised frame and a big up arrow
def build_crate():
    fresh()
    S = 7.4
    D = S * 0.86
    fy = -D / 2.0                                            # y of the crate front face
    body = box("crate", (S, D, S * 0.94))
    bevel_sharp(body, 0.42, 3)
    parts = [body]
    frame = box("frame", (S - 1.5, 0.34, S * 0.94 - 1.5), center=(0, fy - 0.05, 0))
    inner = box("finner", (S - 2.3, 0.6, S * 0.94 - 2.3), center=(0, fy - 0.05, 0))
    cut(frame, inner)
    bevel_sharp(frame, 0.07, 1)
    parts.append(frame)
    arrow = extrude_outline("arrow", [(0, 2.0), (1.75, 0.1), (0.65, 0.1), (0.65, -1.9), (-0.65, -1.9), (-0.65, 0.1), (-1.75, 0.1)],
                            0.5, y0=fy - 0.02)
    bevel_sharp(arrow, 0.1, 2)
    parts.append(arrow)
    for sz in (-1, 1):                                       # slats on the top and bottom faces
        for k in (-1, 0, 1):
            sl = box("slat", (1.3, D + 0.3, 0.3), center=(k * 2.3, 0, sz * (S * 0.47 + 0.05)))
            bevel_sharp(sl, 0.06, 1)
            parts.append(sl)
    return union_all(parts)


# ------------------------------------------------------------------ 6 launch it: rocket
def build_rocket(SEG=10, tilt=35.0):
    fresh()
    Rb = 1.9
    nose = bezier((Rb, 6.6), (Rb, 8.4), (0.85, 9.7), (0.3, 10.5), 9)
    prof = [(0, 0.0), (1.5, 0.0), (1.5, 0.12), (0.95, 1.1), (0.95, 1.4), (1.5, 1.7), (Rb, 2.1), (Rb, 2.4),
            (Rb + 0.2, 2.4), (Rb + 0.2, 2.8), (Rb, 2.8), (Rb, 6.2), (Rb + 0.2, 6.2), (Rb + 0.2, 6.6), (Rb, 6.6)]
    prof += nose[1:] + [(0.0, 10.65)]
    body = lathe("rocket", prof, SEG)
    cut(body, lathe("nozzle", [(0, -0.2), (1.05, -0.2), (0.7, 0.55), (0, 0.55)], SEG))
    parts = [body, torus("bezel", 1.0, 0.3, 32, 10, center=(0, -1.72, 4.6))]
    fin_out = fillet_poly([(1.0, 4.9), (1.75, 4.9), (3.9, 1.1), (3.9, -0.5), (1.9, 0.35), (1.0, 0.35)],
                          [0, 0, 0.5, 0.5, 0.25, 0], n=2, closed=True)
    for k in range(4):
        fin = extrude_outline("fin%d" % k, fin_out, 0.7)
        transform(fin, rot=(0, 0, 45 + 90 * k))
        parts.append(fin)
    r = union_all(parts)
    cut(r, cyl_y("port", 0.6, -2.6, -1.62, 0, 4.6, 24))
    bevel_sharp(r, 0.13, 1, concave_angle=50, convex_angle=34)
    transform(r, rot=(0, tilt, 0))
    return r


# ------------------------------------------------------------------ 7 membership: pull request glyph in machined parts
def hex_nut(name, x, z, R=1.9, r=0.85, t=1.8):
    """Hex nut: the chamfer is part of the revolved profile, so it cuts the hexagon corners like a real nut."""
    h = t / 2
    prof = [(0, -h), (R - 0.5, -h), (R + 0.03, -h + 0.5), (R + 0.03, h - 0.5), (R - 0.5, h), (0, h)]
    o = lathe(name, prof, 6)
    transform(o, rot=(90, 0, 0))
    cut(o, cyl_y("h", r, -3, 3, 0, 0, 24))
    transform(o, loc=(x, 0, z))
    return o


def build_pr():
    """Git merge glyph: two nodes on top, one below, the right branch curving into the left rod."""
    fresh()
    ax, top, bot, cx, rr = -2.2, 3.2, -3.2, 2.2, 0.62
    parts = [hex_nut("A", ax, top), hex_nut("B", ax, bot), hex_nut("C", cx, top)]
    parts.append(sweep("rodAB", [(ax, 0, top - 1.35), (ax, 0, 0.0), (ax, 0, bot + 1.35)], rr, sides=8))
    z0, R2 = 1.6, 2.0
    path = [(cx, 0, top - 1.35), (cx, 0, z0)]
    for k in range(1, 9):
        t = -radians(90.0 * k / 8)
        path.append((cx - R2 + R2 * cos(t), 0, z0 + R2 * sin(t)))
    path += [(ax + 1.0, 0, z0 - R2), (ax, 0, z0 - R2)]
    parts.append(sweep("rodC", path, rr, sides=8))
    return union_all(parts)


# ------------------------------------------------------------------ 8 decisions: the RFC (document slab with a check badge)
def build_rfc():
    """Document slab. The details are mirrored onto the back face so the piece reads at every angle of its spin."""
    fresh()
    outline = [(-3.3, -4.4), (3.3, -4.4), (3.3, 2.9), (1.9, 4.4), (-3.3, 4.4)]
    slab = extrude_outline("slab", outline, 1.0)
    bevel_sharp(slab, 0.2, 3)
    parts = [slab]
    front = []
    flap = extrude_outline("flap", [(1.9, 4.4), (1.9, 2.9), (3.3, 2.9)], 0.4, y0=-0.55)
    bevel_sharp(flap, 0.06, 1)
    front.append(flap)

    def bar(w, z, h=0.36, x0=-2.7):
        b = box("bar", (w, 0.3, h), center=(x0 + w / 2, -0.6, z))
        bevel_sharp(b, 0.07, 1)
        return b
    front.append(bar(3.6, 3.0, 0.62))
    for i, w in enumerate([5.4, 5.4, 4.7, 5.4]):
        front.append(bar(w, 1.55 - 0.95 * i))
    hexpts = [(1.55 + 1.25 * cos(radians(60 * k)), -3.05 + 1.25 * sin(radians(60 * k))) for k in range(6)]
    badge = extrude_outline("badge", hexpts, 0.5, y0=-0.65)
    bevel_sharp(badge, 0.1, 2, concave_angle=60, convex_angle=50)
    front.append(badge)
    for ang, ln, cxx, czz in ((48, 0.72, 1.175, -3.25), (-48, 1.55, 1.9, -2.95)):
        arm = box("arm", (ln, 0.6, 0.36))
        bevel_sharp(arm, 0.07, 1)
        transform(arm, rot=(0, ang, 0))
        transform(arm, loc=(cxx, -1.05, czz))
        front.append(arm)
    for p in front:
        q = p.copy()
        q.data = p.data.copy()
        link(q)
        transform(q, scale=(1, -1, 1))
        clean(q)
        parts.append(q)
    parts += front
    return union_all(parts)


BUILDS = {
    1: (build_bulb, "loop-1-pitch", dict(tilt_x=11.5, sharp=35)),
    2: (build_gears, "loop-2-crew", dict(tilt_x=11.5, sharp=35)),
    3: (build_chip, "loop-3-build", dict(tilt_x=11.5, sharp=35)),
    4: (build_lock, "loop-4-unstuck", dict(tilt_x=11.5, sharp=35)),
    5: (build_crate, "loop-5-ship", dict(tilt_x=11.5, sharp=35)),
    6: (build_rocket, "loop-6-launch", dict(tilt_x=11.5, sharp=34)),
    7: (build_pr, "membership-pr", dict(tilt_x=0.0, roll=17.2, sharp=40)),
    8: (build_rfc, "decisions-rfc", dict(tilt_x=0.0, roll=17.2, sharp=35)),
}


if __name__ == "__main__":
    args = [a for a in sys.argv[sys.argv.index("--") + 1:]] if "--" in sys.argv else []
    which = [int(a) for a in args] or sorted(BUILDS)
    for n in which:
        fn, key, kw = BUILDS[n]
        print("=== BUILD", n, key)
        ob = fn()
        finalize(ob, key, key + ".glb", tri_range=(300, 5000), **kw)
