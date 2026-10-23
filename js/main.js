// 上班啟示錄：午休鬥牛 2v2 —— 頂樓半場籃球。玩家挑兩個同事，電腦控制隊友和對手；每個人都有自己的大招
import * as THREE from 'three';
import { scene, render, updateCamera, cam, camera, labelSprite, V, quality, setQuality, setQualityPref, canvasTex, FONT, sphere, mat } from './world.js?v=0.2.0';
import { loadKind, loadClip, makeActor, addJog, updateActor, turnTo } from './assets.js?v=0.2.0';
import * as fx from './fx.js?v=0.2.0';
import { buildCourt, animateCourt, swishNet, C, COURT, HOOP, ARC_R, CORNER_X, TOP, WALL, isThree, hoopDist } from './court.js?v=0.2.0';
import { music, musicStart, musicStop, musicTick } from './music.js?v=0.2.0';

const VERSION = '0.2.0';
document.getElementById('ver').textContent = 'v' + VERSION;

// ---------- 數值（調手感只改這裡） ----------
const CFG = {
  len: 120, target: 21,           // 比賽秒數、先到幾分
  scale: 1.3,                     // 角色身高
  speed: 4.1, accel: 11, handler: 0.9,   // 跑速、加速、持球減速
  g: 20, jumpV: 6.2, blockV: 6.6,       // 重力、投籃跳、蓋帽跳
  passSpeed: 15,                  // 傳球速度（每秒幾單位）
  stealR: 1.3, stealP: 0.32, stealCd: 0.8,   // 抄截距離、機率、冷卻
  aiSteal: 0.5,                   // 電腦每秒嘗試抄截幾次（貼身時）
  blockP: 0.5,                    // 起跳蓋帽成功率
  gaugeRate: 1.2,                 // 大招每秒自然增加（%）
  gPass: 5, gScore: 14, gAssist: 8, gSteal: 14, gBlock: 16, gReb: 6, gStart: 20, gIngot: 40,
  coffee: 6, vivi: 8, stun: 3.2, slow: 6, viral: 8, wall: 7,  // 大招持續秒數
};

// ---------- 角色 ----------
const CHARS = {
  kui: { name: '小葵', role: '新人實習生', model: 'kui_walk2', jog: 'kui_jog', color: '#ff9f43', spd: 1.08, sht: 0.98, stl: 1.0, blk: 0.9,
    stat: '速度 ★★★★★　投籃 ★★★', quote: '我會努力的！☕',
    sp: { name: '咖啡衝刺', desc: '全隊 6 秒加速，傳球秒到不會被抄、抄截變強', need: false } },
  jie: { name: '阿傑', role: '資深設計師', model: 'jie_walk', jog: 'jie_jog', color: '#8e5cf0', spd: 0.96, sht: 1.04, stl: 0.9, blk: 1.15,
    stat: '籃下 ★★★★★　蓋帽 ★★★★', quote: '這稿我一次就過。',
    sp: { name: '設計稿灌籃', desc: '從哪裡起跳都必進的飛天灌籃，三分線外起跳算 3 分', need: true } },
  mi: { name: '小米', role: '總機客服', model: 'mi_walk', color: '#b46bff', spd: 1.02, sht: 1.0, stl: 1.15, blk: 0.85,
    stat: '抄截 ★★★★★　速度 ★★★★', quote: '您好，這裡是總機～📞',
    sp: { name: '總機干擾', desc: '對手電話狂響暈 3 秒，持球的人當場掉球', need: false } },
  vivi: { name: 'Vivi', role: '老闆', model: 'vivi_walk', color: '#ff4fa0', spd: 0.92, sht: 0.92, stl: 0.9, blk: 0.8, h: 1.02,
    stat: '又貴又沒用　大招 ★★★★★', quote: '辛苦了！（沒有加薪）',
    sp: { name: '老闆說了算', desc: '籃框變超大金框 8 秒，下一球不管哪裡投都算 3 分', need: false } },
  kevin: { name: 'Kevin', role: '特助', model: 'kevin_walk', color: '#3f7fd9', spd: 1.0, sht: 1.06, stl: 0.95, blk: 1.0,
    stat: '投籃 ★★★★★　防守 ★★★', quote: '這個用 AI 就好了。',
    sp: { name: '用 AI 就好', desc: 'AI 鎖定籃框，站在哪裡投都必進', need: true } },
  yan: { name: '小燕', role: 'PM', model: 'yan_walk', color: '#36b37e', spd: 1.04, sht: 1.0, stl: 1.0, blk: 0.9,
    stat: '傳球 ★★★★★　速度 ★★★★', quote: '這個今天要喔！📋',
    sp: { name: 'PM 急件', desc: '對手被急件卡住，超遠傳球給隊友空中接力灌籃', need: true } },
  heilun: { name: '黑輪', role: '業務', model: 'heilun_walk', color: '#e0663a', spd: 1.0, sht: 0.98, stl: 1.2, blk: 1.0,
    stat: '抄截 ★★★★★　投籃 ★★★', quote: '業績算我的！🤝',
    sp: { name: '業務抽成', desc: '球直接搶過來，再從對手分數抽走 2 分', need: false } },
  // 以下四位是主遊戲的備用角色（GPT 三視圖 → Tripo 3D → 綁走路與招牌動作）
  de: { name: '德哥', role: '財務長', model: 'glasses_walk', color: '#5b6b82', spd: 0.94, sht: 1.03, stl: 1.0, blk: 0.95, h: 1.02,
    stat: '投籃 ★★★★　防守 ★★★★', quote: '這筆不能報。',
    sp: { name: '預算砍半', desc: '對手 6 秒跑速減半，大招集氣砍一半', need: false } },
  momo: { name: 'Momo', role: '行銷企劃', model: 'bob_walk', color: '#ff6fa8', spd: 1.05, sht: 0.98, stl: 1.0, blk: 0.85,
    stat: '速度 ★★★★　人氣 ★★★★★', quote: '這篇一定會爆紅！✨',
    sp: { name: '爆紅貼文', desc: '8 秒內我方每次進球多 1 分，隊友大招 +25%', need: false } },
  zhe: { name: '阿哲', role: 'IT 工程師', model: 'cap_walk', color: '#2f9e8f', spd: 0.98, sht: 1.0, stl: 0.95, blk: 1.15,
    stat: '蓋帽 ★★★★★　投籃 ★★★', quote: '你有試過重開機嗎？',
    sp: { name: '防火牆', desc: '7 秒內對手一般投籃全部被擋下', need: false } },
  zhen: { name: '小偵', role: '稽核專員', model: 'det_walk', color: '#b8864b', spd: 1.06, sht: 0.96, stl: 1.15, blk: 0.9,
    stat: '抄截 ★★★★★　速度 ★★★★', quote: '這張發票有問題。🔍',
    sp: { name: '現場稽核', desc: '衝到持球的對手面前把球沒收，對手愣住 1.5 秒', need: 'opp' } },
};
const KEYS = Object.keys(CHARS);
// 難度：電腦的命中、跑速、抄截、蓋帽、集氣倍率；green 是玩家投籃時機綠色區的寬度倍率
const DIFF = [
  { name: '簡單', shot: 0.8, speed: 0.9, steal: 0.55, block: 0.6, gauge: 0.8, green: 1.6 },
  { name: '普通', shot: 0.9, speed: 0.96, steal: 0.85, block: 1, gauge: 0.95, green: 1 },
  { name: '困難', shot: 1.0, speed: 1.02, steal: 1.15, block: 1.25, gauge: 1.1, green: 0.8 },
];
const dif = () => DIFF[S.diff ?? 1];
function newBuff() { return { coffee: 0, vivi: 0, viviNext: false, slow: 0, viral: 0, wall: 0 }; }
const TEAM_COLOR = ['#ff7a45', '#3f7fd9'];

// ---------- 載入 ----------
const K = {}, FACE = {}, SIG = {};
async function loadAll(progress) {
  const list = [...KEYS.map(k => [k, CHARS[k].model]), ['kuiJog', 'kui_jog', 7], ['jieJog', 'jie_jog', 7], ['npcM', 'npc_m_walk'], ['npcF', 'npc_f_walk'], ['caishen', 'caishen_sit']];
  let n = 0; const all = list.length + KEYS.length;
  await Promise.all([
    ...list.map(async ([k, f, lean]) => { K[k] = await loadKind(`models/${f}.glb`, lean ?? null); progress(++n / all); }),
    // 招牌動作只是動畫，載不到也不影響比賽
    ...KEYS.map(async k => { try { SIG[k] = await loadClip(`models/sig/${k}.glb`); } catch (e) { console.warn('sig', k, e); } progress(++n / all); }),
  ]);
}
// 招牌動作：大招時播一次（Higgsfield 綁的動作，套到同一套骨架上）
// 動作檔很長（有的 9 秒），只播最精彩的那一段（秒）：用 work/peek.html 一格一格看過挑的
const SIG_WIN = { kui: [0.4, 1.9], jie: [0.8, 1.73], mi: [0.5, 2.0], vivi: [1.0, 2.6], kevin: [2.4, 3.3], yan: [5.0, 5.9], heilun: [0, 1.5],
  de: [0.4, 2.2], momo: [0.6, 2.2], zhe: [0, 1.9], zhen: [0.6, 2.0] };
// lock＝這段時間站著不動；loop＝一直重播（贏球慶祝）
function playSig(p, { lock = false, loop = false, speed = 1 } = {}) {
  const clip = SIG[p.key]; if (!clip) return;
  const [w0, w1] = SIG_WIN[p.key] || [0, clip.duration];
  const a = p.actor, act = a.mixer.clipAction(clip);
  act.reset(); act.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce); act.clampWhenFinished = true;
  act.time = loop ? 0 : w0; act.timeScale = speed; act.setEffectiveWeight(0); act.play();
  a.sig = act; a.sigOn = true; a.sigW = a.sigW || 0;
  p.sigT = loop ? 99 : (w1 - w0) / speed;
  if (lock && !busy(p)) p.act = { type: 'sig', t: 0, dur: Math.min(p.sigT, 1.5) };
}
function stopSig(p) { p.sigT = 0; if (p.actor.sig) p.actor.sigOn = false; }
// 頭像：用 3D 模型直接拍大頭照（不另外畫圖，七個人風格一致）
function makePortraits() {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(256, 256); r.setPixelRatio(1); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.NeutralToneMapping;
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xffffff, 0xf2c99a, 2.0));
  const dl = new THREE.DirectionalLight(0xfff4e0, 2.2); dl.position.set(1, 2, 3); sc.add(dl);
  const cm = new THREE.PerspectiveCamera(24, 1, 0.1, 10); cm.position.set(0, 0.76, 1.45); cm.lookAt(0, 0.72, 0);
  for (const k of KEYS) { const a = makeActor(K[k]); sc.add(a.root); r.render(sc, cm); FACE[k] = r.domElement.toDataURL(); sc.remove(a.root); }
  r.dispose(); r.forceContextLoss?.();
}

// ---------- 骨頭姿勢（手臂用程式擺：運球、投籃、舉手蓋帽、歡呼） ----------
const ARM_BONES = ['RightArm', 'LeftArm', 'RightForeArm', 'LeftForeArm', 'Spine02'];
function rigOf(actor) {
  const bones = {}; actor.model.traverse(o => { if (o.isBone) bones[o.name] = o; });
  return { bones, rest: ARM_BONES.filter(n => bones[n]).map(n => [bones[n], bones[n].quaternion.clone()]), arm: { rf: 0, lf: 0, rs: 0, ls: 0, sp: 0 } };
}
const _mq = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _q = new THREE.Quaternion(), _a = new THREE.Vector3();
const AX = new THREE.Vector3(1, 0, 0), AZ = new THREE.Vector3(0, 0, 1);
// 以角色自己的座標軸轉骨頭（臉朝 +z、右手在 -x）
function rotBone(b, axis, ang) {
  if (!b || !ang) return;
  b.parent.getWorldQuaternion(_pq);
  _a.copy(axis).applyQuaternion(_mq).applyQuaternion(_pq.invert()).normalize();
  b.quaternion.premultiply(_q.setFromAxisAngle(_a, ang));
  b.updateMatrixWorld(true);
}
// rf/lf：手往前往上抬（弧度）；rs/ls：手往旁邊張開；sp：上身前傾
function poseArms(rig, actor, tg, dt) {
  const a = rig.arm, k = Math.min(1, dt * 16);
  for (const n of ['rf', 'lf', 'rs', 'ls', 'sp']) a[n] += ((tg[n] || 0) - a[n]) * k;
  actor.root.updateMatrixWorld(true);
  actor.model.getWorldQuaternion(_mq);
  const b = rig.bones;
  rotBone(b.Spine02, AX, a.sp);
  rotBone(b.RightArm, AX, -a.rf); rotBone(b.LeftArm, AX, -a.lf);
  rotBone(b.RightArm, AZ, -a.rs); rotBone(b.LeftArm, AZ, a.ls);
}
function resetBones(rig) { for (const [b, q] of rig.rest) b.quaternion.copy(q); }

// ---------- 小精靈貼圖（表情符號） ----------
const emojiCache = {};
function emojiSprite(e, size = 0.5) {
  const t = emojiCache[e] || (emojiCache[e] = canvasTex(128, 128, (g, W) => { g.font = `100px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, W / 2, W / 2 + 6); }));
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }));
  s.scale.setScalar(size); s.renderOrder = 15; return s;
}

// ---------- 球 ----------
const ballTex = canvasTex(256, 128, (g, w, h) => {
  g.fillStyle = '#f2711c'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffffff10'; for (let i = 0; i < 400; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  g.strokeStyle = '#3a1a08'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
  for (const x of [w / 4, w * 3 / 4]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  for (const x of [0, w / 2, w]) { g.beginPath(); g.ellipse(x, h / 2, w / 9, h / 2, 0, 0, Math.PI * 2); g.stroke(); }
});
const BR = 0.15;
const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BR, 24, 16), new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.6 }));
ballMesh.castShadow = true; scene.add(ballMesh);
// mode：held 有人拿、pass 傳球中、shot 投籃飛行、net 進網、loose 沒人拿、dead 進球後沒人能撿
const B = { mode: 'dead', owner: null, pos: V(0, BR, 5), vel: V(), t: 0, T: 0, p0: V(), p1: V(), v0: V(), recv: null, passer: null, arc: 0.25, make: false, pts: 2, shooter: null, sure: false, drib: 0, spin: V() };

// ---------- 遊戲狀態 ----------
const S = {
  mode: 'load', phase: 'none', phaseT: 0, t: 0, clock: CFG.len, score: [0, 0], poss: 0, mustClear: false, ctrl: null,
  ts: 1, slowT: 0, cut: null, buzzer: false, sudden: false, nextPoss: 0, caiDone: false, endAfter: false,
  buff: [newBuff(), newBuff()],
  pick: ['kui', 'jie'], opp: ['mi', 'kevin'], lastPass: null, onBall: [null, null], lastTick: -1,
};
let players = [], crowd = [];
const teamOf = (t) => players.filter(p => p.team === t);
const oppsOf = (p) => players.filter(q => q.team !== p.team);
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const rand = (a, b) => a + Math.random() * (b - a);
const BUSY = { shoot: 1, lay: 1, block: 1, steal: 1, jdunk: 1, ai: 1, alley: 1, lob: 1, audit: 1, sig: 1 };
const busy = (p) => p.act && BUSY[p.act.type];
const holding = (p) => B.mode === 'held' && B.owner === p;

function makePlayer(key, team) {
  const def = CHARS[key];
  const actor = makeActor(K[key], CFG.scale * (def.h || 1));
  if (def.jog) addJog(actor, K[key + 'Jog']);
  scene.add(actor.root);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.48, 32), new THREE.MeshBasicMaterial({ color: TEAM_COLOR[team], transparent: true, opacity: 0.85, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.renderOrder = 2; scene.add(ring);
  const label = labelSprite(def.name, { bg: TEAM_COLOR[team], size: 0.24 }); label.renderOrder = 12; label.material.depthTest = false; scene.add(label);
  return { key, def, team, actor, ring, label, ...rigOf(actor), x: 0, z: 0, y: 0, vy: 0, vx: 0, vz: 0, dvx: 0, dvz: 0, face: Math.PI,
    act: null, stun: 0, stunIcon: null, gauge: CFG.gStart, pts: 0, stealCd: 0, pickCd: 0, aiT: 0, aiT2: 0, spot: null, goal: null, holdT: 0, blockIn: -1, cheer: 0, man: null, spWait: 0, icons: [] };
}
function clearPlayers() {
  for (const p of players) { scene.remove(p.actor.root, p.ring, p.label); p.label.material.map.dispose(); p.label.material.dispose(); for (const i of p.icons) scene.remove(i.s); }
  players = [];
}

// 觀眾：沒上場的三個同事＋上班族，站在兩旁長椅上加油
function buildCrowd() {
  for (const c of crowd) scene.remove(c.actor.root);
  crowd = [];
  const out = KEYS.filter(k => !S.pick.includes(k) && !S.opp.includes(k));
  const list = [...out, 'npcM', 'npcF', 'npcM', 'npcF'].slice(0, 10);
  list.forEach((k, i) => {
    const side = i % 2 ? 1 : -1, slot = i >> 1;
    const actor = makeActor(K[k], CFG.scale * 0.95);
    actor.root.position.set(side * 6.85, 0.42, 3.9 + slot * 1.05);
    actor.root.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    scene.add(actor.root);
    crowd.push({ actor, ...rigOf(actor), cheer: 0, ph: Math.random() * 6, k });
  });
}

// ---------- 輸入 ----------
const inp = { x: 0, z: 0, keys: new Set() };
function readKeys() {
  if (stick.id != null) return;
  const k = inp.keys; let x = 0, z = 0;
  if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1; if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
  if (k.has('KeyW') || k.has('ArrowUp')) z -= 1; if (k.has('KeyS') || k.has('ArrowDown')) z += 1;
  const l = Math.hypot(x, z) || 1; inp.x = x / l; inp.z = z / l;
}
addEventListener('keydown', e => {
  if (S.mode === 'select' || S.mode === 'title' || S.mode === 'over') return;
  document.body.classList.add('kbd');
  if (e.code === 'KeyP' || e.code === 'Escape') { togglePause(); return; }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  inp.keys.add(e.code); if (e.repeat) return;
  fx.audioInit();
  if (e.code === 'KeyJ' || e.code === 'Space') actShoot();
  else if (e.code === 'KeyK') actPass();
  else if (e.code === 'KeyL') actSteal();
  else if (e.code === 'KeyI' || e.code === 'KeyE') actSpecial();
});
addEventListener('keyup', e => { inp.keys.delete(e.code); if (e.code === 'KeyJ' || e.code === 'Space') actShootUp(); });
addEventListener('blur', () => inp.keys.clear());

// 觸控搖桿：左半邊按哪裡，搖桿就出現在哪裡
const $ = (id) => document.getElementById(id);
const stick = { id: null, cx: 0, cy: 0 }, stickEl = $('stick'), knob = $('knob');
$('stickZone').addEventListener('pointerdown', e => {
  e.preventDefault(); document.body.classList.remove('kbd'); fx.audioInit();
  stick.id = e.pointerId; const r = $('stickZone').getBoundingClientRect();
  stick.cx = e.clientX; stick.cy = e.clientY;
  stickEl.style.left = (e.clientX - r.left) + 'px'; stickEl.style.top = (e.clientY - r.top) + 'px'; stickEl.classList.add('on');
  moveStick(e);
});
function moveStick(e) {
  let dx = e.clientX - stick.cx, dy = e.clientY - stick.cy; const l = Math.hypot(dx, dy), R = 50;
  if (l > R) { dx *= R / l; dy *= R / l; }
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
  if (l < 6) { inp.x = inp.z = 0; return; }
  const m = Math.max(0.55, Math.min(1, l / R)) / Math.min(l, R);   // 輕推也有一半速度
  inp.x = dx * m; inp.z = dy * m;
}
addEventListener('pointermove', e => { if (e.pointerId === stick.id) moveStick(e); });
function endStick(e) {
  if (e.pointerId !== stick.id) return; stick.id = null; inp.x = inp.z = 0;
  knob.style.transform = ''; stickEl.classList.remove('on'); stickEl.style.left = ''; stickEl.style.top = '';
}
addEventListener('pointerup', endStick); addEventListener('pointercancel', endStick);
for (const [id, fn] of [['kShoot', actShoot], ['kPass', actPass], ['kSteal', actSteal], ['kSp', actSpecial]]) {
  const el = $(id);
  el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); document.body.classList.remove('kbd'); fx.audioInit(); el.classList.add('on'); fn(); });
  const off = () => { if (el.classList.contains('on') && id === 'kShoot') actShootUp(); el.classList.remove('on'); };
  el.addEventListener('pointerup', off); el.addEventListener('pointerleave', off); el.addEventListener('pointercancel', off);
}
// 擋放大、選取、長按選單
for (const ev of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick', 'contextmenu', 'selectstart', 'dragstart']) document.addEventListener(ev, e => e.preventDefault(), { passive: false });
addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && ['=', '+', '-', '0'].includes(e.key)) e.preventDefault(); });
let lastTouchEnd = 0;
document.addEventListener('touchend', e => { const n = Date.now(); if (n - lastTouchEnd < 350) e.preventDefault(); lastTouchEnd = n; }, { passive: false });
document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });

// ---------- 玩家按鍵 ----------
const canAct = (p) => S.mode === 'play' && S.phase === 'play' && !S.cut && p && !busy(p) && p.stun <= 0;
function actShoot() {
  const p = S.ctrl; if (!canAct(p)) return;
  if (holding(p)) {
    if (S.mustClear) { fx.toast('🔄 搶到球要先帶出三分線！'); flashArc(); return; }
    startShot(p, true);
  } else if (p.y <= 0) startBlock(p);
}
// 放開投籃鍵＝出手（按住期間看頭上的時機條，綠色區放開最準）
function actShootUp() {
  const p = S.ctrl, a = p && p.act;
  if (a && a.type === 'shoot' && a.hold) { a.hold = false; a.relAt = Math.max(a.t, 0.12); a.press = a.t; }
}
// 傳球對象：有推搖桿就傳給那個方向的隊友，沒推就傳給最空的
function passTarget(p) {
  const mates = teamOf(p.team).filter(q => q !== p);
  if (mates.length === 1) return mates[0];
  const il = Math.hypot(inp.x, inp.z);
  if (il > 0.3) return mates.slice().sort((a, b) => dirScore(p, b) - dirScore(p, a))[0];
  return bestMate(p);
}
function dirScore(p, q) { const dx = q.x - p.x, dz = q.z - p.z, l = Math.hypot(dx, dz) || 1; return (dx * inp.x + dz * inp.z) / l / Math.hypot(inp.x, inp.z); }
// 最空、最好投的隊友
function bestMate(p) {
  let best = null, bs = -1e9;
  for (const q of teamOf(p.team)) if (q !== p) { const s = (q.stun > 0 ? -9 : 0) + shotProb(q, q.x, q.z, hoopDist(q.x, q.z) < 1.9) - contest(q) * 0.3; if (s > bs) { bs = s; best = q; } }
  return best;
}
function actPass() {
  const p = S.ctrl; if (!canAct(p)) return;
  if (holding(p)) doPass(p, passTarget(p));
  else if (!(B.mode === 'held' && B.owner.team === 0)) {   // 防守時換人：換成離球最近的另一個隊友
    const others = teamOf(0).filter(q => q !== p && !busy(q));
    if (others.length) { S.ctrl = others.sort((a, b) => Math.hypot(a.x - B.pos.x, a.z - B.pos.z) - Math.hypot(b.x - B.pos.x, b.z - B.pos.z))[0]; fx.sfx.click(); }
  }
}
function actSteal() {
  const p = S.ctrl; if (!canAct(p)) return;
  if (B.mode === 'held' && B.owner.team === p.team) return;
  startSteal(p);
}
function actSpecial() {
  const p = S.ctrl; if (!p || S.mode !== 'play') return;
  const why = specialBlock(p);
  if (why) { fx.toast(why); return; }
  startSpecial(p);
}

// ---------- 規則小工具 ----------
function chestPos(p, out = V()) {
  const s = p.actor.root.scale.x;
  return out.set(p.x + Math.sin(p.face) * 0.18, p.y + 0.62 * s, p.z + Math.cos(p.face) * 0.18);
}
const _hp = new THREE.Vector3(), _hp2 = new THREE.Vector3();
function handsPos(p, out = V()) {
  const r = p.bones.RightHand, l = p.bones.LeftHand;
  if (!r || !l) return chestPos(p, out);
  r.getWorldPosition(_hp); l.getWorldPosition(_hp2);
  return out.copy(_hp).add(_hp2).multiplyScalar(0.5).add(_a.set(Math.sin(p.face) * 0.12, 0.04, Math.cos(p.face) * 0.12));
}
// 防守者有沒有擋在投籃的人和籃框之間（越近干擾越大）
function contest(p, x = p.x, z = p.z) {
  let c = 0; const hx = HOOP.x - x, hz = HOOP.z - z, hl = Math.hypot(hx, hz) || 1;
  for (const q of oppsOf(p)) {
    if (q.stun > 0) continue;
    const dx = q.x - x, dz = q.z - z, d = Math.hypot(dx, dz);
    if (d > 1.8) continue;
    const front = (dx * hx + dz * hz) / (d * hl || 1);   // 1 = 正前方
    c = Math.max(c, (1.8 - d) / 1.8 * (0.55 + 0.45 * Math.max(0, front)) * (q.y > 0.2 ? 1.25 : 1));
  }
  return c;
}
function shotProb(p, x = p.x, z = p.z, lay = false) {
  const d = hoopDist(x, z), three = isThree(x, z);
  let b = lay ? 0.76 : d < 3 ? 0.6 : !three ? 0.5 : Math.max(0.08, 0.42 - Math.max(0, d - 6) * 0.07);
  b -= contest(p, x, z) * (lay ? 0.5 : 0.38);
  if (!lay && Math.hypot(p.vx, p.vz) > 2.5) b -= 0.06;
  b *= p.def.sht * (p.team === 1 ? dif().shot : 1);
  if (S.buff[p.team].vivi > 0) b += 0.35;
  return THREE.MathUtils.clamp(b, 0.04, 0.97);
}
function clearPoint(p) {
  const dx = p.x - HOOP.x, dz = p.z - HOOP.z, l = Math.hypot(dx, dz) || 1;
  if (Math.abs(p.x) > CORNER_X - 0.3 && p.z < 3) return { x: Math.sign(p.x) * (CORNER_X + 0.7), z: p.z };
  const r = ARC_R + 0.8; return { x: HOOP.x + dx / l * r, z: Math.max(HOOP.z + 1.8, HOOP.z + dz / l * r) };
}

// ---------- 拿球、傳球、投籃 ----------
function gainBall(p, how) {
  const prev = S.poss;
  B.mode = 'held'; B.owner = p; B.recv = null; p.holdT = 0; p.aiT = 0.25;
  if (prev !== p.team) {
    S.poss = p.team; S.mustClear = how !== 'check' && !isThree(p.x, p.z); S.onBall = [null, null];
    for (const q of oppsOf(p)) q.stealCd = Math.max(q.stealCd, 1.0);   // 剛換球權，對手先不能馬上抄回去
    if (p.team === 1 && S.ctrl) { const mine = teamOf(0).filter(q => !busy(q)); if (mine.length) S.ctrl = mine.sort((a, b) => dist2(a, p) - dist2(b, p))[0]; }
  } else if (S.mustClear && isThree(p.x, p.z)) S.mustClear = false;
  if (p.team === 0) S.ctrl = p;
}
function loseBall(vel) {
  B.mode = 'loose'; B.owner = null; B.vel.copy(vel);
}
function doPass(p, to, opt = {}) {
  if (!holding(p) || !to) return;
  const coffee = S.buff[p.team].coffee > 0;
  let recv = to;
  if (!opt.sure && !coffee) {
    // 傳球路線上有人就可能被抄
    const ax = p.x, az = p.z, bx = to.x + to.vx * 0.3, bz = to.z + to.vz * 0.3, L = Math.hypot(bx - ax, bz - az) || 1;
    for (const q of oppsOf(p)) {
      if (q.stun > 0 || busy(q)) continue;
      const t = ((q.x - ax) * (bx - ax) + (q.z - az) * (bz - az)) / (L * L);
      if (t < 0.15 || t > 0.9) continue;
      const dd = Math.hypot(ax + (bx - ax) * t - q.x, az + (bz - az) * t - q.z);
      if (dd < 0.6 && Math.random() < 0.45 * q.def.stl * (S.buff[q.team].coffee > 0 ? 1.6 : 1)) { recv = q; break; }
    }
  }
  B.mode = 'pass'; B.owner = null; B.recv = recv; B.passer = p; B.t = 0; B.p0.copy(B.pos);
  const d = dist2(p, to);
  B.T = opt.T ?? (coffee ? 0.1 + d / 45 : 0.12 + d / CFG.passSpeed); B.arc = opt.arc ?? 0.15 + d * 0.03; B.alley = !!opt.alley;
  p.pickCd = 0.35; p.act = { type: 'pass', t: 0 };
  S.lastPass = { from: p, t: S.t };
  fx.sfx.pass();
}
function startShot(p, user = false) {
  if (!holding(p)) return;
  if (user && !G.auto && hoopDist(p.x, p.z) >= 1.9) S.meter = { p, res: null, hideAt: 0 };
  const d = hoopDist(p.x, p.z);
  if (d < 1.9) {   // 上籃／灌籃
    const dunk = p.key === 'jie' || Math.random() < 0.45;
    const fx_ = HOOP.x + (p.x - HOOP.x) / (d || 1) * 0.42, fz = Math.max(HOOP.z + 0.25, HOOP.z + (p.z - HOOP.z) / (d || 1) * 0.42);
    p.act = { type: 'lay', t: 0, sx: p.x, sz: p.z, tx: fx_, tz: fz, dunk, rel: false };
  } else {
    p.act = { type: 'shoot', t: 0, sx: p.x, sz: p.z, rel: false, hold: user && !G.auto, relAt: user && !G.auto ? 9 : rand(0.25, 0.31) };
    p.vy = CFG.jumpV; p.y = 0.01;
  }
  p.face = Math.atan2(HOOP.x - p.x, HOOP.z - p.z);
  fx.sfx.jump();
  // 電腦防守者看到投籃會起跳蓋帽
  for (const q of oppsOf(p)) if ((q !== S.ctrl || G.auto) && q.stun <= 0 && !busy(q) && dist2(q, p) < 1.9 && Math.random() < 0.5 * q.def.blk * (q.team === 1 ? dif().block : 1)) q.blockIn = rand(0.04, 0.16);
}
function releaseShot(p, opt = {}) {
  if (!holding(p)) return;
  const a = p.act, lay = a.type === 'lay', sx = a.sx ?? p.x, sz = a.sz ?? p.z;
  let pts = opt.pts ?? (isThree(sx, sz) ? 3 : 2);
  // 蓋火鍋
  if (!opt.sure) for (const q of oppsOf(p)) {
    if (q.stun > 0 || q.y < 0.25 || dist2(q, p) > 1.2) continue;
    if (Math.random() < CFG.blockP * q.def.blk * (q.blockBoost || 1)) {
      const dx = p.x - HOOP.x, dz = p.z - HOOP.z, l = Math.hypot(dx, dz) || 1;
      handsPos(p, B.pos); loseBall(V(dx / l * 4 + rand(-1.5, 1.5), 2.5, dz / l * 4));
      log(`block ${q.key}`); fx.sfx.block(); fx.floatText(V(q.x, q.y + 2.2, q.z), '蓋火鍋！', '#3f7fd9', 1.1); fx.camKick(0.6); cam.shake = 0.2;
      addGauge(q, CFG.gBlock); slow(0.35, 0.5);
      return;
    }
  }
  let prob = opt.sure ? 1 : shotProb(p, sx, sz, lay);
  if (a.type === 'shoot' && a.press != null) prob = THREE.MathUtils.clamp(prob + timingBonus(p, a.press), 0.03, 0.98);
  let make = Math.random() < prob;
  const wall = !opt.sure && S.buff[1 - p.team].wall > 0;
  if (wall) make = false;   // 阿哲的防火牆：對手一般投籃全部擋掉
  B.mode = 'shot'; B.owner = null; B.shooter = p; B.make = make; B.pts = pts; B.sure = !!opt.sure; B.t = 0; B.lay = lay;
  handsPos(p, B.p0); B.pos.copy(B.p0);
  const big = C.rimGroup.scale.x;
  if (make) B.p1.set(HOOP.x, HOOP.y + 0.08, HOOP.z);
  else { const ang = rand(0, Math.PI * 2); B.p1.set(HOOP.x + Math.sin(ang) * HOOP.r * big, HOOP.y + 0.05, HOOP.z + Math.cos(ang) * HOOP.r * big); B.missAng = ang; }
  const d = B.p0.distanceTo(B.p1);
  B.T = lay ? 0.22 + d * 0.08 : opt.T ?? (0.5 + d * 0.075);
  const g = -14;
  B.g = g; B.v0.copy(B.p1).sub(B.p0).addScaledVector(V(0, g, 0), -0.5 * B.T * B.T).divideScalar(B.T);
  S.reb = true; B.wall = wall;
  fx.sfx.shoot();
}
function meterResult(r) { if (S.meter) { S.meter.res = r; S.meter.hideAt = performance.now() + 650; } }
const _mv = new THREE.Vector3();
function updateMeter() {
  const el = $('meter'), m = S.meter;
  if (!m || (m.hideAt && performance.now() > m.hideAt) || S.mode !== 'play') { if (el.className) el.className = ''; if (m && m.hideAt) S.meter = null; return; }
  const p = m.p, a = p.act, t = a && a.type === 'shoot' ? (a.press ?? a.t) : 0.62, T = 0.62, w = 0.045 * dif().green;
  el.className = 'on' + (m.res ? ' ' + m.res : '');
  el.querySelector('.f').style.height = Math.min(100, t / T * 100) + '%';
  const g = el.querySelector('.g'); g.style.bottom = ((PEAK - w) / T * 100) + '%'; g.style.height = (2 * w / T * 100) + '%';
  _mv.set(p.x, p.y + 1.0, p.z).project(camera);
  el.style.left = ((_mv.x + 1) / 2 * innerWidth + 34) + 'px'; el.style.top = ((1 - _mv.y) / 2 * innerHeight) + 'px';
}
// 投籃時機：跳到最高點（約 0.3 秒）放開最準。回傳命中率加減
const PEAK = 0.3;
function timingBonus(p, t) {
  const w = 0.045 * dif().green, e = Math.abs(t - PEAK);
  let bonus, txt, col;
  if (e < w) { bonus = 0.2; txt = '完美出手！'; col = '#36c35d'; fx.sfx.full(); }
  else if (e < w * 2.2) { bonus = 0.05; txt = '不錯'; col = '#3fa7ff'; }
  else { bonus = -Math.min(0.15, (e - w * 2.2) * 1.2); txt = t < PEAK ? '太早了' : '太晚了'; col = '#e0413b'; }
  fx.floatText(V(p.x, p.y + 2.3, p.z), txt, col, 0.75);
  meterResult(e < w ? 'perfect' : e < w * 2.2 ? 'good' : 'bad');
  return bonus;
}
function startBlock(p) {
  p.act = { type: 'block', t: 0 }; p.vy = CFG.blockV; p.y = 0.01; fx.sfx.jump();
  // 玩家按蓋帽：自動往附近正在出手的對手撲過去（手感比較好）
  if (p === S.ctrl && !G.auto) {
    const sh = oppsOf(p).filter(q => q.act && (q.act.type === 'shoot' || q.act.type === 'lay') && dist2(q, p) < 2.4).sort((a, b) => dist2(a, p) - dist2(b, p))[0];
    if (sh) { const d = dist2(sh, p) || 1; p.vx = (sh.x - p.x) / d * 3.2; p.vz = (sh.z - p.z) / d * 3.2; p.face = Math.atan2(sh.x - p.x, sh.z - p.z); p.blockBoost = 1.2; }
  }
}
function startSteal(p) {
  if (p.stealCd > 0) return;
  p.stealCd = CFG.stealCd; p.act = { type: 'steal', t: 0, done: false };
  const h = B.mode === 'held' ? B.owner : null;
  if (h && h.team !== p.team) p.face = Math.atan2(h.x - p.x, h.z - p.z);
}
function resolveSteal(p) {
  const h = B.mode === 'held' ? B.owner : null, coffee = S.buff[p.team].coffee > 0;
  if (h && h.team !== p.team && dist2(p, h) < CFG.stealR * (coffee ? 1.35 : 1) && !busy(h)) {
    const low = (B.dribH ?? 1) < 0.45;   // 球彈在地上的時候最好抄
    const ch = CFG.stealP * p.def.stl * (coffee ? 1.8 : 1) * (p.team === 0 ? 1.15 : 1) * (h.stun > 0 ? 3 : 1) * (low ? 1.6 : 0.8);
    if (Math.random() < ch) {
      gainBall(p, 'steal'); log(`steal ${p.key}`); fx.sfx.steal(); fx.floatText(V(p.x, 2.3, p.z), '抄截！', TEAM_COLOR[p.team], 1);
      addGauge(p, CFG.gSteal); h.pickCd = 0.5; return;
    }
  } else if (B.mode === 'loose' && Math.hypot(B.pos.x - p.x, B.pos.z - p.z) < 1.1 && B.pos.y < 1.7) { gainBall(p, 'loose'); fx.sfx.catch(); return; }
  fx.sfx.whiff();
  if (p === S.ctrl) fx.floatText(V(p.x, 2.1, p.z), h && dist2(p, h) < CFG.stealR ? '撲空' : '太遠了', '#8a97a8', 0.6);
}

// ---------- 得分 ----------
function addGauge(p, n) {
  const was = p.gauge; p.gauge = Math.min(100, p.gauge + n);
  if (was < 100 && p.gauge >= 100) { if (p.team === 0) { fx.sfx.full(); fx.toast(`⚡ ${p.def.name}的大招「${p.def.sp.name}」集滿了！`); } p.spWait = rand(0.6, 2.5); }
}
function scored(p, pts, kind) {
  const t = p.team;
  if (S.buff[t].viviNext) { pts = Math.max(pts, 3); S.buff[t].viviNext = false; fx.floatText(V(HOOP.x, HOOP.y + 1.4, HOOP.z), '👑 老闆說算 3 分', '#d9a63a', 1); }
  if (S.buff[t].viral > 0) { pts += 1; fx.floatText(V(HOOP.x, HOOP.y + 1.7, HOOP.z), '❤️ 爆紅加成 +1', '#ff4fa0', 0.9); }
  S.score[t] += pts; p.pts += pts; log(`score ${p.key} +${pts} ${kind} → ${S.score}`);
  addGauge(p, CFG.gScore);
  if (S.lastPass && S.lastPass.from.team === t && S.lastPass.from !== p && S.t - S.lastPass.t < 4) addGauge(S.lastPass.from, CFG.gAssist);
  bumpScore(t, '+' + pts);
  fx.floatText(V(HOOP.x, HOOP.y + 0.9, HOOP.z + 0.3), '+' + pts, TEAM_COLOR[t], 1.5);
  if (kind === 'dunk') fx.banner('灌籃！', `${p.def.name} +${pts}`, 0, TEAM_COLOR[t]);
  else if (pts >= 3) fx.banner(`${p.def.name} 三分球！`, '', 3, TEAM_COLOR[t]);
  (pts >= 3 ? fx.sfx.score3 : fx.sfx.score)(); fx.sfx.cheer(t === 0 ? 0.4 : 0.22);
  fx.confetti(V(HOOP.x, HOOP.y, HOOP.z + 0.3), pts >= 3 || kind === 'dunk' ? 70 : 30, 0.8);
  p.cheer = 1.8; for (const c of crowd) c.cheer = rand(1, 2);
  S.phase = 'score'; S.phaseT = 1.8; S.nextPoss = 1 - t;
  if (S.score[t] >= CFG.target || S.buzzer || S.sudden) S.endAfter = true;
}
function bumpScore(t, txt) {
  const el = $(t ? 'scB' : 'scA'); el.textContent = S.score[t]; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  const r = el.getBoundingClientRect(), s = document.createElement('div');
  s.className = 'pts'; s.textContent = txt; s.style.color = txt[0] === '-' ? '#e0413b' : TEAM_COLOR[t];
  s.style.left = (r.left + r.width / 2 - 14) + 'px'; s.style.top = (r.bottom + 2) + 'px'; $('hud').appendChild(s); setTimeout(() => s.remove(), 1500);
}
// 換球權：進攻方在三分線外弧頂發球，其他人站好位置
function formation(off) {
  const o = teamOf(off), d = teamOf(1 - off);
  const h = off === 0 && S.ctrl && S.ctrl.team === 0 ? S.ctrl : o[Math.floor(Math.random() * o.length)];
  const side = Math.random() < 0.5 ? -1 : 1;
  const F = new Map();
  // 進攻：持球在弧頂，其他人站兩翼、底角；防守：一人盯球，其他人退到自己盯的人和籃框中間
  const OFF = [{ x: TOP.x, z: TOP.z }, { x: side * 3.6, z: 5.6 }, { x: -side * 4.6, z: 1.6 }];
  const DEF = [{ x: 0, z: TOP.z - 1.3 }, { x: side * 2.8, z: 4.6 }, { x: -side * 3.4, z: 1.8 }];
  [h, ...o.filter(q => q !== h)].forEach((q, i) => F.set(q, OFF[i]));
  const g = d.sort((a, b) => dist2(a, h) - dist2(b, h));
  g.forEach((q, i) => F.set(q, DEF[i]));
  return { h, F };
}
function checkBall() {
  const { h, F } = formation(S.nextPoss);
  for (const [p, f] of F) { p.form = f; p.x = f.x; p.z = f.z; p.y = 0; p.vy = 0; p.vx = p.vz = 0; p.act = null; p.face = Math.atan2(HOOP.x - p.x, HOOP.z - p.z); }
  S.poss = h.team; S.mustClear = false;
  gainBall(h, 'check'); S.onBall = [null, null];
  S.phase = 'check'; S.phaseT = 0.9;
  fx.sfx.whistle();
  fx.toast(h.team === 0 ? '🏀 我方球權' : '🛡️ 對手球權，回防！');
}

// ---------- 大招 ----------
function teamHasBall(t) { return (B.mode === 'held' && B.owner.team === t) || (B.mode === 'pass' && B.recv && B.recv.team === t && B.passer.team === t); }
function specialBlock(p) {
  if (p.gauge < 100) return `大招還沒集滿（${Math.floor(p.gauge)}%）`;
  if (S.phase !== 'play' || S.cut) return '現在不能放大招';
  if (p.stun > 0) return '暈頭轉向中…';
  if (busy(p)) return '';
  if (p.def.sp.need === true) {
    if (!(B.mode === 'held' && B.owner.team === p.team)) return `「${p.def.sp.name}」要我方持球才能用`;
    if (busy(B.owner)) return '';
    if (p.key === 'yan' && !alleyMate(p)) return '隊友現在接不到';
  }
  if (p.def.sp.need === 'opp' && !(B.mode === 'held' && B.owner.team !== p.team) && B.mode !== 'loose') return `「${p.def.sp.name}」要對手持球才能用`;
  if (p.key === 'heilun' && (B.mode === 'net' || B.mode === 'dead')) return '';
  return null;
}
// 空中接力的人：沒在忙、沒被暈的隊友裡最好的
function alleyMate(p) {
  const ok = teamOf(p.team).filter(q => q !== p && !busy(q) && q.stun <= 0);
  return ok.sort((a, b) => hoopDist(a.x, a.z) - hoopDist(b.x, b.z))[0] || null;
}
function startSpecial(p) {
  if (specialBlock(p) !== null) return false;
  p.gauge = 0; S.cut = { p, t: 0 }; S.ts = 0.06; log(`special ${p.key}`);
  const el = $('cutin'), band = el.querySelector('.band');
  band.style.setProperty('--cc', p.def.color);
  el.querySelector('.face').style.backgroundImage = `url(${FACE[p.key]})`;
  el.querySelector('.who').textContent = `${p.team === 0 ? '我方' : '對手'}　${p.def.role} ${p.def.name}`;
  el.querySelector('.sp').textContent = p.def.sp.name;
  el.querySelector('.q').textContent = '「' + p.def.quote.replace(/\p{Extended_Pictographic}|\uFE0F/gu, '').trim() + '」';
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  fx.sfx.cutin(); cam.zoom = 0.82;
  return true;
}
// 把球交給 p（隊友持球就快速傳過去）
function ensureBall(p) {
  if (holding(p)) return;
  if (B.mode === 'held' && B.owner.team === p.team) { B.owner.act = null; doPass(B.owner, p, { sure: true, T: 0.16, arc: 0.3 }); }
}
function addIcon(p, emoji, life, y = 2.15, size = 0.55) {
  const s = emojiSprite(emoji, size); scene.add(s); const ic = { s, life, y, shake: emoji === '📞' }; p.icons.push(ic); return ic;
}
function doSpecial(p) {
  const t = p.team, opp = players.filter(q => q.team !== t), col = new THREE.Color(p.def.color).getHex();
  if (!['jie', 'yan'].includes(p.key)) fx.pillar(V(p.x, 0, p.z), col, 0.9, 5);   // 有特寫鏡頭的大招不放光柱（鏡頭太近會整片糊掉）
  fx.shockwave(V(p.x, 0, p.z), col, 5);
  switch (p.key) {
    case 'kui':
      S.buff[t].coffee = CFG.coffee; fx.sfx.power();
      for (const q of teamOf(t)) addIcon(q, '☕', CFG.coffee, 2.2, 0.45);
      fx.banner('☕ 咖啡衝刺！', '全隊加速、傳球秒到', 0, p.def.color);
      break;
    case 'jie':
      ensureBall(p);
      p.act = { type: 'jdunk', t: 0, sx: p.x, sz: p.z, pts: isThree(p.x, p.z) ? 3 : 2, slam: false, paper: 0 };
      sideCam(p.x, p.z, 2.6);
      fx.banner('📐 設計稿灌籃！', '這稿一次就過', 0, p.def.color);
      break;
    case 'mi':
      fx.sfx.ring(); setTimeout(() => fx.sfx.ring(), 500); setTimeout(() => fx.sfx.ring(), 1000);
      for (const q of opp) {
        q.stun = CFG.stun; q.act = null; addIcon(q, '📞', CFG.stun, 2.25, 0.6);
        fx.shockwave(V(q.x, 0, q.z), 0xb46bff, 2.5);
        if (holding(q)) { loseBall(V(rand(-2, 2), 3.5, rand(-2, 2))); q.pickCd = CFG.stun; fx.floatText(V(q.x, 2.4, q.z), '掉球！', '#b46bff', 1); }
      }
      fx.banner('📞 總機干擾！', '對手電話接不完，暈 3 秒', 0, p.def.color);
      break;
    case 'vivi':
      S.buff[t].vivi = CFG.vivi; S.buff[t].viviNext = true; fx.sfx.boss();
      addIcon(p, '👑', CFG.vivi, 2.25, 0.6);
      fx.pillar(V(HOOP.x, 0, HOOP.z), 0xffd76a, 1.2, 6);
      fx.banner('👑 老闆說了算！', '籃框變大、下一球算 3 分', 0, p.def.color);
      break;
    case 'kevin':
      ensureBall(p);
      p.act = { type: 'ai', t: 0, sx: p.x, sz: p.z, pts: isThree(p.x, p.z) ? 3 : 2, rel: false };
      kevinFx(p);
      KV.zoom = 2.4;   // 不切特寫：正常鏡頭就看得到瞄準環和雷射，稍微拉近
      fx.banner('🤖 這個用 AI 就好', 'AI 計算中…命中率 100%', 0, p.def.color);
      break;
    case 'yan': {
      const m = alleyMate(p);
      ensureBall(p);
      for (const q of opp) { q.stun = 1.8; q.act = null; addIcon(q, '📄', 1.8, 2.2, 0.5); }
      const side = m.x < 0 ? -1 : 1;
      m.act = { type: 'alley', t: 0, fx: m.x, fz: m.z, sx: HOOP.x + side * 1.0, sz: HOOP.z + 1.1, ph: 'dash', jt: 0, slam: false };
      p.act = { type: 'lob', t: 0, to: m };
      sideCam(m.x, m.z, 2.4);
      fx.banner('📋 PM 急件！', '空中接力，今天就要！', 0, p.def.color);
      break;
    }
    case 'heilun': {
      const o = 1 - t, take = Math.min(2, S.score[o]);
      S.score[o] -= take; S.score[t] += take; p.pts += take;
      if (take) { bumpScore(o, '-' + take); bumpScore(t, '+' + take); }
      fx.sfx.cash();
      for (const q of opp) { fx.confetti(V(q.x, 1.2, q.z), 30, 0.7); fx.floatText(V(q.x, 2.3, q.z), '業績被抽成', '#36a35d', 0.8); }
      if (!holding(p)) {
        if (B.owner) { B.owner.act = null; B.owner.pickCd = 0.8; }
        B.mode = 'pass'; B.owner = null; B.recv = p; B.passer = p; B.t = 0; B.p0.copy(B.pos); B.T = 0.55; B.arc = 1.6; B.alley = false; B.cash = 0;
      }
      addIcon(p, '💰', 2.5, 2.25, 0.55);
      fx.banner('🤝 業務抽成！', take ? `業績算我的：對手 -${take}、我方 +${take}` : '球是我的！', 0, p.def.color);
      if (S.score[t] >= CFG.target) { S.endAfter = true; S.phase = 'score'; S.phaseT = 1.6; }
      break;
    }
    case 'de':   // 預算砍半：對手跑速減半 6 秒，大招集氣砍一半
      S.buff[1 - t].slow = CFG.slow; fx.sfx.stun();
      for (const q of opp) { q.gauge *= 0.5; addIcon(q, '📉', CFG.slow, 2.2, 0.5); fx.floatText(V(q.x, 2.4, q.z), '預算砍半', '#6b7a8f', 0.8); }
      fx.banner('📉 預算砍半！', '對手變慢、大招集氣砍一半', 0, p.def.color);
      break;
    case 'momo':   // 爆紅貼文：8 秒內我方每次進球多 1 分，隊友大招 +25%
      S.buff[t].viral = CFG.viral; fx.sfx.boss();
      for (const q of teamOf(t)) { if (q !== p) addGauge(q, 25); addIcon(q, '❤️', CFG.viral, 2.2, 0.45); }
      for (const c of crowd) c.cheer = CFG.viral;
      heartRain(t);
      fx.banner('📱 爆紅貼文！', '8 秒內進球都多 1 分', 0, p.def.color);
      break;
    case 'zhe':   // 防火牆：7 秒內對手一般投籃全部擋掉
      S.buff[t].wall = CFG.wall; fx.sfx.laser();
      fx.shockwave(V(HOOP.x, 0, HOOP.z), 0x5fd0ff, 6);
      fx.banner('🛡️ 防火牆啟動！', '對手投籃全部擋下 7 秒', 0, p.def.color);
      break;
    case 'zhen': {   // 現場稽核：衝到持球的對手面前把球拿走，對手愣住
      const h = B.mode === 'held' && B.owner.team !== t ? B.owner : null;
      const tx = h ? h.x : B.pos.x, tz = h ? h.z : B.pos.z;
      p.act = { type: 'audit', t: 0, fx: p.x, fz: p.z, tx: tx - Math.sin(p.face) * 0.4, tz: tz - Math.cos(p.face) * 0.4, h };
      fx.banner('🔍 現場稽核！', '這張發票有問題，球沒收', 0, p.def.color);
      break;
    }
  }
  // 招牌動作：站著擺姿勢的大招鎖 1 秒多；灌籃、接力、AI 投籃在各自的動作裡播
  if (['kui', 'mi', 'vivi', 'heilun', 'de', 'momo', 'zhe'].includes(p.key)) playSig(p, { lock: true });
  else if (p.key === 'kevin') playSig(p);
}
// 愛心從天上掉下來（爆紅貼文）
function heartRain(t) {
  let n = 0;
  const tick = () => { if (n++ > 24 || S.mode !== 'play') return; const s = emojiSprite(n % 3 ? '❤️' : '👍', 0.5); s.position.set(rand(-5, 5), 5, rand(1, 9)); scene.add(s); let vt = 0;
    fxPush(dt => { vt += dt; s.position.y -= dt * 2.6; s.material.rotation += dt; if (s.position.y < 0.3 || vt > 3) { scene.remove(s); s.material.dispose(); return false; } return true; });
    setTimeout(tick, 120); };
  tick(); fx.sfx.cheer(0.45);
}
// Kevin 的 AI：無人機、瞄準環、雷射
const KV = { drone: null, reticle: null, laser: null, t: 0, p: null, zoom: 0 };
function kevinFx(p) {
  if (!KV.drone) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.34), mat(0x2c3e57)); g.add(body);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: 0x5fd0ff, toneMapped: false })); eye.position.set(0, -0.04, 0.17); g.add(eye);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.015, 16), new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.6 })); r.position.set(x * 0.2, 0.06, z * 0.2); g.add(r); }
    KV.drone = g;
    const rt = canvasTex(256, 256, (c, W) => { c.strokeStyle = '#5fd0ff'; c.lineWidth = 10; c.beginPath(); c.arc(W / 2, W / 2, W * 0.4, 0, Math.PI * 2); c.stroke(); c.lineWidth = 6; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; c.beginPath(); c.moveTo(W / 2 + Math.cos(a) * W * 0.28, W / 2 + Math.sin(a) * W * 0.28); c.lineTo(W / 2 + Math.cos(a) * W * 0.48, W / 2 + Math.sin(a) * W * 0.48); c.stroke(); } c.fillStyle = '#5fd0ff'; c.font = `900 26px ${FONT}`; c.textAlign = 'center'; c.fillText('LOCK', W / 2, W / 2 + 9); });
    KV.reticle = new THREE.Sprite(new THREE.SpriteMaterial({ map: rt, transparent: true, depthTest: false, toneMapped: false, blending: THREE.AdditiveBlending })); KV.reticle.renderOrder = 16;
    KV.laser = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0x5fd0ff, transparent: true, opacity: 0.8, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false }));
  }
  scene.add(KV.drone, KV.reticle, KV.laser); KV.t = 0; KV.p = p; KV.on = true;
  fx.sfx.laser();
}
function updateKevinFx(dt, t) {
  if (!KV.on) return;
  KV.t += dt; const p = KV.p;
  { const dx = HOOP.x - p.x, dz = HOOP.z - p.z, l = Math.hypot(dx, dz) || 1; KV.drone.position.set(p.x + dx / l * 0.7 + dz / l * 0.5, p.y + 1.9 + Math.sin(t * 6) * 0.08, p.z + dz / l * 0.7 - dx / l * 0.5); KV.drone.rotation.y = Math.atan2(dx, dz); }
  KV.drone.children.forEach((c, i) => { if (i > 1) c.rotation.y += dt * 30; });
  const k = Math.min(1, KV.t / 0.8);
  KV.reticle.position.set(HOOP.x, HOOP.y + 0.1, HOOP.z); KV.reticle.scale.setScalar(2.2 - 1.3 * k); KV.reticle.material.rotation += dt * 4 * (1 - k * 0.8);
  KV.reticle.material.opacity = KV.t > 1.6 ? Math.max(0, 1 - (KV.t - 1.6) * 3) : 1;
  const a = KV.drone.position, b = _hp.set(HOOP.x, HOOP.y + 0.1, HOOP.z), l = a.distanceTo(b);
  KV.laser.position.copy(a).add(b).multiplyScalar(0.5); KV.laser.scale.set(1, l, 1);
  KV.laser.quaternion.setFromUnitVectors(_a.set(0, 1, 0), _hp2.copy(b).sub(a).normalize());
  KV.laser.material.opacity = (KV.t < 1.3 ? 0.5 + 0.4 * Math.sin(t * 40) : Math.max(0, 0.8 - (KV.t - 1.3) * 3));
  if (KV.t > 2.2) { scene.remove(KV.drone, KV.reticle, KV.laser); KV.on = false; }
}

// ---------- 黑財神（剩 1 分鐘時坐雲飄過來撒元寶，撿到大招集氣） ----------
const CAI = { g: null, actor: null, on: false, t: 0, drops: [], bubble: null };
function buildCaishen() {
  const g = new THREE.Group();
  for (const [x, y, z, r] of [[0, 0, 0, 0.55], [-0.55, -0.05, 0.1, 0.42], [0.55, -0.05, 0.05, 0.45], [-0.25, 0.1, -0.3, 0.4], [0.3, 0.12, -0.25, 0.42], [0, -0.15, 0.35, 0.4]]) {
    const s = sphere(r, 0xffffff, x, y, z, g, { roughness: 1, emissive: 0xbfdfff, emissiveIntensity: 0.25 }); s.scale.y = 0.65; s.castShadow = false;
  }
  const a = makeActor(K.caishen, 1.4); a.action?.setEffectiveWeight(1); a.root.position.set(0, 0.32, 0); a.root.rotation.x = -0.25; g.add(a.root);
  CAI.actor = a;
  CAI.bubble = labelSprite('恭喜發財！撿元寶集大招～', { bg: '#d9a63a', size: 0.32 }); CAI.bubble.position.set(0, 2.2, 0); g.add(CAI.bubble);
  g.visible = false; scene.add(g); CAI.g = g;
}
const ingotMat = () => mat(0xffc93c, { metalness: 0.75, roughness: 0.25, emissive: 0x8a5a00, emissiveIntensity: 0.3 });
function makeIngot() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10), ingotMat()); base.scale.set(1.4, 0.55, 0.85); g.add(base);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), ingotMat()); top.position.y = 0.1; g.add(top);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), ingotMat()); w.position.set(s * 0.22, 0.08, 0); w.scale.set(1, 0.8, 1.2); g.add(w); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function startCaishen() {
  CAI.on = true; CAI.t = 0; CAI.g.visible = true; CAI.dropped = 0;
  fx.banner('🧧 黑財神駕到！', `撿元寶，大招 +${CFG.gIngot}%`, 0, '#d9a63a'); fx.sfx.boss();
}
function updateCaishen(dt, t) {
  if (CAI.on) {
    CAI.t += dt; const k = CAI.t / 9;
    CAI.g.position.set(-10 + 20 * k, 3.4 + Math.sin(t * 1.5) * 0.15, 3.6);
    CAI.actor.mixer.update(dt);
    if (CAI.dropped < 3 && CAI.t > 2 + CAI.dropped * 1.6) {
      CAI.dropped++;
      const m = makeIngot(), x = rand(-4.5, 4.5), z = rand(2.2, 8.5);
      m.position.copy(CAI.g.position); scene.add(m);
      CAI.drops.push({ m, x, z, vy: 0, landed: false, life: 9, from: CAI.g.position.clone(), ft: 0 });
      fx.sfx.coin();
    }
    if (CAI.t > 9) { CAI.on = false; CAI.g.visible = false; }
  }
  for (let i = CAI.drops.length - 1; i >= 0; i--) {
    const d = CAI.drops[i], m = d.m;
    if (!d.landed) {
      d.ft = Math.min(1, d.ft + dt / 0.9);
      m.position.set(d.from.x + (d.x - d.from.x) * d.ft, d.from.y * (1 - d.ft * d.ft) + 0.12, d.from.z + (d.z - d.from.z) * d.ft);
      m.rotation.y += dt * 6;
      if (d.ft >= 1) { d.landed = true; fx.puff(V(d.x, 0.1, d.z), 0xffe08a); }
      continue;
    }
    m.rotation.y += dt * 2; m.position.y = 0.16 + Math.sin(t * 4 + i) * 0.05;
    if (Math.random() < dt * 4) fx.sparkle(V(d.x + rand(-0.3, 0.3), 0.4 + Math.random() * 0.4, d.z), 0xffe08a, 0.25);
    d.life -= dt;
    const got = S.phase === 'play' && players.find(p => p.stun <= 0 && Math.hypot(p.x - d.x, p.z - d.z) < 0.6 && p.y < 0.5);
    if (got || d.life <= 0) {
      if (got) { addGauge(got, CFG.gIngot); fx.sfx.ingot(); fx.floatText(V(d.x, 1.8, d.z), `${got.def.name} 大招 +${CFG.gIngot}%`, '#d9a63a', 0.9); fx.confetti(V(d.x, 0.4, d.z), 20, 0.5); }
      scene.remove(m); CAI.drops.splice(i, 1);
    }
  }
}

// ---------- 三分線提示（搶到球要帶出去時發光） ----------
let arcLine = null, arcFlash = 0;
function buildArc() {
  const pts = [], zc = HOOP.z + Math.sqrt(ARC_R * ARC_R - CORNER_X * CORNER_X);
  for (let z = 0; z <= zc; z += 0.25) pts.push([-CORNER_X, z]);
  const a0 = Math.atan2(zc - HOOP.z, -CORNER_X), a1 = Math.atan2(zc - HOOP.z, CORNER_X);
  for (let i = 0; i <= 40; i++) { const a = a0 + (a1 - a0) * i / 40; pts.push([HOOP.x + Math.cos(a) * ARC_R, HOOP.z + Math.sin(a) * ARC_R]); }
  for (let z = zc; z >= 0; z -= 0.25) pts.push([CORNER_X, z]);
  const pos = [], idx = [];
  pts.forEach(([x, z], i) => {
    const [px, pz] = pts[Math.max(0, i - 1)], [nx, nz] = pts[Math.min(pts.length - 1, i + 1)];
    let dx = nx - px, dz = nz - pz; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    pos.push(x - dz * 0.1, 0.02, z + dx * 0.1, x + dz * 0.1, 0.02, z - dx * 0.1);
    if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  arcLine = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  arcLine.renderOrder = 1; scene.add(arcLine);
}
function flashArc() { arcFlash = 1.2; }

// ---------- AI ----------
const SPOTS = [[-4.9, 0.9], [4.9, 0.9], [-4.4, 4.8], [4.4, 4.8], [0, 6.5], [-2.7, 6.3], [2.7, 6.3], [-1.4, 2.0], [1.4, 2.0], [-2.9, 3.0], [2.9, 3.0]];
function goTo(p, x, z, mul = 1) {
  const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz);
  const sp = speedOf(p) * mul * Math.min(1, d / 0.5);
  if (d < 0.08) { p.dvx = p.dvz = 0; return true; }
  p.dvx = dx / d * sp; p.dvz = dz / d * sp; return false;
}
function speedOf(p) {
  return CFG.speed * p.def.spd * (S.buff[p.team].coffee > 0 ? 1.45 : 1) * (S.buff[p.team].slow > 0 ? 0.55 : 1) * (holding(p) ? CFG.handler : 1) * (p.team === 1 ? dif().speed : 1);
}
function think(p, dt) {
  p.dvx = p.dvz = 0;
  if (S.phase === 'score' || S.phase === 'check') {
    if (S.phase === 'score' && p.form === undefined) return;
    if (p.form && S.phase === 'score') goTo(p, p.form.x, p.form.z, 0.7);
    return;
  }
  if (S.phase !== 'play' || p.stun > 0 || busy(p)) return;
  if (p === S.ctrl && !G.auto) { const s = speedOf(p); p.dvx = inp.x * s; p.dvz = inp.z * s; return; }
  aiSpecial(p, dt);
  if (busy(p)) return;
  if (B.mode === 'loose') return aiLoose(p);
  if (B.mode === 'shot' || B.mode === 'net') {   // 搶籃板位置
    const dx = p.x - HOOP.x, dz = p.z - HOOP.z, l = Math.hypot(dx, dz) || 1, r = p.team === S.poss ? 2.0 : 1.5;
    return goTo(p, HOOP.x + dx / l * r, HOOP.z + Math.max(0.6, dz / l * r));
  }
  if (holding(p)) return aiHandler(p, dt);
  if (S.poss === p.team) return aiOffBall(p, dt);
  return aiDefend(p, dt);
}
function aiLoose(p) {
  const tx = B.pos.x + B.vel.x * 0.25, tz = B.pos.z + B.vel.z * 0.25;
  const mine = teamOf(p.team).sort((a, b) => Math.hypot(a.x - tx, a.z - tz) - Math.hypot(b.x - tx, b.z - tz));
  if (mine[0] === p || (p.team !== S.ctrl?.team && Math.hypot(p.x - tx, p.z - tz) < 2.5)) {
    goTo(p, tx, tz, 1.05);
    const d = Math.hypot(B.pos.x - p.x, B.pos.z - p.z);
    if (d < 0.9 && B.pos.y > 1.45 && B.pos.y < 2.7 && B.vel.y < 1 && p.y <= 0 && !p.act) { p.act = { type: 'block', t: 0 }; p.vy = CFG.blockV * 0.9; p.y = 0.01; }
  } else {
    const dx = tx - HOOP.x, dz = tz - HOOP.z, l = Math.hypot(dx, dz) || 1;
    goTo(p, tx - dx / l * 1.4, tz - dz / l * 1.4, 0.8);
  }
}
function aiHandler(p, dt) {
  p.holdT += dt;
  if (S.mustClear) {
    const c = clearPoint(p); goTo(p, c.x, c.z);
    const m = bestMate(p);
    if (m && p.holdT > 0.6 && isThree(m.x, m.z) && contest(m) < 0.2 && Math.random() < dt * 0.8) doPass(p, m);
    return;
  }
  p.aiT -= dt;
  if (p.aiT <= 0) {
    p.aiT = rand(0.22, 0.45);
    const d = hoopDist(p.x, p.z), lay = d < 1.9, prob = shotProb(p, p.x, p.z, lay);
    const m = bestMate(p), mp = !m || m.stun > 0 ? 0 : shotProb(m, m.x, m.z, hoopDist(m.x, m.z) < 1.9);
    const late = !S.sudden && S.clock < 2.5;
    if ((lay && (prob > 0.5 || p.holdT > 2.5)) || prob > 0.47 || (prob > 0.38 && Math.random() < 0.3) || (p.holdT > 2.5 && prob > 0.34) || p.holdT > 5.5 || late) { startShot(p); return; }
    if (mp > prob + 0.1 && p.holdT > 0.5 && Math.random() < 0.55) { doPass(p, m); return; }
    // 切入：往籃框走，前面有人就往旁邊閃
    let gx = HOOP.x - p.x, gz = HOOP.z + 0.6 - p.z; const gl = Math.hypot(gx, gz) || 1; gx /= gl; gz /= gl;
    let side = 0;
    for (const q of oppsOf(p)) { const dx = q.x - p.x, dz = q.z - p.z, dd = Math.hypot(dx, dz); if (dd < 1.6 && (dx * gx + dz * gz) / dd > 0.5) side = (dx * gz - dz * gx) > 0 ? 1 : -1; }
    const step = 2.2;
    p.goal = { x: THREE.MathUtils.clamp(p.x + gx * step + side * gz * 1.6, -5.6, 5.6), z: THREE.MathUtils.clamp(p.z + gz * step - side * gx * 1.6, 0.6, 9.5) };
    if (p.holdT < 0.8 && Math.random() < 0.3) p.goal = { x: rand(-4, 4), z: rand(4.5, 8) };   // 剛拿球先晃一下
  }
  if (p.goal) goTo(p, p.goal.x, p.goal.z, 0.95);
}
function aiOffBall(p, dt) {
  // 有元寶就順路撿
  const ing = CAI.drops.find(d => d.landed && Math.hypot(d.x - p.x, d.z - p.z) < 3.5);
  if (ing) return goTo(p, ing.x, ing.z);
  p.aiT2 -= dt;
  const h = B.mode === 'held' ? B.owner : B.recv;
  if (p.aiT2 <= 0 || !p.spot) {
    p.aiT2 = rand(1.4, 3);
    let best = null, bs = -1e9;
    for (const [x, z] of SPOTS) {
      let open = 9; for (const q of oppsOf(p)) open = Math.min(open, Math.hypot(q.x - x, q.z - z));
      let s = Math.min(open, 3) + Math.random() * 1.2 - Math.hypot(p.x - x, p.z - z) * 0.15;
      if (h && h !== p && Math.hypot(h.x - x, h.z - z) < 2.6) s -= 4;
      for (const q of teamOf(p.team)) if (q !== p && q !== h && q.spot && Math.hypot(q.spot.x - x, q.spot.z - z) < 2.4) s -= 3;   // 不要跟隊友擠同一個位置
      if (S.mustClear) s += isThree(x, z) ? 2 : -3;
      if (s > bs) { bs = s; best = { x, z }; }
    }
    p.spot = best;
  }
  goTo(p, p.spot.x, p.spot.z, 0.85);
}
function aiDefend(p, dt) {
  const ing = CAI.drops.find(d => d.landed && Math.hypot(d.x - p.x, d.z - p.z) < 2);
  if (ing) return goTo(p, ing.x, ing.z);
  const opps = oppsOf(p), h = B.mode === 'held' ? B.owner : B.mode === 'pass' ? B.recv : null;
  const mates = teamOf(p.team);
  let on = S.onBall[p.team];
  if (h && h.team !== p.team) {
    const near = mates.slice().sort((a, b) => dist2(a, h) - dist2(b, h))[0];
    if (!on || (near !== on && dist2(near, h) + 1.2 < dist2(on, h))) on = S.onBall[p.team] = near;
  }
  let man;
  if (h && h.team !== p.team) {
    if (p === on) man = h;
    else {   // 其他防守者：照順序各挑最近、還沒人盯的對手
      const free = opps.filter(q => q !== h), others = mates.filter(q => q !== on);
      for (const d of others) { const pick = free.sort((a, b) => dist2(a, d) - dist2(b, d))[0]; if (d === p) { man = pick; break; } free.splice(free.indexOf(pick), 1); }
    }
  }
  man = man || p.man || opps[mates.indexOf(p) % opps.length];
  p.man = man;
  const dx = HOOP.x - man.x, dz = HOOP.z - man.z, l = Math.hypot(dx, dz) || 1;
  const gap = man === h ? (hoopDist(man.x, man.z) > 7 ? 1.6 : 0.95) : Math.min(2.2, 1.2 + l * 0.12);
  goTo(p, man.x + dx / l * Math.min(gap, l * 0.8), man.z + dz / l * Math.min(gap, l * 0.8), man === h ? 1 : 0.9);
  if (man === h && p.stealCd <= 0 && dist2(p, h) < 1.25 && Math.random() < dt * CFG.aiSteal * (p.team === 1 ? dif().steal : 0.8)) startSteal(p);
}
// 電腦什麼時候放大招
function aiSpecial(p, dt) {
  if (p.gauge < 100 || S.cut) return;
  if ((p.spWait -= dt) > 0) return;
  const t = p.team, mine = B.mode === 'held' && B.owner.team === t, theirs = B.mode === 'held' && B.owner.team !== t;
  let ok = false;
  switch (p.key) {
    case 'kui': ok = mine && !S.mustClear; break;
    case 'jie': case 'kevin': ok = mine && !busy(B.owner); break;
    case 'yan': ok = mine && !busy(B.owner) && !!alleyMate(p); break;
    case 'momo': ok = mine && !S.mustClear; break;
    case 'de': case 'zhe': case 'zhen': ok = theirs; break;
    case 'vivi': ok = mine && !S.mustClear; break;
    case 'mi': ok = theirs; break;
    case 'heilun': ok = theirs || (S.score[1 - t] >= 2 && B.mode === 'held'); break;
  }
  if (ok && specialBlock(p) === null) startSpecial(p);
  else p.spWait = 0.4;
}

// ---------- 動作更新 ----------
function updateAct(p, dt) {
  const a = p.act; if (!a) return;
  a.t += dt;
  switch (a.type) {
    case 'shoot':
      if (a.hold && (a.t >= 0.62 || (a.t > 0.3 && p.y <= 0))) { a.hold = false; a.relAt = a.t; a.press = a.t; }   // 按太久：落地前自動出手（算太晚）
      if (!a.rel && !a.hold && a.t >= a.relAt) { a.rel = true; releaseShot(p); }
      if (a.rel && a.t > 0.3 && p.y <= 0) p.act = null;
      break;
    case 'audit': {   // 小偵衝到持球者面前
      const k = Math.min(1, a.t / 0.35);
      if (a.h) { a.tx = a.h.x - Math.sin(a.h.face) * -0.5; a.tz = a.h.z - Math.cos(a.h.face) * -0.5; }
      p.x = a.fx + (a.tx - a.fx) * k; p.z = a.fz + (a.tz - a.fz) * k;
      if (Math.random() < 0.6) fx.sparkle(V(p.x, 0.5 + Math.random() * 0.7, p.z), 0xd9b380, 0.35);
      if (k >= 1 && !a.done) {
        a.done = true;
        if (a.h && holding(a.h)) { a.h.act = null; a.h.stun = 1.5; addIcon(a.h, '🔍', 1.5, 2.2, 0.55); gainBall(p, 'steal'); fx.sfx.steal(); fx.floatText(V(p.x, 2.4, p.z), '抓到了！', p.def.color, 1.1); setTimeout(() => S.mode === 'play' && playSig(p), 0); }
        else if (B.mode === 'loose' || (B.mode === 'held' && B.owner.team !== p.team)) { if (B.owner) { B.owner.act = null; B.owner.stun = 1.5; } gainBall(p, 'steal'); fx.sfx.steal(); }
      }
      if (a.t > 0.5) p.act = null;
      break;
    }
    case 'sig': if (a.t > a.dur) p.act = null; break;
    case 'lay': {
      const k = Math.min(1, a.t / 0.45), e = 1 - (1 - k) * (1 - k);
      p.x = a.sx + (a.tx - a.sx) * e; p.z = a.sz + (a.tz - a.sz) * e;
      p.y = Math.sin(Math.min(1, a.t / 0.6) * Math.PI) * (a.dunk ? 1.05 : 0.8);
      if (!a.rel && a.t >= 0.4) {
        a.rel = true;
        if (a.dunk && holding(p)) {
          const prob = shotProb(p, a.sx, a.sz, true);
          if (Math.random() < prob + 0.05 || p.key === 'jie' && Math.random() < 0.5) { slam(p, 2, false); break; }
        }
        releaseShot(p);
      }
      if (a.t >= 0.6) { p.y = 0; p.act = null; }
      break;
    }
    case 'block': if (a.t > 0.15 && p.y <= 0) p.act = null; break;
    case 'steal':
      if (a.t < 0.2) { p.x += Math.sin(p.face) * dt * 2.6; p.z += Math.cos(p.face) * dt * 2.6; }
      if (!a.done && a.t >= 0.12) { a.done = true; resolveSteal(p); }
      if (a.t > 0.32) p.act = null;
      break;
    case 'pass': if (a.t > 0.25) p.act = null; break;
    case 'jdunk': {
      if (a.t < 0.3 || !holding(p)) { a.t = Math.min(a.t, 0.3); if (!holding(p) && B.mode !== 'pass') { p.act = null; break; } p.face = Math.atan2(HOOP.x - p.x, HOOP.z - p.z); break; }
      const k = Math.min(1, (a.t - 0.3) / 0.85), e = k * k * (3 - 2 * k);
      const tx = HOOP.x, tz = HOOP.z + 0.4;
      p.x = a.sx + (tx - a.sx) * e; p.z = a.sz + (tz - a.sz) * e;
      p.y = 0.95 * k + Math.sin(k * Math.PI) * 1.8;
      a.spin = k * Math.PI * 2;
      if ((a.paper += dt) > 0.07 && k < 1) { a.paper = 0; paperTrail(p); }
      if (k >= 1 && !a.slam) { a.slam = true; slam(p, a.pts, true); playSig(p); }
      if (a.t > 1.6) { p.act = null; p.vy = 0; a.spin = 0; }
      break;
    }
    case 'ai':
      p.face = Math.atan2(HOOP.x - p.x, HOOP.z - p.z);
      if (a.t >= 0.9 && !a.jumped && holding(p)) { a.jumped = true; p.vy = CFG.jumpV; p.y = 0.01; }
      if (a.t >= 1.15 && !a.rel && holding(p)) { a.rel = true; releaseShot(p, { sure: true, pts: a.pts, T: 1.0 }); }
      if (a.t > 2.5 || (a.rel && p.y <= 0)) p.act = null;
      break;
    case 'lob':
      if (!a.sig) { a.sig = true; playSig(p); }
      if (a.t >= 0.4 && !a.thrown && holding(p)) { a.thrown = true; doPass(p, a.to, { sure: true, T: 0.62, arc: 1.5, alley: true }); a.to.act && (a.to.act.ph = 'jump', a.to.act.jt = 0, a.to.act.jx = a.to.x, a.to.act.jz = a.to.z); fx.sfx.pass(); }
      if (a.t > 0.9 || (a.t > 0.5 && !a.thrown && !holding(p))) p.act = null;
      break;
    case 'alley': {
      if (a.ph === 'dash') {
        const k = Math.min(1, a.t / 0.38);
        p.x = a.fx + (a.sx - a.fx) * k; p.z = a.fz + (a.sz - a.fz) * k;
        if (Math.random() < 0.35) fx.sparkle(V(p.x + rand(-0.2, 0.2), 0.5 + Math.random() * 0.6, p.z), 0x7fe0b0, 0.4);
        if (a.t > 2) p.act = null;   // 球沒傳出來就算了
      } else if (a.ph === 'jump') {
        a.jt += dt; const k = Math.min(1, a.jt / 0.62);
        p.x = a.jx + (HOOP.x - a.jx) * k; p.z = a.jz + (HOOP.z + 0.4 - a.jz) * k;
        p.y = 0.95 * k + Math.sin(k * Math.PI) * 0.9;
        p.face = Math.atan2(HOOP.x - p.x, HOOP.z - p.z);
        if (k >= 1 && holding(p) && !a.slam) { a.slam = true; slam(p, 2, true); }
        if (a.jt > 1.1 || (k >= 1 && !holding(p) && !a.slam && B.mode !== 'pass')) { p.act = null; }
      }
      break;
    }
  }
}
// 灌籃：球直接塞進去，籃框晃、地面衝擊波
function slam(p, pts, special) {
  B.mode = 'net'; B.scored = false; B.owner = null; B.t = 0; B.shooter = p; B.pts = pts; B.make = true; B.kind = 'dunk';
  B.pos.set(HOOP.x, HOOP.y + 0.15, HOOP.z);
  C.rimShake = 0.6; fx.sfx.dunk(); fx.camKick(1); cam.shake = special ? 0.45 : 0.25;
  fx.shockwave(V(HOOP.x, 0, HOOP.z + 0.4), 0xffffff, special ? 7 : 4);
  if (special) { fx.confetti(V(HOOP.x, HOOP.y, HOOP.z + 0.3), 90, 1.1); slow(0.25, 0.7); }
  p.hang = 0.35; p.y = Math.max(p.y, 0.9);
}
const paperMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true });
const paperTex = canvasTex(64, 48, (g, w, h) => { g.fillStyle = '#2f6fd6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ffffffaa'; g.lineWidth = 1; for (let x = 0; x < w; x += 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(10, 10, 30, 20); });
paperMat.map = paperTex;
function paperTrail(p) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.3), paperMat.clone());
  m.position.set(p.x + rand(-0.3, 0.3), p.y + rand(0.3, 1.2), p.z + rand(-0.3, 0.3)); m.rotation.set(rand(0, 6), rand(0, 6), rand(0, 6)); scene.add(m);
  const r = V(rand(-5, 5), rand(-5, 5), rand(-5, 5)); let t = 0;
  fxPush(dt => { t += dt; m.rotation.x += r.x * dt; m.rotation.y += r.y * dt; m.position.y -= dt * 0.6; m.material.opacity = 1 - t / 1.2; if (t > 1.2) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); return false; } return true; });
}
const extraFx = [];
// 特寫鏡頭：大招時切到側面（像電視轉播的重播角度），結束再切回來
const SC = { t: 0, dur: 1, pos: V(), look: V() };
// 從側面拍「起跳點 → 籃框」這段：鏡頭在路線的垂直方向
function sideCam(x, z, dur, frac = 0.78) {
  const tx = HOOP.x, tz = HOOP.z + 0.4; let dx = tx - x, dz = tz - z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  let px = dz, pz = -dx; if (pz < 0 || (pz === 0 && px < 0)) { px = -px; pz = -pz; }   // 選靠鏡頭那一側
  const mx = x + (tx - x) * frac, mz = z + (tz - z) * frac, r = Math.max(6.2, l * 0.85);
  shotCam(V(mx + px * r - dx * 3.2, 2.9, mz + pz * r - dz * 3.2), V(mx, 2.0, mz), dur);   // 斜後側 3/4 角度，看得到起跳和籃框
}
function shotCam(pos, look, dur) {
  const d = pos.clone().sub(look); if (camera.aspect < 1) d.multiplyScalar(1.7);
  SC.pos.copy(look).add(d); SC.look.copy(look); SC.t = SC.dur = dur;
  SC.pos.x = THREE.MathUtils.clamp(SC.pos.x, -5.8, 5.8); SC.pos.z = THREE.MathUtils.clamp(SC.pos.z, 0.5, 13);   // 鏡頭留在場內，不要拍到旁邊觀眾的臉
}
const LOG = []; const log = (m) => { LOG.push(`${S.clock.toFixed(1)} ${m}`); if (LOG.length > 400) LOG.shift(); };
function fxPush(f) { extraFx.push(f); }
function slow(ts, dur) { S.ts = Math.min(S.ts, ts); S.slowT = Math.max(S.slowT, dur); }

// ---------- 球的物理 ----------
function updateBall(dt) {
  const p = B.owner;
  if (B.mode === 'held') {
    const a = p.act;
    if (!a || a.type === 'pass' || a.type === 'steal') {
      // 運球：右手，球在手和地板之間彈
      const r = p.bones.RightHand;
      const sp = Math.hypot(p.vx, p.vz);
      const prev = B.drib % 1;
      B.drib += dt * (2.2 + sp * 0.35);
      const f = B.drib % 1, h = Math.abs(Math.cos(Math.PI * f));
      if (prev < 0.5 && f >= 0.5) fx.sfx.dribble();
      if (r) r.getWorldPosition(_hp); else chestPos(p, _hp);
      const fw = 0.16;
      B.pos.set(_hp.x + Math.sin(p.face) * fw, BR + Math.max(0, _hp.y - 0.12 - BR) * h, _hp.z + Math.cos(p.face) * fw);
      B.dribH = h;
    } else handsPos(p, B.pos);
    B.spin.set(p.vx * 3, 0, -p.vz * 3);
  } else if (B.mode === 'pass') {
    B.t += dt; const k = Math.min(1, B.t / B.T), r = B.recv;
    handsPos(r, _hp2);
    B.pos.lerpVectors(B.p0, _hp2, k); B.pos.y += Math.sin(k * Math.PI) * B.arc;
    if (B.passer === B.recv && Math.random() < 0.6) fx.sparkle(B.pos.clone(), 0x5fdc7a, 0.3);   // 黑輪：鈔票光
    if (k >= 1) {
      const passer = B.passer;
      gainBall(r, passer.team === r.team ? 'pass' : 'intercept'); fx.sfx.catch();
      if (passer !== r && passer.team === r.team) addGauge(passer, CFG.gPass);
      else if (passer.team !== r.team) { fx.floatText(V(r.x, 2.3, r.z), '抄截！', TEAM_COLOR[r.team], 1); addGauge(r, CFG.gSteal); fx.sfx.steal(); }
    }
    B.spin.set(8, 0, 0);
  } else if (B.mode === 'shot') {
    B.t += dt; const t = Math.min(B.t, B.T);
    B.pos.copy(B.p0).addScaledVector(B.v0, t); B.pos.y += 0.5 * B.g * t * t;
    if (B.sure && Math.random() < 0.8) fx.sparkle(B.pos.clone(), 0x5fd0ff, 0.35);
    if (B.t >= B.T) {
      if (B.make) { B.mode = 'net'; B.scored = false; B.t = 0; B.kind = B.lay ? 'lay' : 'shot'; }
      else {
        // 打框彈出來
        const big = C.rimGroup.scale.x;
        fx.sfx.rim(); C.rimShake = 0.25; log(`miss ${B.shooter.key}`);
        if (B.wall) { fx.sfx.block(); fx.shockwave(V(HOOP.x, HOOP.y, HOOP.z), 0x5fd0ff, 2.5); fx.floatText(V(HOOP.x, HOOP.y + 1, HOOP.z + 0.3), '🛡️ 防火牆擋下！', '#3f7fd9', 1); }
        const ox = Math.sin(B.missAng), oz = Math.cos(B.missAng);
        B.pos.set(HOOP.x + ox * (HOOP.r * big + BR * 0.8), HOOP.y + 0.08, HOOP.z + oz * (HOOP.r * big + BR * 0.8));
        loseBall(V(ox * rand(1.2, 3) + rand(-0.6, 0.6), rand(2.5, 4.5), Math.max(oz, -0.2) * rand(1.5, 3) + 0.6));
        if (S.buzzer) finish();
      }
    }
    B.spin.set(-10, 0, 0);
  } else if (B.mode === 'net') {
    B.t += dt; const k = Math.min(1, B.t / 0.3);
    B.pos.set(HOOP.x, HOOP.y + 0.08 - k * 0.6, HOOP.z);
    if (B.t >= 0.3 && !B.scored) {
      B.scored = true; swishNet(); if (B.kind !== 'dunk') fx.sfx.swish();
      scored(B.shooter, B.pts, B.kind);
      B.mode = 'dead'; B.vel.set(rand(-0.5, 0.5), -1, rand(0.3, 1));
    }
    B.spin.set(-4, 0, 0);
  } else if (B.mode === 'loose' || B.mode === 'dead') {
    B.vel.y -= 14 * dt;
    B.pos.addScaledVector(B.vel, dt);
    if (B.pos.y < BR) { B.pos.y = BR; if (B.vel.y < -1.2) { B.vel.y *= -0.62; if (B.mode === 'loose') fx.sfx.bounce(); } else B.vel.y = 0; B.vel.x *= 0.92; B.vel.z *= 0.92; }
    if (B.pos.y <= BR + 0.01) { B.vel.x *= Math.exp(-dt * 1.2); B.vel.z *= Math.exp(-dt * 1.2); }
    // 牆、籃板
    if (Math.abs(B.pos.x) > WALL.x) { B.pos.x = Math.sign(B.pos.x) * WALL.x; B.vel.x *= -0.6; }
    if (B.pos.z < WALL.z0) { B.pos.z = WALL.z0; B.vel.z *= -0.6; }
    if (B.pos.z > WALL.z1) { B.pos.z = WALL.z1; B.vel.z *= -0.6; }
    const bz = HOOP.z - 0.47 + 0.04 + BR;
    if (B.vel.z < 0 && B.pos.z < bz && B.pos.z > bz - 0.3 && Math.abs(B.pos.x) < 0.95 && B.pos.y > HOOP.y - 0.14 && B.pos.y < HOOP.y + 0.98) { B.pos.z = bz; B.vel.z *= -0.7; fx.sfx.bounce(); }
    B.spin.set(B.vel.z * 6, 0, -B.vel.x * 6);
    if (B.mode === 'loose') {
      for (const q of players) {
        if (q.stun > 0 || q.pickCd > 0 || (busy(q) && q.act.type !== 'block' && q.act.type !== 'steal')) continue;
        if (Math.hypot(B.pos.x - q.x, B.pos.z - q.z) < 0.6 && B.pos.y < q.y + 1.6 && B.pos.y > q.y - 0.3) {
          const reb = S.reb; S.reb = false;
          gainBall(q, 'loose'); fx.sfx.catch(); if (reb) { addGauge(q, CFG.gReb); fx.floatText(V(q.x, 2.3, q.z), '籃板！', TEAM_COLOR[q.team], 0.8); }
          if (q.act?.type === 'block') { /* 空中抓下來 */ }
          break;
        }
      }
    }
  }
  ballMesh.position.copy(B.pos);
  ballMesh.rotation.x += B.spin.x * dt; ballMesh.rotation.z += B.spin.z * dt;
}

// ---------- 每幀：球員 ----------
function updatePlayers(dt, t) {
  for (const p of players) {
    p.stealCd = Math.max(0, p.stealCd - dt); p.pickCd = Math.max(0, p.pickCd - dt);
    if (p.stun > 0) { p.stun -= dt; if (p.stun <= 0) p.stun = 0; }
    if (p.blockIn > 0) { p.blockIn -= dt; if (p.blockIn <= 0 && p.stun <= 0 && !busy(p) && p.y <= 0) startBlock(p); }
    if (p.cheer > 0) p.cheer -= dt;
    if (p.sigT > 0) { p.sigT -= dt; if (p.sigT <= 0) stopSig(p); }
    think(p, dt);
    updateAct(p, dt);
    const a = p.act, scripted = a && (a.type === 'lay' || a.type === 'jdunk' || a.type === 'alley');
    if (p.hang > 0) { p.hang -= dt; p.vx = p.vz = 0; if (p.hang <= 0) p.vy = 0; }
    else if (!scripted) {
      const locked = a && (a.type === 'shoot' || a.type === 'block' || a.type === 'ai' || a.type === 'lob');
      const k = Math.min(1, dt * CFG.accel);
      if (locked || p.stun > 0) { p.vx *= Math.exp(-dt * 8); p.vz *= Math.exp(-dt * 8); }
      else { p.vx += (p.dvx - p.vx) * k; p.vz += (p.dvz - p.vz) * k; }
      p.x += p.vx * dt; p.z += p.vz * dt;
      if (p.y > 0 || p.vy > 0) { p.vy -= CFG.g * dt; p.y += p.vy * dt; if (p.y <= 0) { p.y = 0; p.vy = 0; } }
    } else { p.vx = p.vz = 0; }
    p.x = THREE.MathUtils.clamp(p.x, -COURT.x - 0.2, COURT.x + 0.2); p.z = THREE.MathUtils.clamp(p.z, 0.1, 11.2);
  }
  // 互相推開
  for (let i = 0; i < players.length; i++) for (let j = i + 1; j < players.length; j++) {
    const a = players[i], b = players[j];
    const sa = a.act && (a.act.type === 'jdunk' || a.act.type === 'alley' || a.act.type === 'lay'), sb = b.act && (b.act.type === 'jdunk' || b.act.type === 'alley' || b.act.type === 'lay');
    if (sa || sb || Math.abs(a.y - b.y) > 0.8) continue;
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), m = 0.62;
    if (d < m && d > 1e-4) { const push = (m - d) / 2; a.x -= dx / d * push; a.z -= dz / d * push; b.x += dx / d * push; b.z += dz / d * push; }
    if (d < m + 0.1 && a.team !== b.team) for (const h of [a, b]) if (holding(h)) { h.vx *= Math.exp(-dt * 5); h.vz *= Math.exp(-dt * 5); }   // 被防守者擋住：持球切入變慢
  }
  // 面向、動畫、手臂
  for (const p of players) {
    const a = p.act, sp = Math.hypot(p.vx, p.vz);
    let want = null;
    if (a && (a.type === 'shoot' || a.type === 'lay' || a.type === 'ai' || a.type === 'jdunk' || a.type === 'alley')) want = Math.atan2(HOOP.x - p.x, HOOP.z - p.z);
    else if (a && a.type === 'lob') want = Math.atan2(a.to.x - p.x, a.to.z - p.z);
    else if (S.phase === 'play' && S.poss !== p.team && B.mode === 'held' && B.owner.team !== p.team && dist2(p, B.owner) < 2.6) want = Math.atan2(B.owner.x - p.x, B.owner.z - p.z);
    else if (p.cheer > 0 && sp < 0.6) want = 0;   // 歡呼時轉向鏡頭
    else if (sp > 0.4) want = Math.atan2(p.vx, p.vz);
    else if (S.phase === 'check' || holding(p)) want = Math.atan2(HOOP.x - p.x, HOOP.z - p.z);
    if (want != null) { let d = want - p.face; d = Math.atan2(Math.sin(d), Math.cos(d)); p.face += d * Math.min(1, dt * 12); }
    const r = p.actor.root;
    r.position.set(p.x, p.y, p.z);
    r.rotation.y = p.face + (a?.spin || 0);
    if (p.stun > 0) { r.rotation.y += Math.sin(t * 9) * 0.4; r.rotation.z = Math.sin(t * 7) * 0.12; } else r.rotation.z = 0;
    p.actor.speed = p.y > 0.05 || p.stun > 0 ? 0 : sp;
    p.actor.animMul = 1;
    resetBones(p);
    updateActor(p.actor, dt, t);
    // 蹲下起跳、落地的壓扁
    const crouch = a && a.type === 'jdunk' && a.t < 0.3 ? 0.82 : 1;
    p.actor.model.scale.y *= crouch;
    poseArms(p, p.actor, (p.actor.sigW || 0) > 0.3 ? {} : armTarget(p, t), dt);
    // 腳下的圈、名字
    p.ring.position.set(p.x, 0.02, p.z);
    const me = p === S.ctrl;
    p.ring.material.color.set(me ? '#ffd34d' : TEAM_COLOR[p.team]);
    p.ring.scale.setScalar(me ? 1.15 + Math.sin(t * 6) * 0.06 : 1);
    p.label.position.set(p.x, p.y + 1.66, p.z);
    p.label.material.opacity = me ? 1 : 0.85; p.label.visible = SC.t <= 0;
    for (let i = p.icons.length - 1; i >= 0; i--) {
      const ic = p.icons[i]; ic.life -= dt;
      ic.s.position.set(p.x + (ic.shake ? Math.sin(t * 50) * 0.04 : 0), p.y + ic.y + Math.sin(t * 4) * 0.05, p.z); ic.s.visible = SC.t <= 0;
      if (ic.life <= 0 || (ic.shake && p.stun <= 0)) { scene.remove(ic.s); ic.s.material.dispose(); p.icons.splice(i, 1); }
    }
    if (S.buff[p.team].coffee > 0 && sp > 1 && Math.random() < dt * 25) fx.sparkle(V(p.x - p.vx * 0.06, 0.4 + Math.random() * 0.6, p.z - p.vz * 0.06), 0xffb070, 0.3);
  }
}
function armTarget(p, t) {
  const a = p.act;
  if (p.stun > 0) return { rf: 1.2 + Math.sin(t * 12) * 0.8, lf: 1.2 + Math.cos(t * 12) * 0.8, rs: 0.4, ls: 0.4 };
  if (p.hang > 0) return { rf: 2.9, lf: 2.9 };
  if (a) switch (a.type) {
    case 'shoot': case 'ai': return a.rel ? { rf: 2.9, lf: 2.3 } : { rf: 2.4, lf: 2.4, sp: -0.1 };
    case 'lay': return { rf: 2.8, lf: a.dunk ? 2.8 : 1.4 };
    case 'jdunk': return a.t < 0.3 ? { rf: 1.2, lf: 1.2, sp: 0.35 } : { rf: 2.9, lf: 2.9, rs: 0.2, ls: 0.2 };
    case 'alley': return a.ph === 'jump' ? { rf: 2.9, lf: 2.9 } : { rf: 1.6, lf: 1.6 };
    case 'block': return { rf: 3.0, lf: 3.0, rs: 0.25, ls: 0.25 };
    case 'steal': return { rf: 1.6, lf: 0.3, sp: 0.35 };
    case 'pass': case 'lob': return { rf: 1.5, lf: 1.5 };
  }
  if (p.cheer > 0) return { rf: 2.7 + Math.sin(t * 14) * 0.3, lf: 2.7 + Math.cos(t * 14) * 0.3 };
  if (holding(p)) return { rf: 0.55 + 0.45 * (B.dribH ?? 0.5), lf: 0.35 };
  // 防守：貼近持球者時張開雙手
  if (B.mode === 'held' && B.owner.team !== p.team && dist2(p, B.owner) < 2.2) return { rs: 1.0, ls: 1.0, rf: 0.5, lf: 0.5, sp: 0.15 };
  return {};
}
function updateCrowd(dt, t) {
  for (const c of crowd) {
    c.cheer = Math.max(0, c.cheer - dt);
    const hop = c.cheer > 0 ? Math.abs(Math.sin(t * 9 + c.ph)) * 0.25 : Math.abs(Math.sin(t * 2.4 + c.ph)) * 0.03;
    c.actor.root.position.y = 0.42 + hop;
    c.actor.speed = 0; resetBones(c); updateActor(c.actor, dt, t);
    poseArms(c, c.actor, c.cheer > 0 ? { rf: 2.7 + Math.sin(t * 12 + c.ph) * 0.3, lf: 2.7 + Math.cos(t * 12 + c.ph) * 0.3 } : { rf: 0.3 + Math.sin(t * 3 + c.ph) * 0.2, lf: 0.3 + Math.cos(t * 3 + c.ph) * 0.2 }, dt);
  }
}

// ---------- 比賽流程 ----------
function newMatch() {
  clearPlayers();
  const others = KEYS.filter(k => !S.pick.includes(k));
  if (!S.keepOpp) { for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [others[i], others[j]] = [others[j], others[i]]; } S.opp = others.slice(0, S.pick.length); }
  S.keepOpp = false;
  players = [...S.pick.map(k => makePlayer(k, 0)), ...S.opp.map(k => makePlayer(k, 1))];
  $('board').classList.toggle('three', S.pick.length > 2);
  buildCrowd();
  Object.assign(S, { t: 0, clock: CFG.len, score: [0, 0], poss: 0, mustClear: false, ctrl: players[0], ts: 1, slowT: 0, cut: null, buzzer: false, sudden: false, caiDone: false, endAfter: false, lastPass: null, onBall: [null, null], lastTick: -1, nextPoss: 0 });
  S.buff = [newBuff(), newBuff()]; S.meter = null;
  for (const d of CAI.drops) scene.remove(d.m); CAI.drops = []; CAI.on = false; CAI.g.visible = false;
  C.rimGroup.scale.setScalar(1); SC.t = 0;
  buildHud();
  $('scA').textContent = '0'; $('scB').textContent = '0';
  checkBall(); S.phaseT = 2.2;
  const nm = (ks) => ks.map(k => CHARS[k].name).join('＆');
  fx.banner(nm(S.pick), `VS　${nm(S.opp)}`, 0, '#ff7a45');
  updateCamera(camFocus(), 0, true);
}
function finish() {
  if (S.phase === 'end') return;
  if (S.score[0] === S.score[1] && !S.sudden) {
    S.sudden = true; S.buzzer = false; S.endAfter = false;
    fx.banner('延長賽！', '下一球得分就贏', 0, '#e0413b');
    S.phase = 'score'; S.phaseT = 1.6; S.nextPoss = Math.random() < 0.5 ? 0 : 1;
    return;
  }
  S.phase = 'end'; S.phaseT = 2.4;
  const win = S.score[0] > S.score[1];
  for (const p of players) if (p.team === (win ? 0 : 1)) { p.cheer = 3; p.act = null; playSig(p, { loop: true }); }   // 贏的一隊擺招牌動作
  for (const c of crowd) c.cheer = 2.5;
  fx.sfx.buzzer(); setTimeout(() => (win ? fx.sfx.win : fx.sfx.lose)(), 600);
  fx.banner(win ? '我們贏了！' : '輸了…', `${S.score[0]} ： ${S.score[1]}`, win ? 3 : 0, win ? '#ff7a45' : '#3f7fd9');
  if (win) fx.confetti(V(0, 3, 5), 120, 1.2);
  slow(0.5, 1.2); musicStop();
}
function showOver() {
  S.mode = 'over'; document.body.classList.remove('playing');
  const win = S.score[0] > S.score[1];
  $('oTitle').textContent = win ? '🏆 我們贏了！' : '😵 輸了…午休結束';
  $('oA').textContent = S.score[0]; $('oB').textContent = S.score[1];
  const mvp = players.filter(p => p.team === (win ? 0 : 1)).sort((a, b) => b.pts - a.pts)[0];
  $('oMvpF').src = FACE[mvp.key]; $('oMvpN').textContent = `${mvp.def.role} ${mvp.def.name}　${mvp.pts} 分`; $('oMvpQ').textContent = '「' + mvp.def.quote + '」';
  $('oStats').style.setProperty('--n', players.length > 4 ? 3 : 4);
  $('oStats').innerHTML = players.map(p => `<div class="${p.team ? 'b' : ''}"><img src="${FACE[p.key]}" alt=""><b>${p.pts}</b>${p.def.name}</div>`).join('');
  show('over');
}
function updateFlow(dt) {
  if (S.phase === 'check') {
    S.phaseT -= dt;
    if (S.phaseT <= 0) { S.phase = 'play'; for (const p of players) p.form = undefined; }
  } else if (S.phase === 'score') {
    S.phaseT -= dt;
    if (S.phaseT < 1.2 && !S.formed) { S.formed = true; const { F } = formation(S.nextPoss); for (const [p, f] of F) p.form = f; }
    if (S.phaseT <= 0) {
      S.formed = false;
      if (S.endAfter) { S.endAfter = false; finish(); if (S.phase === 'end') return; }
      checkBall();
    }
  } else if (S.phase === 'play') {
    if (!S.sudden) {
      S.clock = Math.max(0, S.clock - dt);
      const sec = Math.ceil(S.clock);
      if (sec <= 10 && sec !== S.lastTick && sec > 0) { S.lastTick = sec; fx.sfx.tick(); }
      if (!S.caiDone && S.clock <= CFG.len / 2) { S.caiDone = true; startCaishen(); }
      if (S.clock <= 0 && !S.buzzer) {
        S.buzzer = true; fx.sfx.buzzer();
        const shooting = B.mode === 'shot' || B.mode === 'net' || players.some(p => p.act && (p.act.type === 'jdunk' || (p.act.type === 'ai' && p.act.rel)));
        if (!shooting) finish(); else fx.toast('⏰ 壓哨球！');
      }
    }
    for (const t of [0, 1]) {
      const b = S.buff[t];
      for (const k of ['coffee', 'slow', 'viral', 'wall']) if (b[k] > 0) b[k] = Math.max(0, b[k] - dt);
      if (b.vivi > 0) { b.vivi = Math.max(0, b.vivi - dt); if (b.vivi === 0) b.viviNext = false; }
    }
    for (const p of players) if (!S.cut) addGauge(p, CFG.gaugeRate * dt * (p.team === 1 ? 0.95 : 1));
    if (S.mustClear && holding(B.owner) && isThree(B.owner.x, B.owner.z)) { S.mustClear = false; if (B.owner.team === 0) fx.sfx.tick(); }
  } else if (S.phase === 'end') {
    S.phaseT -= dt;
    if (S.phaseT <= 0) showOver();
  }
  // 老闆的金色大籃框
  const vivi = S.buff[0].vivi > 0 || S.buff[1].vivi > 0;
  const rs = C.rimGroup.scale.x, want = vivi ? 2.0 : 1;
  C.rimGroup.scale.setScalar(rs + (want - rs) * Math.min(1, dt * 5));
  C.rimMat.color.lerp(_col.set(vivi ? 0xffc93c : 0xff5d1f), Math.min(1, dt * 5));
  C.rimMat.emissive.lerp(_col.set(vivi ? 0x8a5a00 : 0x000000), Math.min(1, dt * 5));
  if (vivi && Math.random() < dt * 12) fx.sparkle(V(HOOP.x + rand(-0.7, 0.7), HOOP.y + rand(-0.2, 0.3), HOOP.z + rand(-0.7, 0.7)), 0xffe08a, 0.35);
}
const _col = new THREE.Color();
let shield = null;
function updateShield(dt, t) {
  const on = S.buff[0].wall > 0 || S.buff[1].wall > 0;
  if (!shield) {
    const tex = canvasTex(256, 256, (g, W) => { g.strokeStyle = '#7fe0ff'; g.lineWidth = 6; const r = 26;
      for (let y = -1; y < 7; y++) for (let x = -1; x < 6; x++) { const cx = x * r * 1.75 + (y % 2) * r * 0.87, cy = y * r * 1.5; g.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i + Math.PI / 6; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); g.stroke(); } });
    // 立在籃框前面、朝鏡頭的一面六角盾（平放的從鏡頭看會變成一條線）
    shield = new THREE.Mesh(new THREE.CircleGeometry(0.95, 6), new THREE.MeshBasicMaterial({ map: tex, color: 0x5fd0ff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false }));
    shield.position.set(HOOP.x, HOOP.y + 0.15, HOOP.z + 0.55); scene.add(shield);
  }
  shield.material.opacity += ((on ? 0.65 + Math.sin(t * 6) * 0.15 : 0) - shield.material.opacity) * Math.min(1, dt * 6);
  shield.rotation.z += dt * 0.8; shield.visible = shield.material.opacity > 0.02;
}

// ---------- 鏡頭 ----------
function camFocus() {
  const portrait = camera.aspect < 1;
  let bx = B.pos.x, bz = THREE.MathUtils.clamp(B.pos.z, 0, 10);
  if (KV.zoom > 0 && KV.p) { bx = (KV.p.x + HOOP.x) / 2; bz = (KV.p.z + HOOP.z) / 2; }   // Kevin 瞄準時：拍人和籃框中間
  return V(bx * (portrait ? 0.6 : 0.3), 1.3 + Math.max(0, B.pos.y - 1.5) * 0.2, (portrait ? 4.2 : 3.5) + bz * (portrait ? 0.25 : 0.22));
}

// ---------- HUD ----------
function buildHud() {
  for (const t of [0, 1]) $(t ? 'facesB' : 'facesA').innerHTML = teamOf(t).map((p, i) => `<div class="pf" id="pf${t}${i}"><div class="f" style="background-image:url(${FACE[p.key]})"></div><div class="g"><i></i></div></div>`).join('');
}
const hudCache = {};
function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function setHtml(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).innerHTML = v; } }
function hud() {
  if (S.sudden) { setText('clock', '延長'); setText('clockSub', '下一球決勝'); }
  else { const c = Math.ceil(S.clock), m = Math.floor(c / 60), s = c % 60; setText('clock', `${m}:${String(s).padStart(2, '0')}`); setText('clockSub', `先到${CFG.target}分`); }
  $('clock').classList.toggle('low', !S.sudden && S.clock <= 10);
  for (const t of [0, 1]) teamOf(t).forEach((p, i) => {
    const el = $(`pf${t}${i}`); if (!el) return;
    const w = Math.floor(p.gauge) + '%'; const bar = el.querySelector('i'); if (bar.style.width !== w) bar.style.width = w;
    el.classList.toggle('full', p.gauge >= 100); el.classList.toggle('ctl', p === S.ctrl);
  });
  // 球權、清球、大招效果
  let chips = '';
  if (S.phase === 'play' || S.phase === 'check') {
    const off = S.poss === 0;
    chips += off ? '<span class="off">🏀 進攻</span>' : '<span class="def">🛡️ 防守</span>';
    if (S.mustClear && B.mode === 'held') chips += `<span class="clr">🔄 ${B.owner.team === 0 ? '先把球帶出三分線' : '對手要先清球'}</span>`;
  }
  for (const t of [0, 1]) {
    const b = S.buff[t], who = t ? '對手' : '我方';
    if (b.coffee > 0) chips += `<span class="buff">☕ ${who}衝刺 ${b.coffee.toFixed(0)}</span>`;
    if (b.vivi > 0) chips += `<span class="buff">👑 ${who}金框 ${b.vivi.toFixed(0)}</span>`;
    if (b.slow > 0) chips += `<span class="buff">📉 ${who}被砍預算 ${b.slow.toFixed(0)}</span>`;
    if (b.viral > 0) chips += `<span class="buff">❤️ ${who}爆紅 ${b.viral.toFixed(0)}</span>`;
    if (b.wall > 0) chips += `<span class="buff">🛡️ ${who}防火牆 ${b.wall.toFixed(0)}</span>`;
  }
  setHtml('poss', chips);
  // 按鈕
  const p = S.ctrl; if (!p) return;
  const hold = holding(p), mineBall = B.mode === 'held' && B.owner.team === p.team;
  setText('kShootT', hold ? '投籃' : '蓋帽');
  setText('kPassT', hold ? '傳球' : '換人');
  $('kSteal').classList.toggle('dim', mineBall);
  const hh = B.mode === 'held' && B.owner.team !== p.team ? B.owner : null;
  $('kSteal').classList.toggle('hot', !!hh && p.stealCd <= 0 && dist2(p, hh) < CFG.stealR && (B.dribH ?? 1) < 0.45);   // 貼近、球在地上：抄截鍵發亮
  $('kShoot').classList.toggle('dim', hold && S.mustClear);
  const sp = $('kSp'), pct = Math.floor(p.gauge);
  sp.style.setProperty('--p', pct + '%');
  sp.classList.toggle('full', pct >= 100);
  sp.classList.toggle('dim', pct >= 100 && specialBlock(p) !== null);
  const bg = `url(${FACE[p.key]})`; if (hudCache.spbg !== bg) { hudCache.spbg = bg; sp.querySelector('.in').style.backgroundImage = bg; }
  setText('kSpT', pct >= 100 ? p.def.sp.name : pct + '%');
}

// ---------- 畫面切換 ----------
const screens = { title: $('sTitle'), select: $('sSelect'), pause: $('sPause'), over: $('sOver') };
function show(name) { for (const [k, el] of Object.entries(screens)) el.classList.toggle('on', k === name); }
$('kShoot').querySelector('span').id = 'kShootT'; $('kPass').querySelector('span').id = 'kPassT'; $('kSp').querySelector('.in span').id = 'kSpT';
$('bStart').onclick = () => { fx.audioInit(); fx.sfx.click(); toSelect(); };
$('bResume').onclick = () => togglePause();
$('bQuit').onclick = () => { musicStop(); toSelect(); };
$('bAgain').onclick = () => { S.keepOpp = false; startMatch(); };
$('bReselect').onclick = () => toSelect();
$('bPause').onclick = () => togglePause();
$('bSound').onclick = () => { music.on = !music.on; store.set(SOUND_KEY, music.on ? '1' : '0'); soundIcon(); fx.audioInit(); if (music.on && S.mode === 'play') musicStart(); else musicStop(); };
const SOUND_KEY = 'office-basketball-sound';
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
music.on = store.get(SOUND_KEY) !== '0';
function soundIcon() { $('bSound').textContent = music.on ? '🔊' : '🔇'; const A = fx.getAC(); if (A) A.master.gain.value = music.on ? 0.16 : 0; }
soundIcon();

function buildSelect() {
  $('grid').innerHTML = KEYS.map(k => { const c = CHARS[k]; return `<div class="ch" data-k="${k}" style="--cc:${c.color}"><span class="badge"></span><img src="${FACE[k]}" alt=""><div><div class="nm">${c.name}<small>${c.role}</small></div><span class="spn">⚡ ${c.sp.name}</span><div class="d">${c.sp.desc}</div><div class="st">${c.stat}</div></div></div>`; }).join('');
  for (const el of $('grid').children) el.onclick = () => {
    fx.audioInit(); fx.sfx.click();
    const k = el.dataset.k, i = S.sel.indexOf(k);
    if (i >= 0) S.sel.splice(i, 1); else { if (S.sel.length >= S.size) S.sel.shift(); S.sel.push(k); }
    refreshSelect();
  };
  $('titleFaces').innerHTML = KEYS.map(k => `<img src="${FACE[k]}" alt="">`).join('');
}
function refreshSelect() {
  for (const el of $('grid').children) {
    const i = S.sel.indexOf(el.dataset.k);
    el.classList.toggle('sel', i >= 0); el.querySelector('.badge').textContent = i === 0 ? '1P 你操作' : '隊友';
  }
  const n = S.size;
  $('bGo').disabled = S.sel.length < n;
  $('selTitle').textContent = `挑 ${n} 個同事組隊`;
  $('selHint').textContent = S.sel.length < n ? `再挑 ${n - S.sel.length} 個人（先點的是你一開始操作的人）` : `${S.sel.map(k => CHARS[k].name).join('＆')}，對手由電腦隨機挑`;
  for (const b of $('modeSeg').children) b.classList.toggle('on', +b.dataset.v === n);
  for (const b of $('diffSeg').children) b.classList.toggle('on', +b.dataset.v === S.diff);
}
const MODE_KEY = 'office-basketball-mode', DIFF_KEY = 'office-basketball-diff';
S.sel = []; S.size = store.get(MODE_KEY) === '3' ? 3 : 2; S.diff = ['0', '1', '2'].includes(store.get(DIFF_KEY)) ? +store.get(DIFF_KEY) : 1;
$('bRand').onclick = () => { fx.audioInit(); fx.sfx.click(); const a = KEYS.slice().sort(() => Math.random() - 0.5); S.sel = a.slice(0, S.size); refreshSelect(); };
$('bGo').onclick = () => { if (S.sel.length < S.size) return; S.pick = S.sel.slice(); startMatch(); };
for (const b of $('modeSeg').children) b.onclick = () => { fx.sfx.click(); S.size = +b.dataset.v; store.set(MODE_KEY, S.size); S.sel = S.sel.slice(0, S.size); refreshSelect(); };
for (const b of $('diffSeg').children) b.onclick = () => { fx.sfx.click(); S.diff = +b.dataset.v; store.set(DIFF_KEY, S.diff); refreshSelect(); };
function toSelect() { S.mode = 'select'; document.body.classList.remove('playing'); show('select'); refreshSelect(); }
function startMatch() {
  fx.audioInit(); soundIcon();
  newMatch(); S.mode = 'play'; show(null); document.body.classList.add('playing');
  if (music.on) musicStart();
}
function togglePause() {
  if (S.mode === 'play') { S.mode = 'pause'; show('pause'); musicStop(); }
  else if (S.mode === 'pause') { S.mode = 'play'; show(null); if (music.on) musicStart(); }
}
addEventListener('visibilitychange', () => { if (document.hidden && S.mode === 'play' && !G.hold) togglePause(); });

// ---------- 主迴圈 ----------
function step(dtReal) {
  // 大招過場：慢動作 1.15 秒後發動
  if (S.cut) {
    S.cut.t += dtReal;
    if (S.cut.t >= 1.15) { const p = S.cut.p; S.cut = null; $('cutin').classList.remove('on'); S.ts = 1; cam.zoom = 1; doSpecial(p); }
  } else if (S.slowT > 0) { S.slowT -= dtReal; if (S.slowT <= 0) S.ts = 1; }
  else S.ts += (1 - S.ts) * Math.min(1, dtReal * 6);
  const dt = dtReal * S.ts;
  S.t += dt;
  const t = performance.now() / 1000;
  readKeys();
  updateFlow(dt);
  updatePlayers(dt, t);
  updateBall(dt);
  updateKevinFx(dt, t);
  updateCaishen(dt, t);
  updateShield(dt, t);
  updateCrowd(dt, t);
  animateCourt(dt, t);
  fx.updateFx(dt);
  for (let i = extraFx.length - 1; i >= 0; i--) if (!extraFx[i](dt)) extraFx.splice(i, 1);
  arcFlash = Math.max(0, arcFlash - dtReal);
  if (arcLine) arcLine.material.opacity = (S.mustClear && B.mode === 'held' ? 0.55 + 0.35 * Math.sin(t * 8) : 0) + arcFlash * 0.5;
  if (KV.zoom > 0) KV.zoom -= dtReal;
  if (!S.cut) cam.zoom += ((KV.zoom > 0 ? 0.92 : 1) - cam.zoom) * Math.min(1, dtReal * 3);
  if (SC.t > 0) {   // 大招特寫鏡頭
    SC.t -= dtReal; const k = 1 - SC.t / SC.dur;
    camera.position.copy(SC.pos).lerp(SC.look, k * 0.12); camera.lookAt(SC.look);
    if (SC.t <= 0) updateCamera(camFocus(), 0, true);
  } else updateCamera(camFocus(), dtReal);
  hud(); updateMeter();
  musicTick(S.buff[0].coffee > 0 || S.buff[1].coffee > 0 ? 1.15 : 1);
}

// 畫質：自動模式下，比賽時每 3 秒算一次幀率，連兩次低於 40 就切成「流暢」
const fpsMon = { wait: 2, t: 0, n: 0, bad: 0 };
function watchFps(dt) {
  if (quality.pref !== 'auto' || quality.level === 'low' || S.mode !== 'play' || G.hold || document.hidden || dt > 0.25) return;
  if ((fpsMon.wait -= dt) > 0) return;
  fpsMon.t += dt; fpsMon.n++;
  if (fpsMon.t < 3) return;
  const fps = fpsMon.n / fpsMon.t; fpsMon.t = fpsMon.n = 0;
  fpsMon.bad = fps < 40 ? fpsMon.bad + 1 : 0;
  if (fpsMon.bad >= 2) { setQuality('low'); updateQBtn(); fx.toast('畫面有點卡，已切換成「流暢」畫質'); }
}
const qBtn = $('qBtn'), Q_NAME = { auto: '自動', high: '漂亮', low: '流暢' };
function updateQBtn() { qBtn.textContent = `🎨 畫質：${Q_NAME[quality.pref]}` + (quality.pref === 'auto' ? `（現在${Q_NAME[quality.level]}）` : ''); }
qBtn.onclick = (e) => { e.stopPropagation(); setQualityPref({ auto: 'high', high: 'low', low: 'auto' }[quality.pref]); fpsMon.bad = 0; updateQBtn(); };

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  watchFps((now - last) / 1000);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (S.mode === 'load') return;
  if (S.mode === 'play' && !G.hold) step(dt);
  else if (S.mode !== 'play' && S.mode !== 'pause') idle(dt);
  render();
}
// 封面、選角時：鏡頭慢慢繞，球場上沒人
function idle(dt) {
  const t = performance.now() / 1000;
  updateCrowd(dt, t); animateCourt(dt, t); fx.updateFx(dt);
  B.pos.set(Math.sin(t * 0.7) * 2, BR + Math.abs(Math.sin(t * 3)) * 1.2, 4); ballMesh.position.copy(B.pos);
  updateCamera(V(Math.sin(t * 0.2) * 1.5, 0.8, 4.5), dt);
}

// ---------- 測試用 ----------
const G = window.G = {
  S, B, CFG, CHARS, LOG, get players() { return players; }, auto: /[?&]auto/.test(location.search), hold: false,
  step(dt = 1 / 60, n = 1) { for (let i = 0; i < n; i++) step(dt); render(); return { phase: S.phase, score: S.score.slice(), clock: +S.clock.toFixed(1), ball: B.mode }; },
  start(pick = ['kui', 'jie'], ...rest) {   // G.start('kui','jie',[對手]) 或 G.start(['kui','jie','mi'], [對手])
    let opp; if (typeof pick === 'string') { pick = [pick, rest[0]]; opp = rest[1]; } else opp = rest[0];
    S.pick = pick; if (opp) { S.opp = opp; S.keepOpp = true; } startMatch();
  },
  fill() { for (const p of players) p.gauge = 100; },
  special(key) { const p = players.find(q => q.key === key); if (!p) return 'not playing'; p.gauge = 100; const why = specialBlock(p); if (why !== null) return why || 'busy'; return startSpecial(p); },
  give(key) { const p = players.find(q => q.key === key); gainBall(p, 'check'); S.mustClear = false; },
  toSelect, finish,
};

// ---------- 開始 ----------
(async () => {
  try { await loadAll(k => { $('loadBar').style.width = Math.round(k * 100) + '%'; }); }
  catch (e) { $('loading').textContent = '載入失敗，請重新整理'; console.error(e); window.bootFail?.('角色模型下載失敗', '網路可能不穩，重新整理再試一次。（' + (e.message || e) + '）'); return; }
  window.bootOk?.(); updateQBtn();
  buildCourt(); buildArc(); buildCaishen();
  makePortraits(); buildSelect(); buildCrowd();
  $('loading').remove();
  if (!matchMedia('(pointer: coarse)').matches) document.body.classList.add('kbd');
  updateCamera(V(0, 0.8, 4.5), 0, true);
  if (/[?&#]play/.test(location.href)) { S.pick = ['kui', 'jie']; startMatch(); }
  else { S.mode = 'title'; show('title'); }
  requestAnimationFrame(frame);
})();
