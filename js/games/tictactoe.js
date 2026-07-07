/**
 * games/tictactoe.js — "Tres en Raya" embedded IN-PLACE on the Logros section
 * (checkpoint 4 Tanda B). Not a modal: it floats as a native part of the page.
 *
 * Player = X (green #00FF00), CPU = O (cyan #00FFFF). User always moves first.
 * Difficulty MEDIA: each CPU move is a PERFECT minimax move with probability
 * 2/3, and a random valid move with probability 1/3. Cells are real <button>s
 * (full keyboard operability); an aria-live status line and a reset button
 * (SVG icon) complete the UI.
 *
 * API: PF.games.tictactoe.mount(hostEl)
 */
window.PF = window.PF || {};
PF.games = PF.games || {};

(function () {
  'use strict';

  function sfx(n) { if (window.PF && PF.audio && PF.audio.play) PF.audio.play(n); }

  var LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  var RESET_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 5V2L7 7l5 5V8a5 5 0 1 1-5 5H5a7 7 0 1 0 7-8Z"/></svg>';

  function winner(b) {
    for (var i = 0; i < LINES.length; i++) {
      var l = LINES[i];
      if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) return { who: b[l[0]], line: l };
    }
    if (b.indexOf('') === -1) return { who: 'draw', line: null };
    return null;
  }

  // minimax: CPU is 'O' (maximizing), player 'X' (minimizing).
  function minimax(b, turn) {
    var res = winner(b);
    if (res) {
      if (res.who === 'O') return { score: 10 };
      if (res.who === 'X') return { score: -10 };
      return { score: 0 };
    }
    var best = { score: turn === 'O' ? -Infinity : Infinity, move: -1 };
    for (var i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = turn;
      var s = minimax(b, turn === 'O' ? 'X' : 'O').score;
      b[i] = '';
      if (turn === 'O' ? s > best.score : s < best.score) { best.score = s; best.move = i; }
    }
    return best;
  }

  function randomMove(b) {
    var free = [];
    for (var i = 0; i < 9; i++) if (!b[i]) free.push(i);
    return free.length ? free[(Math.random() * free.length) | 0] : -1;
  }

  // Tracks the pending "CPU thinking" timeout so the modal adapter can cancel
  // it on close (contract: stop() must clear all timers).
  var cpuTimer = null;

  function mount(host) {
    if (!host) return;
    host.classList.add('ttt');
    host.innerHTML =
      '<p class="ttt-status mono" aria-live="polite">Tu turno · eres la <span class="ttt-x">X</span></p>' +
      '<div class="ttt-board" role="group" aria-label="Tablero de Tres en Raya"></div>' +
      '<p class="ttt-scores mono">Tú <span data-s="win">0</span> · Empates <span data-s="draw">0</span> · CPU <span data-s="lose">0</span></p>' +
      '<button type="button" class="ttt-reset mono"><span class="ttt-reset-icon" aria-hidden="true">' + RESET_SVG + '</span><span>Reiniciar</span></button>';

    var boardEl = host.querySelector('.ttt-board');
    var statusEl = host.querySelector('.ttt-status');
    var resetBtn = host.querySelector('.ttt-reset');
    var scoreEls = {
      win: host.querySelector('[data-s="win"]'),
      draw: host.querySelector('[data-s="draw"]'),
      lose: host.querySelector('[data-s="lose"]')
    };

    var board = ['', '', '', '', '', '', '', '', ''];
    var locked = false;
    var scores = { win: 0, draw: 0, lose: 0 };
    var cells = [];

    for (var i = 0; i < 9; i++) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ttt-cell';
      btn.setAttribute('data-i', i);
      btn.setAttribute('aria-label', 'Casilla ' + (i + 1) + ', vacía');
      btn.addEventListener('click', onCellClick);
      boardEl.appendChild(btn);
      cells.push(btn);
    }

    function paint() {
      for (var i = 0; i < 9; i++) {
        var v = board[i];
        cells[i].textContent = v;
        cells[i].classList.remove('is-x', 'is-o');
        if (v === 'X') cells[i].classList.add('is-x');
        else if (v === 'O') cells[i].classList.add('is-o');
        cells[i].disabled = !!v || locked;
        cells[i].setAttribute('aria-label', 'Casilla ' + (i + 1) + (v ? ', ' + (v === 'X' ? 'tú (X)' : 'CPU (O)') : ', vacía'));
      }
    }

    function setStatus(html) { statusEl.innerHTML = html; }

    function highlight(line) {
      if (!line) return;
      line.forEach(function (idx) { cells[idx].classList.add('ttt-win'); });
    }

    function finish(res) {
      locked = true;
      paint();
      if (res.who === 'draw') {
        scores.draw++;
        setStatus('Empate.');
        sfx('draw');
      } else if (res.who === 'X') {
        scores.win++;
        setStatus('¡Ganaste! <span class="ttt-x">X</span>');
        highlight(res.line);
        sfx('win');
      } else {
        scores.lose++;
        setStatus('Ganó la CPU <span class="ttt-o">O</span>');
        highlight(res.line);
        sfx('lose');
      }
      scoreEls.win.textContent = scores.win;
      scoreEls.draw.textContent = scores.draw;
      scoreEls.lose.textContent = scores.lose;
    }

    function cpuTurn() {
      var res = winner(board);
      if (res) return finish(res);
      var move;
      if (Math.random() < 2 / 3) {
        move = minimax(board.slice(), 'O').move;
      } else {
        move = randomMove(board);
      }
      if (move < 0) return;
      board[move] = 'O';
      sfx('place');
      paint();
      var r2 = winner(board);
      if (r2) return finish(r2);
      locked = false;
      setStatus('Tu turno · eres la <span class="ttt-x">X</span>');
      paint();
    }

    function onCellClick(e) {
      var idx = Number(e.currentTarget.getAttribute('data-i'));
      if (locked || board[idx]) return;
      board[idx] = 'X';
      sfx('place');
      var res = winner(board);
      if (res) { paint(); return finish(res); }
      locked = true;
      setStatus('CPU pensando…');
      paint();
      if (cpuTimer) clearTimeout(cpuTimer);
      cpuTimer = setTimeout(cpuTurn, 340);
    }

    function reset() {
      board = ['', '', '', '', '', '', '', '', ''];
      locked = false;
      cells.forEach(function (c) { c.classList.remove('ttt-win'); });
      setStatus('Tu turno · eres la <span class="ttt-x">X</span>');
      paint();
    }

    resetBtn.addEventListener('click', reset);
    paint();
  }

  // mount() powers the always-on Logros embed. The init/start/stop trio lets
  // the SAME board run inside the shared game modal (T6, mobile "Jugar").
  PF.games.tictactoe = {
    mount: mount,
    init: function (mountEl) { mount(mountEl); },
    start: function () { /* board is interactive on mount; nothing to spin up */ },
    stop: function () { if (cpuTimer) { clearTimeout(cpuTimer); cpuTimer = null; } }
  };
})();
