# 換電腦接手說明（2026-11-09，v0.12.4）

給另一台電腦上的 Claude／自己看：目前做到哪裡、還沒做完什麼、新電腦要裝什麼。

## 現在的狀態

- 線上版本：v0.12.4，https://pokemonida99.github.io/office-basketball/ （GitHub Pages 從 main 部署，推上去約 1 分鐘）
- 升版規則：改 `js/main.js` 的 `VERSION`，並把所有檔案裡的 `?v=舊版號` 全部換成新版號（index.html、js/*.js），README 最上面加一段更新說明
- 能力值：`js/radar.js` 的 `RATINGS`（0～100 分），選角雷達圖和比賽公式共用。倍率＝1＋（分數−70）×0.0125；`dunkPick`、`dunkMake` 是百分比。要調手感改這裡就好
- 能力表 artifact（可在網頁上改數字）：https://claude.ai/artifact/NEVgxvYaVWumGdReB7hX8z 。改完要再手動抄回 `js/radar.js`
- 角色模型：`models/<角色>_v2.glb`，來源是 office-characters repo 的 `tests/remake/<角色>/<角色>_rig.glb`（`tools/v2_models.sh` 減面＋壓縮）
- 動作：`tools/blender/runs.py` 產生每個人的 Blender 動作 → `tools/pack_clips.py` 打包成 `models/moves/pack/<角色>.glb`

## 還沒做完（可以接著做）

1. **雙手投籃（試做，沒上線）**：`tools/blender/runs.py` 已經有雙手投籃的定義（`TWO_CHEST`、`TWO_SET` 等，`shot()`、`fade()` 在用）。只在 `work/run7` 試算過小米、阿傑、林語彤，正面看手會擋到臉。要用的話：重跑 runs.py 產生全部角色 → pack_clips → 進遊戲看。`work/` 資料夾沒進 repo，要重跑產生
2. **數值觀察**：套用能力表後，後衛跑速（林語彤 5.5）和中鋒（3.6）差很多、小編上籃約 97%、大家籃板範圍變小。使用者還沒回饋，玩過再調
3. **暫停中（使用者說先不要做）**：
   - 用藏起來的 6 個上班族（小燕、黑輪、德哥、Momo、阿哲、小偵）組「業務部」「總務部」小隊
   - 這 6 人和針筒超人也照 v2 流程重做模型（Higgsfield 點數不夠，當時剩 47 點；一個人約 14 點）
   - Vivi 招牌動作的手有時會穿過臉
4. **原型頁**：`tools/select.html`（立繪＋會動的雷達圖）、`tools/select3d.html`（有 3D 角色的版本，使用者說太複雜不要），只是參考，遊戲沒用到

## 新電腦要準備的

- Blender 5.x（動作和模型處理都用無介面模式：`Blender -b -P 腳本.py -- 參數`）。注意 Blender 5 的動作沒有 `.fcurves`，要走 `layers → strips → channelbags`
- Node.js（`npx @gltf-transform/cli` 壓縮模型）、ffmpeg
- 本機測試：在專案資料夾開靜態伺服器（例如 `python3 -m http.server 8812`），瀏覽器快取很頑固，改了 js 要強制重新載入
- 自動測試：網址加 `?auto` 後在主控台用 `G.start(['lin','yuan'],['mi','jie'])`、`G.step(1/60, 300)` 快轉比賽，`G.LOG` 看紀錄
- 使用者看不太懂英文，說明一律用繁體中文、白話
