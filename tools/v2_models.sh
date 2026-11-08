#!/bin/bash
# v0.12 新模型：Higgsfield 綁好骨的 GLB → tools/blender/game_model.py 減面 → gltf-transform 壓縮 → models/角色_v2.glb
# 用法：bash tools/v2_models.sh 綁骨資料夾（裡面是 角色/角色_rig.glb） 角色...
SRC=$1; shift
cd "$(dirname "$0")/.."
mkdir -p work/v2
for k in "$@"; do
  /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/game_model.py -- "$SRC/$k/${k}_rig.glb" work/v2/${k}_raw.glb 2>&1 | grep -E "GAME_MODEL|Error"
  gltf-transform resize work/v2/${k}_raw.glb work/v2/${k}_a.glb --width 1024 --height 1024 >/dev/null &&
  gltf-transform webp work/v2/${k}_a.glb work/v2/${k}_b.glb --quality 88 >/dev/null &&
  gltf-transform meshopt work/v2/${k}_b.glb models/${k}_v2.glb >/dev/null && echo "$k -> models/${k}_v2.glb $(( $(stat -f%z models/${k}_v2.glb) / 1024 )) KB"
done
