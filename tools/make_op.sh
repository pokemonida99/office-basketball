#!/bin/zsh
# OP 劇照壓成網頁用的 WebP（寬 1600、品質 78）：work/op/opN.png → op/opN.webp
cd "$(dirname "$0")/.."
mkdir -p op
for f in work/op/op*.png; do
  n=${f:t:r}
  python3 -c "
from PIL import Image
im = Image.open('$f').convert('RGB'); w = 1600
im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
im.save('op/$n.webp', 'WEBP', quality=78, method=6)"
  echo "op/$n.webp $(( $(stat -f%z op/$n.webp) / 1024 ))KB"
done
