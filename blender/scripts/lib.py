"""Shared toolkit for building the edith 3D objects in headless Blender 5.x.

Conventions (see docs/edith-3d-brief.md):
  * +Z up, front of every object faces -Y (so it is +Z in glTF after export).
  * Flat-ish shapes are drawn in the XZ plane (front view) and given depth along Y.
  * Everything is a closed, single-shell, outward-facing solid.
"""
import bpy
import bmesh
import math
import os
import json
import struct
import numpy as np
from math import pi, sin, cos, tan, atan2, acos, sqrt, radians, degrees
from mathutils import Vector, Matrix

ROOT = r"D:\page_content\blender"
EXPORT = os.path.join(ROOT, "export")
WORK = os.path.join(ROOT, "work")
MATCAP = r"D:\page_content\web\public\gl\images\misc\model-matcap.jpg"


# --------------------------------------------------------------------------- scene
def fresh():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    return bpy.context.scene


def link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


def obj_from_pydata(name, verts, faces):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], [tuple(f) for f in faces])
    me.update()
    ob = bpy.data.objects.new(name, me)
    link(ob)
    return ob


def delete(ob):
    me = ob.data if ob.type == 'MESH' else None
    bpy.data.objects.remove(ob, do_unlink=True)
    if me is not None and me.users == 0:
        bpy.data.meshes.remove(me)


def update():
    bpy.context.view_layer.update()


# --------------------------------------------------------------------------- cleanup
def clean(ob, dist=1e-5):
    """Weld, fix winding, make normals point outward (signed volume > 0)."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=dist)
    bmesh.ops.dissolve_degenerate(bm, dist=dist, edges=bm.edges)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bm.calc_volume(signed=True) < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.update()
    return ob


def apply_modifiers(ob):
    update()
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev, preserve_all_data_layers=True, depsgraph=dg)
    old = ob.data
    ob.modifiers.clear()
    ob.data = me
    if old.users == 0:
        bpy.data.meshes.remove(old)
    return ob


def boolean(a, b, op='UNION', delete_b=True, self_int=False):
    m = a.modifiers.new("bool", 'BOOLEAN')
    m.operation = op
    m.solver = 'EXACT'
    m.object = b
    m.use_self = self_int
    apply_modifiers(a)
    if delete_b:
        delete(b)
    return a


def union_all(objs, self_int=False):
    base = objs[0]
    for o in objs[1:]:
        boolean(base, o, 'UNION', True, self_int)
    return clean(base)


def bevel(ob, width, segments=3, angle=35, profile=0.5, clamp=True):
    m = ob.modifiers.new("bevel", 'BEVEL')
    m.limit_method = 'ANGLE'
    m.angle_limit = radians(angle)
    m.offset_type = 'OFFSET'
    m.width = width
    m.segments = segments
    m.profile = profile
    m.use_clamp_overlap = clamp
    m.loop_slide = True
    apply_modifiers(ob)
    return clean(ob)


def bevel_sharp(ob, width, segments=2, concave_angle=40, convex_angle=60, profile=0.5):
    """Bevel only real creases: any concave edge sharper than concave_angle, and convex edges sharper than convex_angle.
    Leaves smooth lathe / arc rings alone so triangle counts stay low."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    layer = bm.edges.layers.float.get("bevel_weight_edge") or bm.edges.layers.float.new("bevel_weight_edge")
    n = 0
    for e in bm.edges:
        if len(e.link_faces) != 2:
            continue
        a = e.calc_face_angle(0.0)
        if (not e.is_convex and a > radians(concave_angle)) or (e.is_convex and a > radians(convex_angle)):
            e[layer] = 1.0
            n += 1
        else:
            e[layer] = 0.0
    bm.to_mesh(ob.data)
    bm.free()
    m = ob.modifiers.new("bevel", 'BEVEL')
    m.limit_method = 'WEIGHT'
    m.offset_type = 'OFFSET'
    m.width = width
    m.segments = segments
    m.profile = profile
    m.use_clamp_overlap = True
    m.loop_slide = True
    apply_modifiers(ob)
    return clean(ob)


def subsurf(ob, levels=1):
    m = ob.modifiers.new("sub", 'SUBSURF')
    m.levels = levels
    m.render_levels = levels
    m.subdivision_type = 'CATMULL_CLARK'
    apply_modifiers(ob)
    return ob


def decimate(ob, ratio):
    m = ob.modifiers.new("dec", 'DECIMATE')
    m.decimate_type = 'COLLAPSE'
    m.ratio = ratio
    m.use_collapse_triangulate = False
    apply_modifiers(ob)
    return clean(ob)


def triangulate(ob):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.triangulate(bm, faces=bm.faces, quad_method='BEAUTY', ngon_method='BEAUTY')
    bm.to_mesh(ob.data)
    bm.free()
    return ob


def smooth_by_angle(ob, angle=35):
    """Same result as the Smooth by Angle modifier, baked into the mesh."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    lim = radians(angle)
    for e in bm.edges:
        if len(e.link_faces) == 2:
            e.smooth = e.calc_face_angle(0.0) < lim
        else:
            e.smooth = False
    for f in bm.faces:
        f.smooth = True
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.update()
    return ob


def laplacian(ob, factor=0.5, iterations=2):
    m = ob.modifiers.new("sm", 'SMOOTH')
    m.factor = factor
    m.iterations = iterations
    apply_modifiers(ob)
    return ob


# --------------------------------------------------------------------------- shapes
def fillet_poly(pts, radii, n=4, closed=False):
    """Round the corners of a 2D polyline. radii[i]=0 keeps vertex i sharp."""
    pts = [Vector(p) for p in pts]
    N = len(pts)
    out = []
    for i, p in enumerate(pts):
        r = radii[i]
        if closed:
            p0, p2 = pts[(i - 1) % N], pts[(i + 1) % N]
        elif i == 0 or i == N - 1:
            out.append(p.copy())
            continue
        else:
            p0, p2 = pts[i - 1], pts[i + 1]
        if r <= 0:
            out.append(p.copy())
            continue
        v1 = (p0 - p)
        v2 = (p2 - p)
        l1, l2 = v1.length, v2.length
        v1.normalize()
        v2.normalize()
        d = max(-1.0, min(1.0, v1.dot(v2)))
        th = acos(d)
        if th < 1e-3 or abs(th - pi) < 1e-3:
            out.append(p.copy())
            continue
        t = r / tan(th / 2)
        tmax = 0.5 * min(l1, l2)
        if t > tmax:
            t = tmax
            r = t * tan(th / 2)
        a = p + v1 * t
        b = p + v2 * t
        bis = (v1 + v2)
        bis.normalize()
        c = p + bis * (r / sin(th / 2))
        sa = atan2(a.y - c.y, a.x - c.x)
        ea = atan2(b.y - c.y, b.x - c.x)
        dl = ea - sa
        while dl > pi:
            dl -= 2 * pi
        while dl < -pi:
            dl += 2 * pi
        for k in range(n + 1):
            ang = sa + dl * k / n
            out.append(Vector((c.x + r * cos(ang), c.y + r * sin(ang))))
    return [(p.x, p.y) for p in out]


def arc_pts(cx, cy, r, a0, a1, n):
    """Points on a circle arc from angle a0 to a1 (radians), n segments."""
    return [(cx + r * cos(a0 + (a1 - a0) * k / n), cy + r * sin(a0 + (a1 - a0) * k / n)) for k in range(n + 1)]


def lathe(name, profile, seg=32):
    """Solid of revolution around Z. profile = [(r, z), ...] from the bottom pole (r=0) to the top pole (r=0)."""
    verts, faces, rings = [], [], []
    for (r, z) in profile:
        if r < 1e-9:
            verts.append((0.0, 0.0, z))
            rings.append([len(verts) - 1])
        else:
            idx = []
            for i in range(seg):
                a = 2 * pi * i / seg
                verts.append((r * cos(a), r * sin(a), z))
                idx.append(len(verts) - 1)
            rings.append(idx)
    for k in range(len(rings) - 1):
        A, B = rings[k], rings[k + 1]
        if len(A) == 1 and len(B) == 1:
            continue
        for i in range(seg):
            j = (i + 1) % seg
            if len(A) == 1:
                faces.append((A[0], B[j], B[i]))
            elif len(B) == 1:
                faces.append((A[i], A[j], B[0]))
            else:
                faces.append((A[i], A[j], B[j], B[i]))
    return clean(obj_from_pydata(name, verts, faces))


def extrude_outline(name, pts, thickness, y0=0.0):
    """Extrude a closed 2D outline (x, z), CCW, along Y. Centred on y0. Returns a closed slab."""
    n = len(pts)
    h = thickness / 2
    verts = [(x, y0 - h, z) for (x, z) in pts] + [(x, y0 + h, z) for (x, z) in pts]
    faces = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))]
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, j, n + j, n + i))
    return clean(obj_from_pydata(name, verts, faces))


def sweep(name, path, radius, sides=16, cap=True, twist=0.0, up=(0, 1, 0), prof=None):
    """Round tube along a 3D polyline `path` (list of (x,y,z)); radius may be a float or a function f(t, theta)->r.
    Rounded end caps are added as fans. Parallel transport frames."""
    P = [Vector(p) for p in path]
    N = len(P)
    tang = []
    for i in range(N):
        if i == 0:
            t = P[1] - P[0]
        elif i == N - 1:
            t = P[-1] - P[-2]
        else:
            t = (P[i + 1] - P[i - 1])
        tang.append(t.normalized())
    upv = Vector(up)
    n0 = tang[0].cross(upv)
    if n0.length < 1e-6:
        n0 = tang[0].cross(Vector((1, 0, 0)))
    n0.normalize()
    frames = []
    nrm = n0
    for i in range(N):
        if i > 0:
            # parallel transport: rotate previous normal by rotation taking tang[i-1] to tang[i]
            q = tang[i - 1].rotation_difference(tang[i])
            nrm = q @ nrm
        b = tang[i].cross(nrm).normalized()
        frames.append((nrm.copy(), b))
    verts, faces, rings = [], [], []
    for i in range(N):
        nrm, b = frames[i]
        t = i / (N - 1) if N > 1 else 0
        ring = []
        for k in range(sides):
            th = 2 * pi * k / sides + twist * t
            r = radius(t, th) if callable(radius) else radius
            v = P[i] + nrm * (r * cos(th)) + b * (r * sin(th))
            verts.append(tuple(v))
            ring.append(len(verts) - 1)
        rings.append(ring)
    for i in range(N - 1):
        A, B = rings[i], rings[i + 1]
        for k in range(sides):
            k2 = (k + 1) % sides
            faces.append((A[k], A[k2], B[k2], B[k]))
    if cap:
        for end in (0, N - 1):
            verts.append(tuple(P[end]))
            c = len(verts) - 1
            ring = rings[end]
            for k in range(sides):
                k2 = (k + 1) % sides
                faces.append((c, ring[k], ring[k2]))
    return clean(obj_from_pydata(name, verts, faces))


def torus(name, R, r, seg_major=48, seg_minor=16, center=(0, 0, 0), axis='Y', flute=None):
    """Torus lying in the XZ plane (axis Y = ring faces the camera). flute(theta)->radius multiplier."""
    verts, faces = [], []
    for i in range(seg_major):
        a = 2 * pi * i / seg_major
        for j in range(seg_minor):
            th = 2 * pi * j / seg_minor
            rr = r * (flute(th) if flute else 1.0)
            rad = R + rr * cos(th)
            x = rad * cos(a)
            z = rad * sin(a)
            y = rr * sin(th)
            verts.append((x + center[0], y + center[1], z + center[2]))
    for i in range(seg_major):
        i2 = (i + 1) % seg_major
        for j in range(seg_minor):
            j2 = (j + 1) % seg_minor
            faces.append((i * seg_minor + j, i2 * seg_minor + j, i2 * seg_minor + j2, i * seg_minor + j2))
    return clean(obj_from_pydata(name, verts, faces))


def uv_sphere(name, center, radii, seg=24, rings=12, noise=None):
    """Ellipsoid (radii = (rx, ry, rz)). noise(theta, phi) -> radial multiplier for lumpy stones."""
    verts, faces = [], []
    verts.append((center[0], center[1], center[2] - radii[2]))
    for j in range(1, rings):
        phi = -pi / 2 + pi * j / rings
        for i in range(seg):
            th = 2 * pi * i / seg
            k = noise(th, phi) if noise else 1.0
            verts.append((center[0] + k * radii[0] * cos(phi) * cos(th),
                          center[1] + k * radii[1] * cos(phi) * sin(th),
                          center[2] + k * radii[2] * sin(phi)))
    verts.append((center[0], center[1], center[2] + radii[2]))
    top = len(verts) - 1
    for i in range(seg):
        j = (i + 1) % seg
        faces.append((0, 1 + j, 1 + i))
    for r in range(rings - 2):
        for i in range(seg):
            j = (i + 1) % seg
            a = 1 + r * seg
            b = 1 + (r + 1) * seg
            faces.append((a + i, a + j, b + j, b + i))
    last = 1 + (rings - 2) * seg
    for i in range(seg):
        j = (i + 1) % seg
        faces.append((last + i, last + j, top))
    return clean(obj_from_pydata(name, verts, faces))


def box(name, size, center=(0, 0, 0)):
    sx, sy, sz = [s / 2 for s in size]
    cx, cy, cz = center
    v = [(cx + x, cy + y, cz + z) for x in (-sx, sx) for y in (-sy, sy) for z in (-sz, sz)]
    f = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    return clean(obj_from_pydata(name, v, f))


def transform(ob, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    """Bake a transform into the mesh (rot in degrees, XYZ order)."""
    m = Matrix.Translation(loc) @ Matrix.Diagonal(list(scale) + [1]) if False else None
    R = Matrix.Rotation(radians(rot[2]), 4, 'Z') @ Matrix.Rotation(radians(rot[1]), 4, 'Y') @ Matrix.Rotation(radians(rot[0]), 4, 'X')
    S = Matrix.Diagonal(Vector((scale[0], scale[1], scale[2], 1.0)))
    M = Matrix.Translation(loc) @ R @ S
    ob.data.transform(M)
    ob.data.update()
    return ob


def join(objs, name):
    """Join meshes (no boolean)."""
    bm = bmesh.new()
    for o in objs:
        tmp = bmesh.new()
        tmp.from_mesh(o.data)
        tmp.transform(o.matrix_world)
        me = bpy.data.meshes.new("t")
        tmp.to_mesh(me)
        tmp.free()
        bm.from_mesh(me)
        bpy.data.meshes.remove(me)
    for o in list(objs):
        delete(o)
    return obj_from_bm(name, bm)


def obj_from_bm(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    link(ob)
    return ob


# --------------------------------------------------------------------------- normalise / QA
def bbox(ob):
    vs = [ob.matrix_world @ v.co for v in ob.data.vertices]
    mn = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
    mx = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    return mn, mx


def normalize(ob, size=10.0):
    """Scale so the longest of width (X) and height (Z up) == size; origin at the bbox centre; bake transforms.
    Depth (Y) is what the site ignores, so it must stay within 12 (checked in finalize)."""
    mn, mx = bbox(ob)
    ext = mx - mn
    s = size / max(ext.x, ext.z)
    c = (mn + mx) / 2
    M = Matrix.Scale(s, 4) @ Matrix.Translation(-c) @ ob.matrix_world
    ob.data.transform(M)
    ob.matrix_world = Matrix.Identity(4)
    ob.data.update()
    return ob


def tri_count(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)


def shells(bm):
    seen = set()
    n = 0
    for f in bm.faces:
        if f.index in seen:
            continue
        n += 1
        stack = [f]
        seen.add(f.index)
        while stack:
            cur = stack.pop()
            for e in cur.edges:
                for g in e.link_faces:
                    if g.index not in seen:
                        seen.add(g.index)
                        stack.append(g)
    return n


def analyze(ob):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.faces.ensure_lookup_table()
    for i, f in enumerate(bm.faces):
        f.index = i
    non_manifold = sum(1 for e in bm.edges if not e.is_manifold)
    loose = sum(1 for v in bm.verts if not v.link_faces)
    vol = bm.calc_volume(signed=True)
    sh = shells(bm)
    bm.free()
    mn, mx = bbox(ob)
    ext = mx - mn
    ctr = (mn + mx) / 2
    uvmin = uvmax = None
    if ob.data.uv_layers:
        uv = np.array([l.uv[:] for l in ob.data.uv_layers.active.data])
        uvmin, uvmax = uv.min(axis=0).tolist(), uv.max(axis=0).tolist()
    return dict(
        tris=tri_count(ob), verts=len(ob.data.vertices),
        nonmanifold=non_manifold, loose=loose, volume=round(vol, 2), shells=sh,
        # bbox is reported in glTF axes: X, Y (up), Z (depth). Blender: Z is up, -Y is the front.
        bbox=(round(ext.x, 3), round(ext.z, 3), round(ext.y, 3)),
        centre=(round(ctr.x, 4), round(ctr.y, 4), round(ctr.z, 4)),
        footprint=round(ext.x / ext.z, 3),
        uv_layers=len(ob.data.uv_layers), uvmin=uvmin, uvmax=uvmax,
    )


def report(ob):
    a = analyze(ob)
    print("QA", ob.name, json.dumps(a))
    return a


def fix_slivers(ob, q_min=1e-4, max_iter=50):
    """Triangulate (beauty) and remove zero-area triangles: rotate the long edge of a cap sliver, collapse the short edge
    of a needle. Boolean n-gons can carry collinear vertices; left to the glTF exporter's own triangulation they give
    zero-area triangles that do not survive the round trip (loop-5-ship came back with 3 open edges)."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.triangulate(bm, faces=bm.faces, quad_method='BEAUTY', ngon_method='BEAUTY')
    fixed = 0
    for _ in range(max_iter):
        bad = None
        for f in bm.faces:
            es = sorted(f.edges, key=lambda e: e.calc_length())
            L = es[-1].calc_length()
            if L > 0 and f.calc_area() < q_min * L * L:
                bad = es
                break
        if bad is None:
            break
        if bad[0].calc_length() < 0.1 * bad[-1].calc_length():
            bmesh.ops.collapse(bm, edges=[bad[0]], uvs=True)
        elif not bmesh.ops.rotate_edges(bm, edges=[bad[-1]], use_ccw=False)['edges']:
            bmesh.ops.collapse(bm, edges=[bad[0]], uvs=True)
        fixed += 1
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.update()
    print("SLIVERS fixed", fixed)
    return fixed


def roundtrip_open_edges(path):
    """Re-import an exported .glb, weld the splits the exporter makes at UV seams and sharp edges, and count
    non-manifold edges: watertightness as the site will receive it."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    n = 0
    for o in new:
        if o.type == 'MESH':
            bm = bmesh.new()
            bm.from_mesh(o.data)
            bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
            n += sum(1 for e in bm.edges if not e.is_manifold)
            bm.free()
    for o in new:
        delete(o)
    return n


# --------------------------------------------------------------------------- UVs
def unwrap(ob, margin=0.01, angle=66.0):
    """Smart UV project into the 0..1 square, uniform texel density, single UV map."""
    for uvl in list(ob.data.uv_layers):
        ob.data.uv_layers.remove(uvl)
    update()
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=radians(angle), island_margin=margin, area_weight=0.0,
                             correct_aspect=True, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    return ob


# --------------------------------------------------------------------------- export
def export_glb(ob, path):
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True,
        export_cameras=False, export_lights=False, export_extras=False,
        export_yup=True, export_apply=True, export_texcoords=True, export_normals=True,
        export_tangents=False, export_materials='NONE', export_vertex_color='NONE',
        use_mesh_edges=False, use_mesh_vertices=False,
        export_draco_mesh_compression_enable=False, export_animations=False,
        export_skins=False, export_morph=False,
    )
    return os.path.getsize(path)


def glb_info(path):
    """Parse the JSON chunk of a .glb: attributes present, counts, materials, animations, etc."""
    with open(path, 'rb') as f:
        data = f.read()
    _, _, length = struct.unpack('<4sII', data[:12])
    clen, ctype = struct.unpack('<II', data[12:20])
    js = json.loads(data[20:20 + clen].decode('utf8'))
    prims = [p for m in js.get('meshes', []) for p in m['primitives']]
    return dict(
        size=len(data),
        attrs=sorted({a for p in prims for a in p['attributes']}),
        prims=len(prims),
        materials=len(js.get('materials', [])),
        images=len(js.get('images', [])),
        animations=len(js.get('animations', [])),
        cameras=len(js.get('cameras', [])),
        nodes=len(js.get('nodes', [])),
        extensions=js.get('extensionsUsed', []),
    )


# --------------------------------------------------------------------------- preview rendering
def setup_render(w, h, flat=False, aa='8'):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = w, h, 100
    sc.render.film_transparent = False
    sh = sc.display.shading
    sh.color_type = 'SINGLE'
    sh.single_color = (1, 1, 1)
    sh.show_cavity = False
    sh.show_shadows = False
    sh.show_object_outline = False
    sh.show_specular_highlight = False
    sh.show_backface_culling = False
    if flat:
        sh.light = 'FLAT'
    else:
        sl = bpy.context.preferences.studio_lights.load(MATCAP, 'MATCAP')
        sh.light = 'MATCAP'
        sh.studio_light = sl.name
    sc.display.render_aa = aa
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    sc.view_settings.exposure = 0.0
    sc.view_settings.gamma = 1.0
    sc.display_settings.display_device = 'sRGB'
    wd = bpy.data.worlds.new("w")
    wd.color = (0, 0, 0)
    sc.world = wd
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGB'
    sc.render.image_settings.compression = 15
    return sc


def setup_camera(dist=28.0, fov=30.0):
    sc = bpy.context.scene
    if sc.camera is None:
        cd = bpy.data.cameras.new("cam")
        cam = bpy.data.objects.new("cam", cd)
        link(cam)
        sc.camera = cam
    cam = sc.camera
    cam.data.angle = radians(fov)
    cam.data.clip_start = 0.1
    cam.data.clip_end = 5000
    cam.location = (0, -dist, 0)
    cam.rotation_euler = (radians(90), 0, 0)
    return cam


def render_to(path):
    sc = bpy.context.scene
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return path


def load_pixels(path):
    img = bpy.data.images.load(path, check_existing=False)
    w, h = img.size
    a = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    bpy.data.images.remove(img)
    return a


def save_array(arr, path):
    """arr: H x W x 4 float array, row 0 = bottom (Blender convention)."""
    h, w = arr.shape[:2]
    img = bpy.data.images.new("out", w, h, alpha=True)
    img.pixels = arr.ravel().tolist()
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()
    bpy.data.images.remove(img)


def preview_sheet(ob, path, yaws=(0, 45, 90, 135, 180, 225, 270, 315), size=300, tilt_x=0.0, roll=0.0, dist=28.0, cols=4):
    """Render `ob` from several yaw angles under the site matcap and tile into one PNG."""
    sc = setup_render(size, size)
    setup_camera(dist)
    ob.rotation_mode = 'XYZ'
    tiles = []
    for i, yaw in enumerate(yaws):
        pivot_rot = Matrix.Rotation(radians(roll), 4, 'Y') @ Matrix.Rotation(radians(tilt_x), 4, 'X')
        ob.matrix_world = pivot_rot @ Matrix.Rotation(radians(yaw), 4, 'Z')
        update()
        tmp = os.path.join(WORK, "_tile_%d.png" % i)
        render_to(tmp)
        tiles.append(load_pixels(tmp))
        os.remove(tmp)
    ob.matrix_world = Matrix.Identity(4)
    rows = (len(tiles) + cols - 1) // cols
    sheet = np.zeros((rows * size, cols * size, 4), dtype=np.float32)
    sheet[..., 3] = 1
    for i, t in enumerate(tiles):
        r, c = divmod(i, cols)
        rr = rows - 1 - r  # row 0 is bottom
        sheet[rr * size:(rr + 1) * size, c * size:(c + 1) * size] = t
    save_array(sheet, path)
    return path


def save_blend(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=path, compress=True)


# --------------------------------------------------------------------------- finishing
def finalize(ob, key, glb_name, tri_range=(500, 5000), margin=0.01, tilt_x=11.5, roll=0.0, size=10.0, sharp=35, do_unwrap=True):
    """normalise -> shade -> UV -> QA -> export .glb -> save .blend -> preview sheet."""
    ob.name = key
    ob.data.name = key
    clean(ob)
    fix_slivers(ob)
    clean(ob)
    normalize(ob, size)
    smooth_by_angle(ob, sharp)
    if do_unwrap:
        unwrap(ob, margin)
    a = report(ob)
    path = os.path.join(EXPORT, glb_name)
    export_glb(ob, path)
    info = glb_info(path)
    print("GLB", glb_name, json.dumps(info))
    problems = []
    if a['nonmanifold'] or a['loose']:
        problems.append("not watertight")
    if a['volume'] <= 0:
        problems.append("normals inward")
    if a['shells'] != 1:
        problems.append("shells=%d" % a['shells'])
    if not (tri_range[0] <= a['tris'] <= tri_range[1]):
        problems.append("tris %d outside %s" % (a['tris'], tri_range))
    if info['size'] > 200 * 1024:
        problems.append("glb over 200KB")
    if 'TEXCOORD_0' not in info['attrs']:
        problems.append("no UVs in glb")
    if info['materials'] or info['images'] or info['animations'] or info['cameras']:
        problems.append("glb has extras")
    open_edges = roundtrip_open_edges(path)
    if open_edges:
        problems.append("%d open edges after the glTF round trip" % open_edges)
    print("PROBLEMS", problems if problems else "none")
    save_blend(os.path.join(ROOT, key + ".blend"))
    preview_sheet(ob, os.path.join(WORK, key + "_sheet.png"), tilt_x=tilt_x, roll=roll)
    return a, info


# --------------------------------------------------------------------------- SDF meshing (organic shapes)
def sd_ellipsoid(P, c, r, rot=None):
    q = P - np.array(c, dtype=np.float32)
    if rot is not None:
        q = q @ np.array(rot, dtype=np.float32)          # rot columns = local axes
    r = np.array(r, dtype=np.float32)
    k0 = np.linalg.norm(q / r, axis=-1)
    k1 = np.linalg.norm(q / (r * r), axis=-1)
    return k0 * (k0 - 1.0) / np.maximum(k1, 1e-6)


def sd_torus_z(P, c, R, r):
    q = P - np.array(c, dtype=np.float32)
    d = np.sqrt(q[..., 0] ** 2 + q[..., 1] ** 2) - R
    return np.sqrt(d * d + q[..., 2] ** 2) - r


def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0.0, 1.0)
    return b * (1 - h) + a * h - k * h * (1 - h)


def smax(a, b, k):
    return -smin(-a, -b, k)


def rot_x(deg):
    """Local axes (as columns) of a frame whose y axis is tilted up by `deg` around X."""
    a = radians(deg)
    return [[1, 0, 0], [0, cos(a), -sin(a)], [0, sin(a), cos(a)]]


def surface_nets(F, origin, h):
    """Watertight quad mesh of the F<0 region of a scalar grid (naive surface nets)."""
    nx, ny, nz = F.shape
    s = F < 0
    offs = [(0, 0, 0), (1, 0, 0), (0, 1, 0), (1, 1, 0), (0, 0, 1), (1, 0, 1), (0, 1, 1), (1, 1, 1)]
    sl = lambda A, o: A[o[0]:nx - 1 + o[0], o[1]:ny - 1 + o[1], o[2]:nz - 1 + o[2]]
    cs = [sl(s, o) for o in offs]
    cv = [sl(F, o) for o in offs]
    tot = sum(c.astype(np.int8) for c in cs)
    active = (tot > 0) & (tot < 8)
    edges = [(0, 1), (2, 3), (4, 5), (6, 7), (0, 2), (1, 3), (4, 6), (5, 7), (0, 4), (1, 5), (2, 6), (3, 7)]
    acc = np.zeros(active.shape + (3,), dtype=np.float32)
    cnt = np.zeros(active.shape, dtype=np.float32)
    for a, b in edges:
        m = cs[a] != cs[b]
        den = np.where(m, cv[a] - cv[b], 1.0)
        t = np.where(m, cv[a] / den, 0.0)
        pa = np.array(offs[a], dtype=np.float32)
        pb = np.array(offs[b], dtype=np.float32)
        pt = pa + t[..., None] * (pb - pa)
        acc += np.where(m[..., None], pt, 0.0)
        cnt += m
    ii, jj, kk = np.nonzero(active)
    n = len(ii)
    vid = -np.ones(active.shape, dtype=np.int64)
    vid[active] = np.arange(n)
    pos = (acc[active] / cnt[active][:, None]) + np.stack([ii, jj, kk], axis=1).astype(np.float32)
    verts = np.array(origin, dtype=np.float32) + pos * h
    faces = []
    # x-edges
    m = (s[:-1, 1:-1, 1:-1] != s[1:, 1:-1, 1:-1])
    i, j, k = np.nonzero(m)
    j += 1
    k += 1
    inside = s[i, j, k]
    q = np.stack([vid[i, j - 1, k - 1], vid[i, j, k - 1], vid[i, j, k], vid[i, j - 1, k]], axis=1)
    q[inside] = q[inside][:, ::-1]
    faces.append(q)
    # y-edges
    m = (s[1:-1, :-1, 1:-1] != s[1:-1, 1:, 1:-1])
    i, j, k = np.nonzero(m)
    i += 1
    k += 1
    inside = s[i, j, k]
    q = np.stack([vid[i - 1, j, k - 1], vid[i, j, k - 1], vid[i, j, k], vid[i - 1, j, k]], axis=1)
    q[~inside] = q[~inside][:, ::-1]
    faces.append(q)
    # z-edges
    m = (s[1:-1, 1:-1, :-1] != s[1:-1, 1:-1, 1:])
    i, j, k = np.nonzero(m)
    i += 1
    j += 1
    inside = s[i, j, k]
    q = np.stack([vid[i - 1, j - 1, k], vid[i, j - 1, k], vid[i, j, k], vid[i - 1, j, k]], axis=1)
    q[inside] = q[inside][:, ::-1]
    faces.append(q)
    return verts, np.concatenate(faces, axis=0)


def keep_largest_shell(ob):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.faces.ensure_lookup_table()
    for i, f in enumerate(bm.faces):
        f.index = i
    seen, comps = set(), []
    for f in bm.faces:
        if f.index in seen:
            continue
        comp, stack = [], [f]
        seen.add(f.index)
        while stack:
            cur = stack.pop()
            comp.append(cur)
            for e in cur.edges:
                for g in e.link_faces:
                    if g.index not in seen:
                        seen.add(g.index)
                        stack.append(g)
        comps.append(comp)
    if len(comps) > 1:
        comps.sort(key=len, reverse=True)
        drop = [f for c in comps[1:] for f in c]
        bmesh.ops.delete(bm, geom=drop, context='FACES')
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.update()
    return len(comps)


def nonmanifold_count(ob):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    n = sum(1 for e in bm.edges if not e.is_manifold)
    bm.free()
    return n


def sdf_to_object(name, fn, lo, hi, h, blur=0, offsets=(0.0, -0.06, 0.06, -0.12, 0.12, -0.2, 0.2)):
    """Sample fn(P)->distance on a grid over [lo, hi] with cell size h and mesh the zero level set.
    Retries with tiny inflate/deflate offsets until the surface-nets mesh is a manifold single shell."""
    xs = np.arange(lo[0], hi[0] + h, h, dtype=np.float32)
    ys = np.arange(lo[1], hi[1] + h, h, dtype=np.float32)
    zs = np.arange(lo[2], hi[2] + h, h, dtype=np.float32)
    P = np.stack(np.meshgrid(xs, ys, zs, indexing='ij'), axis=-1)
    F0 = fn(P).astype(np.float32)
    ob = None
    for off in offsets:
        F = F0 + off
        verts, faces = surface_nets(F, lo, h)
        cand = clean(obj_from_pydata(name, verts.tolist(), faces.tolist()))
        n = keep_largest_shell(cand)
        clean(cand)
        bad = nonmanifold_count(cand)
        print('SDF try offset', off, 'nonmanifold', bad, 'shells dropped', n - 1)
        if ob is not None:
            delete(ob)
        ob = cand
        if n > 1:
            print("SDF dropped", n - 1, "stray shells")
        if bad == 0:
            if off != 0.0:
                print("SDF manifold after offset", off)
            return ob
    print("WARNING SDF still non-manifold:", bad)
    return ob


# --------------------------------------------------------------------------- 2D SDF shapes (XZ plane) + rounded extrusion
def sd_circle2(x, z, cx, cz, r):
    return np.hypot(x - cx, z - cz) - r


def sd_rbox2(x, z, cx, cz, hx, hz, r):
    qx = np.abs(x - cx) - hx + r
    qz = np.abs(z - cz) - hz + r
    return np.hypot(np.maximum(qx, 0), np.maximum(qz, 0)) + np.minimum(np.maximum(qx, qz), 0) - r


def sd_seg2(x, z, ax, az, bx, bz, r=0.0):
    """Capsule (segment a-b with radius r)."""
    px, pz = x - ax, z - az
    bax, baz = bx - ax, bz - az
    t = np.clip((px * bax + pz * baz) / max(bax * bax + baz * baz, 1e-9), 0.0, 1.0)
    return np.hypot(px - t * bax, pz - t * baz) - r


def sd_hex2(x, z, cx, cz, r):
    k = np.array([-0.866025404, 0.5, 0.577350269], dtype=np.float32)
    px, pz = np.abs(x - cx), np.abs(z - cz)
    dt = np.minimum(k[0] * px + k[1] * pz, 0.0)
    px = px - 2.0 * dt * k[0]
    pz = pz - 2.0 * dt * k[1]
    px = px - np.clip(px, -k[2] * r, k[2] * r)
    pz = pz - r
    return np.hypot(px, pz) * np.sign(pz)


def extrude_round(d2, w, h, r):
    """3D distance of a 2D shape (d2) extruded to half-thickness h along w with edge rounding radius r."""
    a = d2 + r
    b = np.abs(w) - h + r
    return np.minimum(np.maximum(a, b), 0) + np.hypot(np.maximum(a, 0), np.maximum(b, 0)) - r


def rot2(x, z, deg, cx=0.0, cz=0.0):
    """Coordinates of world points in a frame rotated CCW (as seen from the front) by deg about (cx, cz)."""
    a = radians(deg)
    dx, dz = x - cx, z - cz
    return dx * cos(a) + dz * sin(a), -dx * sin(a) + dz * cos(a)


def sdf_extent(fn, lo, hi, h=0.5):
    xs = np.arange(lo[0], hi[0] + h, h, dtype=np.float32)
    ys = np.arange(lo[1], hi[1] + h, h, dtype=np.float32)
    zs = np.arange(lo[2], hi[2] + h, h, dtype=np.float32)
    P = np.stack(np.meshgrid(xs, ys, zs, indexing='ij'), axis=-1)
    m = fn(P) < 0
    ix, iy, iz = np.nonzero(m)
    mn = np.array([xs[ix.min()], ys[iy.min()], zs[iz.min()]])
    mx = np.array([xs[ix.max()], ys[iy.max()], zs[iz.max()]])
    return mn, mx


def decimate_safe(ob, target_tris, factors=(1.0, 0.95, 1.06, 0.9, 1.12, 0.85)):
    """Collapse-decimate to ~target_tris, retrying with nearby ratios until the result is a single watertight shell."""
    triangulate(ob)
    orig = ob.data
    last = None
    for f in factors:
        ob.data = orig.copy()
        ratio = min(1.0, target_tris * f / max(1, tri_count(ob)))
        if ratio >= 1.0:
            break
        decimate(ob, ratio)
        triangulate(ob)
        a = analyze(ob)
        last = a
        if a['nonmanifold'] == 0 and a['shells'] == 1 and a['loose'] == 0:
            return ob
    print("WARNING decimate_safe: could not reach a clean mesh", last)
    return ob
