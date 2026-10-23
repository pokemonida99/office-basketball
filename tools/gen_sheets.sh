#!/bin/zsh
# 香香籃球隊三位新隊員的三視圖（GPT）。真人照只裁「沒有臉的服裝那半邊」當造型參考，臉和髮型用文字描述畫成原創公仔
# 畫風參考主遊戲的小米三視圖。用法：zsh tools/gen_sheets.sh [lin yuan hu]
cd "$(dirname "$0")/.."
CODEX=/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex
STYLE="Cute stylized 3D character design turnaround sheet for a casual mobile game, rendered like a soft vinyl toy / clay figure: chibi proportions (big round head about one third of the total height, small rounded body, short limbs, small rounded hands with simple fingers), big friendly glossy eyes, tiny nose, soft matte materials, smooth simple shapes, soft studio lighting, high quality 3D render in a Blender Cycles look, same art style as the first reference image (an existing character of the same game). Show the SAME character three times side by side in one wide 16:9 image: 1) front view, 2) side view facing right, 3) back view. Standing in a relaxed A-pose with arms slightly away from the body and feet slightly apart, hands empty and visible (not in pockets, not covered by sleeves), whole body visible including the shoes, identical scale in every view, plain light gray background with a soft ground shadow, no text, no labels. Head, shoulders, hips and feet face the same direction in each view; no twisted necks. The second reference image shows ONLY the outfit (clothes, socks, shoes): copy the clothing, colors and shoes from it exactly; the face and hairstyle come from the text below and must be an original cute cartoon face, not a real person. Do not add props or accessories that are not described. Character: "
typeset -A DESC
DESC[lin]="Lin Yutong, a quick point guard girl of the Xiangxiang basketball team: dark brown almost black layered shaggy bob (wolf cut) reaching the neck, straight blunt bangs, cool calm expression; oversized dark green crew-neck T-shirt with a red ribbed collar, red sleeve cuffs and two thin red stripes running down each sleeve; loose faded light-blue denim knee-length cargo shorts with a side pocket; white crew socks; dark green and white high-top sneakers."
DESC[yuan]="Yuan Xiaoyu, a strong power forward girl of the Xiangxiang basketball team, a little sturdier and more athletic than the others: long straight dark brown hair past the shoulders with full straight bangs, small gold hoop earrings, confident smile; white mesh basketball tank jersey with navy and white striped V-neck and armhole trim and one large navy Chinese character 元 printed on the chest (this single character on the jersey is part of the costume and is allowed); short white athletic shorts with side slits; a navy tribal sun-pattern tattoo on her right upper arm and a geometric band tattoo around her right forearm; white crew socks; pink and white running sneakers."
DESC[hu]="Hu Ji, a versatile scorer girl of the Xiangxiang basketball team: rose-pink brown hair in a high ponytail tied with a pink scrunchie, wispy see-through bangs, big fluffy pink pom-pom earrings with a pink bead on top, cheerful lively expression; light blue oversized sweatshirt worn slightly off one shoulder with two white stripes down each sleeve (sleeves end at the wrists so the hands show), a thin black tank-top strap visible on the bare shoulder; gray dolphin running shorts with white trim; white crew socks; pink and white high-top sneakers."
gen() {
  local n=$1
  $CODEX exec --skip-git-repo-check "Generate one image with your image generation tool: $STYLE${DESC[$n]} Do not run any shell commands." -i ../office-apocalypse/design/d_mi.png -i work/ref/outfit_$n.jpg < /dev/null > work/art/gen-$n.log 2>&1
  local sid=$(grep -m1 'session id:' work/art/gen-$n.log | awk '{print $3}')
  local f=$(ls -t ~/.codex/generated_images/$sid/*.png 2>/dev/null | head -1)
  [ -n "$f" ] && cp "$f" work/art/sheet_$n.png && echo "$n ok" || echo "$n 失敗"
}
(( $# )) || set -- lin yuan hu
for n in "$@"; do gen $n & sleep 12; done
wait
