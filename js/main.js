// 上班啟示錄：下班先鬥牛 2v2 —— 頂樓半場籃球。玩家挑兩個同事，電腦控制隊友和對手；每個人都有自己的大招
import * as THREE from 'three';
import { scene, render, updateCamera, cam, camera, CAMS, camMode, labelSprite, V, quality, setQuality, setQualityPref, canvasTex, FONT, sphere, mat } from './world.js?v=0.5.1';
import { loadKind, loadClip, makeActor, addJog, updateActor, turnTo } from './assets.js?v=0.5.1';
import * as fx from './fx.js?v=0.5.1';
import { buildCourt, setCourt, animateCourt, swishNet, C, COURT, HOOP, ARC_R, CORNER_X, TOP, WALL, isThree, hoopDist } from './court.js?v=0.5.1';
import { music, musicStart, musicStop, musicTick, musicTheme, musicPause } from './music.js?v=0.5.1';
import { openOP, replayOP, seekOP } from './op.js?v=0.5.1';

const VERSION = '0.5.1';
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
  coffee: 6, vivi: 8, stun: 3.2, slow: 6, viral: 8, wall: 7, queen: 8,  // 大招持續秒數
};

// ---------- 角色 ----------
const CHARS = {
  kui: { name: '小葵', role: '新人實習生・後衛', skill: { name: '快步切入', kind: 'dash' }, model: 'kui_walk2', jog: 'kui_jog', color: '#ff9f43', spd: 1.16, sht: 0.98, stl: 1.3, blk: 0.85, str: 0.85,
    stat: '速度 ★★★★★　抄截 ★★★★★', quote: '我會努力的！☕',
    sp: { name: '咖啡衝刺', desc: '全隊 6 秒加速，傳球秒到不會被抄、抄截變強', need: false } },
  jie: { name: '阿傑', role: '資深設計師・中鋒', skill: { name: '背身強打', kind: 'power' }, model: 'jie_walk', jog: 'jie_jog', color: '#8e5cf0', spd: 0.95, sht: 1.0, stl: 0.9, blk: 1.35, str: 1.5, reb: 1.45, reach: 1.3, inside: 1.25, three: 0.6, dunk: 0.85,
    stat: '籃下 ★★★★★　籃板 ★★★★★', quote: '這稿我一次就過。',
    sp: { name: '設計稿灌籃', desc: '從哪裡起跳都必進的飛天灌籃，三分線外起跳算 3 分', need: true } },
  mi: { name: '小米', role: '總機客服・射手', skill: { name: '換手運球', kind: 'dodge' }, model: 'mi_walk', color: '#b46bff', spd: 1.02, sht: 1.0, stl: 1.05, blk: 0.85, three: 1.5,
    stat: '三分 ★★★★★　速度 ★★★★', quote: '您好，這裡是總機～📞',
    sp: { name: '總機干擾', desc: '對手電話狂響暈 3 秒，趁空檔輕鬆出手', need: false } },
  vivi: { name: 'Vivi', role: '老闆・顏值擔當', skill: { name: '轉身過人', kind: 'spin' }, model: 'vivi_walk', color: '#ff4fa0', spd: 0.92, sht: 0.92, stl: 0.9, blk: 0.8, h: 1.02, pretty: true,
    stat: '顏值 ★★★★★　大招 ★★★★★', quote: '辛苦了！（沒有加薪）',
    sp: { name: '老闆說了算', desc: '籃框變超大金框 8 秒，下一球不管哪裡投都算 3 分', need: false } },
  kevin: { name: 'Kevin', role: '特助・干擾', skill: { name: '後撤步', kind: 'stepback' }, model: 'kevin_walk', color: '#3f7fd9', spd: 1.0, sht: 1.0, stl: 0.95, blk: 1.0, nag: true,
    stat: '碎念干擾 ★★★★★　投籃 ★★★', quote: '這個用 AI 就好了。',
    sp: { name: '用 AI 就好', desc: 'AI 鎖定籃框，站在哪裡投都必進', need: true } },
  yan: { name: '小燕', role: 'PM', skill: { name: '換手運球', kind: 'dodge' }, model: 'yan_walk', color: '#36b37e', spd: 1.04, sht: 1.0, stl: 1.0, blk: 0.9,
    stat: '傳球 ★★★★★　速度 ★★★★', quote: '這個今天要喔！📋',
    sp: { name: 'PM 急件', desc: '對手被急件卡住，超遠傳球給隊友空中接力灌籃', need: true } },
  heilun: { name: '黑輪', role: '業務', skill: { name: '強力突破', kind: 'power' }, model: 'heilun_walk', color: '#e0663a', spd: 1.0, sht: 0.98, stl: 1.2, blk: 1.0,
    stat: '抄截 ★★★★★　投籃 ★★★', quote: '業績算我的！🤝',
    sp: { name: '業務抽成', desc: '從對手分數抽走 2 分，對手看傻 1 秒', need: false } },
  // 以下四位是主遊戲的備用角色（GPT 三視圖 → Tripo 3D → 綁走路與招牌動作）
  de: { name: '德哥', role: '財務長', skill: { name: '後撤步', kind: 'stepback' }, model: 'glasses_walk', color: '#5b6b82', spd: 0.94, sht: 1.03, stl: 1.0, blk: 0.95, h: 1.02,
    stat: '投籃 ★★★★　防守 ★★★★', quote: '這筆不能報。',
    sp: { name: '預算砍半', desc: '對手 6 秒跑速減半，大招集氣砍一半', need: false } },
  momo: { name: 'Momo', role: '行銷企劃', skill: { name: '轉身過人', kind: 'spin' }, model: 'bob_walk', color: '#ff6fa8', spd: 1.05, sht: 0.98, stl: 1.0, blk: 0.85,
    stat: '速度 ★★★★　人氣 ★★★★★', quote: '這篇一定會爆紅！✨',
    sp: { name: '爆紅貼文', desc: '8 秒內我方每次進球多 1 分，隊友大招 +25%', need: false } },
  zhe: { name: '阿哲', role: 'IT 工程師', skill: { name: '背身強打', kind: 'power' }, model: 'cap_walk', color: '#2f9e8f', spd: 0.98, sht: 1.0, stl: 0.95, blk: 1.15,
    stat: '蓋帽 ★★★★★　投籃 ★★★', quote: '你有試過重開機嗎？',
    sp: { name: '防火牆', desc: '7 秒內對手一般投籃全部被擋下', need: false } },
  zhen: { name: '小偵', role: '稽核專員', skill: { name: '快步切入', kind: 'dash' }, model: 'det_walk', color: '#b8864b', spd: 1.06, sht: 0.96, stl: 1.15, blk: 0.9,
    stat: '抄截 ★★★★★　速度 ★★★★', quote: '這張發票有問題。🔍',
    sp: { name: '現場稽核', desc: '衝去盤查守著持球隊友的防守者，對手愣住 2.5 秒', need: false } },
  // 香香籃球隊（使用者給的照片只當服裝參考，GPT 原創三視圖 → Tripo 3D）。str 力量（卡位、撞停）、reb 籃板範圍、reach 蓋帽距離
  lin: { name: '林語彤', role: '香香籃球隊・後衛', skill: { name: '閃身步', kind: 'dodge', big: true }, model: 'lin_walk', jog: 'lin_jog', color: '#1f8a5b', spd: 1.2, sht: 0.98, stl: 1.3, blk: 0.8, str: 0.8,
    stat: '速度 ★★★★★　抄截 ★★★★★', quote: '跟得上我再說。',
    sp: { name: '瞬影閃身', desc: '連續閃身過掉每一個防守者（對手全被晃倒），直接上籃得分', need: true } },
  yuan: { name: '元小雨', role: '香香籃球隊・中鋒', skill: { name: '強力突破', kind: 'power' }, model: 'yuan_walk', jog: 'yuan_jog', color: '#283d8f', spd: 0.95, sht: 0.98, stl: 0.95, blk: 1.45, str: 1.6, reb: 1.6, reach: 1.45, inside: 1.25, three: 0.6, dunk: 0.85,
    stat: '籃板 ★★★★★　火鍋 ★★★★★', quote: '籃下是我的。',
    sp: { name: '禁區女王', desc: '8 秒內對手的投籃她都飛過去蓋掉，籃板球自動被她吸走', need: false } },
  hu: { name: '胡姬', role: '香香籃球隊・射手', skill: { name: '多元進攻', kind: 'combo' }, model: 'hu_walk', jog: 'hu_jog', color: '#e86aa6', spd: 1.04, sht: 1.04, stl: 1.0, blk: 0.9, str: 0.95, three: 1.45,
    stat: '三分 ★★★★★　招式 ★★★★★', quote: '想猜我出什麼招？',
    sp: { name: '千變萬化', desc: '假動作騙起所有防守者（全部跳起來落空），再來一記必進後仰跳投', need: true } },
};
const KEYS = Object.keys(CHARS);
// 選角畫面只放這幾個人；其他人先藏起來（不在選角、封面、觀眾席出現），只有 3v3 對手湊不滿時才讓電腦用
const ROSTER = ['kui', 'jie', 'mi', 'vivi', 'kevin', 'lin', 'yuan', 'hu'];
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// 難度：電腦的命中、跑速、抄截、蓋帽、集氣倍率；green 是玩家投籃時機綠色區的寬度倍率
const DIFF = [
  { name: '簡單', shot: 0.8, speed: 0.9, steal: 0.55, block: 0.6, gauge: 0.8, green: 1.6 },
  { name: '普通', shot: 0.9, speed: 0.96, steal: 0.85, block: 1, gauge: 0.95, green: 1 },
  { name: '困難', shot: 1.0, speed: 1.02, steal: 1.15, block: 1.25, gauge: 1.1, green: 0.8 },
];
const dif = () => DIFF[S.diff ?? 1];
function newBuff() { return { coffee: 0, vivi: 0, viviNext: false, slow: 0, viral: 0, wall: 0, queen: 0 }; }
const TEAM_COLOR = ['#ff7a45', '#3f7fd9'];

// ---------- 載入 ----------
const K = {}, FACE = {}, SIG = {}, MOVES = {};
// 共用的細部動作（綁在小米身上一次，再套給每個人；高度交給遊戲物理）。窗口＝只播的那一段（秒）
const MOVE_WIN = { dodge: [0.1, 0.9], spin: [0.1, 1.1], stepback: [0.1, 1.0], push: [0.2, 1.3], stumble: [0.2, 1.4], rebound: [0.6, 1.5], block: [0.5, 1.4], slam: [0.2, 0.8],
  reach: [1.55, 2.2], sprint: [0, 0.6], knock: [0.5, 2.0], flop: [0.1, 1.6] };   // reach 抄截往前撲、sprint 持球衝刺、knock 被蓋倒、flop 撞人倒地
async function loadAll(progress) {
  const jogs = KEYS.filter(k => CHARS[k].jog).map(k => [k + 'Jog', CHARS[k].jog, 7]);
  const list = [...KEYS.map(k => [k, CHARS[k].model]), ...jogs, ['npcM', 'npc_m_walk'], ['npcF', 'npc_f_walk'], ['caishen', 'caishen_sit']];
  let n = 0; const all = list.length + KEYS.length + Object.keys(MOVE_WIN).length;
  await Promise.all([
    ...list.map(async ([k, f, lean]) => { K[k] = await loadKind(`models/${f}.glb`, lean ?? null); progress(++n / all); }),
    // 招牌動作只是動畫，載不到也不影響比賽
    ...KEYS.map(async k => { try { SIG[k] = await loadClip(`models/sig/${k}.glb`); } catch (e) { console.warn('sig', k, e); } progress(++n / all); }),
    ...Object.keys(MOVE_WIN).map(async k => { try { MOVES[k] = await loadClip(`models/moves/${k}.glb`); } catch (e) { console.warn('move', k, e); } progress(++n / all); }),
    ...Object.keys(OVER_WIN).map(async k => { try { OVER[k] = prepOver(await loadClip(`models/moves/${k}.glb`)); } catch (e) { console.warn('over', k, e); } }),
  ]);
}
// 招牌動作：大招時播一次（Higgsfield 綁的動作，套到同一套骨架上）
// 動作檔很長（有的 9 秒），只播最精彩的那一段（秒）：用 work/peek.html 一格一格看過挑的
const SIG_WIN = { kui: [0.4, 1.9], jie: [0.8, 1.73], mi: [0.5, 2.0], vivi: [1.0, 2.6], kevin: [2.4, 3.3], yan: [5.0, 5.9], heilun: [0, 1.5],
  de: [0.4, 2.2], momo: [0.6, 2.2], zhe: [0, 1.9], zhen: [0.6, 2.0], lin: [0.3, 1.8], yuan: [0.3, 1.9], hu: [0.3, 1.8] };
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
const st = (p, k, d = 1) => p.def[k] ?? d;   // 角色數值（沒寫就用預設）
// 真人風立繪（GPT 照使用者給的照片畫，tools/gen_real.sh → key_green.py）：art/角色_動作.webp
// 動作：dunk 灌籃、three 三分、fade 後仰跳投、steal 抄截；大招用 SP_ART 那張。沒有立繪的人（隱藏角色）大招用頭像
const ART_ACTS = ['dunk', 'three', 'fade', 'steal'];
const SP_ART = { kui: 'coffee', jie: 'dunk', mi: 'phone', vivi: 'boss', kevin: 'ai', lin: 'cross', yuan: 'block', hu: 'fade' };
const hasArt = (k) => k in SP_ART;
const artUrl = (k, a) => `art/${k}_${a}.webp?v=0.5.1`;
function preloadArt(keys) { for (const k of keys) if (hasArt(k)) for (const a of [...ART_ACTS, SP_ART[k]]) { const im = new Image(); im.src = artUrl(k, a); } }
let flashUntil = 0, flashTimer = 0;
// 動作立繪從旁邊滑進來一下（我方在左、對手在右），2 秒內只跳一次
function actionArt(p, act) {
  if (!hasArt(p.key) || S.cut || performance.now() < flashUntil) return;
  const el = $('flash'), NAME = { dunk: ['灌籃！', 'SLAM DUNK'], three: ['三分！', '3 POINTER'], fade: ['後仰！', 'FADEAWAY'], steal: ['抄截！', 'STEAL'] };
  flashUntil = performance.now() + 2000;
  el.querySelector('img').src = artUrl(p.key, act);
  el.style.setProperty('--art', `url(${artUrl(p.key, act)})`);
  el.querySelector('.ft b').textContent = NAME[act][0];
  el.querySelector('.ft i').textContent = `${p.def.name}・${NAME[act][1]}`;
  el.style.setProperty('--fc', p.def.color);
  if (act === 'dunk' || act === 'steal') hitStop(0.07);
  el.className = ''; void el.offsetWidth; el.className = 'on ' + (p.team === 0 ? 'l' : 'r');
  clearTimeout(flashTimer); flashTimer = setTimeout(() => { el.className = ''; }, 1150);
}
// 打擊定格：遊戲時間幾乎停住一下（不是 0，走路動畫會除以 dt）
function hitStop(d) { S.hitT = Math.max(S.hitT || 0, d); }
// 播一段共用動作（閃身、轉身、後撤步、卡位推人、踉蹌、搶板、火鍋…），用同一個「招牌動作」通道蓋過走路
function playMove(p, name, { speed = 1, dur } = {}) {
  const clip = MOVES[name]; if (!clip) return;
  const [w0, w1] = MOVE_WIN[name];
  const a = p.actor, act = a.mixer.clipAction(clip);
  if (a.sig && a.sig !== act) a.sig.stop();
  act.reset(); act.setLoop(THREE.LoopOnce); act.clampWhenFinished = true;
  act.time = w0; act.timeScale = dur ? (w1 - w0) / dur : speed; act.setEffectiveWeight(a.sigW || 0); act.play();
  a.sig = act; a.sigOn = true; a.sigW = a.sigW || 0;
  p.sigT = dur ?? (w1 - w0) / speed;
}
function stopSig(p) { p.sigT = 0; if (p.actor.sig) p.actor.sigOn = false; }
// 一直重複播一段（持球衝刺的前傾跑），停下來時用 stopSig 收掉
function playLoop(p, name, speed = 1) {
  const clip = MOVES[name]; if (!clip) return;
  const a = p.actor, act = a.mixer.clipAction(clip);
  if (a.sig && a.sig !== act) a.sig.stop();
  act.reset(); act.setLoop(THREE.LoopRepeat); act.time = MOVE_WIN[name][0]; act.timeScale = speed; act.setEffectiveWeight(a.sigW || 0); act.play();
  a.sig = act; a.sigOn = true; a.sigW = a.sigW || 0; p.sigT = 99;
}
// 倒地動作的臀部高度（原動作每 0.1 秒、相對站立）：共用動作拿掉了臀部位移，倒下時照這條曲線把整個人往下放
const MOVE_DROP = {
  knock: [0.92, 0.92, 0.92, 0.94, 0.95, 0.92, 0.86, 0.81, 0.79, 0.77, 0.79, 0.87, 0.82, 0.67, 0.44, 0.14, -0.08, -0.05, 0.02, 0.03, -0.01, -0.05, -0.09, -0.08, -0.08, -0.1],
  flop: [0.94, 0.93, 1.01, 1.28, 1.58, 1.72, 1.7, 1.52, 1.21, 0.77, 0.16, 0.02, 0.1, 0.15, 0.14, 0.08, 0.01, 0.03, 0.01, 0.01],
};
function dropOf(p) {
  const act = p.actor.sig, w = p.actor.sigW || 0; if (!act || w < 0.01) return 0;
  for (const k in MOVE_DROP) if (act.getClip() === MOVES[k]) {
    const c = MOVE_DROP[k], i = Math.min(c.length - 1, act.time / 0.1), i0 = Math.floor(i), v = c[i0] + (c[Math.min(c.length - 1, i0 + 1)] - c[i0]) * (i - i0);
    return Math.max(-0.95, v / c[0] - 1) * p.hipH * w;
  }
  return 0;
}
const playingMove = (p, name) => !!MOVES[name] && p.actor.sig?.getClip() === MOVES[name] && p.sigT > 0;
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
const ARM_BONES = ['RightArm', 'LeftArm', 'RightForeArm', 'LeftForeArm', 'Spine02', 'Spine', 'Spine01', 'neck', 'Head', 'LeftShoulder', 'RightShoulder', 'LeftHand', 'RightHand'];
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
// 上半身疊 3D 動作（舉手、投籃、蓋帽、歡呼、防守張手）：用 Higgsfield 動作庫綁好的片段，只取上半身骨頭的轉動，疊在走路／跑步上
// 不用程式直接轉肩膀：那樣只有手臂骨頭在轉，腋下的皮膚會被拉長（像蝴蝶袖）；動作庫的動作連鎖骨、脊椎一起動
// OVER_WIN：[開始秒, 結束秒] 來回播；同一個數字＝定格在那一格（用 tools/peek.html 一格一格看過挑的）
// guard 防守蹲低張手、handsup 雙手直直舉高（投籃、蓋帽、灌籃）、hop 雙手 V 字（歡呼）
const OVER_WIN = { guard: [0.4, 1.0], handsup: [0.9, 0.9], hop: [1.05, 1.35] };
const UPPER = ['Spine', 'Spine01', 'Spine02', 'neck', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand'];
const OVER = {}, _oq = new THREE.Quaternion();
function prepOver(clip) { return clip.tracks.filter(t => t.name.endsWith('.quaternion') && UPPER.includes(t.name.split('.')[0])).map(t => ({ bone: t.name.split('.')[0], it: t.createInterpolant() })); }
function overTime(name, t) { const [a, b] = OVER_WIN[name], d = b - a; if (d <= 0) return a; const u = ((t % (2 * d)) + 2 * d) % (2 * d); return a + (u < d ? u : 2 * d - u); }
// rig.ow：每段動作目前的權重，慢慢淡入淡出；tg＝這一格要哪一段（或 null）
function overlay(rig, tg, t, dt) {
  const ow = rig.ow || (rig.ow = {}), k = Math.min(1, dt * 12);
  for (const name in OVER_WIN) {
    const w = ow[name] = (ow[name] || 0) + ((tg === name ? 1 : 0) - (ow[name] || 0)) * k;
    const tr = OVER[name]; if (!tr || w < 0.01) continue;
    const tm = overTime(name, t + (rig.ph || 0));
    for (const o of tr) { const b = rig.bones[o.bone]; if (b) b.quaternion.slerp(_oq.fromArray(o.it.evaluate(tm)), w); }
  }
}

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
const BUSY = { down: 1, shoot: 1, lay: 1, block: 1, steal: 1, jdunk: 1, ai: 1, alley: 1, lob: 1, audit: 1, sig: 1, skill: 1, fake: 1, shadow: 1, mirage: 1 };
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
  const rig = rigOf(actor); actor.root.updateMatrixWorld(true);
  const hipH = rig.bones.Hips ? rig.bones.Hips.getWorldPosition(new THREE.Vector3()).y : 0.7;   // 站著時臀部離地多高（倒地時往下放）
  return { key, def, team, actor, ring, label, ...rig, hipH, x: 0, z: 0, y: 0, vy: 0, vx: 0, vz: 0, dvx: 0, dvz: 0, face: Math.PI,
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
  const out = ROSTER.filter(k => !S.pick.includes(k) && !S.opp.includes(k));
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
const inp = { x: 0, z: 0, keys: new Set(), c: false };   // c＝技能鍵按著（防守、卡位要按住）
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
  else if (e.code === 'KeyU' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') actSkill();
  else if (e.code === 'KeyI' || e.code === 'KeyE') actSpecial();
});
addEventListener('keyup', e => {
  inp.keys.delete(e.code);
  if (e.code === 'KeyJ' || e.code === 'Space') actShootUp();
  if (e.code === 'KeyU' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') inp.c = false;
});
addEventListener('blur', () => { inp.keys.clear(); inp.c = false; });

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
for (const [id, fn] of [['kShoot', actShoot], ['kPass', actPass], ['kSteal', actSteal], ['kSkill', actSkill], ['kSp', actSpecial]]) {
  const el = $(id);
  el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); document.body.classList.remove('kbd'); fx.audioInit(); el.classList.add('on'); fn(); });
  const off = () => { if (el.classList.contains('on') && id === 'kShoot') actShootUp(); if (id === 'kSkill') inp.c = false; el.classList.remove('on'); };
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
// 同一顆鍵攻守不同：持球＝投籃；球在空中或地上沒人拿＝搶籃板；防守＝蓋帽
const reboundTime = () => B.mode === 'shot' || B.mode === 'loose';
function actShoot() {
  const p = S.ctrl; if (!canAct(p)) return;
  if (holding(p)) {
    if (S.mustClear) { fx.toast('🔄 搶到球要先帶出三分線！'); flashArc(); return; }
    startShot(p, true);
  } else if (mateHasBall(p)) callForBall(p);
  else if (p.y <= 0) { if (reboundTime()) startRebound(p); else startBlock(p); }
}
// 隊友（電腦）持球
const mateHasBall = (p) => B.mode === 'held' && B.owner.team === p.team && B.owner !== p;
// 要球：隊友馬上傳過來（隊友在忙就等一下再傳）
function callForBall(p) {
  const h = B.owner; if (!mateHasBall(p)) return;
  if (busy(h) || h.stun > 0) { h.callT = 1.2; } else doPass(h, p);
  fx.floatText(V(p.x, 2.3, p.z), '給我！', TEAM_COLOR[p.team], 0.7);
}
// 技能鍵：持球＝角色的突破技；防守＝按住貼身防守（扇形干擾、可以撞停突破）；搶籃板時＝按住卡位
function actSkill() {
  const p = S.ctrl; inp.c = true; if (!canAct(p)) return;
  if (holding(p)) { inp.c = false; doSkill(p); }
  else if (mateHasBall(p)) { inp.c = false; p.dashT = 1.0; fx.floatText(V(p.x, 2.2, p.z), '空手切入', p.def.color, 0.7); }   // 沒球：衝刺跑位
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
  if (holding(p)) { const to = passTarget(p); if (to) doPass(p, to); else fx.toast('一打一沒有隊友可以傳'); }
  else if (mateHasBall(p)) callForBall(p);
  else if (B.mode === 'held' && B.owner.team !== p.team && !(S.trapT > 0)) {   // 防守：叫隊友一起包夾持球的人
    S.trapT = 2.5; fx.sfx.click(); fx.floatText(V(p.x, 2.3, p.z), '包夾！', TEAM_COLOR[p.team], 0.8);
  }
}
// 抄截鍵：持球時變成「假動作」（騙防守的人跳起來）
function actSteal() {
  const p = S.ctrl; if (!canAct(p)) return;
  if (holding(p)) return pumpFake(p);
  if (mateHasBall(p)) return callForBall(p);
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
    const R = 1.8 * (q.guard ? 1.2 : 1) * st(q, 'reach');
    if (d > R) continue;
    const front = (dx * hx + dz * hz) / (d * hl || 1);   // 1 = 正前方
    c = Math.max(c, (R - d) / R * (0.55 + 0.45 * Math.max(0, front)) * (q.y > 0.2 ? 1.25 : 1) * (q.guard ? 1.35 : 1));
  }
  if (p.openT > 0) c *= 0.35;   // 後撤步、後仰拉出空間
  return c;
}
function shotProb(p, x = p.x, z = p.z, lay = false) {
  const d = hoopDist(x, z), three = isThree(x, z);
  let b = lay ? 0.76 : d < 3 ? 0.6 : !three ? 0.5 : Math.max(0.08, 0.42 - Math.max(0, d - 6) * 0.07);
  b -= contest(p, x, z) * (lay ? 0.5 : 0.38);
  if (!lay && Math.hypot(p.vx, p.vz) > 2.5) b -= 0.06;
  b *= p.def.sht * (p.team === 1 ? dif().shot : 1);
  b *= three ? st(p, 'three') : lay || d < 3 ? st(p, 'inside') : 1;   // 射手三分準、中鋒籃下強三分差
  if (oppsOf(p).some(q => q.def.nag && q.stun <= 0 && Math.hypot(q.x - x, q.z - z) < 2.6)) b *= 0.75;   // Kevin 在旁邊碎念「用 AI 就好」
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
  B.mode = 'held'; B.owner = p; B.recv = null; p.holdT = 0; p.aiT = 0.25; p.callT = 0;   // 上一次拿球時你喊的「給我」不算數
  if (prev !== p.team) {
    S.poss = p.team; S.possN = (S.possN || 0) + 1; S.mustClear = how !== 'check' && !isThree(p.x, p.z); S.onBall = [null, null];
    for (const q of oppsOf(p)) q.stealCd = Math.max(q.stealCd, 1.0);   // 剛換球權，對手先不能馬上抄回去
  } else if (S.mustClear && isThree(p.x, p.z)) S.mustClear = false;
  if (S.prac && S.prac.opp !== '1v1') { S.mustClear = false; if (p.team === 1) S.prac.retT = 0.7; }   // 練習：不用清球；陪練搶到球等一下就還你
  // 你操作的人固定是選角時第一個點的人（S.ctrl），不會因為誰拿到球就換人
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
  const d = hoopDist(p.x, p.z);
  if (d < 1.9) {   // 上籃／灌籃
    const dunk = Math.random() < st(p, 'dunk', 0.1);   // 籃下出手：中鋒大多灌籃，後衛、射手大多上籃
    const fx_ = HOOP.x + (p.x - HOOP.x) / (d || 1) * 0.42, fz = Math.max(HOOP.z + 0.25, HOOP.z + (p.z - HOOP.z) / (d || 1) * 0.42);
    p.act = { type: 'lay', t: 0, sx: p.x, sz: p.z, tx: fx_, tz: fz, dunk, rel: false };
  } else {
    p.act = { type: 'shoot', t: 0, sx: p.x, sz: p.z, rel: false, hold: user && !G.auto, relAt: user && !G.auto ? 9 : rand(0.25, 0.31) };
    p.vy = CFG.jumpV; p.y = 0.01;
    if (user && !G.auto) S.meter = { p, act: p.act, res: null, hideAt: 0 };   // 記住是哪一次投籃：動作被打斷就收掉
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
  // 元小雨「禁區女王」：對手一般出手，她直接飛過去蓋掉
  const queen = !opt.sure && oppsOf(p).find(q => q.key === 'yuan' && S.buff[q.team].queen > 0 && q.stun <= 0 && dist2(q, p) < 6.5);
  if (queen) {
    const dx = HOOP.x - p.x, dz = HOOP.z - p.z, l = Math.hypot(dx, dz) || 1;
    queen.x = p.x + dx / l * 0.7; queen.z = p.z + dz / l * 0.7; queen.y = Math.max(queen.y, 0.6); queen.vy = 4; queen.act = { type: 'block', t: 0.1 };
    queen.face = Math.atan2(p.x - queen.x, p.z - queen.z); playMove(queen, 'block', { dur: 0.5 });
    fx.shockwave(V(queen.x, 0, queen.z), 0x5f7fff, 3); fx.floatText(V(queen.x, 2.6, queen.z), '禁區女王！', queen.def.color, 1.2);
  }
  // 蓋火鍋（蓋帽距離看角色，元小雨最遠）
  if (!opt.sure) for (const q of oppsOf(p)) {
    if (q.stun > 0 || q.y < 0.25 || dist2(q, p) > 1.2 * st(q, 'reach')) continue;
    if (q === queen) q.blockBoost = 9;
    if (Math.random() < CFG.blockP * q.def.blk * (q.blockBoost || 1)) {
      const dx = p.x - HOOP.x, dz = p.z - HOOP.z, l = Math.hypot(dx, dz) || 1;
      handsPos(p, B.pos); loseBall(V(dx / l * 4 + rand(-1.5, 1.5), 2.5, dz / l * 4));
      log(`block ${q.key}`); fx.sfx.block(); fx.floatText(V(q.x, q.y + 2.2, q.z), '蓋火鍋！', '#3f7fd9', 1.1); fx.camKick(0.6); cam.shake = 0.2;
      if (Math.random() < 0.28 * st(q, 'str') / st(p, 'str')) knockDown(p, 'knock', '被蓋倒！', q);   // 力氣大的（中鋒）蓋下去會連人帶球蓋倒
      addGauge(q, CFG.gBlock); slow(0.35, 0.5);
      return;
    }
  }
  let prob = opt.sure ? 1 : shotProb(p, sx, sz, lay);
  if (a.type === 'shoot' && a.press != null) prob = THREE.MathUtils.clamp(prob + timingBonus(p, a.press), 0.03, 0.98);
  let make = Math.random() < prob;
  const wall = !opt.sure && S.buff[1 - p.team].wall > 0;
  if (wall) make = false;   // 阿哲的防火牆：對手一般投籃全部擋掉
  if (S.prac && p === S.ctrl) { S.prac.att++; if (pts >= 3) S.prac.att3++; }
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
  // 被蓋火鍋、被暈、換球權、放大招……投籃動作沒走完就換成別的動作：時機條馬上收掉，不要黏著角色跑
  const cut = m && !m.res && (m.p.act !== m.act || S.phase !== 'play' || S.cut);
  if (!m || cut || (m.hideAt && performance.now() > m.hideAt) || S.mode !== 'play') { if (el.className) el.className = ''; if (m && (m.hideAt || cut)) S.meter = null; return; }
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
  p.act = { type: 'block', t: 0 }; p.vy = CFG.blockV * (0.9 + 0.1 * st(p, 'reach')); p.y = 0.01; fx.sfx.jump(); playMove(p, 'block', { dur: 0.6 });
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
  playMove(p, 'reach', { dur: 0.42 });   // 往前撲、手伸直去掏球
}
function resolveSteal(p) {
  const h = B.mode === 'held' ? B.owner : null, coffee = S.buff[p.team].coffee > 0;
  if (h && h.team !== p.team && dist2(p, h) < CFG.stealR * (coffee ? 1.35 : 1) && !busy(h)) {
    const low = (B.dribH ?? 1) < 0.45 || h.stopT > 0;   // 球彈在地上、被撞停的時候最好抄
    const ch = CFG.stealP * p.def.stl * (coffee ? 1.8 : 1) * (p.team === 0 ? 1.15 : 1) * (h.stun > 0 ? 3 : 1) * (low ? 1.6 : 0.8) * (h.stopT > 0 ? 1.8 : 1);
    if (Math.random() < ch) {
      gainBall(p, 'steal'); log(`steal ${p.key}`); fx.sfx.steal(); fx.floatText(V(p.x, 2.3, p.z), '抄截！', TEAM_COLOR[p.team], 1); actionArt(p, 'steal');
      addGauge(p, CFG.gSteal); h.pickCd = 0.5; return;
    }
  } else if (B.mode === 'loose' && Math.hypot(B.pos.x - p.x, B.pos.z - p.z) < 1.1 && B.pos.y < 1.7) { gainBall(p, 'loose'); fx.sfx.catch(); return; }
  fx.sfx.whiff();
  if (p === S.ctrl) fx.floatText(V(p.x, 2.1, p.z), h && dist2(p, h) < CFG.stealR ? '撲空' : '太遠了', '#8a97a8', 0.6);
}

// ---------- 細部動作：搶板、突破技、假動作 ----------
// 搶籃板：往球的方向跳，籃板範圍大的人跳得高、搆得遠
function startRebound(p) {
  p.act = { type: 'block', t: 0, reb: true }; p.vy = CFG.blockV * (0.9 + 0.12 * st(p, 'reb')); p.y = 0.01; fx.sfx.jump();
  const dx = B.pos.x - p.x, dz = B.pos.z - p.z, d = Math.hypot(dx, dz) || 1;
  if (d < 3) { p.vx = dx / d * Math.min(3.5, d * 2); p.vz = dz / d * Math.min(3.5, d * 2); p.face = Math.atan2(dx, dz); }
  playMove(p, 'rebound', { dur: 0.65 });
}
const fwdOf = (p) => { const dx = HOOP.x - p.x, dz = HOOP.z + 0.3 - p.z, l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; };
// 前面擋路的防守者
function frontDefender(p, R = 2.0) {
  const [fx_, fz_] = fwdOf(p); let best = null, bd = R;
  for (const q of oppsOf(p)) { if (q.stun > 0) continue; const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz); if (d < bd && (dx * fx_ + dz * fz_) / (d || 1) > 0.2) { bd = d; best = q; } }
  return best;
}
// 角色突破技（持球按技能鍵）：閃身、轉身、後撤步、強力突破、快步切入；胡姬看位置自動選招
const SKILL_CD = 2.4;
function doSkill(p, as = null) {   // as：指定招式（胡姬的連招用）
  if (!as && p.skillCd > 0) { if (p === S.ctrl) fx.toast(`「${p.def.skill.name}」冷卻中`); return; }
  const kind = as || p.def.skill?.kind || 'dash';
  p.skillCd = SKILL_CD;
  log(`skill ${p.key} ${kind}`);
  const [fx_, fz_] = fwdOf(p), v = frontDefender(p);
  const side = v ? ((v.x - p.x) * fz_ - (v.z - p.z) * fx_ > 0 ? -1 : 1) : (Math.random() < 0.5 ? -1 : 1);   // 往防守者的另一邊閃
  const px_ = fz_ * side, pz_ = -fx_ * side;
  if (kind === 'combo') return huCombo(p, v);
  if (kind === 'dash') { p.dashT = 1.0; fx.sfx.pass(); fx.floatText(V(p.x, 2.2, p.z), p.def.skill.name, p.def.color, 0.7); return; }
  const big = p.def.skill.big;
  const M = {
    dodge: { f: 1.0, s: big ? 1.7 : 1.15, dur: big ? 0.4 : 0.45, move: 'dodge' },
    spin: { f: 1.7, s: 0.7, dur: 0.6, move: 'spin' },
    stepback: { f: -1.3, s: 0, dur: 0.45, move: 'stepback' },
    power: { f: 1.15, s: 0, dur: 0.5, move: 'push' },
  }[kind];
  p.act = { type: 'skill', kind, t: 0, dur: M.dur, fx: p.x, fz: p.z, tx: p.x + fx_ * M.f + px_ * M.s, tz: p.z + fz_ * M.f + pz_ * M.s, v, done: false, then: null };
  playMove(p, M.move, { dur: M.dur + 0.15 });
  fx.floatText(V(p.x, 2.2, p.z), p.def.skill.name, p.def.color, 0.7); fx.sfx.whiff();
  return p.act;
}
// 倒地：球掉出去、1.5 秒後爬起來（clip：knock 往後倒、flop 撞人後仰天倒）
function knockDown(p, clip, text, by) {
  if (holding(p)) { const [fx_, fz_] = fwdOf(p); handsPos(p, B.pos); loseBall(V(fx_ * 2.2 + rand(-1, 1), 2.4, fz_ * 2.2 + rand(-1, 1))); }
  p.act = { type: 'down', t: 0, dur: 1.5 }; p.driving = false; p.driveT = 0; p.pickCd = 1.2; p.vx *= 0.3; p.vz *= 0.3;
  playMove(p, clip, { dur: 1.5 });
  fx.floatText(V(p.x, 2.3, p.z), text, by ? TEAM_COLOR[by.team] : '#e0413b', 1.1); fx.puff(V(p.x, 0.1, p.z), 0xffffff); log(`down ${p.key} ${clip}`);
}
// 持球往籃框衝：推著搖桿直直衝向籃框 0.3 秒就開始「衝刺切入」（前傾跑、變快）；撞上擺好防守架式的人會被撞倒
function updateDrive(p, dt) {
  const sp = Math.hypot(p.vx, p.vz), hx = HOOP.x - p.x, hz = HOOP.z - p.z, hl = Math.hypot(hx, hz) || 1;
  const ok = holding(p) && !busy(p) && p.stun <= 0 && !(p.stopT > 0) && p.y <= 0 && S.phase === 'play' && !S.cut && hl > 1.7
    && sp > speedOf(p) / (p.driving ? 1.3 : 1) * 0.6 && (p.vx * hx + p.vz * hz) / (sp * hl || 1) > 0.55;
  p.driveT = ok ? (p.driveT || 0) + dt : 0;
  const was = p.driving; p.driving = p.driveT > 0.3;
  if (p.driving && !was) { playLoop(p, 'sprint', 1.2); fx.sfx.pass(); }
  else if (!p.driving && was && playingMove(p, 'sprint')) stopSig(p);
  if (!p.driving) return;
  if (Math.random() < 0.5) fx.puff(V(p.x - p.vx * 0.05, 0.1, p.z - p.vz * 0.05), 0xffffff);
  for (const q of oppsOf(p)) {
    if (q.stun > 0 || q.y > 0.1 || busy(q) || !q.guard) continue;
    const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
    if (d > 0.85 || (dx * p.vx + dz * p.vz) / (d * sp || 1) < 0.5) continue;
    p.driveT = 0; p.driving = false; stopSig(p); fx.sfx.block(); fx.camKick(0.5);
    const ratio = st(q, 'str') / st(p, 'str'), base = q === S.ctrl && !G.auto ? 0.65 : 0.35;   // 你按住防守擺好架式最容易撞倒人
    if (Math.random() < base * ratio) knockDown(p, 'flop', '撞倒！進攻犯規', q);
    else { p.stopT = 0.6; playMove(p, 'stumble', { dur: 0.6 }); fx.floatText(V(p.x, 2.3, p.z), '撞停！', TEAM_COLOR[q.team], 1); }
    break;
  }
}
// Kevin 防守時一直碎念「用 AI 就好」：附近持球的人命中率下降（shotProb）
const NAG = ['這個用 AI 就好…', 'AI 算過你投不進', '要不要先問一下 AI？', '命中率只有 12% 喔', '我用 GPT 模擬過了', '這球交給 AI 比較準'];
function updateNag(p, dt) {
  const h = B.mode === 'held' && B.owner.team !== p.team ? B.owner : null;
  if (!h || p.stun > 0 || dist2(p, h) > 2.6 || S.phase !== 'play') return;
  if ((p.nagT = (p.nagT || 0) - dt) > 0) return;
  p.nagT = rand(1.1, 1.6);
  fx.floatText(V(p.x + rand(-0.3, 0.3), 2.5, p.z), '🤖 ' + NAG[Math.floor(Math.random() * NAG.length)], '#3f7fd9', 1.05);
}
// 突破判定（動作做到一半）：防守者貼身防守、力氣大可以「撞停」；沒擋住就被晃倒或撞開
function resolveSkill(p, a) {
  const v = a.v; if (!v || v.stun > 0 || dist2(v, p) > 2.2) return;
  const ratio = st(v, 'str') / st(p, 'str');
  if (a.kind !== 'stepback' && v.guard) {
    const stop = 0.45 * ratio * (p.def.skill.big ? 0.35 : 1) * (a.kind === 'power' ? 0.7 : 1);
    if (Math.random() < stop) {
      p.act = null; p.stopT = 0.8; playMove(p, 'stumble', { dur: 0.7 });
      fx.floatText(V(p.x, 2.3, p.z), '撞停！', TEAM_COLOR[v.team], 1); fx.sfx.block(); log(`stop ${v.key}`);
      return;
    }
  }
  if (a.kind === 'dodge' || a.kind === 'spin') {
    if (Math.random() < (p.def.skill.big ? 0.85 : 0.5) / Math.max(0.7, ratio)) {
      v.stun = p.def.skill.big ? 1.0 : 0.7; v.act = null; playMove(v, 'stumble', { dur: v.stun });
      fx.floatText(V(v.x, 2.3, v.z), '晃倒！', TEAM_COLOR[p.team], 1); log(`ankle ${p.key}`);
    }
  } else if (a.kind === 'power') {
    const [fx_, fz_] = fwdOf(p); v.x += fx_ * 0.9; v.z += fz_ * 0.9;
    if (Math.random() < 1 / (ratio * rand(0.8, 1.4))) { v.stun = 0.6; v.act = null; playMove(v, 'stumble', { dur: 0.6 }); fx.floatText(V(v.x, 2.3, v.z), '撞開！', TEAM_COLOR[p.team], 0.9); }
    fx.camKick(0.4); fx.sfx.block();
  }
}
// 胡姬的多元進攻：籃下轉身上籃、中距離後仰跳投、三分線外後撤步三分
function huCombo(p, v) {
  const d = hoopDist(p.x, p.z);
  if (d < 2.4) doSkill(p, 'spin').then = 'lay';
  else if (!isThree(p.x, p.z)) startFade(p);
  else doSkill(p, 'stepback').then = 'shoot';
}
// 後仰跳投：往後跳、干擾大減、自動在最高點出手
function startFade(p, sure = false) {
  if (!holding(p)) return;
  const [fx_, fz_] = fwdOf(p);
  p.act = { type: 'shoot', t: 0, sx: p.x, sz: p.z, rel: false, hold: false, relAt: 0.3, fade: true, sure };
  p.vy = CFG.jumpV * 1.05; p.y = 0.01; p.vx = -fx_ * 2.2; p.vz = -fz_ * 2.2; p.openT = 0.6;
  p.face = Math.atan2(fx_, fz_); fx.sfx.jump();
  fx.floatText(V(p.x, 2.4, p.z), '後仰跳投', p.def.color, 0.8);
  actionArt(p, 'fade');
}
// 假動作：附近的防守者可能被騙跳起來
function pumpFake(p) {
  if ((p.fakeCd || 0) > 0) return;
  p.fakeCd = 0.9; p.act = { type: 'fake', t: 0 }; log(`fake ${p.key}`);
  for (const q of oppsOf(p)) if ((q !== S.ctrl || G.auto) && q.stun <= 0 && !busy(q) && q.y <= 0 && dist2(q, p) < 2.0 && Math.random() < 0.55 * (q.team === 1 ? dif().block : 1)) {
    startBlock(q); q.bitten = true; fx.floatText(V(q.x, 2.3, q.z), '被騙了！', TEAM_COLOR[p.team], 0.8);
  }
}

// ---------- 得分 ----------
function addGauge(p, n) {
  const was = p.gauge; p.gauge = Math.min(100, p.gauge + n);
  if (was < 100 && p.gauge >= 100) { if (p.team === 0) { fx.sfx.full(); fx.toast(`⚡ ${p.def.name}的大招「${p.def.sp.name}」集滿了！`); } p.spWait = rand(0.6, 2.5); }
}
function scored(p, pts, kind) {
  const t = p.team, base = pts;
  if (S.buff[t].viviNext) { pts = Math.max(pts, 3); S.buff[t].viviNext = false; fx.floatText(V(HOOP.x, HOOP.y + 1.4, HOOP.z), '👑 老闆說算 3 分', '#d9a63a', 1); }
  if (S.buff[t].viral > 0) { pts += 1; fx.floatText(V(HOOP.x, HOOP.y + 1.7, HOOP.z), '❤️ 爆紅加成 +1', '#ff4fa0', 0.9); }
  S.score[t] += pts; p.pts += pts; log(`score ${p.key} +${pts} ${kind} → ${S.score}`);
  addGauge(p, CFG.gScore);
  if (S.lastPass && S.lastPass.from.team === t && S.lastPass.from !== p && S.t - S.lastPass.t < 4) addGauge(S.lastPass.from, CFG.gAssist);
  bumpScore(t, '+' + pts);
  fx.floatText(V(HOOP.x, HOOP.y + 0.9, HOOP.z + 0.3), '+' + pts, TEAM_COLOR[t], 1.5);
  if (kind === 'dunk' || pts >= 3) actionArt(p, kind === 'dunk' ? 'dunk' : 'three');
  // 有立繪的人用旁邊滑進來的立繪；沒有的才出下方的小橫幅
  if (!hasArt(p.key)) { if (kind === 'dunk') fx.banner('灌籃！', `${p.def.name} +${pts}`, 0, TEAM_COLOR[t]); else if (pts >= 3) fx.banner(`${p.def.name} 三分球！`, '', 3, TEAM_COLOR[t]); }
  (pts >= 3 ? fx.sfx.score3 : fx.sfx.score)(); fx.sfx.cheer(t === 0 ? 0.4 : 0.22);
  fx.confetti(V(HOOP.x, HOOP.y, HOOP.z + 0.3), pts >= 3 || kind === 'dunk' ? 70 : 30, 0.8);
  p.cheer = 1.8; for (const c of crowd) c.cheer = rand(1, 2);
  S.phase = 'score'; S.phaseT = 1.8; S.nextPoss = 1 - t;
  if (S.prac && p === S.ctrl) { S.prac.made++; if (base >= 3) S.prac.made3++; S.prac.att = Math.max(S.prac.att, S.prac.made); S.prac.att3 = Math.max(S.prac.att3, S.prac.made3); }
  if (S.prac && S.prac.opp !== '1v1') { S.nextPoss = 0; S.phaseT = 1.0; return; }   // 練習：球直接還你，不換球權
  if (S.score[t] >= target() || S.buzzer || S.sudden) S.endAfter = true;
}
function bumpScore(t, txt) {
  const el = $(t ? 'scB' : 'scA'); el.textContent = S.score[t]; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  const tm = el.parentNode; tm.classList.remove('hit'); void tm.offsetWidth; if (txt[0] !== '-') tm.classList.add('hit');
  const r = el.getBoundingClientRect(), s = document.createElement('div');
  s.className = 'pts' + (+txt.slice(1) >= 3 ? ' big' : ''); s.textContent = txt; s.style.setProperty('--pc', txt[0] === '-' ? '#e0413b' : TEAM_COLOR[t]);
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
  S.poss = h.team; S.possN = (S.possN || 0) + 1; S.mustClear = false;
  gainBall(h, 'check'); S.onBall = [null, null];
  S.phase = 'check'; S.phaseT = 0.9;
  fx.sfx.whistle();
  fx.toast(h.team === 0 ? '🏀 我方球權' : '🛡️ 對手球權，回防！', TEAM_COLOR[h.team]);
}

// ---------- 大招 ----------
function teamHasBall(t) { return (B.mode === 'held' && B.owner.team === t) || (B.mode === 'pass' && B.recv && B.recv.team === t && B.passer.team === t); }
function specialBlock(p) {
  if (p.gauge < 100) return `大招還沒集滿（${Math.floor(p.gauge)}%）`;
  if (S.phase !== 'play' || S.cut) return '現在不能放大招';
  if (p.stun > 0) return '暈頭轉向中…';
  if (busy(p)) return '';
  // 大招只有我方持球（進攻）時能放，而且一次球權只能放一次（球在對手手上時對手才可能放）
  if (!(B.mode === 'held' && B.owner.team === p.team)) return '大招要我方持球（進攻）時才能放';
  if (S.spPoss === S.possN && !(S.prac && S.prac.inf)) return '這一波進攻已經放過大招了';
  if (busy(B.owner)) return '';
  if (p.key === 'yan' && !alleyMate(p)) return '隊友現在接不到';
  return null;
}
// 空中接力的人：沒在忙、沒被暈的隊友裡最好的
function alleyMate(p) {
  const ok = teamOf(p.team).filter(q => q !== p && !busy(q) && q.stun <= 0);
  return ok.sort((a, b) => hoopDist(a.x, a.z) - hoopDist(b.x, b.z))[0] || null;
}
function startSpecial(p) {
  if (specialBlock(p) !== null) return false;
  p.gauge = 0; S.cut = { p, t: 0 }; S.ts = 0.06; S.spPoss = S.possN; log(`special ${p.key}`);
  hitStop(0.08);
  const el = $('cutin');
  el.style.setProperty('--cc', p.def.color); el.style.setProperty('--tc', TEAM_COLOR[p.team]);
  el.querySelector('.face').style.backgroundImage = `url(${FACE[p.key]})`;
  el.classList.toggle('hasArt', hasArt(p.key));
  if (hasArt(p.key)) { const u = artUrl(p.key, SP_ART[p.key]); el.querySelector('.art').src = u; el.style.setProperty('--art', `url(${u})`); }
  $('flash').className = '';
  el.querySelector('.who').innerHTML = `<b>${p.team === 0 ? '我方' : '對手'}</b>${p.def.role}　${p.def.name}`;
  el.querySelector('.sp').textContent = p.def.sp.name;
  el.querySelector('.bgw').textContent = Array(3).fill(p.def.sp.name).join('　');
  el.querySelector('.q').textContent = '「' + p.def.quote.replace(/\p{Extended_Pictographic}|\uFE0F/gu, '').trim() + '」';
  el.className = ''; void el.offsetWidth; el.className = 'on' + (hasArt(p.key) ? ' hasArt' : '') + (p.team ? ' opp' : '');
  fx.sfx.cutin(); if (CLOSEUP) cam.zoom = 0.82;
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
      fx.toast('☕ 咖啡衝刺：全隊加速、傳球秒到');
      break;
    case 'jie':
      ensureBall(p);
      p.act = { type: 'jdunk', t: 0, sx: p.x, sz: p.z, pts: isThree(p.x, p.z) ? 3 : 2, slam: false, paper: 0 };
      sideCam(p.x, p.z, 2.6);
      fx.toast('📐 設計稿灌籃：這稿一次就過');
      break;
    case 'mi':
      fx.sfx.ring(); setTimeout(() => fx.sfx.ring(), 500); setTimeout(() => fx.sfx.ring(), 1000);
      for (const q of opp) {
        q.stun = CFG.stun; q.act = null; addIcon(q, '📞', CFG.stun, 2.25, 0.6);
        fx.shockwave(V(q.x, 0, q.z), 0xb46bff, 2.5);
      }
      fx.toast('📞 總機干擾：對手電話接不完，趁現在出手');
      break;
    case 'vivi':
      S.buff[t].vivi = CFG.vivi; S.buff[t].viviNext = true; fx.sfx.boss();
      addIcon(p, '👑', CFG.vivi, 2.25, 0.6);
      fx.pillar(V(HOOP.x, 0, HOOP.z), 0xffd76a, 1.2, 6);
      fx.toast('👑 老闆說了算：籃框變大、下一球算 3 分');
      break;
    case 'kevin':
      ensureBall(p);
      p.act = { type: 'ai', t: 0, sx: p.x, sz: p.z, pts: isThree(p.x, p.z) ? 3 : 2, rel: false };
      kevinFx(p);
      KV.zoom = 2.4;   // 鏡頭往 Kevin 和籃框中間移、稍微拉近，看得到瞄準環和雷射
      fx.toast('🤖 這個用 AI 就好：AI 計算中…命中率 100%');
      break;
    case 'yan': {
      const m = alleyMate(p);
      ensureBall(p);
      for (const q of opp) { q.stun = 1.8; q.act = null; addIcon(q, '📄', 1.8, 2.2, 0.5); }
      const side = m.x < 0 ? -1 : 1;
      m.act = { type: 'alley', t: 0, fx: m.x, fz: m.z, sx: HOOP.x + side * 1.0, sz: HOOP.z + 1.1, ph: 'dash', jt: 0, slam: false };
      p.act = { type: 'lob', t: 0, to: m };
      sideCam(m.x, m.z, 2.4);
      fx.toast('📋 PM 急件：空中接力，今天就要！');
      break;
    }
    case 'heilun': {
      const o = 1 - t, take = Math.min(2, S.score[o]);
      S.score[o] -= take; S.score[t] += take; p.pts += take;
      if (take) { bumpScore(o, '-' + take); bumpScore(t, '+' + take); }
      fx.sfx.cash();
      for (const q of opp) { fx.confetti(V(q.x, 1.2, q.z), 30, 0.7); fx.floatText(V(q.x, 2.3, q.z), '業績被抽成', '#36a35d', 0.8); }
      for (const q of opp) { q.stun = Math.max(q.stun, 1); q.act = null; }
      addIcon(p, '💰', 2.5, 2.25, 0.55);
      fx.toast(take ? `🤝 業務抽成：對手 -${take}、我方 +${take}` : '🤝 業務抽成：對手看傻了');
      // 到 21 分、延長賽、時間到之後抽到分：跟進球一樣結束（不然延長賽被追平會變成平手判輸）
      if (S.score[t] >= CFG.target || (take && (S.sudden || S.buzzer))) { S.endAfter = true; S.phase = 'score'; S.phaseT = 1.6; }
      break;
    }
    case 'de':   // 預算砍半：對手跑速減半 6 秒，大招集氣砍一半
      S.buff[1 - t].slow = CFG.slow; fx.sfx.stun();
      for (const q of opp) { q.gauge *= 0.5; addIcon(q, '📉', CFG.slow, 2.2, 0.5); fx.floatText(V(q.x, 2.4, q.z), '預算砍半', '#6b7a8f', 0.8); }
      fx.toast('📉 預算砍半：對手變慢、大招集氣砍一半');
      break;
    case 'momo':   // 爆紅貼文：8 秒內我方每次進球多 1 分，隊友大招 +25%
      S.buff[t].viral = CFG.viral; fx.sfx.boss();
      for (const q of teamOf(t)) { if (q !== p) addGauge(q, 25); addIcon(q, '❤️', CFG.viral, 2.2, 0.45); }
      for (const c of crowd) c.cheer = CFG.viral;
      heartRain(t);
      fx.toast('📱 爆紅貼文：8 秒內進球都多 1 分');
      break;
    case 'zhe':   // 防火牆：7 秒內對手一般投籃全部擋掉
      S.buff[t].wall = CFG.wall; fx.sfx.laser();
      fx.shockwave(V(HOOP.x, 0, HOOP.z), 0x5fd0ff, 6);
      fx.toast('🛡️ 防火牆啟動：對手投籃全部擋下 7 秒');
      break;
    case 'zhen': {   // 現場稽核：衝到持球的對手面前把球拿走，對手愣住
      const h = opp.slice().sort((a, b) => dist2(a, B.owner) - dist2(b, B.owner))[0];
      const tx = h.x, tz = h.z;
      p.act = { type: 'audit', t: 0, fx: p.x, fz: p.z, tx: tx - Math.sin(p.face) * 0.4, tz: tz - Math.cos(p.face) * 0.4, h };
      fx.toast('🔍 現場稽核：這張發票有問題，跟我走一趟');
      break;
    }
    case 'lin': {   // 瞬影閃身：Z 字閃過每個防守者（全部晃倒），最後必進上籃
      ensureBall(p);
      const pts = [], [fx_, fz_] = fwdOf(p); let x = p.x, z = p.z, side = 1;
      const order = opp.slice().sort((a, b) => dist2(a, p) - dist2(b, p));
      for (const q of order) { const qx = q.x + fz_ * side * 0.9, qz = q.z - fx_ * side * 0.9; pts.push({ x: qx, z: qz, q }); side = -side; }
      pts.push({ x: HOOP.x + fz_ * 0.3, z: HOOP.z + 1.3 });
      p.act = { type: 'shadow', t: 0, seg: 0, pts: pts.map(o => ({ ...o, x: THREE.MathUtils.clamp(o.x, -5.6, 5.6), z: THREE.MathUtils.clamp(o.z, 0.8, 10.5) })), sx: p.x, sz: p.z, ghost: 0 };
      fx.toast('💨 瞬影閃身：跟得上我再說');
      break;
    }
    case 'yuan':   // 禁區女王：8 秒內對手投籃都被她蓋、籃板球被她吸走
      S.buff[t].queen = CFG.queen; fx.sfx.boss(); fx.camKick(0.8); cam.shake = 0.3;
      addIcon(p, '👑', CFG.queen, 2.3, 0.55);
      fx.shockwave(V(HOOP.x, 0, HOOP.z + 1), new THREE.Color(p.def.color).getHex(), 7);
      fx.toast('🏀 禁區女王：籃下是我的');
      break;
    case 'hu': {   // 千變萬化：假動作騙起所有防守者，再必進後仰跳投
      ensureBall(p);
      p.act = { type: 'mirage', t: 0, bit: false };
      fx.toast('🌀 千變萬化：想猜我出什麼招？');
      break;
    }
  }
  // 招牌動作：站著擺姿勢的大招鎖 1 秒多；灌籃、接力、AI 投籃、閃身、後仰在各自的動作裡播
  if (['kui', 'mi', 'vivi', 'heilun', 'de', 'momo', 'zhe', 'yuan'].includes(p.key)) playSig(p, { lock: true });
  else if (p.key === 'kevin') playSig(p);
  specialCam(p);
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
  return CFG.speed * p.def.spd * (p.dashT > 0 ? 1.55 : 1) * (p.driving ? 1.3 : 1) * (p.guard ? 0.85 : 1) * (S.buff[p.team].coffee > 0 ? 1.45 : 1) * (S.buff[p.team].slow > 0 ? 0.55 : 1) * (holding(p) ? CFG.handler : 1) * (p.team === 1 ? dif().speed : 1);
}
function think(p, dt) {
  p.dvx = p.dvz = 0;
  if (p.bench) return;
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
    if (d < 0.9 * st(p, 'reb') && B.pos.y > 1.45 && B.pos.y < 2.7 + 0.3 * (st(p, 'reb') - 1) && B.vel.y < 1 && p.y <= 0 && !p.act) startRebound(p);
  } else {
    const dx = tx - HOOP.x, dz = tz - HOOP.z, l = Math.hypot(dx, dz) || 1;
    goTo(p, tx - dx / l * 1.4, tz - dz / l * 1.4, 0.8);
  }
}
function aiHandler(p, dt) {
  p.holdT += dt;
  if (S.prac && S.prac.opp !== '1v1' && p.team === 1) return;   // 陪練不進攻，拿到球等著還你
  if (p.callT > 0) { p.callT -= dt; if (!busy(p) && p.stun <= 0) { p.callT = 0; doPass(p, S.ctrl); return; } }   // 你喊要球
  // 你空檔、離籃框近的時候，電腦隊友會主動傳給你
  if (p.team === 0 && S.ctrl && S.ctrl !== p && !G.auto && p.holdT > 0.8 && contest(S.ctrl) < 0.15 && hoopDist(S.ctrl.x, S.ctrl.z) < 5 && Math.random() < dt * 1.2) { doPass(p, S.ctrl); return; }
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
    const v = frontDefender(p, 1.7);
    if (v && !(p.skillCd > 0) && Math.random() < 0.35) { doSkill(p); return; }
    if (v && v.y <= 0 && (p.fakeCd || 0) <= 0 && Math.random() < 0.12) { pumpFake(p); return; }
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
  if (h && h.team !== p.team && p.team === 0 && S.trapT > 0) man = h;   // 你叫了包夾：電腦隊友也衝去夾持球的人
  else if (h && h.team !== p.team) {
    if (p === on) man = h;
    else {   // 其他防守者：照順序各挑最近、還沒人盯的對手
      const free = opps.filter(q => q !== h), others = mates.filter(q => q !== on);
      for (const d of others) { const pick = free.sort((a, b) => dist2(a, d) - dist2(b, d))[0]; if (d === p) { man = pick; break; } free.splice(free.indexOf(pick), 1); }
    }
  }
  man = man || p.man || opps[mates.indexOf(p) % opps.length];
  p.man = man;
  const dx = HOOP.x - man.x, dz = HOOP.z - man.z, l = Math.hypot(dx, dz) || 1;
  const trap = p.team === 0 && S.trapT > 0 && man === h;
  const gap = trap ? 0.7 : man === h ? (hoopDist(man.x, man.z) > 7 ? 1.6 : 0.95) : Math.min(2.2, 1.2 + l * 0.12);
  goTo(p, man.x + dx / l * Math.min(gap, l * 0.8), man.z + dz / l * Math.min(gap, l * 0.8), man === h ? 1 : 0.9);
  if (man === h && p.stealCd <= 0 && dist2(p, h) < 1.25 && Math.random() < dt * CFG.aiSteal * (p.team === 1 ? dif().steal : 0.8) * (trap ? 2.5 : 1)) startSteal(p);
}
// 電腦什麼時候放大招
function aiSpecial(p, dt) {
  if (p.gauge < 100 || S.cut) return;
  if ((p.spWait -= dt) > 0) return;
  const t = p.team, mine = B.mode === 'held' && B.owner.team === t;
  let ok = false;
  switch (p.key) {
    case 'kui': ok = mine && !S.mustClear; break;
    case 'jie': case 'kevin': ok = mine && !busy(B.owner); break;
    case 'yan': ok = mine && !busy(B.owner) && !!alleyMate(p); break;
    case 'lin': case 'hu': ok = mine && !busy(B.owner) && !S.mustClear; break;
    case 'yuan': case 'de': case 'zhe': case 'zhen': ok = mine; break;
    case 'momo': case 'vivi': case 'mi': ok = mine && !S.mustClear; break;
    case 'heilun': ok = mine && S.score[1 - t] >= 2; break;
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
      if (!a.rel && !a.hold && a.t >= a.relAt) { a.rel = true; releaseShot(p, a.sure ? { sure: true } : {}); }
      if (a.rel && a.t > 0.3 && p.y <= 0) p.act = null;
      break;
    case 'audit': {   // 小偵衝到持球者面前
      const k = Math.min(1, a.t / 0.35);
      if (a.h) { a.tx = a.h.x - Math.sin(a.h.face) * -0.5; a.tz = a.h.z - Math.cos(a.h.face) * -0.5; }
      p.x = a.fx + (a.tx - a.fx) * k; p.z = a.fz + (a.tz - a.fz) * k;
      if (Math.random() < 0.6) fx.sparkle(V(p.x, 0.5 + Math.random() * 0.7, p.z), 0xd9b380, 0.35);
      if (k >= 1 && !a.done) {
        a.done = true;
        if (a.h) { a.h.act = null; a.h.stun = 2.5; addIcon(a.h, '🔍', 2.5, 2.2, 0.55); fx.sfx.steal(); fx.floatText(V(a.h.x, 2.4, a.h.z), '查帳中！', p.def.color, 1.1); setTimeout(() => S.mode === 'play' && playSig(p), 0); }
      }
      if (a.t > 0.5) p.act = null;
      break;
    }
    case 'sig': if (a.t > a.dur) p.act = null; break;
    case 'fake': if (a.t > 0.35) p.act = null; break;
    case 'shadow': {   // 林語彤的瞬影閃身：每段 0.28 秒，經過的防守者晃倒，最後上籃
      const SEG = 0.28, i = Math.floor(a.t / SEG), pt = a.pts[Math.min(i, a.pts.length - 1)], prev = i === 0 ? { x: a.sx, z: a.sz } : a.pts[i - 1];
      if (i >= a.pts.length) { p.act = { type: 'lay', t: 0, sx: p.x, sz: p.z, tx: HOOP.x, tz: HOOP.z + 0.42, dunk: false, rel: false, sure: true }; break; }
      if (i !== a.seg) { a.seg = i; if (prev.q) { prev.q.stun = 1.2; prev.q.act = null; playMove(prev.q, 'stumble', { dur: 1.1 }); fx.floatText(V(prev.q.x, 2.3, prev.q.z), '晃倒！', p.def.color, 1); fx.sfx.whiff(); } playMove(p, 'dodge', { dur: SEG + 0.1 }); }
      const k = (a.t - i * SEG) / SEG;
      p.x = prev.x + (pt.x - prev.x) * k; p.z = prev.z + (pt.z - prev.z) * k;
      p.face = Math.atan2(pt.x - prev.x, pt.z - prev.z);
      if ((a.ghost += 1) % 2 === 0) fx.sparkle(V(p.x, 0.6 + Math.random() * 0.6, p.z), new THREE.Color(p.def.color).getHex(), 0.5);
      break;
    }
    case 'mirage':   // 胡姬的千變萬化：0.25 秒假動作騙起所有人，0.6 秒後必進後仰
      if (a.t >= 0.25 && !a.bit) {
        a.bit = true;
        for (const q of oppsOf(p)) if (q.stun <= 0 && dist2(q, p) < 4.5) { q.act = null; startBlock(q); q.stun = 1.4; fx.floatText(V(q.x, 2.4, q.z), '被騙了！', p.def.color, 0.9); }
      }
      if (a.t >= 0.6 && holding(p)) { p.act = null; startFade(p, true); }
      else if (a.t > 1.2) p.act = null;
      break;
    case 'skill': {   // 突破技：照路線移動，做到一半判定有沒有被撞停、對手有沒有被晃倒
      const k = Math.min(1, a.t / a.dur), e = 1 - (1 - k) * (1 - k);
      p.x = THREE.MathUtils.clamp(a.fx + (a.tx - a.fx) * e, -5.9, 5.9); p.z = THREE.MathUtils.clamp(a.fz + (a.tz - a.fz) * e, 0.3, 10.8);
      if (Math.random() < 0.5) fx.puff(V(p.x, 0.15, p.z), 0xffffff);
      if (!a.done && a.t >= a.dur * 0.5) { a.done = true; resolveSkill(p, a); if (p.act !== a) break; }
      if (a.t >= a.dur) {
        p.act = null;
        if (a.kind === 'stepback') p.openT = 1.2;
        if (a.then === 'lay' && holding(p)) startShot(p);
        else if (a.then === 'shoot' && holding(p)) { startShot(p); if (p.act?.type === 'shoot') { p.act.hold = false; p.act.relAt = 0.3; p.act.press = PEAK; } actionArt(p, 'three'); }
      }
      break;
    }
    case 'lay': {
      const k = Math.min(1, a.t / 0.45), e = 1 - (1 - k) * (1 - k);
      p.x = a.sx + (a.tx - a.sx) * e; p.z = a.sz + (a.tz - a.sz) * e;
      p.y = Math.sin(Math.min(1, a.t / 0.6) * Math.PI) * (a.dunk ? 1.05 : 0.8);
      if (!a.rel && a.t >= 0.4) {
        a.rel = true;
        if (a.dunk && holding(p)) {
          const prob = shotProb(p, a.sx, a.sz, true);
          if (Math.random() < prob + 0.05 || st(p, 'dunk', 0.1) > 0.5 && Math.random() < 0.5) { slam(p, 2, false); break; }   // 中鋒灌籃比較不會失手
        }
        releaseShot(p, a.sure ? { sure: true } : {});
      }
      if (a.t >= 0.6) { p.y = 0; p.act = null; }
      break;
    }
    case 'block': if (a.t > 0.15 && p.y <= 0) p.act = null; break;
    case 'steal':
      if (a.t < 0.22) { const v = 4.6 * (1 - a.t / 0.22); p.x += Math.sin(p.face) * dt * v; p.z += Math.cos(p.face) * dt * v; }   // 往前衝一步撲過去
      if (!a.done && a.t >= 0.14) { a.done = true; resolveSteal(p); }
      if (a.t > 0.4) p.act = null;
      break;
    case 'pass': if (a.t > 0.25) p.act = null; break;
    case 'down': if (a.t > a.dur) p.act = null; break;   // 倒在地上，爬起來之前不能動
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
// CLOSEUP＝false：使用者看過兩次都覺得 3D 特寫會露出模型的破綻（很可怕），大招只用一般鏡頭＋2D 過場
const CLOSEUP = false;
const SC = { t: 0, dur: 1, pos: V(), look: V() };
// 從側面拍「起跳點 → 籃框」這段：鏡頭在路線的垂直方向
function sideCam(x, z, dur, frac = 0.78) {
  if (!CLOSEUP) return;
  const tx = HOOP.x, tz = HOOP.z + 0.4; let dx = tx - x, dz = tz - z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  let px = dz, pz = -dx; if (pz < 0 || (pz === 0 && px < 0)) { px = -px; pz = -pz; }   // 選靠鏡頭那一側
  const mx = x + (tx - x) * frac, mz = z + (tz - z) * frac, r = Math.max(6.2, l * 0.85);
  shotCam(V(mx + px * r - dx * 3.2, 2.9, mz + pz * r - dz * 3.2), V(mx, 2.0, mz), dur);   // 斜後側 3/4 角度，看得到起跳和籃框
}
// 每個人的大招有自己的運鏡（跟著人移動）：fn(k) 回傳 [鏡頭位置, 看的點]，k 從 0 到 1
const _cp = new THREE.Vector3(), _cl = new THREE.Vector3();
function specialCam(p) {
  if (!CLOSEUP || SC.t > 0 || ['jie', 'yan', 'kevin'].includes(p.key)) return;   // 這三個在大招裡已經有自己的鏡頭
  const fwd = () => [Math.sin(p.face), Math.cos(p.face)];
  const head = (y = 1.1) => _cl.set(p.x, p.y + y, p.z);
  const C = {
    kui: [1.6, k => { const [hx, hz] = fwdOf(p), r = 3.2 - k; return [_cp.set(p.x + hx * r, 0.9, p.z + hz * r), head(0.9)]; }],   // 正面低角度，跟著她衝
    mi: [1.5, k => { const [fx_, fz_] = fwd(), r = 1.5 + k * 1.8; return [_cp.set(p.x + fx_ * r, 1.35, p.z + fz_ * r), head(1.15)]; }],   // 臉部特寫往後拉
    vivi: [1.7, k => { const [fx_, fz_] = fwd(), r = 2.3 + k * 0.4; return [_cp.set(p.x + fx_ * r, 0.25 + k * 0.25, p.z + fz_ * r), head(1.3)]; }],   // 仰角，老闆的氣勢
    heilun: [1.6, k => { const a = k * 1.6; return [_cp.set(p.x + Math.sin(a) * 1.2, 6 - k, p.z + Math.cos(a) * 1.2 + 0.5), head(0.6)]; }],   // 正上方旋轉俯瞰
    lin: [2.0, k => { const [hx, hz] = fwdOf(p); return [_cp.set(p.x + hz * 3.4 - hx * 1.2, 1.0, p.z - hx * 3.4 - hz * 1.2), head(0.8)]; }],   // 低角度側面跟拍
    yuan: [1.7, k => { const [fx_, fz_] = fwd(), r = 3.4 - k * 0.7; return [_cp.set(p.x + fx_ * r + fz_ * 0.9, 0.4 + k * 0.3, p.z + fz_ * r - fx_ * 0.9), head(1.2)]; }],   // 正面低角度仰拍（中鋒的壓迫感）
    hu: [1.9, k => { const a0 = Math.atan2(HOOP.x - p.x, HOOP.z - p.z) + Math.PI * 0.75, a = a0 + k * 2.2; return [_cp.set(p.x + Math.sin(a) * 3, 1.25, p.z + Math.cos(a) * 3), head(1.0)]; }],   // 繞著她轉
  }[p.key] || [1.5, k => { const [fx_, fz_] = fwd(), r = 3 - k * 0.6; return [_cp.set(p.x + fx_ * r, 1.3, p.z + fz_ * r), head(1.0)]; }];
  SC.fn = C[1]; SC.t = SC.dur = C[0]; SC.p = p;
}
function shotCam(pos, look, dur) {
  const d = pos.clone().sub(look); if (camera.aspect < 1) d.multiplyScalar(1.7);
  SC.fn = null; SC.p = null; SC.pos.copy(look).add(d); SC.look.copy(look); SC.t = SC.dur = dur;
  SC.pos.x = THREE.MathUtils.clamp(SC.pos.x, -5.8, 5.8); SC.pos.z = THREE.MathUtils.clamp(SC.pos.z, 0.5, 13);   // 鏡頭留在場內，不要拍到旁邊觀眾的臉
}
// 特寫時擋在鏡頭和主角中間的人先藏起來（不然整個畫面被別人的背擋住）
function hideBlockers(p) {
  const cx = camera.position.x, cz = camera.position.z;
  for (const q of players) {
    let hide = false;
    if (p && q !== p) {
      const dx = p.x - cx, dz = p.z - cz, l2 = dx * dx + dz * dz || 1;
      const k = ((q.x - cx) * dx + (q.z - cz) * dz) / l2;   // q 在鏡頭→主角這條線上的位置（0＝鏡頭、1＝主角）
      const ox = cx + dx * k - q.x, oz = cz + dz * k - q.z;
      hide = k > -0.1 && k < 0.95 && ox * ox + oz * oz < 0.8 * 0.8;
    }
    q.actor.root.visible = !hide && !q.bench;
  }
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
      else if (passer.team !== r.team) { fx.floatText(V(r.x, 2.3, r.z), '抄截！', TEAM_COLOR[r.team], 1); addGauge(r, CFG.gSteal); fx.sfx.steal(); actionArt(r, 'steal'); }
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
      const qn = players.find(q => q.key === 'yuan' && S.buff[q.team].queen > 0 && q.stun <= 0);
      if (qn && Math.hypot(B.pos.x - qn.x, B.pos.z - qn.z) < 5) { B.vel.x += (qn.x - B.pos.x) * dt * 5; B.vel.z += (qn.z - B.pos.z) * dt * 5; }
      for (const q of players) {
        if (q.stun > 0 || q.pickCd > 0 || (busy(q) && q.act.type !== 'block' && q.act.type !== 'steal')) continue;
        const rr = 0.6 * st(q, 'reb') * (q.boxedT > 0 ? 0.55 : 1), rh = 1.6 + 0.3 * (st(q, 'reb') - 1);
        if (Math.hypot(B.pos.x - q.x, B.pos.z - q.z) < rr && B.pos.y < q.y + rh && B.pos.y > q.y - 0.3) {
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
    updateDrive(p, dt);
    if (p.def.nag) updateNag(p, dt);
    if (p.def.pretty && Math.random() < dt * 2.5) fx.sparkle(V(p.x + rand(-0.4, 0.4), p.y + rand(0.9, 1.7), p.z + rand(-0.3, 0.3)), 0xffc6e6, 0.28);   // 老闆：漂漂亮亮
    for (const k of ['skillCd', 'dashT', 'openT', 'stopT', 'fakeCd', 'boxedT']) if (p[k] > 0) p[k] = Math.max(0, p[k] - dt);
    if (p.y <= 0 && !busy(p)) { p.bitten = false; p.blockBoost = 0; }
    // 貼身防守（按住技能鍵，電腦則是盯球的人自動）、卡位（球在空中時）
    const defending = B.mode === 'held' && B.owner.team !== p.team && p.stun <= 0;
    if (p === S.ctrl && !G.auto) { p.guard = inp.c && defending && dist2(p, B.owner) < 2.6; p.boxing = inp.c && reboundTime(); }
    else { p.guard = defending && S.onBall[p.team] === p && dist2(p, B.owner) < 2.2; p.boxing = reboundTime() && hoopDist(p.x, p.z) < 3.8 && p.y <= 0; }
    think(p, dt);
    updateAct(p, dt);
    const a = p.act, scripted = a && (a.type === 'lay' || a.type === 'jdunk' || a.type === 'alley' || a.type === 'skill' || a.type === 'shadow');
    if (p.hang > 0) { p.hang -= dt; p.vx = p.vz = 0; if (p.hang <= 0) p.vy = 0; }
    else if (!scripted) {
      const locked = a && ((a.type === 'shoot' && !a.fade) || a.type === 'down' || a.type === 'block' || a.type === 'ai' || a.type === 'lob' || a.type === 'fake') || p.stopT > 0;
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
    if (sa || sb || a.bench || b.bench || Math.abs(a.y - b.y) > 0.8) continue;
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), m = 0.62;
    if (d < m && d > 1e-4) { const push = (m - d) / 2; a.x -= dx / d * push; a.z -= dz / d * push; b.x += dx / d * push; b.z += dz / d * push; }
    if (d < m + 0.1 && a.team !== b.team) for (const h of [a, b]) if (holding(h)) { h.vx *= Math.exp(-dt * 5); h.vz *= Math.exp(-dt * 5); }   // 被防守者擋住：持球切入變慢
    // 卡位：卡位的人把對手往籃框外面推，力氣大的推得動
    if (d < 1.1 && a.team !== b.team) for (const [x, y] of [[a, b], [b, a]]) if (x.boxing && x.y <= 0.2) {
      const ox = y.x - HOOP.x, oz = y.z - HOOP.z, ol = Math.hypot(ox, oz) || 1, f = dt * 1.6 * st(x, 'str') / st(y, 'str') * (y.boxing ? 0.4 : 1);
      y.x += ox / ol * f; y.z += oz / ol * f; y.boxedT = 0.25;
    }
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
    r.position.y += dropOf(p);
    // 蹲下起跳、落地的壓扁
    const crouch = a && a.type === 'jdunk' && a.t < 0.3 ? 0.82 : 1;
    p.actor.model.scale.y *= crouch;
    const sigOn = (p.actor.sigW || 0) > 0.3, ov = sigOn ? null : overTarget(p);
    overlay(p, ov, t, dt);
    poseArms(p, p.actor, sigOn || ov ? {} : armTarget(p, t), dt);
    // 腳下的圈、名字
    p.ring.position.set(p.x, 0.02, p.z);
    const me = p === S.ctrl;
    p.ring.material.color.set(me ? '#ffd34d' : TEAM_COLOR[p.team]);
    p.ring.scale.setScalar(me ? 1.45 + Math.sin(t * 6) * 0.1 : 1);
    p.ring.material.opacity = me ? 1 : 0.7;
    p.label.position.set(p.x, p.y + 1.66, p.z);
    p.label.material.opacity = me ? 1 : 0.55; p.label.visible = SC.t <= 0 && !me && !p.bench;   // 你的名字由「▼ 你」取代；特寫時名牌、圖示先藏起來
    if (me) { const ya = youArrow(); ya.visible = SC.t <= 0 && S.mode === 'play'; ya.position.set(p.x, p.y + 1.85 + Math.abs(Math.sin(t * 4)) * 0.1, p.z); }
    for (let i = p.icons.length - 1; i >= 0; i--) {
      const ic = p.icons[i]; ic.life -= dt;
      ic.s.position.set(p.x + (ic.shake ? Math.sin(t * 50) * 0.04 : 0), p.y + ic.y + Math.sin(t * 4) * 0.05, p.z); ic.s.visible = SC.t <= 0;
      if (ic.life <= 0 || (ic.shake && p.stun <= 0)) { scene.remove(ic.s); ic.s.material.dispose(); p.icons.splice(i, 1); }
    }
    if (S.buff[p.team].coffee > 0 && sp > 1 && Math.random() < dt * 25) fx.sparkle(V(p.x - p.vx * 0.06, 0.4 + Math.random() * 0.6, p.z - p.vz * 0.06), 0xffb070, 0.3);
  }
}
// 手舉高、防守張手都用 3D 動作疊上去（overlay）；程式只擺小幅度的（運球、傳球、抄截、暈眩）
function overTarget(p) {
  const a = p.act;
  if (p.stun > 0) return null;
  if (p.hang > 0) return 'handsup';
  if (a) switch (a.type) {
    case 'shoot': case 'ai': case 'block': return 'handsup';
    case 'lay': return a.dunk ? 'handsup' : null;
    case 'jdunk': return a.t < 0.3 ? null : 'handsup';
    case 'alley': return a.ph === 'jump' ? 'handsup' : null;
    default: return null;
  }
  if (p.cheer > 0) return 'hop';
  if (holding(p)) return null;
  // 防守：貼近持球者時壓低重心、張開雙手
  if (B.mode === 'held' && B.owner.team !== p.team && dist2(p, B.owner) < 2.2) return 'guard';
  return null;
}
function armTarget(p, t) {   // 程式擺的手臂只抬到約 90°，再高會把腋下皮膚拉長
  const a = p.act;
  if (p.stun > 0) return { rf: 1.0 + Math.sin(t * 12) * 0.5, lf: 1.0 + Math.cos(t * 12) * 0.5, rs: 0.3, ls: 0.3 };
  if (a) switch (a.type) {
    case 'lay': return { rf: 1.5, lf: 1.0 };
    case 'jdunk': return { rf: 1.2, lf: 1.2, sp: 0.35 };
    case 'alley': return { rf: 1.4, lf: 1.4 };
    case 'steal': return { rf: 1.5, lf: 0.3, sp: 0.35 };
    case 'pass': case 'lob': return { rf: 1.4, lf: 1.4 };
  }
  if (holding(p)) return { rf: 0.55 + 0.45 * (B.dribH ?? 0.5), lf: 0.35 };
  return {};
}
// 你操作的人頭上的大箭頭「▼ 你＋名字」：一眼找到自己
let youSprite = null, youKey = '';
function youArrow() {
  const p = S.ctrl;
  if (!youSprite || youKey !== p.key) {
    if (youSprite) { scene.remove(youSprite); youSprite.material.map.dispose(); youSprite.material.dispose(); }
    youSprite = labelSprite(`▼ 你・${p.def.name}`, { bg: '#ffd34d', color: '#2c3e57', size: 0.36 });
    youSprite.material.depthTest = false; youSprite.renderOrder = 14; scene.add(youSprite); youKey = p.key;
  }
  return youSprite;
}
// 貼身防守的扇形、卡位的圈（只畫你操作的人）
let guardFan = null, boxRing = null;
function updateGuardMarks(t) {
  if (!guardFan) {
    guardFan = new THREE.Mesh(new THREE.RingGeometry(0.45, 1.9, 24, 1, -0.75, 1.5), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
    guardFan.rotation.x = -Math.PI / 2; guardFan.renderOrder = 2; scene.add(guardFan);
    boxRing = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.75, 32), new THREE.MeshBasicMaterial({ color: 0xff7a45, transparent: true, opacity: 0.6, depthWrite: false }));
    boxRing.rotation.x = -Math.PI / 2; boxRing.renderOrder = 2; scene.add(boxRing);
  }
  const p = S.mode === 'play' ? S.ctrl : null;
  guardFan.visible = !!p && p.guard; boxRing.visible = !!p && p.boxing;
  if (guardFan.visible) { guardFan.position.set(p.x, 0.03, p.z); guardFan.rotation.z = p.face - Math.PI / 2; guardFan.material.opacity = 0.48 + Math.sin(t * 8) * 0.1; }
  if (boxRing.visible) { boxRing.position.set(p.x, 0.03, p.z); boxRing.scale.setScalar(1 + Math.sin(t * 10) * 0.08); }
}
function updateCrowd(dt, t) {
  for (const c of crowd) {
    c.cheer = Math.max(0, c.cheer - dt);
    const hop = c.cheer > 0 ? Math.abs(Math.sin(t * 9 + c.ph)) * 0.25 : Math.abs(Math.sin(t * 2.4 + c.ph)) * 0.03;
    c.actor.root.position.y = 0.42 + hop;
    c.actor.speed = 0; resetBones(c); updateActor(c.actor, dt, t);
    overlay(c, c.cheer > 0 ? 'hop' : null, t, dt);
    poseArms(c, c.actor, c.cheer > 0 ? {} : { rf: 0.3 + Math.sin(t * 3 + c.ph) * 0.2, lf: 0.3 + Math.cos(t * 3 + c.ph) * 0.2 }, dt);
  }
}

// ---------- 比賽流程 ----------
function newMatch() {
  clearPlayers();
  // 對手先從選角名單裡抽，不夠（3v3）再用藏起來的人補
  const others = [...shuffle(ROSTER.filter(k => !S.pick.includes(k))), ...shuffle(KEYS.filter(k => !ROSTER.includes(k) && !S.pick.includes(k)))];
  if (!S.keepOpp) S.opp = others.slice(0, S.pick.length);
  S.keepOpp = false;
  players = [...S.pick.map(k => makePlayer(k, 0)), ...S.opp.map(k => makePlayer(k, 1))];
  $('board').classList.toggle('three', S.pick.length > 2);
  preloadArt([...S.pick, ...S.opp]);
  buildCrowd();
  Object.assign(S, { t: 0, clock: CFG.len, score: [0, 0], poss: 0, mustClear: false, ctrl: players[0], ts: 1, slowT: 0, cut: null, buzzer: false, sudden: false, caiDone: false, endAfter: false, lastPass: null, onBall: [null, null], lastTick: -1, nextPoss: 0, trapT: 0, possN: 0, spPoss: -1 });
  S.buff = [newBuff(), newBuff()]; S.meter = null;
  S.prac = S.practice ? { opp: 'none', inf: true, att: 0, made: 0, att3: 0, made3: 0, retT: 0 } : null;
  document.body.classList.toggle('prac', !!S.prac);
  for (const d of CAI.drops) scene.remove(d.m); CAI.drops = []; CAI.on = false; CAI.g.visible = false;
  C.rimGroup.scale.setScalar(1); SC.t = 0;
  buildHud();
  $('scA').textContent = '0'; $('scB').textContent = '0';
  checkBall(); S.phaseT = 2.2;
  const nm = (ks) => ks.map(k => CHARS[k].name).join('＆');
  if (S.prac) { setPracOpp('none'); S.phaseT = 1.2; fx.banner(`${nm(S.pick)} 練習場`, '右上角切換對手：自己練／陪練防守／一打一', 0, '#36b37e'); }
  else fx.banner(nm(S.pick), `VS　${nm(S.opp)}`, 0, '#ff7a45');
  updateCamera(camFocus(), 0, true);
}
// ---------- 練習場 ----------
// S.prac：opp 對手（none 自己練、def 陪練只防守、1v1 一打一計分）、inf 大招無限、命中統計
const target = () => S.pick && S.pick.length === 1 ? 11 : CFG.target;   // 一打一先到 11 分
const PRAC_OPP = { none: '對手：無', def: '對手：陪練防守', '1v1': '對手：一打一' };
function setPracOpp(mode) {
  const pr = S.prac; pr.opp = mode; pr.retT = 0;
  const me = S.ctrl, o = teamOf(1)[0];
  o.bench = mode === 'none'; o.act = null; o.stun = 0;
  o.ring.visible = o.label.visible = !o.bench; o.actor.root.visible = !o.bench;
  if (o.bench) { o.x = COURT.x + 0.2; o.z = 11.2; }
  if (mode === '1v1') { S.score = [0, 0]; $('scA').textContent = '0'; $('scB').textContent = '0'; }
  S.spPoss = -1; S.nextPoss = 0; S.endAfter = false; S.mustClear = false;
  checkBall();
  fx.toast(mode === 'none' ? '🏀 自由練習：投進球會直接回到你手上' : mode === 'def' ? `🛡️ ${o.def.name}來陪練：只防守，搶到球會還你` : `⚔️ 一打一：${o.def.name}，先到 ${target()} 分`);
  pracHud();
}
function updatePractice(dt) {
  const pr = S.prac, me = S.ctrl, o = teamOf(1)[0];
  if (pr.inf) me.gauge = 100;
  if (o.bench) { o.x = COURT.x + 0.2; o.z = 11.2; o.vx = o.vz = 0; }
  if (pr.opp !== '1v1') o.gauge = 0;   // 陪練不放大招
  if (pr.retT > 0 && (pr.retT -= dt) <= 0 && holding(o) && !busy(o)) { doPass(o, me); fx.floatText(V(o.x, 2.3, o.z), '還你！', TEAM_COLOR[1], 0.8); }
  // 自由練習：球滾到沒人的地方太久就自動回到手上
  if (pr.opp === 'none' && B.mode === 'loose') { pr.looseT = (pr.looseT || 0) + dt; if (pr.looseT > 4) { pr.looseT = 0; gainBall(me, 'check'); fx.toast('🏀 球回來了'); } } else pr.looseT = 0;
  pracHud();
}
function pracHud() {
  const pr = S.prac; if (!pr) return;
  setText('pOpp', PRAC_OPP[pr.opp]);
  setText('pInf', pr.inf ? '大招無限：開' : '大招無限：關');
  const pct = (m, a) => a ? Math.round(m / a * 100) + '%' : '—';
  setText('pStat', `命中 ${pr.made}/${pr.att}（${pct(pr.made, pr.att)}）・三分 ${pr.made3}/${pr.att3}`);
  $('pInf').classList.toggle('on', pr.inf);
}
// 一打一打到 11 分：不結束，宣布比分後重新一局
function pracRound() {
  const win = S.score[0] > S.score[1];
  fx.banner(win ? '一打一你贏了！' : '一打一輸了…', `${S.score[0]} ： ${S.score[1]}　再來一局`, win ? 3 : 0, win ? '#ff7a45' : '#3f7fd9');
  (win ? fx.sfx.win : fx.sfx.lose)();
  S.score = [0, 0]; $('scA').textContent = '0'; $('scB').textContent = '0';
}
$('pOpp').onclick = () => { if (!S.prac) return; fx.sfx.click(); const order = ['none', 'def', '1v1']; setPracOpp(order[(order.indexOf(S.prac.opp) + 1) % 3]); };
$('pInf').onclick = () => { if (!S.prac) return; fx.sfx.click(); S.prac.inf = !S.prac.inf; if (!S.prac.inf) S.ctrl.gauge = 0; pracHud(); };
$('pSwap').onclick = () => { if (!S.prac) return; fx.sfx.click(); const o = teamOf(1)[0]; S.opp = [shuffle(ROSTER.filter(k => k !== S.pick[0] && k !== o.key))[0]]; S.keepOpp = true; const mode = S.prac.opp, inf = S.prac.inf; newMatch(); S.prac.inf = inf; setPracOpp(mode); };
$('pExit').onclick = () => { fx.sfx.click(); toSelect(); };
function finish() {
  if (S.prac) { pracRound(); return; }
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
  slow(0.5, 1.2);
}
function showOver() {
  S.mode = 'over'; document.body.classList.remove('playing'); musicTheme();
  const win = S.score[0] > S.score[1];
  $('oTitle').textContent = win ? '🏆 我們贏了！' : '😵 輸了…下次再來';
  const mvp = players.filter(p => p.team === (win ? 0 : 1)).sort((a, b) => b.pts - a.pts)[0];
  $('oMvpF').src = FACE[mvp.key]; $('oMvpN').textContent = `${mvp.def.name}　${mvp.pts} 分`;   // 職稱・位置太長，結算只放名字 $('oMvpQ').textContent = '「' + mvp.def.quote + '」';
  $('oStats').style.setProperty('--n', players.length > 4 ? 3 : 4);
  $('oStats').innerHTML = players.map((p, i) => `<div class="${p.team ? 'b' : ''}${p === mvp ? ' star' : ''}" style="--i:${i}"><img src="${FACE[p.key]}" alt=""><b>${p.pts}</b>${p.def.name}</div>`).join('');
  // 結算畫面：贏的隊伍色當底、MVP 的大招立繪當主視覺（沒立繪的人只留卡片）
  const ov = $('sOver'), art = hasArt(mvp.key) ? artUrl(mvp.key, SP_ART[mvp.key]) : '';
  ov.className = 'screen' + (win ? '' : ' lose') + (art ? '' : ' noart');
  ov.style.setProperty('--mc', mvp.def.color);
  if (art) { $('oArt').src = art; ov.querySelector('.ov-art').style.setProperty('--art', `url(${art})`); }
  show('over');
  countUp($('oA'), S.score[0]); countUp($('oB'), S.score[1]);
}
// 比分從 0 跑上去
function countUp(el, to, dur = 700, delay = 350) {
  const t0 = performance.now() + delay; el.textContent = '0';
  const tick = (now) => { const k = Math.min(1, Math.max(0, (now - t0) / dur)); el.textContent = Math.round(to * (1 - (1 - k) ** 3)); if (k < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}
function clockBuzz() { const el = $('clockBox'); el.classList.remove('buzz'); void el.offsetWidth; el.classList.add('buzz'); }
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
    if (S.prac) updatePractice(dt);
    else if (!S.sudden) {
      S.clock = Math.max(0, S.clock - dt);
      const sec = Math.ceil(S.clock);
      if (sec <= 10 && sec !== S.lastTick && sec > 0) { S.lastTick = sec; fx.sfx.tick(); }
      if (!S.caiDone && S.clock <= CFG.len / 2) { S.caiDone = true; startCaishen(); }
      if (S.clock <= 0 && !S.buzzer) {
        S.buzzer = true; fx.sfx.buzzer(); clockBuzz();
        const shooting = B.mode === 'shot' || B.mode === 'net' || players.some(p => p.act && (p.act.type === 'jdunk' || (p.act.type === 'ai' && p.act.rel)));
        if (!shooting) finish(); else fx.banner('⏰ 壓哨球！', '進了就算', 0, '#e0413b');
      }
    }
    if (S.trapT > 0) S.trapT -= dt;
    for (const t of [0, 1]) {
      const b = S.buff[t];
      for (const k of ['coffee', 'slow', 'viral', 'wall', 'queen']) if (b[k] > 0) b[k] = Math.max(0, b[k] - dt);
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
// 鏡頭看的點：x 跟球的比例、高度、深度（z＝基準＋球的深度×zk）
const FOCUS = { portrait: { x: 0.6, y: 1.3, z: 4.2, zk: 0.25 }, landPhone: { x: 0.4, y: 1.3, z: 2.9, zk: 0.3 }, desktop: { x: 0.3, y: 1.3, z: 3.5, zk: 0.22 } };
function camFocus() {
  const portrait = camera.aspect < 1;
  let bx = B.pos.x, bz = THREE.MathUtils.clamp(B.pos.z, 0, 10);
  const me = S.mode === 'play' ? S.ctrl : null;
  if (me && B.owner !== me) { bx = bx * 0.5 + me.x * 0.5; bz = bz * 0.5 + THREE.MathUtils.clamp(me.z, 0, 10) * 0.5; }   // 球不在你手上：鏡頭拍你和球中間
  if (KV.zoom > 0 && KV.p) { bx = (KV.p.x + HOOP.x) / 2; bz = (KV.p.z + HOOP.z) / 2; }   // Kevin 瞄準時：拍人和籃框中間
  const F = FOCUS[camMode()];
  return V(bx * F.x, F.y + Math.max(0, B.pos.y - 1.5) * 0.2, F.z + bz * F.zk);
}

// ---------- HUD ----------
function buildHud() {
  for (const t of [0, 1]) $(t ? 'facesB' : 'facesA').innerHTML = teamOf(t).map((p, i) => `<div class="pf" id="pf${t}${i}"><div class="f" style="background-image:url(${FACE[p.key]})"></div><div class="g"><i></i></div></div>`).join('');
}
const hudCache = {};
function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function setHtml(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).innerHTML = v; } }
function hud() {
  if (S.prac) { setText('clock', '練習'); setText('clockSub', S.prac.opp === '1v1' ? `一打一 先到${target()}分` : S.prac.opp === 'def' ? '陪練防守' : '自由練習'); }
  else if (S.sudden) { setText('clock', '延長'); setText('clockSub', '下一球決勝'); }
  else { const c = Math.ceil(S.clock), m = Math.floor(c / 60), s = c % 60; setText('clock', `${m}:${String(s).padStart(2, '0')}`); setText('clockSub', `先到${target()}分`); }
  $('clock').classList.toggle('low', !S.prac && !S.sudden && S.clock <= 10);
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
  const reb = reboundTime() && !hold;
  const mate = mateHasBall(p);   // 隊友持球：你在跑空檔
  setText('kShootT', hold ? '投籃' : mate ? '要球' : reb ? '搶板' : '蓋帽');
  const solo = teamOf(p.team).length < 2;
  setText('kPassT', solo ? '—' : hold ? '傳球' : mate ? '要球' : '包夾');
  setText('kSkillT', hold ? p.def.skill.name : mate ? '空手切入' : reb ? '卡位' : '防守');
  setText('kSkillS', hold ? (p.skillCd > 0 ? Math.ceil(p.skillCd) + ' 秒' : '') : mate ? '' : '按住');
  $('kSkill').classList.toggle('cd', hold && p.skillCd > 0);
  setText('kStealT', hold ? '假動作' : mate ? '要球' : '抄截');
  $('kPass').classList.toggle('dim', solo || (!hold && !mate && S.trapT > 0));
  const hh = B.mode === 'held' && B.owner.team !== p.team ? B.owner : null;
  $('kSteal').classList.toggle('hot', !!hh && p.stealCd <= 0 && dist2(p, hh) < CFG.stealR && (B.dribH ?? 1) < 0.45);   // 貼近、球在地上：抄截鍵發亮
  $('kShoot').classList.toggle('dim', hold && S.mustClear);
  const sp = $('kSp'), pct = Math.floor(p.gauge);
  sp.style.setProperty('--p', pct + '%');
  if (pct >= 100 && !sp.classList.contains('full')) { sp.classList.remove('pop'); void sp.offsetWidth; sp.classList.add('pop'); }
  else if (pct < 100) sp.classList.remove('pop');
  sp.classList.toggle('full', pct >= 100);
  const why = pct >= 100 ? specialBlock(p) : null;
  sp.classList.toggle('dim', why !== null);
  const bg = `url(${FACE[p.key]})`; if (hudCache.spbg !== bg) { hudCache.spbg = bg; sp.querySelector('.in').style.backgroundImage = bg; }
  setText('kSpT', pct < 100 ? pct + '%' : why && why.startsWith('大招要') ? '進攻時用' : why && why.startsWith('這一波') ? '下一波' : p.def.sp.name);
}

// ---------- 畫面切換 ----------
const screens = { title: $('sTitle'), select: $('sSelect'), pause: $('sPause'), over: $('sOver') };
function show(name) { for (const [k, el] of Object.entries(screens)) el.classList.toggle('on', k === name); }
$('kShoot').querySelector('span').id = 'kShootT'; $('kPass').querySelector('span').id = 'kPassT'; $('kSp').querySelector('.in span').id = 'kSpT';
$('kSkill').querySelector('span').id = 'kSkillT'; $('kSkill').querySelector('small').id = 'kSkillS'; $('kSteal').querySelector('span').id = 'kStealT';
$('bStart').onclick = () => { fx.audioInit(); fx.sfx.click(); toSelect(); };
const OP_SFX = { init: fx.audioInit, whoosh: () => fx.sfx.whiff(), boss: () => fx.sfx.dunk() };
$('bOP').onclick = () => { fx.audioInit(); replayOP(null, { sounds: OP_SFX }); };
$('bResume').onclick = () => togglePause();
$('bQuit').onclick = () => toSelect();
$('bAgain').onclick = () => { S.keepOpp = false; startMatch(); };
$('bReselect').onclick = () => toSelect();
$('bPause').onclick = () => togglePause();
$('bSound').onclick = () => { music.on = !music.on; store.set(SOUND_KEY, music.on ? '1' : '0'); soundIcon(); fx.audioInit(); if (!music.on) musicStop(); else if (S.mode === 'play') musicStart(); else musicTheme(); };
const SOUND_KEY = 'office-basketball-sound';
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
music.on = store.get(SOUND_KEY) !== '0';
// 主畫面圖示：選了就換掉 apple-touch-icon（iPhone）和 manifest（Android），之後「加入主畫面」就是這張
const ICON_KEY = 'office-basketball-icon', ICONS = ['kui', 'jie', 'lin', 'yuan'];
function setIcon(k) {
  $('lnkTouch').href = `icons/${k}-180.png`; $('lnkIcon').href = `icons/${k}-192.png`;
  const base = new URL('./', location.href).href;
  const m = { name: '上班啟示錄：下班先鬥牛', short_name: '下班先鬥牛', start_url: base, scope: base, display: 'fullscreen', orientation: 'any', background_color: '#bfe6ff', theme_color: '#ff7a45',
    icons: [192, 512].map(n => ({ src: `${base}icons/${k}-${n}.png`, sizes: `${n}x${n}`, type: 'image/png' })) };
  const ln = document.querySelector('link[rel="manifest"]');
  if (k === 'kui') ln.href = 'manifest.json';
  else ln.href = URL.createObjectURL(new Blob([JSON.stringify(m)], { type: 'application/manifest+json' }));
  for (const b of $('iconPick').children) b.classList.toggle('on', b.dataset.k === k);
}
$('iconPick').innerHTML = ICONS.map(k => `<button data-k="${k}" aria-label="${CHARS[k].name}" style="background-image:url(icons/${k}-180.png)"></button>`).join('');
for (const b of $('iconPick').children) b.onclick = () => { fx.audioInit(); fx.sfx.click(); store.set(ICON_KEY, b.dataset.k); setIcon(b.dataset.k); $('iconHint').textContent = `換成${CHARS[b.dataset.k].name}了，現在「加入主畫面」就用這張`; clearTimeout(setIcon.t); setIcon.t = setTimeout(() => { $('iconHint').textContent = ''; }, 2600); };
setIcon(ICONS.includes(store.get(ICON_KEY)) ? store.get(ICON_KEY) : 'kui');
// 全螢幕：Android／電腦可以（藏掉網址列，直的橫的都滿版）；iPhone Safari 不支援，要「加入主畫面」從主畫面開才會全螢幕
const fsOK = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
function goFull(on = true) {
  const d = document, el = d.documentElement;
  try {
    if (on && !(d.fullscreenElement || d.webkitFullscreenElement)) (el.requestFullscreen || el.webkitRequestFullscreen).call(el, { navigationUI: 'hide' })?.catch?.(() => {});
    else if (!on && (d.fullscreenElement || d.webkitFullscreenElement)) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
  } catch {}
}
$('bFull').style.display = fsOK ? '' : 'none';
if (!fsOK && /iPhone|iPad|iPod/.test(navigator.userAgent) && !navigator.standalone) $('iosTip').classList.add('on');   // iPhone 沒有全螢幕 API：提示加入主畫面
$('bFull').onclick = () => goFull(!(document.fullscreenElement || document.webkitFullscreenElement));
function soundIcon() { $('bSound').textContent = music.on ? '🔊' : '🔇'; const A = fx.getAC(); if (A) A.master.gain.value = music.on ? 0.16 : 0; }
soundIcon();

function buildSelect() {
  // 選角卡：真人風全身照（art/<人>_card.webp，tools/gen_real.sh 的 card_* 姿勢，每個人不一樣）＋位置標籤
  $('grid').innerHTML = ROSTER.map(k => { const c = CHARS[k], [job, pos] = c.role.split('・'); return `<div class="ch" data-k="${k}" style="--cc:${c.color}"><span class="badge"></span><div class="pic"><span class="pos">${pos || job}</span><img src="art/${k}_card.webp?v=0.5.1" alt="${c.name}" onerror="this.src='${FACE[k]}'"></div><div class="info"><div class="nm">${c.name}<small>${pos ? job : ''}</small></div><span class="spn">${c.sp.name}</span><span class="skn">${c.skill.name}</span><div class="d">${c.sp.desc}</div><div class="st">${c.stat}</div></div></div>`; }).join('');
  for (const el of $('grid').children) el.onclick = () => {
    fx.audioInit(); fx.sfx.click();
    const k = el.dataset.k, i = S.sel.indexOf(k);
    if (i >= 0) S.sel.splice(i, 1); else { if (S.sel.length >= S.size) S.sel.shift(); S.sel.push(k); }
    refreshSelect();
  };
  $('titleFaces').innerHTML = ROSTER.map(k => `<img src="${FACE[k]}" alt="">`).join('');
}
function refreshSelect() {
  for (const el of $('grid').children) {
    const i = S.sel.indexOf(el.dataset.k);
    el.classList.toggle('sel', i >= 0); el.querySelector('.badge').textContent = i === 0 ? '▼ 你（整場操作）' : '隊友（電腦）';
  }
  const n = S.size, pr = S.practice;
  $('bGo').disabled = S.sel.length < n;
  $('bGo').textContent = pr ? '進練習場' : '開打！';
  $('selTitle').textContent = pr ? '挑 1 個人進練習場' : n === 1 ? '挑 1 個人一打一' : `挑 ${n} 個同事組隊`;
  $('selHint').textContent = S.sel.length < n ? (n === 1 ? '點一個人' : `再挑 ${n - S.sel.length} 個人（先點的就是你整場操作的人）`) : pr ? `${CHARS[S.sel[0]].name}：自由投籃、陪練防守、一打一都在練習場裡切換` : `${S.sel.map(k => CHARS[k].name).join('＆')}，對手由電腦隨機挑${n === 1 ? '（先到 11 分）' : ''}`;
  for (const b of $('modeSeg').children) b.classList.toggle('on', b.dataset.v === (pr ? 'p' : String(n)));
  $('diffSeg').style.visibility = pr ? 'hidden' : '';
  for (const b of $('diffSeg').children) b.classList.toggle('on', +b.dataset.v === S.diff);
  for (const b of $('courtSeg').children) b.classList.toggle('on', b.dataset.v === S.court);
}
const MODE_KEY = 'office-basketball-mode', DIFF_KEY = 'office-basketball-diff', COURT_KEY = 'office-basketball-court';
S.sel = []; { const m = store.get(MODE_KEY); S.practice = m === 'p'; S.size = m === '3' ? 3 : m === '2' || !m ? 2 : 1; } S.diff = ['0', '1', '2'].includes(store.get(DIFF_KEY)) ? +store.get(DIFF_KEY) : 1;
$('bRand').onclick = () => { fx.audioInit(); fx.sfx.click(); S.sel = shuffle(ROSTER.slice()).slice(0, S.size); refreshSelect(); };
$('bGo').onclick = () => { if (S.sel.length < S.size) return; if (fsOK && matchMedia('(pointer: coarse)').matches) goFull(true); S.pick = S.sel.slice(); startMatch(); };   // 手機按開打順便全螢幕
for (const b of $('modeSeg').children) b.onclick = () => { fx.sfx.click(); const v = b.dataset.v; S.practice = v === 'p'; S.size = S.practice ? 1 : +v; store.set(MODE_KEY, v); S.sel = S.sel.slice(0, S.size); refreshSelect(); };
for (const b of $('diffSeg').children) b.onclick = () => { fx.sfx.click(); S.diff = +b.dataset.v; store.set(DIFF_KEY, S.diff); refreshSelect(); };
// 球場：辦公室頂樓／大橋尾球場（廟口），選了背景馬上換，會記住
S.court = store.get(COURT_KEY) === 'temple' ? 'temple' : 'roof';
for (const b of $('courtSeg').children) b.onclick = () => { fx.sfx.click(); S.court = b.dataset.v; store.set(COURT_KEY, S.court); setCourt(S.court); refreshSelect(); };
function toSelect() { S.prac = null; document.body.classList.remove('prac'); musicTheme(); S.mode = 'select'; document.body.classList.remove('playing'); show('select'); refreshSelect(); clearCourt(); }
// 比賽中途回選角：球員、防守扇形、Kevin 的無人機、大招過場、特寫鏡頭都收掉，不要定格留在選角背景的球場上
function clearCourt() {
  clearPlayers(); S.cut = null; S.meter = null; SC.t = 0; $('cutin').classList.remove('on'); $('flash').className = '';
  if (guardFan) guardFan.visible = boxRing.visible = false;
  if (KV.on) { scene.remove(KV.drone, KV.reticle, KV.laser); KV.on = false; } KV.zoom = 0;
}
function startMatch() {
  fx.audioInit(); soundIcon();
  newMatch(); S.mode = 'play'; show(null); document.body.classList.add('playing');
  musicStart(true);
}
function togglePause() {
  if (S.mode === 'play') { S.mode = 'pause'; show('pause'); musicPause(); }
  else if (S.mode === 'pause') { S.mode = 'play'; show(null); musicStart(); }
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
  const dt = dtReal * (S.hitT > 0 ? 0.004 : S.ts);
  if (S.hitT > 0) S.hitT -= dtReal;
  S.t += dt;
  const t = performance.now() / 1000;
  readKeys();
  updateFlow(dt);
  updatePlayers(dt, t);
  updateBall(dt);
  updateKevinFx(dt, t);
  updateCaishen(dt, t);
  updateShield(dt, t);
  updateCrowd(dt, t); updateGuardMarks(t);
  animateCourt(dt, t);
  fx.updateFx(dt);
  for (let i = extraFx.length - 1; i >= 0; i--) if (!extraFx[i](dt)) extraFx.splice(i, 1);
  arcFlash = Math.max(0, arcFlash - dtReal);
  if (arcLine) arcLine.material.opacity = (S.mustClear && B.mode === 'held' ? 0.55 + 0.35 * Math.sin(t * 8) : 0) + arcFlash * 0.5;
  if (KV.zoom > 0) KV.zoom -= dtReal;
  if (!S.cut) cam.zoom += ((KV.zoom > 0 ? 0.92 : 1) - cam.zoom) * Math.min(1, dtReal * 3);
  if (SC.t > 0) {   // 大招特寫鏡頭
    SC.t -= dtReal; const k = 1 - SC.t / SC.dur;
    if (SC.fn) {
      const [pos, look] = SC.fn(k * k * (3 - 2 * k));
      if (camera.aspect < 1) pos.sub(look).multiplyScalar(1.5).add(look);   // 直式畫面窄，退遠一點
      pos.x = THREE.MathUtils.clamp(pos.x, -5.9, 5.9); pos.z = THREE.MathUtils.clamp(pos.z, -1.3, 13); pos.y = Math.max(0.2, pos.y);
      camera.position.lerp(pos, k < 0.05 ? 1 : 0.25); camera.lookAt(look);
    } else { camera.position.copy(SC.pos).lerp(SC.look, k * 0.12); camera.lookAt(SC.look); }
    if (SC.t <= 0) updateCamera(camFocus(), 0, true);
    hideBlockers(SC.t > 0 ? SC.p : null);
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
function updateQBtn() { qBtn.textContent = `畫質：${Q_NAME[quality.pref]}` + (quality.pref === 'auto' ? `（現在${Q_NAME[quality.level]}）` : ''); }
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
  if (youSprite) youSprite.visible = false;
  const t = performance.now() / 1000;
  updateCrowd(dt, t); animateCourt(dt, t); fx.updateFx(dt);
  B.pos.set(Math.sin(t * 0.7) * 2, BR + Math.abs(Math.sin(t * 3)) * 1.2, 4); ballMesh.position.copy(B.pos);
  updateCamera(V(Math.sin(t * 0.2) * 1.5, 0.8, 4.5), dt);
}

// ---------- 測試用 ----------
const G = window.G = {
  S, B, CFG, CHARS, LOG, music, CAMS, FOCUS, OVER, overTarget, get players() { return players; }, auto: /[?&]auto/.test(location.search), hold: false,
  step(dt = 1 / 60, n = 1) { for (let i = 0; i < n; i++) step(dt); render(); return { phase: S.phase, score: S.score.slice(), clock: +S.clock.toFixed(1), ball: B.mode }; },
  start(pick = ['kui', 'jie'], ...rest) {   // G.start('kui','jie',[對手]) 或 G.start(['kui','jie','mi'], [對手])
    let opp; if (typeof pick === 'string') { pick = [pick, rest[0]]; opp = rest[1]; } else opp = rest[0];
    S.pick = pick; if (opp) { S.opp = opp; S.keepOpp = true; } startMatch();
  },
  fill() { for (const p of players) p.gauge = 100; },
  special(key) { const p = players.find(q => q.key === key); if (!p) return 'not playing'; p.gauge = 100; const why = specialBlock(p); if (why !== null) return why || 'busy'; return startSpecial(p); },
  skill(key) { const p = players.find(q => q.key === key); p.skillCd = 0; return doSkill(p)?.kind || 'dash/combo'; },
  art: actionArt, pl: (key) => players.find(q => q.key === key),
  give(key) { const p = players.find(q => q.key === key); gainBall(p, 'check'); S.mustClear = false; },
  toSelect, finish, seekOP,
  prac(key = 'kui') { S.practice = true; S.size = 1; S.pick = [key]; startMatch(); },   // 練習場
  pracOpp: (m) => setPracOpp(m),
  inp, knock: (k, clip = 'flop') => knockDown(G.pl(k), clip, '測試倒地'),
};

// ---------- 開始 ----------
(async () => {
  try { await loadAll(k => { $('loadBar').style.width = Math.round(k * 100) + '%'; }); }
  catch (e) { $('loading').textContent = '載入失敗，請重新整理'; console.error(e); window.bootFail?.('角色模型下載失敗', '網路可能不穩，重新整理再試一次。（' + (e.message || e) + '）'); return; }
  window.bootOk?.(); updateQBtn();
  buildCourt(); setCourt(S.court); buildArc(); buildCaishen();
  makePortraits(); buildSelect(); buildCrowd();
  $('loading').remove();
  if (!matchMedia('(pointer: coarse)').matches) document.body.classList.add('kbd');
  updateCamera(V(0, 0.8, 4.5), 0, true);
  if (/[?&#]play/.test(location.href)) { S.pick = ['kui', 'jie']; startMatch(); }
  else {
    S.mode = 'title'; show('title'); musicTheme();
    if (!/[?&#](auto|noop)/.test(location.href)) openOP(null, { sounds: OP_SFX });   // 開場 OP 蓋在標題畫面上，播完或跳過就看到標題
  }
  requestAnimationFrame(frame);
})();
