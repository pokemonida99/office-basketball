# 分享連結的縮圖：GPT 底圖（tools/gen_share.sh → work/share/h.png、v.png）＋遊戲的火焰片名 logo＋製作名義
# 橫式 share/og.jpg 1200×630（og:image，FB／LINE 分享連結用）；直式 share/story.jpg 1080×1920（限動、直式貼文用）
# 用法：python3 tools/make_share.py
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

FONT = '/System/Library/AssetsV2/com_apple_MobileAsset_Font8/86ba2c91f017a3749571a82f2c6d890ac7ffb2fb.asset/AssetData/PingFang.ttc'
INK, PAPER, FIRE, YOLK = (18, 27, 43), (239, 230, 210), (255, 90, 31), (255, 216, 77)
logo = Image.open('work/logo/logo1_key.png').convert('RGBA')

def font(size, w=10): return ImageFont.truetype(FONT, size, index=w)   # 10＝蘋方繁 Semibold

def shadow(im, box, r=18, a=150):
  # 片名後面一團暗影，晚霞很亮時字才跳得出來
  m = Image.new('L', im.size, 0); ImageDraw.Draw(m).ellipse(box, fill=a)
  m = m.filter(ImageFilter.GaussianBlur(r))
  im.paste(Image.new('RGB', im.size, (10, 8, 20)), (0, 0), m)

def put_logo(im, cx, top, w):
  l = logo.resize((w, round(logo.height * w / logo.width)), Image.LANCZOS)
  shadow(im, (cx - w * 0.55, top - l.height * 0.05, cx + w * 0.55, top + l.height * 1.05), r=max(20, w // 18), a=120)
  sh = Image.new('RGBA', l.size, (0, 0, 0, 0)); sh.putalpha(l.getchannel('A').point(lambda v: v * 0.55))
  im.paste((0, 0, 0), (cx - w // 2 + 6, top + 8), sh.filter(ImageFilter.GaussianBlur(6)).getchannel('A'))
  im.paste(l, (cx - w // 2, top), l)
  return top + l.height

def tag(im, x, y, text, size, anchor='mm'):
  # 街頭傳單風的紙條：米白底、墨黑字、火焰橘硬陰影
  d = ImageDraw.Draw(im); f = font(size)
  bx = d.textbbox((0, 0), text, font=f); w, h = bx[2] - bx[0], bx[3] - bx[1]
  px, py = size * 0.55, size * 0.32
  x0 = x - w / 2 - px if anchor[0] == 'm' else x - w - 2 * px if anchor[0] == 'r' else x
  y0 = y - h / 2 - py
  s = round(size * 0.16)
  d.rectangle((x0 + s, y0 + s, x0 + w + 2 * px + s, y0 + h + 2 * py + s), fill=FIRE)
  d.rectangle((x0, y0, x0 + w + 2 * px, y0 + h + 2 * py), fill=PAPER)
  d.text((x0 + px - bx[0], y0 + py - bx[1]), text, font=f, fill=INK)
  return y0 + h + 2 * py + s

def text(im, x, y, s, size, fill=YOLK):
  d = ImageDraw.Draw(im)
  d.text((x, y), s, font=font(size), fill=fill, anchor='mt', stroke_width=max(2, size // 9), stroke_fill=(15, 10, 20))

os.makedirs('share', exist_ok=True)

# 橫式 1200×630：上面晚霞放片名，下面九個人
h = Image.open('work/share/h.png').convert('RGB')
h = h.crop((0, 60, h.width, 60 + round(h.width * 630 / 1200))).resize((1200, 630), Image.LANCZOS)
bot = put_logo(h, 600, 18, 560)
tag(h, 1188, 596, 'a4 不想上班 製作', 26, anchor='rm')
text(h, 600, bot - 4, '上班族 vs 香香籃球隊 vs 山頂國小', 25, fill=(255, 255, 255))
h.save('share/og.jpg', quality=88, optimize=True, progressive=True)

# 直式 1080×1920：底圖是 2:3，左右不裁（裁成 9:16 兩邊的人會被切到），寬度撐滿後把最上面的天空往上拉長補滿高度
src = Image.open('work/share/v.png').convert('RGB').resize((1080, 1620), Image.LANCZOS)
v = Image.new('RGB', (1080, 1920)); v.paste(src, (0, 300))
v.paste(src.crop((0, 0, 1080, 260)).resize((1080, 560), Image.LANCZOS), (0, 0))
seam = Image.new('L', (1080, 1920), 0); ImageDraw.Draw(seam).rectangle((0, 470, 1080, 640), fill=255)
v.paste(v.filter(ImageFilter.GaussianBlur(10)), (0, 0), seam.filter(ImageFilter.GaussianBlur(40)))   # 接縫柔一點
bot = put_logo(v, 540, 70, 960)
y = tag(v, 540, bot + 34, 'a4 不想上班 製作', 44)
text(v, 540, y + 14, '友情參戰　香香籃球隊・山頂國小', 36)
v.save('share/story.jpg', quality=88, optimize=True, progressive=True)
for f in ('share/og.jpg', 'share/story.jpg'): print(f, Image.open(f).size, os.path.getsize(f) // 1024, 'KB')
