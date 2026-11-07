# 每個角色自己的跑步和持球衝刺：照他的腿長算步幅，輸出成只有動畫的 GLB（models/moves/run/角色_run.glb、角色_sprint.glb）
# 用法：/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/runs.py -- models work/run [預覽圖資料夾]
#
# 跑和走的差別是「兩腳同時離地」：踩地時間只佔一圈的兩成多，中間整個人騰空；踢腿時腳跟帶到屁股、膝蓋往前帶，上身前傾、手肘彎著擺。
# Q 版腿短，遊戲每秒要跑 3 個身高，所以踩地要很快：踩地時間＝步幅 ÷ 速度，一圈時間照腿長調，腿短的人步頻高一點。
# 有背身強打、強力突破技能的人另外輸出 角色_push.glb：共用的 push 蹲得太低，只取骨頭轉動後整個人會縮成一團（阿傑的在 jie_moves.py）。
# 每個人都有 角色_shot.glb：完整的跳投，遊戲在 0.30 秒（舉到頭上）停住等出手，出手後才接著播（時間在 js/main.js 的 SHOT_SET）。
# 每個人也有 角色_lay.glb（上籃，阿傑的在 jie_moves.py）和 角色_pass.glb（傳球，遊戲只取上半身，邊跑邊傳腳不會停）。
# 還有 角色_dunk／block／rebound／reach／stop／guard／back／stumble／knock／flop.glb：姿勢和 jie_moves.py 的阿傑一樣，長度照腿長換算（阿傑的在 models/moves/jie/）。
# 匯出後要瘦身、打包：python3 tools/slim_clips.py work/run work/jie；python3 tools/pack_clips.py work/run work/jie models/sig models/moves/pack
# 寫法和 jie_moves.py 一樣：手臂寫方向、腳用 IK 寫腳踝位置，不寫骨頭角度（Tripo 綁的骨頭軸向不統一）。
import bpy, sys, math, os
from mathutils import Matrix, Vector, Quaternion

argv = sys.argv[sys.argv.index('--') + 1:]
MODEL_DIR, OUT_DIR = argv[:2]
PREVIEW = argv[2] if len(argv) > 2 else None
FPS = 60
# 只做選角名單上的人和針筒超人；藏起來的角色遊戲不載入，要重新開放時把他們加回來（模型：yan_walk、heilun_walk、glasses_walk、bob_walk、cap_walk、det_walk）
MODELS = {'kui': 'kui_walk2', 'jie': 'jie_walk', 'mi': 'mi_walk', 'vivi': 'vivi_walk', 'kevin': 'kevin_walk', 'lin': 'lin_walk', 'yuan': 'yuan_walk', 'hu': 'hu_walk',
          'tu': 'tu_walk', 'zhang': 'zhang_walk', 'bian': 'bian_walk', 'needle': 'needle_walk'}
# speed 每秒幾個身高（遊戲的基本跑速約 3）、T 腿長 0.33 身高的人跑一圈幾秒、lean 上身前傾、amp 手臂擺幅、bend 手肘彎度
# bob 上下彈的幅度、out 手臂離身體多開（都可以被 STYLE 蓋掉）
GAITS = {'run': dict(speed=3.0, T=0.55, lean=11, amp=46, bend=85, lift=0.62, bob=0.05, out=0.35),
         'sprint': dict(speed=3.1, T=0.5, lean=18, amp=54, bend=90, lift=0.7, bob=0.05, out=0.35)}
# 每個人的跑姿，照角色個性調；T 是倍率，其他直接蓋掉。持球衝刺只多前傾、多擺手
STYLE = {
    'kui': dict(T=0.92, lift=0.72, amp=50, bob=0.07),                    # 新人：輕快、步頻高
    'jie': dict(T=1.1, lean=8, amp=36, lift=0.5, bob=0.04, out=0.48),    # 中鋒：穩、手臂被身體撐開
    'mi': dict(lean=9, amp=36, lift=0.56, out=0.26),                     # 總機：手收得近、動作小
    'vivi': dict(T=1.06, lean=5, amp=26, bend=68, lift=0.48, out=0.2),   # 老闆：挺直、優雅
    'kevin': dict(lean=14, amp=42, lift=0.6),                            # 特助：趕時間的前傾
    'yan': dict(T=0.96, lean=13, amp=44),                                # PM：急件在身
    'heilun': dict(lean=15, amp=52, out=0.42),                           # 業務：大動作
    'de': dict(T=1.08, lean=6, amp=30, lift=0.46, bob=0.03),             # 財務長：省力
    'momo': dict(T=0.96, amp=48, bob=0.08, lift=0.68),                   # 行銷：蹦蹦跳跳
    'zhe': dict(T=1.04, lean=12, amp=34, out=0.28),                      # 工程師：手不太擺
    'zhen': dict(T=0.94, lean=16, amp=46, lift=0.66),                    # 稽核：低頭往前追
    'lin': dict(T=0.9, lean=16, amp=52, lift=0.76),                      # 後衛：全隊最快、膝蓋帶得高
    'yuan': dict(T=1.08, lean=9, amp=40, lift=0.54, out=0.42),           # 中鋒：大步、有力
    'hu': dict(lean=10, amp=42, lift=0.6, out=0.3),                      # 射手：省力、節奏穩
    'tu': dict(T=0.94, lean=10, amp=48, lift=0.74, bob=0.09),            # 兔兔老師：彈跳感
    'zhang': dict(T=1.12, lean=4, amp=28, lift=0.42, bob=0.03, out=0.5), # 校長：挺著肚子、走跑都慢吞吞
    'bian': dict(T=0.94, lean=16, amp=56, lift=0.7),                     # 小編：趕著打卡
}
POWER = ['yuan', 'zhang']
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
            return D(sign * g['out'], math.sin(th), -math.cos(th)), D(sign * g['out'] * 0.6, math.sin(th + bend), -math.cos(th + bend))
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
            m.translation += Vector((0, 0, (-0.24 + g['bob'] * math.cos(4 * math.pi * (ph - mid))) * L))
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

    def shot():
        # 跳投：起跳高度交給遊戲物理，這裡只管姿勢。手都從頭髮外側舉，球在右手
        k = L / 25.2
        CHEST = ((0.45, 0.8, -0.2), (-0.5, 0.65, 0.55), (-0.45, 0.8, -0.2), (0.5, 0.65, 0.55))
        RISE = ((0.6, 0.7, 0.1), (-0.1, 0.75, 0.65), (-0.6, 0.6, 0.35), (0.1, 0.45, 0.85))
        SET = ((0.72, 0.62, 0.3), (0.2, 0.72, 0.65), (-0.75, 0.25, 0.6), (-0.42, 0.25, 0.87))
        FLICK = ((0.72, 0.55, 0.25), (0.5, 0.6, 0.6), (-0.5, 0.35, 0.8), (-0.2, 0.55, 0.8))
        FOLLOW = ((0.75, 0.4, -0.1), (0.5, 0.65, -0.2), (-0.5, 0.35, 0.8), (-0.2, 0.6, 0.75))
        # 秒、前傾、抬頭、右肩抬、臀部高低、手、腳離地、腳尖往下
        KEYS = [(0.00, 8, 0, 0, -4, CHEST, 0, 0), (0.14, 2, -3, 10, 0, RISE, 4, 20), (0.30, -3, -6, 20, 0, SET, 6, 28),
                (0.38, -2, -6, 24, 0, FLICK, 6, 30), (0.62, 2, -4, 14, 0, FOLLOW, 3, 14)]
        for t, lean, head, shrug, up, dirs, lift, pitch in KEYS:
            frame = round(t * FPS)
            reset()
            for b, share in zip(SPINE, (0.3, 0.3, 0.25, 0.1, 0.05)): rotate_world(b, Quaternion((1, 0, 0), math.radians(lean * share)))
            rotate_world('Head', Quaternion((1, 0, 0), math.radians(head)))
            if shrug: rotate_world('RightShoulder', Quaternion((0, 1, 0), math.radians(shrug)))
            for name, d in zip(ARMS, dirs): aimv(name, D(*d))
            m = PB['Hips'].matrix.copy(); m.translation += Vector((0, 0, up * k)); PB['Hips'].matrix = m
            bpy.context.view_layer.update()
            leg_ik('Left', (WIDE, 2.5 * k, ANK + lift * k), pitch); leg_ik('Right', (-WIDE, -2 * k, ANK + lift * k), pitch)
            for b in ALL: PB[b].keyframe_insert('rotation_quaternion', frame=frame, group=b)
            PB['Hips'].keyframe_insert('location', frame=frame, group='Hips')
        return round(0.62 * FPS), 0

    def posed(keys):
        # 通用的關鍵格：秒、前傾、抬頭、上身轉、右肩抬、臀部高低、手、腿（None＝雙腳踩地）
        k = L / 25.2
        for t, lean, head, twist, shrug, up, dirs, leg in keys:
            frame = round(t * FPS)
            reset()
            for b, share in zip(SPINE, (0.3, 0.3, 0.25, 0.1, 0.05)): rotate_world(b, Quaternion((1, 0, 0), math.radians(lean * share)))
            if head: rotate_world('Head', Quaternion((1, 0, 0), math.radians(head)))
            if twist:
                for b in ('Spine01', 'Spine'): rotate_world(b, Quaternion((0, 0, 1), math.radians(twist * 0.5)))
            if shrug: rotate_world('RightShoulder', Quaternion((0, 1, 0), math.radians(shrug)))
            for name, d in zip(ARMS, dirs): aimv(name, D(*d))
            m = PB['Hips'].matrix.copy(); m.translation += Vector((0, 0, up * k)); PB['Hips'].matrix = m
            bpy.context.view_layer.update()
            if leg is None:
                leg_ik('Left', (WIDE, 4 * k, ANK), 0); leg_ik('Right', (-WIDE, -4 * k, ANK), 0)
            else:
                for name, d in zip(LEGS, leg): aimv(name, D(*d))
            for b in ALL: PB[b].keyframe_insert('rotation_quaternion', frame=frame, group=b)
            PB['Hips'].keyframe_insert('location', frame=frame, group='Hips')
        return round(keys[-1][0] * FPS), 0
    CHEST = ((0.45, 0.8, -0.2), (-0.5, 0.65, 0.55), (-0.45, 0.8, -0.2), (0.5, 0.65, 0.55))
    TOE_L, TOE_R = (0.05, 0.55, -0.85), (-0.05, 0.55, -0.85)
    def lay():   # 上籃：左腳蹬、右膝帶起來、右手把球往框上送（0.40 秒出手，和 js/main.js 的 case 'lay' 對齊）
        return posed([
            (0.00, 14, 0, 0, 0, -4.5, CHEST, None),
            (0.15, 4, 0, -8, 12, 0, ((0.55, 0.65, -0.1), (0.1, 0.8, 0.45), (-0.7, 0.45, 0.45), (-0.45, 0.3, 0.8)), ((0.08, -0.15, -1), (0.03, -0.35, -0.95), TOE_L, (-0.1, 0.95, -0.3), (-0.05, -0.5, -0.85), TOE_R)),
            (0.40, -6, -6, 0, 26, 0, ((0.8, 0.3, -0.45), (0.55, 0.6, -0.5), (-0.65, 0.35, 0.65), (-0.38, 0.4, 0.82)), ((0.1, -0.05, -1), (0.03, -0.75, -0.65), TOE_L, (-0.12, 0.7, -0.7), (-0.05, -0.35, -0.93), TOE_R)),
            (0.60, 8, 0, 0, 0, 0, ((0.55, 0.15, -0.8), (0.3, 0.45, -0.85), (-0.55, 0.15, -0.8), (-0.3, 0.45, -0.85)), ((0.14, 0.2, -1), (0.05, -0.2, -1), TOE_L, (-0.14, 0.2, -1), (-0.05, -0.2, -1), TOE_R))])
    def pass_():   # 胸前傳球：雙手推出去再收回來，身體跟著往前送（遊戲只取上半身）
        return posed([
            (0.00, 12, 0, 0, 0, 0, CHEST, None),
            (0.09, 18, -6, 0, 0, 0, ((0.25, 0.95, 0.1), (0.2, 0.95, 0.15), (-0.25, 0.95, 0.1), (-0.2, 0.95, 0.15)), None),
            (0.26, 10, -3, 0, 0, 0, ((0.42, 0.55, -0.7), (0.3, 0.8, -0.35), (-0.42, 0.55, -0.7), (-0.3, 0.8, -0.35)), None)])

    # ---------- 全身動作：寫法和 jie_moves.py 的 pose() 一樣，長度單位是阿傑的腿長比例（k） ----------
    K_ = L / 25.2
    reset()
    REST_LOW = min(PB[n].matrix.translation.z for n in ('LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase'))
    def full(keys, floor=False):
        for t, p in keys:
            reset()
            if p.get('hipPitch'): rotate_world('Hips', Quaternion((1, 0, 0), math.radians(p['hipPitch'])))
            if p.get('hipYaw'): rotate_world('Hips', Quaternion((0, 0, 1), math.radians(p['hipYaw'])))
            if p.get('hipRoll'): rotate_world('Hips', Quaternion((0, 1, 0), math.radians(p['hipRoll'])))
            for b, share in zip(SPINE, (0.3, 0.3, 0.25, 0.1, 0.05)):
                if p.get('lean'): rotate_world(b, Quaternion((1, 0, 0), math.radians(p['lean'] * share)))
            if p.get('twist'):
                for b in ('Spine01', 'Spine'): rotate_world(b, Quaternion((0, 0, 1), math.radians(p['twist'] * 0.5)))
            if p.get('headPitch'): rotate_world('Head', Quaternion((1, 0, 0), math.radians(p['headPitch'])))
            for side, sign, k_ in (('Left', 1, 'shrugL'), ('Right', -1, 'shrugR')):
                if p.get(k_): rotate_world(side + 'Shoulder', Quaternion((0, 1, 0), math.radians(-sign * p[k_])))
            for name, d in zip(ARMS, p['arms']): aimv(name, D(*d))
            if p.get('hipUp') or p.get('hipFwd') or p.get('hipLeft'):
                m = PB['Hips'].matrix.copy(); m.translation += Vector((p.get('hipLeft', 0) * K_, -p.get('hipFwd', 0) * K_, p.get('hipUp', 0) * K_)); PB['Hips'].matrix = m
                bpy.context.view_layer.update()
            if 'ikL' in p:
                il, ir = p['ikL'], p['ikR']
                leg_ik('Left', (il[0] * K_, il[1] * K_, ANK + (il[3] if len(il) > 3 else 0) * K_), il[2] if len(il) > 2 else 0); leg_ik('Right', (ir[0] * K_, ir[1] * K_, ANK + (ir[3] if len(ir) > 3 else 0) * K_), ir[2] if len(ir) > 2 else 0)
            if 'legs' in p:
                for name, d in zip(LEGS, p['legs']): aimv(name, D(*d))
            if p.get('plant'):
                low = min(PB[n].matrix.translation.z for n in ('LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase'))
                m = PB['Hips'].matrix.copy(); m.translation.z += REST_LOW - low; PB['Hips'].matrix = m
                bpy.context.view_layer.update()
            if floor:   # 倒地：腿長的人臀部換算後放太低，身體最低的骨頭不能穿過地板
                low = min(PB[n].matrix.translation.z for n in ('Hips', 'Head', 'LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase', 'LeftHand', 'RightHand'))
                need = REST_LOW + 0.03 * H - low
                if need > 0:
                    m = PB['Hips'].matrix.copy(); m.translation.z += need; PB['Hips'].matrix = m
                    bpy.context.view_layer.update()
            frame = round(t * FPS)
            for b in ALL: PB[b].keyframe_insert('rotation_quaternion', frame=frame, group=b)
            PB['Hips'].keyframe_insert('location', frame=frame, group='Hips')
        return round(keys[-1][0] * FPS), 0
    vl = foot_dir('Left'); vr = foot_dir('Right')
    FL, FR = (vl.x, -vl.y, vl.z), (vr.x, -vr.y, vr.z)
    AIR_L, AIR_R = (0.05, 0.55, -0.85), (-0.05, 0.55, -0.85)
    def legs(lu, ll, ru, rl, lf=AIR_L, rf=AIR_R): return (lu, ll, lf, ru, rl, rf)
    def stand(w=7.5, fl=0, fr=0, low=0): return dict(ikL=(w, fl), ikR=(-w, fr), hipUp=-1.5 - low)
    RELAX = ((0.42, 0.1, -0.9), (0.28, 0.42, -0.86), (-0.42, 0.1, -0.9), (-0.28, 0.42, -0.86))
    HOLD_WAIST = ((0.35, 0.55, -0.75), (-0.55, 0.8, 0.1), (-0.35, 0.55, -0.75), (0.55, 0.8, 0.1))
    HOLD_CHEST_ = ((0.45, 0.8, -0.2), (-0.5, 0.65, 0.55), (-0.45, 0.8, -0.2), (0.5, 0.65, 0.55))
    ARMS_UP = ((0.6, 0.2, 0.77), (0.42, 0.2, 0.88), (-0.6, 0.2, 0.77), (-0.42, 0.2, 0.88))
    LAND = ((0.8, 0.45, -0.4), (0.7, 0.65, -0.3), (-0.8, 0.45, -0.4), (-0.7, 0.65, -0.3))
    LOWER = ((0.55, 0.15, -0.8), (0.3, 0.45, -0.85), (-0.55, 0.15, -0.8), (-0.3, 0.45, -0.85))
    HANG = ((0.85, 0.2, -0.45), (0.6, 0.5, -0.6), (-0.72, 0.42, 0.55), (-0.6, 0.45, 0.66))
    def dunk(): return full([   # 時間要跟 js/main.js 的 DUNK 對齊：0.40 球進框、掛框到 0.70、0.97 落地
        (0.00, dict(lean=12, arms=HOLD_CHEST_, legs=legs((0.1, 0.25, -0.95), (0.06, -0.2, -1), (-0.1, 0.25, -0.95), (-0.06, -0.2, -1), FL, FR), plant=True)),
        (0.10, dict(lean=32, arms=HOLD_WAIST, legs=legs((0.2, 0.8, -0.6), (0.05, -0.55, -0.85), (-0.2, 0.8, -0.6), (-0.05, -0.55, -0.85), FL, FR), plant=True)),
        (0.20, dict(lean=2, twist=-10, shrugR=15, arms=((0.5, 0.75, 0.3), (-0.15, 0.8, 0.55), (-0.75, 0.35, 0.55), (-0.55, 0.1, 0.83)), legs=legs((0.08, -0.1, -1), (0.03, -0.35, -0.95), (-0.1, 0.97, -0.2), (-0.05, -0.55, -0.85)))),
        (0.33, dict(lean=-16, hipPitch=-8, twist=-26, shrugR=28, arms=((0.7, 0.55, 0.45), (0.35, 0.8, 0.5), (-0.8, -0.1, 0.6), (-0.4, -0.35, 0.85)), legs=legs((0.1, -0.05, -1), (0.03, -0.95, -0.3), (-0.14, 0.35, -0.93), (-0.05, -0.95, -0.3)))),
        (0.40, dict(lean=30, hipPitch=10, twist=22, arms=((0.75, 0.2, -0.6), (0.5, 0.5, -0.7), (-0.3, 0.9, 0.3), (-0.1, 0.97, -0.2)), legs=legs((0.14, 0.8, -0.6), (0.06, 0.1, -1), (-0.14, 0.9, -0.45), (-0.06, 0.1, -1)))),
        (0.47, dict(lean=-4, twist=8, shrugR=25, arms=HANG, legs=legs((0.12, 0.7, -0.7), (0.05, 0.45, -0.9), (-0.12, 0.78, -0.62), (-0.05, 0.5, -0.87)))),
        (0.58, dict(lean=-12, twist=4, shrugR=28, arms=HANG, legs=legs((0.1, -0.3, -0.95), (0.04, -0.75, -0.65), (-0.1, -0.25, -0.97), (-0.04, -0.7, -0.7)))),
        (0.68, dict(lean=-6, twist=4, shrugR=25, arms=HANG, legs=legs((0.1, 0.3, -0.95), (0.04, 0.08, -1), (-0.1, 0.35, -0.93), (-0.04, 0.1, -1)))),
        (0.84, dict(lean=4, arms=LOWER, legs=legs((0.14, 0.12, -1), (0.06, -0.08, -1), (-0.14, 0.12, -1), (-0.06, -0.08, -1)))),
        (0.97, dict(lean=30, arms=LAND, legs=legs((0.22, 0.75, -0.65), (0.06, -0.5, -0.87), (-0.22, 0.75, -0.65), (-0.06, -0.5, -0.87), FL, FR), plant=True)),
        (1.07, dict(lean=16, arms=LOWER, legs=legs((0.17, 0.5, -0.85), (0.05, -0.32, -0.95), (-0.17, 0.5, -0.85), (-0.05, -0.32, -0.95), FL, FR), plant=True)),
        (1.20, dict(lean=4, arms=LOWER, legs=legs((0.12, 0.12, -1), (0.05, -0.08, -1), (-0.12, 0.12, -1), (-0.05, -0.08, -1), FL, FR), plant=True))])
    def block(): return full([   # 蓋帽：起跳高度交給遊戲物理
        (0.00, dict(lean=18, arms=LOWER, **stand(9, 0, 0, 6))),
        (0.14, dict(lean=2, shrugL=22, shrugR=22, arms=ARMS_UP, legs=legs((0.08, 0.02, -1), (0.03, -0.1, -1), (-0.08, 0.02, -1), (-0.03, -0.1, -1)))),
        (0.30, dict(lean=-8, headPitch=-6, shrugL=28, shrugR=28, arms=ARMS_UP, legs=legs((0.14, 0.35, -0.93), (0.05, -0.45, -0.9), (-0.14, 0.2, -1), (-0.05, -0.6, -0.8)))),
        (0.48, dict(lean=-2, shrugL=24, shrugR=24, arms=ARMS_UP, legs=legs((0.12, 0.2, -1), (0.05, -0.15, -1), (-0.12, 0.2, -1), (-0.05, -0.2, -1)))),
        (0.70, dict(lean=16, arms=LAND, **stand(9, 0, 0, 5)))])
    def rebound(): return full([   # 搶籃板：雙手張開搆球，抓到拉回胸前
        (0.00, dict(lean=16, arms=LOWER, **stand(9, 0, 0, 6))),
        (0.20, dict(lean=-6, headPitch=-8, shrugL=26, shrugR=26, arms=((0.75, 0.2, 0.6), (0.6, 0.35, 0.72), (-0.75, 0.2, 0.6), (-0.6, 0.35, 0.72)), legs=legs((0.14, 0.7, -0.7), (0.05, -0.45, -0.9), (-0.1, 0.05, -1), (-0.04, -0.5, -0.87)))),
        (0.36, dict(lean=4, shrugL=20, shrugR=20, arms=((0.65, 0.55, 0.5), (-0.1, 0.7, 0.7), (-0.65, 0.55, 0.5), (0.1, 0.7, 0.7)), legs=legs((0.14, 0.55, -0.83), (0.05, -0.4, -0.9), (-0.12, 0.25, -0.97), (-0.04, -0.45, -0.9)))),
        (0.65, dict(lean=14, arms=HOLD_CHEST_, **stand(9, 0, 0, 5)))])
    def reach(): return full([   # 抄截：右腳跨出去、上身壓低、右手往前掏
        (0.00, dict(lean=12, arms=RELAX, **stand(8, 0, 0, 2))),
        (0.12, dict(lean=38, headPitch=-22, twist=18, arms=((0.65, -0.55, -0.5), (0.45, -0.1, -0.88), (-0.22, 0.96, -0.1), (-0.05, 0.93, -0.35)), ikL=(9, -11, 24), ikR=(-9, 16), hipUp=-9, hipFwd=4)),
        (0.30, dict(lean=34, headPitch=-20, twist=10, arms=((0.65, -0.5, -0.55), (0.45, -0.05, -0.9), (-0.25, 0.93, -0.25), (0.15, 0.9, -0.4)), ikL=(9, -10, 22), ikR=(-9, 15), hipUp=-8, hipFwd=4)),
        (0.50, dict(lean=10, arms=RELAX, **stand(8, 0, 1, 2)))])
    def stop_(): return full([   # 急停：身體往後仰煞車，腳往前踩，再站穩
        (0.00, dict(lean=16, arms=RELAX, **stand(7, 7, -7, 3))),
        (0.12, dict(lean=-12, headPitch=8, arms=LAND, ikL=(9, 13, -18), ikR=(-9, -8, 16), hipUp=-7)),
        (0.30, dict(lean=6, arms=LOWER, **stand(9, 7, -6, 4))),
        (0.50, dict(lean=3, arms=RELAX, **stand(7.5, 2, -2, 1)))])
    GUARD_UP = ((0.85, 0.3, 0.3), (0.72, 0.55, 0.42), (-0.85, 0.3, 0.3), (-0.72, 0.55, 0.42))
    FLAIL = ((0.9, -0.1, 0.4), (0.7, 0.3, 0.65), (-0.9, 0.1, 0.1), (-0.75, 0.45, -0.3))
    def guard():   # 防守滑步：壓低重心張手，兩腳輪流墊一下，往哪邊移都看得通（循環）
        keys = []
        for i in range(31):
            ph = i / 30; s1 = math.sin(2 * math.pi * ph); la, ra = max(0, s1), max(0, -s1)
            keys.append((i / 30, dict(lean=20, headPitch=-14, hipUp=-8 - 0.7 * abs(s1), hipLeft=1.8 * s1, arms=GUARD_UP, ikL=(13 + 1.5 * s1, 2, 10 * la, 2.5 * la), ikR=(-13 + 1.5 * s1, 2, 10 * ra, 2.5 * ra))))
        return full(keys)
    def back():   # 後退步：張手往後踩（循環）
        a_, stance_, lift_ = 6.0, 0.6, 3.0
        def ft(ph):
            if ph < stance_:
                u = ph / stance_
                return a_ * (1 - 2 * u), -14 * (1 - u / 0.15) if u < 0.15 else (32 * (u - 0.72) / 0.28 if u > 0.72 else 0), 0
            u = (ph - stance_) / (1 - stance_)
            return -a_ + 2 * a_ * smooth(u), 32 * (1 - u) - 14 * u, lift_ * math.sin(math.pi * u)
        keys = []
        for i in range(25):
            ph = i / 24; c = math.cos(2 * math.pi * ph)
            lf_, lp, lz = ft((-ph) % 1); rf_, rp, rz = ft((-ph + 0.5) % 1)
            keys.append((i / 30, dict(lean=9, headPitch=-4.5, twist=-5 * c, hipYaw=4 * c, hipUp=-3 + 0.6 * math.cos(4 * math.pi * ph - 0.6), hipLeft=0.6 * math.cos(2 * math.pi * ph + 0.6), arms=GUARD_UP, ikL=(8.5, lf_, lp, lz), ikR=(-8.5, rf_, rp, rz))))
        return full(keys)
    def stumble(): return full([   # 被撞到踉蹌
        (0.00, dict(lean=4, arms=RELAX, **stand(8, 0, 0, 1))),
        (0.10, dict(lean=-20, headPitch=8, arms=FLAIL, ikL=(10, 4, -14), ikR=(-9, -8), hipUp=-3, hipFwd=-3)),
        (0.30, dict(lean=-8, twist=12, hipRoll=6, arms=((0.9, 0.1, 0.1), (0.75, 0.45, -0.3), (-0.9, -0.1, 0.4), (-0.7, 0.3, 0.65)), ikL=(10, -7, 20, 2), ikR=(-9, -10), hipUp=-5, hipFwd=-6)),
        (0.50, dict(lean=14, arms=LAND, ikL=(10, -3), ikR=(-10, -4), hipUp=-7, hipFwd=-3)),
        (0.70, dict(lean=5, arms=RELAX, **stand(8, 0, 0, 1)))])
    SIT = ((0.8, -0.45, -0.4), (0.55, -0.45, -0.7), (-0.8, -0.45, -0.4), (-0.55, -0.45, -0.7))
    def knock(): return full([   # 被蓋倒：屁股著地，再撐起來
        (0.00, dict(lean=-20, arms=FLAIL, **stand(9, 2, -3, 3))),
        (0.25, dict(hipPitch=-22, lean=-14, headPitch=10, arms=FLAIL, legs=legs((0.2, 0.85, -0.5), (0.1, 0.6, -0.8), (-0.2, 0.9, -0.45), (-0.1, 0.65, -0.75)), hipUp=-5, hipFwd=-6)),
        (0.50, dict(hipPitch=-40, lean=-8, headPitch=18, arms=SIT, legs=legs((0.22, 0.95, -0.25), (0.12, 0.85, -0.5), (-0.22, 0.95, -0.2), (-0.12, 0.8, -0.6), (0.05, 0.25, 0.9), (-0.05, 0.25, 0.9)), hipUp=-20, hipFwd=-9)),
        (0.95, dict(hipPitch=-34, lean=-6, headPitch=14, arms=SIT, legs=legs((0.22, 0.9, -0.35), (0.12, 0.6, -0.8), (-0.22, 0.9, -0.3), (-0.12, 0.55, -0.83), (0.05, 0.6, 0.6), (-0.05, 0.6, 0.6)), hipUp=-19, hipFwd=-8)),
        (1.25, dict(lean=34, headPitch=-14, arms=LOWER, ikL=(11, 4), ikR=(-11, 1), hipUp=-9, hipFwd=-4)),
        (1.50, dict(lean=4, arms=RELAX, **stand(8, 0, 0, 1)))], floor=True)
    def flop(): return full([   # 撞人倒地：往後翻倒、腳翹起來，再爬起來
        (0.00, dict(lean=-22, headPitch=10, arms=FLAIL, **stand(8, 3, -2, 2))),
        (0.20, dict(hipPitch=-38, lean=-12, headPitch=10, arms=FLAIL, legs=legs((0.2, 0.85, -0.5), (0.12, 0.7, -0.7), (-0.2, 0.9, -0.4), (-0.12, 0.7, -0.7)), hipUp=-4, hipFwd=-10)),
        (0.45, dict(hipPitch=-62, lean=-6, headPitch=18, arms=((0.92, -0.25, 0.3), (0.85, 0.1, 0.5), (-0.92, -0.25, 0.3), (-0.85, 0.1, 0.5)), legs=legs((0.2, 0.75, 0.6), (0.14, 0.95, 0.1), (-0.2, 0.8, 0.5), (-0.14, 0.95, -0.05), (0.05, 0.35, 0.9), (-0.05, 0.35, 0.9)), hipUp=-20, hipFwd=-14)),
        (0.90, dict(hipPitch=-58, lean=-6, headPitch=16, arms=((0.92, -0.25, 0.25), (0.85, 0.1, 0.45), (-0.92, -0.25, 0.25), (-0.85, 0.1, 0.45)), legs=legs((0.2, 0.92, 0.15), (0.14, 0.75, -0.65), (-0.2, 0.92, 0.1), (-0.14, 0.7, -0.7), (0.05, 0.7, 0.5), (-0.05, 0.7, 0.5)), hipUp=-20, hipFwd=-13)),
        (1.20, dict(lean=36, headPitch=-14, arms=LOWER, ikL=(11, 4), ikR=(-11, 0), hipUp=-9, hipFwd=-5)),
        (1.50, dict(lean=4, arms=RELAX, **stand(8, 0, 0, 1)))], floor=True)

    arm.animation_data_create()
    os.makedirs(OUT_DIR, exist_ok=True)
    style = STYLE.get(key, {})
    def styled(g):
        o = {**g, **{a: b for a, b in style.items() if a != 'T'}}
        o['T'] = g['T'] * style.get('T', 1)
        if g is GAITS['sprint']: o['lean'] += 7; o['amp'] += 8
        return o
    plan = {n: styled(g) for n, g in GAITS.items()}
    if key != 'needle': plan['shot'] = plan['pass'] = None
    if key not in ('needle', 'jie'): plan.update(lay=None, dunk=None, block=None, rebound=None, reach=None, stop=None, guard=None, back=None, stumble=None, knock=None, flop=None)
    if key in POWER: plan['push'] = None
    for name, g in plan.items():
        act = bpy.data.actions.new(f'{key}_{name}')
        arm.animation_data.action = act
        n, stance = gait(g) if g else {'shot': shot, 'push': push, 'lay': lay, 'pass': pass_, 'dunk': dunk, 'block': block, 'rebound': rebound, 'reach': reach, 'stop': stop_, 'guard': guard, 'back': back, 'stumble': stumble, 'knock': knock, 'flop': flop}[name]()
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
