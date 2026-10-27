#!/bin/zsh
# 分享連結的縮圖（og:image）底圖：GPT 照三張隊伍照（work/op/t1～t3.png）畫九人主視覺，圖上不放字
# 片名 logo、製作名義由 tools/make_share.py 疊上去。用法：zsh tools/gen_share.sh [h v]
cd "$(dirname "$0")/.."
CODEX=/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex
mkdir -p work/share
REFS=(-i work/op/t1.png -i work/op/t2.png -i work/op/t3.png)
WHO="Reference image 1 = the office team (call-center girl with headset and gray jacket, blonde boss in pink suit, intern with beret and round glasses). Reference image 2 = the Xiangxiang basketball team (short-haired girl in dark green T-shirt and baggy denim shorts, tall girl in white 元 jersey with a mandala tattoo on her RIGHT upper arm only, ponytail girl in light blue off-shoulder sweatshirt with pink pompom earrings). Reference image 3 = the Shanding elementary school team (teacher with bunny-ear headband and white lace dress, principal with glasses in red polo shirt, man with a brown paper bag over his head with sunglasses and the character 编). Keep every person's face, hair, glasses, accessories and outfit exactly as in the references."
STYLE="Photorealistic cinematic sports movie poster key art, golden-hour rim light, rich color grade, energetic and fun, shot on 35mm. Absolutely no text, no title, no logos, no watermarks, no readable writing anywhere (except the single character on the paper bag). Every person faces the camera with a confident or playful expression; nobody looks back over their shoulder; all nine faces clearly visible and not overlapping."
typeset -A SHOT
SHOT[h]="LANDSCAPE 3:2. All nine people stand on a rooftop outdoor basketball court with the Taipei skyline and Taipei 101 behind at sunset: the office team on the left, the Xiangxiang team in the middle (the tall girl in the 元 jersey in front spinning a basketball on her finger), the Shanding team on the right. Low camera angle, people visible from head to about the knees, grouped tightly across the lower 62% of the image. The upper 38% of the image is open dramatic sunset sky with nothing in it (space reserved for a title)."
SHOT[v]="PORTRAIT 2:3. All nine people pose in a tall heroic group on a rooftop outdoor basketball court with Taipei 101 behind at sunset, arranged in two tiers: front tier the Xiangxiang team (the tall girl in the 元 jersey in the middle spinning a basketball on her finger) plus the bunny-ear teacher, back tier slightly raised (standing on a low step) the office team on the left and the principal and the paper-bag man on the right. Everyone visible from head to about the waist or knees, filling the lower 65% of the image. The upper 35% is open dramatic sunset sky with nothing in it (space reserved for a title)."
gen() {
  local s=$1
  $CODEX exec --skip-git-repo-check "Generate one image with your image generation tool: $STYLE ${SHOT[$s]} $WHO Do not run any shell commands." $REFS < /dev/null > work/share/$s.log 2>&1
  local sid=$(grep -m1 'session id:' work/share/$s.log | awk '{print $3}')
  local f=$(ls -t ~/.codex/generated_images/$sid/*.png 2>/dev/null | head -1)
  [ -n "$f" ] && cp "$f" work/share/$s.png && echo "$s ok" || { echo "$s 失敗"; tail -3 work/share/$s.log; }
}
(( $# )) || set -- h v
for s in "$@"; do gen $s & sleep 5; done
wait
