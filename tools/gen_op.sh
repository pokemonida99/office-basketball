#!/bin/zsh
# 開場 OP 的真人風劇照（橫式 3:2）：用使用者給的照片當人物參考（~/Downloads/人物集、香香三人照片），GPT 畫電影劇照
# 圖上不放任何文字，字幕、聯名 logo 由程式疊上去。用法：zsh tools/gen_op.sh [op1 op4 ...]
cd "$(dirname "$0")/.."
CODEX=/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex
P=~/Downloads/人物集; X=work/ref/xiangxiang
typeset -A PHOTO
PHOTO[jie]=$P/01阿傑.jpeg; PHOTO[mi]=$P/02小米.jpg; PHOTO[vivi]=$P/03VIVI老闆.jpeg; PHOTO[kui]=$P/04小葵.jpg; PHOTO[kevin]=$P/05Kevin特助.jpg
PHOTO[lin]=$X/1.jpg; PHOTO[yuan]=$X/2.jpg; PHOTO[hu]=$X/3.jpg
S=work/ref/shanding; PHOTO[tu]=$S/tu_photo.jpg; PHOTO[zhang]=$S/zhang_photo.jpg; PHOTO[bian]=$S/bian_ref.jpg
typeset -A LOOK
LOOK[jie]="阿傑 (man): long curly brown hair, round thin gold glasses, short beard, black turtleneck sweater, dark blue jeans, black leather shoes"
LOOK[mi]="小米 (woman): black chin-length bob with blunt bangs, black call-center headset with boom mic, light blue shirt with navy striped bow, gray cardigan jacket with navy trim, navy pencil skirt"
LOOK[vivi]="Vivi the boss (woman): long straight light blonde hair with bangs, pink tailored blazer, light pink blouse buttoned up to the collar, pink pencil skirt, champagne-gold heels"
LOOK[kui]="小葵 (young woman intern): short light-brown bob, brown wool beret, round thin glasses, cream chunky knit sweater, navy floral mini skirt, brown ankle boots"
LOOK[kevin]="Kevin (man): short black hair, white wireless earbuds, gray blazer over a black turtleneck, black slacks"
LOOK[lin]="林語彤 (young woman): short black layered bob with bangs, oversized dark green T-shirt with red trim, baggy denim shorts, white-and-green high-top sneakers"
LOOK[yuan]="元小雨 (tall young woman): long straight dark brown hair with bangs, white basketball jersey with navy trim and the character 元 on the chest, white shorts, a mandala tattoo on her RIGHT upper arm only (when she faces the camera it is on the viewer's LEFT side of the picture; her left arm has no tattoo), white socks, pink sneakers"
LOOK[hu]="胡姬 (young woman): pink-auburn high ponytail with bangs, big pink pompom earrings, light blue off-shoulder sweatshirt with white stripes, gray shorts, white socks, pink-and-white sneakers"
STYLE="Photorealistic cinematic live-action film still from a Taiwanese office comedy sports movie, shot on 35mm anamorphic, natural light, rich color grade, shallow depth of field, landscape 3:2. Absolutely no text, no captions, no logos, no watermarks, no readable writing anywhere in the image. Every person faces the camera or is seen from the side or three-quarter front; nobody looks back over their shoulder. Keep each person's face, hairstyle, glasses, accessories and outfit exactly as in the reference photos. Scene: "
LOOK[tu]="兔兔老師 (young woman teacher): wavy shoulder-length brown hair with bangs, white and pink plush bunny-ear headband, pearl necklace, white lace lolita dress with puffy sleeves, pink ribbons and bows, layered white tulle knee-length skirt with pink butterfly appliques, white Mary-Jane flats"
LOOK[zhang]="the principal (middle-aged man): short black hair, thin metal-rimmed glasses, red polo shirt with white and purple stripe panels and a small white heart-hand logo, black belt, charcoal slacks, black leather shoes"
LOOK[bian]="小編 (man whose head is fully covered by a brown paper bag with black sunglasses and one black Chinese character 編 on it, no face visible): gray-blue plaid short-sleeve shirt, khaki shorts, white clog sandals"
typeset -A SHOT CAST
SHOT[op1]="Close-up of a cluttered desk in a modern Taipei open-plan office one minute before lunch: a keyboard, a takeaway coffee cup, a tall messy stack of blank white A4 paper, a desk plant; a round white wall clock in soft focus behind with the hands at 11:59; tired office workers blurred in the background staring at monitors. Warm, slightly dull office light."; CAST[op1]=""
SHOT[op2]="Noon in the open-plan office: the intern jumps up from her office chair hugging an orange basketball, grinning with excitement, while the long-haired designer pushes his chair back from his desk and stands up with a cool half-smile, both facing the camera. Monitors and A4 papers on the desks, sunlight through the windows."; CAST[op2]="kui jie"
SHOT[op3]="In the office aisle at noon: the call-center girl pulls her headset off her head with a smile, the blonde boss in the pink blazer points forward like a general giving an order, and Kevin snaps his laptop shut with a confident smirk. Medium shot, all three facing the camera."; CAST[op3]="mi vivi kevin"
SHOT[op4]="A heavy metal stairwell door bursts open onto a sunny office-building rooftop and five office workers stride out side by side toward the camera in a heroic low-angle slow-motion walk, Kevin spinning an orange basketball on one finger, the blonde boss in front center. Bright noon sun, lens flare, blue sky, city buildings behind."; CAST[op4]="jie mi vivi kui kevin"
SHOT[op5]="A rooftop outdoor half basketball court high above Taipei at noon with Taipei 101 far in the background: three young women basketball players wait for their opponents near the hoop: the tall one in the white 元 jersey spins a basketball on her finger, the short-haired one in the green T-shirt stands with arms crossed and a cool stare, the ponytail girl in the light blue sweatshirt waves cheerfully. Wide shot, all facing the camera."; CAST[op5]="yuan lin hu"
SHOT[op6]="Tense face-off at the center of a rooftop basketball court: the long-haired designer with glasses and the tall woman in the white 元 jersey stand nose to nose, seen in side profile facing each other, she holds the basketball against her hip, dramatic noon backlight, sweat, city skyline blurred behind. Tight two-shot."; CAST[op6]="jie yuan"
SHOT[op7]="Action shot on a rooftop basketball court: the short-haired girl in the green T-shirt does a lightning-fast low crossover dribble past the intern in the beret, who stumbles off balance with a shocked face; motion blur on the ball and the hair, low camera angle, noon sun."; CAST[op7]="lin kui"
SHOT[op8]="Action shot on a rooftop basketball court: the ponytail girl in the light blue sweatshirt rises for a fadeaway jump shot, ball leaving her fingertips, while Kevin in the gray blazer jumps with his arm stretched to block and just misses; both seen from the side, frozen mid-air, dramatic low angle against blue sky."; CAST[op8]="hu kevin"
SHOT[op9]="Epic three-versus-three face-off group shot on a rooftop basketball court, Taipei skyline behind: three office women in office clothes stand on the left (the call-center girl, the blonde boss, the intern in the beret) and three young basketball women stand on the right (the tall one in the white jersey, the short-haired one in the green T-shirt, the ponytail girl), the two teams facing the camera in confident poses with arms crossed or hands on hips, an orange basketball on the court between them. Only these six women, no men. Wide, symmetrical, low angle, everyone's full body visible."; CAST[op9]="mi vivi kui yuan lin hu"
# 直式開場（手機直拿）：三張隊伍照，一隊一張，直式 2:3
VSTYLE="Photorealistic cinematic live-action poster still from a Taiwanese office comedy sports movie, shot on 35mm, natural light, rich color grade, PORTRAIT orientation 2:3. Absolutely no text, no captions, no logos, no watermarks, no readable writing anywhere in the image (except the single character on the paper bag if that person is present). Every person faces the camera; nobody looks back over their shoulder. Keep each person's face, hairstyle, glasses, accessories and outfit exactly as in the reference photos. Composition: the three people stand side by side shoulder to shoulder in the middle of the frame, full body visible from head to shoes with a little space above the heads, all faces clearly visible in a horizontal row at about one third from the top. Scene: "
SHOT[t1]="Low-angle heroic team photo on a sunny office-building rooftop basketball court at the end of the work day, Taipei 101 and city skyline behind, golden late-afternoon light: the three office women pose confidently with arms crossed or hands on hips, the blonde boss in the middle holding an orange basketball against her hip."; CAST[t1]="mi vivi kui"
SHOT[t2]="Low-angle heroic team photo on a rooftop outdoor basketball court in Taipei, blue sky, Taipei 101 in the background: three young women basketball players pose confidently, the tall one in the white 元 jersey in the middle spinning a basketball on one finger, the short-haired one in the green T-shirt with arms crossed, the ponytail girl making a cheerful peace sign."; CAST[t2]="lin yuan hu"
SHOT[t3]="Low-angle heroic team photo on a Taiwanese temple-front outdoor basketball court (green concrete court, red painted key, a small red temple with swallowtail roof and red lanterns behind), warm dusk light: the bunny-ear teacher in the white lace dress on the left holding a basketball, the principal in the red polo shirt in the middle giving a proud thumbs up, the man with the paper bag on his head on the right with his hands on his hips."; CAST[t3]="tu zhang bian"
gen() {
  local s=$1 refs=() desc=""
  for c in ${=CAST[$s]}; do refs+=(-i ${PHOTO[$c]}); desc+=" ${LOOK[$c]}."; done
  [ -n "$desc" ] && desc=" People (in reference image order):$desc"
  local st="landscape 3:2: $STYLE"; [[ $s == t* ]] && st="portrait 2:3: $VSTYLE"
  $CODEX exec --skip-git-repo-check "Generate one image with your image generation tool, $st${SHOT[$s]}$desc Do not run any shell commands." $refs < /dev/null > work/op/$s.log 2>&1
  local sid=$(grep -m1 'session id:' work/op/$s.log | awk '{print $3}')
  local f=$(ls -t ~/.codex/generated_images/$sid/*.png 2>/dev/null | head -1)
  [ -n "$f" ] && cp "$f" work/op/$s.png && echo "$s ok" || { echo "$s 失敗"; tail -3 work/op/$s.log; }
}
mkdir -p work/op
(( $# )) || set -- op1 op2 op3 op4 op5 op6 op7 op8 op9
i=0
for s in "$@"; do
  [ -f work/op/$s.png ] && continue
  gen $s & sleep 8; (( ++i % 4 == 0 )) && wait
done
wait
