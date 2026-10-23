#!/bin/zsh
# 大招過場用的立繪（GPT）：每個人一個專屬動作，參考圖是自己的三視圖（造型照三視圖，不自己加東西）
# 背景要純綠色，之後用 tools/key_green.py 去背。用法：zsh tools/gen_art.sh kui jie ...
cd "$(dirname "$0")/.."
CODEX=/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex
STYLE="Dynamic full-body action illustration of the character in the reference image, for a special-move cut-in of a cute 3D basketball mobile game: same cute chibi 3D vinyl-toy look, same face, hairstyle, outfit, colors and shoes exactly as the reference turnaround (do not add accessories or change clothes), high quality 3D render with soft lighting and a slight rim light, energetic dramatic pose filling a tall portrait frame, the whole body visible from head to shoes, the body and face facing the viewer or three-quarter front (no looking back over the shoulder, no twisted neck), a standard orange basketball where described. Solid pure bright green background (#00FF00) with no shadow, no floor, no gradient, no text, no speed lines on the background, so it can be cut out. Pose: "
typeset -A POSE REF
REF[kui]=../office-apocalypse/design/d_kui.png;  POSE[kui]="dashing forward at full speed, leaning into the run, dribbling the basketball low with her right hand while holding a takeaway coffee cup high in her left hand, small coffee steam swirl, determined happy face."
REF[jie]=../office-apocalypse/design/d_jie.png;  POSE[jie]="flying high in the air for a slam dunk, right arm stretched up high gripping the basketball over his head, left arm out for balance, knees tucked, a few blue blueprint sheets fluttering around him, intense focused face."
REF[mi]=../office-apocalypse/design/d_mi.png;    POSE[mi]="standing firmly with feet apart, left hand pressing the headset microphone close to her mouth, right arm stretched forward pointing straight at the viewer, three small cartoon ringing telephone icons with motion marks floating around her, cool confident smile."
REF[vivi]=../office-apocalypse/design/d_vivi.png; POSE[vivi]="boss power pose: left hand on her hip, right index finger pointing up to the sky giving an order, chin up, proud bright smile, golden sparkles and a small golden crown icon floating above her head."
REF[kevin]=../office-apocalypse/design/d_kevin.png; POSE[kevin]="smug pose: giving a big thumbs-up with his right hand toward the viewer while spinning the basketball on the index finger of his raised left hand, a tiny white quadcopter drone with a glowing blue eye hovering beside his head, confident smirk."
REF[lin]=work/art/sheet_lin.png;  POSE[lin]="low explosive crossover dribble: body crouched low and leaning sideways, the basketball bouncing between her hands in front of her knees, one foot pushing off hard, two faint translucent afterimages of her body trailing behind to show speed, sharp focused eyes."
REF[yuan]=work/art/sheet_yuan.png; POSE[yuan]="powerful vertical jump to block a shot: both arms stretched high above her head with open palms swatting the basketball away, knees bent in the air, hair flying up, fierce confident shout, small white impact burst at her hands."
REF[hu]=work/art/sheet_hu.png;    POSE[hu]="graceful fadeaway jump shot: jumping and leaning backward, both arms extended up releasing the basketball from her fingertips, one knee raised, high ponytail and pom-pom earrings swinging, playful confident wink."
gen() {
  local n=$1
  $CODEX exec --skip-git-repo-check "Generate one image with your image generation tool, portrait 2:3: $STYLE${POSE[$n]} Do not run any shell commands." -i ${REF[$n]} < /dev/null > work/art/art-$n.log 2>&1
  local sid=$(grep -m1 'session id:' work/art/art-$n.log | awk '{print $3}')
  local f=$(ls -t ~/.codex/generated_images/$sid/*.png 2>/dev/null | head -1)
  [ -n "$f" ] && cp "$f" work/art/art_$n.png && echo "$n ok" || echo "$n 失敗"
}
(( $# )) || set -- kui jie mi vivi kevin
for n in "$@"; do gen $n & sleep 10; done
wait
