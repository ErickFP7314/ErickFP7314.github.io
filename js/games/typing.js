/**
 * games/typing.js — 60s typing test using real code snippets (C++/Python/JS,
 * matching the languages featured across the portfolio's projects: Tetris in
 * C++, ML-Kit tooling in Python-flavored pseudo-utilities, and this very site
 * in vanilla JS). Char-diff render (current/correct/wrong), WPM + accuracy on
 * finish, retry button. Desktop-oriented; shows a friendly note on touch
 * devices instead of the keyboard-driven test.
 * Contract: { init(mountEl, state), start(), stop() }.
 */
window.PF = window.PF || {};
PF.games = PF.games || {};

(function () {
  'use strict';

  function sfx(n) { if (window.PF && PF.audio && PF.audio.play) PF.audio.play(n); }

  var DURATION = 60;

  var SNIPPETS = [
    {
      lang: 'C++',
      code:
        'int partition(vector<int>& a, int lo, int hi) {\n' +
        '  int pivot = a[hi], i = lo - 1;\n' +
        '  for (int j = lo; j < hi; j++) {\n' +
        '    if (a[j] < pivot) swap(a[++i], a[j]);\n' +
        '  }\n' +
        '  swap(a[i + 1], a[hi]);\n' +
        '  return i + 1;\n' +
        '}'
    },
    {
      lang: 'Python',
      code:
        'def quicksort(arr):\n' +
        '    if len(arr) <= 1:\n' +
        '        return arr\n' +
        '    pivot = arr[len(arr) // 2]\n' +
        '    left = [x for x in arr if x < pivot]\n' +
        '    mid = [x for x in arr if x == pivot]\n' +
        '    right = [x for x in arr if x > pivot]\n' +
        '    return quicksort(left) + mid + quicksort(right)'
    },
    {
      lang: 'JavaScript',
      code:
        'function debounce(fn, wait) {\n' +
        '  let timer = null;\n' +
        '  return function (...args) {\n' +
        '    clearTimeout(timer);\n' +
        '    timer = setTimeout(() => fn.apply(this, args), wait);\n' +
        '  };\n' +
        '}'
    }
  ];

  var mount, textEl, hud, input, overlay, mobileNote, state;
  var snippet, chars, typedCount, correctCount, startedAt, timer, timeLeft;
  var prevTyped = 0;
  var finished = false;
  var inputHandler, containerClickHandler;

  function pickSnippet() {
    return SNIPPETS[Math.floor(Math.random() * SNIPPETS.length)];
  }

  function renderChars() {
    textEl.innerHTML = '';
    var frag = document.createDocumentFragment();
    chars.forEach(function (ch, i) {
      var span = document.createElement('span');
      span.textContent = ch === '\n' ? '↵\n' : ch;
      span.className = 'pf-typing-char';
      if (i === typedCount) span.classList.add('current');
      frag.appendChild(span);
    });
    textEl.appendChild(frag);
  }

  function updateHud() {
    if (hud) hud.textContent = 'TIEMPO: ' + timeLeft + 's';
  }

  function finish() {
    if (finished) return;
    finished = true;
    sfx('finish');
    clearInterval(timer);
    timer = null;

    var elapsedMin = Math.max((Date.now() - startedAt) / 60000, 1 / 60000);
    var wpm = Math.round((correctCount / 5) / elapsedMin);
    var accuracy = typedCount > 0 ? Math.round((correctCount / typedCount) * 100) : 100;

    overlay.innerHTML =
      '<div class="pf-game-over mono">' +
      '<p>Tiempo terminado</p>' +
      '<p class="pf-game-score">' + wpm + ' PPM · ' + accuracy + '% precisión</p>' +
      '<button type="button" class="pf-game-retry mono">Reintentar</button>' +
      '</div>';
    overlay.classList.add('visible');
    if (input) input.disabled = true;
    var btn = overlay.querySelector('.pf-game-retry');
    if (btn) {
      btn.addEventListener('click', function () {
        resetRound();
        btn.blur();
      });
      btn.focus();
    }
  }

  function tick() {
    timeLeft--;
    updateHud();
    if (timeLeft <= 0) finish();
  }

  function onInput() {
    if (finished) return;
    var value = input.value;
    if (!startedAt) startedAt = Date.now();

    // Only ever grow forward: browsers/mobile IMEs can rewrite value, but a
    // desktop keydown-free <input> handles backspace naturally via value diff.
    var newLen = value.length;
    if (newLen > chars.length) {
      input.value = value.slice(0, chars.length);
      newLen = chars.length;
    }

    // A newly typed character that doesn't match → subtle error tick.
    if (newLen > prevTyped && value[newLen - 1] !== chars[newLen - 1]) sfx('error');
    prevTyped = newLen;

    typedCount = newLen;
    correctCount = 0;
    for (var i = 0; i < newLen; i++) {
      if (value[i] === chars[i]) correctCount++;
    }

    // Re-render diff classes for the whole typed range (cheap: snippet is short).
    var spans = textEl.querySelectorAll('.pf-typing-char');
    spans.forEach(function (s, i) {
      s.classList.remove('current', 'correct', 'wrong');
      if (i < newLen) {
        s.classList.add(value[i] === chars[i] ? 'correct' : 'wrong');
      } else if (i === newLen) {
        s.classList.add('current');
      }
    });

    if (newLen >= chars.length) finish();
  }

  function resetRound() {
    finished = false;
    startedAt = null;
    typedCount = 0;
    correctCount = 0;
    prevTyped = 0;
    timeLeft = DURATION;
    snippet = pickSnippet();
    chars = snippet.code.split('');

    overlay.classList.remove('visible');
    overlay.innerHTML = '';
    renderChars();
    updateHud();

    if (input) {
      input.value = '';
      input.disabled = false;
      input.focus();
    }

    if (timer) clearInterval(timer);
    timer = setInterval(tick, 1000);
  }

  function buildMobileNote() {
    mobileNote = document.createElement('div');
    mobileNote.className = 'pf-typing-mobile-note mono';
    mobileNote.textContent =
      'El test de mecanografía está pensado para teclado físico. Ábrelo desde una computadora para intentarlo.';
  }

  function init(mountEl, appState) {
    mount = mountEl;
    state = appState;
    mount.innerHTML = '';

    if (state && state.isTouch) {
      buildMobileNote();
      mount.appendChild(mobileNote);
      return;
    }

    var wrap = document.createElement('div');
    wrap.className = 'pf-game-wrap pf-typing-wrap';

    hud = document.createElement('div');
    hud.className = 'pf-game-hud mono';

    var langTag = document.createElement('div');
    langTag.className = 'pf-typing-lang mono';

    textEl = document.createElement('div');
    textEl.className = 'pf-typing-text mono';

    input = document.createElement('input');
    input.type = 'text';
    input.className = 'pf-typing-input';
    input.setAttribute('aria-label', 'Escribe el snippet mostrado arriba');
    input.autocomplete = 'off';
    input.autocapitalize = 'off';
    input.spellcheck = false;

    overlay = document.createElement('div');
    overlay.className = 'pf-game-overlay';

    var box = document.createElement('div');
    box.className = 'pf-canvas-wrap pf-typing-box';
    box.appendChild(langTag);
    box.appendChild(textEl);
    box.appendChild(input);
    box.appendChild(overlay);

    wrap.appendChild(hud);
    wrap.appendChild(box);
    mount.appendChild(wrap);

    containerClickHandler = function () { if (input && !input.disabled) input.focus(); };
    box.addEventListener('click', containerClickHandler);

    snippet = pickSnippet();
    langTag.textContent = '// ' + snippet.lang;
  }

  function start() {
    if (state && state.isTouch) return; // mobile note only, nothing to run.
    inputHandler = onInput;
    input.addEventListener('input', inputHandler);
    resetRound();
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    if (input && inputHandler) input.removeEventListener('input', inputHandler);
    inputHandler = null;
    mount = null;
    textEl = null;
    hud = null;
    input = null;
    overlay = null;
    mobileNote = null;
    finished = false;
  }

  PF.games.typing = { init: init, start: start, stop: stop };
})();
