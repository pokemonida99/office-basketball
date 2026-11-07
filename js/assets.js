// 角色模型：載入、量步伐、複製成會走路的角色
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// 模型都用 gltf-transform 壓過（meshopt＋webp 貼圖），要配解碼器
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

// 載入一個角色：縮成 1 單位高、腳踩地，順便量出不滑步的速度
// 模型都要先轉正（臉朝 +z）再綁原地走路動作（見 tools/face_front.py）
// clipUrl：走路動作改用另外的動畫檔（阿傑的 Blender 動作）
export async function loadKind(url, clipUrl = null) {
  const g = await loader.loadAsync(url);
  g.scene.updateMatrixWorld(true);   // 先更新矩陣，不然骨架節點的縮放沒算進去，高度會量錯
  const box = new THREE.Box3().setFromObject(g.scene), size = box.getSize(new THREE.Vector3());
  const s = 1 / size.y;
  const base = new THREE.Group(); base.add(g.scene);
  g.scene.scale.multiplyScalar(s);
  g.scene.position.set(-(box.min.x + size.x / 2) * s, -box.min.y * s, -(box.min.z + size.z / 2) * s);
  const clip = clipUrl ? await loadOwnClip(clipUrl) : g.animations[0] || null;
  // 記下站姿（綁骨架時的 A 字站姿），量完步伐要還原；停下來時動畫權重降到 0 就會回到這個站姿
  const rest = [];
  base.traverse(o => { if (o.isBone) rest.push([o, o.position.clone(), o.quaternion.clone(), o.scale.clone()]); });
  const natural = clip ? measureNatural(base, clip) : 0.25;
  const lean = clip ? measureLean(base, clip) : 0;
  const headPitch = clip ? fixHead(base, clip) : 0;
  for (const [b, p, q, sc] of rest) { b.position.copy(p); b.quaternion.copy(q); b.scale.copy(sc); }
  return { base, clip, natural, lean, headPitch, rest };
}

// 動畫平均往前傾幾度（臀部→頭）。成人跑步動作套在大頭 Q 版身上會像在鞠躬，要用 leanFix 扶正
function measureLean(base, clip) {
  const mixer = new THREE.AnimationMixer(base), a = mixer.clipAction(clip).play();
  let hips, head; base.traverse(o => { if (o.isBone && o.name === 'Hips') hips = o; if (o.isBone && o.name === 'Head') head = o; });
  if (!hips || !head) return 0;
  const hp = new THREE.Vector3(), hd = new THREE.Vector3(); let sum = 0; const N = 24;
  for (let i = 0; i < N; i++) {
    a.time = clip.duration * i / N; mixer.update(0); base.updateMatrixWorld(true);
    hips.getWorldPosition(hp); head.getWorldPosition(hd); sum += Math.atan2(hd.z - hp.z, hd.y - hp.y);   // 臉朝 +z
  }
  a.stop(); mixer.uncacheRoot(base);
  return sum / N;
}

// 走路動作會低頭約 13°：載入時量整段動畫臉的平均俯仰，往下的部分直接改進 Head 的關鍵格（繞頭骨本地 X）。
// 不要每幀畫完再 rotateX：動畫值沒變時 three 不會重寫骨頭，角度會一直疊上去、頭會閃
function fixHead(base, clip) {
  let head, front; base.traverse(o => { if (o.name === 'Head') head = o; if (o.name === 'headfront') front = o; });
  const track = clip.tracks.find(t => t.name === 'Head.quaternion');
  if (!head || !front || !track) return 0;
  const pitch = () => {
    const mixer = new THREE.AnimationMixer(base), a = mixer.clipAction(clip).play(); let sum = 0; const N = 24;
    for (let i = 0; i < N; i++) {
      a.time = clip.duration * i / N; mixer.update(0); base.updateMatrixWorld(true);
      head.getWorldPosition(_hp); front.getWorldPosition(_fp);
      sum += Math.atan2(_fp.y - _hp.y, Math.hypot(_fp.x - _hp.x, _fp.z - _hp.z));
    }
    a.stop(); mixer.uncacheRoot(base); return sum / N;
  };
  const p = pitch();
  if (p > -0.02) return p;
  _q.setFromAxisAngle(_ax.set(1, 0, 0), p);   // 跟 head.rotateX(p) 一樣：本地座標右乘
  const v = track.values;
  for (let i = 0; i < v.length; i += 4) { _pq.fromArray(v, i).multiply(_q).toArray(v, i); }
  return pitch();
}

// 只載動畫（tools/strip_anim.cjs 做出來的檔），套到同一套骨架的角色上
export async function loadClip(url) { const g = await loader.loadAsync(url); return g.animations[0] || null; }
// 角色專屬動作：只留骨頭轉動和臀部位移，其他骨頭的長度維持角色自己的（不會被動作檔拉長）
export async function loadOwnClip(url) {
  const clip = await loadClip(url);
  if (clip) clip.tracks = clip.tracks.filter(t => t.name.endsWith('.quaternion') || t.name === 'Hips.position');
  return clip;
}
// 一個角色的整包動作（models/moves/pack/角色.glb，tools/pack_clips.py 打包）：回傳 { 動作名: clip }，只留骨頭轉動和臀部位移
export async function loadPack(url) {
  const g = await loader.loadAsync(url), out = {};
  for (const c of g.animations) { c.tracks = c.tracks.filter(t => t.name.endsWith('.quaternion') || t.name === 'Hips.position'); out[c.name] = c; }
  return out;
}
// 角色自己的跑步：用他的身體量不滑步的速度
export function runOf(kind, clip) {
  const natural = measureNatural(kind.base, clip);
  for (const [b, p, q, sc] of kind.rest) { b.position.copy(p); b.quaternion.copy(q); b.scale.copy(sc); }
  return { clip, natural };
}
// 灌籃掛框那一格，右手在身體的哪裡（身高 1、臉朝 +z）。每個人手長不同，遊戲用這個算要跳多高、站哪裡，手才碰得到籃框
export function dunkFit(kind, clip, t) {
  const mixer = new THREE.AnimationMixer(kind.base), a = mixer.clipAction(clip).play();
  a.time = t; mixer.update(0); kind.base.updateMatrixWorld(true);
  let hand; kind.base.traverse(o => { if (o.isBone && o.name === 'RightHand') hand = o; });
  const p = hand.getWorldPosition(new THREE.Vector3());
  a.stop(); mixer.uncacheRoot(kind.base);
  for (const [b, q, r, sc] of kind.rest) { b.position.copy(q); b.quaternion.copy(r); b.scale.copy(sc); }
  return p;
}
// 掛上跑步動作，之後依速度跟走路混合
export function addJog(a, jogKind) {
  a.jog = a.mixer.clipAction(jogKind.clip).play(); a.jog.setEffectiveWeight(0);
  a.jogNatural = jogKind.natural;
  return a;
}
const _q = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _ax = new THREE.Vector3(), _hp = new THREE.Vector3(), _fp = new THREE.Vector3();

// 走路動畫原速時，貼地那隻腳往後移的速度（每秒幾個身高）。播放速度＝實際移動速度 ÷ 這個值，腳就會踩實
function measureNatural(base, clip) {
  const mixer = new THREE.AnimationMixer(base), a = mixer.clipAction(clip).play();
  let foot, hips; base.traverse(o => { if (o.isBone && o.name === 'LeftFoot') foot = o; if (o.isBone && o.name === 'Hips') hips = o; });
  if (!foot || !hips) return 0.25;
  const N = 240, p = new THREE.Vector3(), h = new THREE.Vector3(), zs = [], ys = [];
  for (let i = 0; i <= N; i++) {
    a.time = clip.duration * i / N; mixer.update(0); base.updateMatrixWorld(true);
    foot.getWorldPosition(p); hips.getWorldPosition(h); zs.push(p.z - h.z); ys.push(p.y);
  }
  a.stop(); mixer.uncacheRoot(base);
  const ymin = Math.min(...ys), sp = [];
  for (let i = 1; i <= N; i++) if (ys[i] < ymin + 0.01 && ys[i - 1] < ymin + 0.01) sp.push(Math.abs(zs[i] - zs[i - 1]) / (clip.duration / N));
  sp.sort((x, y) => x - y);
  return sp.length ? sp[sp.length >> 1] : 0.25;
}

// 卡通上色＋描邊（灌籃高手手遊那種）：材質換成三階光影的 MeshToonMaterial，外面再套一層「往外推、只畫背面」的深色外殼當描邊
// 描邊和本體共用骨架，跟著動畫一起動；寬度照模型高度算（每個模型的原始單位不一樣）
export const TOON = { on: true, outline: 0.009 };
const toonRamp = (() => { const t = new THREE.DataTexture(new Uint8Array([105, 105, 105, 255, 178, 178, 178, 255, 255, 255, 255, 255]), 3, 1); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const toonCache = new Map(), outlineCache = new Map();
function toonOf(m) {
  if (!toonCache.has(m)) toonCache.set(m, new THREE.MeshToonMaterial({ map: m.map, color: m.color, gradientMap: toonRamp, transparent: m.transparent, alphaTest: m.alphaTest, side: m.side, emissive: m.emissive, emissiveMap: m.emissiveMap }));
  return toonCache.get(m);
}
function outlineOf(geo) {
  if (!outlineCache.has(geo)) {
    geo.computeBoundingBox(); const h = geo.boundingBox.max.y - geo.boundingBox.min.y;
    const m = new THREE.MeshBasicMaterial({ color: 0x1c140f, side: THREE.BackSide });
    m.onBeforeCompile = (sh) => {   // 綁骨架前的位置沿法線往外推（normal 是綁定姿勢的法線，跟 transformed 同一個空間）
      sh.uniforms.ow = { value: h * TOON.outline };
      sh.vertexShader = 'uniform float ow;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed += normalize( normal ) * ow;');
    };
    outlineCache.set(geo, m);
  }
  return outlineCache.get(geo);
}
function toonify(model, outline = true) {
  const skinned = []; model.traverse(o => { if (o.isSkinnedMesh) skinned.push(o); });
  for (const o of skinned) {
    o.material = Array.isArray(o.material) ? o.material.map(toonOf) : toonOf(o.material);
    if (!outline) continue;
    const ol = new THREE.SkinnedMesh(o.geometry, outlineOf(o.geometry));
    ol.bind(o.skeleton, o.bindMatrix); ol.frustumCulled = false; ol.castShadow = false; ol.renderOrder = -1;
    o.add(ol);
  }
}

// 複製一個角色。speed 由遊戲每幀設定（每秒幾單位），updateActor 會換算動畫速度
// lite：觀眾用，離鏡頭遠，不畫描邊和陰影（一個人少畫兩倍的三角形）
export function makeActor(kind, scale = 1, { lite = false } = {}) {
  const root = new THREE.Group();
  const model = SkeletonUtils.clone(kind.base);
  model.traverse(o => { if (o.isMesh) { o.castShadow = !lite; o.frustumCulled = false; } });
  if (TOON.on) toonify(model, !lite);
  root.add(model); root.scale.setScalar(scale);
  const mixer = new THREE.AnimationMixer(model);
  const action = kind.clip ? mixer.clipAction(kind.clip).play() : null;
  if (action) action.setEffectiveWeight(0);
  return { root, model, mixer, action, natural: kind.natural, speed: 0, w: 0, phase: Math.random() * 6 };
}

// 走路權重平滑切換：走＝播放走路，停＝回到站姿並輕輕呼吸
export function updateActor(a, dt, t) {
  const moving = a.speed > 0.05;
  a.w += ((moving ? 1 : 0) - a.w) * Math.min(1, dt * 10);
  if (a.action) {
    a.action.setEffectiveWeight(a.w);
    if (moving) a.action.timeScale = a.speed / (a.natural * a.root.scale.x) * (a.animMul ?? 1);
  }
  if (a.jog) {   // 慢走、快跑依速度混合（走路動作快放就像快走，所以很早就換成跑步）
    const k = a.forceJog ?? THREE.MathUtils.clamp((a.speed / a.root.scale.x - 0.7) / 0.7, 0, 1);
    a.jk = (a.jk ?? 0) + (k - (a.jk ?? 0)) * Math.min(1, dt * 8);
    a.action.setEffectiveWeight(a.w * (1 - a.jk)); a.jog.setEffectiveWeight(a.w * a.jk);
    if (moving) a.jog.timeScale = a.speed / (a.jogNatural * a.root.scale.x) * (a.animMul ?? 1);
  }
  if (a.sig) {   // 招牌動作（大招時播一次）：權重 sigW 蓋過走路和小跑步
    a.sigW = (a.sigW ?? 0) + ((a.sigOn ? 1 : 0) - (a.sigW ?? 0)) * Math.min(1, dt * 12);
    a.sig.setEffectiveWeight(a.sigW);
    if (a.action) a.action.setEffectiveWeight(a.action.getEffectiveWeight() * (1 - a.sigW));
    if (a.jog) a.jog.setEffectiveWeight(a.jog.getEffectiveWeight() * (1 - a.sigW));
    if (!a.sigOn && a.sigW < 0.01) { a.sig.stop(); a.sig = null; a.sigW = 0; }
  }
  a.mixer.update(dt);
  a.model.scale.y = 1 + (1 - a.w) * 0.015 * Math.sin(t * 3 + a.phase);
}

// 朝目標走一步；到了回傳 true
export function walkTo(a, x, z, speed, dt) {
  const p = a.root.position, dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz);
  if (d < 0.04) { a.speed = 0; return true; }
  const step = Math.min(d, speed * dt);
  p.x += dx / d * step; p.z += dz / d * step;
  a.speed = step / dt;
  turnTo(a, Math.atan2(dx, dz), dt);
  return false;
}

export function turnTo(a, target, dt) {
  const r = a.root.rotation;
  let d = target - r.y; d = Math.atan2(Math.sin(d), Math.cos(d));
  r.y += d * Math.min(1, dt * 12);
}
