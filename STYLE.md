# WoowTech EMQX 教學站 — 寫作規範（STYLE.md）

## 語言與語氣

- 台灣繁體中文，稱讀者為「你」，不使用「您」，不使用 emoji。
- 語氣像資深工程師帶新手開箱，不是冷冰冰的手冊。
- 首次出現的技術名詞採「中文（English）」，之後只用中文。
- 每個抽象概念落到智慧家庭情境（客廳、房間、玄關、陽台、茶水間）。

## 版本與事實界線（重要）

- 功能基準是 **EMQX 5.8.9**；官方文件鎖定 `https://docs.emqx.com/en/emqx/v5.8/`。
- add-on version `5.9.0` 只是「新增 ngrok TCP 1883 通道」，底層 EMQX 仍是 5.8.9；
  教學必須區分「add-on 版本」與「EMQX 版本」。
- 不把 EMQX 4.x 的「Modules」「Data Bridge」當成 5.x 建議寫法；5.x 以
  「Data Integration（Rules／Connectors／Actions／Sources／Sinks）」與
  「Extensions」為準。要提 4.x 舊名時，必須明確標示「4.x／舊版／legacy」。
- 每項具體主張（選單路徑、預設值、版本行為、限制）都要能指出來源：
  優先 `Woow_ha_emqx` 原始碼／README → EMQX v5.8 文件 → 實機唯讀觀察。

## 章節結構

- 每章 8–12 個 `<section>`，每個 `id` + `data-nav`，每個 `<h2>` 有有效 `data-icon`。
- 固定段落：`why`、概念、`steps`（≥4 步）、主題、`troubleshoot`（≥4 項）、
  `faq`（≥4 則）、`sources`（≥1 個 pinned 來源）。
- `<head>`、`<aside class="sidebar">`、`<div class="pager">` 留空，由 `build_nav.js` 產生。
- 所有表格用 `class="data-table"`，不放 inline style。

## 秘密資料安全（不可違反）

- MQTT 密碼、client ID、username、API key、ngrok authtoken、TLS 私鑰、連線字串、
  bearer token、私有 IP、測試主機名一律用佔位符（`<你的密碼>`、`YOUR_TOKEN`）。
- 不把帳密、token 或內網資訊寫進 HTML、log、commit 或 subagent prompt。
- 截圖只做唯讀；不建立／刪除驗證、ACL、使用者、API key、Connector、Rule、
  Listener；不踢除 client。敏感畫面先遮蔽，raw 圖只進 `artifacts/raw-screenshots/`。
