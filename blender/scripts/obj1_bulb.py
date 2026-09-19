import sys
sys.path.insert(0, r"D:\page_content\blender\scripts")
from lib import *


def bezier(p0, p1, p2, p3, n):
    out = []
    for k in range(n + 1):
        t = k / n
        u = 1 - t
        out.append((u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
                    u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1]))
    return out


def build(SEG=28):
    fresh()
    # ---- glass: pear silhouette, a solid cast form
    Rg, zc = 3.1, 7.1
    neck = bezier((1.85, 3.95), (1.9, 5.2), (3.1, 5.0), (3.1, zc), 10)
    dome = [(Rg * cos(a), zc + Rg * sin(a)) for a in [k * (pi / 2) / 8 for k in range(1, 9)]]
    dome[-1] = (0.0, zc + Rg)

    # ---- base + collar as one lathe (bottom pole first)
    base_pts = [
        (0.0, 0.0), (1.1, 0.0), (1.1, 0.4), (1.5, 0.4), (1.5, 0.8),
        (1.7, 0.8), (1.7, 3.3),
        (2.3, 3.3), (2.3, 3.95), (1.85, 3.95),
    ]
    base_rad = [0, 0.3, 0.12, 0.1, 0.1, 0.1, 0.1, 0.12, 0.24, 0.1]
    base = fillet_poly(base_pts, base_rad, n=3)
    prof = base[:-1] + neck + dome
    body = lathe("bulb", prof, SEG)

    # ---- screw thread: helical ridge on the base cylinder
    turns, z0, z1 = 2.6, 1.1, 3.05
    steps = int(turns * 14)
    path = []
    for k in range(steps + 1):
        t = k / steps
        a = 2 * pi * turns * t
        path.append((1.82 * cos(a), 1.82 * sin(a), z0 + (z1 - z0) * t))
    thr = sweep("thread", path, lambda t, th: 0.35 * (0.55 + 0.45 * min(1.0, 5 * t, 5 * (1 - t))), sides=8)

    # ---- filament: raised spiral bead following the glass surface
    def surf_r(z):
        if z <= zc:
            return min(neck, key=lambda p: abs(p[1] - z))[0]
        return sqrt(max(Rg * Rg - (z - zc) ** 2, 0.0))

    turns2, za, zb = 2.3, 5.3, 9.6
    steps2 = int(turns2 * 16)
    path2 = []
    for k in range(steps2 + 1):
        t = k / steps2
        a = 2 * pi * turns2 * t + 0.6
        z = za + (zb - za) * t
        r = surf_r(z) - 0.06
        path2.append((r * cos(a), r * sin(a), z))
    fil = sweep("filament", path2, lambda t, th: 0.33 * (0.5 + 0.5 * min(1.0, 6 * t, 6 * (1 - t))), sides=6)

    union_all([body, thr, fil])
    return body


if __name__ == "__main__":
    ob = build()
    finalize(ob, "loop-1-pitch", "loop-1-pitch.glb", tilt_x=11.5)
