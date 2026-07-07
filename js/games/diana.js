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
  // TARGET.y is mutated every frame from level 2 onward (oscillation) —
  // TARGET.y0 keeps the original, fixed center as the reference.
  var TARGET = { x: W - 90, y: H / 2, y0: H / 2 };
  var RINGS = [
    { r: 70, score: 0, color: '#444444' },
    { r: 50, score: 2, color: '#99ff99' },
    { r: 30, score: 5, color: '#66ff66' },
    { r: 12, score: 10, color: '#ffd700' }
  ];
  var MAX_PULL = 70;
  var TOTAL_ARROWS = 5;

  // Batch 6B — difficulty: level shrinks the rings and (from level 2) makes
  // the target bob up/down; a shot clock forces a release if the player
  // dawdles; missing the board entirely costs points; consecutive hits
  // (streak) raise the level, a miss (or the round) lowers it — a real but
  // fair, progressive challenge instead of a static easy target.
  var LEVEL_MAX = 8;
  var MISS_PENALTY = 4;
  var BASE_SHOT_MS = 3200;
  var MIN_SHOT_MS = 1300;
  var SHOT_MS_STEP = 220;

  var canvas, ctx, hud, overlay, mount;
  var raf = null;
  var running = false;
  var dragging = false;
  var aim = { x: 0, y: 0 };
  var arrowsLeft, totalScore, flying, lastResult;
  var level = 1, streak = 0, animT = 0, shotDeadline = null;
  var pendingOverlayTimer = null;
  var pointerDownHandler, pointerMoveHandler, pointerUpHandler;

  function shrinkFactor(lvl) {
    return Math.max(0.55, 1 - (lvl - 1) * 0.07);
  }

  function currentRings() {
    var f = shrinkFactor(level);
    return RINGS.map(function (ring) {
      return { r: Math.max(6, ring.r * f), score: ring.score, color: ring.color };
    });
  }

  function currentShotMs() {
    return Math.max(MIN_SHOT_MS, BASE_SHOT_MS - (level - 1) * SHOT_MS_STEP);
  }

  function armShotClock() {
    shotDeadline = (running && arrowsLeft > 0) ? performance.now() + currentShotMs() : null;
  }

  function reset() {
    arrowsLeft = TOTAL_ARROWS;
    totalScore = 0;
    dragging = false;
    flying = null;
    lastResult = null;
    aim = { x: ANCHOR.x, y: ANCHOR.y };
    running = true;
    // NOTE: level/streak intentionally persist across rounds (retry) so
    // difficulty keeps climbing across a play session; they only reset in
    // stop() (teardown when the slide leaves the viewport).
    armShotClock();
    updateHud();
    hideOverlay();
  }

  function updateHud() {
    if (hud) hud.textContent = 'NIVEL ' + level + '  ·  FLECHAS: ' + arrowsLeft + '  ·  PUNTAJE: ' + totalScore;
  }

  function showOverlay() {
    if (!overlay) return;
    overlay.innerHTML =
      '<div class="pf-game-over mono">' +
      '<p>Ronda terminada — Nivel ' + level + '</p>' +
      '<p class="pf-game-score">Puntaje total: ' + totalScore + '</p>' +
      '<button type="button" class="pf-game-retry mono">Reintentar</button>' +
      '</div>';
    overlay.classList.add('visible');
    var btn = overlay.querySelector('.pf-game-retry');
    if (btn) {
      btn.addEventListener('click', function () {
        reset();
        // Bugfix (batch 6B): the rAF chain dies once running/flying are both
        // false (loop() stops re-scheduling itself), so retry must kick it
        // off again explicitly or the canvas goes permanently inert.
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(loop);
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

    // The target may be moving (level 2+) — the shot travels toward where
    // the target IS RIGHT NOW, but resolveShot() re-checks against its LIVE
    // position when the arrow actually lands, so a moving target must be led.
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

  // Batch 6B: the shot clock ran out before the player released — counts as
  // a wasted arrow (miss penalty), same as landing outside the board.
  function forceFire() {
    if (!running || flying || arrowsLeft <= 0) return;
    var dx = aim.x - ANCHOR.x;
    var dy = aim.y - ANCHOR.y;
    var pull = Math.sqrt(dx * dx + dy * dy);
    dragging = false;
    if (pull < 8) {
      arrowsLeft--;
      totalScore = Math.max(0, totalScore - MISS_PENALTY);
      streak = 0;
      level = Math.max(1, level - 1);
      lastResult = '¡Tiempo! −' + MISS_PENALTY;
      sfx('miss');
      aim = { x: ANCHOR.x, y: ANCHOR.y };
      updateHud();
      if (arrowsLeft <= 0) {
        running = false;
        pendingOverlayTimer = setTimeout(function () { pendingOverlayTimer = null; showOverlay(); }, 500);
      } else {
        armShotClock();
      }
      return;
    }
    fire();
  }

  function resolveShot(landing) {
    var rings = currentRings();
    var dx = landing.x - TARGET.x;
    var dy = landing.y - TARGET.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > rings[0].r) {
      // Landed completely off the (shrunken) board — a real miss.
      totalScore = Math.max(0, totalScore - MISS_PENALTY);
      streak = 0;
      level = Math.max(1, level - 1);
      lastResult = 'Fallo −' + MISS_PENALTY;
      sfx('miss');
    } else {
      var ringScore = 0;
      for (var i = 0; i < rings.length; i++) {
        if (dist <= rings[i].r) ringScore = rings[i].score;
      }
      totalScore += ringScore;
      if (ringScore > 0) {
        streak++;
        // Every 2 consecutive scoring hits, difficulty ramps up one notch.
        if (streak % 2 === 0) level = Math.min(LEVEL_MAX, level + 1);
        lastResult = ringScore === 10 ? '¡Diana!' : '+' + ringScore;
        sfx(ringScore === 10 ? 'bullseye' : 'hit');
      } else {
        // Hit the outer (0-point) ring: no penalty, but breaks the streak.
        streak = 0;
        lastResult = '0 puntos';
        sfx('miss');
      }
    }

    updateHud();

    if (arrowsLeft <= 0) {
      running = false;
      pendingOverlayTimer = setTimeout(function () { pendingOverlayTimer = null; showOverlay(); }, 500);
    } else {
      armShotClock();
    }
  }

  function update() {
    animT += 1;
    // From level 2 onward the target bobs vertically; amplitude/speed both
    // grow with level ("se mueven ... dificultad progresiva por nivel").
    if (level >= 2) {
      var amp = Math.min(60, (level - 1) * 7);
      var speed = 0.0022 + level * 0.00035;
      TARGET.y = TARGET.y0 + Math.sin(animT * speed) * amp;
    } else {
      TARGET.y = TARGET.y0;
    }

    if (flying) {
      flying.t += 0.06;
      if (flying.t >= 1) {
        flying.t = 1;
        resolveShot(flying.to);
        flying = null;
      }
      return;
    }

    // Shot clock: forces a release if the player takes too long to draw —
    // gets stricter every level ("aparición más rápida").
    if (running && arrowsLeft > 0 && shotDeadline && performance.now() > shotDeadline) {
      forceFire();
    }
  }

  function drawTarget() {
    var rings = currentRings();
    for (var i = 0; i < rings.length; i++) {
      ctx.beginPath();
      ctx.fillStyle = rings[i].color;
      ctx.arc(TARGET.x, TARGET.y, rings[i].r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.arc(TARGET.x, TARGET.y, rings[0].r, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawShotClock() {
    if (!shotDeadline || flying || !running || arrowsLeft <= 0) return;
    var remain = Math.max(0, shotDeadline - performance.now());
    var frac = Math.min(1, remain / currentShotMs());
    ctx.beginPath();
    ctx.strokeStyle = frac > 0.3 ? 'rgba(0,255,0,0.55)' : 'rgba(255,51,51,0.8)';
    ctx.lineWidth = 3;
    ctx.arc(ANCHOR.x, ANCHOR.y, 42, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
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
    drawShotClock();

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
    if (pendingOverlayTimer) { clearTimeout(pendingOverlayTimer); pendingOverlayTimer = null; }

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
    // Teardown (slide left viewport): difficulty progression resets so the
    // next visit starts fresh at level 1.
    level = 1;
    streak = 0;
    animT = 0;
    shotDeadline = null;
    TARGET.y = TARGET.y0;
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
