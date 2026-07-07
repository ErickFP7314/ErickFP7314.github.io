/**
 * games/blocks.js — the classic "stack" game, re-skinned to the portfolio's
 * terminal palette (green/cyan) and rendered as shaded 2.5D / isometric
 * cuboids (top = light face, front = base, right = dark face) so the blocks
 * read as convincingly 3D on a plain 2D canvas — NO three.js, NO CDN, keeping
 * the site's zero-external-dependency rule (Google Fonts only).
 *
 * Two entry points share the same renderer:
 *   - The full game inside the modal (PF.games.blocks.{init,start,stop}).
 *   - A small self-playing "attract loop" preview on the Proyectos section
 *     (PF.games.blocks.{startPreview,stopPreview}), gated to the active
 *     section + reduced-motion by main.js.
 *
 * Mechanic: a block slides back and forth above the stack; click / tap /
 * space / Enter drops it. Overlap with the block below is kept, the rest is
 * chopped off; game over when there is no overlap. Camera scrolls as the tower
 * grows. Contract: { init(mountEl, state), start(), stop() }.
 */
window.PF = window.PF || {};
PF.games = PF.games || {};

(function () {
  'use strict';

  var W = 320, H = 400;
  var BLOCK_H = 26;
  var DEPTH = 9;           // isometric depth (px) of the top/right faces
  var BASE_SPEED = 2.2;
  var SPEED_STEP = 0.12;
  var MAX_SPEED = 6;

  var canvas, ctx, hud, overlay, mount;
  var raf = null;
  var running = false;
  var stack, moving, camY, score, speed;
  var keydownHandler, actionHandler;

  var COLORS = ['#00ff00', '#00ffff', '#66ff66', '#4dffff', '#80ff80', '#80ffff'];

  function colorFor(i) {
    return COLORS[i % COLORS.length];
  }

  // ---- shared 3D renderer ------------------------------------------------

  // Mix a #rrggbb color toward white (amt>0) or black (amt<0), amt in [-1,1].
  function shade(hex, amt) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    var t = amt < 0 ? 0 : 255;
    var p = Math.abs(amt);
    r = Math.round(r + (t - r) * p);
    g = Math.round(g + (t - g) * p);
    b = Math.round(b + (t - b) * p);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  // Draw one shaded cuboid: front rect + top parallelogram (lighter) + right
  // parallelogram (darker), projected up-and-right by `d`.
  function draw3DBlock(c, x, y, w, h, d, color) {
    // top face (lightest)
    c.fillStyle = shade(color, 0.35);
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + d, y - d);
    c.lineTo(x + w + d, y - d);
    c.lineTo(x + w, y);
    c.closePath();
    c.fill();

    // right face (darkest)
    c.fillStyle = shade(color, -0.4);
    c.beginPath();
    c.moveTo(x + w, y);
    c.lineTo(x + w + d, y - d);
    c.lineTo(x + w + d, y - d + h);
    c.lineTo(x + w, y + h);
    c.closePath();
    c.fill();

    // front face (base color)
    c.fillStyle = color;
    c.fillRect(x, y, w, h);

    // subtle edge highlight so faces stay legible on the black bg
    c.strokeStyle = shade(color, 0.55);
    c.lineWidth = 1;
    c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  function newMovingBlock(base) {
    var goingRight = Math.random() > 0.5;
    return {
      x: goingRight ? -base.w : W,
      y: base.y - BLOCK_H,
      w: base.w,
      dir: goingRight ? 1 : -1
    };
  }

  function reset() {
    stack = [{ x: (W - 140) / 2, y: H - BLOCK_H - DEPTH, w: 140 }];
    score = 0;
    speed = BASE_SPEED;
    camY = 0;
    running = true;
    moving = newMovingBlock(stack[0]);
    updateHud();
    hideOverlay();
  }

  function updateHud() {
    if (hud) hud.textContent = 'BLOQUES: ' + score;
  }

  function showOverlay() {
    if (!overlay) return;
    overlay.innerHTML =
      '<div class="pf-game-over mono">' +
      '<p>Game Over</p>' +
      '<p class="pf-game-score">Bloques apilados: ' + score + '</p>' +
      '<button type="button" class="pf-game-retry mono">Reintentar</button>' +
      '</div>';
    overlay.classList.add('visible');
    var btn = overlay.querySelector('.pf-game-retry');
    if (btn) {
      btn.addEventListener('click', function () {
        reset();
        loop();
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

  function endGame() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    showOverlay();
  }

  function placeBlock() {
    var base = stack[stack.length - 1];
    var left = Math.max(moving.x, base.x);
    var right = Math.min(moving.x + moving.w, base.x + base.w);
    var overlapW = right - left;

    if (overlapW <= 4) {
      endGame();
      return;
    }

    stack.push({ x: left, y: moving.y, w: overlapW });
    score++;
    speed = Math.min(MAX_SPEED, speed + SPEED_STEP);
    updateHud();
    moving = newMovingBlock(stack[stack.length - 1]);

    var topY = stack[stack.length - 1].y;
    var desiredCamY = Math.max(0, (H / 2) - topY);
    camY = desiredCamY;
  }

  function update() {
    moving.x += moving.dir * speed;
    if (moving.x < -moving.w || moving.x > W) {
      moving.dir *= -1;
      moving.x = Math.max(-moving.w, Math.min(W, moving.x));
    }
  }

  // Shared draw of a tower + moving block (used by both game and preview).
  function renderStack(c, w, h, st, mv, cam) {
    c.fillStyle = '#000';
    c.fillRect(0, 0, w, h);
    c.save();
    c.translate(0, cam);
    // bottom-to-top so upper blocks paint over the lower block's top face
    for (var i = 0; i < st.length; i++) {
      draw3DBlock(c, st[i].x, st[i].y, st[i].w, BLOCK_H, DEPTH, colorFor(i));
    }
    if (mv) draw3DBlock(c, mv.x, mv.y, mv.w, BLOCK_H, DEPTH, colorFor(st.length));
    c.restore();
  }

  function draw() {
    renderStack(ctx, W, H, stack, moving, camY);
  }

  function loop() {
    if (!running) return;
    update();
    draw();
    raf = requestAnimationFrame(loop);
  }

  function onAction(e) {
    if (e) e.preventDefault();
    if (!running) return;
    placeBlock();
  }

  function onKeydown(e) {
    if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
      onAction(e);
    }
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
    canvas.className = 'pf-game-canvas pf-game-canvas--tall';
    canvas.setAttribute('aria-label', 'Torre de bloques 3D — clic o espacio para encajar');

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

    keydownHandler = onKeydown;
    actionHandler = onAction;

    document.addEventListener('keydown', keydownHandler);
    canvas.addEventListener('click', actionHandler);
    canvas.addEventListener('touchstart', actionHandler, { passive: false });

    raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;

    if (keydownHandler) document.removeEventListener('keydown', keydownHandler);
    if (canvas && actionHandler) {
      canvas.removeEventListener('click', actionHandler);
      canvas.removeEventListener('touchstart', actionHandler);
    }

    keydownHandler = null;
    actionHandler = null;
    canvas = null;
    ctx = null;
    hud = null;
    overlay = null;
    mount = null;
  }

  // =======================================================================
  // Attract-loop preview (Proyectos section). Self-playing; never reads or
  // mutates the modal-game state above (its own closure vars). Gated to the
  // active section + reduced-motion by main.js.
  // =======================================================================
  var pCanvas = null, pCtx = null, pRaf = null;
  var pW = 200, pH = 260, pBlockH = 20, pDepth = 7;
  var pStack, pMoving, pSpeed, pCamY, pTimer;

  function pColorFor(i) { return COLORS[i % COLORS.length]; }

  function pRenderStack() {
    pCtx.fillStyle = '#000';
    pCtx.fillRect(0, 0, pW, pH);
    pCtx.save();
    pCtx.translate(0, pCamY);
    for (var i = 0; i < pStack.length; i++) {
      draw3DBlock(pCtx, pStack[i].x, pStack[i].y, pStack[i].w, pBlockH, pDepth, pColorFor(i));
    }
    if (pMoving) draw3DBlock(pCtx, pMoving.x, pMoving.y, pMoving.w, pBlockH, pDepth, pColorFor(pStack.length));
    pCtx.restore();
  }

  function pReset() {
    var w0 = 96;
    pStack = [{ x: (pW - w0) / 2, y: pH - pBlockH - pDepth, w: w0 }];
    pSpeed = 1.6;
    pCamY = 0;
    pTimer = 0;
    pNewMoving();
  }

  function pNewMoving() {
    var base = pStack[pStack.length - 1];
    var right = Math.random() > 0.5;
    pMoving = { x: right ? -base.w : pW, y: base.y - pBlockH, w: base.w, dir: right ? 1 : -1 };
  }

  function pPlace() {
    var base = pStack[pStack.length - 1];
    // auto-play: aim near-perfect with a small random imperfection
    var target = base.x + (Math.random() - 0.5) * 22;
    pMoving.x = target;
    var left = Math.max(pMoving.x, base.x);
    var rightEdge = Math.min(pMoving.x + pMoving.w, base.x + base.w);
    var overlapW = rightEdge - left;
    if (overlapW <= 10 || pStack.length >= 9) {
      pReset();
      return;
    }
    pStack.push({ x: left, y: pMoving.y, w: overlapW });
    pSpeed = Math.min(3.4, pSpeed + 0.08);
    var topY = pStack[pStack.length - 1].y;
    pCamY = Math.max(0, (pH * 0.55) - topY);
    pNewMoving();
  }

  function pStaticFrame() {
    // A pleasant pre-built 3D tower for reduced-motion (no animation).
    pReset();
    var widths = [96, 88, 80, 74, 66];
    var y = pH - pBlockH - pDepth;
    pStack = [];
    var x = (pW - widths[0]) / 2;
    for (var i = 0; i < widths.length; i++) {
      pStack.push({ x: x + i * 3, y: y - i * pBlockH, w: widths[i] });
    }
    pMoving = null;
    pCamY = 0;
    pRenderStack();
  }

  function pLoop() {
    pMoving.x += pMoving.dir * pSpeed;
    if (pMoving.x < -pMoving.w || pMoving.x > pW) {
      pMoving.dir *= -1;
      pMoving.x = Math.max(-pMoving.w, Math.min(pW, pMoving.x));
    }
    pTimer++;
    if (pTimer >= 62) { pTimer = 0; pPlace(); }
    pRenderStack();
    pRaf = requestAnimationFrame(pLoop);
  }

  function startPreview(cv) {
    if (!cv) return;
    stopPreview();
    pCanvas = cv;
    pW = cv.width;
    pH = cv.height;
    pCtx = cv.getContext('2d');
    if (PF.state && PF.state.reducedMotion) {
      pStaticFrame();
      return;
    }
    pReset();
    pRaf = requestAnimationFrame(pLoop);
  }

  function stopPreview() {
    if (pRaf) cancelAnimationFrame(pRaf);
    pRaf = null;
  }

  PF.games.blocks = {
    init: init,
    start: start,
    stop: stop,
    startPreview: startPreview,
    stopPreview: stopPreview
  };
})();
