import sys
sys.path.insert(0, r"D:\page_content\blender\scripts")
from lib import *


def lumpy(s1, s2, s3, a=0.13):
    return lambda th, ph: 1.0 + a * sin(2.3 * th + s1) * cos(1.7 * ph + s2) + 0.6 * a * sin(4.1 * th + s3) * cos(2.9 * ph)


def cloth(name, x0, zb, W, H, amp, waves, thick, notch, nu=22, nv=9):
    """Solid flag slab with a sculpted S-wave. Left edge at the pole (u=0)."""
    def pos(u, v):
        xe = W - notch * (1 - abs(2 * v - 1))
        x = x0 + u * xe
        ramp = min(1.0, max(u, 0.0) / 0.3) ** 1.5
        y = amp * ramp * sin(2 * pi * waves * u) + 0.25 * amp * u * (v - 0.5)
        z = zb + v * H - 0.35 * u * u * (1 - v) * 0.6
        return Vector((x, y, z))

    def normal(u, v):
        e = 1e-3
        du = (pos(u + e, v) - pos(u - e, v))
        dv = (pos(u, v + e) - pos(u, v - e))
        n = du.cross(dv)
        n.normalize()
        return n

    verts, faces = [], []
    idx = {}
    for side, sgn in (('f', -1), ('b', 1)):
        for j in range(nv + 1):
            for i in range(nu + 1):
                u, v = i / nu, j / nv
                p = pos(u, v) + normal(u, v) * (sgn * thick / 2)
                # the flag's normal faces -Y when u,v increase (x right, z up): sgn -1 = front
                idx[(side, i, j)] = len(verts)
                verts.append(tuple(p))
    for j in range(nv):
        for i in range(nu):
            a, b, c, d = (idx[('f', i, j)], idx[('f', i + 1, j)], idx[('f', i + 1, j + 1)], idx[('f', i, j + 1)])
            faces.append((a, b, c, d))
            a, b, c, d = (idx[('b', i, j)], idx[('b', i + 1, j)], idx[('b', i + 1, j + 1)], idx[('b', i, j + 1)])
            faces.append((d, c, b, a))
    for i in range(nu):   # bottom & top rims
        faces.append((idx[('f', i, 0)], idx[('b', i, 0)], idx[('b', i + 1, 0)], idx[('f', i + 1, 0)]))
        faces.append((idx[('f', i + 1, nv)], idx[('b', i + 1, nv)], idx[('b', i, nv)], idx[('f', i, nv)]))
    for j in range(nv):   # pole side & free end rims
        faces.append((idx[('f', 0, j + 1)], idx[('b', 0, j + 1)], idx[('b', 0, j)], idx[('f', 0, j)]))
        faces.append((idx[('f', nu, j)], idx[('b', nu, j)], idx[('b', nu, j + 1)], idx[('f', nu, j + 1)]))
    return clean(obj_from_pydata(name, verts, faces))


def rock(name, center, R, H, seed, seg=14, irr=0.13, prof=None):
    """A boulder-like lathe: stepped shoulders, radially irregular ring by ring."""
    prof = prof or [(0.0, 0.0), (0.98, 0.0), (1.02, 0.22), (0.94, 0.62), (0.74, 0.92), (0.42, 1.08), (0.0, 1.13)]
    verts, faces, rings = [], [], []
    for k, (rr, zz) in enumerate(prof):
        if rr < 1e-9:
            verts.append((center[0], center[1], center[2] + zz * H))
            rings.append([len(verts) - 1])
            continue
        idx = []
        for i in range(seg):
            th = 2 * pi * i / seg
            n = 1 + irr * (sin(3 * th + seed) + 0.6 * sin(5 * th + 2.0 * seed + k * 0.5) + 0.35 * sin(7 * th + 3.0 * seed))
            verts.append((center[0] + R * rr * n * cos(th), center[1] + R * rr * n * sin(th), center[2] + zz * H))
            idx.append(len(verts) - 1)
        rings.append(idx)
    for k in range(len(rings) - 1):
        A, B = rings[k], rings[k + 1]
        for i in range(seg):
            j = (i + 1) % seg
            if len(A) == 1:
                faces.append((A[0], B[j], B[i]))
            elif len(B) == 1:
                faces.append((A[i], A[j], B[0]))
            else:
                faces.append((A[i], A[j], B[j], B[i]))
    return clean(obj_from_pydata(name, verts, faces))


def mound_lathe(name, prof, seg=22, irr=0.07, seed=0.6):
    """One rocky summit: ledged strata profile, radial lobes that vary a little with height."""
    verts, faces, rings = [], [], []
    for k, (rr, zz) in enumerate(prof):
        if rr < 1e-9:
            verts.append((0.0, 0.0, zz))
            rings.append([len(verts) - 1])
            continue
        idx = []
        for i in range(seg):
            th = 2 * pi * i / seg
            n = 1 + irr * (sin(3 * th + seed + 0.15 * zz) + 0.55 * sin(5 * th + 2.0 * seed + 0.3 * zz) + 0.3 * sin(8 * th + 4.0 * seed))
            verts.append((rr * n * cos(th), rr * n * sin(th), zz))
            idx.append(len(verts) - 1)
        rings.append(idx)
    for k in range(len(rings) - 1):
        A, B = rings[k], rings[k + 1]
        for i in range(seg):
            j = (i + 1) % seg
            if len(A) == 1:
                faces.append((A[0], B[j], B[i]))
            elif len(B) == 1:
                faces.append((A[i], A[j], B[0]))
            else:
                faces.append((A[i], A[j], B[j], B[i]))
    return clean(obj_from_pydata(name, verts, faces))


def build():
    fresh()
    # ---- summit mound: three strata ledges, carved-stone feel, one lathe (no union mess)
    pts = [(0.0, 0.0), (4.1, 0.0), (4.3, 0.45), (3.9, 1.0), (3.5, 1.05), (3.3, 1.55), (3.1, 2.0),
           (2.55, 2.05), (2.35, 2.5), (2.0, 2.95), (1.5, 3.05), (1.35, 3.3), (0.0, 3.5)]
    rad = [0, 0.3, 0.45, 0.3, 0.15, 0.3, 0.25, 0.15, 0.3, 0.25, 0.15, 0.6, 0]
    mound = mound_lathe("mound", fillet_poly(pts, rad, n=2), 22)

    # ---- pole with a bead collar and a ball finial
    px = 0.0
    pole_prof = [(0.0, 2.6), (0.5, 2.6), (0.5, 5.75), (0.72, 5.75), (0.72, 6.15), (0.5, 6.15),
                 (0.5, 10.2), (0.95, 10.4), (1.05, 10.95), (0.68, 11.4), (0.0, 11.5)]
    pole_rad = [0, 0, 0, 0.1, 0.1, 0, 0, 0.35, 0.35, 0.35, 0]
    pole = lathe("pole", fillet_poly(pole_prof, pole_rad, n=2), 16)
    transform(pole, loc=(px, 0, 0))

    # ---- flag cloth with sculpted S-wave
    fl = cloth("cloth", px, 7.0, 6.0, 3.5, 1.0, 1.15, 0.65, 1.2)
    union_all([mound, pole, fl])
    bevel_sharp(mound, 0.18, 1, concave_angle=50, convex_angle=60)
    return mound


if __name__ == "__main__":
    ob = build()
    finalize(ob, "loop-6-launch", "loop-6-launch.glb", tilt_x=11.5, sharp=50)
