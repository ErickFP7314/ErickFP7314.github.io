/**
 * games/embed.js — shared lifecycle for IN-PLACE (non-modal) embedded games
 * that float as a native part of a main-page section (checkpoint 4 Tanda B).
 * Used by Blocks (Proyectos) and Diana (Formación). NOT used by the TicTacToe
 * embed (Logros), which is always-on and self-contained.
 *
 * States (class on host): is-idle → is-playing → is-paused → (game over) → is-idle
 *   - idle:    stage blurred, "Jugar" CTA overlay, static preview drawn.
 *   - playing: stage sharp/interactive, section siblings dimmed (focus effect).
 *   - paused:  stage blurred, "Pausa" overlay; triggered by a click OUTSIDE the
 *              host; clicking the host resumes.
 *   - over:    game shows its score briefly, then auto-returns to idle.
 *
 * Game contract (blocks3d / diana embed):
 *   game = {
 *     preview(stageEl),          // draw the static idle frame
 *     play(stageEl, onOver),     // start; call onOver() when the round ends
 *     pause(), resume(), stop()  // rAF / listener control + teardown
 *   }
 */
window.PF = window.PF || {};
PF.embed = PF.embed || {};

(function () {
  'use strict';

  var PLAY_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7L8 5Z"/></svg>';

  function reduced() {
    return !!(PF.state && PF.state.reducedMotion);
  }

  function attach(cfg) {
    var host = cfg.host;
    var section = cfg.section || null;
    var game = cfg.game;
    var name = cfg.name || 'juego';
    if (!host || !game) return null;

    host.classList.add('pf-embed', 'is-idle');
    host.innerHTML =
      '<div class="pf-embed-stage" tabindex="-1"></div>' +
      '<button type="button" class="pf-embed-cta mono" aria-label="Jugar ' + name + '">' +
      '<span class="pf-embed-icon" aria-hidden="true">' + PLAY_SVG + '</span>' +
      '<span>Jugar</span></button>' +
      '<div class="pf-embed-pause mono" aria-hidden="true"><span>Pausa</span></div>';

    var stage = host.querySelector('.pf-embed-stage');
    var cta = host.querySelector('.pf-embed-cta');
    var state = 'idle';
    var outsideHandler = null;
    var overTimer = null;

    game.preview(stage);

    function setState(s) {
      host.classList.remove('is-idle', 'is-playing', 'is-paused');
      host.classList.add('is-' + s);
      state = s;
    }

    function focusSection(on) {
      if (section) section.classList.toggle('pf-embed-focus', !!on);
    }

    function onOutside(e) {
      if (state !== 'playing') return;
      if (host.contains(e.target)) return;
      pause();
    }

    function bindOutside() {
      if (outsideHandler) return;
      outsideHandler = onOutside;
      // Delay so the CTA click that started play doesn't instantly pause.
      setTimeout(function () {
        if (outsideHandler) document.addEventListener('pointerdown', outsideHandler, true);
      }, 0);
    }
    function unbindOutside() {
      if (outsideHandler) document.removeEventListener('pointerdown', outsideHandler, true);
      outsideHandler = null;
    }

    function onOver() {
      // Game has rendered its final score; hold, then return to idle.
      if (overTimer) clearTimeout(overTimer);
      overTimer = setTimeout(function () {
        overTimer = null;
        game.stop();
        focusSection(false);
        game.preview(stage);
        setState('idle');
      }, 2200);
    }

    function play() {
      if (state === 'playing') return;
      if (overTimer) { clearTimeout(overTimer); overTimer = null; }
      setState('playing');
      focusSection(true);
      game.play(stage, onOver);
      bindOutside();
      try { stage.focus({ preventScroll: true }); } catch (e) { stage.focus(); }
    }

    function pause() {
      if (state !== 'playing') return;
      setState('paused');
      game.pause();
      unbindOutside();
    }

    function resume() {
      if (state !== 'paused') return;
      setState('playing');
      game.resume();
      bindOutside();
    }

    function hardStop() {
      if (overTimer) { clearTimeout(overTimer); overTimer = null; }
      unbindOutside();
      game.stop();
      focusSection(false);
      game.preview(stage);
      setState('idle');
    }

    cta.addEventListener('click', function (e) { e.stopPropagation(); play(); });

    host.addEventListener('click', function () {
      if (state === 'paused') resume();
    });
    host.addEventListener('keydown', function (e) {
      if (state === 'paused' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        resume();
      }
    });

    // Auto-pause when the host scrolls out of view (single-active-loop rule).
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.intersectionRatio < 0.35 && state === 'playing') pause();
        });
      }, { threshold: [0, 0.35, 1] });
      io.observe(host);
    }

    return { play: play, pause: pause, resume: resume, stop: hardStop, host: host };
  }

  PF.embed.attach = attach;
})();
