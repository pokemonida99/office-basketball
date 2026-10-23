// 畫面基礎：渲染器、暖色燈光、後製（飽和度＋柔光）、鏡頭、常用小工具
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// 畫質：漂亮（柔光後製、2 倍解析度、大陰影）／流暢（直接畫不做後製、1.25 倍解析度、小陰影）
// 偏好存在 localStorage：auto（預設：核心少或記憶體小的手機先用流暢，main.js 開玩後再看幀率調）、high、low
const Q_KEY = 'office-basketball-quality';
const weak = matchMedia('(pointer: coarse)').matches && ((navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3);
export const quality = { pref: 'auto', level: 'high', weak };
try { const v = localStorage.getItem(Q_KEY); if (['auto', 'high', 'low'].includes(v)) quality.pref = v; } catch {}
quality.level = quality.pref === 'auto' ? (weak ? 'low' : 'high') : quality.pref;
export const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, quality.level === 'low' ? 1.25 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;   // 保留飽和度，不像 ACES 會把顏色洗灰
renderer.toneMappingExposure = 1.05;
document.body.prepend(renderer.domElement);

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfe6ff);
// 環境反射只給金屬（不鏽鋼、金邊）用：金屬沒東西可反射會變黑；全場都套又會整片泛白
const envTex = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.fog = new THREE.Fog(0xbfe6ff, 50, 110);

// 暖色主光＋偏藍的天光補光：亮面暖、暗面帶點藍，畫面比較有層次
scene.add(new THREE.HemisphereLight(0xd6ecff, 0xf2c99a, 1.35));
export const sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.radius = 4;
Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 0.5, far: 50 });
sun.position.set(-5, 14, 12); sun.target.position.set(0, 0, 4);
scene.add(sun, sun.target);

export const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.1, 200);

// 後製：柔光（發光的東西會暈開）＋飽和度／對比／暗角
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.35, 0.6, 0.86);
composer.addPass(bloom);
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, sat: { value: 1.22 }, contrast: { value: 1.06 }, vig: { value: 0.28 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float sat, contrast, vig; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.299,0.587,0.114));
      c.rgb = mix(vec3(l), c.rgb, sat);
      c.rgb = (c.rgb - 0.5) * contrast + 0.5;
      float d = distance(vUv, vec2(0.5)); c.rgb *= 1.0 - vig * smoothstep(0.35, 0.85, d);
      gl_FragColor = c; }`,
});
composer.addPass(grade);
composer.addPass(new OutputPass());
export const post = { composer, bloom, grade, on: true };
// 視窗被縮到 0（分頁藏起來、預覽窗格收合）時不要畫，不然 WebGL 會一直報 framebuffer 大小為 0
export function render() { if (!innerWidth || !innerHeight) return; if (post.on) composer.render(); else renderer.render(scene, camera); }
export function setQuality(level) {
  quality.level = level; const low = level === 'low';
  renderer.setPixelRatio(Math.min(devicePixelRatio, low ? 1.25 : 2)); renderer.setSize(innerWidth, innerHeight);
  composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(innerWidth, innerHeight);
  post.on = !low;
  const m = low ? 1024 : 2048; sun.shadow.mapSize.set(m, m); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
}
export function setQualityPref(pref) {
  quality.pref = pref; try { localStorage.setItem(Q_KEY, pref); } catch {}
  setQuality(pref === 'auto' ? (weak ? 'low' : 'high') : pref);
}
setQuality(quality.level);

addEventListener('resize', () => {
  if (!innerWidth || !innerHeight) return;
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  bloom.resolution.set(innerWidth / 2, innerHeight / 2);
});

// 鏡頭：從半場線後方往籃框看。橫式看整個半場寬，直式手機看窄一點、跟著球左右移
export const cam = { target: new THREE.Vector3(), kick: 0, shake: 0, zoom: 1 };
export function viewWidth() { return camera.aspect < 1 ? 7.2 : Math.min(13, 8.6 * camera.aspect); }
const _off = new THREE.Vector3(), _sh = new THREE.Vector3();
export function updateCamera(focus, dt, snap = false) {
  if (snap) cam.target.copy(focus); else cam.target.lerp(focus, 1 - Math.exp(-dt * 4));
  cam.kick *= Math.exp(-dt * 5); cam.shake *= Math.exp(-dt * 8);
  const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const d = viewWidth() / (2 * half * camera.aspect) * cam.zoom * (1 - cam.kick * 0.08);
  if (camera.aspect < 1) _off.set(0, d * 0.7, d * 0.71);   // 直式：往下看約 45°，球場塞滿直長畫面
  else _off.set(0, d * 0.5, d * 0.87);   // 橫式：往下看約 30°
  camera.position.copy(cam.target).add(_off);
  if (cam.shake > 0.01) camera.position.add(_sh.set((Math.random() - 0.5) * cam.shake, (Math.random() - 0.5) * cam.shake, 0));
  camera.lookAt(cam.target);
}

// ---------- 小工具 ----------
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
// 幾何體快取：跑酷一直在生新道具，同尺寸的共用一份（移除道具時不要 dispose 幾何體）
const geoCache = new Map();
export function geo(key, make) { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); }
const matCache = new Map();
export function mat(color, opt = {}) {
  const key = color + JSON.stringify(opt);
  if (!matCache.has(key)) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, ...opt });
    if (m.metalness > 0.3) { m.envMap = envTex; m.envMapIntensity = 1.1; }
    matCache.set(key, m);
  }
  return matCache.get(key);
}
// 圓角方塊：玩具感的關鍵
export function rbox(w, h, d, color, x = 0, y = 0, z = 0, parent = scene, opt) {
  const m = new THREE.Mesh(geo('rb' + w + ',' + h + ',' + d, () => new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) * 0.18)), typeof color === 'object' ? color : mat(color, opt));
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}
export function box(w, h, d, color, x = 0, y = 0, z = 0, parent = scene, opt) {
  const m = new THREE.Mesh(geo('b' + w + ',' + h + ',' + d, () => new THREE.BoxGeometry(w, h, d)), typeof color === 'object' ? color : mat(color, opt));
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}
export function cyl(rt, rb, h, color, x = 0, y = 0, z = 0, parent = scene, opt, seg = 18) {
  const m = new THREE.Mesh(geo('c' + [rt, rb, h, seg], () => new THREE.CylinderGeometry(rt, rb, h, seg)), typeof color === 'object' ? color : mat(color, opt));
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}
export function sphere(r, color, x = 0, y = 0, z = 0, parent = scene, opt) {
  const m = new THREE.Mesh(geo('s' + r, () => new THREE.SphereGeometry(r, 18, 14)), typeof color === 'object' ? color : mat(color, opt));
  m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
}
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
export function roundRect(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
export const FONT = '-apple-system, "PingFang TC", "Noto Sans TC", sans-serif';
// 文字看板（招牌、名稱）：永遠面向鏡頭
export function labelSprite(text, { color = '#fff', bg = '#ff7a45', size = 0.5, glow = false } = {}) {
  const t = canvasTex(512, 128, (g, W, H) => {
    g.font = `900 64px ${FONT}`; const w = Math.min(W - 8, g.measureText(text).width + 70);
    g.fillStyle = bg; roundRect(g, (W - w) / 2, 10, w, H - 20, 40); g.fill();
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W / 2, H / 2 + 3);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: !glow }));
  s.scale.set(size * 4, size, 1); return s;
}
