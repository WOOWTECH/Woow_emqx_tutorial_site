#!/usr/bin/env node
/** Static regression gate for the public-site Docker build context and COPY allowlist. */
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const dockerArg = argv.find((arg) => arg.startsWith('--dockerfile='));
const ignoreArg = argv.find((arg) => arg.startsWith('--dockerignore='));
const dockerPath = dockerArg ? path.resolve(ROOT, dockerArg.slice('--dockerfile='.length)) : path.join(ROOT, 'Dockerfile');
const ignorePath = ignoreArg ? path.resolve(ROOT, ignoreArg.slice('--dockerignore='.length)) : path.join(ROOT, '.dockerignore');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'chapters.json'), 'utf8'));
const errors = [];

function insideRoot(candidate) {
  const rel = path.relative(ROOT, candidate);
  return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel));
}
function readRequired(file, label) {
  if (!insideRoot(file)) { errors.push(`${label} 不可離開 repository root`); return ''; }
  if (!fs.existsSync(file)) { errors.push(`缺少 ${label}`); return ''; }
  return fs.readFileSync(file, 'utf8');
}
function logicalLines(text) {
  return text.replace(/\\\r?\n\s*/g, ' ').split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
}
function shellWords(value) {
  const words = [];
  for (const match of value.matchAll(/"([^"]*)"|'([^']*)'|([^\s]+)/g)) words.push(match[1] ?? match[2] ?? match[3]);
  return words;
}
function parseCopy(line) {
  const body = line.replace(/^COPY\s+/i, '').trim();
  if (body.startsWith('[')) {
    try {
      const values = JSON.parse(body);
      return { flags: [], sources: values.slice(0, -1), destination: values.at(-1) };
    } catch { errors.push(`Dockerfile COPY JSON 語法無效：${line}`); return null; }
  }
  const words = shellWords(body);
  const flags = [];
  while (words[0]?.startsWith('--')) flags.push(words.shift());
  if (words.length < 2) { errors.push(`Dockerfile COPY 缺少 source/destination：${line}`); return null; }
  return { flags, sources: words.slice(0, -1), destination: words.at(-1) };
}

const dockerfile = readRequired(dockerPath, 'Dockerfile');
const dockerignore = readRequired(ignorePath, '.dockerignore');
const instructions = logicalLines(dockerfile);
for (const line of instructions.filter((candidate) => /^ADD(?:\s|$)/i.test(candidate))) {
  errors.push(`Dockerfile 禁止 ADD instruction：${line}`);
}
const copies = instructions.filter((line) => /^COPY\s/i.test(line)).map(parseCopy).filter(Boolean);
const allowedSources = new Set(['*.html', 'assets', 'robots.txt', 'sitemap.xml', 'LICENSE']);
const seenSources = new Set();
for (const copy of copies) {
  if (copy.flags.length) errors.push(`Dockerfile COPY 不允許 flags：${copy.flags.join(' ')}`);
  for (const source of copy.sources) {
    seenSources.add(source.replace(/\/$/, ''));
    if (source === '.' || source === './' || source.includes('..') || path.isAbsolute(source)) {
      errors.push(`Dockerfile COPY source 不可擴大或逃逸 context：${source}`);
    } else if (!allowedSources.has(source.replace(/\/$/, ''))) {
      errors.push(`Dockerfile COPY source 不在 public allowlist：${source}`);
    }
  }
}
for (const source of allowedSources) if (!seenSources.has(source)) errors.push(`Dockerfile 缺少 public COPY source：${source}`);
if (!copies.some((copy) => copy.sources.length === 1 && copy.sources[0] === '*.html' && copy.destination === './')) {
  errors.push('Dockerfile 必須用 COPY *.html ./ 包含 22 章與 hub 手冊');
}
if (!copies.some((copy) => copy.sources.length === 1 && copy.sources[0].replace(/\/$/, '') === 'assets' && copy.destination === './assets')) {
  errors.push('Dockerfile 必須把 assets 複製到 ./assets');
}

const expectedIgnoreRules = [
  '*',
  '!Dockerfile',
  '!.dockerignore',
  '!*.html',
  '!assets/',
  '!assets/**',
  'assets/**/*.raw.png',
  '!robots.txt',
  '!sitemap.xml',
  '!LICENSE',
];
const ignoreRules = dockerignore.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
if (ignoreRules[0] !== '*') errors.push('.dockerignore 必須以 * default-deny 規則開始');
for (const rule of expectedIgnoreRules) {
  if (!ignoreRules.includes(rule)) errors.push(`.dockerignore 缺少必要 default-deny allowlist 規則：${rule}`);
}
for (const rule of ignoreRules) {
  if (!expectedIgnoreRules.includes(rule)) errors.push(`.dockerignore 含未核准規則：${rule}`);
  if (rule.startsWith('!') && /\.raw\.png(?:$|\*)/i.test(rule)) errors.push(`.dockerignore 不得重新納入 raw screenshot：${rule}`);
}
const hasExactIgnoreRules = ignoreRules.length === expectedIgnoreRules.length
  && expectedIgnoreRules.every((rule, index) => ignoreRules[index] === rule);
if (!hasExactIgnoreRules) {
  errors.push('.dockerignore default-deny allowlist 必須與核准規則逐行、等長且同順序完全相符');
}

for (const file of ['index.html', 'tutorial.html', 'sales.html', 'prompts.html', 'skills.html', '404.html', ...(cfg.chapters || []).map((chapter) => chapter.file)]) {
  if (!fs.existsSync(path.join(ROOT, file))) errors.push(`缺少 Docker build 所需頁面 ${file}`);
}
if ((cfg.chapters || []).length !== 22) errors.push(`chapters.json 應有 22 章，目前為 ${(cfg.chapters || []).length}`);

if (errors.length) {
  console.error(`✗ check_dockerfile 發現 ${errors.length} 個問題`);
  errors.forEach((error) => console.error(`  · ${error}`));
  process.exit(1);
}
console.log(`✓ check_dockerfile：解析 ${copies.length} 個 COPY；public sources 已 allowlist，raw/authoring inputs 已排除`);
