#!/usr/bin/env node
/**
 * apply-theme.mjs — aplica la paleta y las fuentes de portfolio.config.json
 * a css/main.css (tokens del bloque :root) y, si las fuentes cambian, al
 * <link> de Google Fonts de los HTML. Node >= 18 stdlib puro, sin dependencias.
 *
 * Uso:
 *   node harnes-portafolio/scripts/apply-theme.mjs               (dry-run, muestra diff)
 *   node harnes-portafolio/scripts/apply-theme.mjs --write       (aplica cambios)
 *   node harnes-portafolio/scripts/apply-theme.mjs --restore-baseline [--write]
 *
 * Determinismo: las variantes bright/mid/soft se derivan por mezcla con blanco
 * a proporciones FIJAS en decimas — primary 4/5/6, secondary 3/5/7 — de modo que
 * el config de ejemplo reproduce EXACTAMENTE los valores actuales del sitio.
 * Idempotente: una segunda corrida no produce cambios.
 *
 * Exit codes: 0 ok · 1 config invalida / falta config · 2 token esperado no encontrado.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HARNESS_DIR = resolve(__dirname, '..');
const REPO_ROOT = resolve(HARNESS_DIR, '..');
const CONFIG_PATH = resolve(HARNESS_DIR, 'portfolio.config.json');
const EXAMPLE_PATH = resolve(HARNESS_DIR, 'portfolio.config.example.json');
const CSS_PATH = resolve(REPO_ROOT, 'css/main.css');
const HTML_FILES = ['index.html', 'logros.html', 'proyectos.html', 'formacion.html'];

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const RESTORE = args.includes('--restore-baseline');

const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const YELLOW = (s) => `\x1b[33m${s}\x1b[0m`;
const DIM = (s) => `\x1b[2m${s}\x1b[0m`;

function fail(code, msg) {
  console.error(RED('ERROR: ') + msg);
  process.exit(code);
}

// -------------------------------------------------------------------------
// Color helpers
// -------------------------------------------------------------------------
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function normalizeHex(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return '#' + h.toLowerCase();
}

function toRGB(hex) {
  const h = normalizeHex(hex).slice(1);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// Mezcla hacia blanco a proporcion n/10 (n en decimas). Aritmetica entera para
// que los medios (x.5) redondeen hacia arriba de forma exacta y determinista.
function mixWhite(hex, n) {
  const [r, g, b] = toRGB(hex);
  const mix = (c) => Math.round((c * (10 - n) + 255 * n) / 10);
  const hx = (c) => c.toString(16).padStart(2, '0');
  return '#' + hx(mix(r)) + hx(mix(g)) + hx(mix(b));
}

function glow(hex) {
  const [r, g, b] = toRGB(hex);
  return `rgba(${r}, ${g}, ${b}, 0.3)`;
}

// -------------------------------------------------------------------------
// Config load + validation
// -------------------------------------------------------------------------
function loadJSON(path, label) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    fail(1, `${label} no es JSON valido: ${e.message}`);
  }
}

function requireField(obj, path, cond, hint) {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object' || !(p in cur)) {
      fail(1, `falta el campo requerido "${path}" en portfolio.config.json`);
    }
    cur = cur[p];
  }
  if (!cond(cur)) fail(1, `campo "${path}" invalido: ${hint} (recibido: ${JSON.stringify(cur)})`);
  return cur;
}

const isHex = (v) => typeof v === 'string' && HEX_RE.test(v);
const isFont = (v) => typeof v === 'string' && v.trim().length > 0;

function validateConfig(cfg) {
  requireField(cfg, 'theme.bg.primary', isHex, 'debe ser un color hex #rgb o #rrggbb');
  requireField(cfg, 'theme.bg.secondary', isHex, 'debe ser un color hex #rgb o #rrggbb');
  requireField(cfg, 'theme.bg.terminal', isHex, 'debe ser un color hex #rgb o #rrggbb');
  requireField(cfg, 'theme.primary', isHex, 'debe ser un color hex #rgb o #rrggbb');
  requireField(cfg, 'theme.secondary', isHex, 'debe ser un color hex #rgb o #rrggbb');
  requireField(cfg, 'theme.accents.danger', isHex, 'debe ser un color hex #rgb o #rrggbb');
  requireField(cfg, 'theme.accents.highlight', isHex, 'debe ser un color hex #rgb o #rrggbb');
  requireField(cfg, 'theme.text.white', isHex, 'debe ser un color hex #rgb o #rrggbb');
  requireField(cfg, 'theme.text.muted', isHex, 'debe ser un color hex #rgb o #rrggbb');
  requireField(cfg, 'theme.text.dim', isHex, 'debe ser un color hex #rgb o #rrggbb');
  requireField(cfg, 'theme.fonts.mono', isFont, 'nombre de fuente no vacio');
  requireField(cfg, 'theme.fonts.sans', isFont, 'nombre de fuente no vacio');
}

// -------------------------------------------------------------------------
// Token map: config -> {tokenName: value}
// -------------------------------------------------------------------------
function buildTokenMap(cfg) {
  const t = cfg.theme;
  const P = t.primary;
  const S = t.secondary;
  return {
    '--bg-primary': normalizeHex(t.bg.primary),
    '--bg-secondary': normalizeHex(t.bg.secondary),
    '--bg-terminal': normalizeHex(t.bg.terminal),
    '--green-pure': normalizeHex(P),
    '--green-bright': mixWhite(P, 4),
    '--green-mid': mixWhite(P, 5),
    '--green-soft': mixWhite(P, 6),
    '--green-glow': glow(P),
    '--cyan-pure': normalizeHex(S),
    '--cyan-bright': mixWhite(S, 3),
    '--cyan-mid': mixWhite(S, 5),
    '--cyan-soft': mixWhite(S, 7),
    '--cyan-glow': glow(S),
    '--red-accent': normalizeHex(t.accents.danger),
    '--yellow-accent': normalizeHex(t.accents.highlight),
    '--white': normalizeHex(t.text.white),
    '--gray-text': normalizeHex(t.text.muted),
    '--gray-dim': normalizeHex(t.text.dim)
  };
}

// -------------------------------------------------------------------------
// CSS :root replacement (anclado por nombre de token)
// -------------------------------------------------------------------------
function locateRootBlock(css) {
  const start = css.indexOf(':root');
  if (start < 0) fail(2, 'no se encontro el bloque ":root" en css/main.css');
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  if (open < 0 || close < 0) fail(2, 'bloque ":root" mal formado en css/main.css');
  return { open, close };
}

function applyTokens(css, tokenMap) {
  const { open, close } = locateRootBlock(css);
  let block = css.slice(open, close);
  const changes = [];
  for (const [token, value] of Object.entries(tokenMap)) {
    const re = new RegExp('(' + token.replace(/[-]/g, '\\-') + ':\\s*)([^;\\n]+)(;)');
    const m = block.match(re);
    if (!m) fail(2, `token esperado "${token}" no encontrado en el :root de css/main.css`);
    const current = m[2].trim();
    if (current !== value) changes.push({ token, current, value });
    block = block.replace(re, `$1${value}$3`);
  }
  return { css: css.slice(0, open) + block + css.slice(close), changes };
}

// -------------------------------------------------------------------------
// Fonts (relativo a los nombres baseline del example)
// -------------------------------------------------------------------------
function applyFontsToCss(css, baseMono, baseSans, mono, sans) {
  const changes = [];
  let out = css;
  if (mono !== baseMono) {
    out = out.split(`'${baseMono}'`).join(`'${mono}'`);
    changes.push({ what: `font mono '${baseMono}' -> '${mono}' (css)`, warn: true });
  }
  if (sans !== baseSans) {
    out = out.split(`'${baseSans}'`).join(`'${sans}'`);
    changes.push({ what: `font sans '${baseSans}' -> '${sans}' (css)`, warn: true });
  }
  return { css: out, changes };
}

const encFont = (name) => name.trim().replace(/\s+/g, '+');

function applyFontsToHtml(html, baseMono, baseSans, mono, sans) {
  let out = html;
  if (mono !== baseMono) out = out.split(`family=${encFont(baseMono)}:`).join(`family=${encFont(mono)}:`);
  if (sans !== baseSans) out = out.split(`family=${encFont(baseSans)}:`).join(`family=${encFont(sans)}:`);
  return out;
}

// -------------------------------------------------------------------------
// Report table
// -------------------------------------------------------------------------
function printTable(changes) {
  if (changes.length === 0) {
    console.log(GREEN('  Sin cambios — la paleta ya coincide con la config (idempotente).'));
    return;
  }
  const w1 = Math.max(5, ...changes.map((c) => c.token.length));
  const w2 = Math.max(6, ...changes.map((c) => c.current.length));
  console.log('  ' + 'TOKEN'.padEnd(w1) + '  ' + 'ACTUAL'.padEnd(w2) + '  ->  NUEVO');
  console.log('  ' + '-'.repeat(w1) + '  ' + '-'.repeat(w2) + '  ' + '-'.repeat(12));
  for (const c of changes) {
    console.log('  ' + c.token.padEnd(w1) + '  ' + RED(c.current.padEnd(w2)) + '  ->  ' + GREEN(c.value));
  }
}

// -------------------------------------------------------------------------
// Main
// -------------------------------------------------------------------------
function main() {
  const example = loadJSON(EXAMPLE_PATH, 'portfolio.config.example.json');
  if (!example) fail(1, 'no se pudo leer portfolio.config.example.json (base del harness).');
  const baseMono = example.theme.fonts.mono;
  const baseSans = example.theme.fonts.sans;

  let cfg;
  if (RESTORE) {
    console.log(YELLOW('Modo --restore-baseline: restaurando los valores del example.\n'));
    cfg = example;
  } else {
    cfg = loadJSON(CONFIG_PATH, 'portfolio.config.json');
    if (!cfg) {
      fail(1, 'no existe harnes-portafolio/portfolio.config.json. ' +
        'Copia portfolio.config.example.json a portfolio.config.json y edita esa copia.');
    }
  }

  validateConfig(cfg);

  const tokenMap = buildTokenMap(cfg);
  let css = readFileSync(CSS_PATH, 'utf8');
  const originalCss = css;
  const { css: cssTokens, changes } = applyTokens(css, tokenMap);
  css = cssTokens;

  // Fonts
  const mono = cfg.theme.fonts.mono.trim();
  const sans = cfg.theme.fonts.sans.trim();
  const fontRes = applyFontsToCss(css, baseMono, baseSans, mono, sans);
  css = fontRes.css;

  console.log(WRITE ? GREEN('== apply-theme (WRITE) ==\n') : DIM('== apply-theme (dry-run — usa --write para aplicar) ==\n'));
  console.log('Tokens de css/main.css:');
  printTable(changes);

  const htmlChanged = [];
  if (fontRes.changes.length) {
    console.log('\nFuentes:');
    for (const c of fontRes.changes) console.log('  ' + YELLOW('~ ') + c.what);
    console.log('  ' + YELLOW('AVISO: ') + 'verifica que las fuentes existan en Google Fonts antes de publicar.');
  }

  if (!WRITE) {
    const cssPending = css !== originalCss || changes.length > 0;
    const fontsPending = fontRes.changes.length > 0;
    console.log('\n' + (cssPending || fontsPending
      ? DIM('Dry-run: nada escrito. Revisa el diff y re-ejecuta con --write.')
      : GREEN('Dry-run: sin cambios pendientes.')));
    process.exit(0);
  }

  // WRITE
  writeFileSync(CSS_PATH, css, 'utf8');
  if (mono !== baseMono || sans !== baseSans) {
    for (const f of HTML_FILES) {
      const p = resolve(REPO_ROOT, f);
      if (!existsSync(p)) continue;
      const before = readFileSync(p, 'utf8');
      const after = applyFontsToHtml(before, baseMono, baseSans, mono, sans);
      if (after !== before) {
        writeFileSync(p, after, 'utf8');
        htmlChanged.push(f);
      }
    }
  }

  console.log('\n' + GREEN('Escrito: ') + 'css/main.css' + (htmlChanged.length ? ', ' + htmlChanged.join(', ') : ''));
  console.log(DIM('Siguiente: node harnes-portafolio/scripts/check.mjs'));
  process.exit(0);
}

main();
