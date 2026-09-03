#!/usr/bin/env node
/** Fail when publishable text appears to contain live credentials or EMQX/MQTT secrets. */
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const TEXT_EXT = new Set(['.html', '.js', '.json', '.md', '.yml', '.yaml', '.txt', '.xml', '.css', '.svg']);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'artifacts', 'docs']);
const SKIP_FILES = new Set(['.env', 'storage_state.json']);
const FIXTURE_PREFIX = path.join('tests', 'fixtures', 'sensitive-');
const PLACEHOLDER = /(?:your[-_ ]?(?:password|token|key|secret)|example|placeholder|replace[-_ ]?me|change[-_ ]?me|redacted|x{3,}|<[^>]+>|&lt;[^&]+&gt;|\.{3}|你的(?:密碼|權杖|金鑰)|假值|例如|範例|示例|YOUR_TOKEN|YOUR_PASSWORD|YOUR_KEY)/i;
const ALLOWED_PRIVATE = new Set([
  '192.168.0.1', '192.168.1.1', '192.168.1.10', '192.168.1.50', '192.168.1.100',
  '10.0.0.1', '10.0.0.10', '10.0.0.50', '10.0.0.100', '172.16.0.1',
]);
const DOCUMENTED_DEFAULTS = new Set(['public', 'admin', 'true', 'false', 'on', 'off']);
const errors = [];
const fixtureArg = process.argv.slice(2).find((arg) => arg.startsWith('--fixture='));

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (SKIP_FILES.has(entry.name)) continue;
    else if (TEXT_EXT.has(path.extname(entry.name).toLowerCase())) files.push(full);
  }
  return files;
}
function report(file, lineNo, label) { errors.push(`${path.relative(ROOT, file)}:${lineNo}: ${label}`); }
function unquote(value) { return value.replace(/^["']|["'],?$/g, '').trim(); }
function isSecretValue(value, minimum = 6) {
  const clean = unquote(value);
  if (DOCUMENTED_DEFAULTS.has(clean.toLowerCase())) return false;
  return clean.length >= minimum && !PLACEHOLDER.test(clean);
}
function normalizedDigits(value) { return String(value).replace(/\D/g, ''); }
function privateIpv6Kind(value) {
  const address = value.replace(/\/\d+$/, '');
  const first = Number.parseInt(address.split(':')[0], 16);
  if (!Number.isFinite(first)) return null;
  if ((first & 0xfe00) === 0xfc00) return 'IPv6 ULA';
  if ((first & 0xffc0) === 0xfe80) return 'IPv6 link-local';
  return null;
}

let files;
if (fixtureArg) {
  files = [path.resolve(ROOT, fixtureArg.slice('--fixture='.length))];
} else {
  files = walk(ROOT).filter((file) => {
    const rel = path.relative(ROOT, file);
    return rel !== 'scripts/check_sensitive.js' && !rel.startsWith(FIXTURE_PREFIX);
  });
}

for (const file of files) {
  if (!fs.existsSync(file)) { errors.push(`${path.relative(ROOT, file)}: fixture 不存在`); continue; }
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    const lineNo = index + 1;
    if (/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/.test(line)) report(file, lineNo, '疑似 JWT／Home Assistant access token');

    // EMQX / HA / add-on env vars with a real value
    const envRe = /["']?(EMQX_NODE__COOKIE|EMQX_DASHBOARD__DEFAULT_PASSWORD|EMQX_AUTHENTICATION__[A-Z0-9_]*PASSWORD|HA_TOKEN|HA_PASS)["']?\s*(?:=|:)\s*(?:["']([^"']+)["']|([^\s,#;`"'、]+))/gi;
    for (const match of line.matchAll(envRe)) {
      const value = match[2] || match[3] || '';
      if (isSecretValue(value, 6)) report(file, lineNo, `${match[1]} 含實值`);
    }

    // ngrok authtoken lookalikes (v3 tokens are long, start with 2)
    const ngrokRe = /["']?(?:ngrok[ _-]?authtoken|NGROK_AUTHTOKEN|authtoken)["']?\s*(?:=|:)\s*["']?([0-9A-Za-z_\-]{20,})["']?/gi;
    for (const match of line.matchAll(ngrokRe)) {
      if (isSecretValue(match[1], 20)) report(file, lineNo, 'ngrok authtoken 含實值');
    }

    // generic password key (HOCON / JSON / YAML) with a real value
    const passwordKeyRe = /(?:^|[\s{,])["']?password["']?\s*[:=]\s*["']([^"']{6,})["']/gi;
    for (const match of line.matchAll(passwordKeyRe)) {
      if (isSecretValue(match[1], 6)) report(file, lineNo, 'password 欄位含實值');
    }

    // API key fields
    const apiKeyRe = /["']?(?:api[ _-]?key|x-api-key|api_key|access[ _-]?key)["']?\s*(?:=|:)\s*["']?([A-Za-z0-9_\-]{16,})["']?/gi;
    for (const match of line.matchAll(apiKeyRe)) {
      if (isSecretValue(match[1], 16)) report(file, lineNo, 'API key 欄位含實值');
    }

    // MQTT / WebSocket connection strings with embedded credentials
    if (/\b(?:mqtt|mqtts|ws|wss):\/\/[^/\s@:]+:[^/\s@]+@/i.test(line)) report(file, lineNo, 'MQTT 連線字串含帳密');

    // TLS private key blocks
    if (/-----BEGIN\s+(?:[A-Z][A-Z0-9 ]*\s+)?PRIVATE KEY-----/.test(line)) report(file, lineNo, 'TLS 私鑰區塊');

    const authRe = /["']?Authorization["']?\s*(?:=|:)\s*(?:["']([^"']+)["']|((?:(?:Bearer|Basic)\s+)?[^\s,;`]+))/gi;
    const quotedAuthorizationIdentity = /^\s*"Authorization"\s*:\s*"Authorization"\s*,?\s*$/.test(line);
    for (const match of line.matchAll(authRe)) {
      const value = match[1] || match[2] || '';
      const credential = value.replace(/^(?:Bearer|Basic)\s+/i, '');
      // Only an exact quoted glossary/translation identity mapping is exempt.
      if (!quotedAuthorizationIdentity && isSecretValue(credential, 8)) report(file, lineNo, 'Authorization header 含實值');
    }

    const cookieRe = /["']?(?:Cookie|Set-Cookie)["']?\s*(?:=|:)\s*(?:["']([^"']+)["']|([^\s,;]+=[^\s,;]+))/gi;
    for (const match of line.matchAll(cookieRe)) {
      const value = match[1] || match[2] || '';
      if (isSecretValue(value, 8)) report(file, lineNo, 'Cookie header 含實值');
    }
    if (/"cookies"\s*:\s*\[\s*\{/i.test(line)) report(file, lineNo, 'storage state cookie 內容');

    for (const match of line.matchAll(/\b(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})\b/g)) {
      if (!ALLOWED_PRIVATE.has(match[0])) report(file, lineNo, `未核准的私有 IP ${match[0]}`);
    }
    for (const match of line.matchAll(/\b[0-9a-f]{2,4}:[0-9a-f:./]+\b/gi)) {
      const canonicalPrefix = /^(?:fc00::\/7|fe80::\/10)$/i.test(match[0]);
      const kind = privateIpv6Kind(match[0]);
      if (kind && !canonicalPrefix && !PLACEHOLDER.test(line)) report(file, lineNo, `${kind} 位址 ${match[0]}`);
    }
    if (/\b(?:woowtech-ha|ha-test|emqx-test|staging-ha|emqx\.woowtech\.io)\.woowtech\.io\b/i.test(line)) report(file, lineNo, '測試環境 hostname');
  });
}

if (errors.length) {
  console.error(`✗ check_sensitive 發現 ${errors.length} 個疑似敏感值`);
  errors.forEach((error) => console.error(`  · ${error}`));
  process.exit(1);
}
console.log(`✓ check_sensitive${fixtureArg ? ' (fixture)' : ''}：未在文字檔發現可辨識的秘密或測試環境資料`);
