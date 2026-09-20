"""The "Shipped by members" lineup: three glossy plinths, each with a floating project card that is still a skeleton
(nothing has shipped yet, and the image says so honestly). The cards rise left to right, ship it, show it, launch it,
and the middle one is the largest. One card glows per frame so the page can light them in turn.

    blender -b --factory-startup -P blender/scripts/ship_lineup.py -- preview
    blender -b --factory-startup -P blender/scripts/ship_lineup.py -- final base 0 1 2 cam=0,6,70,52 size=2000x1125 samples=128

Frames: base (nothing lit) and 0, 1, 2 (ship it, show it, launch it). Raw 16-bit PNGs go to blender/work/ship/;
web/scripts/make-hub-images.cjs (called with the "ship" preset) turns them into the site images.
"""
import bpy
import os
import sys
import time
from math import pi, sin, cos, radians
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.argv_backup = list(sys.argv)
import lib  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
MODE = ARGS[0] if ARGS else "preview"
WANT = [a for a in ARGS[1:] if a == "base" or a.isdigit()]
OUT = os.path.join(lib.WORK, "ship")
os.makedirs(OUT, exist_ok=True)

# Reuse the helpers of the hub stack without running its main().
import importlib.util  # noqa: E402

_spec = importlib.util.spec_from_file_location("hub_stack_helpers", os.path.join(os.path.dirname(os.path.abspath(__file__)), "hub_stack.py"))
sys.argv = ["x", "--", "preview"]
h = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(h)
sys.argv = sys.argv_backup

N = 3
RAMP = [(0xFE, 0xAF, 0x01), (0xF7, 0x0C, 0x5A), (0xE8, 0x03, 0xD1)]   # gold, red-pink, magenta

# x, plinth radius, card width, card height, card centre z, yaw (degrees) toward the middle
UNITS = [
    dict(x=-10.4, r=3.4, w=5.6, h=3.7, z=3.8, yaw=14.0),
    dict(x=0.0, r=4.0, w=7.2, h=4.8, z=5.2, yaw=0.0),
    dict(x=10.4, r=3.4, w=5.6, h=3.7, z=6.6, yaw=-14.0),
]


def lin(c):
    return tuple(h.srgb_to_lin(v) for v in c)


def rrect_xz(w, hh, r, n=10):
    return h.rounded_rect(w, hh, r, n)   # (x, y) pairs used as (x, z)


def slab(name, w, hh, r, thick, y_front, x=0.0, z=0.0):
    """Rounded rectangle slab in the XZ plane whose front face sits at y = y_front (front faces -Y)."""
    pts = rrect_xz(w, hh, r)
    ob = lib.extrude_outline(name, [(px + x, pz + z) for px, pz in pts], thick, y0=y_front + thick / 2)
    return ob


def build():
    lib.fresh()
    sc = bpy.context.scene
    dark = h.make_metal("plinth", (0.014, 0.014, 0.018), 0.3, 0.9, coat=0.4)
    card_mat = h.make_metal("card", (0.02, 0.02, 0.026), 0.28, 0.7, coat=0.5)
    glows = []
    for k in range(N):
        colour = lin(RAMP[k])
        parts = []
        for tag in ("ring", "media", "glyph", "bar", "pill", "frame"):
            parts.append(h.make_glow(f"{tag}{k}", colour))
        glows.append(parts)

    for k, u in enumerate(UNITS):
        ring_m, media_m, glyph_m, bar_m, pill_m, frame_m = glows[k]
        # plinth: chamfered lathe, then a lit ring in a groove on top
        r = u["r"]
        prof = [(0, 0), (r, 0), (r, 0.5), (r - 0.18, 0.68), (r - 0.55, 0.68), (r - 0.55, 0.92), (r - 0.8, 1.08), (0, 1.08)]
        pl = lib.lathe(f"plinth{k}", prof, seg=128)
        pl.location = (u["x"], 0, 0)
        lib.update()
        h.assign(pl, dark)
        lib.smooth_by_angle(pl, 40)
        top = 1.08
        groove = h.ring(f"gr{k}", u["x"], 0, r * 0.62, r * 0.62 - 0.14, top - 0.05, top + 0.2)
        rodm = h.ring(f"rod{k}", u["x"], 0, r * 0.62 - 0.02, r * 0.62 - 0.12, top - 0.06, top - 0.02)
        lib.boolean(pl, groove, 'DIFFERENCE')
        h.assign(pl, dark)
        h.assign(rodm, ring_m)
        rodm.name = f"ringlight{k}"

        # floating card: thin slab, a lit frame near its edge, media block with a glyph, two text bars, a pill
        w, hh, z = u["w"], u["h"], u["z"]
        parts = []
        card = slab(f"card{k}", w, hh, 0.45, 0.2, -0.1)
        h.assign(card, card_mat)
        lib.bevel(card, 0.05, segments=2, angle=35)
        lib.smooth_by_angle(card, 40)
        h.assign(card, card_mat)
        parts.append(card)

        y = -0.1   # front face
        eps = 0.045
        frame_o = slab(f"fo{k}", w - 0.5, hh - 0.5, 0.3, eps, y - eps)
        frame_i = slab(f"fi{k}", w - 0.68, hh - 0.68, 0.22, eps * 3, y - eps * 2)
        lib.boolean(frame_o, frame_i, 'DIFFERENCE')
        h.assign(frame_o, frame_m)
        parts.append(frame_o)

        mw, mh = w - 1.5, hh * 0.46
        media = slab(f"media{k}", mw, mh, 0.25, eps, y - eps, x=0.0, z=hh * 0.13)
        h.assign(media, media_m)
        parts.append(media)
        cx, cz = 0.0, hh * 0.13
        if k == 0:      # post it: a plus
            g = [slab(f"g{k}a", 1.5, 0.34, 0.16, eps, y - eps * 2, x=cx, z=cz), slab(f"g{k}b", 0.34, 1.5, 0.16, eps, y - eps * 2, x=cx, z=cz)]
        elif k == 1:    # show it: a play triangle
            tri = [(cx - 0.55, cz - 0.8), (cx + 0.8, cz), (cx - 0.55, cz + 0.8)]
            tri = lib.fillet_poly(tri, [0.18, 0.18, 0.18], n=5, closed=True)
            g = [lib.extrude_outline(f"g{k}", tri, eps, y0=y - eps * 2 - eps / 2)]
        else:           # launch it: an up arrow
            arrow = [(cx, cz + 0.95), (cx + 0.85, cz + 0.05), (cx + 0.3, cz + 0.05), (cx + 0.3, cz - 0.85), (cx - 0.3, cz - 0.85), (cx - 0.3, cz + 0.05), (cx - 0.85, cz + 0.05)]
            arrow = lib.fillet_poly(arrow, [0.14] * 7, n=4, closed=True)
            g = [lib.extrude_outline(f"g{k}", arrow, eps, y0=y - eps * 2 - eps / 2)]
        for gg in g:
            h.assign(gg, glyph_m)
            parts.append(gg)
        bz = -hh * 0.2
        b1 = slab(f"b1{k}", w * 0.62, 0.26, 0.13, eps, y - eps, x=-w * 0.12, z=bz)
        b2 = slab(f"b2{k}", w * 0.42, 0.26, 0.13, eps, y - eps, x=-w * 0.22, z=bz - 0.5)
        pill = slab(f"pill{k}", w * 0.22, 0.42, 0.2, eps, y - eps, x=w * 0.3, z=bz - 0.5)
        for bb, mm in ((b1, bar_m), (b2, bar_m), (pill, pill_m)):
            h.assign(bb, mm)
            parts.append(bb)

        # yaw the whole card toward the middle and lift it above its plinth
        for o in parts:
            o.rotation_euler = (radians(-4), 0, radians(u["yaw"]))
            o.location = (u["x"], 0, z + top)
        lib.update()

        # a faint column of light joining plinth and card
        cone = bpy.data.meshes.new(f"beam{k}")
        bm_pts = []
        n = 48
        r0, r1 = r * 0.6, min(w, hh) * 0.36
        z0, z1 = top, z + top - hh / 2
        verts = [(u["x"] + r0 * cos(2 * pi * i / n), r0 * sin(2 * pi * i / n), z0) for i in range(n)] + [(u["x"] + r1 * cos(2 * pi * i / n), r1 * sin(2 * pi * i / n), z1) for i in range(n)]
        faces = [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
        del bm_pts
        cone.from_pydata(verts, [], faces)
        cone.update()
        beam = bpy.data.objects.new(f"beam{k}", cone)
        lib.link(beam)
        bmat = bpy.data.materials.new(f"beam{k}")
        bmat.use_nodes = True
        nt = bmat.node_tree
        for nd in list(nt.nodes):
            nt.nodes.remove(nd)
        out = nt.nodes.new("ShaderNodeOutputMaterial")
        mix = nt.nodes.new("ShaderNodeMixShader")
        tr = nt.nodes.new("ShaderNodeBsdfTransparent")
        em = nt.nodes.new("ShaderNodeEmission")
        em.inputs["Color"].default_value = (*lin(RAMP[k]), 1.0)
        em.inputs["Strength"].default_value = 1.4
        # strongest where it leaves the plinth, gone by the card: Map Range on object-space Z
        tc = nt.nodes.new("ShaderNodeTexCoord")
        sep = nt.nodes.new("ShaderNodeSeparateXYZ")
        mr = nt.nodes.new("ShaderNodeMapRange")
        mr.inputs["From Min"].default_value = z0
        mr.inputs["From Max"].default_value = z1
        mr.inputs["To Min"].default_value = 1.0
        mr.inputs["To Max"].default_value = 0.0
        mr.clamp = True
        mul = nt.nodes.new("ShaderNodeMath")
        mul.operation = 'MULTIPLY'
        mul.inputs[1].default_value = 0.16
        nt.links.new(tc.outputs["Object"], sep.inputs["Vector"])
        nt.links.new(sep.outputs["Z"], mr.inputs["Value"])
        nt.links.new(mr.outputs["Result"], mul.inputs[0])
        nt.links.new(mul.outputs["Value"], mix.inputs["Fac"])
        nt.links.new(tr.outputs["BSDF"], mix.inputs[1])
        nt.links.new(em.outputs["Emission"], mix.inputs[2])
        nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
        bmat["beam_mul"] = mul.name
        beam.data.materials.append(bmat)

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

    mid = (0, 0, 4.0)
    area("softbox", (0, 30, 40), mid, 60, 26, 9000, (1.0, 0.93, 0.82))
    area("rimL", (-34, 12, 16), mid, 6, 44, 6500, (0.95, 0.12, 0.85))
    area("rimR", (34, 10, 16), mid, 6, 44, 7000, (1.0, 0.5, 0.1))
    area("front", (-8, -40, 34), mid, 50, 16, 5200, (1.0, 0.9, 0.8))
    area("fill", (0, -46, 10), mid, 60, 24, 500, (0.85, 0.9, 1.0))
    return sc, glows, mid


def set_state(glows, lit):
    """lit: index of the card that glows, or None. The resting state keeps everything faintly alive."""
    for k in range(N):
        on = (k == lit)
        ring_m, media_m, glyph_m, bar_m, pill_m, frame_m = glows[k]
        h.set_glow(ring_m, 1.0 if on else 0.16)
        h.set_glow(frame_m, 1.0 if on else 0.2)
        h.set_glow(media_m, 0.32 if on else 0.03)
        h.set_glow(glyph_m, 1.0 if on else 0.14)
        h.set_glow(bar_m, 0.6 if on else 0.03)
        h.set_glow(pill_m, 1.0 if on else 0.12)
    for ob in bpy.data.objects:
        if ob.name.startswith("beam"):
            k = int(ob.name[4:])
            m = ob.data.materials[0]
            m.node_tree.nodes[m["beam_mul"]].inputs[1].default_value = 0.34 if lit == k else 0.07


def main():
    t0 = time.time()
    sc, glows, mid = build()
    print("built in %.1fs" % (time.time() - t0))
    w, hgt, samples = (960, 432, 24) if MODE == "preview" else (2000, 900, 128)
    az, el, dist, lens = 0.0, 11.0, 44.0, 52.0
    for a in ARGS:
        if a.startswith("size="):
            w, hgt = [int(v) for v in a[5:].split("x")]
        if a.startswith("samples="):
            samples = int(a[8:])
        if a.startswith("cam="):
            az, el, dist, lens = [float(v) for v in a[4:].split(",")]
    cam = h.setup_render(sc, w, hgt, samples)
    h.aim(cam, (mid[0], mid[1], mid[2] + 0.6), az, el, dist, lens)
    frames = WANT if WANT else ["base", 0, 1, 2]
    frames = [f if f == "base" else int(f) for f in frames]
    for f in frames:
        set_state(glows, None if f == "base" else f)
        path = os.path.join(OUT, ("%s_%s.png" % ("prev" if MODE == "preview" else "raw", f)))
        sc.render.filepath = path
        t1 = time.time()
        bpy.ops.render.render(write_still=True)
        print("frame %s -> %s (%.1fs)" % (f, path, time.time() - t1))
    lib.save_blend(os.path.join(lib.ROOT, "ship-lineup.blend"))
    print("done in %.1fs" % (time.time() - t0))


if __name__ == "__main__":
    main()
