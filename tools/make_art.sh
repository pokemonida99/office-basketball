#!/bin/zsh
# 真人立繪：work/art/real_角色_動作.png → 去綠背景 → art/角色_動作.webp（有透明、最長邊 900）
cd "$(dirname "$0")/.."
mkdir -p art
for f in work/art/real_*.png; do
  n=${${f:t:r}#real_}
  python3 tools/key_green.py $f work/art/k_$n.png 900 > /dev/null && python3 -c "from PIL import Image; Image.open('work/art/k_$n.png').save('art/$n.webp', quality=82, method=6)" && echo "$n $(( $(stat -f%z art/$n.webp) / 1024 ))KB"
done
