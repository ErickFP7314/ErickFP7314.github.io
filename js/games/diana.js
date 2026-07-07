/**
 * games/diana.js — adapted from Effects-library/games/diana (SVG archery
 * game originally built on GSAP TweenMax/MorphSVGPlugin from a CDN).
 * Reimplemented as a dependency-free 2D canvas game re-skinned to the
 * portfolio's terminal palette, keeping the "draw back and release" aiming
 * mechanic ("Diana" = target/bullseye in Spanish — fits the gold-medal
 * "puntería de precisión" placement in Formación).
 *
 * Drag from the bow anchor (mouse or touch), release to fire; 5 arrows per
 * round, score by ring (bullseye/inner/outer/miss), total shown at the end.
 * Contract: { init(mountEl, state), start(), stop() }.
 */
window.PF = window.PF || {};
PF.games = PF.games || {};

(function () {
  'use strict';

  function sfx(n) { if (window.PF && PF.audio && PF.audio.play) PF.audio.play(n); }

  var W = 460, H = 300;
  var ANCHOR = { x: 70, y: H / 2 };
  var TARGET = { x: W - 90, y: H / 2 };
  var RINGS = [
    { r: 70, score: 0, color: '#444444' },
    { r: 50, score: 2, color: '#99ff99' },
    { r: 30, score: 5, color: '#66ff66' },
    { r: 12, score: 10, color: '#ffd700' }
  ];
  var MAX_PULL = 70;
  var TOTAL_ARROWS = 5;

  var canvas, ctx, hud, overlay, mount;
  var raf = null;
  var running = false;
  var dragging = false;
  var aim = { x: 0, y: 0 };
  var arrowsLeft, totalScore, flying, lastResult;
  var pointerDownHandler, pointerMoveHandler, pointerUpHandler;

  function reset() {
    arrowsLeft = TOTAL_ARROWS;
    totalScore = 0;
    dragging = false;
    flying = null;
    lastResult = null;
    aim = { x: ANCHOR.x, y: ANCHOR.y };
    running = true;
    updateHud();
    hideOverlay();
  }

  function updateHud() {
    if (hud) hud.textContent = 'FLECHAS: ' + arrowsLeft + '  ·  PUNTAJE: ' + totalScore;
  }

  function showOverlay() {
    if (!overlay) return;
    overlay.innerHTML =
      '<div class="pf-game-over mono">' +
      '<p>Ronda terminada</p>' +
      '<p class="pf-game-score">Puntaje total: ' + totalScore + '</p>' +
      '<button type="button" class="pf-game-retry mono">Reintentar</button>' +
      '</div>';
    overlay.classList.add('visible');
    var btn = overlay.querySelector('.pf-game-retry');
    if (btn) {
      btn.addEventListener('click', function () {
        reset();
      });
      btn.focus();
    }
  }

  function hideOverlay() {
    if (overlay) {
      overlay.classList.remove('visible');
      overlay.innerHTML = '';
    }
  }

  function pointerPos(e) {
    var rect = canvas.getBoundingClientRect();
    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
    var clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (W / rect.width),
      y: (clientY - rect.top) * (H / rect.height)
    };
  }

  function onPointerDown(e) {
    if (!running || flying || arrowsLeft <= 0) return;
    e.preventDefault();
    dragging = true;
    aim = pointerPos(e);
  }

  function onPointerMove(e) {
    if (!dragging) return;
    e.preventDefault();
    var p = pointerPos(e);
    var dx = p.x - ANCHOR.x;
    var dy = p.y - ANCHOR.y;
    var dist = Math.min(Math.sqrt(dx * dx + dy * dy), MAX_PULL);
    var angle = Math.atan2(dy, dx);
    aim = { x: ANCHOR.x + Math.cos(angle) * dist, y: ANCHOR.y + Math.sin(angle) * dist };
  }

  function onPointerUp(e) {
    if (!dragging) return;
    e.preventDefault();
    dragging = false;
    fire();
  }

  function fire() {
    if (arrowsLeft <= 0) return;
    var dx = aim.x - ANCHOR.x;
    var dy = aim.y - ANCHOR.y;
    var pull = Math.sqrt(dx * dx + dy * dy);
    if (pull < 8) { aim = { x: ANCHOR.x, y: ANCHOR.y }; return; }

    // Power proportional to pull distance; aim direction is the inverse of
    // the drag vector (pull back, release forward), same feel as the bow
    // in the original Effects-library/games/diana.
    var power = pull / MAX_PULL; // 0..1
    var launchAngle = Math.atan2(-dy, -dx) - Math.PI; // toward target side
    // Vertical aim offset scales with how far up/down the player pulled.
    var vertOffset = (-dy / MAX_PULL) * 90;
    // Imprecise pulls (too soft or maxed out) add jitter — rewards a
    // deliberate, moderate draw (skill-based difficulty).
    var precision = 1 - Math.abs(power - 0.75) / 0.75;
    var jitter = (1 - Math.max(0.15, precision)) * 40 * (Math.random() * 2 - 1);

    var landing = {
      x: TARGET.x,
      y: TARGET.y - vertOffset * (power) + jitter
    };

    flying = { from: { x: ANCHOR.x, y: ANCHOR.y }, to: landing, t: 0 };
    sfx('shoot');
    arrowsLeft--;
    updateHud();
    aim = { x: ANCHOR.x, y: ANCHOR.y };
  }

  function resolveShot(landing) {
    var dx = landing.x - TARGET.x;
    var dy = landing.y - TARGET.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var ringScore = 0;
    for (var i = 0; i < RINGS.length; i++) {
      if (dist <= RINGS[i].r) ringScore = RINGS[i].score;
    }
    totalScore += ringScore;
    lastResult = ringScore === 10 ? '¡Diana!' : ringScore > 0 ? '+' + ringScore : 'Fallo';
    sfx(ringScore === 10 ? 'bullseye' : ringScore > 0 ? 'hit' : 'miss');
    updateHud();

    if (arrowsLeft <= 0) {
      running = false;
      setTimeout(showOverlay, 500);
    }
  }

  function update() {
    if (flying) {
      flying.t += 0.06;
      if (flying.t >= 1) {
        flying.t = 1;
        resolveShot(flying.to);
        flying = null;
      }
    }
  }

  function drawTarget() {
    for (var i = 0; i < RINGS.length; i++) {
      ctx.beginPath();
      ctx.fillStyle = RINGS[i].color;
      ctx.arc(TARGET.x, TARGET.y, RINGS[i].r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.arc(TARGET.x, TARGET.y, RINGS[0].r, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawBow() {
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ANCHOR.x, ANCHOR.y, 34, Math.PI * 0.6, -Math.PI * 0.6, true);
    ctx.stroke();

    // aim line
    if (dragging || (aim.x !== ANCHOR.x || aim.y !== ANCHOR.y)) {
      ctx.strokeStyle = 'rgba(0,255,255,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ANCHOR.x, ANCHOR.y);
      ctx.lineTo(aim.x, aim.y);
      ctx.stroke();
    }
  }

  function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    drawTarget();
    drawBow();

    if (flying) {
      var t = flying.t;
      var x = flying.from.x + (flying.to.x - flying.from.x) * t;
      var y = flying.from.y + (flying.to.y - flying.from.y) * t - Math.sin(t * Math.PI) * 20;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 14, y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    if (lastResult && !flying) {
      ctx.fillStyle = '#ffd700';
      ctx.font = '20px "Fira Code", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(lastResult, W / 2, 40);
      ctx.textAlign = 'left';
    }
  }

  function loop() {
    if (!running && !flying) {
      draw();
      return;
    }
    update();
    draw();
    raf = requestAnimationFrame(loop);
  }

  function init(mountEl) {
    mount = mountEl;
    mount.innerHTML = '';

    var wrap = document.createElement('div');
    wrap.className = 'pf-game-wrap';

    hud = document.createElement('div');
    hud.className = 'pf-game-hud mono';

    var canvasWrap = document.createElement('div');
    canvasWrap.className = 'pf-canvas-wrap';

    canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    canvas.className = 'pf-game-canvas';
    canvas.setAttribute('aria-label', 'Diana — arrastra desde el arco y suelta para disparar');

    overlay = document.createElement('div');
    overlay.className = 'pf-game-overlay';

    canvasWrap.appendChild(canvas);
    canvasWrap.appendChild(overlay);
    wrap.appendChild(hud);
    wrap.appendChild(canvasWrap);
    mount.appendChild(wrap);

    ctx = canvas.getContext('2d');
  }

  function start() {
    reset();

    pointerDownHandler = onPointerDown;
    pointerMoveHandler = onPointerMove;
    pointerUpHandler = onPointerUp;

    canvas.addEventListener('mousedown', pointerDownHandler);
    canvas.addEventListener('mousemove', pointerMoveHandler);
    window.addEventListener('mouseup', pointerUpHandler);
    canvas.addEventListener('touchstart', pointerDownHandler, { passive: false });
    canvas.addEventListener('touchmove', pointerMoveHandler, { passive: false });
    canvas.addEventListener('touchend', pointerUpHandler, { passive: false });

    raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;

    if (canvas) {
      if (pointerDownHandler) {
        canvas.removeEventListener('mousedown', pointerDownHandler);
        canvas.removeEventListener('touchstart', pointerDownHandler);
      }
      if (pointerMoveHandler) {
        canvas.removeEventListener('mousemove', pointerMoveHandler);
        canvas.removeEventListener('touchmove', pointerMoveHandler);
      }
      if (pointerUpHandler) {
        canvas.removeEventListener('touchend', pointerUpHandler);
      }
    }
    if (pointerUpHandler) window.removeEventListener('mouseup', pointerUpHandler);

    pointerDownHandler = null;
    pointerMoveHandler = null;
    pointerUpHandler = null;
    canvas = null;
    ctx = null;
    hud = null;
    overlay = null;
    mount = null;
  }

  PF.games.diana = { init: init, start: start, stop: stop };
})();

/* =========================================================================
   Embedded (in-place) Diana — checkpoint 4 Tanda B. Same "draw back & release"
   mechanic, re-skinned to the palette, floating on the Formación section via
   PF.embed. Fully independent closure/state from the modal game above.
   Embed contract: { preview(stage), play(stage, onOver), pause(), resume(), stop() }.
   ========================================================================= */
(function () {
  'use strict';

  function sfx(n) { if (window.PF && PF.audio && PF.audio.play) PF.audio.play(n); }

  var W = 440, H = 300;
  var ANCHOR = { x: 66, y: H / 2 };
  var TARGET = { x: W - 84, y: H / 2 };
  var RINGS = [
    { r: 66, score: 0, color: '#0d3a1a' },
    { r: 48, score: 2, color: '#1f7a3a' },
    { r: 30, score: 5, color: '#00c853' },
    { r: 12, score: 10, color: '#00ffff' }
  ];
  var MAX_PULL = 68;
  var TOTAL = 5;

  var cv, ctx, stageEl;
  var raf = null, running = false, paused = false, dragging = false;
  var aim = { x: ANCHOR.x, y: ANCHOR.y };
  var arrowsLeft, total, flying, lastResult, onOverCb;
  var downH, moveH, upH;

  function ensureCanvas(stage) {
    stageEl = stage;
    cv = stage.querySelector('canvas.pf-diana-canvas');
    if (!cv) {
      cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      cv.className = 'pf-diana-canvas';
      cv.setAttribute('aria-label', 'Diana — arrastra desde el arco y suelta para disparar');
      stage.appendChild(cv);
    }
    ctx = cv.getContext('2d');
  }

  function pos(e) {
    var r = cv.getBoundingClientRect();
    var cx = e.touches ? e.touches[0].clientX : e.clientX;
    var cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (cx - r.left) * (W / r.width), y: (cy - r.top) * (H / r.height) };
  }

  function down(e) {
    if (!running || paused || flying || arrowsLeft <= 0) return;
    e.preventDefault(); e.stopPropagation();
    dragging = true; aim = pos(e);
  }
  function move(e) {
    if (!dragging) return;
    e.preventDefault();
    var p = pos(e);
    var dx = p.x - ANCHOR.x, dy = p.y - ANCHOR.y;
    var dist = Math.min(Math.sqrt(dx * dx + dy * dy), MAX_PULL);
    var a = Math.atan2(dy, dx);
    aim = { x: ANCHOR.x + Math.cos(a) * dist, y: ANCHOR.y + Math.sin(a) * dist };
  }
  function up(e) {
    if (!dragging) return;
    e.preventDefault();
    dragging = false;
    fire();
  }

  function fire() {
    var dx = aim.x - ANCHOR.x, dy = aim.y - ANCHOR.y;
    var pull = Math.sqrt(dx * dx + dy * dy);
    if (pull < 8) { aim = { x: ANCHOR.x, y: ANCHOR.y }; return; }
    var power = pull / MAX_PULL;
    var vertOffset = (-dy / MAX_PULL) * 90;
    var precision = 1 - Math.abs(power - 0.75) / 0.75;
    var jitter = (1 - Math.max(0.15, precision)) * 38 * (Math.random() * 2 - 1);
    flying = { from: { x: ANCHOR.x, y: ANCHOR.y }, to: { x: TARGET.x, y: TARGET.y - vertOffset * power + jitter }, t: 0 };
    sfx('shoot');
    arrowsLeft--;
    aim = { x: ANCHOR.x, y: ANCHOR.y };
  }

  function resolve(landing) {
    var dx = landing.x - TARGET.x, dy = landing.y - TARGET.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var s = 0;
    for (var i = 0; i < RINGS.length; i++) if (dist <= RINGS[i].r) s = RINGS[i].score;
    total += s;
    lastResult = s === 10 ? '¡Diana!' : s > 0 ? '+' + s : 'Fallo';
    sfx(s === 10 ? 'bullseye' : s > 0 ? 'hit' : 'miss');
    if (arrowsLeft <= 0) {
      running = false;
      setTimeout(function () { if (onOverCb) onOverCb(total); }, 400);
    }
  }

  function update() {
    if (flying) {
      flying.t += 0.06;
      if (flying.t >= 1) { flying.t = 1; resolve(flying.to); flying = null; }
    }
  }

  function draw() {
    ctx.fillStyle = 'rgba(2,10,4,1)';
    ctx.fillRect(0, 0, W, H);
    // rings
    for (var i = 0; i < RINGS.length; i++) {
      ctx.beginPath(); ctx.fillStyle = RINGS[i].color;
      ctx.arc(TARGET.x, TARGET.y, RINGS[i].r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.beginPath(); ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2;
    ctx.arc(TARGET.x, TARGET.y, RINGS[0].r, 0, Math.PI * 2); ctx.stroke();
    // bow
    ctx.strokeStyle = '#00ff00'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(ANCHOR.x, ANCHOR.y, 32, Math.PI * 0.6, -Math.PI * 0.6, true); ctx.stroke();
    if (dragging || aim.x !== ANCHOR.x || aim.y !== ANCHOR.y) {
      ctx.strokeStyle = 'rgba(0,255,255,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ANCHOR.x, ANCHOR.y); ctx.lineTo(aim.x, aim.y); ctx.stroke();
    }
    if (flying) {
      var t = flying.t;
      var x = flying.from.x + (flying.to.x - flying.from.x) * t;
      var y = flying.from.y + (flying.to.y - flying.from.y) * t - Math.sin(t * Math.PI) * 18;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.lineTo(x, y); ctx.stroke();
    }
    ctx.fillStyle = '#00ffcc';
    ctx.font = '14px "Fira Code", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('FLECHAS: ' + Math.max(0, arrowsLeft) + '  PUNTAJE: ' + total, 12, 22);
    if (lastResult && !flying) {
      ctx.fillStyle = '#ffd700'; ctx.font = '18px "Fira Code", monospace';
      ctx.textAlign = 'center'; ctx.fillText(lastResult, W / 2, 44); ctx.textAlign = 'left';
    }
    if (!running && arrowsLeft <= 0) {
      ctx.fillStyle = '#ffd700'; ctx.font = '600 22px "Fira Code", monospace';
      ctx.textAlign = 'center'; ctx.fillText('Puntaje: ' + total, W / 2, H / 2 - 84); ctx.textAlign = 'left';
    }
  }

  function loop() {
    if (!paused) update();
    draw();
    raf = requestAnimationFrame(loop);
  }

  function reset() {
    arrowsLeft = TOTAL; total = 0; flying = null; lastResult = null;
    dragging = false; aim = { x: ANCHOR.x, y: ANCHOR.y };
  }

  function preview(stage) {
    ensureCanvas(stage);
    running = false; paused = false;
    reset();
    draw();
  }

  function play(stage, onOver) {
    ensureCanvas(stage);
    onOverCb = onOver;
    reset();
    running = true; paused = false;
    downH = down; moveH = move; upH = up;
    cv.addEventListener('mousedown', downH);
    cv.addEventListener('mousemove', moveH);
    window.addEventListener('mouseup', upH);
    cv.addEventListener('touchstart', downH, { passive: false });
    cv.addEventListener('touchmove', moveH, { passive: false });
    cv.addEventListener('touchend', upH, { passive: false });
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function pause() { paused = true; }
  function resume() { paused = false; }

  function stop() {
    running = false; paused = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    if (cv) {
      cv.removeEventListener('mousedown', downH);
      cv.removeEventListener('mousemove', moveH);
      cv.removeEventListener('touchstart', downH);
      cv.removeEventListener('touchmove', moveH);
      cv.removeEventListener('touchend', upH);
    }
    window.removeEventListener('mouseup', upH);
    onOverCb = null;
  }

  PF.games.dianaEmbed = { preview: preview, play: play, pause: pause, resume: resume, stop: stop };
})();
