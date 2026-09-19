"""Acceptance checks (brief, section 14) run against the delivered files, not the build scenes.

    blender -b --factory-startup -P verify.py            -> prints a report, writes work/verify.json
    blender -b --factory-startup -P verify.py -- grey    -> first rewrites each diffuse.png as an 8-bit greyscale PNG
"""
import sys
import zlib
sys.path.insert(0, r"D:\page_content\blender\scripts")
from lib import *

KEYS = ["loop-1-pitch", "loop-2-crew", "loop-3-build", "loop-4-unstuck", "loop-5-ship", "loop-6-launch",
        "membership-pr", "decisions-rfc"]
MAPS = {"membership-pr": 1024, "decisions-rfc": 2048}
TRI_MAX = {k: (8000 if k in MAPS else 5000) for k in KEYS}
FOOT = {k: ((0.6, 0.8) if k == "membership-pr" else (0.55, 0.75) if k == "decisions-rfc" else (0.6, 1.6)) for k in KEYS}
PREV = os.path.join(EXPORT, "previews")


def glb_json(path):
    with open(path, 'rb') as f:
        data = f.read()
    clen = struct.unpack('<I', data[12:16])[0]
    return len(data), json.loads(data[20:20 + clen].decode('utf8'))


def png_header(path):
    with open(path, 'rb') as f:
        head = f.read(33)
    w, h, depth, ctype = struct.unpack('>IIBB', head[16:26])
    return dict(w=w, h=h, bit_depth=depth, color={0: "grey", 2: "RGB", 4: "grey+alpha", 6: "RGBA"}.get(ctype, ctype),
                kb=round(os.path.getsize(path) / 1024, 1))


def write_png_grey(path, grey):
    """grey: H x W floats 0..1, row 0 = bottom (Blender order). Writes an 8-bit greyscale PNG."""
    a = np.clip(np.round(grey[::-1] * 255.0), 0, 255).astype(np.uint8)
    h, w = a.shape
    raw = b"".join(b"\x00" + a[y].tobytes() for y in range(h))

    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)

    png = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 0, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(png)


def to_grey(path):
    img = bpy.data.images.load(path, check_existing=False)
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    bpy.data.images.remove(img)
    spread = float(np.abs(px[..., 0] - px[..., 1]).max() + np.abs(px[..., 0] - px[..., 2]).max())
    assert spread < 1e-6, "ink map is not grey: " + path
    write_png_grey(path, px[..., 0])


def mesh_checks(path):
    fresh()
    bpy.ops.import_scene.gltf(filepath=path)
    obs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    ob = obs[0]
    uv = np.array([l.uv[:] for l in ob.data.uv_layers.active.data]) if ob.data.uv_layers else None
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)   # weld the seam / sharp-edge splits the exporter makes
    bm.faces.ensure_lookup_table()
    for i, f in enumerate(bm.faces):
        f.index = i
    res = dict(
        mesh_objects=len(obs),
        nonmanifold_edges=sum(1 for e in bm.edges if not e.is_manifold),
        loose_verts=sum(1 for v in bm.verts if not v.link_faces),
        shells=shells(bm),
        volume=round(bm.calc_volume(signed=True), 2),
        uv_layers=len(ob.data.uv_layers),
        uv_min=[round(float(x), 4) for x in uv.min(axis=0)] if uv is not None else None,
        uv_max=[round(float(x), 4) for x in uv.max(axis=0)] if uv is not None else None,
    )
    bm.free()
    return res


def main():
    grey = "grey" in sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else False
    report, fails, total = {}, [], 0
    for k in KEYS:
        path = os.path.join(EXPORT, k + ".glb")
        size, js = glb_json(path)
        total += size
        prim = js['meshes'][0]['primitives'][0]
        acc = js['accessors']
        pos = acc[prim['attributes']['POSITION']]
        mn, mx = np.array(pos['min']), np.array(pos['max'])
        ext, ctr = mx - mn, (mn + mx) / 2
        node = js['nodes'][0]
        r = dict(
            kb=round(size / 1024, 1),
            tris=acc[prim['indices']]['count'] // 3 if 'indices' in prim else pos['count'] // 3,
            bbox_xyz=[round(float(v), 3) for v in ext],
            centre=[round(float(v), 4) for v in ctr],
            footprint=round(float(ext[0] / ext[1]), 3),
            attrs=sorted(prim['attributes']),
            meshes=len(js['meshes']), primitives=sum(len(m['primitives']) for m in js['meshes']),
            nodes=len(js['nodes']), node_transform=[t for t in ('translation', 'rotation', 'scale', 'matrix') if t in node],
            materials=len(js.get('materials', [])), textures=len(js.get('textures', [])),
            images=len(js.get('images', [])), animations=len(js.get('animations', [])),
            cameras=len(js.get('cameras', [])), extensions=js.get('extensionsUsed', []),
        )
        r.update(mesh_checks(path))
        if k in MAPS:
            for m in ("normal", "diffuse"):
                p = os.path.join(EXPORT, k, m + ".png")
                if m == "diffuse" and grey:
                    to_grey(p)
                r[m] = png_header(p)
        f = []
        if not (9 <= max(ext[0], ext[1]) <= 12):
            f.append("longest side %.2f" % max(ext[0], ext[1]))
        if np.abs(ctr).max() > 0.01:
            f.append("origin off bbox centre")
        if r['node_transform']:
            f.append("node carries a transform")
        lo, hi = FOOT[k]
        if not (lo <= r['footprint'] <= hi):
            f.append("footprint %.3f outside %s" % (r['footprint'], (lo, hi)))
        if r['nonmanifold_edges'] or r['loose_verts'] or r['shells'] != 1 or r['volume'] <= 0:
            f.append("not a closed outward single shell")
        if r['uv_layers'] != 1 or min(r['uv_min']) < 0 or max(r['uv_max']) > 1:
            f.append("UVs")
        if not (500 <= r['tris'] <= TRI_MAX[k]):
            f.append("tris %d" % r['tris'])
        if size > 200 * 1024:
            f.append("over 200 KB")
        if r['attrs'] != ['NORMAL', 'POSITION', 'TEXCOORD_0']:
            f.append("attributes %s" % r['attrs'])
        if r['materials'] or r['textures'] or r['images'] or r['animations'] or r['cameras'] or r['extensions']:
            f.append("extras in glb")
        if k in MAPS:
            n, d = r['normal'], r['diffuse']
            if (n['w'], n['h'], n['bit_depth'], n['color']) != (MAPS[k], MAPS[k], 8, "RGB"):
                f.append("normal.png %s" % n)
            if (d['w'], d['h'], d['bit_depth']) != (MAPS[k], MAPS[k], 8):
                f.append("diffuse.png %s" % d)
        mp4 = os.path.join(PREV, k + ".mp4")
        clip = bpy.data.movieclips.load(mp4)
        r['turntable'] = dict(frames=clip.frame_duration, size=list(clip.size), fps=clip.fps,
                              mb=round(os.path.getsize(mp4) / 2 ** 20, 2))
        if (clip.frame_duration, tuple(clip.size), round(clip.fps)) != (180, (1080, 1080), 30):
            f.append("turntable %s" % r['turntable'])
        s = png_header(os.path.join(PREV, k + ".png"))
        r['still'] = s
        if (s['w'], s['h']) != (1080, 1080):
            f.append("still %s" % s)
        r['fails'] = f
        fails += [k + ": " + x for x in f]
        report[k] = r
        print("VERIFY", k, json.dumps(r))
    report['_total_kb'] = round(total / 1024, 1)
    report['_contact_sheet'] = png_header(os.path.join(PREV, "contact-sheet.png"))
    report['_silhouette_test'] = png_header(os.path.join(PREV, "silhouette-test.png"))
    if total > 1024 * 1024:
        fails.append("all eight glbs %.1f KB > 1 MB" % (total / 1024))
    with open(os.path.join(WORK, "verify.json"), "w") as fh:
        json.dump(report, fh, indent=1)
    print("TOTAL_KB", report['_total_kb'])
    print("FAILS", fails if fails else "none")


main()
