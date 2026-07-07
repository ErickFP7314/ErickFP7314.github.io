/**
 * particles.js — hero interactive network canvas.
 * PF.particles.start(canvas) / PF.particles.stop() — gated to section 01 by
 * main.js's shared IntersectionObserver (design.md: single active-section
 * canvas loop guarantee).
 */
window.PF = window.PF || {};

(function () {
  'use strict';

  var canvas = null;
  var ctx = null;
  var rafId = null;
  var running = false;
  var particlesArr = [];
  var width = 0;
  var height = 0;
  var mouse = { x: null, y: null };

  function countForWidth(w) {
    if (w < 768) return 28;
    if (w < 1024) return 50;
    return 90;
  }

  function resize() {
    if (!canvas) return;
    width = canvas.width = canvas.offsetWidth;
    height = canvas.height = canvas.offsetHeight;
  }

  function initParticles() {
    var n = countForWidth(width);
    particlesArr = [];
    for (var i = 0; i < n; i++) {
      particlesArr.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4
      });
    }
  }

  function drawStatic() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(0, 255, 0, 0.4)';
    for (var i = 0; i < particlesArr.length; i++) {
      var p = particlesArr[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function tick() {
    if (!running) return;
    ctx.clearRect(0, 0, width, height);

    for (var i = 0; i < particlesArr.length; i++) {
      var p = particlesArr[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;
      if (mouse.x !== null) {
        var dx = p.x - mouse.x;
        var dy = p.y - mouse.y;
        var d = Math.hypot(dx, dy);
        if (d < 80 && d > 0.001) {
          p.x += (dx / d) * 0.6;
          p.y += (dy / d) * 0.6;
        }
      }
    }

    ctx.fillStyle = 'rgba(0, 255, 0, 0.6)';
    for (var j = 0; j < particlesArr.length; j++) {
      var pj = particlesArr[j];
      ctx.beginPath();
      ctx.arc(pj.x, pj.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(0, 255, 0, 0.15)';
    for (var a = 0; a < particlesArr.length; a++) {
      for (var b = a + 1; b < particlesArr.length; b++) {
        var pa = particlesArr[a];
        var pb = particlesArr[b];
        var ddx = pa.x - pb.x;
        var ddy = pa.y - pb.y;
        var dist = Math.hypot(ddx, ddy);
        if (dist < 120) {
          ctx.globalAlpha = 1 - dist / 120;
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.lineTo(pb.x, pb.y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;

    rafId = requestAnimationFrame(tick);
  }

  function onMouseMove(e) {
    if (!canvas) return;
    var rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  }

  function onResize() {
    resize();
    initParticles();
    if (!running || (PF.state && PF.state.reducedMotion)) {
      drawStatic();
    }
  }

  PF.particles = {
    start: function (targetCanvas) {
      if (running) return;
      canvas = targetCanvas || document.getElementById('particlesCanvas');
      if (!canvas || !canvas.getContext) return;

      ctx = canvas.getContext('2d');
      resize();
      initParticles();
      running = true;
      window.addEventListener('resize', onResize);

      var reducedMotion = !!(PF.state && PF.state.reducedMotion);
      if (reducedMotion) {
        drawStatic();
        return; // no rAF loop under reduced motion — static dots only
      }

      var isTouch = !!(PF.state && PF.state.isTouch);
      if (!isTouch) {
        canvas.addEventListener('mousemove', onMouseMove);
      }

      rafId = requestAnimationFrame(tick);
    },

    stop: function () {
      running = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      window.removeEventListener('resize', onResize);
      if (canvas) {
        canvas.removeEventListener('mousemove', onMouseMove);
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      mouse.x = null;
      mouse.y = null;
    }
  };
})();
