// 球場：可以選「辦公室頂樓」（木地板＋白板籃板＋落地窗城市）或「大橋尾球場」（廟口球場：綠色水泥地、後面是廟）
// 籃框、籃網兩邊共用；地板、籃板圖案、周圍場景各一組，setCourt() 切換
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { scene, sun, rbox, box, cyl, sphere, mat, canvasTex, roundRect, FONT, labelSprite } from './world.js?v=0.9.1';

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
  temple: { out: '#a64a30', wood: false, paver: true, court: '#47746f', key: '#2a4f7d', circle: '#2a4f7d', mid: '大橋尾', base: '廟口鬥牛' },
};
function floorTex(P) {
  const PX = 80, M = 1.2;   // 每單位幾像素、外圍留邊
  const W = (COURT.x * 2 + M * 2), H = (COURT.z1 - COURT.z0 + M * 2);
  return canvasTex(Math.round(W * PX), Math.round(H * PX), (g, w, h) => {
    const X = (x) => (x + COURT.x + M) * PX, Z = (z) => (z - COURT.z0 + M) * PX;
    // 外圍
    g.fillStyle = P.out; g.fillRect(0, 0, w, h);
    if (P.paver) {   // 廟埕地面：紅磚，球場邊一圈淺色石條
      const bw = 0.42 * PX, bh = 0.21 * PX;
      for (let r = 0; r * bh < h; r++) for (let c = -1; c * bw < w; c++) {
        g.fillStyle = ['#a64a30', '#b5563a', '#9a432b', '#ad5035'][(r * 7 + c * 3) & 3];
        g.fillRect(c * bw + (r % 2) * bw / 2 + 1, r * bh + 1, bw - 2, bh - 2);
      }
      g.fillStyle = '#d8cfbd'; g.fillRect(X(-COURT.x) - 0.2 * PX, Z(COURT.z0) - 0.2 * PX, (COURT.x * 2 + 0.4) * PX, (COURT.z1 - COURT.z0 + 0.4) * PX);
    }
    if (!P.wood) {   // 水泥地：底色＋斑駁
      g.fillStyle = P.court; g.fillRect(X(-COURT.x), Z(COURT.z0), COURT.x * 2 * PX, (COURT.z1 - COURT.z0) * PX);
      for (let i = 0; i < 2600; i++) { g.fillStyle = Math.random() < 0.5 ? '#ffffff10' : '#00000012'; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 6, 2 + Math.random() * 6); }
      if (P.paver) {   // 互鎖地磚：一格一格的細縫
        g.strokeStyle = '#00000020'; g.lineWidth = 1.5; const t = 0.3 * PX;
        for (let r = 0; r * t < (COURT.z1 - COURT.z0) * PX; r++) for (let c = 0; c * t < COURT.x * 2 * PX; c++) {
          g.fillStyle = ((r * 5 + c * 3) % 7) < 2 ? '#ffffff0c' : '#00000008';
          const px = X(-COURT.x) + c * t + (r % 2) * t / 2, py = Z(COURT.z0) + r * t;
          g.fillRect(px, py, t, t); g.strokeRect(px, py, t, t);
        }
      }
      for (let i = 0; !P.paver && i < 6; i++) { g.strokeStyle = '#00000018'; g.lineWidth = 2; g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * 90; y += Math.random() * 60; g.lineTo(x, y); } g.stroke(); }   // 裂縫
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
    if (P.paver) { g.beginPath(); g.arc(X(0), Z(4.6), 1.6 * PX, 0, Math.PI); g.fill(); }   // 深藍色延伸到罰球圈
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
  // 地板光影（Blender 烘的，見 tools/blender/court_art.py）：地板顏色乘上圖的兩倍，128＝不變。角色的即時影子照常疊在上面
  const lightU = { value: new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1) }; lightU.value.needsUpdate = true;
  C.floorLight = lightU; C.lightTex = {};
  floor.material.onBeforeCompile = (sh) => {
    sh.uniforms.uFloorLight = lightU;
    sh.fragmentShader = 'uniform sampler2D uFloorLight;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n  diffuseColor.rgb *= texture2D(uFloorLight, vMapUv).rgb * 2.0;');
  };
  const loader = new THREE.TextureLoader();
  for (const k of ['roof', 'temple']) loader.load(`art/court/${k}_light.webp?v=0.9.1`, (t) => { t.anisotropy = 4; C.lightTex[k] = t; if (C.court === k) lightU.value = t; });
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
  // 窗外是 Blender 算的黃昏城市；圖還沒載到前先用上面畫的
  loader.load('art/court/roof_city.webp?v=0.9.1', (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; glass.material.map = t; glass.material.needsUpdate = true; });
  // 從窗戶斜射進來的光束：幾片很淡的發光面，方向和地板上的窗框影子一樣
  const beam = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  for (let x = -12.25; x <= 12.25; x += 3.5) {
    const g = new THREE.BufferGeometry(), hw = 1.55, top = 6.6, dx = 3.9, dz = 11.6;
    g.setAttribute('position', new THREE.Float32BufferAttribute([x - hw, top, -1.6, x + hw, top, -1.6, x + hw + dx, 0.02, dz - 1.6, x - hw + dx, 0.02, dz - 1.6], 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute([1, 0.78, 0.5, 1, 0.78, 0.5, 0, 0, 0, 0, 0, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const m = new THREE.Mesh(g, beam); m.renderOrder = 5; R.add(m);
  }
  for (let x = -14; x <= 14; x += 3.5) rbox(0.22, 6.8, 0.3, 0xfff3e0, x, 3.4, 0.05, wall);
  box(28, 0.4, 0.4, 0xfff3e0, 0, 6.9, 0, wall);
  // 牆上的時鐘與標語
  const sign = labelSprite('🏀 頂樓鬥牛賽', { bg: '#ff7a45', size: 0.55 }); sign.position.set(-6.2, 5.6, 0.3); wall.add(sign);
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
    g.clearRect(0, 0, w, h); g.fillStyle = '#dcebf566'; g.fillRect(0, 0, w, h);
    const sh = g.createLinearGradient(0, 0, w, h); sh.addColorStop(0.3, '#ffffff00'); sh.addColorStop(0.45, '#ffffff55'); sh.addColorStop(0.55, '#ffffff00'); g.fillStyle = sh; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#f4f7fa'; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14);
    g.lineWidth = 9; g.strokeRect(w / 2 - 70, h - 130, 140, 100);
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
const SKY = { roof: 0xf4c9a4, temple: 0xa4d2f6 };
// 太陽：頂樓從窗外斜射（角色的影子和地板的窗框影子同方向），大橋尾是白天，太陽高、偏左前方
const SUN = { roof: { color: 0xffdcb4, pos: [-3.5, 15, -7] }, temple: { color: 0xfff4e2, pos: [-5.5, 16, 9] } };
export function setCourt(name) {
  if (!C.env || !C.env[name]) name = 'roof';
  for (const k in C.env) C.env[k].visible = k === name;
  C.floor.material.map = C.floorTex[name]; C.floor.material.needsUpdate = true;
  C.boardFace.map = C.boardTex[name]; C.boardFace.needsUpdate = true;
  // 大橋尾是玻璃籃板：看得到後面的廟
  const glassy = name === 'temple';
  C.boardFace.transparent = glassy; C.boardFace.depthWrite = !glassy;
  C.board.material.forEach((m, i) => { if (m === C.boardFace) return; m.color.setHex(glassy ? 0x2a3b52 : 0x3fa7ff); if (i === 5) { m.transparent = glassy; m.opacity = glassy ? 0.12 : 1; m.depthWrite = !glassy; m.needsUpdate = true; } });
  scene.background.setHex(SKY[name]); scene.fog.color.setHex(SKY[name]);
  sun.color.setHex(SUN[name].color); sun.position.set(...SUN[name].pos);
  C.floorLight.value = C.lightTex[name] || C.floorLight.value;
  C.court = name;
}

// ---------- 大橋尾球場（廟口球場） ----------
// 籃框後面是一間廟（紅柱、彩繪樑、燕尾脊、雙龍搶珠），廟埕有香爐和石獅；兩旁長椅、紅燈籠、大榕樹、機車、小吃攤；天空是傍晚
function buildTemple(T) {
  const add = (m) => (T.add(m), m);
  // 廟埕：紅磚地
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(70, 60), new THREE.MeshStandardMaterial({ map: canvasTex(512, 512, (g, w, h) => {
    const bw = 64, bh = 32;
    for (let r = 0; r * bh < h; r++) for (let c = -1; c * bw < w; c++) { g.fillStyle = ['#a64a30', '#b5563a', '#9a432b', '#ad5035'][(r * 7 + c * 3) & 3]; g.fillRect(c * bw + (r % 2) * bw / 2 + 1, r * bh + 1, bw - 2, bh - 2); }
  }), roughness: 0.9 }));
  plaza.material.map.wrapS = plaza.material.map.wrapT = THREE.RepeatWrapping; plaza.material.map.repeat.set(26, 22);
  plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, -0.01, 6); plaza.receiveShadow = true; add(plaza);

  // 遠景：Blender 算的藍天白雲和遠方樹林（tools/blender/court_art.py）
  const back = new THREE.Mesh(new THREE.PlaneGeometry(90, 30), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
  new THREE.TextureLoader().load('art/court/temple_sky.webp?v=0.9.1', (t) => { t.colorSpace = THREE.SRGBColorSpace; back.material.map = t; back.material.needsUpdate = true; });
  back.position.set(0, 12, -24); add(back);
  for (const s of [-1, 1]) { const side = back.clone(); side.position.set(s * 30, 12, -4); side.rotation.y = -s * Math.PI / 2; add(side); }

  // ---------- 廟 ----------
  const RED = 0xb3261e, GOLD = 0xd9a63a, STONE = 0xc9c2b4, ZF = -6.2;   // ZF：廟的正面
  const temple = new THREE.Group(); add(temple);
  box(15, 0.6, 6.5, STONE, 0, 0.3, ZF - 3.0, temple);   // 台基
  for (let i = 0; i < 3; i++) box(5.2 - i * 0.4, 0.2, 0.5, STONE, 0, 0.1 + i * 0.2, ZF + 0.9 - i * 0.45, temple);   // 台階
  // 正面牆：三川門、門神、龍虎窗
  const facade = canvasTex(1024, 300, (g, w, h) => {
    for (let r = 0; r * 12 < h; r++) for (let c = -1; c * 28 < w; c++) { g.fillStyle = ['#a84a32', '#b5553a', '#9c432c'][(r * 5 + c * 2) % 3 & 3] || '#a84a32'; g.fillRect(c * 28 + (r % 2) * 14 + 1, r * 12 + 1, 26, 10); }
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
  const tileTex = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#c9592f'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 16) { g.fillStyle = '#a84522'; g.fillRect(x, 0, 5, h); g.fillStyle = '#f0a050'; g.fillRect(x + 7, 0, 3, h); } });
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
  box(9.5, 0.8, 3.0, 0xa84a32, 0, 6.2, ZF - 1.9, temple);   // 上層的牆
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

  // ---------- 球場四周：石長椅（觀眾站這）、磚牆、涼亭、石欄杆、路燈、盆栽、大樹 ----------
  for (const s of [-1, 1]) rbox(0.9, 0.42, 5.8, 0xa9a39a, s * 6.75, 0.21, 6.0, T);
  // 屋簷下的紅燈籠
  const lantern = (x, y, z) => {
    const l = sphere(0.24, 0xe0312b, x, y, z, T, { emissive: 0xff3b1f, emissiveIntensity: 0.4, roughness: 0.5 }); l.scale.y = 0.85;
    cyl(0.12, 0.12, 0.06, GOLD, x, y + 0.22, z, T); cyl(0.12, 0.12, 0.06, GOLD, x, y - 0.22, z, T);
    C.lanterns.push(l);
  };
  C.lanterns = [];
  for (const x of [-4.9, -2.4, 2.4, 4.9]) lantern(x, 3.55, ZF + 0.05);
  // 紅磚牆＋瓦頂
  const brick = canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#d8cfc0'; g.fillRect(0, 0, w, h);
    for (let r = 0; r * 16 < h; r++) for (let c = -1; c * 32 < w; c++) { g.fillStyle = ['#a84a32', '#b5553a', '#9c432c', '#ae5036'][(r * 3 + c * 5) & 3]; g.fillRect(c * 32 + (r % 2) * 16 + 1, r * 16 + 1, 30, 14); }
  });
  brick.wrapS = brick.wrapT = THREE.RepeatWrapping; brick.repeat.set(9, 2);
  const brickMat = new THREE.MeshStandardMaterial({ map: brick, roughness: 0.9 });
  const wallSeg = (w, d, x, z) => {
    const m = box(w, 2.3, d, 0xffffff, x, 1.15, z, T); m.material = brickMat; m.castShadow = true; m.receiveShadow = true;
    box(w + 0.4, 0.14, d + 0.4, 0x8d8579, x, 2.36, z, T);
    const cap = rbox(w + 0.5, 0.2, d + 0.5, 0xc9592f, x, 2.52, z, T); cap.castShadow = true;
    box(w, 0.3, d + 0.06, 0xb8b0a2, x, 0.15, z, T);
  };
  for (const s of [-1, 1]) { wallSeg(0.35, 16.5, s * 10, 3.6); wallSeg(4.4, 0.35, s * 12, -4.6); }
  // 涼亭（左後方）：紅柱＋重簷＋寶頂
  const pav = new THREE.Group(); pav.position.set(-8.3, 0, -3.2); add(pav);
  box(2.6, 0.25, 2.6, STONE, 0, 0.12, 0, pav);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(0.09, 0.1, 2.2, RED, x, 1.3, z, pav);
  box(2.5, 0.18, 2.5, 0x1f5e7a, 0, 2.45, 0, pav); box(2.54, 0.06, 2.54, GOLD, 0, 2.35, 0, pav);
  const pavRoof = (y, r, h) => { const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 4), new THREE.MeshStandardMaterial({ color: 0xc9592f, roughness: 0.6, flatShading: true })); c.position.set(0, y, 0); c.rotation.y = Math.PI / 4; c.castShadow = true; pav.add(c); };
  pavRoof(2.95, 2.45, 0.9); box(1.2, 0.5, 1.2, RED, 0, 3.45, 0, pav); pavRoof(3.95, 1.5, 0.75);
  sphere(0.16, GOLD, 0, 4.42, 0, pav, { metalness: 0.5, roughness: 0.35 });
  // 廟前的石欄杆
  for (const s of [-1, 1]) {
    for (let x = 3.7; x <= 7.5; x += 0.76) { box(0.16, 0.8, 0.16, STONE, s * x, 0.4, ZF + 1.1, T); sphere(0.1, STONE, s * x, 0.88, ZF + 1.1, T); }
    box(3.9, 0.08, 0.1, 0xb8b0a2, s * 5.6, 0.62, ZF + 1.1, T); box(3.9, 0.08, 0.1, 0xb8b0a2, s * 5.6, 0.3, ZF + 1.1, T);
  }
  // 路燈：黑色燈桿＋兩盞燈
  const lamp = (x, z) => {
    cyl(0.16, 0.2, 0.4, 0x24272c, x, 0.2, z, T); const pole = cyl(0.05, 0.07, 3.3, 0x24272c, x, 1.85, z, T); pole.castShadow = true;
    box(0.8, 0.05, 0.05, 0x24272c, x, 3.2, z, T);
    for (const d of [-0.38, 0.38]) { sphere(0.13, 0xfff2cf, x + d, 3.02, z, T, { emissive: 0xffd98a, emissiveIntensity: 0.45 }); cyl(0.15, 0.1, 0.07, 0x24272c, x + d, 3.18, z, T); }
  };
  lamp(-6.9, -1.0); lamp(6.9, -1.0); lamp(-8.6, 10.6); lamp(8.6, 10.6);
  // 盆栽：灰盆＋圓灌木
  const pot = (x, z, r = 0.42) => {
    cyl(r * 0.75, r * 0.55, r * 0.9, 0x9d958a, x, r * 0.45, z, T);
    for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28; const b = sphere(r * 0.72, k % 2 ? 0x2f6e35 : 0x3a8040, x + Math.cos(a) * r * 0.5, r * (1.5 + (k % 3) * 0.2), z + Math.sin(a) * r * 0.5, T); b.castShadow = true; }
    sphere(r * 0.85, 0x37793c, x, r * 1.85, z, T);
  };
  for (const s of [-1, 1]) { pot(s * 4.4, -4.1); pot(s * 7.8, -3.0, 0.5); pot(s * 8.9, 1.0); pot(s * 8.9, 9.6); }
  // 樹：一片一片的葉子（一次畫完，不增加繪圖次數）。葉子不投影，地上的樹影是烘好的
  const leafTex = canvasTex(64, 40, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(w / 2, h / 2, w / 2 - 2, h / 2 - 4, 0, 0, 7); g.fill(); g.strokeStyle = '#00000044'; g.lineWidth = 2; g.beginPath(); g.moveTo(3, h / 2); g.lineTo(w - 3, h / 2); g.stroke(); });
  const leafMat = new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75 });
  const LEAF = [0x2f7d32, 0x3f9a3a, 0x276b2c, 0x5aa83d, 0x357f3f].map(c => new THREE.Color(c));
  const canopy = (x, y, z, rx, ry, rz, n) => {
    const core = sphere(1, 0x1e5a24, x, y, z, T, { roughness: 1 }); core.scale.set(rx * 0.82, ry * 0.82, rz * 0.82);
    const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.5, 0.32), leafMat, n), d = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 6.283, v = Math.acos(2 * Math.random() - 1), r = 0.82 + Math.random() * 0.26;
      d.position.set(x + Math.sin(v) * Math.cos(u) * rx * r, y + Math.cos(v) * ry * r, z + Math.sin(v) * Math.sin(u) * rz * r);
      d.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28); d.scale.setScalar(0.8 + Math.random() * 0.7); d.updateMatrix();
      im.setMatrixAt(i, d.matrix); im.setColorAt(i, LEAF[i % LEAF.length]);
    }
    im.frustumCulled = false; T.add(im);
  };
  const trunk = (x0, z0, x1, y1, z1, r) => { const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(x0, 0, z0), V3(x0 + (x1 - x0) * 0.25, y1 * 0.5, z0 + (z1 - z0) * 0.25), V3(x1, y1, z1)]), 12, r, 7), mat(0x5a4230, { roughness: 0.95 })); t.castShadow = true; T.add(t); };
  // 左前方的大樹枝葉伸進畫面；後面一排樹在磚牆後面
  trunk(-11.6, 3.6, -9.5, 6.2, 2.6, 0.32); trunk(-10.6, 3.2, -8.4, 5.6, 5.6, 0.14);
  canopy(-10.5, 7.0, 2.8, 3.8, 2.2, 3.6, 1500); canopy(-8.8, 6.1, 6.2, 2.0, 1.3, 2.2, 620);
  trunk(-12.6, -6.4, -12.4, 5, -6.4, 0.3); canopy(-12.4, 6.6, -6.4, 3.6, 2.9, 2.8, 1100);
  trunk(12.6, -6.4, 12.4, 5, -6.4, 0.3); canopy(12.4, 6.8, -6.4, 3.8, 3, 2.8, 1100);
  trunk(12.4, 3.5, 12.2, 5, 3.5, 0.28); canopy(12.2, 6.6, 3.5, 2.9, 2.5, 3.2, 900);
  mergeStatic(T, new Set([...C.lanterns, ...C.smoke]));
}
// 不會動的小物件（欄杆、盆栽、路燈…）同材質合併成一個：畫面不變，繪圖次數少很多
function mergeStatic(root, skip) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert(), groups = new Map(), hit = [];
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || skip.has(o) || Array.isArray(o.material) || o.material.transparent) return;
    let p = o.parent, moving = false; while (p && p !== root) { if (skip.has(p)) moving = true; p = p.parent; }
    if (moving) return;
    const k = o.material.uuid + (o.castShadow ? 's' : '') + (o.receiveShadow ? 'r' : '');
    if (!groups.has(k)) groups.set(k, { mat: o.material, cast: o.castShadow, recv: o.receiveShadow, geos: [] });
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n);
    groups.get(k).geos.push(g); hit.push(o);
  });
  for (const o of hit) o.parent.remove(o);
  for (const { mat: m, cast, recv, geos } of groups.values()) {
    const g = mergeGeometries(geos); if (!g) continue;
    const mesh = new THREE.Mesh(g, m); mesh.castShadow = cast; mesh.receiveShadow = recv; root.add(mesh);
  }
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
