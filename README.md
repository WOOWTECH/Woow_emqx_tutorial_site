# WoowTech EMQX 指南

[EMQX](https://www.emqx.io/) 的繁體中文教學站與 WoowTech 資源中心。以
`Woow_ha_tutorial_site` 為靜態基底 fork 而成，涵蓋 EMQX **v5.8.9**（WoowTech
Home Assistant add-on 5.9.0）的完整功能。

## 內容

- **22 章完整教學**：安裝、MQTT 心智模型、驗證與 ACL、TLS、Rule Engine、
  Connector/Sink、Home Assistant 整合、監控、備份與安全。
- **四卡資源中心**：教學目錄（`tutorial.html`）、銷售指南（`sales.html`）、
  提示詞庫（`prompts.html`）、Skill 手冊（`skills.html`）。

## 架構

- `chapters.json` 是章節順序、標題、SEO 與導覽的單一資料來源。
- `node scripts/build_nav.js` 重新產生 `<head>`、側欄、pager 與 `sitemap.xml`。
- `node scripts/check_links.js`、`check_content.js`、`check_sensitive.js`、
  `check_feature_manifest.js`、`check_dockerfile.js`、`test_checks.js` 是發布閘門。

## 授權

內容採用 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.zh-hant)，
持有者 WoowTech。本站 fork 自
[`WOOWTECH/Woow_ha_tutorial_site`](https://github.com/WOOWTECH/Woow_ha_tutorial_site)。
