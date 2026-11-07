# 修手臂撕裂：Tripo 自動綁骨時手和腿靠很近，有些頂點同時綁到手臂和腿，手一舉就被拉成一大片。
# 這裡看頂點是不是落在手臂粗細的範圍內：是就拿掉腿的綁定，不是（裙襬、褲子）就拿掉手臂的綁定。
# 不能只比離哪根骨頭近：裙襬離手比離腿近，會被手一起拉起來。只改 GLB 的權重，網格位置不動。要先跑過 decimate.py（權重是未壓縮的資料才改得到）。
# 只在舉手真的會裂的角色上用（目前只有 tu_walk）：其他人舉手本來就正常，套用反而會在腰邊多出碎片。
# 用法：/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/fix_arm_weights.py -- 模型1.glb 模型2.glb ...
import bpy, sys, json, struct
from mathutils import Vector

ARM = {s + n for s in ('Left', 'Right') for n in ('Arm', 'ForeArm', 'Hand')}
OTHER = {s + n for s in ('Left', 'Right') for n in ('UpLeg', 'Leg', 'Foot')}   # 只動手臂和腿之間的綁定；頭髮、肩膀綁手臂是正常的，拿掉反而會裂

LOWER = OTHER | {'Hips'}

def seg_dist(p, a, b):
    d = b - a; t = max(0, min(1, (p - a).dot(d) / max(d.dot(d), 1e-9)))
    return (a + d * t - p).length

for path in sys.argv[sys.argv.index('--') + 1:]:
    raw = bytearray(open(path, 'rb').read())
    jlen = struct.unpack('<I', raw[12:16])[0]
    J = json.loads(raw[20:20 + jlen]); base = 28 + jlen
    node = next(n for n in J['nodes'] if 'mesh' in n and 'skin' in n)
    prim = J['meshes'][node['mesh']]['primitives'][0]
    joints = [J['nodes'][i]['name'] for i in J['skins'][node['skin']]['joints']]
    def view(name):
        a = J['accessors'][prim['attributes'][name]]; v = J['bufferViews'][a['bufferView']]
        return a, base + v['byteOffset'], v.get('byteStride', 4)
    pa, po, ps = view('POSITION'); ja, jo, js = view('JOINTS_0'); wa, wo, ws = view('WEIGHTS_0')
    if 'EXT_meshopt_compression' in J['bufferViews'][pa['bufferView']].get('extensions', {}): raise SystemExit('先跑 decimate.py：' + path)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    obj = max((o for o in bpy.data.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
    H = {b.name: b.head_local.copy() for b in arm.data.bones}
    to_arm = arm.matrix_world.inverted() @ obj.matrix_world
    # glTF 正規化座標 → Blender 網格座標的倍率（和 decimate.py 一樣）
    co = [v.co for v in obj.data.vertices]
    bmin = [min(c[i] for c in co) for i in range(3)]; bmax = [max(c[i] for c in co) for i in range(3)]
    gmin, gmax = [v / 32767 for v in pa['min']], [v / 32767 for v in pa['max']]
    SC = (bmax[2] - bmin[2]) / (gmax[1] - gmin[1])
    C = ((bmax[0] + bmin[0]) / 2 - (gmax[0] + gmin[0]) / 2 * SC, (bmax[1] + bmin[1]) / 2 + (gmax[2] + gmin[2]) / 2 * SC, (bmax[2] + bmin[2]) / 2 - (gmax[1] + gmin[1]) / 2 * SC)
    def arm_segs(s):
        fore, hand = H[s + 'ForeArm'], H[s + 'Hand']
        return [(H[s + 'Arm'], fore), (fore, hand), (hand, hand + (hand - fore) * 0.7)]
    SEGS = arm_segs('Left') + arm_segs('Right')
    R = (bmax[2] - bmin[2]) * to_arm.median_scale * 0.05   # 手臂半徑：身高的 5%
    fixed = 0
    for i in range(pa['count']):
        jv = list(raw[jo + i * js:jo + i * js + 4]); wv = list(raw[wo + i * ws:wo + i * ws + 4])
        names = [joints[j] for j in jv]
        A = [k for k in range(4) if wv[k] and names[k] in ARM]; O = [k for k in range(4) if wv[k] and names[k] in OTHER]
        if not A or not O: continue
        x, y, z = struct.unpack_from('<3h', raw, po + i * ps)
        p = to_arm @ Vector((x / 32767 * SC + C[0], -(z / 32767) * SC + C[1], y / 32767 * SC + C[2]))
        drop = O if min(seg_dist(p, a, b) for a, b in SEGS) < R else A
        keep = [k for k in range(4) if wv[k] and k not in drop]
        if not keep: continue
        s = sum(wv[k] for k in keep)
        nw = [0, 0, 0, 0]
        for k in keep: nw[k] = round(wv[k] * 255 / s)
        nw[keep[0]] += 255 - sum(nw)
        raw[wo + i * ws:wo + i * ws + 4] = bytes(nw)
        fixed += 1
    # 手碰到裙子的地方 Tripo 把網格焊在一起：同時連到手臂和下半身的三角形手一舉就變一大片，改成不畫（手放下時它們本來就被蓋住）
    def side(i):
        jv = raw[jo + i * js:jo + i * js + 4]; wv = raw[wo + i * ws:wo + i * ws + 4]
        a = sum(w for j, w in zip(jv, wv) if joints[j] in ARM); o = sum(w for j, w in zip(jv, wv) if joints[j] in LOWER)
        return 'a' if a > 150 else 'o' if o > 150 else ''
    ia = J['accessors'][prim['indices']]; io = base + J['bufferViews'][ia['bufferView']]['byteOffset']
    sides = {}
    cut = 0
    for t in range(0, ia['count'], 3):
        v = struct.unpack_from('<3H', raw, io + t * 2)
        ss = {sides.setdefault(i, side(i)) for i in v}
        if 'a' in ss and 'o' in ss:
            struct.pack_into('<3H', raw, io + t * 2, v[0], v[0], v[0]); cut += 1
    open(path, 'wb').write(raw)
    print('FIX', path.split('/')[-1], 'verts', pa['count'], 'fixed', fixed, 'cut tris', cut)
