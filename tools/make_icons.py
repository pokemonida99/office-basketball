# 主畫面圖示：用遊戲裡的真人風立繪（work/art/real_*.png）合成，外圈金屬框＋右下角籃球徽章
# 用法：python3 tools/make_icons.py [kui jie lin yuan]　→ icons/<key>-512/192/180.png（1024 大圖放 work/icons/）
# 原則：不另外用 GPT 畫圖示，直接裁專案立繪（臉跟遊戲裡一致）
import sys, math, subprocess, os
from PIL import Image, ImageDraw, ImageFilter, ImageChops

S = 1024
SRC = {   # 來源立繪、裁切框（去背後的圖座標，頭頂＝0：中心 x、上緣 y、邊長）、底色
  'kui': ('real_kui_steal', (465, -60, 560), ((255, 196, 120), (232, 112, 52))),
  'jie': ('real_jie_steal', (475, -40, 640), ((178, 140, 255), (88, 52, 186))),
  'lin': ('real_lin_steal', (475, -60, 560), ((120, 214, 160), (20, 110, 72))),
  'yuan': ('real_yuan_steal', (540, -50, 600), ((140, 168, 255), (36, 56, 150))),
}
TMP = 'work/icons'

def keyed(name):
  out = f'{TMP}/{name}_key.png'
  if not os.path.exists(out):
    subprocess.run(['python3', 'tools/key_green.py', f'work/art/{name}.png', out, '1536'], check=True, capture_output=True)
  return Image.open(out).convert('RGBA')

def background(c0, c1):
  bg = Image.new('RGB', (S, S), c1); px = bg.load()
  for y in range(S):
    for x in range(S):
      d = min(1, math.hypot(x - S * 0.5, y - S * 0.38) / (S * 0.75))
      px[x, y] = tuple(int(c0[i] + (c1[i] - c0[i]) * d) for i in range(3))
  # 斜向集中線（運動感）
  ln = Image.new('L', (S, S), 0); d = ImageDraw.Draw(ln)
  for i in range(28):
    a = i / 28 * math.tau; r = S
    d.polygon([(S / 2, S * 0.38), (S / 2 + math.cos(a) * r, S * 0.38 + math.sin(a) * r), (S / 2 + math.cos(a + 0.05) * r, S * 0.38 + math.sin(a + 0.05) * r)], fill=38)
  bg.paste((255, 255, 255), (0, 0), ln)
  return bg.convert('RGBA')

def ball(r):
  im = Image.new('RGBA', (r * 2 + 8, r * 2 + 8), (0, 0, 0, 0)); d = ImageDraw.Draw(im); c = r + 4
  d.ellipse([c - r - 3, c - r - 3, c + r + 3, c + r + 3], fill=(40, 20, 8, 255))   # 黑邊
  for i in range(r, 0, -1):   # 由外往內，越裡面越亮
    t = i / r; col = (int(255 - 70 * t), int(150 - 70 * t), int(70 - 50 * t), 255)
    d.ellipse([c - i - 0.18 * r * (1 - t), c - i - 0.22 * r * (1 - t), c + i - 0.18 * r * (1 - t), c + i - 0.22 * r * (1 - t)], fill=col)
  w = max(3, r // 11)
  d.line([(c - r, c), (c + r, c)], fill=(40, 20, 8, 255), width=w)
  d.line([(c, c - r), (c, c + r)], fill=(40, 20, 8, 255), width=w)
  d.arc([c - r * 1.55, c - r, c - r * 0.45, c + r], -60, 60, fill=(40, 20, 8, 255), width=w)
  d.arc([c + r * 0.45, c - r, c + r * 1.55, c + r], 120, 240, fill=(40, 20, 8, 255), width=w)
  mask = Image.new('L', im.size, 0); ImageDraw.Draw(mask).ellipse([c - r - 3, c - r - 3, c + r + 3, c + r + 3], fill=255)
  im.putalpha(ImageChops.multiply(im.getchannel('A'), mask))
  return im

def frame(img):
  # 金色金屬框：整圈外框（填滿到邊，iPhone 會自己切圓角）＋內緣圓角開口、深線、亮線、往內陰影
  W = 58; R = 150
  hole = Image.new('L', (S, S), 0); ImageDraw.Draw(hole).rounded_rectangle([W, W, S - W, S - W], R, fill=255)
  gold = Image.new('RGBA', (S, S)); g = gold.load()
  for y in range(S):
    for x in range(S):
      t = (x + y) / (2 * S); v = 0.5 + 0.5 * math.sin(t * math.tau * 2.2 + 0.6)
      g[x, y] = (int(176 + 70 * v), int(128 + 80 * v), int(40 + 60 * v), 255)
  shade = img.copy()
  sh = Image.new('L', (S, S), 0); ImageDraw.Draw(sh).rounded_rectangle([W - 6, W - 6, S - W + 6, S - W + 6], R + 6, outline=200, width=26)
  sh = sh.filter(ImageFilter.GaussianBlur(14)); sh = ImageChops.multiply(sh, hole)
  shade.paste((0, 0, 0), (0, 0), sh.point(lambda v: v * 0.55))
  out = Image.composite(shade, gold, hole)
  d = ImageDraw.Draw(out)
  d.rounded_rectangle([W - 2, W - 2, S - W + 2, S - W + 2], R + 2, outline=(70, 42, 8, 255), width=7)   # 內緣深線
  d.rounded_rectangle([W - 14, W - 14, S - W + 14, S - W + 14], R + 14, outline=(255, 240, 190, 255), width=4)   # 中間亮線
  d.rectangle([3, 3, S - 4, S - 4], outline=(110, 72, 18, 255), width=6)   # 最外緣
  return out

def make(key):
  name, (cx, top, side), (c0, c1) = SRC[key]
  art = keyed(name)
  box = [int(cx - side / 2), int(top), int(cx + side / 2), int(top + side)]   # key_green 去背後會裁到人的範圍，所以頭頂就是 y＝0
  crop = art.crop(box).resize((S, S), Image.LANCZOS)
  img = background(c0, c1)
  shadow = Image.new('RGBA', (S, S), (0, 0, 0, 0)); shadow.putalpha(crop.getchannel('A').point(lambda v: v * 0.45))
  img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(16)), (10, 18))
  img.alpha_composite(crop)
  img = frame(img)
  b = ball(104); img.alpha_composite(b, (S - b.width - 34, S - b.height - 34))
  os.makedirs('icons', exist_ok=True)
  flat = img.convert('RGB')
  flat.save(f'{TMP}/{key}-1024.png')   # 大圖留在 work/（宣傳用），網站只放用得到的尺寸
  for n in (512, 192, 180):
    flat.resize((n, n), Image.LANCZOS).save(f'icons/{key}-{n}.png', optimize=True)
  print(key, 'ok')

os.makedirs(TMP, exist_ok=True)
for k in (sys.argv[1:] or list(SRC)): make(k)
