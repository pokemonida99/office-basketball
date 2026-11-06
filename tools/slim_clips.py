# -*- coding: utf-8 -*-
# 把只有動畫的 GLB 瘦身：只留骨頭轉動和臀部位移（遊戲的 loadOwnClip 也只用這些），轉動存成 16 位元整數。不動到走路模型那種含模型的檔案。
# 用法：python3 tools/slim_clips.py models/moves models/moves/jie models/moves/run models/sig（Blender 重新匯出後要再跑一次）
# CROP：models/moves/ 的動作只播其中一段（js/main.js 的 MOVE_WIN、OVER_WIN），其他時間的關鍵格不留。改窗口時這裡要一起改
import sys, os, glob, json, struct

CROP = {'dodge': (0.1, 0.9), 'spin': (0.1, 1.1), 'stepback': (0.1, 1.0), 'push': (0.2, 1.3), 'stumble': (0.2, 1.4), 'rebound': (0.6, 1.5), 'block': (0.5, 1.4), 'slam': (0.2, 0.8),
        'reach': (1.55, 2.2), 'knock': (0.5, 2.0), 'flop': (0.1, 1.6), 'stop': (0.5, 1.2), 'handsup': (0.9, 0.9), 'hop': (1.05, 1.35)}

def read_glb(path):
    d = open(path, 'rb').read()
    n = struct.unpack('<I', d[12:16])[0]
    j = json.loads(d[20:20 + n])
    return j, d[28 + n:] if len(d) > 28 + n else b''

def slim(path):
    old = os.path.getsize(path)
    j, b = read_glb(path)
    if j.get('meshes') or len(j.get('animations', [])) != 1: return print('略過', path)
    an = j['animations'][0]
    crop = CROP.get(os.path.basename(path)[:-4]) if os.path.basename(os.path.dirname(path)) == 'moves' else None
    def data(i):
        a = j['accessors'][i]; v = j['bufferViews'][a['bufferView']]
        return a, b[v.get('byteOffset', 0) + a.get('byteOffset', 0):]
    nodes, node_of, buf, views, accs, samplers, chans, times = [], {}, bytearray(), [], [], [], [], {}
    def add(raw, ctype, count, typ, norm=False, mm=None):
        while len(buf) % 4: buf.append(0)
        views.append({'buffer': 0, 'byteOffset': len(buf), 'byteLength': len(raw)})
        buf.extend(raw)
        acc = {'bufferView': len(views) - 1, 'componentType': ctype, 'count': count, 'type': typ}
        if norm: acc['normalized'] = True
        if mm: acc['min'], acc['max'] = mm
        accs.append(acc)
        return len(accs) - 1
    for c in an['channels']:
        t, s = c['target'], an['samplers'][c['sampler']]
        name, path_ = j['nodes'][t['node']].get('name'), t['path']
        if not (path_ == 'rotation' or (path_ == 'translation' and name == 'Hips')): continue
        kind = s.get('interpolation', 'LINEAR')
        if kind not in ('LINEAR', 'STEP'): raise SystemExit('不支援的內插：' + path)
        ia, ib = data(s['input']); oa, ob = data(s['output'])
        cnt = ia['count']
        tv = struct.unpack(f'<{cnt}f', bytes(ib[:cnt * 4]))
        first, last = 0, cnt - 1
        if crop and cnt > 2:   # 窗口前後各留一格，內插才不會變
            while first + 1 < cnt and tv[first + 1] <= crop[0]: first += 1
            while last - 1 > first and tv[last - 1] >= crop[1]: last -= 1
        n_ = last - first + 1
        traw = struct.pack(f'<{n_}f', *tv[first:last + 1])
        if traw not in times:
            times[traw] = add(traw, 5126, n_, 'SCALAR', mm=([tv[first]], [tv[last]]))
        if path_ == 'rotation':
            if oa['componentType'] != 5126: raise SystemExit('已經瘦身過：' + path)
            vals = struct.unpack(f'<{cnt * 4}f', bytes(ob[:cnt * 16]))[first * 4:(last + 1) * 4]
            raw = struct.pack(f'<{n_ * 4}h', *[max(-32767, min(32767, round(v * 32767))) for v in vals])
            out = add(raw, 5122, n_, 'VEC4', norm=True)
        else:
            out = add(bytes(ob[first * 12:(last + 1) * 12]), 5126, n_, 'VEC3')
        node_of.setdefault(name, len(nodes))
        if node_of[name] == len(nodes): nodes.append({'name': name})
        samplers.append({'input': times[traw], 'output': out, 'interpolation': kind})
        chans.append({'sampler': len(samplers) - 1, 'target': {'node': node_of[name], 'path': path_}})
    while len(buf) % 4: buf.append(0)
    g = {'asset': {'version': '2.0'}, 'scene': 0, 'scenes': [{'nodes': list(range(len(nodes)))}], 'nodes': nodes,
         'animations': [{'name': an.get('name', 'clip'), 'samplers': samplers, 'channels': chans}],
         'accessors': accs, 'bufferViews': views, 'buffers': [{'byteLength': len(buf)}]}
    js = json.dumps(g, separators=(',', ':')).encode()
    js += b' ' * (-len(js) % 4)
    total = 12 + 8 + len(js) + 8 + len(buf)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total) + struct.pack('<I', len(js)) + b'JSON' + js + struct.pack('<I', len(buf)) + b'BIN\0' + bytes(buf))
    return old, total

for d in sys.argv[1:]:
    a = z = n = 0
    for p in sorted(glob.glob(os.path.join(d, '*.glb'))):
        r = slim(p)
        if r: a += r[0]; z += r[1]; n += 1
    print(d, n, '個', a // 1024, 'KB →', z // 1024, 'KB')
