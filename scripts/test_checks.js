#!/usr/bin/env node
/** Deterministic regression tests for the EMQX release checkers. */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { validateHtmlLinks } = require('./lib/html_links');
const ROOT = path.resolve(__dirname, '..');
let failures = 0;
let cases = 0;

function record(label, passed, detail = '') {
  cases += 1;
  if (!passed) { failures += 1; console.error(`✗ ${label}${detail ? `: ${detail}` : ''}`); }
  else console.log(`✓ ${label}`);
}
function run(label, args, expectedStatus, expectedText = []) {
  cases += 1;
  const result = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' });
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  const statusOk = result.status === expectedStatus;
  const textOk = expectedText.every((text) => output.includes(text));
  if (!statusOk || !textOk) {
    failures += 1;
    console.error(`✗ ${label}: expected status ${expectedStatus}, got ${result.status}`);
    if (!textOk) console.error(`  missing output: ${expectedText.filter((text) => !output.includes(text)).join(', ')}`);
    console.error(output.trim());
  } else console.log(`✓ ${label}`);
  return { result, output };
}

// Brand spot token stays intact.
const sharedCss = fs.readFileSync(path.join(ROOT, 'assets', 'css', 'style.css'), 'utf8');
const brand = (sharedCss.match(/--ww-blue\s*:\s*(#[0-9a-f]{6})/i) || [])[1];
record('brand spot token remains #6183FC', brand === '#6183FC', brand || 'missing');

// check_content
run('valid chapter fixture passes', ['scripts/check_content.js', '--fixture=tests/fixtures/valid-chapter.html'], 0);
run('listed positional chapter passes', ['scripts/check_content.js', 'ch1_overview.html'], 0);
run('non-chapter positional path is rejected', ['scripts/check_content.js', 'tests/fixtures/valid-chapter.html'], 1,
  ['positional 模式只接受 chapters.json 列出的精確章節路徑']);
const externalFixture = path.join(os.tmpdir(), `emqx-external-${process.pid}.html`);
fs.writeFileSync(externalFixture, fs.readFileSync(path.join(ROOT, 'tests/fixtures/valid-chapter.html')));
run('external positional path is rejected', ['scripts/check_content.js', externalFixture], 1, ['路徑不可離開 repository root']);
fs.rmSync(externalFixture, { force: true });
run('invalid chapter rejects structural shortcuts', ['scripts/check_content.js', '--fixture=tests/fixtures/invalid-chapter.html'], 1,
  ['faq section 只有', '缺少 id="troubleshoot"', 'steps section 必須包含', '缺少 id="sources"']);
run('nested list items cannot inflate direct counts', ['scripts/check_content.js', '--fixture=tests/fixtures/nested-list-chapter.html'], 1,
  ['steps 只有 1 個頂層步驟', 'troubleshoot 只有 1 個頂層清單項目']);

// check_sensitive
run('placeholders and documented defaults pass secret scan', ['scripts/check_sensitive.js', '--fixture=tests/fixtures/sensitive-negative.txt'], 0);
run('EMQX/MQTT secrets fail scan', ['scripts/check_sensitive.js', '--fixture=tests/fixtures/sensitive-positive.txt'], 1,
  ['EMQX_NODE__COOKIE 含實值', 'ngrok authtoken 含實值', 'password 欄位含實值', 'API key 欄位含實值',
   'MQTT 連線字串含帳密', 'TLS 私鑰區塊', '未核准的私有 IP', 'IPv6 ULA', 'IPv6 link-local', '測試環境 hostname']);

// shared link resolver
const linkDir = fs.mkdtempSync(path.join(os.tmpdir(), 'emqx-links-'));
fs.mkdirSync(path.join(linkDir, 'assets'));
fs.writeFileSync(path.join(linkDir, 'assets/site.css'), 'body{}');
fs.writeFileSync(path.join(linkDir, 'b.html'), '<div id="target"></div>');
fs.writeFileSync(path.join(linkDir, 'a.html'), [
  '<div id="local"></div>',
  "<a href='b.html?mode=print#target'>single quote and query</a>",
  '<a href="/guide/b.html#target">base-prefixed root relative</a>',
  '<link href="/assets/site.css?v=1" />',
  '<a href="#local">same page</a>',
  '<a href="mailto:test@example.invalid">mail</a><a href="tel:+886000000000">tel</a>',
  '<img src="data:image/gif;base64,AAAA" />',
].join('\n'));
let linkErrors = validateHtmlLinks({ root: linkDir, files: ['a.html', 'b.html'], basePrefix: '/guide/' });
record('shared resolver accepts query, root-relative, same/cross-page fragments and single quotes', linkErrors.length === 0, linkErrors.join('; '));
fs.writeFileSync(path.join(linkDir, 'bad.html'), '<a href="b.html#missing">bad fragment</a><a href="../escape.html">escape</a>');
linkErrors = validateHtmlLinks({ root: linkDir, files: ['bad.html'], basePrefix: '/guide/' });
record('shared resolver rejects missing cross-page fragment and traversal',
  linkErrors.some((error) => error.includes('沒有對應 id')) && linkErrors.some((error) => error.includes('穿越網站根目錄')), linkErrors.join('; '));
fs.rmSync(linkDir, { recursive: true, force: true });

const chapterPath = path.join(ROOT, 'ch1_overview.html');
const chapterOriginal = fs.readFileSync(chapterPath, 'utf8');
try {
  fs.writeFileSync(chapterPath, chapterOriginal.replace('</main>', '<a href="missing-regression.html#none">bad</a></main>'));
  run('check_links integration rejects invalid file/fragment', ['scripts/check_links.js'], 1, ['missing-regression.html#none']);
  run('build_nav shared resolver rejects invalid file/fragment', ['scripts/build_nav.js', '--check'], 1, ['missing-regression.html#none']);
} finally {
  fs.writeFileSync(chapterPath, chapterOriginal);
}
run('check_links returns to green after negative fixture restore', ['scripts/check_links.js'], 0);

const chaptersPath = path.join(ROOT, 'chapters.json');
const chapterStat = fs.statSync(chaptersPath);
try {
  const future = new Date(chapterStat.mtimeMs + 86_400_000);
  fs.utimesSync(chaptersPath, chapterStat.atime, future);
  run('chapters.json mtime cannot cause build_nav drift', ['scripts/build_nav.js', '--check'], 0);
} finally {
  fs.utimesSync(chaptersPath, chapterStat.atime, chapterStat.mtime);
}

// docker build context contract
run('current Docker public copy contract passes', ['scripts/check_dockerfile.js'], 0);
const tempDir = fs.mkdtempSync(path.join(ROOT, 'tests', '.tmp-checks-'));
const badDockerPath = path.join(tempDir, 'Dockerfile.bad');
fs.writeFileSync(badDockerPath, fs.readFileSync(path.join(ROOT, 'Dockerfile'), 'utf8').replace('COPY *.html ./', 'COPY . ./'));
run('broad Docker COPY context is rejected', ['scripts/check_dockerfile.js', `--dockerfile=${badDockerPath}`], 1,
  ['COPY source 不可擴大或逃逸 context', '缺少 public COPY source：*.html']);
const dockerignoreText = fs.readFileSync(path.join(ROOT, '.dockerignore'), 'utf8');
const missingDefaultDenyPath = path.join(tempDir, '.dockerignore.missing-default');
fs.writeFileSync(missingDefaultDenyPath, dockerignoreText.split(/\r?\n/).filter((line) => line.trim() !== '*').join('\n'));
run('missing Docker default-deny rule is rejected', ['scripts/check_dockerfile.js', `--dockerignore=${missingDefaultDenyPath}`], 1,
  ['必須以 * default-deny 規則開始']);
const addDockerPath = path.join(tempDir, 'Dockerfile.add');
fs.writeFileSync(addDockerPath, `${fs.readFileSync(path.join(ROOT, 'Dockerfile'), 'utf8')}\nADD .env /run/secret\n`);
run('malicious Docker ADD is rejected', ['scripts/check_dockerfile.js', `--dockerfile=${addDockerPath}`], 1,
  ['禁止 ADD instruction']);
const extraNegationPath = path.join(tempDir, '.dockerignore.extra-negation');
fs.writeFileSync(extraNegationPath, `${dockerignoreText}!/.env\n`);
run('extra root secret allowlist is rejected', ['scripts/check_dockerfile.js', `--dockerignore=${extraNegationPath}`], 1,
  ['含未核准規則：!/.env']);
const rawReincludePath = path.join(tempDir, '.dockerignore.raw-reinclude');
fs.writeFileSync(rawReincludePath, `${dockerignoreText}!assets/screenshots/ch1/secret.raw.png\n`);
run('raw screenshot re-inclusion is rejected', ['scripts/check_dockerfile.js', `--dockerignore=${rawReincludePath}`], 1,
  ['不得重新納入 raw screenshot']);

// EMQX feature manifest
run('current EMQX feature manifest passes', ['scripts/check_feature_manifest.js'], 0);
run('EMQX 4.x legacy reference passes blacklist', ['scripts/check_feature_manifest.js', '--html-fixture=tests/fixtures/emqx4x-legacy.html'], 0);
run('EMQX 4.x Modules-as-current is rejected', ['scripts/check_feature_manifest.js', '--html-fixture=tests/fixtures/emqx4x-blacklist.html'], 1,
  ['含疑似 EMQX 4.x 舊詞「Modules」']);

const baseManifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'emqx-5.8.9-feature-manifest.json'), 'utf8'));
function mutatedManifest(label, mutate, expected) {
  const copy = structuredClone(baseManifest);
  mutate(copy);
  const file = path.join(tempDir, `${label.replace(/[^a-z0-9]+/gi, '-')}.json`);
  fs.writeFileSync(file, `${JSON.stringify(copy, null, 2)}\n`);
  run(label, ['scripts/check_feature_manifest.js', `--manifest=${file}`], 1, expected);
}
mutatedManifest('wrong EMQX version is rejected', (copy) => { copy.emqxVersion = '5.7.0'; }, ['emqxVersion 必須是 5.8.9']);
mutatedManifest('unpinned source commit is rejected', (copy) => { copy.sourceCommit = 'deadbeef'; }, ['sourceCommit 未固定']);
mutatedManifest('duplicate category/name is rejected', (copy) => {
  copy.entries[1].category = copy.entries[0].category;
  copy.entries[1].name = copy.entries[0].name;
  copy.entries[1].id = `${copy.entries[0].category}:${copy.entries[0].name}`;
}, ['category/name 重複']);
mutatedManifest('mismatched id is rejected', (copy) => { copy.entries[0].id = 'dashboardModule:forged'; }, ['id 必須等於 category:name']);
mutatedManifest('unknown chapter is rejected', (copy) => { copy.entries[0].chapter = 99; }, ['chapter 99 不存在']);
mutatedManifest('unknown category is rejected', (copy) => { copy.entries[0].category = 'futureFeature'; }, ['未知 category futureFeature']);
mutatedManifest('forged source URL is rejected', (copy) => {
  copy.entries[0].source = 'https://evil.invalid/emqx/emqx-docs/blob/37af6a1d6d5480e4293b4bbcb25b081e1e6aa41e/x.md';
}, ['source 不是 allowlisted']);
mutatedManifest('category dropping below minimum is rejected', (copy) => {
  copy.entries = copy.entries.filter((entry) => entry.category !== 'extensions');
}, ['category extensions 只有 0 項']);
mutatedManifest('empty forbiddenTerms is rejected', (copy) => { copy.forbiddenTerms = []; }, ['forbiddenTerms 不可為空']);

fs.rmSync(tempDir, { recursive: true, force: true });

if (failures) {
  console.error(`✗ test_checks：${failures}/${cases} 個 regression case 失敗`);
  process.exit(1);
}
console.log(`✓ test_checks：${cases} 個 regression cases 全部通過`);
