/**
 * posters.js — runtime-generated canvas "posters" for the EXPERIENCIA,
 * PROYECTOS and FORMACIÓN sections on the main page. Each section shows one
 * large thematic plane (palette tones on dark); hovering/focusing the wrapping
 * <a> reveals "INGRESAR" and navigates to its subpage.
 *
 * Single-canvas rule (design.md): only the ACTIVE section's poster animates;
 * main.js drives activate()/stopAll() from the shared IntersectionObserver, and
 * these never run at the same time as the hero particle loop.
 * Reduced motion → a single static frame is drawn (no rAF loop).
 */
window.PF = window.PF || {};

(function () {
  'use strict';

  var GREEN = '#00ff00';
  var CYAN = '#00ffff';
  var raf = null;
  var current = null; // canvas currently animating

  function reduced() {
    return !!(PF.state && PF.state.reducedMotion);
  }

  function fit(canvas) {
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.floor(rect.width));
    var h = Math.max(1, Math.floor(rect.height));
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }

  // ---- motifs -----------------------------------------------------------

  function drawExperiencia(ctx, w, h, t) {
    ctx.fillStyle = '#050805';
    ctx.fillRect(0, 0, w, h);
    var step = 16;
    var cols = Math.ceil(w / step);
    ctx.font = '13px "Fira Code", monospace';
    for (var c = 0; c < cols; c++) {
      var x = c * step;
      var speed = 24 + ((c * 53) % 60);
      var offset = (t * speed) % (h + 200);
      for (var k = 0; k < 8; k++) {
        var y = ((offset + k * 26) % (h + 200)) - 40;
        var alpha = (1 - k / 8) * 0.5;
        ctx.fillStyle = (c % 4 === 0 ? 'rgba(0,255,255,' : 'rgba(0,255,0,') + alpha.toFixed(3) + ')';
        var ch = ((c + k + Math.floor(offset / 26)) % 2) ? '1' : '0';
        ctx.fillText(ch, x, y);
      }
    }
    vignette(ctx, w, h);
  }

  function drawProyectos(ctx, w, h, t) {
    ctx.fillStyle = '#04070a';
    ctx.fillRect(0, 0, w, h);
    var cell = Math.max(70, Math.floor(Math.min(w, h) / 7));
    var cols = Math.ceil(w / cell) + 1;
    var rows = Math.ceil(h / cell) + 1;
    for (var i = 0; i < cols; i++) {
      for (var j = 0; j < rows; j++) {
        var pulse = 0.12 + 0.5 * (0.5 + 0.5 * Math.sin(t * 1.4 + (i + j) * 0.7));
        var pad = cell * 0.18;
        ctx.strokeStyle = ((i + j) % 2 ? 'rgba(0,255,255,' : 'rgba(0,255,0,') + pulse.toFixed(3) + ')';
        ctx.lineWidth = 1.5;
        roundRect(ctx, i * cell + pad, j * cell + pad, cell - pad * 2, cell - pad * 2, 6);
        ctx.stroke();
      }
    }
    vignette(ctx, w, h);
  }

  function drawFormacion(ctx, w, h, t) {
    ctx.fillStyle = '#060806';
    ctx.fillRect(0, 0, w, h);
    var cx = w / 2;
    var cy = h / 2;
    var max = Math.hypot(w, h) / 2;
    for (var r = 40; r < max; r += 46) {
      var a = 0.06 + 0.06 * (0.5 + 0.5 * Math.sin(t * 1.1 - r * 0.02));
      ctx.strokeStyle = 'rgba(255,215,0,' + a.toFixed(3) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // central medal
    var glow = 0.6 + 0.3 * Math.sin(t * 2);
    ctx.beginPath();
    ctx.arc(cx, cy, 46, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,215,0,' + (0.15 * glow).toFixed(3) + ')';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,0,0.8)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,255,0,0.9)';
    ctx.font = '600 26px "Fira Code", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', cx, cy + 1);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
    vignette(ctx, w, h);
  }

  function vignette(ctx, w, h) {
    var g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) / 4, w / 2, h / 2, Math.max(w, h) / 1.1);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  var MOTIFS = {
    // Checkpoint 4: EXPERIENCIA section became LOGROS (reuses the binary-rain
    // motif; `experiencia` kept as an alias for backward-compat).
    logros: drawExperiencia,
    experiencia: drawExperiencia,
    proyectos: drawProyectos,
    formacion: drawFormacion
  };

  function canvasFor(sectionId) {
    var sec = document.getElementById(sectionId);
    return sec ? sec.querySelector('.poster-canvas') : null;
  }

  function renderStatic(canvas) {
    var motif = MOTIFS[canvas.getAttribute('data-poster')];
    if (!motif) return;
    var m = fit(canvas);
    motif(m.ctx, m.w, m.h, 0.6);
  }

  function stopAll() {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = null;
    }
    current = null;
  }

  function activate(sectionId) {
    var canvas = canvasFor(sectionId);
    stopAll();
    // pre-draw every poster once so off-screen ones are never blank
    document.querySelectorAll('.poster-canvas').forEach(function (c) {
      if (c !== canvas) renderStatic(c);
    });
    if (!canvas) return;
    var motif = MOTIFS[canvas.getAttribute('data-poster')];
    if (!motif) return;

    if (reduced()) {
      renderStatic(canvas);
      return;
    }

    current = canvas;
    var m = fit(canvas);
    var start = performance.now();
    function loop(now) {
      if (current !== canvas) return;
      // refit if size changed (e.g., rotation)
      if (canvas.getBoundingClientRect().width !== m.w) m = fit(canvas);
      motif(m.ctx, m.w, m.h, (now - start) / 1000);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
  }

  // redraw statics on resize so posters never stretch/blur
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      document.querySelectorAll('.poster-canvas').forEach(function (c) {
        if (c !== current) renderStatic(c);
      });
      if (current) {
        // active loop refits itself on next frame
      }
    }, 160);
  });

  PF.posters = {
    activate: activate,
    stopAll: stopAll,
    renderAllStatic: function () {
      document.querySelectorAll('.poster-canvas').forEach(renderStatic);
    }
  };
})();
