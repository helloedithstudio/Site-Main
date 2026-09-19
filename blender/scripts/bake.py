"""Helpers for the two baked-map hero objects (7 pull-request glyph, 8 RFC scroll). Builds on lib.py."""
import sys
sys.path.insert(0, r"D:\page_content\blender\scripts")
from lib import *


def sd_tri2(x, z, A, B, C, r=0.0):
    """Triangle in the XZ plane with rounded corners (radius r): exact distance of the inset triangle, minus r."""
    A, B, C = [np.array(p, dtype=np.float64) for p in (A, B, C)]
    if (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]) < 0:
        B, C = C, B
    a, b, c = np.linalg.norm(B - C), np.linalg.norm(C - A), np.linalg.norm(A - B)
    inc = (a * A + b * B + c * C) / (a + b + c)
    s = 0.5 * (a + b + c)
    area = 0.5 * abs((B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]))
    rho = area / s
    k = max((rho - r) / rho, 0.05)
    A, B, C = [inc + (p - inc) * k for p in (A, B, C)]
    inside = np.ones_like(x, dtype=bool)
    ds = []
    for P0, P1 in ((A, B), (B, C), (C, A)):
        ds.append(sd_seg2(x, z, P0[0], P0[1], P1[0], P1[1], 0.0))
        cr = (P1[0] - P0[0]) * (z - P0[1]) - (P1[1] - P0[1]) * (x - P0[0])
        inside &= cr >= 0
    d = np.minimum(np.minimum(ds[0], ds[1]), ds[2])
    return np.where(inside, -d, d) - r


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def sdf_grid(fn, lo, hi, h):
    xs = np.arange(lo[0], hi[0] + h, h, dtype=np.float32)
    ys = np.arange(lo[1], hi[1] + h, h, dtype=np.float32)
    zs = np.arange(lo[2], hi[2] + h, h, dtype=np.float32)
    P = np.stack(np.meshgrid(xs, ys, zs, indexing='ij'), axis=-1)
    return fn(P).astype(np.float32)


def sdf_highpoly(name, fn, lo, hi, h, smooth_iters=2):
    """Dense smooth-shaded mesh of the F<0 region, used only as a bake source (need not be manifold)."""
    F = sdf_grid(fn, lo, hi, h)
    verts, faces = surface_nets(F, lo, h)
    ob = obj_from_pydata(name, verts.tolist(), faces.tolist())
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bm.calc_volume(signed=True) < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    for f in bm.faces:
        f.smooth = True
    bm.to_mesh(ob.data)
    bm.free()
    if smooth_iters:
        laplacian(ob, 0.4, smooth_iters)
    print("HIGH", name, len(ob.data.polygons), "faces")
    return ob


def match_transform(low, others, size=10.0):
    """Normalise `low` (longest of X/Z = size, origin at bbox centre) and apply the same transform to every mesh in `others`."""
    mn, mx = bbox(low)
    ext = mx - mn
    s = size / max(ext.x, ext.z)
    c = (mn + mx) / 2
    M = Matrix.Scale(s, 4) @ Matrix.Translation(-c)
    for o in [low] + list(others):
        o.data.transform(M @ o.matrix_world)
        o.matrix_world = Matrix.Identity(4)
        o.data.update()


def unwrap_pack(ob, px, angle=66.0, island_margin=0.003):
    """Smart-UV project, then pack all islands into 0..1 with 16 px padding for a px-sized map."""
    for uvl in list(ob.data.uv_layers):
        ob.data.uv_layers.remove(uvl)
    update()
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=radians(angle), island_margin=island_margin, area_weight=0.0,
                             correct_aspect=True, scale_to_bounds=False)
    bpy.ops.uv.select_all(action='SELECT')
    bpy.ops.uv.pack_islands(udim_source='CLOSEST_UDIM', rotate=False, margin_method='FRACTION',
                            margin=20.0 / px, shape_method='CONCAVE')
    bpy.ops.object.mode_set(mode='OBJECT')
    return ob


def front_back_classes(bm, mid=None):
    """True = front (facing -Y) for every face. Side of the object's mid-surface (mid(z) -> y, default y=0) by centroid, then
    every stray same-class patch except the biggest of each class is flipped to the other side."""
    bm.faces.ensure_lookup_table()
    for i, f in enumerate(bm.faces):
        f.index = i
    cls = []
    for f in bm.faces:
        c = f.calc_center_median()
        cls.append((c.y - (float(mid(c.z)) if mid else 0.0)) < 0)
    for _ in range(8):
        seen, comps = set(), []
        for f in bm.faces:
            if f.index in seen:
                continue
            comp, stack = [], [f]
            seen.add(f.index)
            while stack:
                cur = stack.pop()
                comp.append(cur.index)
                for e in cur.edges:
                    for g in e.link_faces:
                        if g.index not in seen and cls[g.index] == cls[cur.index]:
                            seen.add(g.index)
                            stack.append(g)
            comps.append(comp)
        keep = {}
        for comp in comps:
            c = cls[comp[0]]
            if c not in keep or len(comp) > len(keep[c]):
                keep[c] = comp
        keepset = {id(v) for v in keep.values()}
        stray = [c for c in comps if id(c) not in keepset]
        if not stray:
            break
        for comp in stray:
            for i in comp:
                cls[i] = not cls[i]
    return cls


def unwrap_planar_fb(ob, px, unroll=0.4, mid=None):
    """Planar front/back unwrap for slab-like sculptures. Front faces (centroid y<0) use u=x+c*nx, v=z+c*nz; back faces
    are mirrored in x. Pushing each vertex along its normal by `unroll` spreads the rounded side walls so they keep
    texel area (the seam sits on the y=0 mid-plane). Islands are then packed with 20 px margin."""
    for uvl in list(ob.data.uv_layers):
        ob.data.uv_layers.remove(uvl)
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.normal_update()
    layer = bm.loops.layers.uv.new("UVMap")
    cls = front_back_classes(bm, mid)
    print("FB classes: front", sum(cls), "back", len(cls) - sum(cls))
    for f in bm.faces:
        front = cls[f.index]
        for lp in f.loops:
            v = lp.vert
            u = v.co.x + unroll * v.normal.x
            w = v.co.z + unroll * v.normal.z
            lp[layer].uv = (u if front else -u, w)
    bm.to_mesh(ob.data)
    bm.free()
    update()
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.select_all(action='SELECT')
    bpy.ops.uv.pack_islands(udim_source='CLOSEST_UDIM', rotate=False, margin_method='FRACTION',
                            margin=20.0 / px, shape_method='CONCAVE')
    bpy.ops.object.mode_set(mode='OBJECT')
    return ob


def unwrap_front_back(ob, px, method='CONFORMAL'):
    """Slab-like objects: put a seam wherever the surface turns from facing the camera (-Y) to facing away, unwrap the
    front and back halves as two big islands, pack with 16+ px padding."""
    for uvl in list(ob.data.uv_layers):
        ob.data.uv_layers.remove(uvl)
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.faces.ensure_lookup_table()
    cls = [f.calc_center_median().y < 0 for f in bm.faces]
    # merge stray fragments: any connected same-class patch except the biggest one of each class flips to the other side
    for _ in range(8):
        seen, comps = set(), []
        for f in bm.faces:
            if f.index in seen:
                continue
            comp, stack = [], [f]
            seen.add(f.index)
            while stack:
                cur = stack.pop()
                comp.append(cur.index)
                for e in cur.edges:
                    for g in e.link_faces:
                        if g.index not in seen and cls[g.index] == cls[cur.index]:
                            seen.add(g.index)
                            stack.append(g)
            comps.append(comp)
        keep = {}
        for comp in comps:
            c = cls[comp[0]]
            if c not in keep or len(comp) > len(keep[c]):
                keep[c] = comp
        keepset = {id(v) for v in keep.values()}
        stray = [c for c in comps if id(c) not in keepset]
        if not stray:
            break
        for comp in stray:
            for i in comp:
                cls[i] = not cls[i]
    for e in bm.edges:
        e.seam = len(e.link_faces) == 2 and cls[e.link_faces[0].index] != cls[e.link_faces[1].index]
    bm.to_mesh(ob.data)
    bm.free()
    update()
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.unwrap(method=method, margin=0.003)
    bpy.ops.uv.select_all(action='SELECT')
    bpy.ops.uv.pack_islands(udim_source='CLOSEST_UDIM', rotate=False, margin_method='FRACTION',
                            margin=20.0 / px, shape_method='CONCAVE')
    bpy.ops.object.mode_set(mode='OBJECT')
    return ob


def bake_normal(low, high, path, px, extrusion=0.35, max_ray=0.7, margin=16):
    """Tangent-space, OpenGL (+Y green) normal bake high -> low, Cycles CPU. Saved as 8-bit RGB PNG; returns the pixel array."""
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 1
    sc.cycles.use_denoising = False
    b = sc.render.bake
    b.use_selected_to_active = True
    b.cage_extrusion = extrusion
    b.max_ray_distance = max_ray
    b.margin = margin
    b.margin_type = 'EXTEND'
    b.normal_space = 'TANGENT'
    b.normal_r, b.normal_g, b.normal_b = 'POS_X', 'POS_Y', 'POS_Z'
    b.target = 'IMAGE_TEXTURES'
    img = bpy.data.images.new("bake_n", px, px, alpha=False)
    img.colorspace_settings.name = 'Non-Color'
    img.generated_color = (0.5, 0.5, 1.0, 1.0)
    mat = bpy.data.materials.new("bake_m")
    mat.use_nodes = True
    tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = img
    mat.node_tree.nodes.active = tex
    low.data.materials.clear()
    low.data.materials.append(mat)
    bpy.ops.object.select_all(action='DESELECT')
    high.select_set(True)
    low.select_set(True)
    bpy.context.view_layer.objects.active = low
    bpy.ops.object.bake(type='NORMAL')
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()
    low.data.materials.clear()
    arr = np.array(img.pixels[:], dtype=np.float32).reshape(px, px, 4)
    bpy.data.images.remove(img)
    bpy.data.materials.remove(mat)
    return arr


def box_blur(a, r):
    if r <= 0:
        return a
    k = 2 * r + 1
    c = np.cumsum(np.pad(a, ((r + 1, r), (0, 0)), mode='edge'), axis=0)
    a = (c[k:] - c[:-k]) / k
    c = np.cumsum(np.pad(a, ((0, 0), (r + 1, r)), mode='edge'), axis=1)
    return (c[:, k:] - c[:, :-k]) / k


def make_ink(normal_px, path, strength=5.0, floor=0.35, patina=0.10, seed=3):
    """Greyscale ink from the normal bake: engraved / concave detail darkens, flat stays white, plus a faint low-frequency patina."""
    px = normal_px.shape[0]
    n = normal_px[..., :3] * 2.0 - 1.0
    gx = np.gradient(n[..., 0], axis=1)
    gy = np.gradient(n[..., 1], axis=0)
    cav = box_blur(-(gx + gy), 1)          # >0 in grooves / concave detail, <0 on ridges
    ink = 1.0 - np.clip(cav * strength, 0.0, 1.0) * (1 - floor)
    rng = np.random.RandomState(seed)
    g = box_blur(rng.rand(px, px).astype(np.float32), max(2, px // 128))
    g = (g - g.mean()) / (g.std() + 1e-6)
    ink = np.clip(ink - patina * np.clip(g * 0.5 + 0.35, 0, 1), 0.0, 1.0)
    img = bpy.data.images.new("ink", px, px, alpha=False)
    img.colorspace_settings.name = 'Non-Color'
    out = np.ones((px, px, 4), dtype=np.float32)
    out[..., 0] = out[..., 1] = out[..., 2] = ink
    img.pixels = out.ravel().tolist()
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()
    bpy.data.images.remove(img)
    return ink


def uv_gap_check(ob, px):
    """Rasterise UV triangles; islands before vs after a 7 px dilation. Equal counts = islands at least ~14 px apart."""
    uvd = ob.data.uv_layers.active.data
    mask = np.zeros((px, px), dtype=bool)
    hits = np.zeros((px, px), dtype=np.int16)
    for t in ob.data.loop_triangles:
        tri = np.array([uvd[i].uv[:] for i in t.loops]) * px
        x0, y0 = np.floor(tri.min(axis=0)).astype(int)
        x1, y1 = np.ceil(tri.max(axis=0)).astype(int)
        x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, px - 1), min(y1, px - 1)
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        a, b, c = tri
        den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(den) < 1e-12:
            continue
        w1 = ((b[1] - c[1]) * (gx - c[0]) + (c[0] - b[0]) * (gy - c[1])) / den
        w2 = ((c[1] - a[1]) * (gx - c[0]) + (a[0] - c[0]) * (gy - c[1])) / den
        w3 = 1 - w1 - w2
        inside = (w1 >= -0.02) & (w2 >= -0.02) & (w3 >= -0.02)
        mask[y0:y1 + 1, x0:x1 + 1] |= inside
        hits[y0:y1 + 1, x0:x1 + 1] += (w1 > 0.02) & (w2 > 0.02) & (w3 > 0.02)
    print("UVOVERLAP %.4f of covered texels" % ((hits > 1).sum() / max(1, mask.sum())))

    def dil(m, r):
        o = m.copy()
        for dx in range(-r, r + 1):
            o |= np.roll(m, dx, axis=1)
        m2 = o.copy()
        for dy in range(-r, r + 1):
            m2 |= np.roll(o, dy, axis=0)
        return m2

    def count(m):
        seen = np.zeros_like(m)
        n, (H, W) = 0, m.shape
        for y0, x0 in zip(*np.nonzero(m)):
            if seen[y0, x0]:
                continue
            n += 1
            stack = [(y0, x0)]
            seen[y0, x0] = True
            while stack:
                y, x = stack.pop()
                for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                    if 0 <= yy < H and 0 <= xx < W and m[yy, xx] and not seen[yy, xx]:
                        seen[yy, xx] = True
                        stack.append((yy, xx))
        return n

    n0, n1 = count(dil(mask, 1)), count(dil(mask, 8))     # close raster pinholes, then require 16 px between islands
    print("UVGAP islands", n0, "after 8px dilation", n1, "coverage %.3f" % mask.mean())
    return n0, n1, float(mask.mean())


def finalize_baked(low, high, key, glb_name, px, sharp=45, tilt_x=0.0, roll=17.0, tri_range=(500, 8000),
                   size=10.0, extrusion=0.35, max_ray=0.7, mid=None):
    """normalise both meshes together -> shade -> UV+pack -> bake normal -> ink -> QA -> export .glb -> save .blend."""
    low.name, low.data.name = key, key
    clean(low)
    match_transform(low, [high], size)
    smooth_by_angle(low, sharp)
    unwrap_planar_fb(low, px, mid=mid)
    gap = uv_gap_check(low, px)
    mapdir = os.path.join(EXPORT, key)
    os.makedirs(mapdir, exist_ok=True)
    npx = bake_normal(low, high, os.path.join(mapdir, "normal.png"), px, extrusion=extrusion, max_ray=max_ray)
    make_ink(npx, os.path.join(mapdir, "diffuse.png"))
    a = report(low)
    path = os.path.join(EXPORT, glb_name)
    export_glb(low, path)
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
    if gap[0] != gap[1]:
        problems.append("UV islands closer than 16 px (%d -> %d)" % (gap[0], gap[1]))
    open_edges = roundtrip_open_edges(path)
    if open_edges:
        problems.append("%d open edges after the glTF round trip" % open_edges)
    print("PROBLEMS", problems if problems else "none")
    delete(high)
    bpy.context.scene.render.engine = 'BLENDER_WORKBENCH'
    save_blend(os.path.join(ROOT, key + ".blend"))
    preview_sheet(low, os.path.join(WORK, key + "_sheet.png"), tilt_x=tilt_x, roll=roll)
    return a, info
