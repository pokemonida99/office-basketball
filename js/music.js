// 配樂：使用者給的兩首 mp3。封面、選角、結算放「籃球主題」，比賽中放「籃球音樂」，都循環播放
// 瀏覽器要有點擊之後才能出聲，所以第一次點畫面時才開始播
export const music = { on: true, cur: null, want: null };
const TRACKS = { theme: 'audio/theme.mp3?v=0.3.2', game: 'audio/game.mp3?v=0.3.2' };
const el = {};
function track(name) {
  if (!el[name]) { const a = new Audio(TRACKS[name]); a.loop = true; a.preload = 'auto'; a.volume = name === 'game' ? 0.42 : 0.5; el[name] = a; }
  return el[name];
}
// 切到某一首（另一首停掉）；name 為 null 就全停
export function playTrack(name, restart = false) {
  music.want = name; music.paused = false;
  for (const k of Object.keys(el)) if (k !== name) el[k].pause();
  if (!name || !music.on) { if (music.cur && el[music.cur]) el[music.cur].pause(); music.cur = null; return; }
  const a = track(name);
  if (restart) a.currentTime = 0;   // 新的一場比賽從頭放；暫停回來、主題曲都接著放
  music.cur = name;
  a.play().catch(() => { music.cur = null; });   // 還沒點過畫面：等下一次點擊再試
}
export const musicStart = (restart = false) => playTrack('game', restart);
export const musicTheme = () => playTrack('theme');
export const musicStop = () => playTrack(null);
export function musicPause() { for (const a of Object.values(el)) a.pause(); music.cur = null; music.paused = true; }   // 遊戲暫停：回到前景也不要自己播
export function musicTick() {}
// 第一次點擊、按鍵時把該放的那首補播
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => { if (music.on && music.want && !music.paused && music.cur !== music.want) playTrack(music.want); }, { passive: true });
// 切到背景時暫停，回來再播
addEventListener('visibilitychange', () => { if (document.hidden) { for (const a of Object.values(el)) a.pause(); music.cur = null; } else if (music.on && music.want && !music.paused) playTrack(music.want); });
