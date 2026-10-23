#!/bin/zsh
# 遊戲標題字「下班先鬥牛」：GPT 畫火焰字＋籃球，純綠背景，之後 key_green.py 去背 → art/logo.webp
# 用法：zsh tools/gen_logo.sh [編號…]（不同編號＝同一句提示詞多畫幾張挑）
cd "$(dirname "$0")/.."
CODEX=/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex
P="Generate one image with your image generation tool, landscape 16:9: a bold mobile sports game title logo that reads exactly the five Traditional Chinese characters 下班先鬥牛 in one horizontal line (left to right: 下 班 先 鬥 牛; double-check every stroke, especially 鬥 which is the traditional character with the 門-like 鬥 radical, not 斗). Thick heavy italic brush-style lettering with a white inner outline and a thick dark navy outer outline, orange-to-yellow gradient fill, roaring realistic fire flames bursting up from behind and around the letters, a flaming basketball crashing through between 先 and 鬥, small sparks and embers, dynamic slanted composition like an arcade game logo. Solid pure bright green background (#00FF00) with nothing else: no other text, no subtitles, no English, no watermark, no people. Do not run any shell commands."
mkdir -p work/logo
(( $# )) || set -- 1 2
for n in "$@"; do
  { $CODEX exec --skip-git-repo-check "$P" < /dev/null > work/logo/logo$n.log 2>&1
    sid=$(grep -m1 'session id:' work/logo/logo$n.log | awk '{print $3}')
    f=$(ls -t ~/.codex/generated_images/$sid/*.png 2>/dev/null | head -1)
    [ -n "$f" ] && cp "$f" work/logo/logo$n.png && echo "logo$n ok" || echo "logo$n 失敗"; } &
  sleep 6
done
wait
