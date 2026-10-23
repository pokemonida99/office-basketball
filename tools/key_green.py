# 立繪去背：GPT 畫在純綠背景上，從四邊往內把「接近綠色」的像素變透明，邊緣去綠色溢色、裁掉多餘空白
# 用法：python3 tools/key_green.py 輸入.png 輸出.png [最長邊像素=900]
import sys
from collections import deque
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
size = int(sys.argv[3]) if len(sys.argv) > 3 else 900
im = Image.open(src).convert('RGBA')
im.thumbnail((size, size))
w, h = im.size
px = im.load()

def greenness(r, g, b):   # 綠色比其他兩色多多少
    return g - max(r, b)

# 從邊框開始往內找相連的綠色背景（角色身上的綠衣服不會被吃掉，除非碰到邊框）
bg = bytearray(w * h)
q = deque()
for x in range(w):
    q.append((x, 0)); q.append((x, h - 1))
for y in range(h):
    q.append((0, y)); q.append((w - 1, y))
while q:
    x, y = q.popleft()
    i = y * w + x
    if bg[i]: continue
    r, g, b, a = px[x, y]
    if greenness(r, g, b) < 60 or g < 120: continue
    bg[i] = 1
    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if 0 <= nx < w and 0 <= ny < h and not bg[ny * w + nx]: q.append((nx, ny))
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if bg[y * w + x] or (g > 150 and greenness(r, g, b) > 80):   # 頭髮縫隙裡被包住的亮綠也拿掉（深綠衣服不會到這麼亮）
            px[x, y] = (r, g, b, 0); bg[y * w + x] = 1; continue
        # 靠近背景的邊緣：半透明＋把綠色壓掉
        near = any(0 <= x + dx < w and 0 <= y + dy < h and bg[(y + dy) * w + x + dx] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        gn = greenness(r, g, b)
        if near and gn > 20:
            px[x, y] = (r, max(r, b), b, 140)
        elif gn > 40:
            px[x, y] = (r, max(r, b) + gn // 3, b, a)
bbox = im.getbbox()
if bbox: im = im.crop(bbox)
im.save(dst, optimize=True)
print(dst, im.size)
