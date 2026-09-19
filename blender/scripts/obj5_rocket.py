import sys
sys.path.insert(0, r"D:\page_content\blender\scripts")
from lib import *
from obj1_bulb import bezier


def build(SEG=20, tilt=35.0):
    fresh()
    Rb = 1.95
    # ---- one lathe: flame tip -> engine bell -> body with two raised bands -> ogive nose
    flame = [(0.0, -3.9), (0.28, -3.5), (0.62, -2.7), (0.92, -1.7), (1.1, -0.7), (1.14, 0.1), (1.05, 0.72)]
    pts = [(1.45, 0.72), (1.55, 1.0), (Rb, 2.0),
           (Rb, 2.2), (Rb + 0.22, 2.2), (Rb + 0.22, 2.6), (Rb, 2.6),          # lower band
           (Rb, 6.3), (Rb + 0.22, 6.3), (Rb + 0.22, 6.7), (Rb, 6.7)]           # upper band
    rad = [0.1, 0.15, 0.4, 0, 0.1, 0.1, 0, 0, 0.1, 0.1, 0]
    body_pts = fillet_poly([flame[-1]] + pts, [0] + rad, n=2)[1:]
    nose = bezier((Rb, 6.7), (Rb, 8.5), (0.8, 9.7), (0.32, 10.5), 9) + [(0.0, 10.65)]
    prof = flame + body_pts + nose[1:]
    body = lathe("rocket", prof, SEG)

    # ---- porthole: recess + bezel on the front (-Y) face
    cutter = lathe("cut", [(0, -0.6), (0.74, -0.6), (0.74, 0.6), (0, 0.6)], 24)
    transform(cutter, rot=(90, 0, 0))            # axis along Y
    transform(cutter, loc=(0, -2.15, 4.7))
    boolean(body, cutter, 'DIFFERENCE')
    bez = torus("bezel", 1.0, 0.3, 32, 10, center=(0, -1.72, 4.7))
    parts = [body, bez]

    # ---- four swept fins at 45 degree offsets
    fin_out = fillet_poly([(1.0, 4.9), (1.75, 4.9), (3.9, 1.1), (3.9, -0.5), (1.9, 0.35), (1.0, 0.35)],
                          [0, 0, 0.5, 0.5, 0.25, 0], n=2, closed=True)
    for k in range(4):
        fin = extrude_outline("fin%d" % k, fin_out, 0.75)
        transform(fin, rot=(0, 0, 45 + 90 * k))
        parts.append(fin)
    union_all(parts)
    print('TRIS pre-bevel', tri_count(body))
    bevel_sharp(body, 0.16, 1, concave_angle=50, convex_angle=60)
    print('TRIS post-bevel', tri_count(body))
    transform(body, rot=(0, tilt, 0))
    return body


if __name__ == "__main__":
    ob = build()
    finalize(ob, "loop-5-ship", "loop-5-ship.glb", tilt_x=11.5, sharp=50)
