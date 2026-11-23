/**
 * i18n.js — Bilingual (ES / EN) runtime controller for the portfolio.
 * Loaded FIRST before content.js so PF.i18n.lang is ready for every module.
 * Persists choice in localStorage ('pf-lang'), updates <html lang>, swaps
 * PF.data to PF.locales[lang], updates static [data-i18n*] elements, and
 * notifies dynamic modules via PF.i18n.onChange(fn).
 */
window.PF = window.PF || {};

(function () {
  'use strict';

  var STORAGE_KEY = 'pf-lang';
  var VALID = { es: true, en: true };
  var listeners = [];

  var STRINGS = {
    es: {
      // Meta / page titles
      'meta.index.title': 'Erick Luis Flores Paz — Portfolio',
      'meta.index.desc': 'Portfolio terminal-hacker de Erick Luis Flores Paz: perfil, tecnologías, logros, proyectos personales y formación.',
      'meta.proyectos.title': 'Proyectos — Erick Luis Flores Paz',
      'meta.proyectos.desc': 'Proyectos de Erick Luis Flores Paz: Moneda Cup (freelance full-stack), Galley (NASA Space Apps 2026), EcoAlerta Bolivia y Verificador de Billetes.',
      'meta.formacion.title': 'Formación — Erick Luis Flores Paz',
      'meta.formacion.desc': 'Formación de Erick Luis Flores Paz: certificados ICPC-UMSS, Claude Code (Anthropic) y cursos de programación e IA.',
      'meta.logros.title': 'Logros — Erick Luis Flores Paz',
      'meta.logros.desc': 'Logros de Erick Luis Flores Paz: Medalla de Oro nacional en la Olimpiada Boliviana de Informática, premios y reconocimientos.',

      // Chrome & nav
      'lang.switchAria': 'Cambiar idioma a inglés',
      'nav.openMenu': 'Abrir menú',
      'nav.closeMenu': 'Cerrar menú',
      'nav.mainLabel': 'Navegación principal',
      'nav.home': 'HOME',
      'nav.about': 'SOBRE MÍ',
      'nav.logros': 'LOGROS',
      'nav.proyectos': 'PROYECTOS',
      'nav.formacion': 'FORMACIÓN',
      'nav.contacto': 'CONTACTO',
      'boot.ready': '$ listo.',

      // Section 01: Home
      'sec1.aria': 'Inicio',
      'hero.photoAlt': 'Retrato de Erick Luis Flores Paz',
      'hero.cvAria': 'Abrir currículum en PDF (se abre en una pestaña nueva)',
      'hero.cvBtn': '$ ver_cv',
      'hero.subtitle': 'Estudiante de Ingeniería de Software · Entusiasta de algoritmos e IA',
      'hero.termSkills': '> C++, Flutter, Python, Web, IA',
      'hero.termLoading': '> Cargando secciones... ██████████ 100%',
      'hero.githubAria': 'Perfil de GitHub de Erick',
      'hero.linkedinAria': 'Perfil de LinkedIn de Erick',

      // Section 02: About
      'sec2.aria': 'Sobre mí',
      'about.headingHtml': 'SOBRE <span class="accent">MÍ</span>',
      'about.interestsLabel': 'intereses:',
      'about.techLabel': '// tecnologías',

      // Section 03: Logros
      'sec3.aria': 'Logros',
      'logros.tttLabel': '// tres en raya · tú vs CPU',
      'logros.posterAria': 'Entrar a la sección Logros',
      'logros.kicker': '03 · LOGROS',
      'logros.title': 'Logros',
      'logros.sub': 'Medalla de Oro nacional · Premios · Reconocimientos',
      'logros.mobilePlayAria': 'Jugar Tres en Raya',

      // Section 04: Proyectos
      'sec4.aria': 'Proyectos',
      'proyectos.posterAria': 'Entrar a la sección Proyectos',
      'proyectos.kicker': '04 · PROYECTOS',
      'proyectos.title': 'Proyectos',
      'proyectos.sub': 'Moneda Cup · Galley (NASA) · EcoAlerta · Billetes',
      'proyectos.mobilePlayAria': 'Jugar Blocks 3D',

      // Section 05: Formación
      'sec5.aria': 'Formación',
      'formacion.posterAria': 'Entrar a la sección Formación',
      'formacion.kicker': '05 · FORMACIÓN',
      'formacion.title': 'Formación',
      'formacion.sub': 'Certificados · Cursos · Campamentos ICPC',
      'formacion.mobilePlayAria': 'Jugar Typer',

      // Shared poster / play CTA
      'poster.enter': 'INGRESAR →',
      'game.play': 'Jugar',
      'game.paused': 'Pausa',
      'game.retry': 'Reintentar',
      'game.close': 'Cerrar juego',

      // Section 06: Contact
      'sec6.aria': 'Contacto',
      'contact.heading': 'CONTACTO',
      'contact.nameLabel': 'nombre:',
      'contact.namePlaceholder': 'tu_nombre',
      'contact.emailLabel': 'email:',
      'contact.emailPlaceholder': 'tu@email.com',
      'contact.msgLabel': 'mensaje:',
      'contact.msgPlaceholder': 'Escribe tu mensaje...',
      'contact.sendBtn': 'enviar_mensaje →',
      'contact.socialsAria': 'Contacto y redes de Erick',
      'contact.mailSubject': 'Contacto desde portfolio — {name}',
      'contact.mailVisitor': 'Visitante',
      'contact.mailFrom': 'De',

      // Subpages
      'sub.back': '← Volver',
      'sub.proyectosTitleHtml': 'PROYECTO<span class="accent">S</span>',
      'sub.formacionTitleHtml': 'FORMACIÓ<span class="accent">N</span>',
      'sub.logrosTitleHtml': 'LOGRO<span class="accent">S</span>',
      'sub.projectKind': 'PROYECTO',
      'sub.certKind': 'CERTIFICADO',
      'sub.recogKind': 'RECONOCIMIENTO',
      'sub.viewMore': 'Ver más',
      'sub.goldMedalAria': 'Medalla de Oro nacional',
      'sub.carouselGoto': 'Ir a la imagen {n}',
      'sub.carouselPrev': 'Imagen anterior',
      'sub.carouselNext': 'Imagen siguiente',
      'sub.statsAria': 'Panel de resultados: 53.082 estrellas Gaia DR3, 179 tests',
      'sub.statsStars': 'estrellas · Gaia DR3',
      'sub.statsTests': 'tests automatizados',
      'sub.statsCatalog': 'catálogo Gaia',
      'sub.statsPassing': 'tests en verde',
      'sub.terminalAria': 'Salida de terminal de harnes-erickfp',
      'sub.terminalPlan': 'plan generado · esperando aprobación humana',
      'sub.miniGameKicker': '// mini-juego',

      // Lightbox
      'lb.dialogAria': 'Imagen ampliada',
      'lb.zoomIn': 'Acercar imagen',
      'lb.zoomOut': 'Alejar imagen',
      'lb.reset': 'Restablecer zoom',
      'lb.close': 'Cerrar imagen',

      // Games metadata & UI
      'games.embedBlocksName': 'Blocks — torre 3D',
      'games.playNamed': 'Jugar {name}',
      'games.meta.snake.title': 'SNAKE',
      'games.meta.snake.hint': 'Flechas o desliza el dedo · come y crece, no choques',
      'games.meta.pong.title': 'PONG',
      'games.meta.pong.hint': 'Flechas ↑/↓ o arrastra · el primero en llegar a 5 gana',
      'games.meta.typing.title': 'TYPER',
      'games.meta.typing.hint': 'Elige un lenguaje y escribe el código · space/enter/tab cuentan',
      'games.meta.blocks.title': 'BLOCKS',
      'games.meta.blocks.hint': 'Toca o espacio · encaja el bloque en movimiento',
      'games.meta.tictactoe.title': 'TRES EN RAYA',
      'games.meta.tictactoe.hint': 'Toca una casilla · eres la X, la CPU es la O',
      'games.meta.diana.title': 'DIANA',
      'games.meta.diana.hint': 'Arrastra desde el arco y suelta para disparar',
      'games.slide.snake.hint': 'Flechas o desliza el dedo sobre el tablero · come y crece, no choques con el borde ni contigo mismo.',
      'games.slide.pong.hint': 'Flechas ↑ / ↓ o arrastra la paleta con el dedo · el primero en llegar a 5 puntos gana.',
      'games.slide.diana.hint': 'Arrastra desde el arco y suelta para disparar · sube de nivel sin fallar, la diana se encoge y se mueve.',

      // Tic-Tac-Toe
      'ttt.yourTurnHtml': 'Tu turno · eres la <span class="ttt-x">X</span>',
      'ttt.boardAria': 'Tablero de Tres en Raya',
      'ttt.scoresHtml': 'Tú <span data-s="win">{win}</span> · Empates <span data-s="draw">{draw}</span> · CPU <span data-s="lose">{lose}</span>',
      'ttt.reset': 'Reiniciar',
      'ttt.cellEmpty': 'Casilla {n}, vacía',
      'ttt.cellX': 'Casilla {n}, tú (X)',
      'ttt.cellO': 'Casilla {n}, CPU (O)',
      'ttt.draw': 'Empate.',
      'ttt.winHtml': '¡Ganaste! <span class="ttt-x">X</span>',
      'ttt.loseHtml': 'Ganó la CPU <span class="ttt-o">O</span>',
      'ttt.thinking': 'CPU pensando…',

      // Typing
      'typing.selectTitle': '// elige un lenguaje para tipear',
      'typing.typeIn': 'Tipear en {name}',
      'typing.unit': 'PPM',
      'typing.inputAria': 'Escribe el código mostrado. Espacio, Enter y Tab cuentan como caracteres.',
      'typing.changeLang': 'Cambiar lenguaje',
      'typing.accuracy': 'precisión',
      'typing.errors': 'errores',
      'typing.time': 'tiempo',
      'typing.graphCap': '// velocidad (PPM) por segundo',
      'typing.graphAria': 'Gráfico de velocidad de tipeo en palabras por minuto a lo largo del tiempo',
      'typing.dotAria': '{wpm} PPM al segundo {t}',

      // Blocks3D
      'blocks.hud': 'BLOQUES: {score}',

      // Snake
      'snake.score': 'Puntaje: {score}',
      'snake.boardAria': 'Tablero de Snake',

      // Pong
      'pong.win': '¡Ganaste!',
      'pong.lose': 'CPU gana',
      'pong.boardAria': 'Mesa de Pong',

      // Diana
      'diana.hud': 'NIVEL {level}  ·  FLECHAS: {arrows}  ·  PUNTAJE: {score}',
      'diana.roundOver': 'Ronda terminada — Nivel {level}',
      'diana.totalScore': 'Puntaje total: {score}',
      'diana.timePenalty': '¡Tiempo! −{penalty}',
      'diana.bullseye': '¡Diana!',
      'diana.miss': 'Fallo',
      'diana.boardAria': 'Diana — arrastra desde el arco y suelta para disparar'
    },

    en: {
      // Meta / page titles
      'meta.index.title': 'Erick Luis Flores Paz — Portfolio',
      'meta.index.desc': 'Terminal-hacker portfolio of Erick Luis Flores Paz: profile, technologies, achievements, personal projects, and education.',
      'meta.proyectos.title': 'Projects — Erick Luis Flores Paz',
      'meta.proyectos.desc': 'Projects by Erick Luis Flores Paz: Moneda Cup (freelance full-stack), Galley (NASA Space Apps 2026), EcoAlerta Bolivia, and Banknote Verifier.',
      'meta.formacion.title': 'Education — Erick Luis Flores Paz',
      'meta.formacion.desc': 'Education & certifications of Erick Luis Flores Paz: ICPC-UMSS, Claude Code (Anthropic), and programming & AI courses.',
      'meta.logros.title': 'Achievements — Erick Luis Flores Paz',
      'meta.logros.desc': 'Achievements of Erick Luis Flores Paz: National Gold Medal in the Bolivian Informatics Olympiad, awards, and recognitions.',

      // Chrome & nav
      'lang.switchAria': 'Switch language to Spanish',
      'nav.openMenu': 'Open menu',
      'nav.closeMenu': 'Close menu',
      'nav.mainLabel': 'Main navigation',
      'nav.home': 'HOME',
      'nav.about': 'ABOUT ME',
      'nav.logros': 'ACHIEVEMENTS',
      'nav.proyectos': 'PROJECTS',
      'nav.formacion': 'EDUCATION',
      'nav.contacto': 'CONTACT',
      'boot.ready': '$ ready.',

      // Section 01: Home
      'sec1.aria': 'Home',
      'hero.photoAlt': 'Portrait of Erick Luis Flores Paz',
      'hero.cvAria': 'Open resume PDF (opens in a new tab)',
      'hero.cvBtn': '$ view_cv',
      'hero.subtitle': 'Software Engineering Student · Algorithms & AI Enthusiast',
      'hero.termSkills': '> C++, Flutter, Python, Web, AI',
      'hero.termLoading': '> Loading sections... ██████████ 100%',
      'hero.githubAria': "Erick's GitHub profile",
      'hero.linkedinAria': "Erick's LinkedIn profile",

      // Section 02: About
      'sec2.aria': 'About me',
      'about.headingHtml': 'ABOUT <span class="accent">ME</span>',
      'about.interestsLabel': 'interests:',
      'about.techLabel': '// technologies',

      // Section 03: Logros
      'sec3.aria': 'Achievements',
      'logros.tttLabel': '// tic-tac-toe · you vs CPU',
      'logros.posterAria': 'Enter the Achievements section',
      'logros.kicker': '03 · ACHIEVEMENTS',
      'logros.title': 'Achievements',
      'logros.sub': 'National Gold Medal · Awards · Recognitions',
      'logros.mobilePlayAria': 'Play Tic-Tac-Toe',

      // Section 04: Proyectos
      'sec4.aria': 'Projects',
      'proyectos.posterAria': 'Enter the Projects section',
      'proyectos.kicker': '04 · PROJECTS',
      'proyectos.title': 'Projects',
      'proyectos.sub': 'Moneda Cup · Galley (NASA) · EcoAlerta · Banknotes',
      'proyectos.mobilePlayAria': 'Play Blocks 3D',

      // Section 05: Formación
      'sec5.aria': 'Education',
      'formacion.posterAria': 'Enter the Education section',
      'formacion.kicker': '05 · EDUCATION',
      'formacion.title': 'Education',
      'formacion.sub': 'Certificates · Courses · ICPC Camps',
      'formacion.mobilePlayAria': 'Play Typer',

      // Shared poster / play CTA
      'poster.enter': 'ENTER →',
      'game.play': 'Play',
      'game.paused': 'Paused',
      'game.retry': 'Retry',
      'game.close': 'Close game',

      // Section 06: Contact
      'sec6.aria': 'Contact',
      'contact.heading': 'CONTACT',
      'contact.nameLabel': 'name:',
      'contact.namePlaceholder': 'your_name',
      'contact.emailLabel': 'email:',
      'contact.emailPlaceholder': 'you@email.com',
      'contact.msgLabel': 'message:',
      'contact.msgPlaceholder': 'Write your message...',
      'contact.sendBtn': 'send_message →',
      'contact.socialsAria': "Erick's contact and social links",
      'contact.mailSubject': 'Portfolio contact — {name}',
      'contact.mailVisitor': 'Visitor',
      'contact.mailFrom': 'From',

      // Subpages
      'sub.back': '← Back',
      'sub.proyectosTitleHtml': 'PROJECT<span class="accent">S</span>',
      'sub.formacionTitleHtml': 'EDUCATIO<span class="accent">N</span>',
      'sub.logrosTitleHtml': 'ACHIEVEMENT<span class="accent">S</span>',
      'sub.projectKind': 'PROJECT',
      'sub.certKind': 'CERTIFICATE',
      'sub.recogKind': 'RECOGNITION',
      'sub.viewMore': 'View more',
      'sub.goldMedalAria': 'National Gold Medal',
      'sub.carouselGoto': 'Go to image {n}',
      'sub.carouselPrev': 'Previous image',
      'sub.carouselNext': 'Next image',
      'sub.statsAria': 'Results panel: 53,082 Gaia DR3 stars, 179 tests',
      'sub.statsStars': 'stars · Gaia DR3',
      'sub.statsTests': 'automated tests',
      'sub.statsCatalog': 'Gaia catalog',
      'sub.statsPassing': 'passing tests',
      'sub.terminalAria': 'Terminal output of harnes-erickfp',
      'sub.terminalPlan': 'plan generated · awaiting human approval',
      'sub.miniGameKicker': '// mini-game',

      // Lightbox
      'lb.dialogAria': 'Enlarged image',
      'lb.zoomIn': 'Zoom in',
      'lb.zoomOut': 'Zoom out',
      'lb.reset': 'Reset zoom',
      'lb.close': 'Close image',

      // Games metadata & UI
      'games.embedBlocksName': 'Blocks — 3D tower',
      'games.playNamed': 'Play {name}',
      'games.meta.snake.title': 'SNAKE',
      'games.meta.snake.hint': 'Arrow keys or swipe · eat and grow, avoid collisions',
      'games.meta.pong.title': 'PONG',
      'games.meta.pong.hint': '↑/↓ arrows or drag · first to 5 points wins',
      'games.meta.typing.title': 'TYPER',
      'games.meta.typing.hint': 'Pick a language and type the code · space/enter/tab count',
      'games.meta.blocks.title': 'BLOCKS',
      'games.meta.blocks.hint': 'Tap or space · stack the moving block',
      'games.meta.tictactoe.title': 'TIC-TAC-TOE',
      'games.meta.tictactoe.hint': 'Tap a cell · you are X, CPU is O',
      'games.meta.diana.title': 'TARGET',
      'games.meta.diana.hint': 'Drag from the bow and release to shoot',
      'games.slide.snake.hint': 'Arrow keys or swipe on the board · eat and grow, do not hit the walls or yourself.',
      'games.slide.pong.hint': '↑ / ↓ arrows or drag the paddle · first to reach 5 points wins.',
      'games.slide.diana.hint': 'Drag from the bow and release to shoot · level up without missing as the target shrinks and moves.',

      // Tic-Tac-Toe
      'ttt.yourTurnHtml': 'Your turn · you are <span class="ttt-x">X</span>',
      'ttt.boardAria': 'Tic-Tac-Toe board',
      'ttt.scoresHtml': 'You <span data-s="win">{win}</span> · Draws <span data-s="draw">{draw}</span> · CPU <span data-s="lose">{lose}</span>',
      'ttt.reset': 'Reset',
      'ttt.cellEmpty': 'Cell {n}, empty',
      'ttt.cellX': 'Cell {n}, you (X)',
      'ttt.cellO': 'Cell {n}, CPU (O)',
      'ttt.draw': 'Draw.',
      'ttt.winHtml': 'You won! <span class="ttt-x">X</span>',
      'ttt.loseHtml': 'CPU wins <span class="ttt-o">O</span>',
      'ttt.thinking': 'CPU thinking…',

      // Typing
      'typing.selectTitle': '// pick a language to type',
      'typing.typeIn': 'Type in {name}',
      'typing.unit': 'WPM',
      'typing.inputAria': 'Type the displayed code. Space, Enter, and Tab count as characters.',
      'typing.changeLang': 'Change language',
      'typing.accuracy': 'accuracy',
      'typing.errors': 'errors',
      'typing.time': 'time',
      'typing.graphCap': '// speed (WPM) per second',
      'typing.graphAria': 'Typing speed chart in words per minute over time',
      'typing.dotAria': '{wpm} WPM at second {t}',

      // Blocks3D
      'blocks.hud': 'BLOCKS: {score}',

      // Snake
      'snake.score': 'Score: {score}',
      'snake.boardAria': 'Snake board',

      // Pong
      'pong.win': 'You win!',
      'pong.lose': 'CPU wins',
      'pong.boardAria': 'Pong table',

      // Diana
      'diana.hud': 'LEVEL {level}  ·  ARROWS: {arrows}  ·  SCORE: {score}',
      'diana.roundOver': 'Round over — Level {level}',
      'diana.totalScore': 'Total score: {score}',
      'diana.timePenalty': "Time's up! −{penalty}",
      'diana.bullseye': 'Bullseye!',
      'diana.miss': 'Miss',
      'diana.boardAria': 'Target — drag from the bow and release to shoot'
    }
  };

  function readSavedLang() {
    try {
      var saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && VALID[saved]) return saved;
    } catch (e) { /* storage disabled */ }
    return 'es';
  }

  function saveLang(lang) {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) { /* no-op */ }
  }

  var currentLang = readSavedLang();
  document.documentElement.lang = currentLang;

  function t(key, params) {
    var dict = STRINGS[currentLang] || STRINGS.es;
    var val = Object.prototype.hasOwnProperty.call(dict, key)
      ? dict[key]
      : (Object.prototype.hasOwnProperty.call(STRINGS.es, key) ? STRINGS.es[key] : key);
    if (params) {
      val = String(val).replace(/\{(\w+)\}/g, function (_, k) {
        return Object.prototype.hasOwnProperty.call(params, k) ? String(params[k]) : '{' + k + '}';
      });
    }
    return val;
  }

  function updateToggleButtons() {
    document.querySelectorAll('.lang-toggle').forEach(function (group) {
      group.setAttribute('data-lang', currentLang);
      group.querySelectorAll('[data-lang-btn]').forEach(function (btn) {
        var isCurrent = btn.getAttribute('data-lang-btn') === currentLang;
        btn.classList.toggle('is-active', isCurrent);
        btn.setAttribute('aria-pressed', isCurrent ? 'true' : 'false');
      });
    });
  }

  function applyMeta() {
    var page = (document.body && document.body.getAttribute('data-page')) || 'index';
    var titleKey = 'meta.' + page + '.title';
    var descKey = 'meta.' + page + '.desc';
    if (STRINGS[currentLang] && STRINGS[currentLang][titleKey]) {
      document.title = t(titleKey);
    }
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && STRINGS[currentLang] && STRINGS[currentLang][descKey]) {
      metaDesc.setAttribute('content', t(descKey));
    }
  }

  function applyDOM() {
    document.documentElement.lang = currentLang;
    applyMeta();

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
    document.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
      el.setAttribute('alt', t(el.getAttribute('data-i18n-alt')));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    document.querySelectorAll('[data-i18n-scramble]').forEach(function (el) {
      var text = t(el.getAttribute('data-i18n-scramble'));
      el.setAttribute('data-scramble', text);
      el.textContent = text;
    });

    updateToggleButtons();
  }

  function syncData() {
    if (PF.locales && PF.locales[currentLang]) {
      PF.data = PF.locales[currentLang];
    }
  }

  function setLang(next) {
    if (!VALID[next] || next === currentLang) return;
    currentLang = next;
    saveLang(currentLang);
    syncData();
    applyDOM();
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](currentLang); } catch (err) { /* isolate listener errors */ }
    }
  }

  function toggle() {
    setLang(currentLang === 'es' ? 'en' : 'es');
  }

  function onChange(fn) {
    if (typeof fn === 'function') listeners.push(fn);
  }

  document.addEventListener('DOMContentLoaded', function () {
    syncData();
    applyDOM();
    document.querySelectorAll('[data-lang-btn]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = btn.getAttribute('data-lang-btn');
        if (next) setLang(next);
      });
    });
  });

  PF.i18n = {
    get lang() { return currentLang; },
    t: t,
    setLang: setLang,
    toggle: toggle,
    onChange: onChange,
    applyDOM: applyDOM
  };
})();
