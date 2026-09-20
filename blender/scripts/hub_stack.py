"""The "one server, six hubs" hero: six glossy dark plates in an exploded stack, each engraved with a glyph.
One plate glows per frame (its glyph inlay and an edge groove), so the site can crossfade between six identical
compositions. Rendered with Cycles on a transparent film so it sits directly on the page backdrop.

    blender -b --factory-startup -P blender/scripts/hub_stack.py -- preview          # small, fast, all frames
    blender -b --factory-startup -P blender/scripts/hub_stack.py -- final 0 1 base   # full size, chosen frames

Frames: base (nothing lit) and 0..5 (Ideas, Build, Team up, Help, Feedback, Show off).
Raw 16-bit PNGs go to blender/work/hub/; web/scripts/make-hub-images.cjs turns them into the site images.
"""
import bpy
import bmesh
import os
import sys
import time
from math import pi, sin, cos, atan2, sqrt, radians
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
MODE = ARGS[0] if ARGS else "preview"
WANT = ARGS[1:]
OUT = os.path.join(lib.WORK, "hub")
os.makedirs(OUT, exist_ok=True)

PLATE = 9.4         # plate width (X)
DEPTH = 6.9         # plate depth (Y): shallow enough that no plate hides the glyph of the one below
THICK = 0.62        # plate thickness
PITCH = 3.85        # distance between plates (wide enough that every glyph clears the plate above)
CORNER = 1.5
GS = 0.88            # glyph scale
N = 6

# marble ramp of the site (theme.hoverStops), one colour per hub
RAMP = [(0xFE, 0xAF, 0x01), (0xFF, 0x83, 0x01), (0xF7, 0x0C, 0x5A), (0xE8, 0x03, 0xD1)]


def srgb_to_lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def ramp(t):
    t = max(0.0, min(1.0, t)) * (len(RAMP) - 1)
    i = min(int(t), len(RAMP) - 2)
    f = t - i
    a, b = RAMP[i], RAMP[i + 1]
    return tuple(srgb_to_lin(a[k] + (b[k] - a[k]) * f) for k in range(3))


# --------------------------------------------------------------------------- geometry helpers
def prism(name, pts, z0, z1):
    """Closed prism from a simple polygon (x, y), extruded between z0 and z1."""
    n = len(pts)
    verts = [(x, y, z0) for x, y in pts] + [(x, y, z1) for x, y in pts]
    faces = [tuple(range(n - 1, -1, -1)), tuple(range(n, 2 * n))]
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, j, n + j, n + i))
    return lib.clean(lib.obj_from_pydata(name, verts, faces))


def circle(cx, cy, r, n=64):
    return [(cx + r * cos(2 * pi * i / n), cy + r * sin(2 * pi * i / n)) for i in range(n)]


def ring(name, cx, cy, r_out, r_in, z0, z1, n=72):
    o = circle(cx, cy, r_out, n)
    i_ = circle(cx, cy, r_in, n)
    verts = [(x, y, z0) for x, y in o] + [(x, y, z1) for x, y in o] + [(x, y, z0) for x, y in i_] + [(x, y, z1) for x, y in i_]
    faces = []
    for k in range(n):
        j = (k + 1) % n
        faces.append((k, j, n + j, n + k))                       # outer wall
        faces.append((2 * n + k, 3 * n + k, 3 * n + j, 2 * n + j))  # inner wall
        faces.append((n + k, n + j, 3 * n + j, 3 * n + k))       # top
        faces.append((k, 2 * n + k, 2 * n + j, j))               # bottom
    return lib.clean(lib.obj_from_pydata(name, verts, faces))


def rounded_rect(w, d, r, n=14):
    hw, hd = w / 2, d / 2
    pts = []
    for cx, cy, a0 in ((hw - r, hd - r, 0), (-hw + r, hd - r, 90), (-hw + r, -hd + r, 180), (hw - r, -hd + r, 270)):
        for k in range(n + 1):
            a = radians(a0 + 90 * k / n)
            pts.append((cx + r * cos(a), cy + r * sin(a)))
    return pts


def stroke_polygon(points, width, cap_n=10):
    """Outline of a thick open polyline with round caps and mitred joints."""
    P = [Vector(p) for p in points]
    hw = width / 2
    normals = []
    for i in range(len(P) - 1):
        d = (P[i + 1] - P[i]).normalized()
        normals.append(Vector((-d.y, d.x)))
    left, right = [], []
    for i, p in enumerate(P):
        if i == 0:
            nrm = normals[0]
            s = 1.0
        elif i == len(P) - 1:
            nrm = normals[-1]
            s = 1.0
        else:
            m = (normals[i - 1] + normals[i]).normalized()
            s = 1.0 / max(0.4, m.dot(normals[i]))
            nrm = m
        left.append(p + nrm * hw * s)
        right.append(p - nrm * hw * s)
    d0 = (P[1] - P[0]).normalized()
    d1 = (P[-1] - P[-2]).normalized()
    a_end = atan2(normals[-1].y, normals[-1].x)
    a_start = atan2(-normals[0].y, -normals[0].x)
    end_cap = [P[-1] + Vector((cos(a_end - pi * k / cap_n), sin(a_end - pi * k / cap_n))) * hw for k in range(1, cap_n)]
    start_cap = [P[0] + Vector((cos(a_start - pi * k / cap_n), sin(a_start - pi * k / cap_n))) * hw for k in range(1, cap_n)]
    del d0, d1
    poly = left + end_cap + right[::-1] + start_cap
    return [(v.x, v.y) for v in poly]


def star(n_pts, r_out, r_in, rot=90.0, fillet=0.0):
    pts = []
    for i in range(n_pts * 2):
        r = r_out if i % 2 == 0 else r_in
        a = radians(rot) + pi * i / n_pts
        pts.append((r * cos(a), r * sin(a)))
    if fillet > 0:
        pts = lib.fillet_poly(pts, [fillet] * len(pts), n=5, closed=True)
    return pts


def sparkle(r_out, r_in, k=2.7, n=160):
    """Four-point star with concave sides (a fattened astroid)."""
    pts = []
    for i in range(n):
        t = 2 * pi * i / n
        c, sn = cos(t), sin(t)
        x = r_out * (abs(c) ** k) * (1 if c >= 0 else -1)
        y = r_out * (abs(sn) ** k) * (1 if sn >= 0 else -1)
        pts.append((x, y))
    return pts


def move(pts, dx, dy, s=1.0):
    return [(x * s + dx, y * s + dy) for x, y in pts]


# glyph = list of ("add"/"cut", polygon or ring spec) evaluated in order at plate top
def glyph_shapes(k, z0, z1):
    """Returns a list of mesh objects (already unioned into one) for glyph k, spanning z0..z1."""
    parts = []
    cuts = []
    if k == 0:      # Ideas: a large and a small sparkle
        parts.append(prism("g", sparkle(2.9, 0), z0, z1))
        parts.append(prism("g", move(sparkle(2.9, 0), 2.6, 2.3, 0.3), z0, z1))
    elif k == 1:    # Build: </>
        w = 0.62
        parts.append(prism("g", stroke_polygon([(-1.35, 1.55), (-2.95, 0.0), (-1.35, -1.55)], w), z0, z1))
        parts.append(prism("g", stroke_polygon([(1.35, 1.55), (2.95, 0.0), (1.35, -1.55)], w), z0, z1))
        parts.append(prism("g", stroke_polygon([(0.62, 2.05), (-0.62, -2.05)], w), z0, z1))
    elif k == 2:    # Team up: two linked rings
        parts.append(ring("g", -1.15, 0.0, 2.0, 1.42, z0, z1))
        parts.append(ring("g", 1.15, 0.0, 2.0, 1.42, z0, z1))
    elif k == 3:    # Help: a life ring cut into four bands
        parts.append(ring("g", 0.0, 0.0, 2.7, 1.5, z0, z1))
        for a in (45, 135, 225, 315):
            c = prism("c", [(-0.2, 1.2), (0.2, 1.2), (0.2, 3.0), (-0.2, 3.0)], z0 - 0.1, z1 + 0.1)
            c.rotation_euler = (0, 0, radians(a + 180))
            lib.update()
            cuts.append(c)
    elif k == 4:    # Feedback: a speech bubble with three typing dots
        bub = lib.fillet_poly([(-2.9, 2.2), (2.9, 2.2), (2.9, -1.2), (-0.2, -1.2), (-1.9, -2.7), (-1.5, -1.2), (-2.9, -1.2)],
                              [0.95, 0.95, 0.95, 0.0, 0.0, 0.0, 0.95], n=8, closed=True)
        parts.append(prism("g", bub, z0, z1))
        for x in (-1.2, 0.0, 1.2):
            cuts.append(prism("c", circle(x, 0.5, 0.36, 24), z0 - 0.1, z1 + 0.1))
    else:           # Show off: a star
        parts.append(prism("g", star(5, 2.85, 1.2, fillet=0.14), z0, z1))
    g = lib.union_all(parts) if len(parts) > 1 else parts[0]
    for c in cuts:
        lib.boolean(g, c, 'DIFFERENCE')
    g = lib.clean(g)
    lib.transform(g, scale=(GS, GS, 1.0))
    return g


# --------------------------------------------------------------------------- materials
def principled(mat):
    if mat.node_tree is None:
        mat.use_nodes = True
    nt = mat.node_tree
    node = nt.nodes.get("Principled BSDF")
    if node is None:
        node = nt.nodes.new("ShaderNodeBsdfPrincipled")
        out = nt.nodes.get("Material Output") or nt.nodes.new("ShaderNodeOutputMaterial")
        nt.links.new(node.outputs["BSDF"], out.inputs["Surface"])
    return node


def setp(node, name, value):
    if name in node.inputs:
        node.inputs[name].default_value = value


def make_metal(name, base, rough, metallic=0.9, coat=0.0):
    m = bpy.data.materials.new(name)
    p = principled(m)
    setp(p, "Base Color", (*base, 1.0))
    setp(p, "Metallic", metallic)
    setp(p, "Roughness", rough)
    setp(p, "Coat Weight", coat)
    setp(p, "Coat Roughness", 0.04)
    return m


def make_glow(name, colour):
    m = bpy.data.materials.new(name)
    p = principled(m)
    setp(p, "Base Color", (0.015, 0.015, 0.02, 1.0))
    setp(p, "Metallic", 0.0)      # matte, so the top light cannot wash a lit glyph out to white
    setp(p, "Roughness", 0.5)
    setp(p, "Specular IOR Level", 0.0)   # no white sheen on a lit glyph, so gold stays gold
    setp(p, "Emission Color", (*colour, 1.0))
    setp(p, "Emission Strength", 0.0)
    m["glow_node"] = p.name
    return m


def assign(ob, mat):
    """One material on every face (boolean results come back with an empty first slot)."""
    ob.data.materials.clear()
    ob.data.materials.append(mat)
    for poly in ob.data.polygons:
        poly.material_index = 0


def set_glow(mat, strength):
    p = mat.node_tree.nodes[mat["glow_node"]]
    setp(p, "Emission Strength", strength)


# --------------------------------------------------------------------------- scene
def build():
    lib.fresh()
    sc = bpy.context.scene
    dark = make_metal("plate", (0.014, 0.014, 0.018), 0.34, 0.85, coat=0.35)
    glows = []
    for k in range(N):
        colour = ramp(k / (N - 1))
        glows.append((make_glow(f"inlay{k}", colour), make_glow(f"groove{k}", colour), colour))

    for k in range(N):
        z = (N - 1 - k) * PITCH            # Ideas on top, Show off at the bottom
        plate = prism(f"plate{k}", rounded_rect(PLATE, DEPTH, CORNER), z - THICK / 2, z + THICK / 2)
        plate.data.materials.append(dark)
        lib.bevel(plate, 0.11, segments=3, angle=35)
        top = z + THICK / 2
        # engraved glyph: recess in the plate, inlay sitting in it
        recess = glyph_shapes(k, top - 0.16, top + 0.2)
        lib.boolean(plate, recess, 'DIFFERENCE')
        # perimeter groove near the edge: cut, then a thin light rod inside it
        outer = prism("go", rounded_rect(PLATE - 1.0, DEPTH - 1.0, CORNER - 0.5), top - 0.1, top + 0.2)
        inner = prism("gi", rounded_rect(PLATE - 1.26, DEPTH - 1.26, CORNER - 0.63), top - 0.2, top + 0.3)
        lib.boolean(outer, inner, 'DIFFERENCE')
        groove_cut = outer
        rod_o = prism("ro", rounded_rect(PLATE - 1.06, DEPTH - 1.06, CORNER - 0.53), top - 0.085, top - 0.015)
        rod_i = prism("ri", rounded_rect(PLATE - 1.2, DEPTH - 1.2, CORNER - 0.6), top - 0.2, top + 0.1)
        lib.boolean(rod_o, rod_i, 'DIFFERENCE')
        lib.boolean(plate, groove_cut, 'DIFFERENCE')
        assign(plate, dark)
        lib.smooth_by_angle(plate, 40)
        rod_o.name = f"groove{k}"
        assign(rod_o, glows[k][1])
        inlay = glyph_shapes(k, top - 0.16 + 0.025, top - 0.035)
        inlay.name = f"inlay{k}"
        assign(inlay, glows[k][0])
        # scale the inlay a touch smaller than the recess so a dark reveal frames it
        for o in (rod_o, inlay):
            lib.smooth_by_angle(o, 40)

    # lights: a big soft top light behind, a magenta and an orange rim, a very dim front fill
    def area(name, loc, target, size, size_y, energy, colour):
        ld = bpy.data.lights.new(name, 'AREA')
        ld.shape = 'RECTANGLE'
        ld.size, ld.size_y = size, size_y
        ld.energy = energy
        ld.color = colour
        ob = bpy.data.objects.new(name, ld)
        lib.link(ob)
        ob.location = loc
        ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        return ob

    mid = (0, 0, (N - 1) * PITCH / 2)
    area("softbox", (0, 30, 40), mid, 40, 26, 6500, (1.0, 0.93, 0.82))
    area("rimL", (-26, 12, 18), mid, 6, 44, 6500, (0.95, 0.12, 0.85))
    area("rimR", (26, 10, 16), mid, 6, 44, 7000, (1.0, 0.5, 0.1))
    area("front", (-6, -34, 40), mid, 34, 16, 4300, (1.0, 0.9, 0.8))
    area("fill", (0, -40, 12), mid, 34, 24, 500, (0.85, 0.9, 1.0))
    area("kick", (0, -20, -16), mid, 30, 8, 1200, (1.0, 0.7, 0.35))
    return sc, glows, mid


def setup_render(sc, w, h, samples):
    sc.render.engine = 'CYCLES'
    cy = sc.cycles
    cy.device = 'CPU'
    cy.samples = samples
    cy.use_adaptive_sampling = True
    cy.use_denoising = True
    try:
        cy.denoiser = 'OPENIMAGEDENOISE'
    except Exception:
        pass
    cy.max_bounces = 8
    cy.glossy_bounces = 6
    cy.caustics_reflective = False
    cy.caustics_refractive = False
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = w, h, 100
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.color_depth = '16'
    sc.render.image_settings.compression = 15
    try:
        sc.view_settings.view_transform = 'Standard'
        sc.view_settings.look = 'None'
    except Exception:
        pass
    sc.view_settings.exposure = 0.0
    wd = bpy.data.worlds.new("w")
    wd.color = (0, 0, 0)
    sc.world = wd
    cam_d = bpy.data.cameras.new("cam")
    cam = bpy.data.objects.new("cam", cam_d)
    lib.link(cam)
    sc.camera = cam
    return cam


def aim(cam, mid, az, el, dist, lens):
    cam.data.lens = lens
    cam.data.sensor_width = 36
    x = dist * cos(radians(el)) * sin(radians(az))
    y = -dist * cos(radians(el)) * cos(radians(az))
    z = mid[2] + dist * sin(radians(el))
    cam.location = (mid[0] + x, mid[1] + y, z)
    cam.rotation_euler = (Vector(mid) - Vector(cam.location)).to_track_quat('-Z', 'Y').to_euler()


def main():
    t0 = time.time()
    sc, glows, mid = build()
    print("built in %.1fs" % (time.time() - t0))
    if MODE == "preview":
        w, h, samples = (1000, 1333, 48) if "big" in ARGS else (720, 960, 40)
    else:
        w, h, samples = 1500, 2000, 160
    for a in ARGS:
        if a.startswith("size="):
            w, h = [int(v) for v in a[5:].split("x")]
        if a.startswith("samples="):
            samples = int(a[8:])
    cam = setup_render(sc, w, h, samples)
    az, el, dist, lens = 30.0, 27.0, 56.0, 70.0
    for a in ARGS:
        if a.startswith("cam="):
            az, el, dist, lens = [float(v) for v in a[4:].split(",")]
    aim(cam, (mid[0], mid[1], mid[2] + 0.4), az, el, dist, lens)
    frames = ["base"] + list(range(N))
    if WANT and any(f == "base" or f.isdigit() for f in WANT):
        frames = [f if f == "base" else int(f) for f in WANT if f == "base" or f.isdigit()]
    for f in frames:
        for k in range(N):
            on = (f == k)
            set_glow(glows[k][0], 1.0 if on else 0.0)
            set_glow(glows[k][1], 1.0 if on else 0.35)
        path = os.path.join(OUT, ("%s_%s.png" % ("prev" if MODE == "preview" else "raw", f)))
        sc.render.filepath = path
        t1 = time.time()
        bpy.ops.render.render(write_still=True)
        print("frame %s -> %s (%.1fs)" % (f, path, time.time() - t1))
    lib.save_blend(os.path.join(lib.ROOT, "hub-stack.blend"))
    print("done in %.1fs" % (time.time() - t0))


if __name__ == "__main__":
    main()
