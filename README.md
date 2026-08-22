# WoowTech EMQX 指南

WoowTech 製作的台灣繁體中文靜態網站，完整整理 EMQX **v5.8.9** 的安裝、MQTT 心智模型、驗證與 ACL、TLS、Rule Engine、Data Integration、Home Assistant 整合、監控、備份與安全，並附四卡資源中心。以「你」稱呼讀者，不使用 emoji。

- 正式網站：<https://emqx-guide.woowtech.io/>
- repository：<https://github.com/WOOWTECH/Woow_emqx_tutorial_site>
- 產品事實基準：EMQX `v5.8.9`（文件 <https://docs.emqx.com/en/emqx/v5.8/>）
- Add-on 基準：`WOOWTECH/Woow_ha_emqx`（add-on version `5.9.0` 只多加一條 ngrok TCP 1883 通道，底層 EMQX 仍是 5.8.9）
- 授權：內容採 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.zh-hant)

## 四卡資源中心

| 類別 | 頁面 | 用途 |
|---|---|---|
| 完整教學 | `tutorial.html` | 22 章 EMQX 5.8.9 教學 |
| 銷售指南 | `sales.html` | 需求、與 Mosquitto 比較、規模、風險與驗收 |
| 提示詞庫 | `prompts.html` | 45 條安裝、連線、驗證、ACL、TLS、規則、整合、監控、維運、安全提示詞 |
| Skill 手冊 | `skills.html` | 研究、撰寫、查證、安全與發布流程 |

`index.html` 是四卡入口；`tutorial.html`、章節側欄、pager、SEO 與 sitemap 由 `chapters.json` 與 `scripts/build_nav.js` 產生。銷售手冊、提示詞庫與 Skill 手冊是自包含的單一 HTML，可從首頁下載離線閱讀；22 章教學是多頁網站，離線請下載整站 ZIP。

## 22 章架構

1. **基礎：認識與安裝**（第 1–4 章）
2. **核心：連線與存取控制**（第 5–8 章）
3. **進階：規則、整合與資料橋接**（第 9–13 章）
4. **維運：監控、管理與復原**（第 14–22 章）

| 章 | 檔案 | 標題 |
|---|---|---|
| 01 | `ch1_overview.html` | 認識 EMQX 與 MQTT Broker |
| 02 | `ch2_install.html` | 安裝 Woow EMQX add-on |
| 03 | `ch3_dashboard.html` | EMQX Dashboard 導覽 |
| 04 | `ch4_mqtt_basics.html` | MQTT 心智模型 |
| 05 | `ch5_first_connection.html` | 建立第一個 MQTT 連線 |
| 06 | `ch6_authentication.html` | Authentication 驗證 |
| 07 | `ch7_authorization.html` | Authorization 與 ACL |
| 08 | `ch8_listeners_tls.html` | Listeners 與 TLS |
| 09 | `ch9_rule_engine.html` | Rule Engine 規則引擎 |
| 10 | `ch10_rule_actions.html` | 內建動作與訊息轉發 |
| 11 | `ch11_connectors_sinks.html` | Connectors 與 Sinks |
| 12 | `ch12_sources_bridge.html` | Sources 與資料匯入 |
| 13 | `ch13_home_assistant.html` | 與 Home Assistant 整合 |
| 14 | `ch14_client_management.html` | 客戶端與訂閱管理 |
| 15 | `ch15_monitoring.html` | 監控與 Metrics |
| 16 | `ch16_message_management.html` | 訊息與主題管理 |
| 17 | `ch17_configuration.html` | 設定與組態 |
| 18 | `ch18_logs_api_diagnose.html` | Log、API 與診斷 |
| 19 | `ch19_ngrok.html` | ngrok TCP 通道 |
| 20 | `ch20_backup_recovery.html` | 備份、還原與更新 |
| 21 | `ch21_security.html` | 安全部署 |
| 22 | `ch22_troubleshooting.html` | 完整疑難排解 |

完整檔名、標題、SEO 文案與四部分分組都在 `chapters.json`。功能覆蓋基準位於 `data/emqx-5.8.9-feature-manifest.json`。

## 網站結構

```text
index.html       四卡資源總站（人工維護）
tutorial.html    22 章教學目錄
ch1_*.html ...   22 章教學內容
sales.html       銷售與方案說明（自包含）
prompts.html     45 條提示詞（自包含）
skills.html      AI Agent Skill 手冊（自包含）
chapters.json    教學順序、導覽與 SEO 的單一來源
data/            EMQX 5.8.9 功能覆蓋 manifest
assets/          共用樣式、字型與 OG 圖片
scripts/         導覽產生與檢查工具
docs/plans/      設計與實作計畫
```

網站 canonical 基底是 `https://emqx-guide.woowtech.io/`。部署時讓網域根目錄對應儲存庫根目錄，並保留相對連結結構。

## 本機預覽

```bash
python3 -m http.server 8080
```

開啟 <http://localhost:8080/>。

## 產生與驗證

```bash
node scripts/build_nav.js
node scripts/build_nav.js --check
node scripts/check_links.js
node scripts/check_content.js
node scripts/check_sensitive.js
node scripts/check_feature_manifest.js
node scripts/check_dockerfile.js
node scripts/test_checks.js
```

- `build_nav.js`：產生 head、側欄、pager、footer、教學目錄與 sitemap。
- `check_links.js`：檢查檔案、連結、錨點、ID、圖示與 sitemap。
- `check_content.js`：檢查每章 section、FAQ、troubleshooting、來源與語氣。
- `check_sensitive.js`：阻擋 MQTT 密碼、API key、ngrok authtoken、憑證私鑰、連線字串與私有網路洩漏。
- `check_feature_manifest.js`：確認每項功能都有版本、成熟度、來源與章節落點，並擋下 EMQX 4.x 舊詞（Modules／Data Bridge）被當成 5.x UI。
- `check_dockerfile.js`：解析所有 `COPY`，只允許公開站台資產，並檢查 raw／authoring context 排除規則。
- `test_checks.js`：執行各 checker 的正負 regression cases。

### 本機瀏覽器與響應式驗收

不連線 EMQX、不讀取 `.env`，啟動暫時 localhost 靜態伺服器，逐一檢查 28 個公開 HTML 頁面在 1200、360 與 320 px 的版面，並驗證自訂 HTTP 404：

```bash
npm install --no-save --no-package-lock playwright
npx playwright install chromium
node scripts/validate_responsive.js
```

報告寫入 gitignored `artifacts/responsive-report.json`；四張人工檢視截圖寫入 `artifacts/responsive/`。Playwright、`node_modules/` 與 npm metadata 只供本機使用，不提交。

## 截圖安全

實機 Dashboard 走 HA stream ingress，自動化只能做唯讀互動。不得建立、儲存、刪除、踢除、重設或改動驗證、ACL、使用者、API key、Connector、Rule、Listener。初始 capture 只寫入 gitignored `artifacts/raw-screenshots/`，並遮蔽 MQTT 密碼、client ID、username、API key、ngrok authtoken、TLS 私鑰、連線字串、token 與私有 IP；人工複查後才可放入公開的 `assets/screenshots/`。

本 repository 不追蹤 `.env`、`storage_state.json`、`node_modules/`、probe image、raw screenshot 或 `artifacts/`。

## 來源與商標

- Add-on：<https://github.com/WOOWTECH/Woow_ha_emqx>（fork 自 <https://github.com/hassio-addons/addon-emqx>）
- EMQX 原始專案：<https://github.com/emqx/emqx>
- 本站 fork 自 [`WOOWTECH/Woow_ha_tutorial_site`](https://github.com/WOOWTECH/Woow_ha_tutorial_site)

EMQX 為 EMQ Technologies 的商標；本網站是 WoowTech 製作的獨立社群教學，與 EMQ Technologies 專案官方無隸屬關係。第三方產品、介面與截圖的權利仍屬各自權利人。