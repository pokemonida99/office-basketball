// 程式配樂：街頭籃球的放克小節拍（WebAudio 合成，音量很小）。每幀呼叫 musicTick() 往前排 0.3 秒的音
import { getAC, noise } from './fx.js';

const BPM = 104, STEP = 60 / BPM / 4;   // 16 分音符
const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
// 四小節 Am7 - Dm7 - G7 - Cmaj7，貝斯切分音、和弦短促、旋律是口哨小動機
const ROOTS = [45, 50, 43, 48];
const CHORDS = [[57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65], [60, 64, 67, 71]];
const BASS = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0];   // 哪幾格彈貝斯
const BASS_OCT = [0, 0, 0, 12, 0, 0, 0, 0, 0, 0, 7, 0, 0, 12, 0, 0];
const MELODY = [
  [76, -1, -1, 74, 72, -1, 69, -1, -1, -1, 72, -1, 74, -1, -1, -1],
  [77, -1, -1, 76, 74, -1, 72, -1, 69, -1, -1, -1, -1, -1, -1, -1],
  [74, -1, -1, 72, 71, -1, 67, -1, -1, -1, 71, -1, 74, -1, 77, -1],
  [76, -1, -1, -1, 72, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
];
export const music = { on: true, playing: false, next: 0, step: 0, gain: null, hype: 0 };

function note(ac, out, f, t, dur, type, vol, slide = 0) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02);
}
export function musicStart() {
  const A = getAC(); if (!A || !music.on) return;
  if (!music.gain) { music.gain = A.ac.createGain(); music.gain.gain.value = 0.4; music.gain.connect(A.master); }
  if (music.playing) return;
  music.playing = true; music.next = A.ac.currentTime + 0.05; music.step = 0;
}
export function musicStop() { music.playing = false; }
export function musicTick(fast = 1) {
  const A = getAC(); if (!A || !music.playing || !music.on) return;
  const { ac } = A, out = music.gain, st = STEP / fast;
  if (music.next < ac.currentTime - 0.2) music.next = ac.currentTime + 0.02;   // 分頁被暫停過就跳過去，不要一次補一堆音
  while (music.next < ac.currentTime + 0.3) {
    const s = music.step % 64, bar = s >> 4, i = s & 15, t = music.next, w = t - ac.currentTime;
    if (i === 0 || i === 10 || (i === 7 && bar % 2)) note(ac, out, 120, t, 0.18, 'sine', 0.9, 0.35);           // 大鼓
    if (i === 4 || i === 12) noise(0.12, 0.35, 1800, 0.7, w);                                                    // 小鼓
    if (i % 2 === 0) noise(0.03, i % 4 === 2 ? 0.12 : 0.06, 8000, 1, w, 'highpass');                            // 鈸
    if (BASS[i]) note(ac, out, N(ROOTS[bar] + BASS_OCT[i]), t, st * 1.6, 'triangle', 0.55);
    if (i === 2 || i === 9) CHORDS[bar].forEach(n => note(ac, out, N(n), t, st * 0.8, 'square', 0.035));
    const m = MELODY[bar][i]; if (m > 0 && (music.hype || bar !== 3 || music.step % 128 >= 64)) note(ac, out, N(m), t, st * 2.2, 'triangle', 0.16);
    music.next += st; music.step++;
  }
}
