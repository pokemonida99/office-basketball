#!/bin/zsh
# 全部角色的真人風動作立繪（使用者指定用他給的照片：香香三人的照片、~/Downloads/人物集 的上班族三視圖）
# 每人：灌籃、三分、後仰跳投、抄截，加上大招各一張
# 背景純綠，之後用 tools/key_green.py 去背。用法：zsh tools/gen_real.sh lin:dunk yuan:three ...
cd "$(dirname "$0")/.."
CODEX=/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex
IMG=/private/tmp/claude-502/-Users-hermes-Public-0720/d9f138d0-5c6b-4bbc-80b8-77aabe127f33/images
typeset -A PHOTO
PHOTO[lin]=$IMG/1.jpg; PHOTO[yuan]=$IMG/2.jpg; PHOTO[hu]=$IMG/3.jpg
P=~/Downloads/人物集
PHOTO[jie]=$P/01阿傑.jpeg; PHOTO[mi]=$P/02小米.jpg; PHOTO[vivi]=$P/03VIVI老闆.jpeg; PHOTO[kui]=$P/04小葵.jpg; PHOTO[kevin]=$P/05Kevin特助.jpg
# 造型補充：照片裡沒拍清楚或要統一的地方（Vivi 照主遊戲設定：襯衫扣到領口）
typeset -A EXTRA
EXTRA[jie]="Long curly brown hair, round thin gold glasses, short beard, black turtleneck sweater, dark blue jeans, black leather shoes."
EXTRA[mi]="Black chin-length bob with blunt bangs, black call-center headset with a boom microphone, light blue shirt with a navy striped bow, gray cardigan jacket with navy trim, navy pencil skirt, black low heels."
EXTRA[vivi]="Long straight light blonde hair with bangs, pink tailored blazer, light pink collared blouse buttoned all the way up to the collar (modest office look, no cleavage), pink pencil skirt, champagne-gold heels."
EXTRA[kui]="Short light-brown bob, brown wool beret, round thin glasses, cream chunky knit sweater, navy floral mini skirt, brown ankle boots."
EXTRA[kevin]="Short black hair, white wireless earbuds, gray blazer over a black turtleneck, black slacks, black shoes; no tablet, hands free."
EXTRA[lin]=""; EXTRA[yuan]=""; EXTRA[hu]="" 
STYLE="Photorealistic sports action photo of the same person as in the reference image: keep the face, hairstyle, hair color, glasses, accessories, outfit, socks and shoes exactly as in the reference (this is a basketball player character for a mobile game cut-in). Dynamic, energetic, tasteful sporty pose, whole body visible from head to shoes inside a tall portrait frame, body and face facing the camera or three-quarter front (no looking back over the shoulder), crisp studio sports lighting with a slight rim light, a standard orange basketball. Solid pure bright green background (#00FF00) with no floor, no shadow, no gradient, no text, no logos. Action: "
typeset -A ACT
ACT[dunk]="leaping high for a one-handed slam dunk, right arm stretched up high holding the basketball above her head, left arm out for balance, knees bent in the air, determined face."
ACT[three]="shooting a three-pointer: jumping straight up with perfect shooting form, both arms raised, the ball just leaving her right fingertips high above her head, eyes focused forward."
ACT[fade]="fadeaway jump shot: jumping and leaning backward away from the camera's right side, both arms extended up releasing the ball, one knee raised, hair swinging, confident face."
ACT[steal]="stealing the ball: lunging forward low and fast, right arm reaching out to snatch the basketball, left arm back, sharp quick eyes, a dynamic low stance."
ACT[cross]="low explosive crossover dribble: crouched low and leaning sideways, the basketball bouncing between her hands in front of her knees, one foot pushing off hard, focused cool eyes."
ACT[coffee]="dashing forward at full speed, leaning into the run, dribbling the basketball low with her right hand while holding a takeaway coffee cup high in her left hand, determined happy face."
ACT[phone]="standing firmly with feet apart, left hand pressing her headset microphone close to her mouth, right arm stretched straight toward the camera pointing, cool confident smile."
ACT[boss]="boss power pose: left hand on her hip, right index finger pointing up to the sky giving an order, chin up, proud bright smile."
ACT[ai]="smug pose: giving a big thumbs-up toward the camera with his right hand while spinning the basketball on the index finger of his raised left hand, a tiny white quadcopter drone with a glowing blue light hovering beside his head, confident smirk."
ACT[block]="powerful vertical jump to block a shot: both arms stretched high above her head with open palms swatting the basketball away, knees bent in the air, hair flying up, fierce confident face."
# 選角卡：每個人一個帥氣站姿（各不相同，不要整批同一句），全身入鏡
ACT[card_vivi]="boss runway pose showing off her shoes: one leg stepped forward with the champagne-gold high heel pointed toward the camera, hip popped, spinning the basketball on the tip of her raised right index finger, left hand on her hip, chin up with a glamorous confident smile."
ACT[card_kui]="cheerful mid-stride walk toward the camera: holding a takeaway coffee cup raised high in her right hand like a trophy, the basketball tucked under her left arm, big bright grin, one boot lifted mid-step."
ACT[card_jie]="cool center pose: standing tall and relaxed, the basketball held against his hip with his left hand, right index finger pushing up his round glasses, slight smirk, chest out."
ACT[card_mi]="three-point shooter follow-through: just released a jump shot, right arm extended high with the wrist flicked down (goose-neck follow-through), landing on her toes, eyes following the ball out of frame above, headset on, focused confident smile; the basketball high above near the top edge."
ACT[card_kevin]="product-demo pose: left hand in his pocket, right hand presenting the basketball on his open palm toward the camera like unveiling a new gadget, tapping nothing, smug half-smile, slight lean."
ACT[card_lin]="low aggressive crossover: crouched very low in a wide stance, dribbling the basketball between her legs, one hand down near the floor, intense sharp eyes on the camera, hair flicking."
ACT[card_yuan]="dominant center pose: standing tall and powerful, palming the basketball high above her head with her right hand (arm straight up), left fist clenched by her side, the mandala tattoo on her arm clearly visible, fierce calm stare."
ACT[card_hu]="playful trick pose: arms stretched out to both sides at shoulder height, the basketball rolling across her shoulders behind her neck, winking at the camera with a playful open-mouth smile, ponytail swinging."
gen() {
  local n=${1%%:*} a=${1##*:}
  $CODEX exec --skip-git-repo-check "Generate one image with your image generation tool, portrait 2:3: $STYLE${ACT[$a]} ${EXTRA[$n]} Do not run any shell commands." -i ${PHOTO[$n]} < /dev/null > work/art/real-$n-$a.log 2>&1
  local sid=$(grep -m1 'session id:' work/art/real-$n-$a.log | awk '{print $3}')
  local f=$(ls -t ~/.codex/generated_images/$sid/*.png 2>/dev/null | head -1)
  [ -n "$f" ] && cp "$f" work/art/real_${n}_$a.png && echo "$n $a ok" || { echo "$n $a 失敗"; tail -3 work/art/real-$n-$a.log; }
}
(( $# )) || set -- lin:dunk lin:three lin:fade lin:steal lin:cross yuan:dunk yuan:three yuan:fade yuan:steal yuan:block hu:dunk hu:three hu:fade hu:steal \
  kui:dunk kui:three kui:fade kui:steal kui:coffee jie:dunk jie:three jie:fade jie:steal mi:dunk mi:three mi:fade mi:steal mi:phone \
  vivi:dunk vivi:three vivi:fade vivi:steal vivi:boss kevin:dunk kevin:three kevin:fade kevin:steal kevin:ai
# 一次跑 4 張，已經有的跳過
i=0
for j in "$@"; do
  [ -f work/art/real_${j%%:*}_${j##*:}.png ] && continue
  gen $j & sleep 8; (( ++i % 4 == 0 )) && wait
done
wait
