/**
 * games/typing.js — "Typer": a language-aware typing test (Checkpoint 6, T3).
 *
 * Three screens driven by one state machine: SELECT → PLAYING → STATS.
 *   1. SELECT   — pick a language from the portfolio's hexagon stack (C++, Java,
 *                 Python, HTML, CSS, JavaScript, Angular, React, Lean 4), each
 *                 with its LOCAL SVG icon (assets/icons/tech/*). The chosen
 *                 language seeds the target from REAL code snippets in that
 *                 language (keywords / tags / props / hooks / theorems...).
 *   2. PLAYING  — the test itself. Input is KEYDOWN-DRIVEN (not value-diffed):
 *                 the module owns the keystrokes and preventDefault()s Space,
 *                 Enter and Tab so they count as typeable characters instead of
 *                 scrolling the page, submitting, or moving focus. This is the
 *                 root-cause fix for the "no puedo escribir espacio/enter/tab"
 *                 bug: the old build relied on a single-line <input> value diff
 *                 (Enter inserts nothing, Tab blurs) AND the game modal's
 *                 scroll-guard swallowed Space — both are now handled.
 *   3. STATS    — WPM, accuracy, errors, time + an interactive inline-SVG graph
 *                 of WPM sampled per second (hover/focus a point for its value).
 *                 Buttons: retry (same language) or change language.
 *
 * Works identically embedded (Formación section) and inside the shared game
 * modal (T6, mobile). On touch, focusing the hidden input happens inside the
 * language-button tap (a real user gesture) so the virtual keyboard opens.
 * Contract: { init(mountEl, state), start(), stop() }.
 */
window.PF = window.PF || {};
PF.games = PF.games || {};

(function () {
  'use strict';

  function sfx(n) { if (window.PF && PF.audio && PF.audio.play) PF.audio.play(n); }
  function reduced() { return !!(PF.state && PF.state.reducedMotion); }

  var T = '\t';

  // Real, short code snippets per language. \t exercises Tab, spaces exercise
  // Space, line breaks exercise Enter — the three keys the bug was about.
  var LANGS = [
    {
      name: 'C++', icon: 'assets/icons/tech/cplusplus.svg', color: '#00599c',
      snippets: [
        '#include <vector>\nint sum(std::vector<int>& v) {\n' + T + 'int total = 0;\n' + T + 'for (int x : v) total += x;\n' + T + 'return total;\n}',
        'template <class T>\nT max(T a, T b) {\n' + T + 'return a > b ? a : b;\n}'
      ]
    },
    {
      name: 'Java', icon: 'assets/icons/tech/java.svg', color: '#5382a1',
      snippets: [
        'public class Main {\n' + T + 'public static void main(String[] args) {\n' + T + T + 'System.out.println("Hola");\n' + T + '}\n}',
        'List<Integer> xs = new ArrayList<>();\nfor (int i = 0; i < 10; i++) {\n' + T + 'xs.add(i);\n}'
      ]
    },
    {
      name: 'Python', icon: 'assets/icons/tech/python.svg', color: '#3776ab',
      snippets: [
        'def fib(n):\n' + T + 'if n < 2:\n' + T + T + 'return n\n' + T + 'return fib(n - 1) + fib(n - 2)',
        'nums = [x for x in range(10) if x % 2 == 0]\nprint(sum(nums))'
      ]
    },
    {
      name: 'HTML', icon: 'assets/icons/tech/html5.svg', color: '#e34f26',
      snippets: [
        '<section class="card">\n' + T + '<h2 id="title">Hola</h2>\n' + T + '<a href="#top">Subir</a>\n</section>',
        '<img src="foto.png" alt="perfil" loading="lazy" />'
      ]
    },
    {
      name: 'CSS', icon: 'assets/icons/tech/css3.svg', color: '#1572b6',
      snippets: [
        '.btn {\n' + T + 'display: flex;\n' + T + 'color: #00ff00;\n' + T + 'border: 1px solid #444;\n}',
        '@media (max-width: 768px) {\n' + T + '.grid { grid-template-columns: 1fr; }\n}'
      ]
    },
    {
      name: 'JavaScript', icon: 'assets/icons/tech/javascript.svg', color: '#f7df1e',
      snippets: [
        'const sum = (a, b) => a + b;\nfunction greet(name) {\n' + T + 'return `Hola ${name}`;\n}',
        'const nums = [1, 2, 3].map((n) => n * 2);\nconsole.log(nums.filter(Boolean));'
      ]
    },
    {
      name: 'Angular', icon: 'assets/icons/tech/angular.svg', color: '#dd0031',
      snippets: [
        '@Component({\n' + T + "selector: 'app-root',\n" + T + "template: '<h1>Hola</h1>'\n})\nexport class AppComponent {}",
        '@Input() label = "";\n@Output() clicked = new EventEmitter<void>();'
      ]
    },
    {
      name: 'React', icon: 'assets/icons/tech/react.svg', color: '#61dafb',
      snippets: [
        'function Counter() {\n' + T + 'const [n, setN] = useState(0);\n' + T + 'return <button onClick={() => setN(n + 1)}>{n}</button>;\n}',
        'useEffect(() => {\n' + T + 'document.title = `count: ${n}`;\n}, [n]);'
      ]
    },
    {
      name: 'Lean 4', icon: 'assets/icons/tech/lean.svg', color: '#4f9cff',
      snippets: [
        'def double (n : Nat) : Nat := n + n\ntheorem add_zero (n : Nat) : n + 0 = n := by\n' + T + 'simp',
        'def isEven : Nat -> Bool\n' + T + '| 0 => true\n' + T + '| n + 1 => not (isEven n)'
      ]
    }
  ];

  var PLAY_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7L8 5Z"/></svg>';

  // ---- module state -------------------------------------------------------
  var mount, state, panel;
  var screen = 'select';        // 'select' | 'playing' | 'stats'
  var lang = null;              // current language object
  var chars = [];              // target characters
  var typedArr = [];           // characters typed so far
  var textEl, input, hudWpm, hudTime;
  var startedAt = null, timer = null, elapsedSec = 0;
  var strokes = 0, errorsTotal = 0;
  var samples = [];            // [{ t: seconds, wpm }]
  var finished = false;
  var keydownHandler = null, beforeInputHandler = null, refocusHandler = null;

  // ---- helpers ------------------------------------------------------------

  function correctCount() {
    var c = 0;
    for (var i = 0; i < typedArr.length; i++) {
      if (typedArr[i] === chars[i]) c++;
    }
    return c;
  }

  function liveWpm() {
    if (!elapsedSec) return 0;
    return Math.round((correctCount() / 5) / (elapsedSec / 60));
  }

  function pickSnippet(l) {
    return l.snippets[(Math.random() * l.snippets.length) | 0];
  }

  function clearPanel() { if (panel) panel.innerHTML = ''; }

  // ---- SELECT screen ------------------------------------------------------

  function showSelect() {
    detachInput();
    stopTimer();
    screen = 'select';
    lang = null;
    clearPanel();

    var wrap = document.createElement('div');
    wrap.className = 'pf-typing-select';
    wrap.innerHTML = '<p class="pf-typing-select-title mono">// elige un lenguaje para tipear</p>';

    var grid = document.createElement('div');
    grid.className = 'pf-typing-langs';

    LANGS.forEach(function (l, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pf-typing-lang-btn mono';
      btn.style.setProperty('--brand', l.color);
      btn.setAttribute('aria-label', 'Tipear en ' + l.name);
      btn.innerHTML =
        '<img class="pf-typing-lang-icon" src="' + l.icon + '" alt="" width="30" height="30" loading="lazy" decoding="async" />' +
        '<span>' + l.name + '</span>';
      // Selecting a language is a real user gesture → safe to focus the input
      // here so the mobile virtual keyboard pops up.
      btn.addEventListener('click', function () { startRound(idx); });
      grid.appendChild(btn);
    });

    wrap.appendChild(grid);
    panel.appendChild(wrap);
  }

  // ---- PLAYING screen -----------------------------------------------------

  function startRound(langIdx) {
    lang = LANGS[langIdx];
    chars = pickSnippet(lang).split('');
    typedArr = [];
    strokes = 0;
    errorsTotal = 0;
    samples = [];
    elapsedSec = 0;
    startedAt = null;
    finished = false;
    screen = 'playing';

    clearPanel();

    var play = document.createElement('div');
    play.className = 'pf-typing-play';

    var hud = document.createElement('div');
    hud.className = 'pf-game-hud pf-typing-hud mono';
    hud.innerHTML =
      '<span class="pf-typing-hud-lang">// ' + lang.name + '</span>' +
      '<span class="pf-typing-hud-metrics"><span class="pf-typing-wpm">0</span> PPM · ' +
      '<span class="pf-typing-time">0</span>s</span>';

    var box = document.createElement('div');
    box.className = 'pf-typing-box';

    textEl = document.createElement('div');
    textEl.className = 'pf-typing-text mono';

    input = document.createElement('input');
    input.type = 'text';
    input.className = 'pf-typing-input';
    input.setAttribute('aria-label', 'Escribe el código mostrado. Espacio, Enter y Tab cuentan como caracteres.');
    input.autocomplete = 'off';
    input.autocapitalize = 'off';
    input.autocorrect = 'off';
    input.spellcheck = false;

    box.appendChild(textEl);
    box.appendChild(input);

    play.appendChild(hud);
    play.appendChild(box);
    panel.appendChild(play);

    hudWpm = hud.querySelector('.pf-typing-wpm');
    hudTime = hud.querySelector('.pf-typing-time');

    renderChars();
    attachInput(box);

    // Focus synchronously (still inside the language-button click gesture).
    try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
  }

  function renderChars() {
    textEl.innerHTML = '';
    var frag = document.createDocumentFragment();
    for (var i = 0; i < chars.length; i++) {
      var span = document.createElement('span');
      span.className = 'pf-typing-char';
      var ch = chars[i];
      if (ch === '\n') span.textContent = '↵\n';       // ↵ + newline
      else if (ch === '\t') span.textContent = '⇥\t';  // ⇥ + tab
      else span.textContent = ch;
      applyCharClass(span, i);
      frag.appendChild(span);
    }
    textEl.appendChild(frag);
  }

  function applyCharClass(span, i) {
    span.classList.remove('current', 'correct', 'wrong');
    if (i < typedArr.length) {
      span.classList.add(typedArr[i] === chars[i] ? 'correct' : 'wrong');
    } else if (i === typedArr.length) {
      span.classList.add('current');
    }
  }

  function refreshChars() {
    var spans = textEl.querySelectorAll('.pf-typing-char');
    for (var i = 0; i < spans.length; i++) applyCharClass(spans[i], i);
  }

  function attachInput(box) {
    keydownHandler = onKeyDown;
    beforeInputHandler = onBeforeInput;
    refocusHandler = function () { if (input && screen === 'playing') try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); } };
    input.addEventListener('keydown', keydownHandler);
    input.addEventListener('beforeinput', beforeInputHandler);
    box.addEventListener('mousedown', function (e) {
      // keep native caret out; we manage everything — but refocus the input
      if (e.target !== input) e.preventDefault();
      refocusHandler();
    });
  }

  function detachInput() {
    if (input && keydownHandler) input.removeEventListener('keydown', keydownHandler);
    if (input && beforeInputHandler) input.removeEventListener('beforeinput', beforeInputHandler);
    keydownHandler = null;
    beforeInputHandler = null;
    refocusHandler = null;
  }

  function ensureStarted() {
    if (startedAt) return;
    startedAt = Date.now();
    stopTimer();
    timer = setInterval(tick, 1000);
  }

  function tick() {
    elapsedSec++;
    samples.push({ t: elapsedSec, wpm: liveWpm() });
    if (hudTime) hudTime.textContent = elapsedSec;
    if (hudWpm) hudWpm.textContent = liveWpm();
  }

  // Desktop path: physical keydown. We preventDefault Space/Enter/Tab so they
  // become typeable chars instead of scrolling / submitting / blurring.
  function onKeyDown(e) {
    if (finished || screen !== 'playing') return;
    var k = e.key;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (k === 'Backspace') { e.preventDefault(); backspace(); return; }
    if (k === 'Enter') { e.preventDefault(); typeChar('\n'); return; }
    if (k === 'Tab') { e.preventDefault(); typeChar('\t'); return; }
    if (k === ' ' || k === 'Spacebar') { e.preventDefault(); typeChar(' '); return; }
    if (k.length === 1) { e.preventDefault(); typeChar(k); return; }
    // Shift, Arrows, etc.: ignore (and let them do nothing harmful).
  }

  // Mobile path: virtual keyboards often don't emit reliable keydown, but they
  // do emit beforeinput. We preventDefault so the <input> value stays empty and
  // OUR model stays the single source of truth (keeps desktop + mobile in sync).
  function onBeforeInput(e) {
    if (finished || screen !== 'playing') return;
    var type = e.inputType;
    if (type === 'insertText' && e.data != null) {
      e.preventDefault();
      for (var i = 0; i < e.data.length; i++) typeChar(e.data[i]);
    } else if (type === 'insertLineBreak' || type === 'insertParagraph') {
      e.preventDefault();
      typeChar('\n');
    } else if (type === 'deleteContentBackward') {
      e.preventDefault();
      backspace();
    }
  }

  function typeChar(ch) {
    if (typedArr.length >= chars.length) return;
    ensureStarted();
    var expected = chars[typedArr.length];
    typedArr.push(ch);
    strokes++;
    if (ch === expected) sfx('place');
    else { errorsTotal++; sfx('error'); }
    refreshChars();
    if (typedArr.length >= chars.length) finish();
  }

  function backspace() {
    if (!typedArr.length) return;
    typedArr.pop();
    refreshChars();
  }

  // ---- STATS screen -------------------------------------------------------

  function finish() {
    if (finished) return;
    finished = true;
    stopTimer();
    sfx('finish');

    var elapsed = startedAt ? (Date.now() - startedAt) / 1000 : elapsedSec;
    if (elapsed < 0.5) elapsed = 0.5;
    var correct = correctCount();
    var wpm = Math.round((correct / 5) / (elapsed / 60));
    var accuracy = strokes > 0 ? Math.round(((strokes - errorsTotal) / strokes) * 100) : 100;
    // Final sample so the graph ends on the last measured speed.
    samples.push({ t: Math.round(elapsed), wpm: wpm });

    screen = 'stats';
    detachInput();
    clearPanel();

    var stats = document.createElement('div');
    stats.className = 'pf-typing-stats';

    stats.appendChild(buildStatGrid(wpm, accuracy, errorsTotal, elapsed));
    stats.appendChild(buildGraph(samples));

    var actions = document.createElement('div');
    actions.className = 'pf-typing-actions';

    var retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'pf-game-retry mono';
    retry.innerHTML = '<span class="pf-typing-btn-icon" aria-hidden="true">' + PLAY_SVG + '</span><span>Reintentar</span>';
    retry.addEventListener('click', function () {
      var idx = LANGS.indexOf(lang);
      startRound(idx < 0 ? 0 : idx);
    });

    var change = document.createElement('button');
    change.type = 'button';
    change.className = 'pf-typing-change mono';
    change.textContent = 'Cambiar lenguaje';
    change.addEventListener('click', showSelect);

    actions.appendChild(retry);
    actions.appendChild(change);
    stats.appendChild(actions);

    panel.appendChild(stats);
    retry.focus();
  }

  function statCell(value, label, cls) {
    return '<div class="pf-typing-stat">' +
      '<span class="pf-typing-stat-val ' + (cls || '') + '">' + value + '</span>' +
      '<span class="pf-typing-stat-label mono">' + label + '</span></div>';
  }

  function buildStatGrid(wpm, accuracy, errors, elapsed) {
    var grid = document.createElement('div');
    grid.className = 'pf-typing-stat-grid';
    grid.innerHTML =
      statCell(wpm, 'PPM', 'is-wpm') +
      statCell(accuracy + '%', 'precisión', 'is-acc') +
      statCell(errors, 'errores', 'is-err') +
      statCell(elapsed.toFixed(1) + 's', 'tiempo', 'is-time');
    return grid;
  }

  // Interactive inline-SVG line graph of WPM per second. Hover/focus a point to
  // reveal its value (tooltip). Palette colours; reduced-motion = no draw anim.
  function buildGraph(pts) {
    var wrap = document.createElement('div');
    wrap.className = 'pf-typing-graph-wrap';

    var caption = document.createElement('p');
    caption.className = 'pf-typing-graph-cap mono';
    caption.textContent = '// velocidad (PPM) por segundo';
    wrap.appendChild(caption);

    var W = 300, H = 120, padL = 8, padR = 8, padT = 12, padB = 18;
    var innerW = W - padL - padR, innerH = H - padT - padB;

    // De-duplicate to whole seconds, keep last WPM per second.
    var maxWpm = 1, i;
    for (i = 0; i < pts.length; i++) if (pts[i].wpm > maxWpm) maxWpm = pts[i].wpm;
    var n = Math.max(1, pts.length - 1);

    function px(idx) { return padL + (n === 0 ? 0 : (idx / n) * innerW); }
    function py(w) { return padT + innerH - (w / maxWpm) * innerH; }

    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('class', 'pf-typing-graph');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Gráfico de velocidad de tipeo en palabras por minuto a lo largo del tiempo');

    // baseline
    var base = document.createElementNS(svgNS, 'line');
    base.setAttribute('x1', padL); base.setAttribute('y1', padT + innerH);
    base.setAttribute('x2', W - padR); base.setAttribute('y2', padT + innerH);
    base.setAttribute('class', 'pf-graph-axis');
    svg.appendChild(base);

    // area + line
    var d = '', poly = '';
    for (i = 0; i < pts.length; i++) {
      var x = px(i), y = py(pts[i].wpm);
      d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
      poly += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
    }
    var area = document.createElementNS(svgNS, 'path');
    area.setAttribute('d', d + 'L' + px(pts.length - 1).toFixed(1) + ' ' + (padT + innerH) + ' L' + px(0).toFixed(1) + ' ' + (padT + innerH) + ' Z');
    area.setAttribute('class', 'pf-graph-area');
    svg.appendChild(area);

    var line = document.createElementNS(svgNS, 'path');
    line.setAttribute('d', poly);
    line.setAttribute('class', 'pf-graph-line' + (reduced() ? '' : ' pf-graph-anim'));
    svg.appendChild(line);

    var tip = document.createElementNS(svgNS, 'text');
    tip.setAttribute('class', 'pf-graph-tip');
    tip.setAttribute('text-anchor', 'middle');
    tip.textContent = '';
    svg.appendChild(tip);

    for (i = 0; i < pts.length; i++) {
      (function (p) {
        var cx = px(pts.indexOf(p)), cy = py(p.wpm);
        var dot = document.createElementNS(svgNS, 'circle');
        dot.setAttribute('cx', cx.toFixed(1));
        dot.setAttribute('cy', cy.toFixed(1));
        dot.setAttribute('r', '3.2');
        dot.setAttribute('class', 'pf-graph-dot');
        dot.setAttribute('tabindex', '0');
        dot.setAttribute('role', 'img');
        dot.setAttribute('aria-label', p.wpm + ' PPM al segundo ' + p.t);
        function show() {
          tip.setAttribute('x', Math.max(padL + 14, Math.min(W - padR - 14, cx)));
          tip.setAttribute('y', Math.max(10, cy - 8));
          tip.textContent = p.wpm + ' PPM';
          dot.classList.add('is-active');
        }
        function hide() { tip.textContent = ''; dot.classList.remove('is-active'); }
        dot.addEventListener('mouseenter', show);
        dot.addEventListener('mouseleave', hide);
        dot.addEventListener('focus', show);
        dot.addEventListener('blur', hide);
        svg.appendChild(dot);
      })(pts[i]);
    }

    wrap.appendChild(svg);
    return wrap;
  }

  // ---- lifecycle ----------------------------------------------------------

  function stopTimer() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  function buildShell(mountEl) {
    mount = mountEl;
    mount.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'pf-game-wrap pf-typing-wrap';
    panel = document.createElement('div');
    panel.className = 'pf-typing-panel';
    wrap.appendChild(panel);
    mount.appendChild(wrap);
  }

  function init(mountEl, appState) {
    state = appState;
    buildShell(mountEl);
    showSelect();
  }

  function start() {
    // Idempotent: init() already rendered the picker. Only (re)build it if the
    // panel is empty or in a stale state — avoids a redundant re-render.
    if (screen === 'select' && panel && panel.children.length) return;
    if (screen !== 'playing') showSelect();
  }

  function stop() {
    detachInput();
    stopTimer();
    chars = [];
    typedArr = [];
    samples = [];
    finished = false;
    startedAt = null;
    elapsedSec = 0;
    screen = 'select';
    lang = null;
    textEl = null;
    input = null;
    hudWpm = null;
    hudTime = null;
    panel = null;
    mount = null;
  }

  PF.games.typing = { init: init, start: start, stop: stop };
})();
