"""Object 7 - pull-request glyph (membership-pr). Cast-bronze branch-and-merge sculpture, portrait ~0.75.

Front faces -Y, +Z up in Blender. Left: two rings joined by a fluted bar. Right: a ring at the bottom, a bar that rises,
curves left and ends in a chunky arrowhead pointing at the left bar.
"""
import sys
sys.path.insert(0, r"D:\page_content\blender\scripts")
from bake import *

XL, XR = -2.15, 2.15
ZT, ZB = 3.4, -3.4
RING_R = 1.05      # ring centre-line radius
W = 0.55           # in-plane half width of every bar / ring tube
HD = 0.85          # half depth -> total depth 1.7
ER = 0.5           # rounding of the profile edges
ARC_C = (XR - 1.6, -1.0)   # centre of the 90 degree bend, radius 1.6
ARROW_Z = ARC_C[1] + 1.6


def shape2(x, z):
    ring = lambda cx, cz: np.abs(sd_circle2(x, z, cx, cz, RING_R)) - W
    d = np.minimum(np.minimum(ring(XL, ZT), ring(XL, ZB)), ring(XR, ZB))
    bar_l = sd_seg2(x, z, XL, ZT - RING_R, XL, ZB + RING_R, W)
    d = smin(d, bar_l, 0.35)
    bar_r = sd_seg2(x, z, XR, ZB + RING_R, XR, ARC_C[1], W)
    d = smin(d, bar_r, 0.35)
    n = 14
    for k in range(n):
        a0, a1 = pi / 2 * k / n, pi / 2 * (k + 1) / n
        p0 = (ARC_C[0] + 1.6 * cos(a0), ARC_C[1] + 1.6 * sin(a0))
        p1 = (ARC_C[0] + 1.6 * cos(a1), ARC_C[1] + 1.6 * sin(a1))
        d = np.minimum(d, sd_seg2(x, z, p0[0], p0[1], p1[0], p1[1], W))
    head = sd_tri2(x, z, (0.35, ARROW_Z + 1.25), (0.35, ARROW_Z - 1.25), (-1.95, ARROW_Z), 0.35)
    return smin(d, head, 0.3)


def base_sdf(P):
    x, y, z = P[..., 0], P[..., 1], P[..., 2]
    return extrude_round(shape2(x, z), y, HD, ER)


def engraving(P):
    """Groove depth (>= 0) for the high-poly bake source: rim lines on the rings, fluting on the bars, a spine on the arrow."""
    x, y, z = P[..., 0], P[..., 1], P[..., 2]
    face = smoothstep(0.45, 0.72, np.abs(y))
    g = np.zeros_like(x)
    for (cx, cz) in ((XL, ZT), (XL, ZB), (XR, ZB)):
        rho = np.hypot(x - cx, z - cz)
        g += np.exp(-((rho - RING_R) / 0.07) ** 2)
        g += 0.8 * np.exp(-((rho - (RING_R - 0.3)) / 0.045) ** 2)
        g += 0.8 * np.exp(-((rho - (RING_R + 0.3)) / 0.045) ** 2)
    left = smoothstep(-1.75, -1.35, z) * (1 - smoothstep(1.35, 1.75, z))
    right = smoothstep(-1.75, -1.5, z) * (1 - smoothstep(-1.25, -1.05, z))
    for o in (-0.28, 0.0, 0.28):
        g += left * np.exp(-((x - XL - o) / 0.06) ** 2)
        g += right * np.exp(-((x - XR - o) / 0.06) ** 2)
    spine = smoothstep(-0.9, -0.5, x) * (1 - smoothstep(-0.05, 0.25, x))
    g += 0.9 * spine * np.exp(-((z - ARROW_Z) / 0.06) ** 2)
    return 0.06 * g * face


def high_sdf(P):
    return base_sdf(P) + engraving(P)


LO, HI = (-3.95, -1.15, -5.15), (3.95, 1.15, 5.15)


def build(cell_low=0.14, target_tris=4700, cell_high=0.04):
    fresh()
    low = sdf_to_object("pr_low", base_sdf, LO, HI, cell_low)
    print("PR raw", tri_count(low))
    laplacian(low, 0.5, 3)
    triangulate(low)
    decimate_safe(low, target_tris)
    print("PR low", tri_count(low))
    high = sdf_highpoly("pr_high", high_sdf, LO, HI, cell_high)
    return low, high


if __name__ == "__main__":
    low, high = build()
    finalize_baked(low, high, "membership-pr", "membership-pr.glb", 1024, sharp=50, tilt_x=0.0, roll=-17.0)
