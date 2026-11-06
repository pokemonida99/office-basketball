# 阿傑專屬全身灌籃：用腳本擺關鍵姿勢、存成可以手改的 .blend，再匯出只有動畫的 GLB
# 用法：/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/jie_dunk.py -- models/jie_walk.glb 輸出.glb 輸出.blend [預覽圖資料夾]
#
# 骨架是 Tripo 綁的，骨頭本地軸方向不統一，所以姿勢不寫各骨頭的角度，而是寫「這節骨頭要指向哪裡」：
#   方向＝(左, 前, 上)，角色臉朝前。Blender 裡前＝-Y、上＝+Z、左＝+X（右手在 -X）。
# Q 版比例：頭很大、手很短，手舉直也只到耳朵高，所以球是舉在額頭前面，不能繞到腦後。
import bpy, sys, math
from mathutils import Matrix, Vector, Quaternion

argv = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT_GLB, OUT_BLEND = argv[:3]
PREVIEW = argv[3] if len(argv) > 3 else None
FPS = 30

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
scene = bpy.context.scene
scene.render.fps = FPS
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
for o in list(bpy.data.objects):   # 舊動作和多餘的小球都不要
    if o.type == 'MESH' and o.name != 'char1': bpy.data.objects.remove(o)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
arm.animation_data_clear()
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='POSE')
PB = arm.pose.bones
REST_HEAD = {b.name: b.head_local.copy() for b in arm.data.bones}

def D(l, f, u): return Vector((l, -f, u)).normalized()

# 骨頭 → 用來量方向的下一個關節
NEXT = {'LeftArm': 'LeftForeArm', 'LeftForeArm': 'LeftHand', 'RightArm': 'RightForeArm', 'RightForeArm': 'RightHand',
        'LeftUpLeg': 'LeftLeg', 'LeftLeg': 'LeftFoot', 'LeftFoot': 'LeftToeBase',
        'RightUpLeg': 'RightLeg', 'RightLeg': 'RightFoot', 'RightFoot': 'RightToeBase'}
CHAIN = ['LeftArm', 'LeftForeArm', 'RightArm', 'RightForeArm', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot']
SPINE = ['Spine02', 'Spine01', 'Spine', 'neck', 'Head']   # 由下到上（名字是綁骨時取的，Spine02 在最下面）
ALL = ['Hips'] + SPINE + ['LeftShoulder', 'RightShoulder'] + CHAIN + ['LeftHand', 'RightHand', 'LeftToeBase', 'RightToeBase']

def reset():
    for pb in PB:
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = Quaternion((1, 0, 0, 0)); pb.location = (0, 0, 0)
    bpy.context.view_layer.update()

def rotate_world(name, q):
    """繞骨頭自己的關節，用骨架空間的轉動 q 轉這根骨頭（子骨頭會跟著）"""
    pb = PB[name]
    h = pb.matrix.translation.copy()
    pb.matrix = Matrix.Translation(h) @ q.to_matrix().to_4x4() @ Matrix.Translation(-h) @ pb.matrix
    bpy.context.view_layer.update()

def aim(name, d):
    a, b = PB[name].matrix.translation, PB[NEXT[name]].matrix.translation
    cur = (b - a).normalized()
    if cur.dot(d) > 0.99999: return
    rotate_world(name, cur.rotation_difference(d))

def lowest_foot():
    return min(PB[n].matrix.translation.z for n in ('LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase'))
REST_LOW = None

def pose(p):
    """p：lean 上身前傾度（負＝後仰）、twist 上身往左轉度、hipPitch、limbs、plant＝腳要踩回地面（自動把臀部往下放）、hipUp"""
    reset()
    q = Quaternion((1, 0, 0), math.radians(p.get('hipPitch', 0)))
    if p.get('hipPitch'): rotate_world('Hips', q)
    lean, n = p.get('lean', 0), len(SPINE)
    for i, b in enumerate(SPINE):
        share = (0.3, 0.3, 0.25, 0.1, 0.05)[i]
        rotate_world(b, Quaternion((1, 0, 0), math.radians(lean * share)))
    tw = p.get('twist', 0)
    if tw:
        for b, s in (('Spine01', 0.5), ('Spine', 0.5)): rotate_world(b, Quaternion((0, 0, 1), math.radians(tw * s)))
    # 肩膀：手舉高時鎖骨一起抬，腋下才不會被拉長
    for side, sign in (('Left', 1), ('Right', -1)):
        up = p.get('shrug' + side[0], 0)
        if up: rotate_world(side + 'Shoulder', Quaternion((0, 1, 0), math.radians(-sign * up)))
    for name in CHAIN:
        if name in p: aim(name, D(*p[name]))
    for side in ('Left', 'Right'):
        if side + 'Hand' in p:
            rotate_world(side + 'Hand', Quaternion((1, 0, 0), math.radians(p[side + 'Hand'])))
    if p.get('plant'):
        PB['Hips'].location = (0, 0, 0)
        bpy.context.view_layer.update()
        drop = lowest_foot() - REST_LOW
        move_hips(0, 0, -drop)
    if p.get('hipUp') or p.get('hipFwd'):
        move_hips(0, p.get('hipFwd', 0), p.get('hipUp', 0))

def move_hips(l, f, u):
    pb = PB['Hips']
    m = pb.matrix.copy(); m.translation += Vector((l, -f, u))
    pb.matrix = m
    bpy.context.view_layer.update()

reset()
REST_LOW = lowest_foot()

# 腳底踩平時腳掌的方向＝站姿量到的方向（綁骨時腳踝到腳趾本來就往下斜）
def flat(side):
    v = (REST_HEAD[side + 'ToeBase'] - REST_HEAD[side + 'Foot']).normalized()
    return (v.x, -v.y, v.z)
FL, FR = flat('Left'), flat('Right')
POINT_L, POINT_R = (0.05, 0.55, -0.85), (-0.05, 0.55, -0.85)   # 腳在空中：腳尖往下
def legs(lu, ll, ru, rl, lf=POINT_L, rf=POINT_R):
    return dict(LeftUpLeg=lu, LeftLeg=ll, LeftFoot=lf, RightUpLeg=ru, RightLeg=rl, RightFoot=rf)
def arms(lu, lf, ru, rf):
    return dict(LeftArm=lu, LeftForeArm=lf, RightArm=ru, RightForeArm=rf)

# Q 版手短頭大：雙手舉不過頭，所以做單手戰斧式——球換到右手，從頭的外側繞上來再往前砸
HOLD_WAIST = arms((0.35, 0.55, -0.75), (-0.55, 0.8, 0.1), (-0.35, 0.55, -0.75), (0.55, 0.8, 0.1))
HOLD_CHEST = arms((0.45, 0.8, -0.2), (-0.5, 0.65, 0.55), (-0.45, 0.8, -0.2), (0.5, 0.65, 0.55))
SWING_UP = arms((0.5, 0.75, 0.3), (-0.15, 0.8, 0.55), (-0.75, 0.35, 0.55), (-0.55, 0.1, 0.83))
COCK = arms((0.7, 0.55, 0.45), (0.35, 0.8, 0.5), (-0.8, -0.1, 0.6), (-0.4, -0.35, 0.85))   # 右手拉到頭的右後方，左手指著籃框
SLAM_DOWN = arms((0.75, 0.2, -0.6), (0.5, 0.5, -0.7), (-0.3, 0.9, 0.3), (-0.1, 0.97, -0.2))
HANG = arms((0.85, 0.2, -0.45), (0.6, 0.5, -0.6), (-0.72, 0.42, 0.55), (-0.6, 0.45, 0.66))   # 右手從頭髮右邊伸出去抓框（比賽鏡頭在後上方，手要露出來才看得到）
LAND = arms((0.8, 0.45, -0.4), (0.7, 0.65, -0.3), (-0.8, 0.45, -0.4), (-0.7, 0.65, -0.3))
LOWER = arms((0.55, 0.15, -0.8), (0.3, 0.45, -0.85), (-0.55, 0.15, -0.8), (-0.3, 0.45, -0.85))

# 時間（秒）要跟 js/main.js 的 JIE_DUNK 對齊：0.40 球進框、掛框到 0.70、0.97 落地
KEYS = [
    (0.00, dict(lean=12, **HOLD_CHEST, **legs((0.1, 0.25, -0.95), (0.06, -0.2, -1), (-0.1, 0.25, -0.95), (-0.06, -0.2, -1), FL, FR), plant=True)),
    (0.10, dict(lean=32, **HOLD_WAIST, **legs((0.2, 0.8, -0.6), (0.05, -0.55, -0.85), (-0.2, 0.8, -0.6), (-0.05, -0.55, -0.85), FL, FR), plant=True)),
    (0.20, dict(lean=2, twist=-10, shrugR=15, **SWING_UP, **legs((0.08, -0.1, -1), (0.03, -0.35, -0.95), (-0.1, 0.97, -0.2), (-0.05, -0.55, -0.85)))),   # 離地：左腳蹬直，右膝帶到腰高
    (0.33, dict(lean=-16, hipPitch=-8, twist=-26, shrugR=28, **COCK, **legs((0.1, -0.05, -1), (0.03, -0.95, -0.3), (-0.14, 0.35, -0.93), (-0.05, -0.95, -0.3)))),   # 空中拉滿：身體後弓，小腿折到後面
    (0.40, dict(lean=30, hipPitch=10, twist=22, **SLAM_DOWN, **legs((0.14, 0.8, -0.6), (0.06, 0.1, -1), (-0.14, 0.9, -0.45), (-0.06, 0.1, -1)))),   # 砸下去：全身捲起來
    (0.47, dict(lean=-4, twist=8, shrugR=25, **HANG, **legs((0.12, 0.7, -0.7), (0.05, 0.45, -0.9), (-0.12, 0.78, -0.62), (-0.05, 0.5, -0.87)))),   # 抓住框，腿被慣性甩到前面
    (0.58, dict(lean=-12, twist=4, shrugR=28, **HANG, **legs((0.1, -0.3, -0.95), (0.04, -0.75, -0.65), (-0.1, -0.25, -0.97), (-0.04, -0.7, -0.7)))),   # 腿盪到後面
    (0.68, dict(lean=-6, twist=4, shrugR=25, **HANG, **legs((0.1, 0.3, -0.95), (0.04, 0.08, -1), (-0.1, 0.35, -0.93), (-0.04, 0.1, -1)))),   # 盪回來，準備放手
    (0.84, dict(lean=4, **LOWER, **legs((0.14, 0.12, -1), (0.06, -0.08, -1), (-0.14, 0.12, -1), (-0.06, -0.08, -1)))),   # 放手下墜，腳伸直找地板
    (0.97, dict(lean=30, **LAND, **legs((0.22, 0.75, -0.65), (0.06, -0.5, -0.87), (-0.22, 0.75, -0.65), (-0.06, -0.5, -0.87), FL, FR), plant=True)),   # 落地蹲
    (1.07, dict(lean=16, **LOWER, **legs((0.17, 0.5, -0.85), (0.05, -0.32, -0.95), (-0.17, 0.5, -0.85), (-0.05, -0.32, -0.95), FL, FR), plant=True)),
    (1.20, dict(lean=4, **LOWER, **legs((0.12, 0.12, -1), (0.05, -0.08, -1), (-0.12, 0.12, -1), (-0.05, -0.08, -1), FL, FR), plant=True)),
]

action = bpy.data.actions.new('jie_dunk')
arm.animation_data_create(); arm.animation_data.action = action
for t, p in KEYS:
    frame = t * FPS
    pose(p)
    for n in ALL:
        pb = PB[n]
        pb.keyframe_insert('rotation_quaternion', frame=frame, group=n)
    PB['Hips'].keyframe_insert('location', frame=frame, group='Hips')
    rh = PB['RightHand'].matrix.translation; hd = PB['Head'].matrix.translation
    print(f'KEY {t:.2f} 右手 高{rh.z - REST_LOW:.1f} 前{-rh.y:.1f} 左{rh.x:.1f}｜頭 高{hd.z - REST_LOW:.1f} 前{-hd.y:.1f}')
scene.frame_start, scene.frame_end = 0, round(KEYS[-1][0] * FPS)
scene.frame_set(0)

bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)

# 只匯出骨架和動畫（沒有模型），遊戲用骨頭名字套到阿傑身上
bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); bpy.context.view_layer.objects.active = arm
bpy.ops.export_scene.gltf(filepath=OUT_GLB, export_format='GLB', use_selection=True, export_skins=False, export_materials='NONE',
                          export_animations=True, export_animation_mode='ACTIVE_ACTIONS', export_force_sampling=True, export_frame_step=1,
                          export_optimize_animation_size=True, export_def_bones=False)

# 預覽圖：側面看每個關鍵格
if PREVIEW:
    import os
    os.makedirs(PREVIEW, exist_ok=True)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); scene.collection.objects.link(cam)
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = 1.5
    cam.location = (-3, -0.0, 0.55); cam.rotation_euler = (math.radians(90), 0, math.radians(-90))
    scene.camera = cam
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'; scene.display.shading.color_type = 'TEXTURE'
    scene.render.resolution_x, scene.render.resolution_y = 300, 360
    for t, _ in KEYS:
        scene.frame_set(round(t * FPS))
        for view, loc, rot in (('s', (-3, 0, 0.55), (90, 0, -90)), ('f', (0, -3, 0.55), (90, 0, 0))):
            cam.location = loc; cam.rotation_euler = tuple(math.radians(a) for a in rot)
            scene.render.filepath = os.path.join(PREVIEW, f'{view}_{round(t*100):03d}.png')
            bpy.ops.render.render(write_still=True)
print('DONE', OUT_GLB)
