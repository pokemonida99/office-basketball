#!/bin/zsh
# OP 劇照壓成網頁用的 WebP（寬 1600、品質 78）：work/op/opN.png → op/opN.webp；直式隊伍照 t1～t3 寬 1080
# 注意 op9（大合照）用的是左右翻過的 work/op/op9_flip.png：GPT 兩次都把元小雨的刺青畫在左手，翻過來才是右手
cd "$(dirname "$0")/.."
mkdir -p op
for f in work/op/op9.png work/op/t[1-3].png; do   # 開場只用到 op9（橫式）和 t1～t3（直式）
  n=${f:t:r}; [ $n = op9 ] && f=work/op/op9_flip.png; [ -f work/op/${n}_fix.png ] && f=work/op/${n}_fix.png
  python3 -c "
from PIL import Image
im = Image.open('$f').convert('RGB'); w = 1080 if im.height > im.width else 1600
im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
im.save('op/$n.webp', 'WEBP', quality=78, method=6)"
  echo "op/$n.webp $(( $(stat -f%z op/$n.webp) / 1024 ))KB"
done
