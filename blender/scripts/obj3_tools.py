import sys
sys.path.insert(0, r"D:\page_content\blender\scripts")
from lib import *

YW, YH = -0.55, 0.45          # depth offsets: wrench in front of the hammer


def sd_seg3(P, a, b, r):
    a = np.array(a, dtype=np.float32)
    b = np.array(b, dtype=np.float32)
    pa = P - a
    ba = b - a
    t = np.clip((pa @ ba) / float(ba @ ba), 0.0, 1.0)
    return np.linalg.norm(pa - t[..., None] * ba, axis=-1) - r


def wrench2d(u, z):
    handle = sd_seg2(u, z, 0, -5.4, 0, 5.4, 0.95)
    head_t = sd_circle2(u, z, 0, 6.1, 2.6)
    head_b = sd_circle2(u, z, 0, -6.1, 2.25)
    d = smin(handle, head_t, 0.9)
    d = smin(d, head_b, 0.9)
    slot = smin(sd_circle2(u, z, 0, 6.4, 1.0), sd_rbox2(u, z, 0, 8.3, 1.0, 2.0, 0.05), 0.2)   # open jaw
    d = smax(d, -slot, 0.6)
    d = smax(d, -sd_hex2(u, z, 0, -6.1, 1.25), 0.2)                                              # box-end hex
    return d


def hammer_head2d(v, z):
    neck = sd_rbox2(v, z, 0.0, 5.2, 1.35, 1.45, 0.5)
    face = sd_rbox2(v, z, -2.6, 5.2, 1.45, 1.6, 0.5)
    d = smin(neck, face, 0.4)
    # claw: curved tapering wedge sweeping down and back
    for k in range(9):
        t = k / 8
        y = 0.8 + (5.3 - 0.8) * t
        zc = 5.2 - 1.7 * t * t - 0.6 * t
        r = 1.4 * (1 - t) + 0.75 * t
        d = smin(d, sd_circle2(v, z, y, zc, r), 0.25)
    return d


def tools_sdf(P):
    x, y, z = P[..., 0], P[..., 1], P[..., 2]
    # wrench: long axis rotated +45 deg in the front plane, broad face toward the camera
    u, zw = rot2(x, z, 45.0)
    dW = extrude_round(wrench2d(u, zw), y - YW, 0.85, 0.5)
    # hammer: long axis -45 deg, turned 90 degrees about its own axis (head axis along depth)
    uh, zh = rot2(x, z, -45.0)
    vh = y - YH
    dHead = extrude_round(hammer_head2d(vh, zh), uh, 1.3, 0.6)
    Q = np.stack([uh, vh, zh], axis=-1)
    dHandle = sd_seg3(Q, (0, 0, -7.0), (0, 0, 4.0), 0.85)
    dButt = np.linalg.norm(Q - np.array([0, 0, -7.0], dtype=np.float32), axis=-1) - 1.25
    dH = smin(smin(dHandle, dButt, 0.5), dHead, 0.45)
    return smin(dW, dH, 0.8)


def build(cell=0.16, target_tris=4000):
    fresh()
    lo, hi = sdf_extent(tools_sdf, (-12, -8, -12), (12, 8, 12), 0.5)
    print("TOOLS extent", lo, hi)
    ob = sdf_to_object("tools", tools_sdf, lo - 1.0, hi + 1.0, cell)
    print("TOOLS raw", tri_count(ob))
    laplacian(ob, 0.5, 2)
    decimate_safe(ob, target_tris)
    return ob


if __name__ == "__main__":
    ob = build()
    finalize(ob, "loop-3-build", "loop-3-build.glb", tilt_x=11.5, sharp=55)
