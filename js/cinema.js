// 短劇彩蛋放映室：a4 不想上班 EP9《要打去籃球場》的三段補拍。影片按了才下載（各 4～7MB），不影響遊戲載入
// 字幕用網頁疊在影片上，不燒進影片（手機直式、橫式都排得好，要改字也不用重新轉檔）
// 台詞來自 a4-shortdrama/提示詞/EP9_鬥牛.md，時間照音量波形對的。note、voice 是為了好看另外加的字，不是片中對白
// 字幕種類：say 對白（黃字）、voice 旁白（黃字、慢慢浮現）、shout 必殺技大字（逐字砸下來）、beat 一字一字敲出來、note 角落小字、title 片名卡
const CLIPS = {
  dunk: { title: '亢龍不悔旋風式灌籃', who: '阿傑', len: '23 秒', src: 'video/ep9_dunk', hits: [7.05, 14.5, 16.8], cues: [
    { t: [0.3, 2.6], k: 'title', x: '阿傑', y: '資深設計師・中鋒' },
    { t: [4.2, 6.6], k: 'note', x: '防守：Kevin（特助）' },
    { t: [7.0, 9.7], k: 'shout', x: '亢龍不悔──', c: 'fire' },
    { t: [10.0, 12.0], k: 'note', x: '（他在空中走路）' },
    { t: [12.2, 14.2], k: 'note', x: '（再轉一圈）' },
    { t: [14.4, 16.5], k: 'shout', x: '旋風式灌籃！', c: 'fire' },
    { t: [18.2, 22.8], k: 'voice', x: '這稿，我一次就過。' },
  ] },
  miss: { title: 'AI 進球法', who: 'Kevin', len: '22 秒', src: 'video/ep9_miss', hits: [13.5, 15.6], cues: [
    { t: [1.1, 2.5], k: 'say', x: 'AI 告訴我……' },
    { t: [2.9, 4.1], k: 'say', x: '此刻出手，' },
    { t: [4.15, 5.6], k: 'beat', x: '命中率，百分之百。' },
    { t: [7.7, 9.3], k: 'say', x: '特助你丟哪裡啊？', c: 'kui' },
    { t: [9.5, 10.5], k: 'say', x: '別急。' },
    { t: [10.6, 12.3], k: 'say', x: '讓子彈飛一會兒。' },
    { t: [12.6, 15.4], k: 'note', x: '（AI 無人機：已接管）' },
    { t: [16.0, 19.2], k: 'note', x: '（他沒有回頭）' },
    { t: [19.6, 20.6], k: 'say', x: '欸不是，', c: 'kui' },
    { t: [20.6, 22.0], k: 'say', x: '特助你這樣犯規了吧？', c: 'kui' },
  ] },
  end: { title: '黃昏的小米', who: '小米', len: '16 秒', src: 'video/ep9_end', hits: [9.2, 11.2], cues: [
    { t: [0.4, 3.0], k: 'voice', x: '下午五點五十九分，她下班了。' },
    { t: [3.3, 5.6], k: 'voice', x: '一顆球，滾到她的腳邊。' },
    { t: [5.8, 8.2], k: 'note', x: '距離籃框：非常遠' },
    { t: [9.2, 11.0], k: 'shout', x: '三分。', c: 'fire' },
    { t: [11.2, 12.6], k: 'note', x: '（空心）' },
    { t: [13.0, 15.9], k: 'voice', x: '那一球，她沒有回頭看。' },
  ] },
};
const LABEL = { jie: 'dunk', kevin: 'miss', mi: 'end' };
// 用這個角色打完，結算畫面可以看哪一段
export const clipOf = (key) => LABEL[key] || null;
export const clipName = (k) => CLIPS[k]?.title;

let box, video, subs, active = null, hitDone = new Set(), timer = 0, hooks = {};
const ch = (s) => [...s].map((c, i) => `<i style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</i>`).join('');
function cueEl(c) {
  const el = document.createElement('div');
  el.className = 'cue ' + c.k + (c.c ? ' ' + c.c : '');
  if (c.k === 'title') el.innerHTML = `<b>${c.x}</b><small>${c.y}</small>`;
  else if (c.k === 'shout' || c.k === 'beat') el.innerHTML = ch(c.x);
  else el.textContent = c.x;
  return el;
}
// 這一秒該有哪些字幕：跟影片時間走，不用計時器，影片卡住或快轉字幕也對得上
function render(t) {
  const clip = CLIPS[active]; if (!clip) return;
  clip.cues.forEach((c, i) => {
    const on = t >= c.t[0] && t < c.t[1], el = c.el;
    if (on && !el) { c.el = cueEl(c); subs.appendChild(c.el); }
    else if (!on && el) { el.classList.add('out'); setTimeout(() => el.remove(), 260); c.el = null; }
  });
  for (const h of clip.hits) if (t >= h && t < h + 0.25 && !hitDone.has(h)) {
    hitDone.add(h); box.classList.remove('hit'); void box.offsetWidth; box.classList.add('hit');
  }
  const bar = box.querySelector('.cineBar i'); if (video.duration) bar.style.width = (video.currentTime / video.duration * 100) + '%';
}
// 字幕用自己的計時器更新，不跟著畫面重繪：重繪卡一下，字幕也不會晚出來
function startSubs() { clearInterval(timer); timer = setInterval(() => { if (active) render(video.currentTime); }, 40); }
function stopSubs() { clearInterval(timer); timer = 0; }
function build() {
  box = document.createElement('div'); box.id = 'cine';
  box.innerHTML = `<div class="cineList"><h2>🎬 短劇彩蛋</h2><p>a4 不想上班 EP9《要打去籃球場》</p><div class="cards"></div><button class="big sec" id="cineBack">回遊戲</button></div>
    <div class="cinePlay"><video playsinline preload="none"></video><div class="cineFlash"></div><div class="cineSubs"></div><div class="cineBar"><i></i></div>
    <div class="cineEnd"><button class="big" id="cineAgain">再看一次</button><button class="big sec" id="cineDone">回去</button></div><button id="cineSkip">略過 ▶▶</button></div>`;
  document.body.appendChild(box);
  video = box.querySelector('video'); subs = box.querySelector('.cineSubs');
  box.querySelector('.cards').innerHTML = Object.entries(CLIPS).map(([k, c]) => `<button class="cineCard" data-k="${k}"><img src="${c.src}.webp" alt="" loading="lazy"><b>${c.title}</b><span>${c.who}・${c.len}</span></button>`).join('');
  for (const b of box.querySelectorAll('.cineCard')) b.onclick = () => play(b.dataset.k);
  box.querySelector('#cineBack').onclick = close;
  box.querySelector('#cineSkip').onclick = finish;
  box.querySelector('#cineDone').onclick = () => { stop(); if (box.dataset.from === 'list') showList(); else close(); };
  box.querySelector('#cineAgain').onclick = () => play(active || box.dataset.last);
  video.onended = finish;
  video.onerror = () => { box.querySelector('.cineEnd').classList.add('on'); box.classList.add('fail'); };
  video.onwaiting = () => box.classList.add('buffer');
  video.onplaying = () => box.classList.remove('buffer');
}
function clearSubs() { subs.innerHTML = ''; for (const c of Object.values(CLIPS)) for (const q of c.cues) q.el = null; hitDone.clear(); }
function stop() { stopSubs(); active = null; video.pause(); clearSubs(); box.classList.remove('hit', 'buffer', 'fail'); box.querySelector('.cineEnd').classList.remove('on'); }
function finish() { stopSubs(); video.pause(); box.dataset.last = active; clearSubs(); box.querySelector('.cineEnd').classList.add('on'); }
function showList() { box.className = 'on list'; box.dataset.from = 'list'; }
function play(k) {
  if (!box) build();
  stop();
  active = k; box.className = 'on playing'; box.dataset.last = k;
  video.src = CLIPS[k].src + '.mp4'; video.muted = false; video.load();
  const p = video.play(); if (p) p.catch(() => { video.muted = true; video.play().catch(() => {}); });
  startSubs();
}
function close() { if (box) { stop(); box.className = ''; video.removeAttribute('src'); video.load(); } hooks.onClose?.(); }
// 放映室開著的時候遊戲不用畫背景（js/main.js 的 frame），比較順也省電
export const cineOpen = () => !!box && box.classList.contains('on');
// 放映室
export function openCinema(h = {}) { hooks = h; if (!box) build(); hooks.onOpen?.(); showList(); }
// 直接播一段（結算畫面的按鈕），播完回原來的畫面
export function playClip(k, h = {}) { hooks = h; if (!box) build(); hooks.onOpen?.(); box.dataset.from = 'single'; play(k); box.dataset.from = 'single'; }
// 測試用：不靠影片，直接畫某一秒的字幕
export const cineTest = { cues: (k, t) => { if (!box) build(); active = k; box.className = 'on playing'; render(t); }, stop: () => close(), CLIPS };
