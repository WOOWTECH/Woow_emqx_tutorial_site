#!/usr/bin/env node
/**
 * check_site_rules.js — 本站自己的額外房規（共用 kit 的 check_links.js 沒有的部分）。
 *
 *   node scripts/check_site_rules.js               # 檢查 zh-TW（repo 根目錄）
 *   SITE_ROOT=en node scripts/check_site_rules.js  # 檢查 en/
 *
 * 這些規則原本住在本站的 scripts/check_links.js；換成 13 站共用的 kit 版之後，
 * 只把 kit 沒有的部分留在這裡（kit 檔案一律不改）：
 *   1. 站內連結用 scripts/lib/html_links.js 的 resolver 驗：
 *      href/src 單雙引號都吃、跨頁 fragment（a.html#id）要在目標頁有對應 id、
 *      不允許 http(s)/mailto/tel/data 以外的 scheme、percent-encoding 要合法、不得穿越網站根目錄。
 *   2. 同一頁沒有重複的 id（單雙引號都算）。
 *   3. 內容頁的常見問題至少 4 則（kit 版門檻是 3）。
 *
 * 有任何錯誤就 exit 1。
 */

'use strict';

const fs = require('fs');
const path = require('path');
const i18n = require('./lib/i18n');
const { validateHtmlLinks } = require('./lib/html_links');

const { repoRoot: REPO_ROOT, root: ROOT, subdir: SUBDIR } = i18n.resolveRoot(); // SITE_ROOT=en 時檢查 en/
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'chapters.json'), 'utf8'));
const rootCfg = SUBDIR ? JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'chapters.json'), 'utf8')) : cfg;

// hub 模式：index.html = 資源總覽、catalog = 教學目錄、hub.pages = 自帶樣式的獨立單檔手冊，這些不吃內容頁房規。
const CATALOG = (cfg.hub && cfg.hub.catalog) || 'index.html';
const HUB_PAGES = (cfg.hub && cfg.hub.pages) || [];
const NON_CONTENT = new Set(['index.html', '404.html', CATALOG, ...HUB_PAGES]);

const errors = [];
const htmlFiles = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')).sort();

for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');

  // 2. 重複 id（單雙引號都算）
  const allIds = [...html.matchAll(/\bid\s*=\s*(["'])(.*?)\1/gi)].map((m) => m[2]);
  const dupes = allIds.filter((id, i) => allIds.indexOf(id) !== i);
  [...new Set(dupes)].forEach((id) => errors.push(`${file}: 重複的 id="${id}"`));

  // 3. 內容頁常見問題至少 4 則
  if (NON_CONTENT.has(file)) continue;
  const faq = (html.match(/<details class="faq">/g) || []).length;
  if (faq < 4) errors.push(`${file}: 常見問題只有 ${faq} 則，房規要求至少 4 則`);
}

// 1. 站內連結／跨頁 fragment／scheme／穿越檢查。
//    其他語系的 root（en/）用 ../assets/ 指回共用資源，所以 resolver 一律以 repo 根目錄為 root、
//    檔名帶子目錄（en/ch1.html）；root-relative 連結（/…）的前綴取 zh 的 baseUrl 路徑（自訂網域時為 "/"）。
const basePrefix = new URL(rootCfg.site.baseUrl).pathname.replace(/\/$/, '') + '/';
const files = htmlFiles.map((f) => (SUBDIR ? `${SUBDIR}/${f}` : f));
errors.push(
  ...validateHtmlLinks({ root: REPO_ROOT, files, basePrefix }).map((e) => (SUBDIR ? e.replace(new RegExp(`^${SUBDIR}/`), '') : e))
);

const where = SUBDIR ? `${SUBDIR}/` : '';
if (errors.length) {
  console.error(`\n✗ 發現 ${errors.length} 個問題：`);
  errors.forEach((e) => console.error('  · ' + where + e));
  process.exit(1);
}

console.log(`✓ ${where}${htmlFiles.length} 個頁面通過本站額外房規（resolver 連結、跨頁錨點、重複 id、FAQ ≥ 4）`);
