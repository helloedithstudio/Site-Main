"""Object 8 - RFC scroll (decisions-rfc). Parchment scroll hanging portrait, rolled ends with rod finials, wavy solid sheet,
raised wax seal with a tick ("the vote passed"), engraved text rows (normal map), faint fibre.

Front faces -Y, +Z up in Blender. Footprint ~0.65, longest side 11.
"""
import sys
sys.path.insert(0, r"D:\page_content\blender\scripts")
from bake import *

ZR = 4.5           # roll centres at z = +-ZR
ROLL_R = 0.95
ROLL_HL = 2.55     # roll half length
SHEET_HW = 2.3     # sheet half width
SHEET_HT = 0.25    # sheet half thickness
WAVE = 0.32
SEAL = (0.95, -2.15, 0.8)   # x, z, radius


def wave(z):
    return WAVE * np.sin(2 * pi * (z + ZR) / (2 * ZR))


def base_sdf(P):
    x, y, z = P[..., 0], P[..., 1], P[..., 2]
    ax = np.abs(x)
    yw = wave(np.clip(z, -ZR, ZR))
    # sheet slab with rounded edges, following the S-wave
    d2 = sd_rbox2(x, z, 0.0, 0.0, SHEET_HW, ZR, 0.15)
    sheet = extrude_round(d2, y - yw, SHEET_HT, 0.2)
    # rolled side edges: a bead along each edge
    bead = np.hypot(ax - SHEET_HW, y - yw) - 0.34
    bead = np.maximum(bead, np.abs(z) - ZR)
    d = smin(sheet, bead, 0.2)
    # rolls (cylinders along X), rod + knob finials
    for zc in (ZR, -ZR):
        roll = extrude_round(np.hypot(y, z - zc) - ROLL_R, x, ROLL_HL, 0.3)
        rod = extrude_round(np.hypot(y, z - zc) - 0.4, ax - 2.75, 0.45, 0.15)
        knob = np.sqrt((ax - 3.0) ** 2 + y ** 2 + (z - zc) ** 2) - 0.58
        d = smin(d, roll, 0.4)
        d = smin(d, rod, 0.2)
        d = smin(d, knob, 0.2)
    # wax seal: scalloped disc with a domed face, 0.2 proud of the sheet at the rim and 0.4 at the centre
    sx, sz, sr = SEAL
    th = np.arctan2(z - sz, x - sx)
    dseal = np.hypot(x - sx, z - sz) - sr * (1 + 0.06 * np.sin(10 * th))
    yf = wave(sz) - SHEET_HT
    slab = extrude_round(dseal, y - (yf - 0.175), 0.275, 0.12)
    rs = 1.7
    dome = np.sqrt((x - sx) ** 2 + (y - (yf - 0.4 + rs)) ** 2 + (z - sz) ** 2) - rs
    return smin(d, smax(slab, dome, 0.06), 0.15)


def engraving(P):
    """Groove depth (>= 0) for the bake source: text rows, title, frame, signature, tick in the seal, roll bands, fibre."""
    x, y, z = P[..., 0], P[..., 1], P[..., 2]
    yw = wave(np.clip(z, -ZR, ZR))
    rel = y - yw
    on_sheet = smoothstep(0.12, 0.24, np.abs(rel)) * (np.abs(x) < 2.05) * (np.abs(z) < 3.25)
    front = (rel < 0)
    line = lambda z0, hw: np.exp(-((z - z0) / hw) ** 2)
    span = lambda a, b: smoothstep(a - 0.05, a + 0.05, x) * (1 - smoothstep(b - 0.05, b + 0.05, x))
    g_front = np.zeros_like(x)
    g_front += 1.3 * line(2.8, 0.1) * span(-1.25, 1.25)                       # title
    ends = [1.75, 1.6, 1.75, 1.3, 1.75, 1.7, 1.15]
    for k, xe in enumerate(ends):                                              # body rows
        g_front += line(2.3 - 0.36 * k, 0.065) * span(-1.75, xe)
    g_front += line(-0.35, 0.065) * span(-1.75, 0.15)                          # closing rows above the seal
    g_front += line(-0.71, 0.065) * span(-1.75, -0.4)
    g_front += 1.1 * line(-2.75, 0.07) * span(-1.7, -0.45)                     # signature line
    frame = (np.exp(-((np.abs(x) - 1.98) / 0.05) ** 2) * (np.abs(z) < 3.2)
             + np.exp(-((np.abs(z) - 3.15) / 0.05) ** 2) * (np.abs(x) < 2.03))
    g_front += 0.9 * frame
    # back: fuller rows, a lighter frame
    g_back = np.zeros_like(x)
    for k in range(9):
        g_back += line(2.65 - 0.4 * k, 0.065) * span(-1.7, 1.7 if k % 3 != 2 else 0.8)
    g_back += 0.9 * frame
    g = on_sheet * np.where(front, g_front, g_back)
    # tick mark engraved into the seal face
    sx, sz, sr = SEAL
    seal_face = (np.hypot(x - sx, z - sz) < sr - 0.15) * smoothstep(0.12, 0.18, (wave(sz) - SHEET_HT) - y)
    tick = np.minimum(sd_seg2(x, z, sx - 0.42, sz + 0.02, sx - 0.12, sz - 0.3, 0.075),
                      sd_seg2(x, z, sx - 0.12, sz - 0.3, sx + 0.42, sz + 0.34, 0.075))
    g += 1.4 * seal_face * smoothstep(0.03, -0.02, tick)
    # decorative bands round the rolls
    for zc in (ZR, -ZR):
        roll_face = np.exp(-((np.hypot(y, z - zc) - ROLL_R) / 0.2) ** 2)
        for xb in (1.95, 2.15):
            g += 0.8 * roll_face * np.exp(-((np.abs(x) - xb) / 0.05) ** 2)
    fibre = 0.5 * (np.sin(23.1 * x + 7.7 * np.sin(3.1 * z)) + np.sin(17.3 * z + 5.3 * np.sin(2.7 * x)))
    return 0.055 * g + 0.006 * fibre * smoothstep(0.12, 0.24, np.abs(rel))


def high_sdf(P):
    return base_sdf(P) + engraving(P)


LO, HI = (-3.85, -1.4, -5.75), (3.85, 1.4, 5.75)


def build(cell_low=0.12, target_tris=5400, cell_high=0.042):
    fresh()
    low = sdf_to_object("rfc_low", base_sdf, LO, HI, cell_low)
    print("RFC raw", tri_count(low))
    laplacian(low, 0.5, 2)
    triangulate(low)
    decimate_safe(low, target_tris)
    print("RFC low", tri_count(low))
    high = sdf_highpoly("rfc_high", high_sdf, LO, HI, cell_high, smooth_iters=1)
    return low, high


if __name__ == "__main__":
    low, high = build()
    S = 11.0 / (2 * (ZR + ROLL_R))     # normalisation scale applied to both meshes
    mid = lambda z: S * wave(np.clip(z / S, -ZR, ZR))
    finalize_baked(low, high, "decisions-rfc", "decisions-rfc.glb", 2048, sharp=50, tilt_x=0.0, roll=-17.0, size=11.0, mid=mid)
