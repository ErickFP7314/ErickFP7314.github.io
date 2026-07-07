/**
 * effects.js — Batch 3 visual effects. Self-contained: cursor + scanline +
 * sound toggle auto-init on DOMContentLoaded so they work uniformly on
 * index.html AND the three subpages (logros/proyectos/formacion) just by
 * including this script tag — no changes needed in main.js/subpage.js for
 * those. matrixRain/dotGrid/glitchObserve/confettiBurst stay call-driven APIs
 * used by main.js (index) and konami.js.
 *
 * Reduced-motion / mobile gating (design.md + ui-ux-pro-max):
 *   - matrixRain, dotGrid, custom cursor, scanline: OFF on <768px AND on
 *     prefers-reduced-motion.
 *   - glitch titles, confetti, parallax: OFF on prefers-reduced-motion.
 */
window.PF = window.PF || {};

(function () {
  'use strict';

  function reduced() {
    return !!(PF.state && PF.state.reducedMotion);
  }
  function isMobile() {
    return window.matchMedia('(max-width: 767px)').matches;
  }
  function hoverFine() {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }

  // -----------------------------------------------------------------------
  // Matrix rain — generic reusable canvas loop (subpage bg + Konami takeover)
  // -----------------------------------------------------------------------
  var MATRIX_CHARS = '01アイウエオカキクケコサシスセソ$#%&';

  function makeMatrixRain(opts) {
    opts = opts || {};
    var fontSize = opts.fontSize || 14;
    var alpha = opts.alpha != null ? opts.alpha : 0.4;
    var canvas = null;
    var ctx = null;
    var raf = null;
    var cols = [];
    var w = 0;
    var h = 0;

    function resize() {
      if (!canvas) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var rect = canvas.getBoundingClientRect();
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.ceil(w / fontSize);
      cols = [];
      for (var i = 0; i < n; i++) cols.push(Math.random() * (-h / fontSize));
      ctx.fillStyle = '#050805';
      ctx.fillRect(0, 0, w, h);
    }

    function frame() {
      if (!ctx) return;
      ctx.fillStyle = 'rgba(5, 8, 5, 0.16)';
      ctx.fillRect(0, 0, w, h);
      ctx.font = fontSize + 'px "Fira Code", monospace';
      for (var i = 0; i < cols.length; i++) {
        var ch = MATRIX_CHARS[(Math.random() * MATRIX_CHARS.length) | 0];
        var x = i * fontSize;
        var y = cols[i] * fontSize;
        ctx.fillStyle = Math.random() < 0.06 ? 'rgba(180,255,180,' + alpha + ')' : 'rgba(0,255,0,' + alpha + ')';
        ctx.fillText(ch, x, y);
        cols[i]++;
        if (y > h && Math.random() > 0.975) cols[i] = 0;
      }
      raf = requestAnimationFrame(frame);
    }

    return {
      start: function (targetCanvas) {
        if (raf || !targetCanvas || !targetCanvas.getContext) return;
        canvas = targetCanvas;
        ctx = canvas.getContext('2d');
        resize();
        window.addEventListener('resize', resize);
        raf = requestAnimationFrame(frame);
      },
      stop: function () {
        if (raf) {
          cancelAnimationFrame(raf);
          raf = null;
        }
        window.removeEventListener('resize', resize);
        if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas = null;
        ctx = null;
      }
    };
  }

  // Two independent instances: one gentle (subpage background), one intense
  // (Konami full-screen takeover) — each is its own single-loop, never both
  // running together in practice (different pages / trigger contexts).
  var subpageMatrix = makeMatrixRain({ alpha: 0.22, fontSize: 15 });
  var konamiMatrix = makeMatrixRain({ alpha: 0.6, fontSize: 16 });

  // -----------------------------------------------------------------------
  // Dot grid twinkle — used as logros.html subpage background
  // -----------------------------------------------------------------------
  var dg = { raf: null, canvas: null, ctx: null, dots: [], w: 0, h: 0 };

  function dotGridResize() {
    if (!dg.canvas) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var rect = dg.canvas.getBoundingClientRect();
    dg.w = Math.max(1, Math.floor(rect.width));
    dg.h = Math.max(1, Math.floor(rect.height));
    dg.canvas.width = dg.w * dpr;
    dg.canvas.height = dg.h * dpr;
    dg.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var step = 36;
    dg.dots = [];
    for (var x = step / 2; x < dg.w; x += step) {
      for (var y = step / 2; y < dg.h; y += step) {
        dg.dots.push({ x: x, y: y, phase: Math.random() * Math.PI * 2, speed: 0.5 + Math.random() * 0.7 });
      }
    }
  }

  function dotGridFrame(t) {
    if (!dg.ctx) return;
    dg.ctx.clearRect(0, 0, dg.w, dg.h);
    for (var i = 0; i < dg.dots.length; i++) {
      var d = dg.dots[i];
      var tw = 0.12 + 0.5 * (0.5 + 0.5 * Math.sin(t * 0.001 * d.speed + d.phase));
      dg.ctx.fillStyle = 'rgba(0,255,255,' + tw.toFixed(3) + ')';
      dg.ctx.beginPath();
      dg.ctx.arc(d.x, d.y, 1.6, 0, Math.PI * 2);
      dg.ctx.fill();
    }
    dg.raf = requestAnimationFrame(dotGridFrame);
  }

  // -----------------------------------------------------------------------
  // Particle field (formacion.html bg): uniformly-spaced dots that CLUSTER
  // toward the cursor and light up (green attraction), springing home when the
  // pointer leaves. rAF-gated, paused on hidden tab, static on reduced/mobile.
  // -----------------------------------------------------------------------
  function fitCanvas(canvas) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var rect = canvas.getBoundingClientRect();
    var w = Math.max(1, Math.floor(rect.width));
    var h = Math.max(1, Math.floor(rect.height));
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }

  var pf = { raf: null, canvas: null, ctx: null, dots: [], w: 0, h: 0, mx: -9999, my: -9999, onMove: null, onVis: null };

  function pfBuild() {
    var m = fitCanvas(pf.canvas);
    pf.ctx = m.ctx; pf.w = m.w; pf.h = m.h;
    var step = pf.w < 640 ? 40 : 34;
    pf.dots = [];
    for (var x = step / 2; x < pf.w; x += step) {
      for (var y = step / 2; y < pf.h; y += step) {
        pf.dots.push({ hx: x, hy: y, x: x, y: y, vx: 0, vy: 0, e: 0 });
      }
    }
  }

  function pfDrawStatic() {
    var m = fitCanvas(pf.canvas);
    m.ctx.clearRect(0, 0, m.w, m.h);
    var step = 40;
    for (var x = step / 2; x < m.w; x += step) {
      for (var y = step / 2; y < m.h; y += step) {
        m.ctx.fillStyle = 'rgba(0,255,90,0.11)';
        m.ctx.beginPath();
        m.ctx.arc(x, y, 1.0, 0, Math.PI * 2);
        m.ctx.fill();
      }
    }
  }

  function pfFrame() {
    if (document.hidden) { pf.raf = requestAnimationFrame(pfFrame); return; }
    var ctx = pf.ctx;
    ctx.clearRect(0, 0, pf.w, pf.h);
    var R = 130, R2 = R * R;
    for (var i = 0; i < pf.dots.length; i++) {
      var d = pf.dots[i];
      var dx = pf.mx - d.x, dy = pf.my - d.y;
      var dist2 = dx * dx + dy * dy;
      if (dist2 < R2) {
        var dist = Math.sqrt(dist2) || 1;
        var pull = (1 - dist / R) * 1.6;
        d.vx += (dx / dist) * pull;
        d.vy += (dy / dist) * pull;
        d.e = Math.min(1, d.e + 0.12);
      } else {
        d.vx += (d.hx - d.x) * 0.015;
        d.vy += (d.hy - d.y) * 0.015;
        d.e *= 0.94;
      }
      d.vx *= 0.86; d.vy *= 0.86;
      d.x += d.vx; d.y += d.vy;
      // Checkpoint 5: smaller + subtler dots (they sit BEHIND the cards).
      var r = 0.9 + d.e * 1.4;
      var a = 0.09 + d.e * 0.5;
      if (d.e > 0.05) {
        var g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, r * 4);
        g.addColorStop(0, 'rgba(120,255,150,' + a.toFixed(3) + ')');
        g.addColorStop(1, 'rgba(0,255,80,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(d.x, d.y, r * 4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(0,255,90,' + a.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(d.x, d.y, r, 0, Math.PI * 2); ctx.fill();
    }
    pf.raf = requestAnimationFrame(pfFrame);
  }

  var particleField = {
    start: function (canvas) {
      if (!canvas || !canvas.getContext) return;
      this.stop();
      pf.canvas = canvas;
      if (isMobile() || reduced()) { pfDrawStatic(); return; }
      pfBuild();
      pf.onMove = function (e) {
        var rect = pf.canvas.getBoundingClientRect();
        pf.mx = e.clientX - rect.left;
        pf.my = e.clientY - rect.top;
      };
      pf.onVis = function () { /* loop self-idles via document.hidden */ };
      window.addEventListener('mousemove', pf.onMove, { passive: true });
      window.addEventListener('resize', pfBuild);
      pf.raf = requestAnimationFrame(pfFrame);
    },
    stop: function () {
      if (pf.raf) { cancelAnimationFrame(pf.raf); pf.raf = null; }
      if (pf.onMove) window.removeEventListener('mousemove', pf.onMove);
      window.removeEventListener('resize', pfBuild);
      pf.onMove = null;
    }
  };

  // -----------------------------------------------------------------------
  // Grid squares (proyectos.html bg): a light TRAVELS behind a grid of squares
  // and the cursor illuminates nearby cells (green). rAF-gated / hidden-paused.
  // -----------------------------------------------------------------------
  var gs = { raf: null, canvas: null, ctx: null, w: 0, h: 0, cells: [], cell: 60, mx: -9999, my: -9999, t: 0, onMove: null };

  function gsBuild() {
    var m = fitCanvas(gs.canvas);
    gs.ctx = m.ctx; gs.w = m.w; gs.h = m.h;
    gs.cell = gs.w < 640 ? 46 : 62;
  }

  function gsFrame() {
    if (document.hidden) { gs.raf = requestAnimationFrame(gsFrame); return; }
    var ctx = gs.ctx, cell = gs.cell;
    ctx.clearRect(0, 0, gs.w, gs.h);
    gs.t += 0.006;
    // travelling light sweeps left→right, gently bobbing vertically
    var lx = ((gs.t * 0.5) % 1) * (gs.w + 200) - 100;
    var ly = gs.h * (0.5 + 0.28 * Math.sin(gs.t * 1.3));
    var pad = 3;
    for (var x = 0; x < gs.w; x += cell) {
      for (var y = 0; y < gs.h; y += cell) {
        var cx = x + cell / 2, cy = y + cell / 2;
        var dl = Math.hypot(cx - lx, cy - ly);
        var dm = Math.hypot(cx - gs.mx, cy - gs.my);
        var lightA = Math.max(0, 1 - dl / 210);
        var mouseA = Math.max(0, 1 - dm / 150);
        var a = 0.05 + lightA * 0.55 + mouseA * 0.7;
        if (a > 0.9) a = 0.9;
        ctx.strokeStyle = 'rgba(0,255,90,' + (0.06 + a * 0.5).toFixed(3) + ')';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + pad, y + pad, cell - pad * 2, cell - pad * 2);
        if (a > 0.12) {
          ctx.fillStyle = 'rgba(0,255,90,' + (a * 0.14).toFixed(3) + ')';
          ctx.fillRect(x + pad, y + pad, cell - pad * 2, cell - pad * 2);
        }
      }
    }
    gs.raf = requestAnimationFrame(gsFrame);
  }

  function gsStatic() {
    var m = fitCanvas(gs.canvas);
    m.ctx.clearRect(0, 0, m.w, m.h);
    var cell = 46, pad = 3;
    for (var x = 0; x < m.w; x += cell) {
      for (var y = 0; y < m.h; y += cell) {
        m.ctx.strokeStyle = 'rgba(0,255,90,0.10)';
        m.ctx.lineWidth = 1;
        m.ctx.strokeRect(x + pad, y + pad, cell - pad * 2, cell - pad * 2);
      }
    }
  }

  var gridSquares = {
    start: function (canvas) {
      if (!canvas || !canvas.getContext) return;
      this.stop();
      gs.canvas = canvas;
      if (isMobile() || reduced()) { gsStatic(); return; }
      gsBuild();
      gs.onMove = function (e) {
        var rect = gs.canvas.getBoundingClientRect();
        gs.mx = e.clientX - rect.left;
        gs.my = e.clientY - rect.top;
      };
      window.addEventListener('mousemove', gs.onMove, { passive: true });
      window.addEventListener('resize', gsBuild);
      gs.raf = requestAnimationFrame(gsFrame);
    },
    stop: function () {
      if (gs.raf) { cancelAnimationFrame(gs.raf); gs.raf = null; }
      if (gs.onMove) window.removeEventListener('mousemove', gs.onMove);
      window.removeEventListener('resize', gsBuild);
      gs.onMove = null;
    }
  };

  // -----------------------------------------------------------------------
  // Glitch on section-title viewport entry (once per element)
  // -----------------------------------------------------------------------
  var glitchSeen = new WeakSet();
  var glitchObs = null;

  function fireGlitch(el) {
    el.classList.add('glitching');
    setTimeout(function () {
      el.classList.remove('glitching');
    }, 460);
  }

  function glitchObserve(els) {
    if (reduced() || !els || !els.length) return;
    if (!glitchObs) {
      glitchObs = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.intersectionRatio >= 0.4 && !glitchSeen.has(entry.target)) {
              glitchSeen.add(entry.target);
              fireGlitch(entry.target);
            }
          });
        },
        { threshold: 0.4 }
      );
    }
    Array.prototype.forEach.call(els, function (el) {
      if (!el.hasAttribute('data-text')) el.setAttribute('data-text', el.textContent);
      el.classList.add('glitch-title');
      glitchObs.observe(el);
    });
  }

  // -----------------------------------------------------------------------
  // CRT scanline overlay — site-wide, auto off on reduced-motion/mobile
  // -----------------------------------------------------------------------
  var scanlineEl = null;

  function scanlineToggle(on) {
    if (on === undefined) on = true;
    if (on && !reduced() && !isMobile()) {
      if (scanlineEl) return;
      scanlineEl = document.createElement('div');
      scanlineEl.className = 'scanline-overlay';
      scanlineEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(scanlineEl);
    } else if (scanlineEl) {
      if (scanlineEl.parentNode) scanlineEl.parentNode.removeChild(scanlineEl);
      scanlineEl = null;
    }
  }

  // -----------------------------------------------------------------------
  // Confetti burst — transform/opacity only, brief, once per call
  // -----------------------------------------------------------------------
  function confettiBurst() {
    if (reduced()) return;
    var container = document.createElement('div');
    container.className = 'confetti-burst';
    container.setAttribute('aria-hidden', 'true');
    document.body.appendChild(container);
    var n = 28;
    for (var i = 0; i < n; i++) {
      var piece = document.createElement('span');
      piece.className = 'confetti-piece';
      var isCyan = Math.random() < 0.5;
      piece.style.left = (42 + Math.random() * 16) + '%';
      piece.style.background = isCyan ? 'var(--cyan-pure)' : 'var(--green-pure)';
      piece.style.animationDelay = (Math.random() * 0.18).toFixed(2) + 's';
      piece.style.setProperty('--dx', Math.round(Math.random() * 260 - 130) + 'px');
      piece.style.setProperty('--rot', Math.round(Math.random() * 540 - 270) + 'deg');
      container.appendChild(piece);
    }
    setTimeout(function () {
      if (container.parentNode) container.parentNode.removeChild(container);
    }, 1700);
  }

  // -----------------------------------------------------------------------
  // Custom cursor — dot + trail, (hover:hover) and (pointer:fine) only
  // -----------------------------------------------------------------------
  var cursorEls = null;
  var cursorRaf = null;
  var cursorPos = { x: -100, y: -100 };
  var trailPos = { x: -100, y: -100 };

  function onCursorMove(e) {
    cursorPos.x = e.clientX;
    cursorPos.y = e.clientY;
  }

  function onCursorOver(e) {
    if (!cursorEls || !e.target || !e.target.closest) return;
    var isActive = e.target.closest('a, button, [role="button"], .tech-tile, .social-btn, .hero-link, .poster-link, summary, input[type="submit"]');
    cursorEls.dot.classList.toggle('cursor-active', !!isActive);
    cursorEls.trail.classList.toggle('cursor-active', !!isActive);
  }

  function cursorLoop() {
    if (!cursorEls) return;
    trailPos.x += (cursorPos.x - trailPos.x) * 0.22;
    trailPos.y += (cursorPos.y - trailPos.y) * 0.22;
    cursorEls.dot.style.transform = 'translate(' + cursorPos.x + 'px,' + cursorPos.y + 'px) translate(-50%,-50%)';
    cursorEls.trail.style.transform = 'translate(' + trailPos.x + 'px,' + trailPos.y + 'px) translate(-50%,-50%)';
    cursorRaf = requestAnimationFrame(cursorLoop);
  }

  var cursor = {
    init: function () {
      if (cursorEls) return;
      if (!hoverFine() || isMobile() || reduced()) return;
      var dot = document.createElement('div');
      dot.className = 'cursor-dot';
      dot.setAttribute('aria-hidden', 'true');
      var trail = document.createElement('div');
      trail.className = 'cursor-trail';
      trail.setAttribute('aria-hidden', 'true');
      document.body.appendChild(dot);
      document.body.appendChild(trail);
      cursorEls = { dot: dot, trail: trail };
      document.documentElement.classList.add('pf-custom-cursor');
      document.addEventListener('mousemove', onCursorMove);
      document.addEventListener('mouseover', onCursorOver);
      cursorRaf = requestAnimationFrame(cursorLoop);
    },
    destroy: function () {
      if (!cursorEls) return;
      document.removeEventListener('mousemove', onCursorMove);
      document.removeEventListener('mouseover', onCursorOver);
      if (cursorRaf) cancelAnimationFrame(cursorRaf);
      cursorRaf = null;
      document.documentElement.classList.remove('pf-custom-cursor');
      if (cursorEls.dot.parentNode) cursorEls.dot.parentNode.removeChild(cursorEls.dot);
      if (cursorEls.trail.parentNode) cursorEls.trail.parentNode.removeChild(cursorEls.trail);
      cursorEls = null;
    }
  };

  // -----------------------------------------------------------------------
  // Parallax — decorative backgrounds only, transform-based, rAF-throttled
  // -----------------------------------------------------------------------
  function initParallax() {
    if (reduced()) return;
    var container = document.getElementById('scrollContainer');
    if (!container) return;
    document.querySelectorAll('.bg-infinite-text').forEach(function (el) {
      el.setAttribute('data-parallax', '0.08');
    });
    var ascii = document.getElementById('asciiDecoHero');
    if (ascii) ascii.setAttribute('data-parallax', '0.05');

    var layers = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
    if (!layers.length) return;
    var ticking = false;

    function apply() {
      layers.forEach(function (el) {
        var factor = parseFloat(el.getAttribute('data-parallax')) || 0.08;
        var rect = el.getBoundingClientRect();
        el.style.transform = 'translateY(' + (rect.top * factor).toFixed(1) + 'px)';
      });
      ticking = false;
    }

    container.addEventListener(
      'scroll',
      function () {
        if (reduced()) return;
        if (!ticking) {
          requestAnimationFrame(apply);
          ticking = true;
        }
      },
      { passive: true }
    );
  }

  // -----------------------------------------------------------------------
  // Sound toggle — speaker/speaker-muted SVG corner button (no emoji),
  // Web Audio beeps, persisted, OFF default.
  // -----------------------------------------------------------------------
  var soundOn = false;
  var audioCtx = null;
  var SPEAKER_ON_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3Zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12Zm-2.5-9v2.06a7 7 0 0 1 0 13.88V21a9 9 0 0 0 0-18Z"/></svg>';
  var SPEAKER_OFF_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3Zm18.29-.71-1.42-1.42L17.66 9.1 15.44 6.88l-1.41 1.41L16.24 10.5l-2.21 2.22 1.41 1.41 2.22-2.21 2.21 2.21 1.42-1.41-2.22-2.22 2.22-2.21Z"/></svg>';

  function ensureAudioCtx() {
    if (audioCtx) return audioCtx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      audioCtx = new AC();
    } catch (err) {
      audioCtx = null;
    }
    return audioCtx;
  }

  function beep(freq, dur) {
    if (!soundOn) return;
    var ctx = ensureAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq || 440;
    var now = ctx.currentTime;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (dur || 0.12));
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (dur || 0.12) + 0.02);
  }

  // -----------------------------------------------------------------------
  // Named SFX for the games (checkpoint 5). Reuses the SAME `soundOn` flag +
  // AudioContext as the beep synth above, so it respects the live sound-toggle
  // state (no-ops when muted) and needs no audio files. Each recipe is a short
  // sequence of quiet, terminal-style blips: [freq, startOffset, dur, type?].
  // -----------------------------------------------------------------------
  function tone(freq, start, dur, type, peak) {
    var ctx = audioCtx; // guaranteed present + resumed by the caller
    if (!ctx) return;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    var t0 = ctx.currentTime + start;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak || 0.05, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  var SFX = {
    place:    [[440, 0, 0.06]],
    win:      [[523, 0, 0.09], [659, 0.09, 0.09], [784, 0.18, 0.16]],
    lose:     [[330, 0, 0.12], [247, 0.12, 0.2]],
    draw:     [[392, 0, 0.1], [392, 0.13, 0.12]],
    perfect:  [[659, 0, 0.06], [988, 0.06, 0.12]],
    over:     [[392, 0, 0.1], [294, 0.1, 0.14], [196, 0.24, 0.22]],
    shoot:    [[880, 0, 0.05]],
    hit:      [[660, 0, 0.07]],
    bullseye: [[784, 0, 0.07], [1175, 0.07, 0.13]],
    miss:     [[200, 0, 0.13, 'sawtooth']],
    eat:      [[620, 0, 0.05]],
    paddle:   [[520, 0, 0.045]],
    score:    [[400, 0, 0.09], [620, 0.09, 0.12]],
    error:    [[170, 0, 0.06, 'sawtooth']],
    finish:   [[523, 0, 0.08], [784, 0.1, 0.16]]
  };

  function playSfx(name) {
    if (!soundOn) return;
    var recipe = SFX[name];
    if (!recipe) return;
    var ctx = ensureAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    for (var i = 0; i < recipe.length; i++) {
      var n = recipe[i];
      tone(n[0], n[1], n[2], n[3]);
    }
  }

  function initSoundToggle() {
    if (document.getElementById('soundToggleBtn')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'soundToggleBtn';
    btn.className = 'sound-toggle mono';

    try {
      soundOn = window.localStorage.getItem('pf-sound') === 'on';
    } catch (err) {
      soundOn = false;
    }

    function update() {
      btn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
      btn.setAttribute('aria-label', soundOn ? 'Silenciar sonido' : 'Activar sonido');
      btn.innerHTML = soundOn ? SPEAKER_ON_SVG : SPEAKER_OFF_SVG;
    }
    update();

    btn.addEventListener('click', function () {
      soundOn = !soundOn;
      try {
        window.localStorage.setItem('pf-sound', soundOn ? 'on' : 'off');
      } catch (err) {
        /* localStorage unavailable (e.g. restrictive file:// context) — no-op */
      }
      update();
      beep(660, 0.09);
    });

    document.body.appendChild(btn);

    // Subtle beeps on nav/menu-open interactions (delegated; harmless if
    // elements are absent on a given page).
    document.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest) return;
      var navHit = e.target.closest('#hamburgerBtn, .menu-overlay a, .poster-link, .back-link');
      if (navHit) beep(navHit.id === 'hamburgerBtn' ? 540 : 440, 0.07);
    });
  }

  // -----------------------------------------------------------------------
  // Auto-init universal effects (cursor, scanline, sound, parallax) — works
  // on index.html AND subpages just by including this script tag.
  // -----------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', function () {
    cursor.init();
    scanlineToggle(true);
    initSoundToggle();
    initParallax();
  });

  var reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotionQuery.addEventListener) {
    reducedMotionQuery.addEventListener('change', function (e) {
      if (e.matches) {
        cursor.destroy();
        scanlineToggle(false);
      } else {
        cursor.init();
        scanlineToggle(true);
      }
    });
  }

  PF.effects = {
    matrixRain: {
      start: function (canvas) {
        if (isMobile() || reduced()) return;
        subpageMatrix.start(canvas);
      },
      stop: function () {
        subpageMatrix.stop();
      }
    },
    dotGrid: {
      start: function (canvas) {
        if (isMobile() || reduced() || dg.raf || !canvas || !canvas.getContext) return;
        dg.canvas = canvas;
        dg.ctx = canvas.getContext('2d');
        dotGridResize();
        window.addEventListener('resize', dotGridResize);
        dg.raf = requestAnimationFrame(dotGridFrame);
      },
      stop: function () {
        if (dg.raf) {
          cancelAnimationFrame(dg.raf);
          dg.raf = null;
        }
        window.removeEventListener('resize', dotGridResize);
        if (dg.ctx && dg.canvas) dg.ctx.clearRect(0, 0, dg.canvas.width, dg.canvas.height);
        dg.canvas = null;
        dg.ctx = null;
      }
    },
    particleField: particleField,
    gridSquares: gridSquares,
    // Intense full-screen instance reserved for the Konami takeover (konami.js).
    konamiMatrix: konamiMatrix,
    glitchObserve: glitchObserve,
    scanlineToggle: scanlineToggle,
    confettiBurst: confettiBurst,
    cursor: cursor
  };

  PF.sound = { play: beep };
  // Games call PF.audio.play('place'|'win'|'eat'|...) — quiet, toggle-gated.
  PF.audio = { play: playSfx };
})();
