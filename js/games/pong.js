/**
 * games/pong.js — player (green, left) vs CPU (cyan, right, delayed chase
 * AI). White ball with fading trail, speeds up each point, first to 5 wins.
 * Arrow keys (Up/Down) or drag paddle (touch).
 * Contract: { init(mountEl, state), start(), stop() }.
 */
window.PF = window.PF || {};
PF.games = PF.games || {};

(function () {
  'use strict';

  function sfx(n) { if (window.PF && PF.audio && PF.audio.play) PF.audio.play(n); }

  var W = 480, H = 300;
  var PADDLE_W = 10, PADDLE_H = 60;
  var BALL_R = 6;
  var BASE_SPEED = 3.2;
  var SPEED_STEP = 0.35;
  var CPU_MAX_SPEED = 3.6;
  var WIN_SCORE = 5;

  var canvas, ctx, hud, overlay, mount;
  var raf = null;
  var running = false;
  var player, cpu, ball, trail, speed, scoreP, scoreC;
  var keys = {};
  var keydownHandler, keyupHandler, touchMoveHandler, touchStartHandler;

  function resetBall(dirTowardsPlayer) {
    ball = { x: W / 2, y: H / 2, vx: (dirTowardsPlayer ? -1 : 1) * BASE_SPEED, vy: (Math.random() * 2 - 1) * BASE_SPEED };
    speed = BASE_SPEED;
    trail = [];
  }

  function reset() {
    player = { y: H / 2 - PADDLE_H / 2 };
    cpu = { y: H / 2 - PADDLE_H / 2 };
    scoreP = 0;
    scoreC = 0;
    running = true;
    resetBall(Math.random() > 0.5);
    updateHud();
    hideOverlay();
  }

  function updateHud() {
    if (hud) hud.textContent = scoreP + '  —  ' + scoreC;
  }

  function showOverlay(text) {
    if (!overlay) return;
    overlay.innerHTML =
      '<div class="pf-game-over mono">' +
      '<p>' + text + '</p>' +
      '<p class="pf-game-score">' + scoreP + ' — ' + scoreC + '</p>' +
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

  function endGame(win) {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    sfx(win ? 'finish' : 'over');
    showOverlay(win ? '¡Ganaste!' : 'CPU gana');
  }

  function update() {
    // Player movement via keys (touch handled directly by setting player.y).
    if (keys.ArrowUp) player.y -= 5;
    if (keys.ArrowDown) player.y += 5;
    player.y = Math.max(0, Math.min(H - PADDLE_H, player.y));

    // CPU: chases the ball with a capped speed (beatable, per design.md).
    var target = ball.y - PADDLE_H / 2;
    var cpuDelta = target - cpu.y;
    var cpuSpeed = Math.max(-CPU_MAX_SPEED, Math.min(CPU_MAX_SPEED, cpuDelta * 0.08));
    cpu.y += cpuSpeed;
    cpu.y = Math.max(0, Math.min(H - PADDLE_H, cpu.y));

    ball.x += ball.vx;
    ball.y += ball.vy;

    trail.unshift({ x: ball.x, y: ball.y });
    if (trail.length > 10) trail.pop();

    if (ball.y - BALL_R < 0 || ball.y + BALL_R > H) {
      ball.vy *= -1;
      ball.y = Math.max(BALL_R, Math.min(H - BALL_R, ball.y));
    }

    // Player paddle (left, x=20..30)
    if (ball.x - BALL_R <= 30 && ball.x - BALL_R >= 18 && ball.y >= player.y && ball.y <= player.y + PADDLE_H && ball.vx < 0) {
      ball.vx = Math.abs(ball.vx) + SPEED_STEP * 0.15;
      var relP = (ball.y - (player.y + PADDLE_H / 2)) / (PADDLE_H / 2);
      ball.vy += relP * 1.2;
      sfx('paddle');
    }

    // CPU paddle (right, x=W-30..W-20)
    if (ball.x + BALL_R >= W - 30 && ball.x + BALL_R <= W - 18 && ball.y >= cpu.y && ball.y <= cpu.y + PADDLE_H && ball.vx > 0) {
      ball.vx = -(Math.abs(ball.vx) + SPEED_STEP * 0.15);
      var relC = (ball.y - (cpu.y + PADDLE_H / 2)) / (PADDLE_H / 2);
      ball.vy += relC * 1.2;
      sfx('paddle');
    }

    if (ball.x < 0) {
      scoreC++;
      updateHud();
      sfx('score');
      if (scoreC >= WIN_SCORE) { endGame(false); return; }
      speed += SPEED_STEP;
      resetBall(false);
    } else if (ball.x > W) {
      scoreP++;
      updateHud();
      sfx('score');
      if (scoreP >= WIN_SCORE) { endGame(true); return; }
      speed += SPEED_STEP;
      resetBall(true);
    }
  }

  function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // center dashed line
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // player paddle (green)
    ctx.fillStyle = '#00ff00';
    ctx.shadowColor = '#00ff00';
    ctx.shadowBlur = 8;
    ctx.fillRect(20, player.y, PADDLE_W, PADDLE_H);

    // cpu paddle (cyan)
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.fillRect(W - 30, cpu.y, PADDLE_W, PADDLE_H);
    ctx.shadowBlur = 0;

    // ball trail (fading)
    for (var i = trail.length - 1; i >= 0; i--) {
      var alpha = (1 - i / trail.length) * 0.5;
      ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
      ctx.beginPath();
      ctx.arc(trail[i].x, trail[i].y, BALL_R * (1 - i / trail.length * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }

    // ball
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
  }

  function loop() {
    if (!running) return;
    update();
    if (running) draw();
    raf = requestAnimationFrame(loop);
  }

  function onKeydown(e) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') keys[e.key] = true;
  }
  function onKeyup(e) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') keys[e.key] = false;
  }

  function onTouchMove(e) {
    if (!e.touches || !e.touches[0] || !canvas) return;
    var rect = canvas.getBoundingClientRect();
    var scaleY = H / rect.height;
    var y = (e.touches[0].clientY - rect.top) * scaleY;
    player.y = Math.max(0, Math.min(H - PADDLE_H, y - PADDLE_H / 2));
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
    canvas.setAttribute('aria-label', 'Mesa de Pong');

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
    keys = {};
    reset();

    keydownHandler = onKeydown;
    keyupHandler = onKeyup;
    touchMoveHandler = onTouchMove;
    touchStartHandler = onTouchMove;

    document.addEventListener('keydown', keydownHandler);
    document.addEventListener('keyup', keyupHandler);
    canvas.addEventListener('touchstart', touchStartHandler, { passive: true });
    canvas.addEventListener('touchmove', touchMoveHandler, { passive: true });

    raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;

    if (keydownHandler) document.removeEventListener('keydown', keydownHandler);
    if (keyupHandler) document.removeEventListener('keyup', keyupHandler);
    if (canvas) {
      if (touchStartHandler) canvas.removeEventListener('touchstart', touchStartHandler);
      if (touchMoveHandler) canvas.removeEventListener('touchmove', touchMoveHandler);
    }

    keydownHandler = null;
    keyupHandler = null;
    touchMoveHandler = null;
    touchStartHandler = null;
    canvas = null;
    ctx = null;
    hud = null;
    overlay = null;
    mount = null;
  }

  PF.games.pong = { init: init, start: start, stop: stop };
})();
