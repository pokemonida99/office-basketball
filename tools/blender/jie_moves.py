# 阿傑的全部動作：用腳本擺姿勢、存成可以手改的 .blend，每段動作匯出成一個只有動畫的 GLB（models/moves/jie/）
# 用法：/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/jie_moves.py -- models/jie_walk.glb models/moves/jie tools/blender/jie_moves.blend [預覽圖資料夾]
#
# 為什麼不用共用動作：models/moves/ 是綁在小米身上的，檔案裡有小米的骨頭位置，套到阿傑身上腿會變 2 倍長。
# 骨架是 Tripo 綁的，骨頭本地軸方向不統一，所以姿勢不寫各骨頭的角度，而是寫「這節骨頭要指向哪裡」：
#   方向＝(左, 前, 上)，角色臉朝前。Blender 裡前＝-Y、上＝+Z、左＝+X（右手在 -X）。長度單位：全身高 100。
# 腳可以用 IK：ikL／ikR＝腳踝的位置 (左, 前, 高)，pL／pR＝腳掌相對踩平的角度（正＝腳尖往下）。
# Q 版比例：頭很大、手很短，手舉直也只到耳朵高，所以手都從頭髮外側伸，比賽鏡頭（後上方）才看得到。
import bpy, sys, math, os
from mathutils import Matrix, Vector, Quaternion

argv = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT_DIR, OUT_BLEND = argv[:3]
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
def P(l, f, u): return Vector((l, -f, u))

NEXT = {'LeftArm': 'LeftForeArm', 'LeftForeArm': 'LeftHand', 'RightArm': 'RightForeArm', 'RightForeArm': 'RightHand',
        'LeftUpLeg': 'LeftLeg', 'LeftLeg': 'LeftFoot', 'LeftFoot': 'LeftToeBase',
        'RightUpLeg': 'RightLeg', 'RightLeg': 'RightFoot', 'RightFoot': 'RightToeBase'}
ARMS = ['LeftArm', 'LeftForeArm', 'RightArm', 'RightForeArm']
LEGS = ['LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot']
SPINE = ['Spine02', 'Spine01', 'Spine', 'neck', 'Head']   # 由下到上（名字是綁骨時取的，Spine02 在最下面）
ALL = ['Hips'] + SPINE + ['LeftShoulder', 'RightShoulder'] + ARMS + LEGS + ['LeftHand', 'RightHand', 'LeftToeBase', 'RightToeBase']

def seglen(a, b): return (REST_HEAD[b] - REST_HEAD[a]).length
THIGH, SHIN = {s: seglen(s + 'UpLeg', s + 'Leg') for s in ('Left', 'Right')}, {s: seglen(s + 'Leg', s + 'Foot') for s in ('Left', 'Right')}
ANK = (REST_HEAD['LeftFoot'].z + REST_HEAD['RightFoot'].z) / 2   # 腳踩地時腳踝的高度

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

def aimv(name, d):
    a, b = PB[name].matrix.translation, PB[NEXT[name]].matrix.translation
    cur = (b - a).normalized()
    if cur.dot(d) > 0.99999: return
    rotate_world(name, cur.rotation_difference(d))
def aim(name, d): aimv(name, D(*d))

def rest_foot_dir(side): return (REST_HEAD[side + 'ToeBase'] - REST_HEAD[side + 'Foot']).normalized()
def flat_tuple(side):
    v = rest_foot_dir(side); return (v.x, -v.y, v.z)
FL, FR = flat_tuple('Left'), flat_tuple('Right')

def lowest_foot():
    return min(PB[n].matrix.translation.z for n in ('LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase'))

def move_hips(l, f, u):
    pb = PB['Hips']
    m = pb.matrix.copy(); m.translation += Vector((l, -f, u))
    pb.matrix = m
    bpy.context.view_layer.update()

def leg_ik(side, ank, pitch):
    h = PB[side + 'UpLeg'].matrix.translation.copy()
    a = P(*ank)
    d = a - h
    l1, l2 = THIGH[side], SHIN[side]
    L = min(d.length, l1 + l2 - 0.02)
    u = d.normalized()
    along = (l1 * l1 - l2 * l2 + L * L) / (2 * L)
    tall = math.sqrt(max(0, l1 * l1 - along * along))
    pole = P(0.12 if side == 'Left' else -0.12, 1, 0)   # 膝蓋朝前、微微朝外
    pole = (pole - u * pole.dot(u)).normalized()
    knee = h + u * along + pole * tall
    aimv(side + 'UpLeg', (knee - h).normalized())
    aimv(side + 'Leg', (h + u * L - knee).normalized())
    aimv(side + 'Foot', Quaternion((1, 0, 0), math.radians(-pitch)) @ rest_foot_dir(side))

def pose(p):
    """lean 上身前傾度（負＝後仰）、twist 上身往左轉、hipPitch／hipYaw／hipRoll 骨盆轉、headPitch、shrugL／R 鎖骨抬、
    四肢方向（LeftArm…）、ikL／ikR 腳踝位置、hipUp／hipFwd／hipLeft 骨盆位移、plant＝腳踩回地面（自動放低臀部）"""
    reset()
    if p.get('hipPitch'): rotate_world('Hips', Quaternion((1, 0, 0), math.radians(p['hipPitch'])))
    if p.get('hipYaw'): rotate_world('Hips', Quaternion((0, 0, 1), math.radians(p['hipYaw'])))
    if p.get('hipRoll'): rotate_world('Hips', Quaternion((0, 1, 0), math.radians(p['hipRoll'])))
    for b, share in zip(SPINE, (0.3, 0.3, 0.25, 0.1, 0.05)):
        if p.get('lean'): rotate_world(b, Quaternion((1, 0, 0), math.radians(p['lean'] * share)))
    if p.get('twist'):
        for b in ('Spine01', 'Spine'): rotate_world(b, Quaternion((0, 0, 1), math.radians(p['twist'] * 0.5)))
    if p.get('headPitch'): rotate_world('Head', Quaternion((1, 0, 0), math.radians(p['headPitch'])))
    for side, sign, k in (('Left', 1, 'shrugL'), ('Right', -1, 'shrugR')):   # 手舉高時鎖骨一起抬，腋下才不會被拉長
        if p.get(k): rotate_world(side + 'Shoulder', Quaternion((0, 1, 0), math.radians(-sign * p[k])))
    for name in ARMS:
        if name in p: aim(name, p[name])
    if p.get('hipUp') or p.get('hipFwd') or p.get('hipLeft'):
        move_hips(p.get('hipLeft', 0), p.get('hipFwd', 0), p.get('hipUp', 0))
    if 'ikL' in p: leg_ik('Left', p['ikL'], p.get('pL', 0))
    if 'ikR' in p: leg_ik('Right', p['ikR'], p.get('pR', 0))
    for name in LEGS:
        if name in p: aim(name, p[name])
    if p.get('plant'):
        move_hips(0, 0, REST_LOW - lowest_foot())

reset()
REST_LOW = lowest_foot()

def legs(lu, ll, ru, rl, lf=(0.05, 0.55, -0.85), rf=(-0.05, 0.55, -0.85)):   # 預設腳在空中：腳尖往下
    return dict(LeftUpLeg=lu, LeftLeg=ll, LeftFoot=lf, RightUpLeg=ru, RightLeg=rl, RightFoot=rf)
def arms(lu, lf, ru, rf):
    return dict(LeftArm=lu, LeftForeArm=lf, RightArm=ru, RightForeArm=rf)
def stand(wide=7.5, fl=0, fr=0, low=0):   # 雙腳踩地
    return dict(ikL=(wide, fl, ANK), ikR=(-wide, fr, ANK), hipUp=-1.5 - low)

RELAX = arms((0.42, 0.1, -0.9), (0.28, 0.42, -0.86), (-0.42, 0.1, -0.9), (-0.28, 0.42, -0.86))
HOLD_WAIST = arms((0.35, 0.55, -0.75), (-0.55, 0.8, 0.1), (-0.35, 0.55, -0.75), (0.55, 0.8, 0.1))
HOLD_CHEST = arms((0.45, 0.8, -0.2), (-0.5, 0.65, 0.55), (-0.45, 0.8, -0.2), (0.5, 0.65, 0.55))
GUARD_UP = arms((0.85, 0.3, 0.3), (0.72, 0.55, 0.42), (-0.85, 0.3, 0.3), (-0.72, 0.55, 0.42))   # 防守張手
ARMS_UP = arms((0.6, 0.2, 0.77), (0.42, 0.2, 0.88), (-0.6, 0.2, 0.77), (-0.42, 0.2, 0.88))   # 雙手從頭髮外側舉高
SHOOT = arms((0.72, 0.62, 0.3), (0.2, 0.72, 0.65), (-0.75, 0.25, 0.6), (-0.42, 0.25, 0.87))   # 球在右手、左手扶著
LAND = arms((0.8, 0.45, -0.4), (0.7, 0.65, -0.3), (-0.8, 0.45, -0.4), (-0.7, 0.65, -0.3))
LOWER = arms((0.55, 0.15, -0.8), (0.3, 0.45, -0.85), (-0.55, 0.15, -0.8), (-0.3, 0.45, -0.85))
FLAIL = arms((0.9, -0.1, 0.4), (0.7, 0.3, 0.65), (-0.9, 0.1, 0.1), (-0.75, 0.45, -0.3))

clips = {}
def keyed(name, keys, loop=False): clips[name] = dict(keys=keys, loop=loop)
def smooth(u): return u * u * (3 - 2 * u)

def gait(T, stance, a, lift, base, bob, lean, armf, wide=7.0, rev=False, sway=1.0):
    """走跑循環：左腳踩地時每一格等速往後（腳才不會滑），另一隻腳抬起來畫弧線往前；一圈兩步。"""
    def foot(ph):
        if ph < stance:
            u = ph / stance
            pitch = -14 * (1 - u / 0.15) if u < 0.15 else (32 * (u - 0.72) / 0.28 if u > 0.72 else 0)
            return a * (1 - 2 * u), ANK, pitch
        u = (ph - stance) / (1 - stance)
        return -a + 2 * a * smooth(u), ANK + lift * math.sin(math.pi * u), 32 * (1 - u) - 14 * u
    keys = []
    n = round(T * FPS)
    for i in range(n + 1):
        t = i / FPS
        ph = (i / n) % 1
        s = -1 if rev else 1
        lf, lz, lp = foot((s * ph) % 1); rf, rz, rp = foot((s * ph + 0.5) % 1)
        c = math.cos(2 * math.pi * ph)
        p = dict(lean=lean, headPitch=-lean * 0.5, twist=-5 * c, hipYaw=4 * c,
                 hipUp=base + bob * math.cos(4 * math.pi * ph - 0.6), hipLeft=sway * math.cos(2 * math.pi * ph + 0.6),
                 ikL=(wide, lf, lz), pL=lp, ikR=(-wide, rf, rz), pR=rp)
        p.update(armf(c))
        keys.append((t, p))
    return keys

def swing(amp, bend, out=0.3):
    """手臂前後擺：左手和右腳同方向"""
    def f(c):
        lt, rt = math.radians(-amp * c), math.radians(amp * c)
        def arm(th, sign):
            return (sign * out, math.sin(th), -math.cos(th)), (sign * out * 0.6, math.sin(th + math.radians(bend)), -math.cos(th + math.radians(bend)))
        lu, lf = arm(lt, 1); ru, rf = arm(rt, -1)
        return arms(lu, lf, ru, rf)
    return f

def guard_arms(c): return GUARD_UP

# ---------- 移動 ----------
keyed('walk', gait(0.9, 0.6, 10.0, 4.0, -3.5, 0.8, 3, swing(18, 18)), loop=True)   # 步幅要夠大：遊戲照腳掌速度換算播放速度，步幅小腳就會抽得很快
# 跑步和持球衝刺在 runs.py（每個人都有）
keyed('back', gait(0.8, 0.6, 6.0, 3.0, -3.0, 0.6, 9, lambda c: GUARD_UP, wide=8.5, rev=True, sway=0.6), loop=True)

def guard_keys():
    keys = []; T = 1.0; n = round(T * FPS)
    for i in range(n + 1):
        ph = i / n; s1 = math.sin(2 * math.pi * ph)
        la = max(0, s1); ra = max(0, -s1)   # 兩腳輪流墊一下，往哪邊移都看得通
        p = dict(lean=20, headPitch=-14, hipUp=-8 - 0.7 * abs(s1), hipLeft=1.8 * s1,
                 ikL=(13 + 1.5 * s1, 2, ANK + 2.5 * la), pL=10 * la, ikR=(-13 + 1.5 * s1, 2, ANK + 2.5 * ra), pR=10 * ra)
        p.update(GUARD_UP)
        keys.append((i / FPS, p))
    return keys
keyed('guard', guard_keys(), loop=True)

keyed('stop', [
    (0.00, dict(lean=16, **RELAX, **stand(7, 7, -7, 3))),
    (0.12, dict(lean=-12, headPitch=8, **LAND, ikL=(9, 13, ANK), pL=-18, ikR=(-9, -8, ANK), pR=16, hipUp=-7)),
    (0.30, dict(lean=6, **LOWER, **stand(9, 7, -6, 4))),
    (0.50, dict(lean=3, **RELAX, **stand(7.5, 2, -2, 1))),
])

# ---------- 進攻 ----------
keyed('push', [   # 背身強打：右肩頂出去、低重心往前擠
    (0.00, dict(lean=6, **RELAX, **stand(8, 0, 0, 1))),
    (0.16, dict(lean=18, twist=-22, **arms((0.55, 0.5, -0.65), (0.5, 0.75, -0.3), (-0.7, -0.35, -0.6), (-0.25, 0.75, -0.55)), **stand(10, -5, 4, 6))),
    (0.34, dict(lean=30, twist=34, hipFwd=4, **arms((0.65, -0.45, -0.6), (0.45, 0.25, -0.85), (-0.75, 0.6, -0.1), (0.35, 0.9, 0.1)), ikL=(10, -9, ANK), pL=20, ikR=(-10, 14, ANK), pR=0, hipUp=-8)),
    (0.48, dict(lean=26, twist=26, hipFwd=4, **arms((0.65, -0.35, -0.65), (0.45, 0.3, -0.85), (-0.75, 0.55, -0.2), (0.25, 0.9, -0.1)), ikL=(10, -7, ANK), pL=14, ikR=(-10, 13, ANK), pR=0, hipUp=-7)),
    (0.65, dict(lean=8, **RELAX, **stand(8, 0, 2, 2))),
])
keyed('shoot', [(0.0, dict(lean=-4, headPitch=-6, shrugR=20, **SHOOT, **legs((0.1, 0.1, -1), (0.05, -0.1, -1), (-0.1, 0.1, -1), (-0.05, -0.1, -1)))),
                (1.0, dict(lean=-4, headPitch=-6, shrugR=20, **SHOOT, **legs((0.1, 0.1, -1), (0.05, -0.1, -1), (-0.1, 0.1, -1), (-0.05, -0.1, -1))))])   # 投籃、舉手都定格在這一格（只取上半身）
keyed('lay', [   # 上籃：左腳蹬、右膝帶起來、右手把球往框上送
    (0.00, dict(lean=14, **HOLD_CHEST, **stand(7, 4, -4, 3))),
    (0.15, dict(lean=4, twist=-8, shrugR=12, **arms((0.55, 0.65, -0.1), (0.1, 0.8, 0.45), (-0.7, 0.45, 0.45), (-0.45, 0.3, 0.8)), **legs((0.08, -0.15, -1), (0.03, -0.35, -0.95), (-0.1, 0.95, -0.3), (-0.05, -0.5, -0.85)))),
    (0.40, dict(lean=-6, headPitch=-6, shrugR=26, **arms((0.8, 0.3, -0.45), (0.55, 0.6, -0.5), (-0.65, 0.35, 0.65), (-0.38, 0.4, 0.82)), **legs((0.1, -0.05, -1), (0.03, -0.75, -0.65), (-0.12, 0.7, -0.7), (-0.05, -0.35, -0.93)))),
    (0.60, dict(lean=8, **LOWER, **legs((0.14, 0.2, -1), (0.05, -0.2, -1), (-0.14, 0.2, -1), (-0.05, -0.2, -1)))),
])
keyed('dunk', [   # 灌籃。時間要跟 js/main.js 的 JIE_DUNK 對齊：0.40 球進框、掛框到 0.70、0.97 落地
    (0.00, dict(lean=12, **HOLD_CHEST, **legs((0.1, 0.25, -0.95), (0.06, -0.2, -1), (-0.1, 0.25, -0.95), (-0.06, -0.2, -1), FL, FR), plant=True)),
    (0.10, dict(lean=32, **HOLD_WAIST, **legs((0.2, 0.8, -0.6), (0.05, -0.55, -0.85), (-0.2, 0.8, -0.6), (-0.05, -0.55, -0.85), FL, FR), plant=True)),
    (0.20, dict(lean=2, twist=-10, shrugR=15, **arms((0.5, 0.75, 0.3), (-0.15, 0.8, 0.55), (-0.75, 0.35, 0.55), (-0.55, 0.1, 0.83)), **legs((0.08, -0.1, -1), (0.03, -0.35, -0.95), (-0.1, 0.97, -0.2), (-0.05, -0.55, -0.85)))),   # 離地：左腳蹬直，右膝帶到腰高
    (0.33, dict(lean=-16, hipPitch=-8, twist=-26, shrugR=28, **arms((0.7, 0.55, 0.45), (0.35, 0.8, 0.5), (-0.8, -0.1, 0.6), (-0.4, -0.35, 0.85)), **legs((0.1, -0.05, -1), (0.03, -0.95, -0.3), (-0.14, 0.35, -0.93), (-0.05, -0.95, -0.3)))),   # 空中拉滿：右手拉到頭的右後方
    (0.40, dict(lean=30, hipPitch=10, twist=22, **arms((0.75, 0.2, -0.6), (0.5, 0.5, -0.7), (-0.3, 0.9, 0.3), (-0.1, 0.97, -0.2)), **legs((0.14, 0.8, -0.6), (0.06, 0.1, -1), (-0.14, 0.9, -0.45), (-0.06, 0.1, -1)))),   # 砸下去
    (0.47, dict(lean=-4, twist=8, shrugR=25, **arms((0.85, 0.2, -0.45), (0.6, 0.5, -0.6), (-0.72, 0.42, 0.55), (-0.6, 0.45, 0.66)), **legs((0.12, 0.7, -0.7), (0.05, 0.45, -0.9), (-0.12, 0.78, -0.62), (-0.05, 0.5, -0.87)))),   # 抓框，腿被甩到前面
    (0.58, dict(lean=-12, twist=4, shrugR=28, **arms((0.85, 0.2, -0.45), (0.6, 0.5, -0.6), (-0.72, 0.42, 0.55), (-0.6, 0.45, 0.66)), **legs((0.1, -0.3, -0.95), (0.04, -0.75, -0.65), (-0.1, -0.25, -0.97), (-0.04, -0.7, -0.7)))),   # 腿盪到後面
    (0.68, dict(lean=-6, twist=4, shrugR=25, **arms((0.85, 0.2, -0.45), (0.6, 0.5, -0.6), (-0.72, 0.42, 0.55), (-0.6, 0.45, 0.66)), **legs((0.1, 0.3, -0.95), (0.04, 0.08, -1), (-0.1, 0.35, -0.93), (-0.04, 0.1, -1)))),   # 盪回來，準備放手
    (0.84, dict(lean=4, **LOWER, **legs((0.14, 0.12, -1), (0.06, -0.08, -1), (-0.14, 0.12, -1), (-0.06, -0.08, -1)))),   # 下墜，腳伸直找地板
    (0.97, dict(lean=30, **LAND, **legs((0.22, 0.75, -0.65), (0.06, -0.5, -0.87), (-0.22, 0.75, -0.65), (-0.06, -0.5, -0.87), FL, FR), plant=True)),   # 落地蹲
    (1.07, dict(lean=16, **LOWER, **legs((0.17, 0.5, -0.85), (0.05, -0.32, -0.95), (-0.17, 0.5, -0.85), (-0.05, -0.32, -0.95), FL, FR), plant=True)),
    (1.20, dict(lean=4, **LOWER, **legs((0.12, 0.12, -1), (0.05, -0.08, -1), (-0.12, 0.12, -1), (-0.05, -0.08, -1), FL, FR), plant=True)),
])

# ---------- 防守 ----------
keyed('reach', [   # 抄截：右腳跨出去、上身壓低、右手往前掏
    (0.00, dict(lean=12, **RELAX, **stand(8, 0, 0, 2))),
    (0.12, dict(lean=38, headPitch=-22, twist=18, **arms((0.65, -0.55, -0.5), (0.45, -0.1, -0.88), (-0.22, 0.96, -0.1), (-0.05, 0.93, -0.35)), ikL=(9, -11, ANK), pL=24, ikR=(-9, 16, ANK), pR=0, hipUp=-9, hipFwd=4)),
    (0.30, dict(lean=34, headPitch=-20, twist=10, **arms((0.65, -0.5, -0.55), (0.45, -0.05, -0.9), (-0.25, 0.93, -0.25), (0.15, 0.9, -0.4)), ikL=(9, -10, ANK), pL=22, ikR=(-9, 15, ANK), pR=0, hipUp=-8, hipFwd=4)),
    (0.50, dict(lean=10, **RELAX, **stand(8, 0, 1, 2))),
])
keyed('block', [   # 蓋帽：起跳高度交給遊戲物理，這裡只管姿勢
    (0.00, dict(lean=18, **LOWER, **stand(9, 0, 0, 6))),
    (0.14, dict(lean=2, shrugL=22, shrugR=22, **ARMS_UP, **legs((0.08, 0.02, -1), (0.03, -0.1, -1), (-0.08, 0.02, -1), (-0.03, -0.1, -1)))),
    (0.30, dict(lean=-8, headPitch=-6, shrugL=28, shrugR=28, **ARMS_UP, **legs((0.14, 0.35, -0.93), (0.05, -0.45, -0.9), (-0.14, 0.2, -1), (-0.05, -0.6, -0.8)))),
    (0.48, dict(lean=-2, shrugL=24, shrugR=24, **ARMS_UP, **legs((0.12, 0.2, -1), (0.05, -0.15, -1), (-0.12, 0.2, -1), (-0.05, -0.2, -1)))),
    (0.70, dict(lean=16, **LAND, **stand(9, 0, 0, 5))),
])
keyed('rebound', [   # 搶籃板：雙手張開搆球，抓到拉回胸前
    (0.00, dict(lean=16, **LOWER, **stand(9, 0, 0, 6))),
    (0.20, dict(lean=-6, headPitch=-8, shrugL=26, shrugR=26, **arms((0.75, 0.2, 0.6), (0.6, 0.35, 0.72), (-0.75, 0.2, 0.6), (-0.6, 0.35, 0.72)), **legs((0.14, 0.7, -0.7), (0.05, -0.45, -0.9), (-0.1, 0.05, -1), (-0.04, -0.5, -0.87)))),
    (0.36, dict(lean=4, shrugL=20, shrugR=20, **arms((0.65, 0.55, 0.5), (-0.1, 0.7, 0.7), (-0.65, 0.55, 0.5), (0.1, 0.7, 0.7)), **legs((0.14, 0.55, -0.83), (0.05, -0.4, -0.9), (-0.12, 0.25, -0.97), (-0.04, -0.45, -0.9)))),
    (0.65, dict(lean=14, **HOLD_CHEST, **stand(9, 0, 0, 5))),
])

# ---------- 被撞 ----------
keyed('stumble', [
    (0.00, dict(lean=4, **RELAX, **stand(8, 0, 0, 1))),
    (0.10, dict(lean=-20, headPitch=8, **FLAIL, ikL=(10, 4, ANK), pL=-14, ikR=(-9, -8, ANK), pR=0, hipUp=-3, hipFwd=-3)),
    (0.30, dict(lean=-8, twist=12, hipRoll=6, **arms((0.9, 0.1, 0.1), (0.75, 0.45, -0.3), (-0.9, -0.1, 0.4), (-0.7, 0.3, 0.65)), ikL=(10, -7, ANK + 2), pL=20, ikR=(-9, -10, ANK), pR=0, hipUp=-5, hipFwd=-6)),
    (0.50, dict(lean=14, **LAND, ikL=(10, -3, ANK), pL=0, ikR=(-10, -4, ANK), pR=0, hipUp=-7, hipFwd=-3)),
    (0.70, dict(lean=5, **RELAX, **stand(8, 0, 0, 1))),
])
# 倒地：這些動作的臀部高度都寫在動作裡，地板以下的部分要避開頭（大頭半徑約 30）
keyed('knock', [   # 被蓋倒：屁股著地，再撐起來
    (0.00, dict(lean=-20, **FLAIL, **stand(9, 2, -3, 3))),
    (0.25, dict(hipPitch=-22, lean=-14, headPitch=10, **FLAIL, **legs((0.2, 0.85, -0.5), (0.1, 0.6, -0.8), (-0.2, 0.9, -0.45), (-0.1, 0.65, -0.75)), hipUp=-5, hipFwd=-6)),
    (0.50, dict(hipPitch=-40, lean=-8, headPitch=18, **arms((0.8, -0.45, -0.4), (0.55, -0.45, -0.7), (-0.8, -0.45, -0.4), (-0.55, -0.45, -0.7)), **legs((0.22, 0.95, -0.25), (0.12, 0.85, -0.5), (-0.22, 0.95, -0.2), (-0.12, 0.8, -0.6), (0.05, 0.25, 0.9), (-0.05, 0.25, 0.9)), hipUp=-20, hipFwd=-9)),
    (0.95, dict(hipPitch=-34, lean=-6, headPitch=14, **arms((0.8, -0.45, -0.4), (0.55, -0.45, -0.7), (-0.8, -0.45, -0.4), (-0.55, -0.45, -0.7)), **legs((0.22, 0.9, -0.35), (0.12, 0.6, -0.8), (-0.22, 0.9, -0.3), (-0.12, 0.55, -0.83), (0.05, 0.6, 0.6), (-0.05, 0.6, 0.6)), hipUp=-19, hipFwd=-8)),
    (1.25, dict(lean=34, headPitch=-14, **LOWER, ikL=(11, 4, ANK), ikR=(-11, 1, ANK), hipUp=-9, hipFwd=-4)),
    (1.50, dict(lean=4, **RELAX, **stand(8, 0, 0, 1))),
])
keyed('flop', [   # 撞人倒地：往後翻倒、腳翹起來，再爬起來
    (0.00, dict(lean=-22, headPitch=10, **FLAIL, **stand(8, 3, -2, 2))),
    (0.20, dict(hipPitch=-38, lean=-12, headPitch=10, **FLAIL, **legs((0.2, 0.85, -0.5), (0.12, 0.7, -0.7), (-0.2, 0.9, -0.4), (-0.12, 0.7, -0.7)), hipUp=-4, hipFwd=-10)),
    (0.45, dict(hipPitch=-62, lean=-6, headPitch=18, **arms((0.92, -0.25, 0.3), (0.85, 0.1, 0.5), (-0.92, -0.25, 0.3), (-0.85, 0.1, 0.5)), **legs((0.2, 0.75, 0.6), (0.14, 0.95, 0.1), (-0.2, 0.8, 0.5), (-0.14, 0.95, -0.05), (0.05, 0.35, 0.9), (-0.05, 0.35, 0.9)), hipUp=-20, hipFwd=-14)),
    (0.90, dict(hipPitch=-58, lean=-6, headPitch=16, **arms((0.92, -0.25, 0.25), (0.85, 0.1, 0.45), (-0.92, -0.25, 0.25), (-0.85, 0.1, 0.45)), **legs((0.2, 0.92, 0.15), (0.14, 0.75, -0.65), (-0.2, 0.92, 0.1), (-0.14, 0.7, -0.7), (0.05, 0.7, 0.5), (-0.05, 0.7, 0.5)), hipUp=-20, hipFwd=-13)),
    (1.20, dict(lean=36, headPitch=-14, **LOWER, ikL=(11, 4, ANK), ikR=(-11, 0, ANK), hipUp=-9, hipFwd=-5)),
    (1.50, dict(lean=4, **RELAX, **stand(8, 0, 0, 1))),
])
HOP_A = arms((0.7, 0.15, 0.7), (0.65, 0.1, 0.75), (-0.7, 0.15, 0.7), (-0.65, 0.1, 0.75))
HOP_B = arms((0.82, 0.2, 0.52), (0.82, 0.15, 0.55), (-0.82, 0.2, 0.52), (-0.82, 0.15, 0.55))
keyed('hop', [(t, dict(lean=-4, headPitch=-4, shrugL=22, shrugR=22, **(HOP_B if i % 2 else HOP_A), **stand(8))) for i, t in enumerate((0, 0.35, 0.7, 1.05, 1.4))], loop=True)   # 歡呼：雙手 V 字（遊戲只取上半身，1.05～1.35 秒來回）

os.makedirs(OUT_DIR, exist_ok=True)
arm.animation_data_create()
actions = {}
for name, c in clips.items():
    action = bpy.data.actions.new('jie_' + name)
    action.use_fake_user = True   # 存在 .blend 裡，打開可以從動作清單挑來改
    arm.animation_data.action = action
    for t, p in c['keys']:
        frame = t * FPS
        pose(p)
        for n in ALL:
            PB[n].keyframe_insert('rotation_quaternion', frame=frame, group=n)
        PB['Hips'].keyframe_insert('location', frame=frame, group='Hips')
    actions[name] = action
    scene.frame_start, scene.frame_end = 0, round(c['keys'][-1][0] * FPS)
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); bpy.context.view_layer.objects.active = arm
    # 只匯出骨架和動畫（沒有模型），遊戲用骨頭名字套到阿傑身上
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT_DIR, name + '.glb'), export_format='GLB', use_selection=True, export_skins=False, export_materials='NONE',
                              export_animations=True, export_animation_mode='ACTIVE_ACTIONS', export_force_sampling=True, export_frame_step=1,
                              export_optimize_animation_size=True, export_def_bones=False)
    bpy.ops.object.mode_set(mode='POSE')
    print('CLIP', name, 'keys', len(c['keys']), 'dur', c['keys'][-1][0])

bpy.ops.object.mode_set(mode='OBJECT')
arm.animation_data.action = actions['walk']
scene.frame_start, scene.frame_end = 0, round(clips['walk']['keys'][-1][0] * FPS)
scene.frame_set(0)
bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)

# 預覽圖：每段動作側面取幾格
if PREVIEW:
    os.makedirs(PREVIEW, exist_ok=True)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); scene.collection.objects.link(cam)
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = 1.7
    scene.camera = cam
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'; scene.display.shading.color_type = 'TEXTURE'
    scene.render.resolution_x, scene.render.resolution_y = 170, 200
    VIEWS = {'side': ((-3, 0, 0.62), (90, 0, -90)), 'game': ((0, 2.6, 2.2), (50, 0, 180))}   # game＝比賽鏡頭的角度（後上方）
    for view, (loc, rot) in VIEWS.items():
        cam.location = loc; cam.rotation_euler = tuple(math.radians(a) for a in rot)
        os.makedirs(os.path.join(PREVIEW, view), exist_ok=True)
        for name, c in clips.items():
            arm.animation_data.action = actions[name]
            end = c['keys'][-1][0]
            for i in range(6):
                scene.frame_set(round(end * FPS * i / 6 if c['loop'] else end * FPS * i / 5))
                scene.render.filepath = os.path.join(PREVIEW, view, f'{list(clips).index(name):02d}_{name}_{i}.png')
                bpy.ops.render.render(write_still=True)
print('DONE')
