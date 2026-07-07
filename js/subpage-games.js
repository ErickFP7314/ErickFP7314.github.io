/**
 * subpage-games.js — Batch 6B (T2/T3/T4/T6). Appends ONE full-screen
 * scroll-snap slide at the END of #scrollContainer per subpage, hosting a
 * mini-game IN PLACE (no modal — subpages have room for a dedicated slide,
 * unlike index.html's compact sections):
 *   - proyectos.html  -> Snake  (PF.games.snake)
 *   - formacion.html  -> Pong   (PF.games.pong)
 *   - logros.html     -> Diana  (PF.games.diana)
 *
 * Registered AFTER js/subpage.js (which owns container.innerHTML for the
 * dynamic timeline items) so this appendChild never clobbers that render.
 * Also registered AFTER the relevant js/games/<id>.js so PF.games.<id> is
 * already defined when the IntersectionObserver below fires.
 *
 * Lifecycle (design.md contract, reused from games/*): lazy init when the
 * slide is >=50% visible -> PF.games.<id>.init(mount, PF.state) + start();
 * teardown when it drops below that threshold -> PF.games.<id>.stop().
 * Each game module already owns its own keyboard + touch handling (swipe on
 * Snake's canvas, drag on Pong's canvas, tap/drag on Diana's canvas), so it
 * runs identically here on desktop and mobile.
 */
window.PF = window.PF || {};

(function () {
  'use strict';

  var GAME_SLIDES = {
    proyectos: {
      id: 'snake',
      title: 'SNAKE',
      hint: 'Flechas o desliza el dedo sobre el tablero · come y crece, no choques con el borde ni contigo mismo.'
    },
    formacion: {
      id: 'pong',
      title: 'PONG',
      hint: 'Flechas ↑ / ↓ o arrastra la paleta con el dedo · el primero en llegar a 5 puntos gana.'
    },
    logros: {
      id: 'diana',
      title: 'DIANA',
      hint: 'Arrastra desde el arco y suelta para disparar · sube de nivel sin fallar, la diana se encoge y se mueve.'
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    var page = document.body.getAttribute('data-page');
    var cfg = GAME_SLIDES[page];
    if (!cfg) return;

    var container = document.getElementById('scrollContainer');
    if (!container) return;

    var section = document.createElement('section');
    section.className = 'game-slide';
    section.setAttribute('data-game', cfg.id);
    section.innerHTML =
      '<div class="game-slide-inner">' +
      '<p class="game-slide-kicker mono">// mini-juego</p>' +
      '<h2 class="game-slide-title mono">' + cfg.title + '</h2>' +
      '<p class="game-slide-hint mono">' + cfg.hint + '</p>' +
      '<div class="game-slide-mount" data-mount tabindex="-1"></div>' +
      '</div>';
    container.appendChild(section);

    var mount = section.querySelector('[data-mount]');
    var started = false;

    function teardown() {
      var mod = PF.games && PF.games[cfg.id];
      if (!mod || !started) return;
      started = false;
      mod.stop();
    }

    function boot() {
      var mod = PF.games && PF.games[cfg.id];
      if (!mod || started) return;
      started = true;
      mod.init(mount, PF.state);
      mod.start();
    }

    if (!('IntersectionObserver' in window)) {
      // Extremely old browser fallback: just boot once, no teardown.
      boot();
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.intersectionRatio >= 0.5) boot();
        else teardown();
      });
    }, { threshold: [0, 0.5, 1] });

    io.observe(section);

    // Safety net: stop the loop if the user navigates away mid-game.
    window.addEventListener('pagehide', teardown);
  });
})();
