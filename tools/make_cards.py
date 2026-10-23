# 選角卡用的上半身特寫：從選角全身照（work/art/real_<人>_card_<人>.png）去背後，裁「頭頂到大約腰／大腿」這段，輸出 4:5
# 用法：python3 tools/make_cards.py [vivi kui ...]　→ art/<人>_card.webp
# CUT：(從人的最上緣往下取幾成高度, 水平中心偏移（相對寬）, 額外放大[, 上面先跳過幾成])；舉手持球的人最上緣是球，跳過一點讓臉靠中間
import sys, os, subprocess
from PIL import Image

CUT = {
  'vivi': (0.46, 0.0, 1.05), 'kui': (0.5, 0.0, 1.0), 'jie': (0.42, 0.0, 1.0), 'mi': (0.56, 0.16, 1.0, 0.13),
  'tu': (0.5, 0.0, 1.0), 'zhang': (0.45, 0.05, 1.0), 'bian': (0.45, 0.02, 1.0),
  'kevin': (0.45, 0.0, 1.0), 'lin': (0.62, 0.0, 1.0), 'yuan': (0.6, 0.1, 1.0, 0.16), 'hu': (0.5, 0.13, 1.55),
}
W, H = 640, 800

def make(k):
  src, key = f'work/art/real_{k}_card_{k}.png', f'work/art/k_{k}_card_full.png'
  if not os.path.exists(key):
    subprocess.run(['python3', 'tools/key_green.py', src, key, '1536'], check=True, capture_output=True)
  im = Image.open(key).convert('RGBA')   # key_green 已經裁到人的範圍
  frac, dx, zoom, skip = (*CUT[k], 0)[:4]
  y0 = int(im.height * skip); h = int(im.height * frac) - y0
  part = im.crop((0, y0, im.width, y0 + h))
  bb = part.getbbox() or (0, 0, im.width, h)
  # 以內容為準，補成 4:5（寬：高），左右置中、上面留一點空
  cw, ch = bb[2] - bb[0], h
  if cw / ch > W / H: ch = int(cw * H / W)
  else: cw = int(ch * W / H)
  cw, ch = int(cw / zoom), int(ch / zoom)
  cx = (bb[0] + bb[2]) / 2 + dx * im.width
  top = y0 - int(ch * 0.04) * (0 if skip else 1)
  box = (int(cx - cw / 2), top, int(cx + cw / 2), top + ch)
  out = Image.new('RGBA', (box[2] - box[0], box[3] - box[1]), (0, 0, 0, 0))
  out.alpha_composite(im.crop((max(0, box[0]), max(0, box[1]), min(im.width, box[2]), min(im.height, box[3]))), (max(0, -box[0]), max(0, -box[1])))
  out = out.resize((W, H), Image.LANCZOS)
  out.save(f'art/{k}_card.webp', quality=84, method=6)
  print(k, f'{os.path.getsize(f"art/{k}_card.webp") // 1024}KB')

for k in (sys.argv[1:] or list(CUT)): make(k)
