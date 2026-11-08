# 新模型（v0.12）：Higgsfield 綁好骨的 GLB → 減面（臉鎖住不減）→ 只留顏色貼圖 → 匯出遊戲用 GLB
# 之後再用 gltf-transform 壓成 meshopt＋webp（見 README）。骨頭名字、上下層、靜止姿勢都照原檔，舊的招牌動作和共用動作才套得上。
# 用法：/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/game_model.py -- 綁好骨.glb 輸出.glb [臉以外留幾個三角形，預設 9000]
import bpy, sys
argv = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = argv[:2]
TARGET = int(argv[2]) if len(argv) > 2 else 9000

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
for o in list(bpy.data.objects):   # 匯入時多出來的骨頭形狀小球
    if o.type == 'MESH' and o.parent is None: bpy.data.objects.remove(o)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
arm.animation_data_clear()
obj = next(o for o in bpy.data.objects if o.type == 'MESH')
me = obj.data
before = sum(len(p.vertices) - 2 for p in me.polygons)
# 網格沿貼圖接縫是斷開的（同一個位置有兩個點），不先焊起來，減面時兩邊各縮各的就會裂出洞（貼圖座標還是分開存）
import bmesh
zs = [v.co.z for v in me.vertices]; ys = [v.co.y for v in me.vertices]
size = max(max(zs) - min(zs), max(ys) - min(ys))
bm = bmesh.new(); bm.from_mesh(me)
nv = len(bm.verts)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=size * 0.0002)
print('WELD', nv, '->', len(bm.verts))
bm.to_mesh(me); bm.free()

# 鎖住臉：五官是貼圖畫的，臉的網格一減貼圖就歪（範圍和 decimate.py 一樣：頭的前半、頭骨以上）
to_arm = arm.matrix_world.inverted() @ obj.matrix_world
head = arm.data.bones['Head'].head_local
pts = [to_arm @ v.co for v in me.vertices]
hd = [p for p in pts if p.z > head.z]
ymin, ymax = min(p.y for p in hd), max(p.y for p in hd)
zmax = max(p.z for p in hd)
lock = obj.vertex_groups.new(name='__lock')
locked = [v.index for v, p in zip(me.vertices, pts) if p.y < ymin + (ymax - ymin) * 0.42 and head.z - (zmax - head.z) * 0.1 < p.z < head.z + (zmax - head.z) * 0.62]   # 只鎖臉（不含頭頂的頭髮、帽子）
lock.add(locked, 1.0, 'REPLACE')
free = before * (1 - len(locked) / len(me.vertices))   # 臉以外的三角形數（約略）
ratio = max(0.05, min(1, (before - free + TARGET) / before))   # 減面比例是算整個模型的：臉保留原樣＋身體留 TARGET 個三角形
print('LOCK head z', round(head.z, 2), 'zmax', round(zmax, 2), 'y', round(ymin, 2), round(ymax, 2), 'free', round(free), 'ratio', round(ratio, 3))
mod = obj.modifiers.new('dec', 'DECIMATE'); mod.decimate_type = 'COLLAPSE'; mod.ratio = ratio
mod.vertex_group = '__lock'; mod.invert_vertex_group = True
bpy.context.view_layer.objects.active = obj
for m in list(obj.modifiers):
    if m != mod: obj.modifiers.remove(m)
bpy.ops.object.modifier_apply(modifier='dec')
obj.vertex_groups.remove(obj.vertex_groups['__lock'])
m = obj.modifiers.new('Armature', 'ARMATURE'); m.object = arm
after = sum(len(p.vertices) - 2 for p in obj.data.polygons)

# 長頭髮垂在手臂旁邊，自動綁骨會把它綁到手臂，手一舉頭髮就被拉走：
# 離手臂骨頭比「手臂粗細」還遠、卻跟著手臂動的點，漸進改成跟著頭／脖子／背脊（離越遠改越多）
from mathutils import Vector
def seg_dist(p, a, b):
    d = b - a; t = max(0, min(1, (p - a).dot(d) / max(d.dot(d), 1e-9)))
    return (a + d * t - p).length
H = {b.name: b.head_local.copy() for b in arm.data.bones}
vg = obj.vertex_groups; gi = {g.name: g.index for g in vg}
co = [to_arm @ v.co for v in obj.data.vertices]
TORSO = ['Head', 'neck', 'Spine', 'Spine01', 'Spine02']
moved = 0
for s in ('Left', 'Right'):
    sh, fo, ha = H[s + 'Arm'], H[s + 'ForeArm'], H[s + 'Hand']
    segs = [(sh, fo), (fo, ha), (ha, ha + (ha - fo) * 0.9)]
    arm_idx = {gi[s + n] for n in ('Arm', 'ForeArm', 'Hand') if s + n in gi}
    def aw(v): return sum(g.weight for g in v.groups if g.group in arm_idx)
    def dist(i): return min(seg_dist(co[i], a, b) for a, b in segs)
    core = sorted(dist(v.index) for v in obj.data.vertices if aw(v) > 0.95)
    if not core: continue
    R = core[int(len(core) * 0.9)]
    for v in obj.data.vertices:
        a = aw(v)
        if a <= 0: continue
        if any(g.group == gi.get(s + 'Hand') and g.weight > 0.1 for g in v.groups): continue   # 手掌、手指不動
        d = dist(v.index)
        if d < R * 1.25: continue
        k = min(1, (d - R * 1.25) / (R * 0.6)); k = k * k * (3 - 2 * k)
        p = co[v.index]
        tgt = min(TORSO, key=lambda b: abs(H[b].z - p.z) if b != 'Head' else (0 if p.z > H['Head'].z else abs(H[b].z - p.z)))
        for g in list(v.groups):
            if g.group in arm_idx: vg[g.group].add([v.index], g.weight * (1 - k), 'REPLACE')
        vg[tgt].add([v.index], a * k, 'ADD')
        moved += 1
print('HAIR_FIX moved', moved)

# 卡通上色只用顏色貼圖：拿掉法線、金屬粗糙度貼圖
for mat in obj.data.materials:
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    for name in ('Normal', 'Metallic', 'Roughness'):
        for l in list(bsdf.inputs[name].links): nt.links.remove(l)
    bsdf.inputs['Metallic'].default_value = 0; bsdf.inputs['Roughness'].default_value = 0.8
    for n in list(nt.nodes):
        if n.type in ('TEX_IMAGE', 'NORMAL_MAP', 'SEPARATE_COLOR', 'SEPRGB') and not any(l.to_node == bsdf and l.to_socket.name == 'Base Color' for o in n.outputs for l in o.links):
            if n.type == 'TEX_IMAGE' and any(l.to_socket.name == 'Base Color' for o in n.outputs for l in o.links): continue
            nt.nodes.remove(n)

bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); arm.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_skins=True, export_animations=False,
                          export_image_format='JPEG', export_jpeg_quality=90, export_yup=True)
print('GAME_MODEL', SRC.split('/')[-1], 'tris', before, '->', after, 'face locked verts', len(locked))
