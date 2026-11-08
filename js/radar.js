// 選角畫面的六角能力雷達圖（會動）＋能力表數值
// 數值 0～100，來自能力表（2026-11 定稿）。目前只拿來顯示；比賽公式還是用 main.js 的 CHARS，之後套用能力表時改成讀這裡
export const RATINGS = {
  kui:   { spd: 94, sht: 72, inside: 70, three: 72, dunkPick: 5,  dunkMake: 55, handle: 90, stl: 95, blk: 45, reach: 50, contest: 78, reb: 50, str: 45, jump: 72 },
  jie:   { spd: 60, sht: 72, inside: 96, three: 35, dunkPick: 85, dunkMake: 95, handle: 55, stl: 55, blk: 95, reach: 92, contest: 85, reb: 94, str: 95, jump: 85 },
  mi:    { spd: 76, sht: 85, inside: 68, three: 97, dunkPick: 5,  dunkMake: 55, handle: 82, stl: 72, blk: 45, reach: 55, contest: 65, reb: 52, str: 50, jump: 65 },
  vivi:  { spd: 62, sht: 70, inside: 68, three: 72, dunkPick: 10, dunkMake: 65, handle: 70, stl: 55, blk: 42, reach: 55, contest: 60, reb: 55, str: 60, jump: 60 },
  kevin: { spd: 72, sht: 76, inside: 70, three: 74, dunkPick: 10, dunkMake: 62, handle: 74, stl: 70, blk: 70, reach: 65, contest: 97, reb: 60, str: 68, jump: 70 },
  lin:   { spd: 97, sht: 72, inside: 74, three: 70, dunkPick: 5,  dunkMake: 58, handle: 94, stl: 95, blk: 42, reach: 50, contest: 80, reb: 48, str: 42, jump: 75 },
  yuan:  { spd: 60, sht: 70, inside: 96, three: 35, dunkPick: 85, dunkMake: 95, handle: 55, stl: 58, blk: 97, reach: 97, contest: 88, reb: 98, str: 97, jump: 88 },
  hu:    { spd: 78, sht: 87, inside: 72, three: 95, dunkPick: 5,  dunkMake: 58, handle: 86, stl: 70, blk: 48, reach: 55, contest: 66, reb: 55, str: 52, jump: 68 },
  tu:    { spd: 93, sht: 74, inside: 70, three: 78, dunkPick: 5,  dunkMake: 55, handle: 88, stl: 92, blk: 45, reach: 52, contest: 76, reb: 50, str: 45, jump: 80 },
  zhang: { spd: 58, sht: 70, inside: 82, three: 62, dunkPick: 20, dunkMake: 70, handle: 62, stl: 58, blk: 80, reach: 75, contest: 75, reb: 82, str: 90, jump: 70 },
  bian:  { spd: 84, sht: 85, inside: 82, three: 82, dunkPick: 15, dunkMake: 68, handle: 78, stl: 70, blk: 60, reach: 62, contest: 70, reb: 65, str: 72, jump: 74 },
};
// 六軸：防守＝抄截、蓋帽、干擾平均；籃板力氣＝籃板、力氣平均
export const AXES = [['速度', s => s.spd], ['投籃', s => s.sht], ['三分', s => s.three], ['籃下', s => s.inside], ['防守', s => (s.stl + s.blk + s.contest) / 3], ['籃板力氣', s => (s.reb + s.str) / 2]];
export const axesOf = k => AXES.map(([l, f]) => [l, Math.round(f(RATINGS[k]))]);

// 換人：從上一個人的形狀彈性變形過去（第一次從中心長出來），六個頂點依序出發，數字跟著跳
// 平常：形狀輕輕呼吸、一道光繞著轉、90 分以上的頂點發光並往外擴散光圈
// 畫面看不到（切到比賽）就停掉，不佔效能
export function makeRadar(cv) {
  const g = cv.getContext('2d'), W = cv.width, cx = W / 2, cy = W / 2 + W * 0.01, R = W * 0.29, n = AXES.length;
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const DUR = 700, STAG = 60;
  let from = new Array(n).fill(0), to = new Array(n).fill(0), t0 = 0, key = null, running = false;
  const pt = (i, r) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
  const easeBack = x => 1 + 2.5 * Math.pow(x - 1, 3) + 1.5 * Math.pow(x - 1, 2);
  const values = now => to.map((v, i) => {
    const x = still.matches ? 1 : Math.min(1, Math.max(0, (now - t0 - i * STAG) / DUR));
    return { v: from[i] + (v - from[i]) * easeBack(x), done: x >= 1 };
  });
  const hexPath = r => { g.beginPath(); for (let i = 0; i <= n; i++) { const [x, y] = pt(i % n, r); i ? g.lineTo(x, y) : g.moveTo(x, y); } };
  function frame(now) {
    if (document.hidden || !cv.getClientRects().length) { running = false; return; }
    const vs = values(now), t = still.matches ? 0 : now / 1000;
    g.clearRect(0, 0, W, W);
    for (const lv of [0.25, 0.5, 0.75, 1]) { hexPath(R * lv); g.strokeStyle = lv === 1 ? '#efe6d266' : '#efe6d222'; g.lineWidth = 2; g.stroke(); }
    for (let i = 0; i < n; i++) { const [x, y] = pt(i, R); g.beginPath(); g.moveTo(cx, cy); g.lineTo(x, y); g.strokeStyle = '#efe6d222'; g.lineWidth = 1.5; g.stroke(); }
    if (!still.matches && g.createConicGradient) {   // 掃描光
      const grd = g.createConicGradient(t * 1.1 % (Math.PI * 2), cx, cy);
      grd.addColorStop(0, '#ffd23f30'); grd.addColorStop(0.12, '#ffd23f00'); grd.addColorStop(1, '#ffd23f00');
      hexPath(R); g.fillStyle = grd; g.fill();
    }
    const P = vs.map((o, i) => pt(i, R * Math.max(0, o.v) / 100 * (1 + 0.018 * Math.sin(t * 2.4 + i * 1.05))));
    g.beginPath(); P.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath();
    const fill = g.createRadialGradient(cx, cy, 0, cx, cy, R); fill.addColorStop(0, '#ff4d1a22'); fill.addColorStop(1, '#ff4d1a88');
    g.fillStyle = fill; g.fill();
    g.save(); g.shadowColor = '#ff4d1a'; g.shadowBlur = 16 + 7 * Math.sin(t * 2.4); g.strokeStyle = '#ff4d1a'; g.lineWidth = 5; g.lineJoin = 'round'; g.stroke(); g.restore();
    vs.forEach((o, i) => {
      const [x, y] = P[i], hi = to[i] >= 90;
      if (hi && o.done && !still.matches) {
        const p = (t * 0.9 + i * 0.17) % 1;
        g.beginPath(); g.arc(x, y, 9 + p * 24, 0, Math.PI * 2); g.strokeStyle = `rgba(255,210,63,${0.7 * (1 - p)})`; g.lineWidth = 3; g.stroke();
      }
      g.save(); if (hi) { g.shadowColor = '#ffd23f'; g.shadowBlur = 14; }
      g.beginPath(); g.arc(x, y, hi ? 10 : 7, 0, Math.PI * 2); g.fillStyle = hi ? '#ffd23f' : '#efe6d2'; g.fill(); g.restore();
    });
    g.textAlign = 'center'; g.textBaseline = 'middle';
    vs.forEach((o, i) => {
      const [x, y] = pt(i, R + 68), hi = to[i] >= 90, v = Math.round(Math.max(0, Math.min(100, o.v)));
      g.font = '800 34px -apple-system, "PingFang TC", "Noto Sans TC", sans-serif'; g.fillStyle = '#e4d8bd'; g.fillText(AXES[i][0], x, y - 22);
      g.font = '400 46px Anton, Impact, sans-serif'; g.fillStyle = hi ? '#ffd23f' : '#efe6d2';
      if (hi) { g.save(); g.shadowColor = '#ff4d1a'; g.shadowOffsetX = 3; g.shadowOffsetY = 3; g.fillText(v, x, y + 22); g.restore(); } else g.fillText(v, x, y + 22);
    });
    requestAnimationFrame(frame);
  }
  function wake() { if (!running) { running = true; requestAnimationFrame(frame); } }
  document.addEventListener('visibilitychange', wake);
  return {
    // 換成某個角色（同一個人就只確保有在畫）
    show(k) {
      if (k !== key && RATINGS[k]) { const now = performance.now(); from = values(now).map(o => o.v); to = AXES.map(([, f]) => f(RATINGS[k])); t0 = now; key = k; }
      wake();
    },
    wake,
  };
}
