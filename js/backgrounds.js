/**
 * backgrounds.js — decorative section backgrounds adapted from Effects-library,
 * unified with the palette / reduced-motion / mobile rules.
 *   - infinite-text : very subtle repeating-word field (Sobre mí / Tecnologías).
 *                     Static markup; drift handled in CSS, disabled on
 *                     prefers-reduced-motion and < 768px.
 *   - green-lights  : rising glowing particles for the CONTACT footer, on a
 *                     canvas gated to the active section (single-loop rule).
 */
window.PF = window.PF || {};

(function () {
  'use strict';

  var WORDS = ['erick ', 'software ', 'code ', 'algoritmo ', 'ia ', 'cplusplus ', 'quantum ', 'build ', 'ship ', 'learn '];
  var glRaf = null;
  var glParticles = [];

  function reduced() {
    return !!(PF.state && PF.state.reducedMotion);
  }
  function isMobile() {
    return window.matchMedia('(max-width: 767px)').matches;
  }

  // ---- infinite text ----------------------------------------------------
  // Checkpoint 4 Tanda B: multiple rows, alternating direction (even rows
  // L→R, odd rows R→L, same speed) + a metallic radial shine that follows the
  // cursor over the "Sobre mí" area.
  function initInfiniteText() {
    var mounts = document.querySelectorAll('[data-bg="infinite-text"]');
    if (!mounts.length) return;
    var chunk = '';
    for (var i = 0; i < 40; i++) chunk += WORDS[i % WORDS.length];
    var line = (chunk + chunk).toUpperCase();
    var ROWS = 8;
    mounts.forEach(function (mount) {
      if (mount.dataset.filled) return;
      for (var r = 0; r < ROWS; r++) {
        var span = document.createElement('span');
        span.className = 'it-flow ' + (r % 2 === 0 ? 'it-ltr' : 'it-rtl');
        span.textContent = line;
        mount.appendChild(span);
      }
      var shine = document.createElement('span');
      shine.className = 'it-shine';
      shine.setAttribute('aria-hidden', 'true');
      mount.appendChild(shine);
      mount.dataset.filled = '1';
    });
    setupShine();
  }

  function setupShine() {
    if (reduced()) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    var section = document.querySelector('.section--about');
    var mount = section && section.querySelector('[data-bg="infinite-text"]');
    if (!section || !mount) return;
    var ticking = false, lastX = 0, lastY = 0;
    section.addEventListener('mouseenter', function () { mount.classList.add('it-lit'); });
    section.addEventListener('mouseleave', function () { mount.classList.remove('it-lit'); });
    section.addEventListener('mousemove', function (e) {
      var rect = mount.getBoundingClientRect();
      lastX = e.clientX - rect.left;
      lastY = e.clientY - rect.top;
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        mount.style.setProperty('--mx', lastX + 'px');
        mount.style.setProperty('--my', lastY + 'px');
        ticking = false;
      });
    }, { passive: true });
  }

  // ---- green lights (contact footer) ------------------------------------
  function greenLightsStop() {
    if (glRaf) {
      cancelAnimationFrame(glRaf);
      glRaf = null;
    }
    glParticles = [];
  }

  function greenLightsStart(canvas) {
    greenLightsStop();
    if (!canvas) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var rect = canvas.getBoundingClientRect();
    var w = Math.max(1, Math.floor(rect.width));
    var h = Math.max(1, Math.floor(rect.height));
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Reduced motion / mobile: draw a few static soft dots, no loop.
    if (reduced() || isMobile()) {
      for (var s = 0; s < 10; s++) {
        var sx = Math.random() * w;
        var sy = h - Math.random() * h * 0.6;
        softDot(ctx, sx, sy, 2 + Math.random() * 3, 0.5);
      }
      return;
    }

    var max = w < 700 ? 14 : 26;
    function spawn() {
      return {
        x: Math.random() * w,
        y: h + 10,
        r: 2 + Math.random() * 4,
        v: 0.4 + Math.random() * 1.1,
        life: 0,
        max: h + 40
      };
    }
    for (var i = 0; i < max; i++) {
      var p = spawn();
      p.y = Math.random() * h;
      p.life = p.y;
      glParticles.push(p);
    }

    function loop() {
      ctx.clearRect(0, 0, w, h);
      for (var k = 0; k < glParticles.length; k++) {
        var p = glParticles[k];
        p.y -= p.v;
        p.life += p.v;
        var alpha = Math.max(0, 1 - p.life / p.max);
        // trailing beam
        var grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + 90);
        grad.addColorStop(0, 'rgba(0,255,0,' + (alpha * 0.5).toFixed(3) + ')');
        grad.addColorStop(1, 'rgba(0,255,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(p.x - p.r / 2, p.y, p.r, 90);
        softDot(ctx, p.x, p.y, p.r, alpha);
        if (p.y < -20 || alpha <= 0) glParticles[k] = spawn();
      }
      glRaf = requestAnimationFrame(loop);
    }
    glRaf = requestAnimationFrame(loop);
  }

  function softDot(ctx, x, y, r, alpha) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
    g.addColorStop(0, 'rgba(120,255,120,' + alpha.toFixed(3) + ')');
    g.addColorStop(0.4, 'rgba(0,255,0,' + (alpha * 0.6).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(0,255,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 4, 0, Math.PI * 2);
    ctx.fill();
  }

  PF.backgrounds = {
    initInfiniteText: initInfiniteText,
    greenLightsStart: greenLightsStart,
    greenLightsStop: greenLightsStop
  };
})();
