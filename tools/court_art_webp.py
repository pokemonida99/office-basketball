# -*- coding: utf-8 -*-
# 把 tools/blender/court_art.py 算出來的 PNG 轉成遊戲用的 art/court/*.webp
# 光影圖的亮度壓到 128 附近：遊戲把地板乘上它的兩倍，128＝不變；陽光處約 1.3 倍、影子約 0.9 倍
# 用法：python3 tools/court_art_webp.py PNG資料夾 art/court
import sys, os
from PIL import Image
src, out = sys.argv[1:3]
os.makedirs(out, exist_ok=True)
for n in ('roof_city', 'temple_sky'):
    Image.open(os.path.join(src, n + '.png')).convert('RGB').save(os.path.join(out, n + '.webp'), quality=82, method=6)
for n in ('roof_light', 'temple_light'):
    im = Image.open(os.path.join(src, n + '.png')).convert('RGB').point(lambda v: int(70 + 0.42 * v))
    im.save(os.path.join(out, n + '.webp'), quality=80, method=6)
print({f: os.path.getsize(os.path.join(out, f)) // 1024 for f in os.listdir(out)})
