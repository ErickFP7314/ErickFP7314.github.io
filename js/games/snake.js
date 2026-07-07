/**
 * games/snake.js — 20x20 grid, ~150ms/step accelerating every 5 foods,
 * +10/food, walls/self = game over. Arrow keys + swipe (touch).
 * Contract: { init(mountEl, state), start(), stop() }.
 */
window.PF = window.PF || {};
PF.games = PF.games || {};

(function () {
  'use strict';

  function sfx(n) { if (window.PF && PF.audio && PF.audio.play) PF.audio.play(n); }

  var GRID = 20;
  var CELL = 16;
  var SIZE = GRID * CELL;
  var BASE_STEP_MS = 150;
  var MIN_STEP_MS = 60;

  var canvas, ctx, hud, overlay, mount, state;
  var raf = null;
  var lastTime = 0;
  var acc = 0;
  var stepMs = BASE_STEP_MS;
  var snake, dir, nextDir, food, score, foodsEaten, running;
  var touchStartX = 0, touchStartY = 0;
  var keydownHandler, canvasClickHandler, touchStartHandler, touchEndHandler;

  function rndCell() {
    return { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  }

  function placeFood() {
    var cell;
    do {
      cell = rndCell();
    } while (snake.some(function (s) { return s.x === cell.x && s.y === cell.y; }));
    food = cell;
  }

  function reset() {
    snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    foodsEaten = 0;
    stepMs = BASE_STEP_MS;
    running = true;
    acc = 0;
    lastTime = 0;
    placeFood();
    updateHud();
    hideOverlay();
  }

  function updateHud() {
    if (hud) hud.textContent = 'SCORE: ' + score;
  }

  function showOverlay(text) {
    if (!overlay) return;
    overlay.innerHTML =
      '<div class="pf-game-over mono">' +
      '<p>' + text + '</p>' +
      '<p class="pf-game-score">Puntaje: ' + score + '</p>' +
      '<button type="button" class="pf-game-retry mono">Reintentar</button>' +
      '</div>';
    overlay.classList.add('visible');
    var btn = overlay.querySelector('.pf-game-retry');
    if (btn) {
      btn.addEventListener('click', function () {
        reset();
        loop(0);
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

  function gameOver() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    sfx('over');
    showOverlay('Game Over');
  }

  function step() {
    dir = nextDir;
    var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
      gameOver();
      return;
    }
    if (snake.some(function (s) { return s.x === head.x && s.y === head.y; })) {
      gameOver();
      return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score += 10;
      foodsEaten++;
      sfx('eat');
      if (foodsEaten % 5 === 0) {
        stepMs = Math.max(MIN_STEP_MS, stepMs - 10);
      }
      placeFood();
      updateHud();
    } else {
      snake.pop();
    }
  }

  function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // grid (subtle)
    ctx.strokeStyle = 'rgba(0,255,0,0.08)';
    for (var i = 1; i < GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, SIZE);
      ctx.moveTo(0, i * CELL);
      ctx.lineTo(SIZE, i * CELL);
      ctx.stroke();
    }

    // food
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 8;
    ctx.fillRect(food.x * CELL + 2, food.y * CELL + 2, CELL - 4, CELL - 4);
    ctx.shadowBlur = 0;

    // snake
    for (var s = 0; s < snake.length; s++) {
      ctx.fillStyle = s === 0 ? '#66ff66' : '#00ff00';
      ctx.fillRect(snake[s].x * CELL + 1, snake[s].y * CELL + 1, CELL - 2, CELL - 2);
    }
  }

  function loop(ts) {
    if (!running) return;
    if (!lastTime) lastTime = ts;
    var delta = ts - lastTime;
    lastTime = ts;
    acc += delta;

    while (acc >= stepMs) {
      step();
      acc -= stepMs;
      if (!running) break;
    }
    draw();
    raf = requestAnimationFrame(loop);
  }

  function setDirection(x, y) {
    // Disallow reversing directly into the snake's own body.
    if (dir.x === -x && dir.y === -y) return;
    nextDir = { x: x, y: y };
  }

  function onKeydown(e) {
    switch (e.key) {
      case 'ArrowUp': setDirection(0, -1); break;
      case 'ArrowDown': setDirection(0, 1); break;
      case 'ArrowLeft': setDirection(-1, 0); break;
      case 'ArrowRight': setDirection(1, 0); break;
    }
  }

  function onTouchStart(e) {
    var t = e.changedTouches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  }

  function onTouchEnd(e) {
    var t = e.changedTouches[0];
    var dx = t.clientX - touchStartX;
    var dy = t.clientY - touchStartY;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      setDirection(dx > 0 ? 1 : -1, 0);
    } else {
      setDirection(0, dy > 0 ? 1 : -1);
    }
  }

  function init(mountEl, appState) {
    mount = mountEl;
    state = appState;
    mount.innerHTML = '';

    var wrap = document.createElement('div');
    wrap.className = 'pf-game-wrap';

    hud = document.createElement('div');
    hud.className = 'pf-game-hud mono';

    var canvasWrap = document.createElement('div');
    canvasWrap.className = 'pf-canvas-wrap';

    canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    canvas.className = 'pf-game-canvas';
    canvas.setAttribute('aria-label', 'Tablero de Snake');

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
    touchStartHandler = onTouchStart;
    touchEndHandler = onTouchEnd;

    document.addEventListener('keydown', keydownHandler);
    canvas.addEventListener('touchstart', touchStartHandler, { passive: true });
    canvas.addEventListener('touchend', touchEndHandler, { passive: true });

    raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;

    if (keydownHandler) document.removeEventListener('keydown', keydownHandler);
    if (canvas) {
      if (touchStartHandler) canvas.removeEventListener('touchstart', touchStartHandler);
      if (touchEndHandler) canvas.removeEventListener('touchend', touchEndHandler);
    }

    keydownHandler = null;
    touchStartHandler = null;
    touchEndHandler = null;
    canvas = null;
    ctx = null;
    hud = null;
    overlay = null;
    mount = null;
  }

  PF.games.snake = { init: init, start: start, stop: stop };
})();
