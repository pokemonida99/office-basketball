// 開場 OP（tools/gen_op.sh 用 GPT 畫劇照）＋程式運鏡、片名砸下來。一打開就直接播，不用先點
// 橫式：三女對三女大合照（op/op9.webp）；直式：三張直的隊伍照一隊一張（t1 上班族、t2 香香、t3 山頂國小），最後三張並排砸片名
// （v0.5.5 使用者嫌太長，拿掉聯名卡和前面 6 顆鏡頭；v0.5.6 直式改三張隊伍照，橫的合照在直式手機只剩中間一條）
// 每一格自己算畫面（不用 CSS 動畫），跳過、重看、測試跳到某一秒都一樣
import { playTrack } from './music.js?v=0.5.6';

// d 秒數；oy 畫面太寬被裁上下時，往上／往下保留哪裡（%，臉通常在上面）；z 起訖縮放；x 起訖橫移（圖寬 %，直式手機會放大三倍來回掃）；cap 字幕 [大字, 小字]
// flash 開頭白閃；shake 抖動；vs 對決字；title 片名；full 直的照片鋪滿整個直式畫面；tri 三張隊伍照並排三欄
const SHOTS_H = [
  { img: 'op9', oy: 14, d: 3.6, z: [1.14, 1.0], x: [0, 0], title: true, flash: true },
];
const SHOTS_V = [
  { img: 't1', oy: 20, d: 0.95, z: [1.1, 1.0], x: [0, 0], full: true, flash: true, cap: ['a4 不想上班', '小米・Vivi・小葵'] },
  { img: 't2', oy: 20, d: 0.95, z: [1.0, 1.1], x: [0, 0], full: true, flash: true, cap: ['香香籃球隊', '林語彤・元小雨・胡姬'] },
  { img: 't3', oy: 20, d: 0.95, z: [1.1, 1.0], x: [0, 0], full: true, flash: true, cap: ['山頂國小', '兔兔老師・校長・小編'] },
  { tri: true, d: 2.6, title: true, flash: true },
];
let SHOTS = SHOTS_H, START = [], TOTAL = 0;
function pickShots() {
  SHOTS = innerWidth < innerHeight ? SHOTS_V : SHOTS_H;
  START = []; TOTAL = 0;
  for (const s of SHOTS) { START.push(TOTAL); TOTAL += s.d; }
}

const $ = (id) => document.getElementById(id);
const ease = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => Math.max(0, Math.min(1, t));
let root, imgs = {}, raf = 0, t0 = 0, playing = false, onEnd = null, lastShot = -1, sfx = null;

function build() {
  if (root) return;
  root = $('op');
  for (const s of [...SHOTS_H, ...SHOTS_V]) if (s.img) { const im = new Image(); im.decoding = 'async'; im.src = `op/${s.img}.webp?v=0.5.6`; imgs[s.img] = im; }
  $('opTri').innerHTML = ['t1', 't2', 't3'].map(k => `<div><img src="op/${k}.webp?v=0.5.6" alt=""></div>`).join('');
  $('opSkip').onclick = () => finish();
  root.onclick = (e) => { if (e.target === root || e.target.closest('#opFrame, #opTitle')) finish(); };   // 點畫面也能跳過
}

// 畫第 t 秒那一格
function frame(t) {
  let i = SHOTS.length - 1;
  while (i > 0 && START[i] > t) i--;
  const s = SHOTS[i], lt = t - START[i], k = clamp01(lt / s.d), e = ease(k);
  const portrait = innerWidth < innerHeight;
  if (i !== lastShot) {
    lastShot = i;
    root.dataset.shot = i;
    root.classList.toggle('vs', !!s.vs);
    root.classList.toggle('full', !!s.full);
    root.classList.toggle('tri', !!s.tri);
    root.classList.toggle('ttl', !!s.title);
    if (s.img) { $('opImg').src = imgs[s.img].src; $('opBg').src = imgs[s.img].src; $('opImg').style.objectPosition = `50% ${s.oy}%`; $('opImg').style.transformOrigin = `50% ${s.oy}%`; }
    $('opCapB').textContent = s.cap ? s.cap[0] : '';
    $('opCapS').textContent = s.cap ? s.cap[1] : '';
    root.classList.toggle('cap', !!s.cap);
    if (playing && sfx) (s.title ? sfx.boss : s.flash ? sfx.whoosh : null)?.();
  }
  // 運鏡
  if (s.img) {
    const z = s.z[0] + (s.z[1] - s.z[0]) * e;
    let x = s.x[0] + (s.x[1] - s.x[0]) * e;
    if (portrait && !s.full) x = x * 3 + (s.x[0] === s.x[1] ? (e - 0.5) * 16 : 0);   // 直式畫面窄，來回掃一遍讓每個人都入鏡
    let sx = 0, sy = 0;
    if (s.shake && lt < 0.35) { const a = (0.35 - lt) * 30; sx = Math.sin(lt * 90) * a; sy = Math.cos(lt * 70) * a; }
    $('opImg').style.transform = `translate(calc(${x}% + ${sx}px), ${sy}px) scale(${z})`;
  }
  // 白閃
  $('opFlash').style.opacity = s.flash ? Math.max(0, 1 - lt / 0.22) : 0;
  // 字幕：從左邊滑進來，最後 0.2 秒淡出
  const ci = clamp01(lt / 0.28), co = clamp01((s.d - lt) / 0.2);
  $('opCap').style.transform = `translateX(${(1 - ease(ci)) * -110}%) skewX(-8deg)`;
  $('opCap').style.opacity = Math.min(ci * 2, co);
  // 三欄並排：三張隊伍照上下交錯滑進來，之後慢慢推近
  if (s.tri) [...$('opTri').children].forEach((c, j) => {
    const v = ease(clamp01((lt - j * 0.08) / 0.32));
    c.style.transform = `translateY(${(1 - v) * (j % 2 ? 100 : -100)}%)`;
    c.firstChild.style.transform = `scale(${1.12 - 0.08 * e})`;
  });
  // 對決字
  if (s.vs) { const v = clamp01(lt / 0.2); $('opVs').style.transform = `translate(-50%, -50%) scale(${3 - 2 * ease(v)}) rotate(-8deg)`; $('opVs').style.opacity = v; }
  // 片名：0.5 秒後砸下來，畫面抖一下
  if (s.title) {
    const v = clamp01((lt - 0.5) / 0.22), w = clamp01((lt - 0.85) / 0.4);
    $('opTitle').style.opacity = v;
    $('opTitleMain').style.transform = `scale(${2.6 - 1.6 * ease(v)})`;
    $('opTitleSub').style.opacity = w;
    if (v >= 1 && lt < 1.05) { const a = (1.05 - lt) * 24, sh = ` translate(${Math.sin(lt * 80) * a}px, ${Math.cos(lt * 60) * a}px)`; if (s.tri) $('opTri').style.transform = sh; else $('opImg').style.transform += sh; }
    else if (s.tri) $('opTri').style.transform = '';
  } else $('opTitle').style.opacity = 0;
  // 結尾淡出
  root.style.opacity = t > TOTAL - 0.5 ? clamp01((TOTAL - t) / 0.5) : 1;
  $('opBar').style.transform = `scaleX(${clamp01(t / TOTAL)})`;
}

function loop() {
  const t = (performance.now() - t0) / 1000;
  if (t >= TOTAL) return finish();
  frame(t);
  raf = requestAnimationFrame(loop);
}

// 開場：一打開就直接播（還沒點過畫面的話瀏覽器不給出聲，就安靜播）
export function openOP(done, { sounds } = {}) {
  build(); pickShots(); onEnd = done; sfx = sounds || null;
  root.classList.add('on'); root.style.opacity = 1; playing = true; lastShot = -1;
  sfx?.init?.();
  playTrack('theme', true);
  t0 = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
}
function finish() {
  cancelAnimationFrame(raf); playing = false;
  root.classList.remove('on');
  const f = onEnd; onEnd = null; f?.();
}
// 重看開場
export const replayOP = openOP;
// 測試用：停在第 t 秒
export function seekOP(t) { build(); pickShots(); root.classList.add('on'); playing = false; cancelAnimationFrame(raf); lastShot = -1; frame(t); }
export const opPlaying = () => !!root && root.classList.contains('on');
// 電腦：Esc、Enter、空白鍵跳過
addEventListener('keydown', (e) => {
  if (!opPlaying()) return;
  if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); finish(); }
});
