# -*- coding: utf-8 -*-
# 把一個角色的所有動作併成一個 GLB（models/moves/pack/角色.glb），每段動作用名字區分。遊戲開賽才下載上場的人，不用開遊戲就載一百多個小檔。
# 流程：Blender 匯出到 work/ → python3 tools/slim_clips.py work/run work/jie → 這支。walk.glb 開遊戲就要用，留在 models/moves/jie/
# 用法：python3 tools/pack_clips.py work/run work/jie models/sig models/moves/pack
import sys, os, glob, json, struct

def read(path):
    d = open(path, 'rb').read()
    n = struct.unpack('<I', d[12:16])[0]
    return json.loads(d[20:20 + n]), d[28 + n:]

def pack(sources, out):
    nodes, node_of, buf, views, accs, anims = [], {}, bytearray(), [], [], []
    seen = {}   # 一樣的時間軸只存一份
    for name, path in sorted(sources.items()):
        j, b = read(path)
        an = j['animations'][0]
        def copy(i):
            a = j['accessors'][i]; v = j['bufferViews'][a['bufferView']]
            raw = bytes(b[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']])
            key = (raw, a['componentType'], a['type'])
            if key in seen: return seen[key]
            while len(buf) % 4: buf.append(0)
            views.append({'buffer': 0, 'byteOffset': len(buf), 'byteLength': len(raw)}); buf.extend(raw)
            acc = {k: a[k] for k in a if k != 'bufferView'}; acc['bufferView'] = len(views) - 1
            accs.append(acc); seen[key] = len(accs) - 1
            return seen[key]
        samplers, chans = [], []
        for c in an['channels']:
            s = an['samplers'][c['sampler']]
            samplers.append({'input': copy(s['input']), 'output': copy(s['output']), 'interpolation': s.get('interpolation', 'LINEAR')})
            nm = j['nodes'][c['target']['node']]['name']
            if nm not in node_of: node_of[nm] = len(nodes); nodes.append({'name': nm})
            chans.append({'sampler': len(samplers) - 1, 'target': {'node': node_of[nm], 'path': c['target']['path']}})
        anims.append({'name': name, 'samplers': samplers, 'channels': chans})
    while len(buf) % 4: buf.append(0)
    g = {'asset': {'version': '2.0'}, 'scene': 0, 'scenes': [{'nodes': list(range(len(nodes)))}], 'nodes': nodes, 'animations': anims, 'accessors': accs, 'bufferViews': views, 'buffers': [{'byteLength': len(buf)}]}
    js = json.dumps(g, separators=(',', ':')).encode(); js += b' ' * (-len(js) % 4)
    with open(out, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 28 + len(js) + len(buf)) + struct.pack('<I', len(js)) + b'JSON' + js + struct.pack('<I', len(buf)) + b'BIN\0' + bytes(buf))
    return os.path.getsize(out)

run, jie, sig, out = sys.argv[1:5]
os.makedirs(out, exist_ok=True)
chars = {}
for p in glob.glob(os.path.join(run, '*.glb')):
    k, m = os.path.basename(p)[:-4].split('_', 1)
    chars.setdefault(k, {})[m] = p
for p in glob.glob(os.path.join(jie, '*.glb')):
    m = os.path.basename(p)[:-4]
    if m != 'walk': chars['jie'][m] = p
total = 0
for k, src in sorted(chars.items()):
    s = os.path.join(sig, k + '.glb')
    if os.path.exists(s): src['sig'] = s
    size = pack(src, os.path.join(out, k + '.glb')); total += size
    print(k, len(src), '段', size // 1024, 'KB')
print('總共', total // 1024, 'KB')
