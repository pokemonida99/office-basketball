// 球場：可以選「辦公室頂樓」（木地板＋白板籃板＋落地窗城市）或「大橋尾球場」（廟口球場：綠色水泥地、後面是廟）
// 籃框、籃網兩邊共用；地板、籃板圖案、周圍場景各一組，setCourt() 切換
import * as THREE from 'three';
import { scene, rbox, box, cyl, sphere, mat, canvasTex, roundRect, FONT, labelSprite } from './world.js?v=0.4.3';

// 尺寸（1 單位 ≈ 角色身高的 0.8）
export const COURT = { x: 6, z0: 0, z1: 10.5 };            // x 從 -6 到 6，底線 z=0，半場線 z=10.5
export const HOOP = { x: 0, y: 2.3, z: 1.3, r: 0.3 };      // 籃框中心
export const ARC_R = 4.7, CORNER_X = 4.4;                  // 三分線
export const WALL = { x: 6.7, z0: -0.85, z1: 12 };         // 球碰到會彈回來的邊界
export const TOP = { x: 0, z: 8.2 };                       // 發球點（三分線外弧頂）

export function isThree(x, z) {
  if (Math.abs(x) >= CORNER_X && z <= HOOP.z + Math.sqrt(ARC_R * ARC_R - CORNER_X * CORNER_X)) return true;
  return Math.hypot(x - HOOP.x, z - HOOP.z) > ARC_R;
}
export const hoopDist = (x, z) => Math.hypot(x - HOOP.x, z - HOOP.z);

export const C = {};   // 會動的東西：籃框、籃網、金色大籃框

export const COURTS = { roof: '辦公室頂樓', temple: '大橋尾球場' };
// 地板：P 是配色（頂樓木地板、廟口綠色水泥地）
const FLOOR = {
  roof: { out: '#e8794a', wood: true, key: '#ff7a45', circle: '#3fa7ff', mid: '上班啟示錄', base: 'OFFICE BALL 2v2' },
  temple: { out: '#b65a3c', wood: false, court: '#3f8f62', key: '#c9483c', circle: '#d9a63a', mid: '大橋尾', base: '廟口鬥牛' },
};
function floorTex(P) {
  const PX = 80, M = 1.2;   // 每單位幾像素、外圍留邊
  const W = (COURT.x * 2 + M * 2), H = (COURT.z1 - COURT.z0 + M * 2);
  return canvasTex(Math.round(W * PX), Math.round(H * PX), (g, w, h) => {
    const X = (x) => (x + COURT.x + M) * PX, Z = (z) => (z - COURT.z0 + M) * PX;
    // 外圍
    g.fillStyle = P.out; g.fillRect(0, 0, w, h);
    if (!P.wood) {   // 水泥地：底色＋斑駁
      g.fillStyle = P.court; g.fillRect(X(-COURT.x), Z(COURT.z0), COURT.x * 2 * PX, (COURT.z1 - COURT.z0) * PX);
      for (let i = 0; i < 2600; i++) { g.fillStyle = Math.random() < 0.5 ? '#ffffff10' : '#00000012'; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 6, 2 + Math.random() * 6); }
      for (let i = 0; i < 6; i++) { g.strokeStyle = '#00000018'; g.lineWidth = 2; g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * 90; y += Math.random() * 60; g.lineTo(x, y); } g.stroke(); }   // 裂縫
    }
    for (let i = 0; P.wood && i * 0.32 * PX < w; i++) {
      const x = i * 0.32 * PX;
      g.fillStyle = ['#f4b46c', '#f0aa60', '#f6bb76', '#eea65c'][i % 4];
      g.fillRect(X(-COURT.x) + x - X(-COURT.x) % 1, Z(COURT.z0), 0.32 * PX, (COURT.z1 - COURT.z0) * PX);
      g.fillStyle = '#d98f4a55'; g.fillRect(X(-COURT.x) + x, Z(COURT.z0), 2, (COURT.z1 - COURT.z0) * PX);
      for (let k = 0; k < 5; k++) { g.fillStyle = '#c8803f33'; g.fillRect(X(-COURT.x) + x, Z(COURT.z0) + ((i * 53 + k * 211) % 9) * 0.12 * PX * 10 % ((COURT.z1 - COURT.z0) * PX), 0.32 * PX, 2); }
    }
    g.save(); g.beginPath(); g.rect(X(-COURT.x), Z(COURT.z0), COURT.x * 2 * PX, (COURT.z1 - COURT.z0) * PX); g.clip();
    // 三分線內塗淺一點
    g.fillStyle = '#ffffff22'; g.beginPath(); g.moveTo(X(-CORNER_X), Z(0));
    const zc = HOOP.z + Math.sqrt(ARC_R * ARC_R - CORNER_X * CORNER_X), a0 = Math.atan2(zc - HOOP.z, -CORNER_X);
    g.lineTo(X(-CORNER_X), Z(zc)); g.arc(X(HOOP.x), Z(HOOP.z), ARC_R * PX, a0, Math.atan2(zc - HOOP.z, CORNER_X), true);
    g.lineTo(X(CORNER_X), Z(0)); g.closePath(); g.fill();
    // 禁區
    g.fillStyle = P.key; g.fillRect(X(-1.6), Z(0), 3.2 * PX, 4.6 * PX);
    if (P.wood) { g.fillStyle = '#ffffff30'; for (let i = 0; i < 6; i++) g.fillRect(X(-1.6), Z(0) + i * 0.8 * PX, 3.2 * PX, 0.4 * PX); }
    // 中圈
    g.fillStyle = P.circle; g.beginPath(); g.arc(X(0), Z(COURT.z1), 1.6 * PX, 0, Math.PI * 2); g.fill();
    g.restore();
    // 白線
    g.strokeStyle = '#fff'; g.lineWidth = 0.07 * PX; g.lineJoin = 'round';
    g.strokeRect(X(-COURT.x), Z(COURT.z0), COURT.x * 2 * PX, (COURT.z1 - COURT.z0) * PX);
    g.strokeRect(X(-1.6), Z(0), 3.2 * PX, 4.6 * PX);
    g.beginPath(); g.arc(X(0), Z(4.6), 1.6 * PX, 0, Math.PI); g.stroke();
    g.setLineDash([0.3 * PX, 0.25 * PX]); g.beginPath(); g.arc(X(0), Z(4.6), 1.6 * PX, Math.PI, Math.PI * 2); g.stroke(); g.setLineDash([]);
    g.beginPath(); g.moveTo(X(-CORNER_X), Z(0)); g.lineTo(X(-CORNER_X), Z(zc));
    g.arc(X(HOOP.x), Z(HOOP.z), ARC_R * PX, a0, Math.atan2(zc - HOOP.z, CORNER_X), true); g.lineTo(X(CORNER_X), Z(0)); g.stroke();
    g.beginPath(); g.arc(X(0), Z(HOOP.z), 1.1 * PX, 0, Math.PI); g.stroke();   // 禁區小弧
    g.save(); g.beginPath(); g.rect(X(-COURT.x), Z(COURT.z0), COURT.x * 2 * PX, (COURT.z1 - COURT.z0) * PX); g.clip();
    g.beginPath(); g.arc(X(0), Z(COURT.z1), 1.6 * PX, 0, Math.PI * 2); g.stroke(); g.restore();
    // 中圈字
    g.fillStyle = '#fff'; g.font = `900 ${0.42 * PX}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(P.mid, X(0), Z(COURT.z1 - 0.75));
    // 底線外的字
    g.fillStyle = '#ffffffcc'; g.font = `900 ${0.5 * PX}px ${FONT}`; g.fillText(P.base, X(0), Z(-0.6));
  });
}

export function buildCourt() {
  // ---------- 地板（兩種花色，切換球場時換貼圖） ----------
  const M = 1.2, W = (COURT.x * 2 + M * 2), H = (COURT.z1 - COURT.z0 + M * 2);
  C.floorTex = { roof: floorTex(FLOOR.roof), temple: floorTex(FLOOR.temple) };
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: C.floorTex.roof, roughness: 0.55 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, (COURT.z0 + COURT.z1) / 2); floor.receiveShadow = true; scene.add(floor);
  C.floor = floor;
  C.env = { roof: new THREE.Group(), temple: new THREE.Group() };
  scene.add(C.env.roof, C.env.temple); C.env.temple.visible = false;
  const R = C.env.roof;
  // 更外圍的地毯
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(60, 50), mat(0x8fb7d9, { roughness: 0.95 }));
  carpet.rotation.x = -Math.PI / 2; carpet.position.set(0, -0.01, 8); carpet.receiveShadow = true; R.add(carpet);

  // ---------- 後面的落地窗 ----------
  const city = canvasTex(1024, 384, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#7cc8ff'); sky.addColorStop(1, '#d9f0ff'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffffcc'; for (const [x, y, r] of [[120, 70, 30], [160, 60, 38], [205, 72, 28], [700, 95, 26], [740, 82, 34], [780, 96, 24]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    let x = 0, i = 0; while (x < w) {
      const bw = 50 + (i * 37) % 60, bh = 120 + (i * 71) % 200; g.fillStyle = ['#8ab4dc', '#a3c4e6', '#7aa4cf', '#b5cfe9'][i % 4];
      g.fillRect(x, h - bh, bw, bh); g.fillStyle = '#ffffff66';
      for (let yy = h - bh + 10; yy < h - 10; yy += 18) for (let xx = x + 8; xx < x + bw - 8; xx += 14) g.fillRect(xx, yy, 7, 9);
      x += bw + 6; i++;
    }
    // 101 剪影
    g.fillStyle = '#6f97c4'; const cx = 560; for (let k = 0; k < 8; k++) g.fillRect(cx - 22 + k * 1.5, h - 60 - k * 30, 44 - k * 3, 30); g.fillRect(cx - 3, h - 340, 6, 60);
  });
  const wall = new THREE.Group(); wall.position.set(0, 0, -1.7); R.add(wall);
  box(28, 0.6, 0.4, 0xfff3e0, 0, 0.3, 0, wall);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(28, 6.2), new THREE.MeshBasicMaterial({ map: city, toneMapped: false }));
  glass.position.set(0, 3.7, -0.1); wall.add(glass);
  for (let x = -14; x <= 14; x += 3.5) rbox(0.22, 6.8, 0.3, 0xfff3e0, x, 3.4, 0.05, wall);
  box(28, 0.4, 0.4, 0xfff3e0, 0, 6.9, 0, wall);
  // 牆上的時鐘與標語
  const sign = labelSprite('🏀 午休時間 2v2 鬥牛賽', { bg: '#ff7a45', size: 0.55 }); sign.position.set(-6.2, 5.6, 0.3); wall.add(sign);
  const clock = cyl(0.55, 0.55, 0.1, 0xffffff, 6.4, 5.4, 0.25, wall); clock.rotation.x = Math.PI / 2;
  const hand = box(0.05, 0.38, 0.03, 0x2c3e57, 6.4, 5.4, 0.32, wall); hand.geometry = hand.geometry.clone(); hand.geometry.translate(0, 0.17, 0);
  C.clockHand = hand;

  // ---------- 籃架：柱子＋白板籃板＋橘色籃框 ----------
  const pole = cyl(0.12, 0.14, 3.0, 0x2c3e57, 0, 1.5, -0.55, scene, { metalness: 0.5, roughness: 0.4 });
  rbox(0.9, 0.3, 0.9, 0x2c3e57, 0, 0.15, -0.55);
  box(0.16, 0.16, 1.0, 0x2c3e57, 0, 2.85, -0.1, scene, { metalness: 0.5, roughness: 0.4 });
  const board = canvasTex(512, 300, (g, w, h) => {
    g.fillStyle = '#fbfdff'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#3fa7ff'; g.lineWidth = 18; g.strokeRect(9, 9, w - 18, h - 18);
    g.strokeStyle = '#ff5d3a'; g.lineWidth = 10; g.strokeRect(w / 2 - 70, h - 130, 140, 100);
    // 白板上的塗鴉：KPI 圖表
    g.strokeStyle = '#2c7be0'; g.lineWidth = 5; g.beginPath(); g.moveTo(40, 120); g.lineTo(80, 95); g.lineTo(110, 105); g.lineTo(150, 50); g.stroke();
    g.fillStyle = '#2c7be0'; g.font = `800 32px ${FONT}`; g.fillText('KPI', 40, 60);
    g.fillStyle = '#e0413b'; g.font = `800 26px ${FONT}`; g.fillText('週五交！', 360, 60);
    g.fillStyle = '#36a35d'; g.fillText('✓ 開會', 370, 100);
  });
  // 廟口的籃板：一般白色籃板，上面漆「大橋尾」
  const board2 = canvasTex(512, 300, (g, w, h) => {
    g.fillStyle = '#f6f4ee'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) { g.fillStyle = '#00000008'; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
    g.strokeStyle = '#1d1d1f'; g.lineWidth = 16; g.strokeRect(8, 8, w - 16, h - 16);
    g.strokeStyle = '#c9483c'; g.lineWidth = 10; g.strokeRect(w / 2 - 70, h - 130, 140, 100);
    g.fillStyle = '#c9483c'; g.font = `900 46px ${FONT}`; g.textAlign = 'center'; g.fillText('大橋尾', w / 2, 74);
    g.fillStyle = '#1d1d1f'; g.font = `800 20px ${FONT}`; g.fillText('里民活動中心 敬贈', w / 2, 106);
  });
  C.boardTex = { roof: board, temple: board2 };
  C.boardFace = new THREE.MeshStandardMaterial({ map: board, roughness: 0.3 });
  const bb = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.12, 0.07), [mat(0x3fa7ff), mat(0x3fa7ff), mat(0x3fa7ff), mat(0x3fa7ff), C.boardFace, mat(0x3fa7ff)]);
  bb.position.set(0, HOOP.y + 0.42, HOOP.z - 0.47); bb.castShadow = true; scene.add(bb); C.board = bb;
  // 籃框：一個 group 包住框＋網，金色大籃框時整組放大
  const rg = new THREE.Group(); rg.position.set(HOOP.x, HOOP.y, HOOP.z); scene.add(rg); C.rimGroup = rg;
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xff5d1f, roughness: 0.35, metalness: 0.3 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(HOOP.r, 0.028, 10, 36), rimMat); rim.rotation.x = Math.PI / 2; rim.castShadow = true; rg.add(rim);
  C.rim = rim; C.rimMat = rimMat;
  const neck = box(0.08, 0.05, 0.2, 0xff5d1f, 0, 0, -HOOP.r - 0.08, rg);
  neck.material = rimMat;
  const netTex = canvasTex(256, 128, (g, w, h) => {
    g.strokeStyle = '#ffffff'; g.lineWidth = 5;
    for (let i = -8; i < 16; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + 128, h); g.stroke(); g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 - 128, h); g.stroke(); }
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, 8);
  });
  netTex.wrapS = THREE.RepeatWrapping; netTex.repeat.set(2, 1);
  const net = new THREE.Mesh(new THREE.CylinderGeometry(HOOP.r, HOOP.r * 0.62, 0.48, 20, 4, true), new THREE.MeshStandardMaterial({ map: netTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.8 }));
  net.geometry.translate(0, -0.24, 0); rg.add(net); C.net = net;

  // ---------- 兩旁：隔板、長椅、盆栽、飲水機、販賣機 ----------
  for (const s of [-1, 1]) {
    const x = s * 7.4;
    for (let z = 0.5; z < 11; z += 2.6) rbox(0.2, 1.0, 2.4, 0xbfd7ea, x, 0.5, z, R);
    rbox(0.9, 0.42, 5.8, 0xffcf8a, s * 6.75, 0.21, 6.0, R);   // 長椅（觀眾站在這）
    const plant = (px, pz) => { cyl(0.28, 0.22, 0.45, 0xff8a5c, px, 0.22, pz, R); for (let i = 0; i < 5; i++) { const l = sphere(0.28, 0x47b35a, px + Math.cos(i * 1.3) * 0.16, 0.62 + (i % 2) * 0.22, pz + Math.sin(i * 1.3) * 0.16, R, { roughness: 0.9 }); l.scale.y = 1.25; } };
    plant(s * 7.0, -0.9); plant(s * 7.2, 11.3);
  }
  // 飲水機
  rbox(0.55, 1.0, 0.55, 0xffffff, -7.0, 0.5, 2.0, R); cyl(0.2, 0.2, 0.55, 0x9fd8ff, -7.0, 1.28, 2.0, R, { transparent: true, opacity: 0.8 });
  // 販賣機
  const vm = rbox(1.0, 1.9, 0.7, 0xe0413b, 7.1, 0.95, 2.0, R); vm.rotation.y = -Math.PI / 2;
  box(0.05, 1.1, 0.55, 0xd9f0ff, 6.58, 1.15, 2.0, R, { roughness: 0.2 });

  buildTemple(C.env.temple);
}

// 切換球場：周圍場景、地板花色、籃板圖案、天空顏色
const SKY = { roof: 0xbfe6ff, temple: 0xf6b98a };
export function setCourt(name) {
  if (!C.env || !C.env[name]) name = 'roof';
  for (const k in C.env) C.env[k].visible = k === name;
  C.floor.material.map = C.floorTex[name]; C.floor.material.needsUpdate = true;
  C.boardFace.map = C.boardTex[name]; C.boardFace.needsUpdate = true;
  scene.background.setHex(SKY[name]); scene.fog.color.setHex(SKY[name]);
  C.court = name;
}

// ---------- 大橋尾球場（廟口球場） ----------
// 籃框後面是一間廟（紅柱、彩繪樑、燕尾脊、雙龍搶珠），廟埕有香爐和石獅；兩旁長椅、紅燈籠、大榕樹、機車、小吃攤；天空是傍晚
function buildTemple(T) {
  const add = (m) => (T.add(m), m);
  // 廟埕水泥地
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(70, 60), new THREE.MeshStandardMaterial({ map: canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#b8b0a3'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) { g.fillStyle = Math.random() < 0.5 ? '#ffffff14' : '#00000014'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    g.strokeStyle = '#00000022'; g.lineWidth = 2; for (let x = 0; x < w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  }), roughness: 0.95 }));
  plaza.material.map.wrapS = plaza.material.map.wrapT = THREE.RepeatWrapping; plaza.material.map.repeat.set(8, 7);
  plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, -0.01, 6); plaza.receiveShadow = true; add(plaza);

  // 遠景：傍晚天空、低矮透天厝、遠山、電線杆
  const back = new THREE.Mesh(new THREE.PlaneGeometry(90, 30), new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(1024, 340, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#6f8fd6'); sky.addColorStop(0.45, '#f4a98a'); sky.addColorStop(1, '#ffd9a0'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff2c8'; g.beginPath(); g.arc(w * 0.78, h * 0.62, 26, 0, 7); g.fill();   // 夕陽
    g.fillStyle = '#9a7fa8'; g.beginPath(); g.moveTo(0, h * 0.7); for (let x = 0; x <= w; x += 32) g.lineTo(x, h * 0.62 - Math.sin(x * 0.006) * 34 - Math.sin(x * 0.019) * 10); g.lineTo(w, h); g.lineTo(0, h); g.fill();   // 遠山
    let x = 0, i = 0; while (x < w) {   // 透天厝
      const bw = 40 + (i * 29) % 46, bh = 50 + (i * 53) % 70; g.fillStyle = ['#8a6f7c', '#7d6a80', '#94788a', '#6f6378'][i % 4]; g.fillRect(x, h - bh, bw, bh);
      g.fillStyle = '#ffd98a'; for (let yy = h - bh + 10; yy < h - 8; yy += 16) for (let xx = x + 6; xx < x + bw - 8; xx += 13) if ((xx * 7 + yy * 3 + i) % 5 < 2) g.fillRect(xx, yy, 6, 7);
      g.fillStyle = '#5d5068'; g.fillRect(x + bw - 10, h - bh - 12, 8, 12);   // 頂樓水塔
      x += bw + 2; i++;
    }
    g.strokeStyle = '#3d3445'; g.lineWidth = 2; for (const px of [140, 520, 880]) { g.fillStyle = '#3d3445'; g.fillRect(px, h * 0.35, 5, h); }
    g.beginPath(); g.moveTo(0, h * 0.42); g.quadraticCurveTo(330, h * 0.5, 520, h * 0.38); g.quadraticCurveTo(700, h * 0.47, w, h * 0.4); g.stroke();   // 電線
  }) }));
  back.position.set(0, 9, -24); add(back);
  for (const s of [-1, 1]) { const side = back.clone(); side.position.set(s * 30, 9, -4); side.rotation.y = -s * Math.PI / 2; add(side); }

  // ---------- 廟 ----------
  const RED = 0xb3261e, GOLD = 0xd9a63a, STONE = 0xc9c2b4, ZF = -6.2;   // ZF：廟的正面
  const temple = new THREE.Group(); add(temple);
  box(15, 0.6, 6.5, STONE, 0, 0.3, ZF - 3.0, temple);   // 台基
  for (let i = 0; i < 3; i++) box(5.2 - i * 0.4, 0.2, 0.5, STONE, 0, 0.1 + i * 0.2, ZF + 0.9 - i * 0.45, temple);   // 台階
  // 正面牆：三川門、門神、龍虎窗
  const facade = canvasTex(1024, 300, (g, w, h) => {
    g.fillStyle = '#8f2a1f'; g.fillRect(0, 0, w, h);
    const door = (cx, dw, gods) => {
      g.fillStyle = '#c0392b'; g.fillRect(cx - dw / 2, 40, dw, h - 40);
      g.strokeStyle = '#e8b84a'; g.lineWidth = 6; g.strokeRect(cx - dw / 2, 40, dw, h - 40); g.beginPath(); g.moveTo(cx, 40); g.lineTo(cx, h); g.stroke();
      for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) { g.fillStyle = '#e8b84a'; g.beginPath(); g.arc(cx - dw / 2 + 14 + c * (dw / 2 - 28) / 5 + (c >= 3 ? 0 : 0), 70 + r * 55, 4, 0, 7); g.fill(); }   // 門釘
      if (gods) for (const sx of [-1, 1]) {   // 門神：簡化的彩色人形
        const gx = cx + sx * dw / 4;
        g.fillStyle = '#2f6fb3'; g.fillRect(gx - 26, 120, 52, 120); g.fillStyle = '#e8b84a'; g.fillRect(gx - 30, 150, 60, 14);
        g.fillStyle = '#f1c9a5'; g.beginPath(); g.arc(gx, 100, 20, 0, 7); g.fill(); g.fillStyle = '#1d1d1f'; g.fillRect(gx - 22, 76, 44, 12);
        g.fillStyle = '#1d1d1f'; g.fillRect(gx - 12, 108, 24, 18);   // 鬍子
      }
    };
    door(w / 2, 300, true); door(w * 0.2, 160, false); door(w * 0.8, 160, false);
    for (const cx of [w * 0.07, w * 0.93]) { g.fillStyle = '#d9a63a'; g.beginPath(); g.arc(cx, 130, 44, 0, 7); g.fill(); g.strokeStyle = '#8f2a1f'; g.lineWidth = 6; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(cx + k * 16, 92); g.lineTo(cx + k * 16, 168); g.stroke(); } }   // 圓窗
  });
  const fw = box(14, 3.3, 0.3, 0xffffff, 0, 0.6 + 1.65, ZF - 1.4, temple); fw.material = new THREE.MeshStandardMaterial({ map: facade, roughness: 0.7 });
  // 紅柱（龍柱位置用金色纏繞帶表示）
  for (const x of [-6.2, -3.6, -1.2, 1.2, 3.6, 6.2]) {
    cyl(0.24, 0.26, 3.4, RED, x, 0.6 + 1.7, ZF - 0.2, temple);
    cyl(0.34, 0.34, 0.25, STONE, x, 0.72, ZF - 0.2, temple);
    if (Math.abs(x) < 2) for (let k = 0; k < 5; k++) { const b = cyl(0.27, 0.27, 0.12, GOLD, x, 1.3 + k * 0.55, ZF - 0.2, temple, { metalness: 0.5, roughness: 0.4 }); b.rotation.z = 0.25; }
  }
  // 彩繪樑
  const beamTex = canvasTex(1024, 64, (g, w, h) => {
    g.fillStyle = '#1f5e7a'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 128) { g.fillStyle = '#2e8b57'; g.fillRect(x + 8, 8, 112, h - 16); g.fillStyle = '#e8b84a'; g.beginPath(); g.ellipse(x + 64, h / 2, 40, 16, 0, 0, 7); g.fill(); g.fillStyle = '#c0392b'; g.beginPath(); g.arc(x + 64, h / 2, 9, 0, 7); g.fill(); }
    g.fillStyle = '#e8b84a'; g.fillRect(0, 0, w, 5); g.fillRect(0, h - 5, w, 5);
  });
  const beam = box(14.4, 0.55, 0.7, 0xffffff, 0, 4.3, ZF - 0.2, temple); beam.material = new THREE.MeshStandardMaterial({ map: beamTex, roughness: 0.6 });
  // 匾額
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.75), new THREE.MeshStandardMaterial({ roughness: 0.5, map: canvasTex(512, 148, (g, w, h) => {
    g.fillStyle = '#1d1d1f'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e8b84a'; g.lineWidth = 12; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#e8b84a'; g.font = `900 78px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('福德宮', w / 2, h / 2 + 4);
  }) }));
  plaque.position.set(0, 3.55, ZF - 1.2); temple.add(plaque);
  // 屋頂：兩層（重簷），屋簷兩端微微翹起；橘色琉璃瓦
  const tileTex = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#d9772e'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 16) { g.fillStyle = '#b85f20'; g.fillRect(x, 0, 5, h); g.fillStyle = '#f0a050'; g.fillRect(x + 7, 0, 3, h); } });
  tileTex.wrapS = THREE.RepeatWrapping; tileTex.repeat.set(10, 1);
  const tileMat = new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.55, side: THREE.DoubleSide });
  const roof = (y, wid, dep, rise, zc) => {
    // 前後兩片斜屋面，用彎曲的平面（兩端翹）
    for (const s of [-1, 1]) {
      const g = new THREE.PlaneGeometry(wid, Math.hypot(dep / 2, rise), 24, 1), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), u = Math.abs(x) / (wid / 2); p.setZ(i, Math.pow(u, 4) * 0.55 * (p.getY(i) < 0 ? 1 : 0.3)); }
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, tileMat); m.castShadow = true;
      m.position.set(0, y + rise / 2, zc + s * dep / 4); m.rotation.x = -s * (Math.PI / 2 - Math.atan2(dep / 2, rise)); if (s < 0) m.rotation.y = Math.PI;
      temple.add(m);
    }
  };
  roof(4.55, 15.6, 5.4, 1.3, ZF - 1.6);
  box(9.5, 0.8, 3.0, 0x8f2a1f, 0, 6.2, ZF - 1.9, temple);   // 上層的牆
  roof(6.55, 11.2, 4.4, 1.2, ZF - 1.9);
  // 燕尾脊：正脊兩端往上翹、分叉；脊上剪黏（彩色小塊）、中間雙龍搶珠
  const ridge = (y, half, zc) => {
    const pts = [V3(-half - 0.9, y + 1.1, zc), V3(-half - 0.4, y + 0.35, zc), V3(-half * 0.5, y, zc), V3(half * 0.5, y, zc), V3(half + 0.4, y + 0.35, zc), V3(half + 0.9, y + 1.1, zc)];
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.16, 8), mat(0x2b6e6a, { roughness: 0.5 })); tube.castShadow = true; temple.add(tube);
    for (const s of [-1, 1]) {   // 分叉的燕尾
      const fork = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(s * (half + 0.4), y + 0.35, zc), V3(s * (half + 0.75), y + 0.7, zc + 0.25), V3(s * (half + 1.1), y + 1.0, zc + 0.45)]), 16, 0.09, 6), mat(0x2b6e6a)); temple.add(fork);
    }
    const cols = [0xe0413b, 0x36b37e, 0x3f7fd9, 0xffd34d, 0xff8ac0];
    for (let x = -half * 0.9; x <= half * 0.9; x += 0.45) box(0.18, 0.14, 0.2, cols[Math.floor((x + half) * 3) % cols.length], x, y + 0.22, zc, temple);
  };
  ridge(5.95, 6.6, ZF - 1.6); ridge(7.85, 4.6, ZF - 1.9);
  // 雙龍搶珠（屋頂正中間）：火珠＋兩條彎曲的龍
  sphere(0.32, 0xff5d3a, 0, 8.55, ZF - 1.9, temple, { emissive: 0xff3b1f, emissiveIntensity: 0.6 });
  for (const s of [-1, 1]) {
    const pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push(V3(s * (0.5 + u * 2.6), 8.15 + Math.sin(u * Math.PI * 2) * 0.28 + u * 0.1, ZF - 1.9)); }
    const dragon = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.12, 8), mat(0x2e9b5a, { roughness: 0.45 })); temple.add(dragon);
    sphere(0.2, 0xffd34d, s * 0.55, 8.2, ZF - 1.9, temple);   // 龍頭
    for (let k = 0; k < 4; k++) box(0.06, 0.18, 0.06, 0xffd34d, s * (0.9 + k * 0.6), 8.38 + Math.sin(k * 1.6) * 0.2, ZF - 1.9, temple);   // 龍鰭
  }
  // 石獅
  for (const s of [-1, 1]) {
    const x = s * 2.9, z = ZF + 0.5;
    box(0.8, 0.5, 0.8, STONE, x, 0.25, z, temple);
    const body = sphere(0.38, 0x9f978b, x, 0.85, z - 0.05, temple); body.scale.set(1, 1.15, 1.1);
    sphere(0.3, 0x9f978b, x, 1.38, z + 0.12, temple); sphere(0.12, 0x9f978b, x + s * 0.0, 1.3, z + 0.38, temple);
    for (let k = 0; k < 6; k++) sphere(0.09, 0x8a8377, x + Math.cos(k) * 0.26, 1.5 + Math.sin(k) * 0.12, z + 0.02, temple);   // 鬃毛捲
  }
  // 香爐（廟埕正中間，冒煙）
  const urn = new THREE.Group(); urn.position.set(-3.6, 0, -3.6); add(urn);
  box(1.3, 0.35, 1.3, STONE, 0, 0.17, 0, urn);
  cyl(0.62, 0.5, 0.7, 0x5a4632, 0, 0.75, 0, urn, { metalness: 0.4, roughness: 0.5 });
  cyl(0.7, 0.7, 0.08, 0x6b5440, 0, 1.12, 0, urn, { metalness: 0.4, roughness: 0.5 });
  for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; cyl(0.06, 0.06, 0.5, 0x5a4632, Math.cos(a) * 0.4, 0.25, Math.sin(a) * 0.4, urn); }
  for (let k = 0; k < 7; k++) cyl(0.012, 0.012, 0.5, 0xd94a3a, (Math.random() - 0.5) * 0.5, 1.35, (Math.random() - 0.5) * 0.5, urn);   // 香
  C.smoke = []; const smokeMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee, transparent: true, opacity: 0.35, depthWrite: false });
  for (let k = 0; k < 10; k++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), smokeMat.clone()); p.userData.ph = k / 10; urn.add(p); C.smoke.push(p); }

  // ---------- 球場兩旁：石長椅（觀眾站這）、燈籠、大榕樹、機車、小吃攤 ----------
  for (const s of [-1, 1]) rbox(0.9, 0.42, 5.8, 0xa9a39a, s * 6.75, 0.21, 6.0, T);
  // 紅燈籠：沿著兩邊的竹竿掛一排，廟前再橫掛一排
  const lantern = (x, y, z) => {
    const l = sphere(0.24, 0xe0312b, x, y, z, T, { emissive: 0xff3b1f, emissiveIntensity: 0.55, roughness: 0.5 }); l.scale.y = 0.85;
    cyl(0.12, 0.12, 0.06, GOLD, x, y + 0.22, z, T); cyl(0.12, 0.12, 0.06, GOLD, x, y - 0.22, z, T);
    C.lanterns.push(l);
  };
  C.lanterns = [];
  for (const s of [-1, 1]) {
    for (const z of [-0.6, 5.2, 11]) cyl(0.06, 0.06, 4.6, 0x7a5a3a, s * 7.6, 2.3, z, T);
    for (let z = -0.4; z <= 10.8; z += 1.15) lantern(s * 7.6, 3.85 - Math.sin((z + 0.6) / 5.8 * Math.PI % Math.PI) * 0.35, z);
  }
  for (let x = -6.4; x <= 6.4; x += 1.1) lantern(x, 4.9 - Math.cos(x / 6.4 * Math.PI / 2) * 0.4, ZF + 1.2);
  // 大榕樹（左後方）
  const tree = new THREE.Group(); tree.position.set(-9.6, 0, 1.0); add(tree);
  cyl(0.65, 0.95, 3.6, 0x6b4a2f, 0, 1.8, 0, tree, { roughness: 0.95 });
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; const r = cyl(0.03, 0.03, 2.6, 0x7a5a3a, Math.cos(a) * 1.6, 2.1, Math.sin(a) * 1.4, tree); }   // 氣根
  for (const [x, y, z, r] of [[0, 4.6, 0, 2.2], [1.6, 4.2, 0.8, 1.7], [-1.4, 4.3, -0.6, 1.8], [0.6, 5.5, -0.8, 1.6], [-0.4, 5.3, 1.2, 1.5], [2.6, 3.8, -0.6, 1.3]]) { const c = sphere(r, 0x3e7d3a, x, y, z, tree, { roughness: 0.95 }); c.scale.y = 0.75; }
  // 機車（右邊排一排）
  const scooter = (x, z, col, rot) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; add(g);
    rbox(0.42, 0.42, 1.2, col, 0, 0.5, 0, g); rbox(0.36, 0.18, 0.55, 0x1d1d1f, 0, 0.8, -0.15, g);
    box(0.08, 0.7, 0.08, 0x666666, 0, 0.95, 0.55, g); box(0.6, 0.06, 0.06, 0x333333, 0, 1.3, 0.55, g);
    for (const zz of [-0.5, 0.55]) { const w = cyl(0.2, 0.2, 0.12, 0x1d1d1f, 0, 0.2, zz, g); w.rotation.z = Math.PI / 2; }
  };
  [[8.6, 1.5, 0xe0e4ea], [8.7, 2.7, 0x3f7fd9], [8.6, 3.9, 0xe0413b], [8.8, 5.1, 0xf0f0f0], [8.6, 9.4, 0x36b37e]].forEach(([x, z, c], i) => scooter(x, z, c, Math.PI / 2 + (i % 2 ? 0.15 : -0.1)));
  // 小吃攤（右後方）：紅色遮陽棚＋招牌
  const stall = new THREE.Group(); stall.position.set(7.4, 0, -3.4); stall.rotation.y = -0.5; add(stall);
  rbox(2.4, 0.95, 1.0, 0xd9d2c6, 0, 0.48, 0, stall); box(2.7, 0.08, 1.5, 0xe0413b, 0, 2.2, 0.2, stall);
  for (const x of [-1.2, 1.2]) box(0.06, 2.2, 0.06, 0x999999, x, 1.1, 0.8, stall);
  const sign = labelSprite('廟口香腸・烤玉米', { bg: '#e0413b', size: 0.38 }); sign.position.set(0, 2.55, 0.4); stall.add(sign);
  const courtSign = labelSprite('🏀 大橋尾球場', { bg: '#2c3e57', size: 0.5 }); courtSign.position.set(-6.0, 5.6, ZF + 1.2); add(courtSign);
}
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// 籃網刷一下（進球時）
export function swishNet() { C.netT = 0.45; }
export function animateCourt(dt, t) {
  if (C.netT > 0) {
    C.netT = Math.max(0, C.netT - dt); const k = C.netT / 0.45;
    C.net.scale.set(1 - 0.25 * Math.sin(k * Math.PI), 1 + 0.35 * Math.sin(k * Math.PI), 1 - 0.25 * Math.sin(k * Math.PI));
  }
  if (C.rimShake > 0) { C.rimShake = Math.max(0, C.rimShake - dt); C.rimGroup.rotation.x = Math.sin(t * 60) * C.rimShake * 0.25; C.board.position.y = HOOP.y + 0.42 + Math.sin(t * 50) * C.rimShake * 0.06; }
  if (C.clockHand) C.clockHand.rotation.z = -t * 0.5;
  if (C.court === 'temple') {
    for (const p of C.smoke) { const k = (t * 0.25 + p.userData.ph) % 1; p.position.set(Math.sin(k * 7 + p.userData.ph * 9) * 0.25 * k, 1.5 + k * 3.2, Math.cos(k * 5) * 0.2 * k); p.scale.setScalar(0.5 + k * 1.8); p.material.opacity = 0.32 * (1 - k); }   // 香爐的煙
    for (let i = 0; i < C.lanterns.length; i++) C.lanterns[i].rotation.z = Math.sin(t * 1.3 + i) * 0.08;   // 燈籠微微晃
  }
}
