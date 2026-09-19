import sys
sys.path.insert(0, r"D:\page_content\blender\scripts")
from lib import *

S, RH, WN, DH = 5.2, 1.25, 0.62, 1.7      # piece size, knob head radius, neck half width, head offset
HALF_T = 1.7                              # half thickness (2.9 thick)
EDGE_R = 1.25                              # edge rounding radius (soft, cast-bronze bevel)
TWIST = 30.0                               # piece B is turned 30 degrees against piece A
DEPTH = 1.5                                # ...and offset in depth
ROLL = -16.0


def piece2d(x, z, feats, rc=0.7, kf=0.42):
    d = sd_rbox2(x, z, S / 2, S / 2, S / 2, S / 2, rc)
    for side, kind, c in feats:
        E = {'R': (S, c * S), 'L': (0.0, c * S), 'T': (c * S, S), 'B': (c * S, 0.0)}[side]
        o = {'R': (1, 0), 'L': (-1, 0), 'T': (0, 1), 'B': (0, -1)}[side]
        sgn = 1 if kind == 'knob' else -1
        H = (E[0] + o[0] * DH * sgn, E[1] + o[1] * DH * sgn)
        back = (E[0] - o[0] * 0.7 * sgn, E[1] - o[1] * 0.7 * sgn)
        head = sd_circle2(x, z, H[0], H[1], RH)
        neck = sd_seg2(x, z, back[0], back[1], H[0], H[1], WN)
        feat = smin(head, neck, kf)
        d = smin(d, feat, kf) if kind == 'knob' else smax(d, -feat, kf)
    return d


A_FEATS = [('R', 'knob', 0.5), ('T', 'sock', 0.42)]
B_FEATS = [('L', 'sock', 0.5), ('B', 'knob', 0.62)]
K = (S + DH, 0.5 * S)                       # knob head centre of A (world)
HB = (DH, 0.5 * S)                          # socket head centre of B (its own frame)


def pair_sdf(P, roll=ROLL):
    x, y, z = P[..., 0], P[..., 1], P[..., 2]
    x, z = rot2(x, z, roll, K[0], K[1])
    dA = extrude_round(piece2d(x, z, A_FEATS), y, HALF_T, EDGE_R)
    bx, bz = rot2(x, z, TWIST, K[0], K[1])
    bx = bx + HB[0]
    bz = bz + HB[1]
    dB = extrude_round(piece2d(bx, bz, B_FEATS), y - DEPTH, HALF_T, EDGE_R)
    return smin(dA, dB, 0.3)


def build(cell=0.14, target_tris=4200):
    fresh()
    roll = ROLL
    fn = lambda P: pair_sdf(P, roll)
    lo, hi = sdf_extent(fn, (-14, -4, -14), (22, 4, 22), 0.5)
    ob = sdf_to_object("jigsaw", fn, lo - 1.0, hi + 1.0, cell)
    print("JIGSAW raw", tri_count(ob))
    laplacian(ob, 0.5, 3)
    triangulate(ob)
    decimate_safe(ob, target_tris)
    return ob


if __name__ == "__main__":
    ob = build()
    finalize(ob, "loop-2-crew", "loop-2-crew.glb", tilt_x=11.5, sharp=55)
