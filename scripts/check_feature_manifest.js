#!/usr/bin/env node
/** Validate the pinned EMQX 5.8.9 feature-to-chapter coverage manifest + 4.x-term blacklist. */
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const EXPECTED_ADDON = '0ac58f38653589b854496944d82af2548b12f944';
const EXPECTED_DOCS = '37af6a1d6d5480e4293b4bbcb25b081e1e6aa41e';
const EXPECTED_TAG = 'a8319fe2390169e1f2483e3ec80dd01a6cdb233d';
const errors = [];
const argv = process.argv.slice(2);
const manifestArg = argv.find((arg) => arg.startsWith('--manifest='));
const htmlFixtureArg = argv.find((arg) => arg.startsWith('--html-fixture='));
const MANIFEST_PATH = manifestArg
  ? path.resolve(ROOT, manifestArg.slice('--manifest='.length))
  : path.join(ROOT, 'data', 'emqx-5.8.9-feature-manifest.json');

const allowedCategories = new Set([
  'dashboardModule', 'accessControl', 'dataIntegration', 'mqttListener',
  'security', 'observability', 'extensions', 'mqttConcept', 'addonFeature',
]);
const allowedMaturity = new Set(['stable', 'experimental', 'deprecated']);
const minCounts = {
  dashboardModule: 20, accessControl: 6, dataIntegration: 8, mqttListener: 5,
  security: 3, observability: 4, extensions: 2, mqttConcept: 12, addonFeature: 8,
};
const LEGACY_MARKERS = ['4.x', 'v4', '4.4', '4.3', '舊版', 'legacy', 'deprecated', '已棄用', '被棄用', '棄用'];

function sourceIsPinned(value) {
  if (typeof value !== 'string') return false;
  let parsed;
  try { parsed = new URL(value); } catch { return false; }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'github.com' || parsed.username || parsed.password || parsed.search || parsed.hash) return false;
  const addon = new RegExp(`^/WOOWTECH/Woow_ha_emqx/(?:blob|tree)/${EXPECTED_ADDON}(?:/.*)?$`);
  const docs = new RegExp(`^/emqx/emqx-docs/(?:blob|tree)/${EXPECTED_DOCS}(?:/.*)?$`);
  const tag = new RegExp(`^/emqx/emqx/(?:blob|tree)/${EXPECTED_TAG}(?:/.*)?$`);
  return addon.test(parsed.pathname) || docs.test(parsed.pathname) || tag.test(parsed.pathname);
}

if (!fs.existsSync(MANIFEST_PATH)) {
  console.error(`✗ 缺少 ${path.relative(ROOT, MANIFEST_PATH)}`);
  process.exit(1);
}
let manifest;
try { manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')); }
catch (error) { console.error(`✗ manifest 不是有效 JSON：${error.message}`); process.exit(1); }

if (manifest.product !== 'EMQX') errors.push('manifest.product 必須是 EMQX');
if (manifest.emqxVersion !== '5.8.9') errors.push('emqxVersion 必須是 5.8.9');
if (manifest.addOnVersion !== '5.9.0') errors.push('addOnVersion 必須是 5.9.0');
if (manifest.sourceCommit !== EXPECTED_ADDON) errors.push('sourceCommit 未固定到 Woow_ha_emqx pinned commit');
if (manifest.docsCommit !== EXPECTED_DOCS) errors.push('docsCommit 未固定到 emqx-docs release-5.8');
if (manifest.emqxTagCommit !== EXPECTED_TAG) errors.push('emqxTagCommit 未固定到 EMQX v5.8.9 tag');

const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'chapters.json'), 'utf8'));
const chapterNumbers = new Set((cfg.chapters || []).map((chapter) => Number(chapter.num)));
const laneArg = argv.find((arg) => arg.startsWith('--chapters='));
let lane = null;
if (laneArg) {
  const match = laneArg.match(/^--chapters=(\d+)-(\d+)$/);
  if (!match) errors.push(`${laneArg}: 格式必須是 --chapters=N-M`);
  else lane = [Number(match[1]), Number(match[2])];
}

if (!Array.isArray(manifest.entries)) errors.push('entries 必須是陣列');
const entries = Array.isArray(manifest.entries) ? manifest.entries : [];
const ids = new Set();
const categoryNames = new Set();
for (const entry of entries) {
  const prefix = entry && entry.id ? entry.id : '(無 id)';
  for (const field of ['id', 'category', 'name', 'chapter', 'source', 'maturity']) {
    if (entry[field] === undefined || entry[field] === null || entry[field] === '') errors.push(`${prefix}: 缺少 ${field}`);
  }
  if (ids.has(entry.id)) errors.push(`${prefix}: id 重複`);
  ids.add(entry.id);
  const key = `${entry.category}\u0000${entry.name}`;
  if (categoryNames.has(key)) errors.push(`${prefix}: category/name 重複`);
  categoryNames.add(key);
  if (!allowedCategories.has(entry.category)) errors.push(`${prefix}: 未知 category ${entry.category}`);
  if (entry.id !== `${entry.category}:${entry.name}`) errors.push(`${prefix}: id 必須等於 category:name`);
  if (!chapterNumbers.has(Number(entry.chapter))) errors.push(`${prefix}: chapter ${entry.chapter} 不存在`);
  if (!allowedMaturity.has(entry.maturity)) errors.push(`${prefix}: maturity 值無效`);
  if (!sourceIsPinned(entry.source)) errors.push(`${prefix}: source 不是 allowlisted repository 的 pinned blob/tree URL`);
}
for (const [category, minimum] of Object.entries(minCounts)) {
  const count = entries.filter((entry) => entry.category === category).length;
  if (count < minimum) errors.push(`category ${category} 只有 ${count} 項，少於最低 ${minimum}`);
}

const forbiddenTerms = Array.isArray(manifest.forbiddenTerms) ? manifest.forbiddenTerms : [];
if (!forbiddenTerms.length) errors.push('forbiddenTerms 不可為空');
let htmlFiles;
if (htmlFixtureArg) {
  htmlFiles = [path.resolve(ROOT, htmlFixtureArg.slice('--html-fixture='.length))];
} else {
  htmlFiles = fs.readdirSync(ROOT).filter((name) => name.endsWith('.html')).map((name) => path.join(ROOT, name));
}
for (const file of htmlFiles) {
  if (!fs.existsSync(file)) { errors.push(`${path.relative(ROOT, file)}: HTML fixture 不存在`); continue; }
  const html = fs.readFileSync(file, 'utf8');
  for (const term of forbiddenTerms) {
    const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    for (const match of html.matchAll(re)) {
      const start = Math.max(0, match.index - 400);
      const end = Math.min(html.length, match.index + term.length + 400);
      const windowText = html.slice(start, end).toLowerCase();
      const legacyContext = LEGACY_MARKERS.some((marker) => windowText.includes(marker.toLowerCase()));
      if (!legacyContext) errors.push(`${path.relative(ROOT, file)}: 含疑似 EMQX 4.x 舊詞「${term}」（需標示為 4.x/legacy 才允許）`);
    }
  }
}

if (lane) {
  const selected = entries.filter((entry) => entry.chapter >= lane[0] && entry.chapter <= lane[1]);
  if (!selected.length) errors.push(`chapter lane ${lane[0]}-${lane[1]} 沒有 manifest 項目`);
}

if (errors.length) {
  console.error(`✗ check_feature_manifest 發現 ${errors.length} 個問題`);
  errors.forEach((error) => console.error(`  · ${error}`));
  process.exit(1);
}
console.log(`✓ check_feature_manifest：${entries.length} 項 EMQX 5.8.9 功能均有版本、成熟度、來源與章節落點${lane ? `；lane ${lane[0]}-${lane[1]} 已驗證` : ''}`);
