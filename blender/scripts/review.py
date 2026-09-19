"""Review scene (not a deliverable): the eight exported .glb files side by side, in their site rest poses, spinning at the
site's 0.2 rad/s (one turn per 31.4 s, a seamless loop), shaded like the site with the matcap and, on 7 and 8, the baked
normal and ink maps. The viewport opens in Material Preview through the camera: press Space to play.

    blender -b --factory-startup -P review.py   -> D:\\page_content\\blender\\edith-review.blend
"""
import sys
sys.path.insert(0, r"D:\page_content\blender\scripts")
from previews import *

SPACING = {"carousel": 13.0, "membership": 15.0, "decisions": 14.0}
FPS, TURN_FRAMES = 30, 942      # 2*pi / 0.2 rad/s = 31.4 s


def import_into(coll, path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    ob = [o for o in new if o.type == 'MESH'][0]
    ob.parent = None
    ob.matrix_world = Matrix.Identity(4)
    for o in new:
        if o is not ob:
            bpy.data.objects.remove(o, do_unlink=True)
    move(ob, coll)
    return ob


def move(ob, coll):
    for c in list(ob.users_collection):
        c.objects.unlink(ob)
    coll.objects.link(ob)


def build():
    fresh()
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
    sc.render.fps = FPS
    sc.frame_start, sc.frame_end = 1, TURN_FRAMES
    sc.view_settings.view_transform = 'Standard'
    wd = bpy.data.worlds.new("black")
    wd.use_nodes = True
    for n in wd.node_tree.nodes:
        if n.type == 'BACKGROUND':
            n.inputs['Color'].default_value = (0, 0, 0, 1)
            n.inputs['Strength'].default_value = 0.0
    sc.world = wd

    x, prev = 0.0, None
    for key, slot, maps in OBJECTS:
        coll = bpy.data.collections.new(key)
        sc.collection.children.link(coll)
        ob = import_into(coll, os.path.join(EXPORT, key + ".glb"))
        ob.name = key
        if maps:
            site_material(ob, os.path.join(EXPORT, maps, "normal.png"), os.path.join(EXPORT, maps, "diffuse.png"))
        else:
            site_material(ob)
        spin = rig(ob, slot)
        spin.name, spin.empty_display_size = key + " spin", 1.0
        rest = spin.parent if spin.parent else [o for o in bpy.data.objects if o.parent is spin and o.type == 'EMPTY'][0]
        rest.name, rest.empty_display_size = key + " rest pose", 1.0
        for e in (spin, rest):
            move(e, coll)
        top = spin if spin.parent is None else spin.parent
        if prev is not None:
            x += 0.5 * (SPACING[prev] + SPACING[slot])
        top.location = (x, 0.0, 0.0)
        prev = slot
        spin.rotation_euler = (0, 0, 0)
        spin.keyframe_insert('rotation_euler', index=2, frame=1)
        spin.rotation_euler = (0, 0, 2 * pi)
        spin.keyframe_insert('rotation_euler', index=2, frame=TURN_FRAMES + 1)
        for fc in previews_fcurves(spin.animation_data.action):
            for kp in fc.keyframe_points:
                kp.interpolation = 'LINEAR'

    cx = x / 2
    cam = setup_camera(28.0, 30.0)
    cam.data.sensor_fit = 'VERTICAL'
    cam.data.angle = radians(30.0)
    half_w = x / 2 + 7.5
    cam.location = (cx, -half_w / (tan(radians(15.0)) * 16 / 9), 0.0)

    for scr in bpy.data.screens:
        for area in scr.areas:
            if area.type != 'VIEW_3D':
                continue
            for sp in area.spaces:
                if sp.type == 'VIEW_3D':
                    sp.shading.type = 'MATERIAL'
                    sp.shading.use_scene_world = True
                    sp.shading.use_scene_lights = False
                    sp.overlay.show_floor = False
                    sp.overlay.show_axis_x = sp.overlay.show_axis_y = False
                    sp.region_3d.view_perspective = 'CAMERA'
    path = os.path.join(ROOT, "edith-review.blend")
    bpy.ops.wm.save_as_mainfile(filepath=path, compress=True)
    print("REVIEW saved", path, "objects", len(OBJECTS), "row width %.1f" % x)


from previews import _fcurves as previews_fcurves
build()
