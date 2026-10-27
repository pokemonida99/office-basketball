// 特效與音效：飄字、彩帶、光柱、地面衝擊波、彈出放大、合成音效
import * as THREE from 'three';
import { scene, canvasTex, FONT, cam, V } from './world.js?v=0.5.7';

const fxList = [];   // 每個特效自己有 update(dt) 回傳 false 就移除
export function updateFx(dt) { for (let i = fxList.length - 1; i >= 0; i--) if (!fxList[i](dt)) fxList.splice(i, 1); }

// 飄字（+$30、升級！）
export function floatText(pos, text, color = '#ff7a45', size = 1) {
  const t = canvasTex(320, 110, (g, W, H) => {
    g.font = `900 64px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 12; g.strokeStyle = '#fff'; g.strokeText(text, W / 2, H / 2); g.fillStyle = color; g.fillText(text, W / 2, H / 2);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.scale.set(1.2 * size, 0.41 * size, 1); s.position.copy(pos); s.renderOrder = 20; scene.add(s);
  let life = 1.1, vy = 1.4;
  fxList.push(dt => {
    life -= dt; vy *= Math.exp(-dt * 2.5); s.position.y += vy * dt;
    const k = Math.min(1, (1.1 - life) * 8); s.scale.set(1.2 * size * k, 0.41 * size * k, 1);
    s.material.opacity = Math.min(1, life * 2.5);
    if (life <= 0) { scene.remove(s); t.dispose(); s.material.dispose(); return false; }
    return true;
  });
}

// 彈出放大（easeOutBack），蓋好東西、升級時用
export function popIn(obj, to = 1, speed = 3.2) {
  let t = 0; obj.scale.setScalar(0.01); obj.userData.popping = true;
  fxList.push(dt => {
    t = Math.min(1, t + dt * speed);
    const u = t - 1, e = 1 + 2.70158 * u * u * u + 1.70158 * u * u;
    obj.scale.setScalar(Math.max(0.01, e) * to);
    if (t >= 1) obj.userData.popping = false;
    return t < 1;
  });
}
// 壓扁再彈回（做好一個貨、收到東西）。彈出中不壓；壓到一半再被叫就重新開始，不會越壓越小
export function squash(obj, amt = 0.18) {
  const u = obj.userData;
  if (u.popping) return;
  if (u.sq) { u.sq.t = 0; return; }
  const base = obj.scale.clone(); u.sq = { t: 0 };
  fxList.push(dt => {
    const s = u.sq; if (!s) return false;
    s.t += dt * 6; const k = Math.sin(Math.min(s.t, Math.PI)) * amt * (1 - s.t / Math.PI);
    obj.scale.set(base.x * (1 + k), base.y * (1 - k), base.z * (1 + k));
    if (s.t >= Math.PI) { obj.scale.copy(base); u.sq = null; return false; }
    return true;
  });
}

// 彩帶爆發
const confGeo = new THREE.PlaneGeometry(0.09, 0.05);
const COLORS = [0xff5d73, 0xffc93c, 0x4cd964, 0x3fa7ff, 0xb46bff, 0xff8a3d];
export function confetti(pos, n = 70, power = 1) {
  const g = new THREE.Group(); scene.add(g);
  const parts = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(confGeo, new THREE.MeshBasicMaterial({ color: COLORS[i % COLORS.length], side: THREE.DoubleSide, transparent: true }));
    m.position.copy(pos);
    const a = Math.random() * Math.PI * 2, up = 3 + Math.random() * 3;
    parts.push({ m, v: V(Math.cos(a) * (1 + Math.random() * 2.2) * power, up * power, Math.sin(a) * (1 + Math.random() * 2.2) * power), r: V(Math.random() * 9, Math.random() * 9, Math.random() * 9) });
    g.add(m);
  }
  let life = 2.4;
  fxList.push(dt => {
    life -= dt;
    for (const p of parts) {
      p.v.y -= 7 * dt; p.v.multiplyScalar(Math.exp(-dt * 1.4));
      if (p.v.y < -1.2) p.v.y = -1.2;   // 紙片飄落比較慢
      p.m.position.addScaledVector(p.v, dt);
      p.m.rotation.x += p.r.x * dt; p.m.rotation.y += p.r.y * dt; p.m.rotation.z += p.r.z * dt;
      if (p.m.position.y < 0.02) p.m.position.y = 0.02;
      p.m.material.opacity = Math.min(1, life);
    }
    if (life <= 0) { scene.remove(g); parts.forEach(p => p.m.material.dispose()); return false; }
    return true;
  });
}

// 光柱：從地面往上的金色光
const pillarTex = canvasTex(64, 256, (g, W, H) => {
  const gr = g.createLinearGradient(0, H, 0, 0); gr.addColorStop(0, '#fff6c8ff'); gr.addColorStop(0.5, '#ffd76a88'); gr.addColorStop(1, '#ffd76a00');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
});
export function pillar(pos, color = 0xffd76a, radius = 0.9, height = 6) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.15, height, 32, 1, true),
    new THREE.MeshBasicMaterial({ map: pillarTex, color, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false }));
  m.position.set(pos.x, height / 2, pos.z); scene.add(m);
  let t = 0;
  fxList.push(dt => {
    t += dt; m.rotation.y += dt * 1.5;
    const k = t < 0.2 ? t / 0.2 : Math.max(0, 1 - (t - 0.2) / 1.3);
    m.material.opacity = k; m.scale.set(0.6 + 0.4 * Math.min(1, t * 4), 1, 0.6 + 0.4 * Math.min(1, t * 4));
    if (t > 1.5) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); return false; }
    return true;
  });
}
// 地面衝擊波
const ringTex = canvasTex(256, 256, (g, W) => {
  const gr = g.createRadialGradient(W / 2, W / 2, W * 0.3, W / 2, W / 2, W / 2);
  gr.addColorStop(0, '#ffffff00'); gr.addColorStop(0.75, '#ffffffff'); gr.addColorStop(1, '#ffffff00');
  g.fillStyle = gr; g.fillRect(0, 0, W, W);
});
export function shockwave(pos, color = 0xffe08a, size = 4) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ringTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(pos.x, 0.03, pos.z); scene.add(m);
  let t = 0;
  fxList.push(dt => {
    t += dt; const k = t / 0.7; m.scale.setScalar(0.2 + k * size); m.material.opacity = 1 - k;
    if (t >= 0.7) { scene.remove(m); m.material.dispose(); return false; }
    return true;
  });
}
// 閃亮小星星（高級咖啡機、金色東西周圍）
const sparkTex = canvasTex(64, 64, (g, W) => {
  g.translate(W / 2, W / 2); g.fillStyle = '#fff';
  g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 6 : 30, a = i * Math.PI / 4; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill();
});
export function sparkle(pos, color = 0xffe08a, size = 0.25) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  s.position.copy(pos); scene.add(s);
  let t = 0;
  fxList.push(dt => {
    t += dt; const k = Math.sin(Math.min(1, t / 0.6) * Math.PI);
    s.scale.setScalar(size * k); s.material.rotation += dt * 3; s.position.y += dt * 0.3;
    if (t >= 0.6) { scene.remove(s); s.material.dispose(); return false; }
    return true;
  });
}
// 冒煙（爛爛的咖啡機、舊印表機）
const puffMat = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, transparent: true, roughness: 1 });
export function puff(pos, color) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), color ? new THREE.MeshStandardMaterial({ color, transparent: true }) : puffMat.clone());
  m.position.copy(pos); scene.add(m);
  let t = 0; const dx = (Math.random() - 0.5) * 0.3;
  fxList.push(dt => {
    t += dt; m.position.y += dt * 0.6; m.position.x += dx * dt; m.scale.setScalar(1 + t * 2.2); m.material.opacity = Math.max(0, 0.7 - t * 0.6);
    if (t > 1.2) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); return false; }
    return true;
  });
}
export function camKick(k = 1) { cam.kick = Math.max(cam.kick, k); }

// ---------- DOM：橫幅與提示 ----------
const toastEl = document.getElementById('toast'); let toastTimer = 0;
export function toast(t, color = '#ffd34d') { toastEl.textContent = t; toastEl.style.setProperty('--tc', color); toastEl.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('on'), 2200); }
const bannerEl = document.getElementById('banner'); let bannerTimer = 0;
// 大橫幅：升級、升職時用（標題＋副標＋星星）
export function banner(title, sub = '', stars = 0, color = '#ff7a45') {
  bannerEl.innerHTML = `<div class="b-stars">${'★'.repeat(stars)}</div><div class="b-title">${title}</div>${sub ? `<div class="b-sub">${sub}</div>` : ''}`;
  bannerEl.style.setProperty('--bc', color);
  bannerEl.classList.remove('on'); void bannerEl.offsetWidth; bannerEl.classList.add('on');
  clearTimeout(bannerTimer); bannerTimer = setTimeout(() => bannerEl.classList.remove('on'), 2600);
}

// ---------- 音效（WebAudio 合成，音量小） ----------
let ac = null, master = null;
export function audioInit() {
  if (ac) return; try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = 0.16; master.connect(ac.destination);
  } catch { ac = null; }
}
export function getAC() { return ac ? { ac, master } : null; }
export function tone(freq, dur = 0.12, type = 'sine', vol = 1, when = 0, slide = 0) {
  if (!ac) return;
  const t0 = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
}
// 白噪音：觀眾歡呼、鼓聲、刷網
let noiseBuf = null;
export function noise(dur = 0.2, vol = 0.5, freq = 1200, q = 0.8, when = 0, type = 'bandpass', sweep = 0) {
  if (!ac) return;
  if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const t0 = ac.currentTime + when, src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = noiseBuf; src.loop = true; f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
  if (sweep) f.frequency.exponentialRampToValueAtTime(freq * sweep, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.03, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f); f.connect(g); g.connect(master); src.start(t0); src.stop(t0 + dur + 0.05);
}
export const sfx = {
  // 運球：「咚」（球打地板的低音往下掉）＋「啪」（手拍皮球的高頻）＋一點中音的球聲和地板回音；v＝遠近
  dribble(v = 1) { tone(150, 0.1, 'sine', 1.6 * v, 0, 0.38); noise(0.035, 0.7 * v, 1900, 1.3); tone(270, 0.06, 'triangle', 0.35 * v, 0, 0.7); noise(0.13, 0.22 * v, 480, 0.7, 0.02, 'lowpass'); },
  pass() { noise(0.16, 0.25, 900, 1.2, 0, 'bandpass', 2.5); },
  catch() { tone(180, 0.05, 'triangle', 0.4); },
  shoot() { tone(330, 0.12, 'triangle', 0.45, 0, 1.6); },
  // 進籃：「刷」（網子的高頻沙沙聲往下滑）＋網子晃的細碎聲，球落地再彈兩下
  swish() { noise(0.34, 0.9, 6500, 0.6, 0, 'highpass', 0.4); noise(0.22, 0.55, 3200, 0.8, 0.06, 'bandpass', 0.7); noise(0.1, 0.3, 8000, 1, 0.02, 'highpass'); [0.48, 0.82].forEach((w, i) => setTimeout(() => sfx.dribble(0.45 - i * 0.2), w * 1000)); },
  rim() { tone(520, 0.25, 'square', 0.22, 0, 0.92); tone(780, 0.18, 'triangle', 0.25, 0.01); },
  bounce() { sfx.dribble(0.5); },
  steal() { tone(880, 0.06, 'square', 0.3); tone(1320, 0.1, 'square', 0.3, 0.05); },
  block() { tone(160, 0.12, 'square', 0.6, 0, 0.5); noise(0.15, 0.4, 600, 1); },
  whiff() { noise(0.12, 0.15, 1500, 1, 0, 'bandpass', 0.6); },
  jump() { tone(380, 0.1, 'triangle', 0.35, 0, 1.7); },
  dunk() { tone(70, 0.4, 'sine', 0.9, 0, 0.5); noise(0.5, 0.6, 300, 0.6, 0, 'lowpass'); tone(520, 0.4, 'square', 0.2, 0.02, 0.9); },
  cheer(v = 0.35) { noise(1.4, v, 1800, 0.4, 0, 'bandpass', 1.3); noise(1.1, v * 0.6, 3200, 0.5, 0.1); },
  score() { [784, 988, 1175].forEach((f, i) => tone(f, 0.15, 'triangle', 0.5, i * 0.07)); },
  score3() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.18, 'square', 0.3, i * 0.07)); tone(2093, 0.4, 'sine', 0.4, 0.3); },
  whistle() { tone(2300, 0.35, 'sine', 0.35, 0, 1.02); tone(2350, 0.35, 'sine', 0.2, 0, 0.98); },
  buzzer() { tone(196, 0.9, 'sawtooth', 0.4); tone(233, 0.9, 'square', 0.18); },
  tick() { tone(1200, 0.04, 'square', 0.18); },
  full() { [660, 880, 1320].forEach((f, i) => tone(f, 0.1, 'triangle', 0.4, i * 0.05)); },
  cutin() { noise(0.6, 0.4, 400, 0.8, 0, 'bandpass', 8); tone(220, 0.6, 'sawtooth', 0.25, 0, 4); [523, 784, 1046].forEach((f, i) => tone(f, 0.3, 'square', 0.22, 0.35 + i * 0.06)); },
  ring() { for (let i = 0; i < 4; i++) { tone(1046, 0.05, 'square', 0.2, i * 0.12); tone(1318, 0.05, 'square', 0.2, i * 0.12 + 0.06); } },
  coin() { tone(1320, 0.05, 'square', 0.25); tone(1760, 0.08, 'square', 0.25, 0.04); },
  cash() { for (let i = 0; i < 6; i++) tone(1400 + i * 120, 0.05, 'square', 0.18, i * 0.05); tone(2093, 0.3, 'triangle', 0.3, 0.32); },
  power() { [523, 784, 1046, 1568].forEach((f, i) => tone(f, 0.14, 'square', 0.3, i * 0.05)); },
  laser() { tone(1800, 0.5, 'sawtooth', 0.15, 0, 0.3); tone(900, 0.5, 'sine', 0.25, 0.05, 2); },
  boss() { [392, 494, 587, 784].forEach((f, i) => tone(f, 0.3, 'square', 0.22, i * 0.1)); tone(1175, 0.7, 'triangle', 0.35, 0.4); },
  stun() { [900, 700, 900, 700].forEach((f, i) => tone(f, 0.08, 'triangle', 0.25, i * 0.09)); },
  ingot() { tone(1568, 0.08, 'sine', 0.4); tone(2093, 0.25, 'triangle', 0.35, 0.06); },
  win() { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, 0.22, 'triangle', 0.5, i * 0.11)); },
  lose() { [523, 440, 349, 262].forEach((f, i) => tone(f, 0.25, 'triangle', 0.45, i * 0.18)); },
  click() { tone(660, 0.05, 'triangle', 0.4); },
};
