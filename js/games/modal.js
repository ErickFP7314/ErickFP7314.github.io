/**
 * games/modal.js — shared game-modal lifecycle (design.md contract, Batch 4).
 *
 * Builds/destroys the modal overlay + "¿Jugar?" trigger badges ENTIRELY at
 * runtime via document.createElement — no static markup is added to any
 * HTML file. Coordinates with the effects/konami module (owned by the
 * parallel Batch 3 agent) purely through window.PF.state.modalOpen, a
 * boolean flag: true while a game modal is open, false otherwise.
 *
 * Game module contract (each games/{snake,pong,typing,blocks,diana}.js):
 *   PF.games.<id> = {
 *     init: function (mountEl, state) { ... build DOM/canvas fresh ... },
 *     start: function () { ... reset internal state, start rAF/timers ... },
 *     stop: function () { ... cancel ALL rAF/timers/listeners, reset state ... }
 *   }
 * modal.open() always rebuilds the mount element from scratch and calls
 * init()+start(); modal.close() calls stop() THEN discards the whole
 * overlay (including the mount) — this guarantees lazy init (nothing is
 * allocated until a modal opens) and no leaks on reopen (nothing survives
 * a close but the module's static function references).
 */
window.PF = window.PF || {};
PF.games = PF.games || {};

(function () {
  'use strict';

  // Display metadata for the modal header. Game logic modules attach
  // themselves as PF.games.<id> = { init, start, stop } elsewhere.
  PF.games.META = {
    snake: { title: 'SNAKE', hint: 'Flechas o desliza el dedo · come y crece, no choques' },
    pong: { title: 'PONG', hint: 'Flechas ↑/↓ o arrastra · el primero en llegar a 5 gana' },
    typing: { title: 'TYPING TEST', hint: 'Escribe el snippet completo antes de que se acabe el tiempo' },
    blocks: { title: 'BLOCKS', hint: 'Clic, espacio o toque · encaja el bloque en movimiento' },
    diana: { title: 'DIANA', hint: 'Arrastra desde el arco y suelta para disparar' }
  };

  var overlay = null;
  var mountEl = null;
  var lastFocused = null;
  var activeId = null;
  var scrollContainer = null;

  function focusablesIn(root) {
    return Array.prototype.slice.call(
      root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter(function (el) { return !el.disabled && el.offsetParent !== null; });
  }

  function onKeydownCapture(e) {
    if (!overlay) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'Tab') {
      var list = focusablesIn(overlay);
      if (!list.length) return;
      var first = list[0];
      var last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    // Suppress page scroll while a game is open (design.md: "scope keydown
    // to game, preventDefault arrows/space").
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Spacebar'].indexOf(e.key) !== -1) {
      e.preventDefault();
    }
  }

  function open(gameId, triggerEl) {
    var meta = PF.games.META[gameId];
    var mod = PF.games[gameId];
    if (!meta || !mod || overlay) return;

    lastFocused = triggerEl || document.activeElement;
    activeId = gameId;

    overlay = document.createElement('div');
    overlay.className = 'pf-modal-overlay';
    overlay.setAttribute('data-game', gameId);

    var box = document.createElement('div');
    box.className = 'pf-modal-box';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', meta.title);

    var header = document.createElement('div');
    header.className = 'pf-modal-header mono';

    var titleEl = document.createElement('span');
    titleEl.className = 'pf-modal-title';
    titleEl.textContent = '$ ./' + gameId + ' --play';

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'pf-modal-close';
    closeBtn.setAttribute('aria-label', 'Cerrar juego');
    closeBtn.textContent = '[X]';
    closeBtn.addEventListener('click', function () { close(); });

    header.appendChild(titleEl);
    header.appendChild(closeBtn);

    mountEl = document.createElement('div');
    mountEl.className = 'pf-modal-mount';

    var hint = document.createElement('div');
    hint.className = 'pf-modal-hint mono';
    hint.textContent = meta.hint;

    box.appendChild(header);
    box.appendChild(mountEl);
    box.appendChild(hint);
    overlay.appendChild(box);

    overlay.addEventListener('mousedown', function (e) {
      if (e.target === overlay) close();
    });

    document.body.appendChild(overlay);

    // Lock the scroll-snap container + page scroll (design.md: "lock body,
    // snap off").
    scrollContainer = document.getElementById('scrollContainer');
    if (scrollContainer) scrollContainer.classList.add('pf-scroll-locked');
    document.body.classList.add('pf-modal-open');

    PF.state = PF.state || {};
    PF.state.modalOpen = true;

    document.addEventListener('keydown', onKeydownCapture, true);

    mod.init(mountEl, PF.state);
    mod.start();

    closeBtn.focus();
  }

  function close() {
    if (!overlay) return;
    var mod = activeId && PF.games[activeId];
    if (mod && typeof mod.stop === 'function') mod.stop();

    document.removeEventListener('keydown', onKeydownCapture, true);

    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
    mountEl = null;

    if (scrollContainer) scrollContainer.classList.remove('pf-scroll-locked');
    document.body.classList.remove('pf-modal-open');
    scrollContainer = null;

    PF.state = PF.state || {};
    PF.state.modalOpen = false;

    var toFocus = lastFocused;
    activeId = null;
    lastFocused = null;
    if (toFocus && typeof toFocus.focus === 'function') toFocus.focus();
  }

  PF.games.open = open;
  PF.games.close = close;

  // -----------------------------------------------------------------------
  // "Jugar" badge injection — runtime-only DOM (never in HTML source).
  // Gamepad icon is an inline SVG (checkpoint 3: no emojis in the UI).
  // -----------------------------------------------------------------------

  var GAMEPAD_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 6h10a5 5 0 0 1 5 5v.8a4.2 4.2 0 0 1-7.7 2.36l-.3-.46a1.2 1.2 0 0 0-1-.54H10.9a1.2 1.2 0 0 0-1 .54l-.3.46A4.2 4.2 0 0 1 2 11.8V11a5 5 0 0 1 5-5Zm-.5 3a.9.9 0 0 0-.9.9v.6h-.6a.9.9 0 0 0 0 1.8h.6v.6a.9.9 0 0 0 1.8 0v-.6h.6a.9.9 0 0 0 0-1.8h-.6v-.6a.9.9 0 0 0-.9-.9Zm9.25.25a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm2 2.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"/></svg>';

  function makeBadge(gameId) {
    var meta = PF.games.META[gameId] || {};
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pf-play-badge mono';
    btn.setAttribute('data-game-trigger', gameId);
    btn.setAttribute('aria-label', 'Jugar ' + (meta.title || gameId));
    btn.innerHTML =
      '<span class="pf-play-icon" aria-hidden="true">' + GAMEPAD_SVG + '</span>' +
      '<span class="pf-play-text">Jugar</span>';

    var hoverTimer = null;
    function arm() { btn.classList.add('pf-play-armed'); }
    function disarmHover() {
      if (hoverTimer) clearTimeout(hoverTimer);
      hoverTimer = null;
    }

    btn.addEventListener('mouseenter', function () {
      hoverTimer = setTimeout(arm, 1000);
    });
    btn.addEventListener('mouseleave', function () {
      disarmHover();
      btn.classList.remove('pf-play-armed');
    });
    btn.addEventListener('focus', arm);
    btn.addEventListener('blur', function () { btn.classList.remove('pf-play-armed'); });
    btn.addEventListener('click', function () { open(gameId, btn); });

    return btn;
  }

  function attachBadge(hostEl, gameId) {
    if (!hostEl) return;
    if (hostEl.querySelector('[data-game-trigger="' + gameId + '"]')) return;
    hostEl.appendChild(makeBadge(gameId));
  }

  // Subpages render items dynamically (subpage.js), sorted by dateISO
  // ascending, with no per-item id in the DOM — replicate that sort here
  // to resolve which .sub-item[data-index] holds a given content.js id.
  function findSubItemBody(dataKey, itemId) {
    if (!PF.data || !PF.data[dataKey]) return null;
    var sorted = PF.data[dataKey].slice().sort(function (a, b) {
      return (a.dateISO || '').localeCompare(b.dateISO || '');
    });
    var idx = -1;
    for (var i = 0; i < sorted.length; i++) {
      if (sorted[i].id === itemId) { idx = i; break; }
    }
    if (idx === -1) return null;
    var section = document.querySelector('.sub-item[data-index="' + idx + '"]');
    return section ? section.querySelector('.item-body') : null;
  }

  function wireSubpageBadges() {
    var page = document.body.getAttribute('data-page');
    if (page === 'proyectos') {
      // Checkpoint 4: aproximation_NGP (Pong) and harnes-erickfp (Typing)
      // migrated into Proyectos alongside the tetris → Snake badge.
      attachBadge(findSubItemBody('projects', 'tetris'), 'snake');
      attachBadge(findSubItemBody('projects', 'aproximation_ngp'), 'pong');
      attachBadge(findSubItemBody('projects', 'harnes-erickfp'), 'typing');
    } else if (page === 'logros') {
      // Diana badge migrated with the gold medal into Logros.
      attachBadge(findSubItemBody('logros', 'medalla-oro-obi'), 'diana');
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Registered AFTER content.js/subpage.js (or content.js on index.html)
    // in every page's script order, so their synchronous DOMContentLoaded
    // rendering has already run by the time this fires.
    // Checkpoint 3: Blocks no longer lives on the contact section — it now has
    // a live preview panel on the Proyectos section (wired by main.js), so the
    // index page injects no badges here.
    if (document.body.hasAttribute('data-page')) {
      wireSubpageBadges();
    }
  });
})();
