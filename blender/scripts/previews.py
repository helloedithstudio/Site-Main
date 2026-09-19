"""Preview rendering for the edith 3D objects: turntables, stills, silhouette test, contact sheet.

Everything is rendered from the exported .glb files (what the site will load), under the site matcap.
Objects without bespoke maps use Workbench + matcap; objects with normal/ink maps use a Cycles emission shader that
does the same view-space matcap lookup and applies the maps (normal scale 0.25, ink multiplied in). Not reproduced:
the blue-noise grain and the site's x2 map gain (brief, section 5).

Rest poses copy the site's transform stacks (web repo, lib/gl/objects):
  carousel, HomeHero.ts    pivot.rotation.y = spin (outer), fit.rotation.x = -0.2 (inner). The tilt lives in the
                           object's own frame, so it precesses as the object spins: top leaning away from the camera
                           at yaw 0, sideways at 90, toward the camera at 180.
  hero, SpinningModel.ts   Euler order ZXY: fit.rotation.z = 0.3 (outer roll), spin on fit.rotation.y (inner).
glTF -> Blender keeps X, maps glTF +Y (up) to Blender +Z and glTF +Z (toward the camera) to Blender -Y, so three.js
rotation.x = a is Blender X = a, rotation.y = a is Blender Z = a, and rotation.z = a is Blender Y = -a.
"""
import sys
sys.path.insert(0, r"D:\page_content\blender\scripts")
from lib import *

CAROUSEL_TILT = -0.2    # rad about Blender X, inner (three.js fit.rotation.x = -0.2)
HERO_ROLL = -0.3        # rad about Blender Y, outer (three.js fit.rotation.z = +0.3)
OBJECTS = [
    # key, slot, maps dir
    ("loop-1-pitch", "carousel", None),
    ("loop-2-crew", "carousel", None),
    ("loop-3-build", "carousel", None),
    ("loop-4-unstuck", "carousel", None),
    ("loop-5-ship", "carousel", None),
    ("loop-6-launch", "carousel", None),
    ("membership-pr", "membership", "membership-pr"),
    ("decisions-rfc", "decisions", "decisions-rfc"),
]
# screen box at 1900 px wide (w, h) and slot factor: px per unit = min(w / bboxX, h / bboxY) * factor (brief, 6.5 and 7)
SLOTS = {
    "carousel": ((253, 253), 0.75),
    "phone": ((156, 156), 0.75),
    "membership": ((364, 486), 1.5),
    "decisions": ((496, 598), 0.95),
}
PREV = os.path.join(EXPORT, "previews")


def import_glb(path):
    """Import a .glb (glTF +Y up, front +Z) into a fresh scene; returns the single mesh object at the origin."""
    fresh()
    bpy.ops.import_scene.gltf(filepath=path)
    obs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    assert len(obs) == 1, "expected one mesh in %s, got %d" % (path, len(obs))
    ob = obs[0]
    ob.parent = None
    ob.matrix_world = Matrix.Identity(4)
    for o in list(bpy.context.scene.objects):
        if o.type != 'MESH':
            bpy.data.objects.remove(o, do_unlink=True)
    ob.rotation_mode = 'XYZ'
    return ob


def site_material(ob, normal_path=None, ink_path=None, normal_scale=0.25):
    """Emission-only material reproducing MeshMatcapMaterial: view-space normal -> matcap colour x ink."""
    mat = bpy.data.materials.new("site")
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    emi = nt.nodes.new('ShaderNodeEmission')
    nt.links.new(emi.outputs['Emission'], out.inputs['Surface'])
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    nrm_src = geo.outputs['Normal']
    if normal_path:
        timg = nt.nodes.new('ShaderNodeTexImage')
        timg.image = bpy.data.images.load(normal_path)
        timg.image.colorspace_settings.name = 'Non-Color'
        uvn = nt.nodes.new('ShaderNodeUVMap')
        nt.links.new(uvn.outputs['UV'], timg.inputs['Vector'])
        nm = nt.nodes.new('ShaderNodeNormalMap')
        nm.space = 'TANGENT'
        nm.inputs['Strength'].default_value = normal_scale
        nt.links.new(timg.outputs['Color'], nm.inputs['Color'])
        nrm_src = nm.outputs['Normal']
    vt = nt.nodes.new('ShaderNodeVectorTransform')
    vt.vector_type = 'NORMAL'
    vt.convert_from, vt.convert_to = 'WORLD', 'CAMERA'
    nt.links.new(nrm_src, vt.inputs['Vector'])
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(vt.outputs['Vector'], sep.inputs['Vector'])
    comb = nt.nodes.new('ShaderNodeCombineXYZ')
    for axis in ('X', 'Y'):
        m = nt.nodes.new('ShaderNodeMath')
        m.operation = 'MULTIPLY_ADD'
        m.inputs[1].default_value = 0.495
        m.inputs[2].default_value = 0.5
        nt.links.new(sep.outputs[axis], m.inputs[0])
        nt.links.new(m.outputs['Value'], comb.inputs[axis])
    mc = nt.nodes.new('ShaderNodeTexImage')
    mc.image = bpy.data.images.load(MATCAP)
    mc.extension = 'EXTEND'
    mc.interpolation = 'Linear'
    nt.links.new(comb.outputs['Vector'], mc.inputs['Vector'])
    color = mc.outputs['Color']
    if ink_path:
        iimg = nt.nodes.new('ShaderNodeTexImage')
        iimg.image = bpy.data.images.load(ink_path)
        iimg.image.colorspace_settings.name = 'Non-Color'
        uvn2 = nt.nodes.new('ShaderNodeUVMap')
        nt.links.new(uvn2.outputs['UV'], iimg.inputs['Vector'])
        mix = nt.nodes.new('ShaderNodeMix')
        mix.data_type = 'RGBA'
        mix.blend_type = 'MULTIPLY'
        mix.inputs['Factor'].default_value = 1.0
        nt.links.new(color, mix.inputs['A'])
        nt.links.new(iimg.outputs['Color'], mix.inputs['B'])
        color = mix.outputs['Result']
    nt.links.new(color, emi.inputs['Color'])
    ob.data.materials.clear()
    ob.data.materials.append(mat)
    return mat


def setup_cycles(w, h, samples=16):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.cycles.use_denoising = False
    sc.cycles.max_bounces = 0
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = w, h, 100
    sc.render.film_transparent = False
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    sc.display_settings.display_device = 'sRGB'
    wd = bpy.data.worlds.new("w")
    wd.color = (0, 0, 0)
    wd.use_nodes = True
    for n in wd.node_tree.nodes:
        if n.type == 'BACKGROUND':
            n.inputs['Color'].default_value = (0, 0, 0, 1)
            n.inputs['Strength'].default_value = 0.0
    sc.world = wd
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGB'
    return sc


def rig(ob, slot):
    """Put the object into its slot's transform stack (module docstring). Returns the empty that spins about Blender Z.
    slot None = no rest pose (silhouette test)."""
    spin = link(bpy.data.objects.new("spin", None))
    rest = link(bpy.data.objects.new("rest", None))
    rest.rotation_mode = spin.rotation_mode = 'XYZ'
    if slot in ("carousel", "phone"):
        rest.rotation_euler = (CAROUSEL_TILT, 0.0, 0.0)
        rest.parent = spin
        ob.parent = rest
    elif slot in ("membership", "decisions"):
        rest.rotation_euler = (0.0, HERO_ROLL, 0.0)
        spin.parent = rest
        ob.parent = spin
    else:
        ob.parent = spin
    return spin


def site_ppu(ob, slot):
    """Pixels per model unit on the site at 1900 px wide (phone for slot 'phone'), from the rest-pose bounding box."""
    (bw, bh), f = SLOTS[slot]
    co = np.array([v.co[:] for v in ob.data.vertices])
    ext = co.max(axis=0) - co.min(axis=0)   # Blender X = glTF X (width), Blender Z = glTF Y (height)
    return min(bw / ext[0], bh / ext[2]) * f


def make_scene(glb, slot, maps, w, h, flat=False):
    ob = import_glb(glb)
    if maps and not flat:
        setup_cycles(w, h)
        site_material(ob, os.path.join(EXPORT, maps, "normal.png"), os.path.join(EXPORT, maps, "diffuse.png"))
    else:
        setup_render(w, h, flat=flat)
    cam = setup_camera(28.0, 30.0)
    cam.data.sensor_fit = 'VERTICAL'    # set the fit first: angle is converted to a focal length on the fitted sensor side
    cam.data.angle = radians(30.0)
    spin = rig(ob, slot)
    return ob, spin


def frame_ppu(ppu, h):
    """Camera distance at which 1 model unit covers `ppu` pixels of an `h`-pixel-tall frame (30 degree vertical FOV)."""
    bpy.context.scene.camera.location = (0, -h / (2.0 * ppu * tan(radians(15.0))), 0)


def render_array(path=None):
    tmp = path or os.path.join(WORK, "_tmp.png")
    render_to(tmp)
    a = load_pixels(tmp)
    if path is None:
        os.remove(tmp)
    return a


def render_still(key, slot, maps, yaw=35.0, size=1080):
    ob, spin = make_scene(os.path.join(EXPORT, key + ".glb"), slot, maps, size, size)
    spin.rotation_euler = (0, 0, radians(yaw))
    update()
    render_to(os.path.join(PREV, key + ".png"))


def _fcurves(action):
    if hasattr(action, "fcurves"):
        return list(action.fcurves)
    out = []
    for layer in action.layers:
        for strip in layer.strips:
            for cb in strip.channelbags:
                out.extend(cb.fcurves)
    return out


def render_turntable(key, slot, maps, frames=180, fps=30, size=1080):
    ob, spin = make_scene(os.path.join(EXPORT, key + ".glb"), slot, maps, size, size)
    sc = bpy.context.scene
    sc.frame_start, sc.frame_end = 1, frames
    sc.render.fps = fps
    spin.rotation_euler = (0, 0, 0)
    spin.keyframe_insert('rotation_euler', index=2, frame=1)
    spin.rotation_euler = (0, 0, 2 * pi)
    spin.keyframe_insert('rotation_euler', index=2, frame=frames + 1)   # frame 181 = frame 1: a seamless loop
    for fc in _fcurves(spin.animation_data.action):
        for kp in fc.keyframe_points:
            kp.interpolation = 'LINEAR'
    sc.render.image_settings.media_type = 'VIDEO'
    sc.render.image_settings.file_format = 'FFMPEG'
    sc.render.ffmpeg.format = 'MPEG4'
    sc.render.ffmpeg.codec = 'H264'
    sc.render.ffmpeg.constant_rate_factor = 'HIGH'
    sc.render.ffmpeg.ffmpeg_preset = 'GOOD'
    sc.render.ffmpeg.gopsize = 30
    sc.render.image_settings.color_mode = 'RGB'
    sc.render.filepath = os.path.join(PREV, key + ".mp4")
    bpy.ops.render.render(animation=True)


def silhouette_test(path, frame=156, yaws=tuple(range(0, 360, 45))):
    """Brief checklist: solid white on black, longest side 117 px (phone), 8 yaws 45 degrees apart, no rest pose.
    One row per object. Reports, per angle, silhouette area and bbox (px) and the area relative to the object's best angle."""
    rows = []
    for key, slot, maps in OBJECTS:
        ob, spin = make_scene(os.path.join(EXPORT, key + ".glb"), None, None, frame, frame, flat=True)
        co = np.array([v.co[:] for v in ob.data.vertices])
        ext = co.max(axis=0) - co.min(axis=0)
        frame_ppu(117.0 / max(ext[0], ext[2]), frame)
        tiles, stats = [], []
        for yaw in yaws:
            spin.rotation_euler = (0, 0, radians(yaw))
            update()
            a = render_array()
            m = a[..., :3].mean(axis=2) > 0.5
            ys, xs = np.nonzero(m)
            stats.append((int(m.sum()), int(xs.max() - xs.min() + 1) if len(xs) else 0, int(ys.max() - ys.min() + 1) if len(ys) else 0))
            tiles.append(a)
        best = max(s[0] for s in stats)
        print("SIL", key, " ".join("%d:%dpx(%dx%d,%.0f%%)" % (y, s[0], s[1], s[2], 100.0 * s[0] / best) for y, s in zip(yaws, stats)))
        rows.append(tiles)
    sheet = np.zeros((len(rows) * frame, len(yaws) * frame, 4), dtype=np.float32)
    sheet[..., 3] = 1
    for r, tiles in enumerate(rows):
        rr = len(rows) - 1 - r          # row 0 is the bottom in Blender's pixel order
        for c, t in enumerate(tiles):
            sheet[rr * frame:(rr + 1) * frame, c * frame:(c + 1) * frame] = t
    save_array(sheet, path)


def contact_sheet(path, yaw=30.0):
    """All eight side by side at the size each renders on the site at 1900 px wide (top row, px per unit from the slot
    formula), with objects 1-6 again at their phone size (117 px) underneath. Site rest poses, no grain."""
    top_h, bot_h = 880, 170
    widths = [240] * 6 + [780, 560]
    W = sum(widths)
    sheet = np.zeros((top_h + bot_h, W, 4), dtype=np.float32)
    sheet[..., 3] = 1
    x = 0
    for (key, slot, maps), w in zip(OBJECTS, widths):
        glb = os.path.join(EXPORT, key + ".glb")
        ob, spin = make_scene(glb, slot, maps, w, top_h)
        ppu = site_ppu(ob, slot)
        frame_ppu(ppu, top_h)
        spin.rotation_euler = (0, 0, radians(yaw))
        update()
        sheet[bot_h:, x:x + w] = render_array()
        print("CONTACT", key, "desktop %.2f px/unit" % ppu)
        if slot == "carousel":
            ob, spin = make_scene(glb, "phone", None, 150, 150)
            ppu = site_ppu(ob, "phone")
            frame_ppu(ppu, 150)
            spin.rotation_euler = (0, 0, radians(yaw))
            update()
            x0 = x + (w - 150) // 2
            sheet[10:160, x0:x0 + 150] = render_array()
            print("CONTACT", key, "phone %.2f px/unit" % ppu)
        x += w
    save_array(sheet, path)


if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1:]
    mode = args[0]
    sel = args[1] if len(args) > 1 else "all"
    os.makedirs(PREV, exist_ok=True)
    todo = [o for o in OBJECTS if sel == "all" or o[0] == sel or (sel == "carousel" and o[1] == "carousel")
            or (sel == "hero" and o[1] != "carousel")]
    if mode == "still":
        for key, slot, maps in todo:
            render_still(key, slot, maps)
    elif mode == "turntable":
        for key, slot, maps in todo:
            render_turntable(key, slot, maps)
    elif mode == "sil":
        silhouette_test(os.path.join(PREV, "silhouette-test.png"))
    elif mode == "contact":
        contact_sheet(os.path.join(PREV, "contact-sheet.png"))
    print("DONE", mode, sel)
