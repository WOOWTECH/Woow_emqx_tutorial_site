# WoowTech EMQX 教學網站實作計畫

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 建立並發布一套涵蓋 EMQX v5.8.9（WoowTech add-on 5.9.0）全部使用者功能的 22 章繁體中文 WoowTech 資源中心。

**Architecture:** 以 `Woow_ha_tutorial_site` 為靜態基底，`chapters.json` 是章節／SEO／導覽／sitemap 單一來源；`build_nav.js` 生成、多支 checker 當發布閘門。章節由互不重疊的平行作者 lane 撰寫，再做獨立事實／安全與品牌／品質審查。實機截圖只在唯讀、redacted 前提下進行。

**Tech Stack:** HTML5、CSS、vanilla JS、Node.js、Playwright、GitHub Pages、Cloudflare DNS、Git。

---

## 實作規範

- 工作目錄：`/data/pi-agent/home/pi-cwd-20260817/Woow_emqx_tutorial_site`
- 產品基準：EMQX `v5.8.9`；文件 `https://docs.emqx.com/en/emqx/v5.8/`；add-on 事實基準 `WOOWTECH/Woow_ha_emqx` `emqx/`（固定 commit）
- 文章語言：台灣繁體中文、稱「你」、無 emoji
- 每章：8–12 section、`id`+`data-nav`、`<h2 data-icon>` 有效、≥4 FAQ、troubleshooting、official sources
- 明確區分 add-on 版本 5.9.0 與 EMQX 版本 5.8.9；不混入 4.x Module／Bridge 名詞
- 同一工作樹單一 writer；平行 lane 用獨立 worktree
- 帳密、token、ngrok authtoken、MQTT 密碼、client ID、API key、連線字串、私有 IP 一律不進 prompt／HTML／log／commit

### Task 1: 固定 fork 基線與產品 metadata

**Files:** `.gitignore`、`README.md`、`STYLE.md`、`chapters.json`（改）；刪 `ch*.html`、`appendix_*.html`、`assets/screenshots/ch*`、`sitemap.xml`；保留 `index.html`、`tutorial.html`、`sales/prompts/skills.html`、`404.html`、`scripts/`、`assets/`、`.github/workflows/`

**Step 1:** 確認 template clean、`node scripts/check_links.js` 通過。  
**Step 2:** 移除舊 HA 教學內容。  
**Step 3:** `chapters.json.site` 設為 EMQX：title/brand/subtitle、`baseUrl https://emqx-guide.woowtech.io`、repo URL、`ogImage assets/og/emqx-guide.png`。  
**Step 4:** `.gitignore` 確保 `.env`、`storage_state.json`、`node_modules/`、`scripts/probe_login.png`、`assets/screenshots/**/*.raw.png`、`artifacts/` 被忽略。  
**Step 5:** stale scan（新居入住／ch1_login／Tailscale／Headscale／Nginx／Nextcloud／Immich／Matter）確認發布內容無舊產品。  
**Step 6:** commit `fork: scaffold EMQX tutorial site`。

### Task 2: 內容品質與秘密檢查

**Files:** `scripts/check_content.js`、`scripts/check_sensitive.js`、`data/emqx-5.8.9-feature-manifest.json`、`scripts/check_feature_manifest.js`、`.github/workflows/checks.yml`（新增／改）

**Step 1:** 失敗 fixture（7 sections／3 FAQ／缺 troubleshoot／缺 source）。  
**Step 2:** `check_content.js` 支援 global + positional、驗證結構、禁止 emoji／「您」。  
**Step 3:** `check_sensitive.js` 偵測帳密、MQTT 密碼、API key、ngrok authtoken、TLS 私鑰、連線字串、私有 IP，白名單只放文件範例與公開 domain。  
**Step 4:** 建立 pinned feature manifest 記錄每項功能（Dashboard 模組、Authentication backend、Authorization、Listener、Rule 功能、Connector/Sink/Source、用戶端管理、監控、設定、ngrok、備份）的來源、章節、成熟度；checker 驗證章節落點與 4.x 詞黑名單。  
**Step 5:** CI 依序跑 build_nav --check、check_links、check_content、check_sensitive、check_feature_manifest。  
**Step 6:** 驗證 fixtures 紅→綠；commit。

### Task 3: chapters.json 與 22 章骨架

**Step 1:** 填 22 章 metadata（四部分、檔名、navLabel、title、pagerTitle、card、description）。  
**Step 2:** 每章 9 節骨架（why、2 concept、steps、2 topic、troubleshoot、faq、sources）、4 FAQ、pinned source，結構 checker 通過。  
**Step 3:** `node scripts/build_nav.js` 生成；`--check` 通過。  
**Step 4:** commit。

### Task 4–8: 平行撰寫（六 lanes）

- Lane A（第 1–4 章）：`ch1_overview`~`ch4_mqtt_basics` — 安裝、Dashboard、MQTT 心智模型
- Lane B（第 5–8 章）：`ch5_first_connection`~`ch8_listeners_tls` — 連線、Authentication、ACL、Listener/TLS
- Lane C（第 9–13 章）：`ch9_rule_engine`~`ch13_home_assistant` — 規則、內建動作、Connector/Sink、Source、HA/Z2M/Mosquitto 遷移
- Lane D（第 14–18 章）：`ch14_client_management`~`ch18_logs_api_diagnose` — 用戶端、監控、訊息、設定、Log/API/診斷
- Lane E（第 19–22 章）：`ch19_ngrok`~`ch22_troubleshooting` — ngrok、備份、安全、排錯
- Lane F（hub）：`index/sales/prompts/skills/404.html`、`assets/css/style.css`、`assets/og/emqx-guide.png`

每 lane 只改自己檔案；逐項核對 v5.8 文件與 add-on 原始碼；每章加 troubleshooting、≥4 FAQ、source；lane-scoped check_content 通過後 commit。

### Task 9: 整合並生成

逐一整合 worktree commits，`node scripts/build_nav.js` 生成，跑全部檢查，commit `chore: generate EMQX navigation`。

### Task 10: 唯讀截圖（stream ingress 逐步探）

**Files:** `.env`（gitignored，本機填入）、`scripts/probe_login.js`（改）、`scripts/capture_emqx.js`（新增）、`scripts/annotations.json`（改）、`assets/screenshots/ch*/NN_*.png`

**Step 1:** 本機建立 `.env`（HA_URL、HA_USER、HA_PASS、EMQX_DASH_USER、EMQX_DASH_PASS），不出現在輸出／commit。  
**Step 2:** Playwright 登入 HA（admin／woowtech），找到 EMQX「開啟 Web UI」並循 stream ingress 進入 Dashboard；全程唯讀、逐頁探測。  
**Step 3:** 建立 safe shot allowlist：Overview／Monitoring／Clients／Subscriptions／Access Control 列表／規則列表／Listeners／Settings／Log 等無副作用頁。任何 action 只展開、切換 view、搜尋、hover、Escape。  
**Step 4:** redaction：MQTT 密碼、client ID、username、API key、ngrok authtoken、TLS 私鑰、連線字串、私有 IP、log。raw capture 只進 `artifacts/raw-screenshots/`，人工核准後才複製進公開目錄。  
**Step 5:** 逐張人工檢查；insert figure；重跑 generator/checkers；commit。

### Task 11–12: 雙重審查

- 事實／版本／安全審查（逐項對照 v5.8 文件＋實機行為）
- 品牌／結構／responsive 審查
- Critical／Important 全修後複審 APPROVED；commit message 記查證／修正數。

### Task 13: 全站發布閘門

`scripts/validate_responsive.js`：28 頁 × 1200／360／320；`build_nav --check`、`check_links`、`check_content`、`check_sensitive`、`check_feature_manifest`、`test_checks`、`git diff --check` 全綠；stale scan 乾淨；git hygiene 無帳密入版。

### Task 14: 建立 repo 並發布 Pages

空 public repo `WOOWTECH/Woow_emqx_tutorial_site`；先 push 無 CNAME 的 main → 啟用 Pages → 驗證 `woowtech.github.io/Woow_emqx_tutorial_site` 全路由 200 → 再 commit root `CNAME`（`emqx-guide.woowtech.io`）並在 Pages 設 custom domain。

### Task 15: Cloudflare 自訂網域與驗收

1. 讀現有 DNS 狀態避免衝突。  
2. 向使用者說明兩階段：建立 DNS-only CNAME `emqx-guide` → `woowtech.github.io`；GitHub 驗證後改 proxied。經批准後執行。  
3. 驗證 custom hostname 全路由 HTTPS 200、未知路徑 404 branded、project URL redirect 正確。  
4. 最終交付（repo、commit、record ID、驗證頁面、殘留）；提醒輪替測試帳密。