#!/usr/bin/env node
/**
 * check.mjs — verificacion determinista del repo tras adaptar la plantilla.
 * Node >= 18 stdlib puro, sin dependencias. Exit 0 solo si TODO pasa.
 *
 * Checks:
 *  1. Sintaxis JS (node --check) de todos los js/**\/*.js
 *  2. content.js parsea y PF.data tiene las claves requeridas por las secciones
 *     habilitadas (segun portfolio.config.json si existe; si no, set baseline)
 *  3. Cero CDN: ningun http(s) en src/href de <script>/<link> (salvo fonts de Google)
 *  4. Cero emojis en el HTML servido
 *  5. Tokens: el :root de css/main.css contiene todos los tokens obligatorios
 *  6. Secciones/menu consistentes: cada data-target del menu existe como <section id>
 *  7. Imagenes/medios referenciados en content.js existen en disco
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HARNESS_DIR = resolve(__dirname, '..');
const REPO_ROOT = resolve(HARNESS_DIR, '..');
const CONFIG_PATH = resolve(HARNESS_DIR, 'portfolio.config.json');

const HTML_FILES = ['index.html', 'logros.html', 'proyectos.html', 'formacion.html'];
const CSS_PATH = resolve(REPO_ROOT, 'css/main.css');
const CONTENT_PATH = resolve(REPO_ROOT, 'js/content.js');

// Hosts permitidos en <link>/<script> (solo Google Fonts). Documentado y explicito.
const ALLOWED_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

// Glifos no-emoji usados intencionalmente en el HTML (no deben marcarse).
// U+2715 (✕) es el boton de cerrar menu; es un glifo tipografico, no un emoji.
const GLYPH_WHITELIST = new Set([0x2715]);

const MANDATORY_TOKENS = [
  '--bg-primary', '--bg-secondary', '--bg-terminal',
  '--green-pure', '--green-bright', '--green-mid', '--green-soft', '--green-glow',
  '--cyan-pure', '--cyan-bright', '--cyan-mid', '--cyan-soft', '--cyan-glow',
  '--red-accent', '--yellow-accent', '--white', '--gray-text', '--gray-dim'
];

// seccion habilitada -> claves de PF.data requeridas
const SECTION_KEYS = {
  home: ['contact'],
  about: ['about', 'technologies'],
  logros: ['logros'],
  proyectos: ['projects'],
  formacion: ['formacion'],
  contacto: ['contact', 'socials3d']
};
const BASELINE_KEYS = ['contact', 'socials3d', 'about', 'technologies', 'projects', 'logros', 'formacion', 'typingSentences'];

const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const DIM = (s) => `\x1b[2m${s}\x1b[0m`;

const results = [];
function pass(name) { results.push({ name, ok: true, msgs: [] }); }
function failCheck(name, msgs) { results.push({ name, ok: false, msgs }); }

function walkJS(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walkJS(p));
    else if (e.endsWith('.js')) out.push(p);
  }
  return out;
}

// -------------------------------------------------------------------------
// 1. Sintaxis JS
// -------------------------------------------------------------------------
function checkSyntax() {
  const files = walkJS(resolve(REPO_ROOT, 'js'));
  const bad = [];
  for (const f of files) {
    try {
      execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
    } catch (e) {
      bad.push(`${f.replace(REPO_ROOT + '/', '')}: ${String(e.stderr || e.message).split('\n')[0]}`);
    }
  }
  if (bad.length) failCheck('1. Sintaxis JS', bad);
  else pass(`1. Sintaxis JS (${files.length} archivos)`);
}

// -------------------------------------------------------------------------
// 2. content.js -> PF.data con claves requeridas
// -------------------------------------------------------------------------
function loadPFData() {
  const src = readFileSync(CONTENT_PATH, 'utf8');
  // content.js hace `window.PF = window.PF || {}` y luego usa `PF` a secas (global
  // implicito del navegador). Ejecutamos en un contexto vm donde `window` ES el global,
  // de modo que `window.PF` y `PF` refieran al mismo objeto.
  const sandbox = {};
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'content.js' });
  const PF = sandbox.PF;
  if (!PF || !PF.data) throw new Error('window.PF.data no quedo definido tras evaluar content.js');
  return PF.data;
}

function requiredKeys() {
  const cfg = existsSync(CONFIG_PATH) ? JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) : null;
  if (!cfg || !Array.isArray(cfg.sections)) return BASELINE_KEYS;
  const keys = new Set();
  for (const s of cfg.sections) {
    if (s && s.enabled && SECTION_KEYS[s.id]) SECTION_KEYS[s.id].forEach((k) => keys.add(k));
  }
  return [...keys];
}

function checkContent() {
  let data;
  try {
    data = loadPFData();
  } catch (e) {
    failCheck('2. content.js / PF.data', [e.message]);
    return null;
  }
  const need = requiredKeys();
  const missing = need.filter((k) => {
    const v = data[k];
    if (v == null) return true;
    if (Array.isArray(v) && v.length === 0) return true;
    return false;
  });
  if (missing.length) failCheck('2. content.js / PF.data', missing.map((k) => `falta o esta vacia PF.data.${k}`));
  else pass(`2. content.js / PF.data (${need.length} claves)`);
  return data;
}

// -------------------------------------------------------------------------
// 3. Cero CDN
// -------------------------------------------------------------------------
function checkNoCDN() {
  const bad = [];
  const tagRe = /<(script|link)\b[^>]*>/gi;
  for (const f of HTML_FILES) {
    const html = readFileSync(resolve(REPO_ROOT, f), 'utf8');
    let m;
    while ((m = tagRe.exec(html))) {
      const tag = m[0];
      const url = (tag.match(/\b(?:src|href)\s*=\s*["']([^"']+)["']/i) || [])[1];
      if (!url || !/^https?:\/\//i.test(url)) continue;
      const host = url.replace(/^https?:\/\//i, '').split('/')[0];
      if (!ALLOWED_HOSTS.includes(host)) bad.push(`${f}: ${url}`);
    }
  }
  if (bad.length) failCheck('3. Cero CDN', ['recursos externos no permitidos:', ...bad]);
  else pass('3. Cero CDN (solo Google Fonts permitido)');
}

// -------------------------------------------------------------------------
// 4. Cero emojis en el HTML
// -------------------------------------------------------------------------
function isEmoji(cp) {
  if (GLYPH_WHITELIST.has(cp)) return false;
  return (
    (cp >= 0x2600 && cp <= 0x27bf) || // simbolos misc + dingbats (✅ ❌ ✨ ...)
    (cp >= 0x2b00 && cp <= 0x2bff) || // estrellas / flechas ext (⭐ ...)
    (cp >= 0x1f000 && cp <= 0x1faff) || // pictogramas, emoticonos, transporte, banderas
    cp === 0xfe0f // variation selector-16 (presentacion emoji)
  );
}

function checkNoEmoji() {
  const bad = [];
  for (const f of HTML_FILES) {
    const html = readFileSync(resolve(REPO_ROOT, f), 'utf8');
    const lines = html.split('\n');
    lines.forEach((line, i) => {
      for (const ch of line) {
        const cp = ch.codePointAt(0);
        if (isEmoji(cp)) bad.push(`${f}:${i + 1}: U+${cp.toString(16).toUpperCase()} ${JSON.stringify(ch)}`);
      }
    });
  }
  if (bad.length) failCheck('4. Cero emojis', ['usa iconos SVG en su lugar:', ...bad]);
  else pass('4. Cero emojis en el HTML');
}

// -------------------------------------------------------------------------
// 5. Tokens obligatorios en :root
// -------------------------------------------------------------------------
function checkTokens() {
  const css = readFileSync(CSS_PATH, 'utf8');
  const start = css.indexOf(':root');
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const block = start < 0 ? '' : css.slice(open, close);
  const missing = MANDATORY_TOKENS.filter((t) => !new RegExp(t.replace(/-/g, '\\-') + ':').test(block));
  if (missing.length) failCheck('5. Tokens :root', missing.map((t) => `falta el token ${t}`));
  else pass(`5. Tokens :root (${MANDATORY_TOKENS.length} tokens)`);
}

// -------------------------------------------------------------------------
// 6. Secciones/menu consistentes (index.html)
// -------------------------------------------------------------------------
function checkSections() {
  const html = readFileSync(resolve(REPO_ROOT, 'index.html'), 'utf8');
  const targets = [...html.matchAll(/data-target=["']([^"']+)["']/g)].map((m) => m[1]);
  const ids = new Set([...html.matchAll(/<section\b[^>]*\bid=["']([^"']+)["']/g)].map((m) => m[1]));
  const bad = targets.filter((t) => !ids.has(t)).map((t) => `el menu apunta a #${t} pero no existe <section id="${t}">`);
  if (bad.length) failCheck('6. Secciones/menu', bad);
  else pass(`6. Secciones/menu (${targets.length} enlaces del menu)`);
}

// -------------------------------------------------------------------------
// 7. Imagenes/medios de content.js existen
// -------------------------------------------------------------------------
function collectAssetPaths(node, acc) {
  if (node == null) return;
  if (typeof node === 'string') {
    if (/^assets\//.test(node)) acc.add(node);
    return;
  }
  if (Array.isArray(node)) { node.forEach((n) => collectAssetPaths(n, acc)); return; }
  if (typeof node === 'object') { Object.values(node).forEach((v) => collectAssetPaths(v, acc)); }
}

function checkImages(data) {
  if (!data) { failCheck('7. Assets de content.js', ['PF.data no disponible (ver check 2)']); return; }
  const paths = new Set();
  collectAssetPaths(data, paths);
  const missing = [...paths].filter((p) => !existsSync(resolve(REPO_ROOT, p)));
  if (missing.length) failCheck('7. Assets de content.js', missing.map((p) => `no existe en disco: ${p}`));
  else pass(`7. Assets de content.js (${paths.size} referencias)`);
}

// -------------------------------------------------------------------------
// Run
// -------------------------------------------------------------------------
console.log(DIM('== check.mjs — verificacion del portafolio ==\n'));
checkSyntax();
const data = checkContent();
checkNoCDN();
checkNoEmoji();
checkTokens();
checkSections();
checkImages(data);

let allOk = true;
for (const r of results) {
  console.log((r.ok ? GREEN('PASS') : RED('FAIL')) + '  ' + r.name);
  for (const m of r.msgs) console.log('        ' + m);
  if (!r.ok) allOk = false;
}
console.log('\n' + (allOk ? GREEN('RESULTADO: todo PASS') : RED('RESULTADO: hay checks en FAIL — corrige y vuelve a ejecutar')));
process.exit(allOk ? 0 : 1);
