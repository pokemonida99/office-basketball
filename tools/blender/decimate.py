# 角色模型減面：用 Blender 算出低面數的網格，只換掉 GLB 裡的網格資料，骨架、走路動作都原封不動
# 用法：/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/decimate.py -- 來源.glb 輸出.glb [保留比例，預設 0.4]
#
# Tripo 的網格沿著貼圖接縫是斷開的，直接減面會裂開，所以先把重疊的點焊起來（貼圖座標還是分開存）。
# 卡通材質用不到切線、法線貼圖、金屬粗糙度貼圖，一起拿掉。
import bpy, bmesh, sys, json, struct, array
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = argv[:2]
RATIO = float(argv[2]) if len(argv) > 2 else 0.4

raw = open(SRC, 'rb').read()
jlen = struct.unpack('<I', raw[12:16])[0]
J = json.loads(raw[20:20 + jlen])
bin0 = raw[28 + jlen:]
node = next(n for n in J['nodes'] if 'mesh' in n and 'skin' in n)
prim = J['meshes'][node['mesh']]['primitives'][0]
pos_acc = J['accessors'][prim['attributes']['POSITION']]
joints = [J['nodes'][i]['name'] for i in J['skins'][node['skin']]['joints']]
assert len(joints) < 256
if 'TANGENT' not in prim['attributes']: raise SystemExit('已經減過面：' + SRC + '（要重做請從 git 歷史拿回原檔，例如 git show 7d4404d:models/mi_walk.glb）')

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
obj = max((o for o in bpy.data.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
me = obj.data
before = sum(len(p.vertices) - 2 for p in me.polygons)

# Blender 座標和 glTF 正規化座標的對應：(x, y, z)gltf → (x, -z, y)blender，再乘一個固定倍率
co = [v.co.copy() for v in me.vertices]
bmin = [min(c[i] for c in co) for i in range(3)]; bmax = [max(c[i] for c in co) for i in range(3)]
gmin, gmax = [v / 32767 for v in pos_acc['min']], [v / 32767 for v in pos_acc['max']]
gspan = (gmax[0] - gmin[0], gmax[2] - gmin[2], gmax[1] - gmin[1])
SC = [(bmax[i] - bmin[i]) / gspan[i] for i in range(3)]
assert max(SC) / min(SC) < 1.001, SC
SC = sum(SC) / 3
OFF = ((bmax[0] + bmin[0]) / 2 / SC - (gmax[0] + gmin[0]) / 2, (bmax[1] + bmin[1]) / 2 / SC + (gmax[2] + gmin[2]) / 2, (bmax[2] + bmin[2]) / 2 / SC - (gmax[1] + gmin[1]) / 2)
H = bmax[2] - bmin[2]

# 焊接重疊的點（只焊位置幾乎一樣的）
bm = bmesh.new(); bm.from_mesh(me)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=H * 0.0004)
bm.to_mesh(me); bm.free()

# 鎖住臉：頭像和大招特寫會拍到，五官是貼圖畫的，網格一減貼圖就歪。範圍是頭的前半、頭骨以上
to_arm = arm.matrix_world.inverted() @ obj.matrix_world
head = arm.data.bones['Head'].head_local
top = [to_arm @ v.co for v in me.vertices]
hd = [p for p in top if p.z > head.z]
ymin, ymax = min(p.y for p in hd), max(p.y for p in hd)
zmax = max(p.z for p in hd)
lock = obj.vertex_groups.new(name='__lock')
locked = [v.index for v, p in zip(me.vertices, top) if p.y < ymin + (ymax - ymin) * 0.42 and head.z - (zmax - head.z) * 0.1 < p.z < head.z + (zmax - head.z) * 0.8]
lock.add(locked, 1.0, 'REPLACE')
mod = obj.modifiers.new('dec', 'DECIMATE')
mod.decimate_type = 'COLLAPSE'; mod.ratio = RATIO
mod.vertex_group = '__lock'; mod.invert_vertex_group = True   # 反轉後鎖住的點權重是 0，Blender 不會動它
bpy.context.view_layer.objects.active = obj
for m in list(obj.modifiers):
    if m != mod: obj.modifiers.remove(m)
bpy.ops.object.modifier_apply(modifier='dec')
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.quads_convert_to_tris(); bpy.ops.object.mode_set(mode='OBJECT')
me = obj.data
me.update()

names = {g.index: g.name for g in obj.vertex_groups}
jidx = {n: i for i, n in enumerate(joints)}
uv = me.uv_layers[0].data
vn = me.vertex_normals
verts, remap, idx = [], {}, []
def q16(x): return max(-32767, min(32767, round(x * 32767)))
def q8(x): return max(-127, min(127, round(x * 127)))
def skin(v):
    w = sorted(((g.weight, jidx[names[g.group]]) for g in v.groups if names.get(g.group) in jidx and g.weight > 0), reverse=True)[:4]
    w = w or [(1.0, 0)]
    s = sum(a for a, _ in w)
    q = [round(a / s * 255) for a, _ in w]
    q[0] += 255 - sum(q)
    j = [b for _, b in w]
    return j + [0] * (4 - len(j)), q + [0] * (4 - len(q))
skins = {}
for poly in me.polygons:
    assert len(poly.loop_indices) == 3
    for li in poly.loop_indices:
        vi = me.loops[li].vertex_index
        u, t = uv[li].uv
        k = (vi, round(u * 65535), round((1 - t) * 65535))
        if k not in remap:
            remap[k] = len(verts); verts.append(k)
        idx.append(remap[k])
pos, nor, tex, jo, we = bytearray(), bytearray(), bytearray(), bytearray(), bytearray()
lo = [99999] * 3; hi = [-99999] * 3
for vi, u, t in verts:
    v = me.vertices[vi]
    gx, gz, gy = v.co[0] / SC - OFF[0], -(v.co[1] / SC - OFF[1]), v.co[2] / SC - OFF[2]
    p = (q16(gx), q16(gy), q16(gz))
    for i in range(3): lo[i] = min(lo[i], p[i]); hi[i] = max(hi[i], p[i])
    pos += struct.pack('<3h2x', *p)
    n = vn[vi].vector
    nor += struct.pack('<3b1x', q8(n[0]), q8(n[2]), q8(-n[1]))
    tex += struct.pack('<2H', max(0, min(65535, u)), max(0, min(65535, t)))
    if vi not in skins: skins[vi] = skin(v)
    a, b = skins[vi]
    jo += struct.pack('<4B', *a); we += struct.pack('<4B', *b)
assert len(verts) < 65536
ind = struct.pack(f'<{len(idx)}H', *idx)
if len(ind) % 4: ind += b'\0\0'

# 重組 GLB：留下非網格的資料（圖片、骨架、動畫），網格換新的；卡通材質用不到的貼圖拿掉
A = J['accessors']; BV = J['bufferViews']
mat = J['materials'][prim['material']]
for k in ('normalTexture', 'occlusionTexture'): mat.pop(k, None)
mat.get('pbrMetallicRoughness', {}).pop('metallicRoughnessTexture', None)
tex_used = set()
for m in J['materials']:
    pm = m.get('pbrMetallicRoughness', {})
    for t in (pm.get('baseColorTexture'), m.get('emissiveTexture')):
        if t: tex_used.add(t['index'])
tmap, new_tex, img_used = {}, [], []
for i, t in enumerate(J['textures']):
    if i in tex_used:
        tmap[i] = len(new_tex); new_tex.append(t)
        for s in [t.get('source'), t.get('extensions', {}).get('EXT_texture_webp', {}).get('source')]:
            if s is not None: img_used.append(s)
imap, new_img = {}, []
for s in sorted(set(img_used)):
    imap[s] = len(new_img); new_img.append(J['images'][s])
for t in new_tex:
    if 'source' in t: t['source'] = imap[t['source']]
    e = t.get('extensions', {}).get('EXT_texture_webp')
    if e: e['source'] = imap[e['source']]
for m in J['materials']:
    pm = m.get('pbrMetallicRoughness', {})
    for t in (pm.get('baseColorTexture'), m.get('emissiveTexture')):
        if t: t['index'] = tmap[t['index']]
J['textures'], J['images'] = new_tex, new_img
if not new_img: J.pop('images'); J.pop('textures')

old_prim_acc = set(prim['attributes'].values()) | {prim['indices']}
mesh_bvs = {A[i]['bufferView'] for i in old_prim_acc}
keep_acc = [i for i in range(len(A)) if i not in old_prim_acc]
used_bv = {A[i]['bufferView'] for i in keep_acc if 'bufferView' in A[i]} | {im['bufferView'] for im in new_img if 'bufferView' in im}
out, new_bv, bvmap = bytearray(), [], {}
def pad():
    while len(out) % 4: out.append(0)
for i in sorted(used_bv):
    v = dict(BV[i]); pad()
    e = v.get('extensions', {}).get('EXT_meshopt_compression')
    if e:
        e = dict(e); data = bin0[e['byteOffset']:e['byteOffset'] + e['byteLength']]
        e['byteOffset'] = len(out); e['buffer'] = 0; v['extensions'] = {'EXT_meshopt_compression': e}
    else:
        assert v['buffer'] == 0
        data = bin0[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
        v['byteOffset'] = len(out)
    out += data
    bvmap[i] = len(new_bv); new_bv.append(v)
new_acc, amap = [], {}
for i in keep_acc:
    a = dict(A[i])
    if 'bufferView' in a: a['bufferView'] = bvmap[a['bufferView']]
    amap[i] = len(new_acc); new_acc.append(a)
for im in new_img:
    if 'bufferView' in im: im['bufferView'] = bvmap[im['bufferView']]
for an in J.get('animations', []):
    for s in an['samplers']: s['input'] = amap[s['input']]; s['output'] = amap[s['output']]
for sk in J['skins']:
    if 'inverseBindMatrices' in sk: sk['inverseBindMatrices'] = amap[sk['inverseBindMatrices']]
def add_view(data, stride=None, target=34962):
    pad()
    v = {'buffer': 0, 'byteOffset': len(out), 'byteLength': len(data), 'target': target}
    if stride: v['byteStride'] = stride
    out.extend(data); new_bv.append(v); return len(new_bv) - 1
def add_acc(view, ctype, count, typ, norm=False, mm=None):
    a = {'bufferView': view, 'componentType': ctype, 'count': count, 'type': typ}
    if norm: a['normalized'] = True
    if mm: a['min'], a['max'] = mm
    new_acc.append(a); return len(new_acc) - 1
N = len(verts)
prim['attributes'] = {
    'POSITION': add_acc(add_view(bytes(pos), 8), 5122, N, 'VEC3', True, (lo, hi)),
    'NORMAL': add_acc(add_view(bytes(nor), 4), 5120, N, 'VEC3', True),
    'TEXCOORD_0': add_acc(add_view(bytes(tex), 4), 5123, N, 'VEC2', True),
    'JOINTS_0': add_acc(add_view(bytes(jo), 4), 5121, N, 'VEC4'),
    'WEIGHTS_0': add_acc(add_view(bytes(we), 4), 5121, N, 'VEC4', True),
}
prim['indices'] = add_acc(add_view(ind, None, 34963), 5123, len(idx), 'SCALAR')
pad()
J['accessors'], J['bufferViews'] = new_acc, new_bv
J['buffers'][0]['byteLength'] = len(out)
js = json.dumps(J, separators=(',', ':'), ensure_ascii=False).encode()
js += b' ' * (-len(js) % 4)
total = 12 + 8 + len(js) + 8 + len(out)
with open(OUT, 'wb') as f:
    f.write(struct.pack('<III', 0x46546C67, 2, total) + struct.pack('<I', len(js)) + b'JSON' + js + struct.pack('<I', len(out)) + b'BIN\0' + bytes(out))
print('LOD', SRC.split('/')[-1], 'locked', len(locked), 'tris', before, '->', len(idx) // 3, 'verts', pos_acc['count'], '->', N, 'KB', len(raw) // 1024, '->', total // 1024)
