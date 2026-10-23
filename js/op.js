// 開場 OP：真人風劇照（tools/gen_op.sh 用 GPT 畫，op/*.webp）＋程式運鏡、字幕、聯名卡、片名
// 每一格自己算畫面（不用 CSS 動畫），跳過、重看、測試跳到某一秒都一樣
import { playTrack } from './music.js?v=0.5.1';

// d 秒數；oy 畫面太寬被裁上下時，往上／往下保留哪裡（%，臉通常在上面）；z 起訖縮放；x 起訖橫移（圖寬 %，直式手機會放大三倍來回掃）；cap 字幕 [大字, 小字]
// flash 開頭白閃；shake 抖動；brand 聯名卡；vs 對決字；title 片名
const SHOTS = [
  { brand: true, d: 2.8 },
  { img: 'op3', oy: 12, d: 1.9, z: [1.12, 1.03], x: [3, -3], cap: ['頂樓集合', '老闆說：輸的請珍奶'], flash: true },
  { img: 'op4', oy: 12, d: 2.5, z: [1.0, 1.1], x: [0, 0], cap: ['上班族隊', '阿傑・小米・Vivi・小葵・Kevin'], flash: true },
  { img: 'op5', oy: 8, d: 2.5, z: [1.1, 1.0], x: [-3, 3], cap: ['香香籃球隊', '元小雨・林語彤・胡姬'] },
  { img: 'op6', oy: 30, d: 1.9, z: [1.06, 1.22], x: [0, 0], vs: true, flash: true },
  { img: 'op7', oy: 10, d: 1.4, z: [1.14, 1.03], x: [5, -5], shake: true, flash: true },
  { img: 'op8', oy: 10, d: 1.4, z: [1.03, 1.14], x: [-5, 5], shake: true, flash: true },
  { img: 'op9', oy: 14, d: 3.8, z: [1.14, 1.0], x: [0, 0], title: true, flash: true },
];
const START = []; let TOTAL = 0;
for (const s of SHOTS) { START.push(TOTAL); TOTAL += s.d; }
export const OP_LEN = TOTAL;

const $ = (id) => document.getElementById(id);
const ease = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => Math.max(0, Math.min(1, t));
let root, imgs = {}, raf = 0, t0 = 0, playing = false, onEnd = null, lastShot = -1, sfx = null;

function build() {
  if (root) return;
  root = $('op');
  for (const s of SHOTS) if (s.img) { const im = new Image(); im.decoding = 'async'; im.src = `op/${s.img}.webp?v=0.5.1`; imgs[s.img] = im; }
  $('opSkip').onclick = () => finish();
  $('opPlay').onclick = () => start();
  $('opNo').onclick = () => { playTrack('theme'); finish(); };
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
    root.classList.toggle('brand', !!s.brand);
    root.classList.toggle('vs', !!s.vs);
    root.classList.toggle('ttl', !!s.title);
    if (s.img) { $('opImg').src = imgs[s.img].src; $('opBg').src = imgs[s.img].src; $('opImg').style.objectPosition = `50% ${s.oy}%`; $('opImg').style.transformOrigin = `50% ${s.oy}%`; }
    $('opCapB').textContent = s.cap ? s.cap[0] : '';
    $('opCapS').textContent = s.cap ? s.cap[1] : '';
    root.classList.toggle('cap', !!s.cap);
    if (playing && sfx && i > 0) (s.title ? sfx.boss : s.flash ? sfx.whoosh : null)?.();
  }
  // 運鏡
  if (s.img) {
    const z = s.z[0] + (s.z[1] - s.z[0]) * e;
    let x = s.x[0] + (s.x[1] - s.x[0]) * e;
    if (portrait) x = x * 3 + (s.x[0] === s.x[1] ? (e - 0.5) * 16 : 0);   // 直式畫面窄，來回掃一遍讓每個人都入鏡
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
  // 聯名卡：a4 從左、香香從右，× 彈出來，「聯名製作」最後淡入
  if (s.brand) {
    const a = ease(clamp01(lt / 0.45)), b = ease(clamp01((lt - 0.2) / 0.45)), c = clamp01((lt - 0.6) / 0.25), d = clamp01((lt - 0.9) / 0.4);
    const out = clamp01((s.d - lt) / 0.3);
    $('opA4').style.transform = `translateX(${(1 - a) * -60}vw) rotate(${-8 + (1 - a) * -40}deg)`;
    $('opXX').style.transform = `translateX(${(1 - b) * 60}vw) rotate(${(1 - b) * 360}deg)`;
    $('opX').style.transform = `scale(${c < 1 ? c * 1.4 : 1})`;
    $('opMade').style.opacity = d;
    $('opBrand').style.opacity = out;
  }
  // 對決字
  if (s.vs) { const v = clamp01(lt / 0.2); $('opVs').style.transform = `translate(-50%, -50%) scale(${3 - 2 * ease(v)}) rotate(-8deg)`; $('opVs').style.opacity = v; }
  // 片名：0.5 秒後砸下來，畫面抖一下
  if (s.title) {
    const v = clamp01((lt - 0.5) / 0.22), w = clamp01((lt - 0.85) / 0.4);
    $('opTitle').style.opacity = v;
    $('opTitleMain').style.transform = `scale(${2.6 - 1.6 * ease(v)})`;
    $('opTitleSub').style.opacity = w;
    if (v >= 1 && lt < 1.05) { const a = (1.05 - lt) * 24; $('opImg').style.transform += ` translate(${Math.sin(lt * 80) * a}px, ${Math.cos(lt * 60) * a}px)`; }
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

// 開場：先停在聯名卡，等玩家點「播放開場」（瀏覽器要點過才能出聲）
export function openOP(done, { sounds } = {}) {
  build(); onEnd = done; sfx = sounds || null;
  playing = false; lastShot = -1; cancelAnimationFrame(raf);
  root.classList.add('on', 'gate'); root.style.opacity = 1;
  frame(1.5);
}
function start() {
  root.classList.remove('gate'); playing = true; lastShot = -1;
  sfx?.init?.();
  playTrack('theme', true);
  t0 = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
}
function finish() {
  cancelAnimationFrame(raf); playing = false;
  root.classList.remove('on', 'gate');
  const f = onEnd; onEnd = null; f?.();
}
// 重看開場：直接播（按鈕已經是點擊了）
export function replayOP(done, opts) { openOP(done, opts); start(); }
// 測試用：停在第 t 秒
export function seekOP(t) { build(); root.classList.add('on'); root.classList.remove('gate'); playing = false; cancelAnimationFrame(raf); lastShot = -1; frame(t); }
export const opPlaying = () => !!root && root.classList.contains('on');
// 電腦：Esc 跳過；還在等點擊時 Enter／空白鍵＝播放
addEventListener('keydown', (e) => {
  if (!opPlaying()) return;
  if (e.key === 'Escape') { e.preventDefault(); root.classList.contains('gate') ? $('opNo').click() : finish(); }
  else if ((e.key === 'Enter' || e.key === ' ') && root.classList.contains('gate')) { e.preventDefault(); start(); }
});
