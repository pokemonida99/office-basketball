// 從綁好動作的 GLB 只留下動畫（拿掉模型、貼圖），給遊戲裡現有的角色套用
// Hips 的位移照走路模型的骨架大小縮放，水平位移拿掉（位置由遊戲程式控制）
// 用法：node tools/strip_anim.cjs 輸入.glb 輸出.glb 走路模型的Hips高 [走路Hips_x 走路Hips_z] [flat]
// flat：拿掉 Hips 位移整條（跳躍、閃身這類多人共用的動作；高度交給遊戲物理，各角色保留自己的臀部高度）
const D = process.env.GLTF_NM || require('path').join(require('os').homedir(), '.npm/_npx/e1525e0134341f0c/node_modules');
const { NodeIO } = require(D + '/@gltf-transform/core');
const { prune, resample } = require(D + '/@gltf-transform/functions');
const [src, dst, walkY, walkX = 0, walkZ = 0, flat] = process.argv.slice(2);
(async () => {
  const io = new NodeIO();
  const doc = await io.read(src);
  const root = doc.getRoot();
  const hips = root.listNodes().find(n => n.getName() === 'Hips');
  const ratio = +walkY / hips.getTranslation()[1];
  for (const anim of root.listAnimations()) {
    for (const ch of anim.listChannels()) {
      if (ch.getTargetNode() !== hips || ch.getTargetPath() !== 'translation') continue;
      if (flat) { ch.dispose(); continue; }
      const out = ch.getSampler().getOutput(), a = out.getArray().slice();
      for (let i = 0; i < a.length; i += 3) { a[i] = +walkX; a[i + 1] *= ratio; a[i + 2] = +walkZ; }
      out.setArray(a);
    }
  }
  for (const n of root.listNodes()) { if (n.getMesh()) n.setMesh(null); if (n.getSkin()) n.setSkin(null); }
  for (const s of root.listSkins()) s.dispose();
  for (const m of root.listMeshes()) m.dispose();
  await doc.transform(prune(), resample());
  await io.write(dst, doc);
  const fs = require('fs');
  console.log(dst, (fs.statSync(dst).size / 1024).toFixed(0) + 'KB', 'ratio', ratio.toFixed(3), root.listAnimations().map(a => a.getName() + ' ' + a.listChannels().length));
})();
