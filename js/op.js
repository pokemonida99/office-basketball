// 開場 OP：三女對三女大合照（tools/gen_op.sh 用 GPT 畫，op/op9.webp）＋程式運鏡、片名砸下來。一打開就直接播，不用先點
// （v0.5.5 使用者嫌太長，拿掉聯名卡和前面 6 顆鏡頭，只留最後這顆）
// 每一格自己算畫面（不用 CSS 動畫），跳過、重看、測試跳到某一秒都一樣
import { playTrack } from './music.js?v=0.5.5';

// d 秒數；oy 畫面太寬被裁上下時，往上／往下保留哪裡（%，臉通常在上面）；z 起訖縮放；x 起訖橫移（圖寬 %，直式手機會放大三倍來回掃）；cap 字幕 [大字, 小字]
// flash 開頭白閃；shake 抖動；vs 對決字；title 片名
const SHOTS = [
  { img: 'op9', oy: 14, d: 3.6, z: [1.14, 1.0], x: [0, 0], title: true, flash: true },
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
  for (const s of SHOTS) if (s.img) { const im = new Image(); im.decoding = 'async'; im.src = `op/${s.img}.webp?v=0.5.5`; imgs[s.img] = im; }
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

// 開場：一打開就直接播（還沒點過畫面的話瀏覽器不給出聲，就安靜播）
export function openOP(done, { sounds } = {}) {
  build(); onEnd = done; sfx = sounds || null;
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
export function seekOP(t) { build(); root.classList.add('on'); playing = false; cancelAnimationFrame(raf); lastShot = -1; frame(t); }
export const opPlaying = () => !!root && root.classList.contains('on');
// 電腦：Esc、Enter、空白鍵跳過
addEventListener('keydown', (e) => {
  if (!opPlaying()) return;
  if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); finish(); }
});
