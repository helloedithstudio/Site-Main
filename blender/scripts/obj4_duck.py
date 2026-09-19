import sys
sys.path.insert(0, r"D:\page_content\blender\scripts")
from lib import *


def duck_sdf(P):
    E = sd_ellipsoid
    body = E(P, (0, 0.6, 2.9), (4.0, 3.7, 2.9))
    chest = E(P, (0, -1.6, 3.6), (3.2, 2.5, 2.7))
    neck = E(P, (0, -1.9, 5.4), (2.4, 2.1, 2.0))
    head = E(P, (0, -2.0, 7.4), (2.9, 2.7, 2.55))
    tail = E(P, (0, 3.2, 4.5), (1.5, 2.2, 1.3), rot=rot_x(38))
    wl = E(P, (3.4, 0.6, 3.3), (0.85, 2.6, 1.6))
    wr = E(P, (-3.4, 0.6, 3.3), (0.85, 2.6, 1.6))
    beak_u = E(P, (0, -4.8, 7.1), (2.1, 1.8, 0.8))
    beak_l = E(P, (0, -4.5, 6.45), (1.7, 1.45, 0.5))
    eye_l = E(P, (1.5, -3.85, 8.1), (0.75, 0.75, 0.75))
    eye_r = E(P, (-1.5, -3.85, 8.1), (0.75, 0.75, 0.75))
    collar = sd_torus_z(P, (0, -1.9, 5.0), 2.6, 0.42)

    d = smin(body, chest, 1.4)
    d = smin(d, neck, 1.3)
    d = smin(d, head, 1.1)
    d = smin(d, tail, 1.3)
    d = smin(d, wl, 0.9)
    d = smin(d, wr, 0.9)
    d = smin(d, beak_u, 0.5)
    d = smin(d, beak_l, 0.4)
    d = smin(d, collar, 0.3)
    d = smin(d, eye_l, 0.2)
    d = smin(d, eye_r, 0.2)
    return d


def build(cell=0.13, target_tris=4200):
    fresh()
    ob = sdf_to_object("duck", duck_sdf, (-5.6, -8.2, -0.8), (5.6, 7.2, 11.4), cell)
    print("DUCK raw", tri_count(ob))
    laplacian(ob, 0.5, 4)
    triangulate(ob)
    decimate_safe(ob, target_tris)
    print("DUCK decimated", tri_count(ob))
    return ob


if __name__ == "__main__":
    ob = build()
    finalize(ob, "loop-4-unstuck", "loop-4-unstuck.glb", tilt_x=11.5, sharp=55)
