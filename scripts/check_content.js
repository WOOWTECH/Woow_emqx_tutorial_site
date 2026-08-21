#!/usr/bin/env node
/** Structural and editorial checks for generated tutorial chapters. */
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SOURCE_COMMITS = [
  '0ac58f38653589b854496944d82af2548b12f944', // Woow_ha_emqx add-on
  '37af6a1d6d5480e4293b4bbcb25b081e1e6aa41e', // emqx-docs release-5.8
  'a8319fe2390169e1f2483e3ec80dd01a6cdb233d', // emqx core v5.8.9 tag
];
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'chapters.json'), 'utf8'));
const listed = new Set((cfg.chapters || []).map((chapter) => chapter.file));
const listedPaths = new Set([...listed].map((file) => path.resolve(ROOT, file)));
const args = process.argv.slice(2);
const fixtureArg = args.find((arg) => arg.startsWith('--fixture='));
const positional = args.filter((arg) => !arg.startsWith('--'));

function resolveFiles() {
  if (fixtureArg) return [fixtureArg.slice('--fixture='.length)];
  if (positional.length) return positional;
  return [...listed];
}
function countDirectListItems(body) {
  let listDepth = 0;
  let count = 0;
  for (const match of String(body).matchAll(/<(\/?)\s*(ol|ul|li)\b[^>]*>/gi)) {
    const closing = match[1] === '/';
    const tag = match[2].toLowerCase();
    if ((tag === 'ol' || tag === 'ul') && !closing) listDepth += 1;
    else if ((tag === 'ol' || tag === 'ul') && closing) listDepth = Math.max(0, listDepth - 1);
    else if (tag === 'li' && !closing && listDepth === 1) count += 1;
  }
  return count;
}

const files = resolveFiles();
const css = fs.readFileSync(path.join(ROOT, 'assets/css/style.css'), 'utf8');
const validIcons = new Set([...css.matchAll(/section h2\[data-icon="([^"]+)"\]::before/g)].map((match) => match[1]));
const errors = [];
const emoji = /\p{Extended_Pictographic}/u;

for (const input of files) {
  const filePath = path.resolve(ROOT, input);
  const rel = path.relative(ROOT, filePath);
  const insideRoot = rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel));
  if (!insideRoot) {
    errors.push(`${input}: 路徑不可離開 repository root`);
    continue;
  }
  if (!fs.existsSync(filePath)) { errors.push(`${input}: 檔案不存在`); continue; }
  const realPath = fs.realpathSync(filePath);
  const realRel = path.relative(ROOT, realPath);
  const realInsideRoot = realRel === '' || (!realRel.startsWith(`..${path.sep}`) && realRel !== '..' && !path.isAbsolute(realRel));
  if (!realInsideRoot) {
    errors.push(`${input}: resolved path 不可離開 repository root`);
    continue;
  }
  if (!fixtureArg && positional.length && !listedPaths.has(filePath)) {
    errors.push(`${input}: positional 模式只接受 chapters.json 列出的精確章節路徑`);
    continue;
  }

  const html = fs.readFileSync(filePath, 'utf8');
  const sections = [...html.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/gi)];
  if (sections.length < 8 || sections.length > 12) errors.push(`${rel}: section 數量為 ${sections.length}，必須介於 8–12`);

  const ids = [];
  const byId = new Map();
  for (const section of sections) {
    const attrs = section[1];
    const body = section[2];
    const id = (attrs.match(/\bid="([A-Za-z0-9_]+)"/) || [])[1];
    const nav = (attrs.match(/\bdata-nav="([^"]+)"/) || [])[1];
    if (!id) errors.push(`${rel}: section 缺少合法 id`);
    else { ids.push(id); byId.set(id, body); }
    if (!nav) errors.push(`${rel}: section ${id || '(無 id)'} 缺少 data-nav`);
    const h2 = body.match(/<h2\b([^>]*)>/i);
    if (!h2) { errors.push(`${rel}: section ${id || '(無 id)'} 缺少 h2`); continue; }
    const icon = (h2[1].match(/\bdata-icon="([^"]+)"/) || [])[1];
    if (!icon) errors.push(`${rel}: section ${id || '(無 id)'} 的 h2 缺 data-icon`);
    else if (!validIcons.has(icon)) errors.push(`${rel}: data-icon="${icon}" 未定義於 style.css`);
  }
  [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))].forEach((id) => errors.push(`${rel}: 重複 section id="${id}"`));

  const faqBody = byId.get('faq');
  if (!faqBody) {
    errors.push(`${rel}: 缺少 id="faq" section`);
  } else {
    const faqCount = (faqBody.match(/<details\b[^>]*\bclass="[^"]*\bfaq\b[^"]*"/gi) || []).length;
    if (faqCount < 4) errors.push(`${rel}: faq section 只有 ${faqCount} 則 FAQ，至少需要 4 則`);
  }

  const troubleshootBody = byId.get('troubleshoot');
  if (!troubleshootBody) {
    errors.push(`${rel}: 缺少 id="troubleshoot" section`);
  } else if (countDirectListItems(troubleshootBody) < 4) {
    errors.push(`${rel}: troubleshoot 只有 ${countDirectListItems(troubleshootBody)} 個頂層清單項目，至少需要 4 個`);
  }

  const stepsBody = byId.get('steps');
  if (!stepsBody) {
    errors.push(`${rel}: 缺少 id="steps" section`);
  } else {
    const ol = stepsBody.match(/<ol\b[^>]*\bclass="[^"]*\bsteps\b[^"]*"[^>]*>([\s\S]*?)<\/ol>/i);
    if (!ol) errors.push(`${rel}: steps section 必須包含 <ol class="steps">`);
    else if (countDirectListItems(ol[0]) < 4) errors.push(`${rel}: steps 只有 ${countDirectListItems(ol[0])} 個頂層步驟，至少需要 4 步`);
  }

  const sourcesBody = byId.get('sources');
  if (!sourcesBody) {
    errors.push(`${rel}: 缺少 id="sources" section`);
  } else {
    const hrefs = [...sourcesBody.matchAll(/href="(https:\/\/[^"#?\s]+[^"\s]*)"/gi)].map((match) => match[1]);
    if (!hrefs.length) errors.push(`${rel}: sources section 至少需要一個 https 來源`);
    if (!hrefs.some((href) => SOURCE_COMMITS.some((commit) => href.includes(commit)))) {
      errors.push(`${rel}: sources section 至少需要一個固定到 EMQX pinned commit 的來源`);
    }
  }

  const visibleText = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');
  if (emoji.test(visibleText)) errors.push(`${rel}: 內容含 emoji`);
  if (/您/.test(visibleText)) errors.push(`${rel}: 請使用「你」，不要使用「您」`);
}

if (errors.length) {
  console.error(`✗ check_content 發現 ${errors.length} 個問題`);
  errors.forEach((error) => console.error(`  · ${error}`));
  process.exit(1);
}
const mode = fixtureArg ? 'fixture' : positional.length ? 'positional' : 'global';
console.log(`✓ check_content (${mode})：${files.length} 個檔案符合內容結構規格`);
