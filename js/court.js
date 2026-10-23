// 球場：辦公室頂樓的半場籃球場（木地板＋白線＋白板籃板），後面是落地窗和城市
import * as THREE from 'three';
import { scene, rbox, box, cyl, sphere, mat, canvasTex, roundRect, FONT, labelSprite } from './world.js?v=0.4.2';

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

export function buildCourt() {
  // ---------- 地板 ----------
  const PX = 80, M = 1.2;   // 每單位幾像素、外圍留邊
  const W = (COURT.x * 2 + M * 2), H = (COURT.z1 - COURT.z0 + M * 2);
  const tex = canvasTex(Math.round(W * PX), Math.round(H * PX), (g, w, h) => {
    const X = (x) => (x + COURT.x + M) * PX, Z = (z) => (z - COURT.z0 + M) * PX;
    // 外圍
    g.fillStyle = '#e8794a'; g.fillRect(0, 0, w, h);
    // 木地板：一條一條
    for (let i = 0; i * 0.32 * PX < w; i++) {
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
    g.fillStyle = '#ff7a45'; g.fillRect(X(-1.6), Z(0), 3.2 * PX, 4.6 * PX);
    g.fillStyle = '#ffffff30'; for (let i = 0; i < 6; i++) g.fillRect(X(-1.6), Z(0) + i * 0.8 * PX, 3.2 * PX, 0.4 * PX);
    // 中圈
    g.fillStyle = '#3fa7ff'; g.beginPath(); g.arc(X(0), Z(COURT.z1), 1.6 * PX, 0, Math.PI * 2); g.fill();
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
    g.fillText('上班啟示錄', X(0), Z(COURT.z1 - 0.75));
    // 底線外的字
    g.fillStyle = '#ffffffcc'; g.font = `900 ${0.5 * PX}px ${FONT}`; g.fillText('OFFICE BALL 2v2', X(0), Z(-0.6));
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, (COURT.z0 + COURT.z1) / 2); floor.receiveShadow = true; scene.add(floor);
  // 更外圍的地毯
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(60, 50), mat(0x8fb7d9, { roughness: 0.95 }));
  carpet.rotation.x = -Math.PI / 2; carpet.position.set(0, -0.01, 8); carpet.receiveShadow = true; scene.add(carpet);

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
  const wall = new THREE.Group(); wall.position.set(0, 0, -1.7); scene.add(wall);
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
  const bb = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.12, 0.07), [mat(0x3fa7ff), mat(0x3fa7ff), mat(0x3fa7ff), mat(0x3fa7ff), new THREE.MeshStandardMaterial({ map: board, roughness: 0.3 }), mat(0x3fa7ff)]);
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
    for (let z = 0.5; z < 11; z += 2.6) rbox(0.2, 1.0, 2.4, 0xbfd7ea, x, 0.5, z);
    rbox(0.9, 0.42, 5.8, 0xffcf8a, s * 6.75, 0.21, 6.0);   // 長椅（觀眾站在這）
    const plant = (px, pz) => { cyl(0.28, 0.22, 0.45, 0xff8a5c, px, 0.22, pz); for (let i = 0; i < 5; i++) { const l = sphere(0.28, 0x47b35a, px + Math.cos(i * 1.3) * 0.16, 0.62 + (i % 2) * 0.22, pz + Math.sin(i * 1.3) * 0.16, scene, { roughness: 0.9 }); l.scale.y = 1.25; } };
    plant(s * 7.0, -0.9); plant(s * 7.2, 11.3);
  }
  // 飲水機
  rbox(0.55, 1.0, 0.55, 0xffffff, -7.0, 0.5, 2.0); cyl(0.2, 0.2, 0.55, 0x9fd8ff, -7.0, 1.28, 2.0, scene, { transparent: true, opacity: 0.8 });
  // 販賣機
  const vm = rbox(1.0, 1.9, 0.7, 0xe0413b, 7.1, 0.95, 2.0); vm.rotation.y = -Math.PI / 2;
  box(0.05, 1.1, 0.55, 0xd9f0ff, 6.58, 1.15, 2.0, scene, { roughness: 0.2 });
}

// 籃網刷一下（進球時）
export function swishNet() { C.netT = 0.45; }
export function animateCourt(dt, t) {
  if (C.netT > 0) {
    C.netT = Math.max(0, C.netT - dt); const k = C.netT / 0.45;
    C.net.scale.set(1 - 0.25 * Math.sin(k * Math.PI), 1 + 0.35 * Math.sin(k * Math.PI), 1 - 0.25 * Math.sin(k * Math.PI));
  }
  if (C.rimShake > 0) { C.rimShake = Math.max(0, C.rimShake - dt); C.rimGroup.rotation.x = Math.sin(t * 60) * C.rimShake * 0.25; C.board.position.y = HOOP.y + 0.42 + Math.sin(t * 50) * C.rimShake * 0.06; }
  if (C.clockHand) C.clockHand.rotation.z = -t * 0.5;
}
