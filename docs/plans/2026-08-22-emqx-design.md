# WoowTech EMQX 教學網站設計

**狀態：** 已核准  
**日期：** 2026-08-22  
**產品基準：** EMQX **v5.8.9**；WoowTech HA add-on **5.9.0**（add-on 只加 ngrok TCP 通道，底層 EMQX 仍為 v5.8.9）  
**網站：** `https://emqx-guide.woowtech.io/`  
**Repository：** `WOOWTECH/Woow_emqx_tutorial_site`  
**Add-on：** `WOOWTECH/Woow_ha_emqx`（`emqx/` 子目錄，slug `woow-emqx`）

## 1. 目標

建立 WoowTech 繁體中文資源中心，以 22 章完整教學涵蓋 EMQX 5.8.9 可由使用者操作或維運的功能，並提供四個入口：

1. 完整教學目錄
2. 銷售與導入指南
3. 提示詞工具箱
4. Skill 實戰手冊

台灣繁體中文，稱讀者為「你」，不使用 emoji。每章 8–12 節、至少 4 FAQ、含排除與官方來源。特定選單、預設值、版本行為與限制均以 EMQX v5.8.9 官方文件、Woow_ha_emqx 原始碼，或實機唯讀驗證為依據。

## 2. 版本邊界與事實基準

- 教學功能基準為 **EMQX 5.8.9**；EMQX 官方文件鎖定 `https://docs.emqx.com/en/emqx/v5.8/`。
- add-on version `5.9.0` 只是「新增 ngrok TCP 1883 通道」，底層 Dockerfile 固定 `EMQX_VERSION="v5.8.9"`；教學明確區分「add-on 版本」與「EMQX 版本」。
- 不把 EMQX 4.x 的 Module／Bridge 名詞與 5.x 混用；5.x 以「Data Integration（Rules／Connectors／Actions／Sources／Sinks）」與「Extensions」用語為準，作者需以 v5.8 文件與實機核對再下筆。
- Cluster（叢集）只做概念與節點監控說明，不做多節點實作。
- 不為了截圖建立／刪除 Authentication、Authorization、Dashboard 使用者、API Key、Connector、Rule、Sink、Source、Listener；不踢出 client；不改動密碼或憑證。

## 3. 資訊架構

沿用 `chapters.json` 單一資料來源 + `scripts/build_nav.js` + `scripts/check_links.js` 架構：

- `index.html` 四卡資源總覽
- `tutorial.html` 22 章目錄
- `sales.html`、`prompts.html`、`skills.html` 獨立手冊

四部分：

1. **基礎：認識與安裝**（第 1–4 章）
2. **核心：連線與存取控制**（第 5–8 章）
3. **進階：規則、整合與資料橋接**（第 9–13 章）
4. **維運：監控、管理與復原**（第 14–22 章）

## 4. 22 章課綱

| 章 | 檔案 | 主題 | 必須涵蓋 |
|---|---|---|---|
| 01 | `ch1_overview.html` | EMQX 是什麼 | MQTT broker 心智模型、與 Mosquitto 差異、EMQX 5.x 架構、Dashboard 總覽、叢集概念、add-on 邊界 |
| 02 | `ch2_install.html` | 安裝 add-on 5.9.0（EMQX 5.8.9） | repo 加入、安裝、host_network、五個連接埠、Ingress、啟動、首次登入、改預設密碼、與 Mosquitto 衝突 |
| 03 | `ch3_dashboard.html` | Dashboard 導覽 | 側欄模組、Overview／監控、語言、授權 banner、版本資訊、開 Web UI 進入方式 |
| 04 | `ch4_mqtt_basics.html` | MQTT 心智模型 | broker／client／topic／`+` `#` wildcard／QoS 0-1-2／retained／will／keepalive／clean session／共享訂閱 `$share` |
| 05 | `ch5_first_connection.html` | 第一個 MQTT 連線 | 內建 WebSocket client 測試工具、publish／subscribe、QoS 驗證、EMQX 官方 WebSocket 診斷 |
| 06 | `ch6_authentication.html` | Authentication 驗證 | Password-Based（Built-in Database）、使用者建立／停用、憑證格式、JWT 概念、HTTP/LDAP 概念、首登必設 |
| 07 | `ch7_authorization.html` | Authorization（ACL） | 授權順序、Built-in Database ACL、主題規則配對、拒絕策略、與 Authentication 搭配 |
| 08 | `ch8_listeners_tls.html` | Listeners 與 TLS | 1883／8083／8084／8883、新增／修改 Listener、TLS 憑證、mTLS 概念、連接埠衝突處理 |
| 09 | `ch9_rule_engine.html` | Rule Engine 概念 | SQL（SELECT／FROM／WHERE）、事件／topic 作為 source、欄位與內建函數、觸發測試 |
| 10 | `ch10_rule_actions.html` | 內建動作與轉發 | console output、republish、重寫 topic、與 Listener／client 的互動、訊息轉發實例 |
| 11 | `ch11_connectors_sinks.html` | Connectors 與 Sinks | Webhook、HTTP、Kafka、PostgreSQL／MySQL 概念；以 Webhook／HTTP 為主實作 |
| 12 | `ch12_sources_bridge.html` | Sources 與資料匯入 | MQTT 事件 source、跨 broker bridge 概念、訊息回寫 EMQX |
| 13 | `ch13_home_assistant.html` | 與 Home Assistant 整合 | HA MQTT 整合、discovery、birth／will、狀態主題、Zigbee2MQTT 串接、與 Mosquitto 遷移 |
| 14 | `ch14_client_management.html` | 客戶端與訂閱管理 | Clients 清單／踢除／統計、Subscriptions、連線與訂閱明細、慢訂閱、主題監控 |
| 15 | `ch15_monitoring.html` | 監控與 Metrics | Dashboard 統計、節點狀態、系統資源、Prometheus 概念、速率 |
| 16 | `ch16_message_management.html` | 訊息與主題管理 | Message publish、retained 管理、主題樹、Topic Metrics、延遲發布 |
| 17 | `ch17_configuration.html` | 設定與組態 | Dashboard 設定、List/General 設定、`EMQX_` 環境變數、設定檔、Secret 管理 |
| 18 | `ch18_logs_api_diagnose.html` | Log、API 與診斷 | Log & Trace、診斷工具、REST API 概念、Health Check |
| 19 | `ch19_ngrok.html` | ngrok TCP 通道（add-on 特有） | `ngrok_enabled`、authtoken、固定 TCP 位址、公開 1883 的風險、替代 Cloudflare Tunnel |
| 20 | `ch20_backup_recovery.html` | 備份、還原與更新 | `/data/emqx/` 範圍、驗證／ACL／橋接備份、還原、更新、Mosquitto 遷移 |
| 21 | `ch21_security.html` | 安全部署 | host_network 風險、對外暴露、Rate Limit、TLS 要求、管理面防護、最小權限 |
| 22 | `ch22_troubleshooting.html` | 完整疑難排解 | 無法啟動／無法連線／Dashboard 進不去／連接埠衝突／資源不足／驗證失效的症狀→檢查→安全修復 |

## 5. 功能覆蓋原則

- 第 6–8 章共同構成完整存取控制 reference；Authentication 的每種 backend 依「是否可在 v5.8 Dashboard 直接用 UI 設定」區分實作與概念。
- 第 9–12 章構成 Data Integration reference；SQL 規則、內建動作、Connector/Sink/Source 分開講，不把 4.x 的 Bridge 名詞當成 5.x 建議寫法。
- 第 13 章把 HA／Z2M／Mosquitto 遷移放在同一應用脈絡，重複內容以連結帶過。
- 每章敏感資料（MQTT 密碼、client ID、API key、ngrok authtoken、TLS 憑證、連線字串、內網位址）一律以佔位符表示，不寫入任何真實值。

## 6. 四卡資源中心

- `tutorial.html`：22 章入口、四部分分組、閱讀路線。
- `sales.html`：適合情境、需求盤點（設備數／訊息量／是否需要規則引擎／叢集）、與 Mosquitto 比較、部署階段、風險與驗收；不誇大效能承諾。
- `prompts.html`：至少 45 組 EMQX 專用提示詞，涵蓋安裝、連線、驗證、ACL、TLS、規則、整合、監控、維運、安全、備份；全部假資料。
- `skills.html`：獨立 Skill 手冊，教代理如何查核 v5.8.9、唯讀截圖、遮蔽秘密、寫章節、事實／安全審查與發布驗證。

## 7. 截圖與秘密資料安全

- 測試環境 `https://woowtech-ha.woowtech.io`；HA 登入與 EMQX Dashboard 帳密均為本地 gitignored `.env`，不進入 HTML、log、commit 或 subagent prompt。
- Dashboard 透過 HA「開啟 Web UI」的 stream ingress 進入；自動化需逐步探測，全程唯讀。
- 可開啟頁面、分頁、展開區塊、無副作用篩選；不得按 Create／Delete／Save／Kick／Disconnect／Publish 變更狀態。
- 截圖前遮蔽：MQTT 密碼、client ID、username、API key、ngrok authtoken、TLS 憑證私鑰、連線字串、token、私有 IP、log 內容。
- 所有初始 capture 只寫入 gitignored `artifacts/raw-screenshots/`；人工核准並確認遮蔽後才複製到 `assets/screenshots/`。
- 每張 PNG 人工開啟複查；不安全或需改變狀態的畫面直接不截。
- 完成後提醒輪替測試帳密。

## 8. 作者、查證與審查

六條互不衝突的平行 lane：

1. 第 1–4 章
2. 第 5–8 章
3. 第 9–13 章
4. 第 14–18 章
5. 第 19–22 章
6. Hub、銷售、提示詞與 Skill 手冊

每條 lane 只改自己的檔案。整合後由獨立 reviewer 進行：

- **事實／版本／安全審查**：逐項對照 EMQX v5.8 文件、Woow_ha_emqx 原始碼與實機唯讀行為。
- **品牌／結構／可讀性審查**：台灣繁體中文、WoowTech 品牌、8–12 sections、FAQ、troubleshooting、source links、responsive。

Critical 與 Important 全數修正後重審。無法證實的功能降級為保守描述或刪除。

## 9. 驗證與發布

- `node scripts/build_nav.js --check`、`node scripts/check_links.js`、content／sensitive／feature-manifest 檢查全綠
- 22 章各 8–12 sections、≥4 FAQ、troubleshooting 與官方來源
- Stable 版本掃描：不混入 4.x 名詞；不把 add-on 5.9.0 當成 EMQX 版本
- HTML 無敏感值、QR、密碼、API key、token、真實內網
- 1200／360／320 px：HTTP 200、CSS 載入、無 console/page error、無水平 overflow
- sitemap、404、hub、三手冊與代表章節 HTTPS 200；未知路徑 HTTP 404 branded

完成後建立 GitHub repo、推送 main、啟用 Pages、設定 custom domain `emqx-guide.woowtech.io`（先 DNS-only 驗證，再 Cloudflare proxied），DNS mutation 前列出精確效果並取得確認。