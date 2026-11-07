# 球場的美術：用 Cycles 算圖做兩種東西，輸出 PNG（再用 tools/court_art_webp.py 轉成 art/court/*.webp）
#   roof_city：頂樓落地窗外的黃昏城市（真的有遠近、大樓窗戶亮燈、地平線霧氣）
#   roof_light／temple_light：地板光影圖（窗框投影、光束、牆角陰影、燈籠光暈），遊戲把地板顏色乘上它的兩倍，所以 50% 灰＝不變
# 用法：/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/court_art.py -- 輸出資料夾
# 座標和遊戲一樣換算：遊戲 x → x、遊戲 z → -y、遊戲高度 → z；地板範圍要和 js/court.js 的 floor 對齊（M = 1.2）
import bpy, sys, math, random, os
from mathutils import Vector

OUT = sys.argv[sys.argv.index('--') + 1]
os.makedirs(OUT, exist_ok=True)
COURT_X, Z0, Z1, M = 6.0, 0.0, 10.5, 1.2
FW, FH = (COURT_X + M) * 2, Z1 - Z0 + M * 2      # 地板大小
FZ = (Z0 + Z1) / 2                                # 地板中心（遊戲 z）

def fresh(samples, w, h):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.engine = 'CYCLES'; s.cycles.samples = samples; s.cycles.use_denoising = True
    s.render.resolution_x, s.render.resolution_y = w, h
    s.view_settings.view_transform = 'Standard'; s.view_settings.look = 'None'
    s.render.image_settings.file_format = 'PNG'
    return s

def cube(x0, x1, y0, y1, z0, z1, mat=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
    o = bpy.context.object; o.scale = (x1 - x0, y1 - y0, z1 - z0); bpy.ops.object.transform_apply(scale=True)
    if mat: o.data.materials.append(mat)
    return o

def plain(rgb, rough=0.8, emit=None, strength=1):
    m = bpy.data.materials.new('m'); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']; b.inputs['Base Color'].default_value = (*rgb, 1); b.inputs['Roughness'].default_value = rough
    if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = strength
    return m

def world(top, mid, low):
    w = bpy.data.worlds.new('w'); bpy.context.scene.world = w; w.use_nodes = True
    n = w.node_tree.nodes; l = w.node_tree.links
    tc = n.new('ShaderNodeTexCoord'); sep = n.new('ShaderNodeSeparateXYZ'); ramp = n.new('ShaderNodeValToRGB')
    l.new(tc.outputs['Generated'], sep.inputs[0]); l.new(sep.outputs['Z'], ramp.inputs[0])
    c = ramp.color_ramp; c.elements[0].position = 0.0; c.elements[0].color = (*low, 1); c.elements[1].position = 0.32; c.elements[1].color = (*top, 1)
    e = c.elements.new(0.07); e.color = (*mid, 1)
    l.new(ramp.outputs[0], n['Background'].inputs[0]); n['Background'].inputs[1].default_value = 1.0
    return w

def sun(direction, strength, rgb, angle=2.0):
    bpy.ops.object.light_add(type='SUN')
    o = bpy.context.object; o.data.energy = strength; o.data.color = rgb; o.data.angle = math.radians(angle)
    o.rotation_euler = Vector(direction).to_track_quat('Z', 'Y').to_euler()
    return o

def top_camera():
    bpy.ops.object.camera_add(location=(0, -FZ, 20), rotation=(0, 0, 0))
    c = bpy.context.object; c.data.type = 'ORTHO'; c.data.ortho_scale = max(FW, FH); bpy.context.scene.camera = c

def only_shadows():
    # 除了地板，其他東西鏡頭都看不到，只留影子
    for o in bpy.data.objects:
        if o.type == 'MESH' and o.name != 'Plane': o.visible_camera = False

def render(name):
    bpy.context.scene.render.filepath = os.path.join(OUT, name + '.png')
    bpy.ops.render.render(write_still=True)
    print('RENDERED', name)

# ---------- 窗外城市 ----------
def city():
    fresh(96, 2048, 460)
    random.seed(7)
    world((0.20, 0.34, 0.66), (1.0, 0.56, 0.32), (1.0, 0.72, 0.45))
    def building_mat(tint, seed):
        m = bpy.data.materials.new('b'); m.use_nodes = True
        n = m.node_tree.nodes; l = m.node_tree.links
        out = n['Material Output']; n.remove(n['Principled BSDF'])
        geo = n.new('ShaderNodeNewGeometry'); tc = n.new('ShaderNodeTexCoord')
        def math_(op, a, b=None):
            x = n.new('ShaderNodeMath'); x.operation = op
            for i, v in enumerate((a, b)):
                if v is None: continue
                if isinstance(v, (int, float)): x.inputs[i].default_value = v
                else: l.new(v, x.inputs[i])
            return x.outputs[0]
        # 窗格：世界座標取格子
        pos = n.new('ShaderNodeSeparateXYZ'); l.new(geo.outputs['Position'], pos.inputs[0])
        horiz = math_('ADD', pos.outputs['X'], pos.outputs['Y'])
        fx = math_('FRACT', math_('MULTIPLY', horiz, 0.45)); fz = math_('FRACT', math_('MULTIPLY', pos.outputs['Z'], 0.3))
        mask = math_('MULTIPLY', math_('LESS_THAN', fx, 0.62), math_('LESS_THAN', fz, 0.6))
        cell = n.new('ShaderNodeCombineXYZ')
        l.new(math_('FLOOR', math_('MULTIPLY', horiz, 0.45)), cell.inputs[0]); l.new(math_('FLOOR', math_('MULTIPLY', pos.outputs['Z'], 0.3)), cell.inputs[1]); cell.inputs[2].default_value = seed
        wn = n.new('ShaderNodeTexWhiteNoise'); wn.noise_dimensions = '3D'; l.new(cell.outputs[0], wn.inputs['Vector'])
        lit = math_('MULTIPLY', mask, math_('GREATER_THAN', wn.outputs['Value'], 0.8))
        diff = n.new('ShaderNodeBsdfDiffuse'); diff.inputs['Color'].default_value = (*tint, 1)
        em = n.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (1.0, 0.72, 0.36, 1); em.inputs['Strength'].default_value = 1.15
        # 玻璃反射一點天色
        glass = n.new('ShaderNodeEmission'); glass.inputs['Color'].default_value = (0.95, 0.55, 0.36, 1); glass.inputs['Strength'].default_value = 0.22
        mix1 = n.new('ShaderNodeMixShader'); l.new(mask, mix1.inputs[0]); l.new(diff.outputs[0], mix1.inputs[1]); l.new(glass.outputs[0], mix1.inputs[2])
        mix2 = n.new('ShaderNodeMixShader'); l.new(lit, mix2.inputs[0]); l.new(mix1.outputs[0], mix2.inputs[1]); l.new(em.outputs[0], mix2.inputs[2])
        # 遠處被霧吞掉
        dist = n.new('ShaderNodeVectorMath'); dist.operation = 'DISTANCE'; l.new(geo.outputs['Position'], dist.inputs[0]); dist.inputs[1].default_value = (0, -30, 95)
        fog = math_('MINIMUM', math_('POWER', math_('DIVIDE', dist.outputs['Value'], 1500), 1.25), 0.9)
        fc = n.new('ShaderNodeEmission'); fc.inputs['Color'].default_value = (1.0, 0.66, 0.42, 1)
        mix3 = n.new('ShaderNodeMixShader'); l.new(fog, mix3.inputs[0]); l.new(mix2.outputs[0], mix3.inputs[1]); l.new(fc.outputs[0], mix3.inputs[2])
        l.new(mix3.outputs[0], out.inputs[0])
        return m
    mats = [building_mat(t, i) for i, t in enumerate(((0.10, 0.12, 0.20), (0.15, 0.13, 0.20), (0.08, 0.11, 0.17), (0.18, 0.14, 0.17)))]
    bpy.ops.mesh.primitive_plane_add(size=4000, location=(0, 400, 0)); bpy.context.object.data.materials.append(mats[0])
    for row in range(34):
        y = 40 + row * row * 1.2 + row * 12
        spread = 110 + y * 1.1
        x = -spread
        while x < spread:
            w = random.uniform(9, 24); d = random.uniform(9, 22)
            cl = math.exp(-((x / (spread * 0.6)) ** 2))
            h = random.uniform(10, 34) + random.random() ** 3 * (30 + row * 3.5) + cl * row * 1.2
            cube(x, x + w, y, y + d, 0, h, random.choice(mats))
            if random.random() < 0.3: cube(x + w * 0.3, x + w * 0.7, y + d * 0.3, y + d * 0.7, h, h + random.uniform(3, 10), random.choice(mats))
            x += w + random.uniform(1, 6)
    # 遠方的高塔地標（竹節狀，原創造型）
    ty, tx = 900, -300
    for k in range(9):
        w = 34 - k * 0.8
        cube(tx - w / 2, tx + w / 2, ty, ty + w, k * 32, k * 32 + 30, mats[2])
    cube(tx - 2, tx + 2, ty + 15, ty + 18, 288, 340, mats[2])
    # 夕陽和雲
    bpy.ops.mesh.primitive_uv_sphere_add(radius=46, location=(250, 1900, 92)); s_ = bpy.context.object; s_.data.materials.append(plain((1, 1, 1), emit=(1.0, 0.84, 0.55), strength=9))
    random.seed(3)
    cloud = plain((1, 0.8, 0.7), emit=(1.0, 0.66, 0.52), strength=0.62)
    for i in range(46):
        x, z = random.uniform(-1500, 1500), random.uniform(170, 520)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=(x, 2100, z)); o = bpy.context.object
        o.scale = (random.uniform(60, 240), 30, random.uniform(7, 26)); o.data.materials.append(cloud); bpy.ops.object.shade_smooth()
    bpy.ops.object.light_add(type='SUN'); o = bpy.context.object; o.data.energy = 1.4; o.data.color = (1, 0.72, 0.5); o.rotation_euler = (math.radians(100), 0, math.radians(-170))
    bpy.ops.object.camera_add(location=(0, -30, 95), rotation=(math.radians(88.5), 0, 0))   # 頂樓的高度，稍微往下看，地平線在畫面中間偏下
    c = bpy.context.object; c.data.lens = 30; c.data.clip_end = 6000; bpy.context.scene.camera = c
    render('roof_city')

# ---------- 地板光影 ----------
def floor_plane():
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, -FZ, 0)); o = bpy.context.object
    o.scale = (FW + 30, FH + 30, 1); o.data.materials.append(plain((0.9, 0.9, 0.9), rough=1))

def roof_light():
    fresh(128, 1152, 1032)
    white = plain((0.8, 0.8, 0.8), rough=1)
    floor_plane()
    wz = 1.7                      # 落地窗牆在遊戲 z=-1.7 → y=+1.7
    cube(-14, 14, wz, wz + 0.4, 0, 0.6, white)      # 窗台
    cube(-14, 14, wz, wz + 0.4, 6.7, 8, white)      # 窗頂
    x = -14.0
    while x <= 14:
        cube(x - 0.11, x + 0.11, wz - 0.1, wz + 0.2, 0, 7, white)      # 窗柱（和 court.js 一樣每 3.5 一根）
        x += 3.5
    for h in (2.6, 4.6): cube(-14, 14, wz, wz + 0.08, h - 0.03, h + 0.03, white)      # 橫向窗框
    for s in (-1, 1):             # 兩邊隔板、長椅、盆栽：只留牆角陰影
        cube(s * 7.3, s * 7.5, -11.5, 0, 0, 1.0, white)
        cube(s * 6.3, s * 7.2, -8.9, -3.1, 0, 0.42, white)
    cube(6.6, 7.6, -2.5, -1.5, 0, 1.9, white)       # 販賣機
    cube(-7.3, -6.7, -2.3, -1.7, 0, 1.3, white)     # 飲水機
    world((0.34, 0.42, 0.62), (0.5, 0.42, 0.42), (0.5, 0.42, 0.42))
    bpy.context.scene.world.node_tree.nodes['Background'].inputs[1].default_value = 0.42
    sun((-0.34, 1.0, 0.56), 5.6, (1.0, 0.70, 0.42), angle=1.2)   # 黃昏的太陽從窗外斜射進來，拉出長長的窗框影子
    only_shadows(); top_camera(); render('roof_light')

def temple_light():
    fresh(128, 1152, 1032)
    random.seed(11)
    floor_plane()
    leaf = plain((0.05, 0.05, 0.05), rough=1)
    white = plain((0.7, 0.7, 0.7), rough=1)
    # 廟（遊戲 z<-1）擋住背後的光、榕樹在左後方灑下斑駁樹影
    cube(-9, 9, 2.3, 7, 0, 5.2, white)
    for i in range(110):
        a, r = random.uniform(0, 6.28), random.random() ** 0.6 * 6.5
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=random.uniform(0.25, 0.8), location=(-15.5 + math.cos(a) * r * 0.8, -2.5 + math.sin(a) * r * 0.75, random.uniform(6.2, 9.5)))
        bpy.context.object.data.materials.append(leaf)
    for s in (-1, 1):
        cube(s * 6.9, s * 7.5, -9, -3, 0, 0.5, white)
    world((0.42, 0.40, 0.58), (0.56, 0.44, 0.44), (0.56, 0.44, 0.44))
    bpy.context.scene.world.node_tree.nodes['Background'].inputs[1].default_value = 0.5
    sun((-0.8, 0.3, 0.75), 4.2, (1.0, 0.62, 0.36), angle=2.5)
    # 紅燈籠的光暈：位置和 court.js 的 lantern 一樣
    def glow(x, y, z, e):
        bpy.ops.object.light_add(type='POINT', location=(x, y, z)); o = bpy.context.object; o.data.energy = e; o.data.color = (1.0, 0.36, 0.18); o.data.shadow_soft_size = 0.2
    for s in (-1, 1):
        z = -0.4
        while z <= 10.8:
            glow(s * 7.0, -z, 3.2, 11); z += 1.15
    x = -6.4
    while x <= 6.4:
        glow(x, 0.6, 4.2, 9); x += 1.1
    only_shadows(); top_camera(); render('temple_light')

for job in (roof_light, temple_light, city):
    if len(sys.argv) <= sys.argv.index('--') + 2 or job.__name__ in sys.argv: job()
print('ARTDONE')
