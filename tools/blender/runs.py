# 每個角色自己的跑步和持球衝刺：照他的腿長算步幅，輸出成只有動畫的 GLB（models/moves/run/角色_run.glb、角色_sprint.glb）
# 用法：/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/runs.py -- models models/moves/run [預覽圖資料夾]
#
# 跑和走的差別是「兩腳同時離地」：踩地時間只佔一圈的兩成多，中間整個人騰空；踢腿時腳跟帶到屁股、膝蓋往前帶，上身前傾、手肘彎著擺。
# Q 版腿短，遊戲每秒要跑 3 個身高，所以踩地要很快：踩地時間＝步幅 ÷ 速度，一圈時間照腿長調，腿短的人步頻高一點。
# 有背身強打、強力突破技能的人另外輸出 角色_push.glb：共用的 push 蹲得太低，只取骨頭轉動後整個人會縮成一團（阿傑的在 jie_moves.py）。
# 寫法和 jie_moves.py 一樣：手臂寫方向、腳用 IK 寫腳踝位置，不寫骨頭角度（Tripo 綁的骨頭軸向不統一）。
import bpy, sys, math, os
from mathutils import Matrix, Vector, Quaternion

argv = sys.argv[sys.argv.index('--') + 1:]
MODEL_DIR, OUT_DIR = argv[:2]
PREVIEW = argv[2] if len(argv) > 2 else None
FPS = 60
MODELS = {'kui': 'kui_walk2', 'jie': 'jie_walk', 'mi': 'mi_walk', 'vivi': 'vivi_walk', 'kevin': 'kevin_walk', 'yan': 'yan_walk', 'heilun': 'heilun_walk',
          'de': 'glasses_walk', 'momo': 'bob_walk', 'zhe': 'cap_walk', 'zhen': 'det_walk', 'lin': 'lin_walk', 'yuan': 'yuan_walk', 'hu': 'hu_walk',
          'tu': 'tu_walk', 'zhang': 'zhang_walk', 'bian': 'bian_walk', 'needle': 'needle_walk'}
# speed 每秒幾個身高（遊戲的基本跑速約 3）、T 腿長 0.33 身高的人跑一圈幾秒、lean 上身前傾、amp 手臂擺幅、bend 手肘彎度
GAITS = {'run': dict(speed=3.0, T=0.55, lean=11, amp=46, bend=85, lift=0.62),
         'sprint': dict(speed=3.1, T=0.5, lean=18, amp=54, bend=90, lift=0.7)}
POWER = ['heilun', 'zhe', 'yuan', 'zhang']
SPINE = ['Spine02', 'Spine01', 'Spine', 'neck', 'Head']   # 由下到上
ARMS = ['LeftArm', 'LeftForeArm', 'RightArm', 'RightForeArm']
LEGS = ['LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot']
ALL = ['Hips'] + SPINE + ['LeftShoulder', 'RightShoulder'] + ARMS + LEGS + ['LeftHand', 'RightHand', 'LeftToeBase', 'RightToeBase']
NEXT = {'LeftArm': 'LeftForeArm', 'LeftForeArm': 'LeftHand', 'RightArm': 'RightForeArm', 'RightForeArm': 'RightHand',
        'LeftUpLeg': 'LeftLeg', 'LeftLeg': 'LeftFoot', 'LeftFoot': 'LeftToeBase', 'RightUpLeg': 'RightLeg', 'RightLeg': 'RightFoot', 'RightFoot': 'RightToeBase'}

def smooth(u):
    u = max(0, min(1, u)); return u * u * (3 - 2 * u)
def D(l, f, u): return Vector((l, -f, u)).normalized()
def P(l, f, u): return Vector((l, -f, u))

def build(key, file):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(MODEL_DIR, file + '.glb'))
    scene = bpy.context.scene
    scene.render.fps = FPS
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    body = max((o for o in bpy.data.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
    for a in list(bpy.data.actions): bpy.data.actions.remove(a)
    arm.animation_data_clear()
    to_arm = arm.matrix_world.inverted() @ body.matrix_world
    zs = [(to_arm @ v.co).z for v in body.data.vertices]
    H = max(zs) - min(zs)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='POSE')
    PB = arm.pose.bones
    REST = {b.name: b.head_local.copy() for b in arm.data.bones}
    seg = lambda a, b: (REST[b] - REST[a]).length
    THIGH = {s: seg(s + 'UpLeg', s + 'Leg') for s in ('Left', 'Right')}
    SHIN = {s: seg(s + 'Leg', s + 'Foot') for s in ('Left', 'Right')}
    L = (THIGH['Left'] + SHIN['Left'] + THIGH['Right'] + SHIN['Right']) / 2
    ANK = (REST['LeftFoot'].z + REST['RightFoot'].z) / 2
    TOE = seg('LeftFoot', 'LeftToeBase')
    WIDE = abs(REST['LeftUpLeg'].x - REST['RightUpLeg'].x) / 2 * 0.8

    def reset():
        for pb in PB:
            pb.rotation_mode = 'QUATERNION'
            pb.rotation_quaternion = Quaternion((1, 0, 0, 0)); pb.location = (0, 0, 0)
        bpy.context.view_layer.update()
    def rotate_world(name, q):
        pb = PB[name]; h = pb.matrix.translation.copy()
        pb.matrix = Matrix.Translation(h) @ q.to_matrix().to_4x4() @ Matrix.Translation(-h) @ pb.matrix
        bpy.context.view_layer.update()
    def aimv(name, d):
        a, b = PB[name].matrix.translation, PB[NEXT[name]].matrix.translation
        cur = (b - a).normalized()
        if cur.dot(d) > 0.99999: return
        rotate_world(name, cur.rotation_difference(d))
    def foot_dir(side): return (REST[side + 'ToeBase'] - REST[side + 'Foot']).normalized()
    def leg_ik(side, ank, pitch):
        h = PB[side + 'UpLeg'].matrix.translation.copy()
        d = P(*ank) - h
        l1, l2 = THIGH[side], SHIN[side]
        n = min(d.length, (l1 + l2) * 0.995)
        u = d.normalized()
        along = (l1 * l1 - l2 * l2 + n * n) / (2 * n)
        tall = math.sqrt(max(0, l1 * l1 - along * along))
        pole = P(0.12 if side == 'Left' else -0.12, 1, 0)
        pole = (pole - u * pole.dot(u)).normalized()
        knee = h + u * along + pole * tall
        aimv(side + 'UpLeg', (knee - h).normalized())
        aimv(side + 'Leg', (h + u * n - knee).normalized())
        aimv(side + 'Foot', Quaternion((1, 0, 0), math.radians(-pitch)) @ foot_dir(side))

    def gait(g):
        a = 0.62 * L                                   # 踩地時腳踝離臀部最遠多少（前後各一半）
        T = g['T'] * math.sqrt(L / H / 0.33)            # 腿短的人步頻高一點
        stance = 2 * a / (g['speed'] * H) / T           # 踩地時間佔一圈多少：這樣腳底才會等於跑速，不滑步
        toe_up = TOE * math.sin(math.radians(35)) * 0.8
        def foot(ph):
            if ph < stance:
                u = ph / stance
                pitch = -8 * (1 - u / 0.2) if u < 0.2 else (35 * (u - 0.6) / 0.4 if u > 0.6 else 0)
                return a * (1 - 2 * u), ANK + (toe_up * smooth((u - 0.6) / 0.4)), pitch
            u = (ph - stance) / (1 - stance)
            f = -a + a * 2.25 * smooth(u / 0.85) if u < 0.85 else a * 1.25 - a * 0.25 * smooth((u - 0.85) / 0.15)   # 腳往前超過一點再收回來落地
            z = ANK + g['lift'] * L * math.sin(math.pi * u ** 0.7) + toe_up * (1 - u) ** 2                            # 腳跟先往屁股帶，膝蓋再往前
            return f, z, 35 + (-8 - 35) * smooth(u) + 15 * math.sin(math.pi * u)
        mid = (stance + 0.5) / 2                        # 騰空最高的時候
        def arm_dir(th, sign, bend):
            return D(sign * 0.35, math.sin(th), -math.cos(th)), D(sign * 0.2, math.sin(th + bend), -math.cos(th + bend))
        n = round(T * FPS)
        for i in range(n + 1):
            ph = i / n
            c = math.cos(2 * math.pi * (ph - 0.06))     # 手比腳慢一點點；左腳在前時右手在前
            reset()
            rotate_world('Hips', Quaternion((0, 0, 1), math.radians(7 * c)))
            rotate_world('Hips', Quaternion((0, 1, 0), math.radians(3 * math.cos(2 * math.pi * ph))))
            for b, share in zip(SPINE, (0.3, 0.3, 0.25, 0.1, 0.05)):
                rotate_world(b, Quaternion((1, 0, 0), math.radians(g['lean'] * share)))
            for b in ('Spine01', 'Spine'): rotate_world(b, Quaternion((0, 0, 1), math.radians(-9 * c * 0.5)))
            rotate_world('Head', Quaternion((1, 0, 0), math.radians(-g['lean'] * 0.6)))
            amp, bend = math.radians(g['amp']), math.radians(g['bend'])
            lu, lf = arm_dir(-amp * c, 1, bend); ru, rf = arm_dir(amp * c, -1, bend)
            for name, d in zip(ARMS, (lu, lf, ru, rf)): aimv(name, d)
            m = PB['Hips'].matrix.copy()
            m.translation += Vector((0, 0, (-0.24 + 0.05 * math.cos(4 * math.pi * (ph - mid))) * L))
            PB['Hips'].matrix = m
            bpy.context.view_layer.update()
            lf_, lz, lp = foot(ph); rf_, rz, rp = foot((ph + 0.5) % 1)
            leg_ik('Left', (WIDE, lf_, lz), lp); leg_ik('Right', (-WIDE, rf_, rz), rp)
            for b in ALL: PB[b].keyframe_insert('rotation_quaternion', frame=i, group=b)
            PB['Hips'].keyframe_insert('location', frame=i, group='Hips')
        return n, stance

    def push():
        # 背身強打：右肩頂出去、低重心往前擠。數字和阿傑的一樣，長度照腿長比例換算（阿傑腿長 25.2）
        k = L / 25.2
        RELAX = ((0.42, 0.1, -0.9), (0.28, 0.42, -0.86), (-0.42, 0.1, -0.9), (-0.28, 0.42, -0.86))
        KEYS = [(0.00, 6, 0, 0, -2.5, RELAX, (8, 0, 0), (-8, 0, 0)),
                (0.16, 18, -22, 0, -7.5, ((0.55, 0.5, -0.65), (0.5, 0.75, -0.3), (-0.7, -0.35, -0.6), (-0.25, 0.75, -0.55)), (10, -5, 0), (-10, 4, 0)),
                (0.34, 30, 34, 4, -8, ((0.65, -0.45, -0.6), (0.45, 0.25, -0.85), (-0.75, 0.6, -0.1), (0.35, 0.9, 0.1)), (10, -9, 20), (-10, 14, 0)),
                (0.48, 26, 26, 4, -7, ((0.65, -0.35, -0.65), (0.45, 0.3, -0.85), (-0.75, 0.55, -0.2), (0.25, 0.9, -0.1)), (10, -7, 14), (-10, 13, 0)),
                (0.65, 8, 0, 0, -3.5, RELAX, (8, 0, 0), (-8, 2, 0))]
        for t, lean, twist, fwd, up, dirs, il, ir in KEYS:
            frame = round(t * FPS)
            reset()
            for b, share in zip(SPINE, (0.3, 0.3, 0.25, 0.1, 0.05)): rotate_world(b, Quaternion((1, 0, 0), math.radians(lean * share)))
            for b in ('Spine01', 'Spine'):
                if twist: rotate_world(b, Quaternion((0, 0, 1), math.radians(twist * 0.5)))
            for name, d in zip(ARMS, dirs): aimv(name, D(*d))
            m = PB['Hips'].matrix.copy(); m.translation += Vector((0, -fwd * k, up * k)); PB['Hips'].matrix = m
            bpy.context.view_layer.update()
            leg_ik('Left', (il[0] * k, il[1] * k, ANK), il[2]); leg_ik('Right', (ir[0] * k, ir[1] * k, ANK), ir[2])
            for b in ALL: PB[b].keyframe_insert('rotation_quaternion', frame=frame, group=b)
            PB['Hips'].keyframe_insert('location', frame=frame, group='Hips')
        return round(0.65 * FPS), 0

    arm.animation_data_create()
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, g in {**GAITS, **({'push': None} if key in POWER else {})}.items():
        act = bpy.data.actions.new(f'{key}_{name}')
        arm.animation_data.action = act
        n, stance = gait(g) if g else push()
        scene.frame_start, scene.frame_end = 0, n
        bpy.ops.object.mode_set(mode='OBJECT')
        bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); bpy.context.view_layer.objects.active = arm
        bpy.ops.export_scene.gltf(filepath=os.path.join(OUT_DIR, f'{key}_{name}.glb'), export_format='GLB', use_selection=True, export_skins=False, export_materials='NONE',
                                  export_animations=True, export_animation_mode='ACTIVE_ACTIONS', export_force_sampling=True, export_frame_step=1,
                                  export_optimize_animation_size=True, export_def_bones=False)
        print('CLIP', key, name, 'frames', n, 'stance', round(stance, 3), 'leg/H', round(L / H, 3))
        if PREVIEW and name == 'run':
            os.makedirs(PREVIEW, exist_ok=True)
            cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); scene.collection.objects.link(cam)
            cam.data.type = 'ORTHO'; cam.data.ortho_scale = 1.5 * H * arm.matrix_world.to_scale().z
            scene.camera = cam
            scene.render.engine = 'BLENDER_WORKBENCH'
            scene.display.shading.light = 'STUDIO'; scene.display.shading.color_type = 'TEXTURE'
            scene.render.resolution_x, scene.render.resolution_y = 170, 210
            cam.location = (-3 * H * arm.matrix_world.to_scale().z, 0, 0.5 * H * arm.matrix_world.to_scale().z); cam.rotation_euler = (math.radians(90), 0, math.radians(-90))
            for i in range(8):
                scene.frame_set(round(n * i / 8))
                scene.render.filepath = os.path.join(PREVIEW, f'{list(MODELS).index(key):02d}_{key}_{i}.png')
                bpy.ops.render.render(write_still=True)
            bpy.data.objects.remove(cam)
        bpy.ops.object.mode_set(mode='POSE')

for key, file in MODELS.items():
    build(key, file)
print('DONE')
