/**
 * konami.js — ↑↑↓↓←→←→BA sequence → 5s full-screen matrix-rain takeover,
 * then restores normally. Suppressed while any modal is open: reads
 * window.PF.state.modalOpen (set by the games modal lifecycle, Batch 4) —
 * this file only READS that flag, it never defines game-modal logic.
 * Reduced-motion: the easter egg does not trigger at all.
 */
window.PF = window.PF || {};

(function () {
  'use strict';

  var SEQUENCE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  var pos = 0;
  var active = false;
  var enabled = false;
  var overlayCanvas = null;
  var restoreTimer = null;

  function reduced() {
    return !!(PF.state && PF.state.reducedMotion);
  }

  function modalOpen() {
    return !!(PF.state && PF.state.modalOpen);
  }

  function matches(key, expected) {
    return expected.length === 1 ? key.toLowerCase() === expected : key === expected;
  }

  function onKeydown(e) {
    if (modalOpen()) return; // Konami suppressed entirely while a game modal is open.
    if (matches(e.key, SEQUENCE[pos])) {
      pos++;
      if (pos === SEQUENCE.length) {
        pos = 0;
        trigger();
      }
    } else {
      pos = matches(e.key, SEQUENCE[0]) ? 1 : 0;
    }
  }

  function trigger() {
    if (active || reduced()) return;
    active = true;
    overlayCanvas = document.createElement('canvas');
    overlayCanvas.setAttribute('aria-hidden', 'true');
    overlayCanvas.className = 'konami-overlay';
    document.body.appendChild(overlayCanvas);
    if (PF.effects && PF.effects.konamiMatrix) {
      PF.effects.konamiMatrix.start(overlayCanvas);
    }
    restoreTimer = setTimeout(restore, 5000);
  }

  function restore() {
    if (restoreTimer) {
      clearTimeout(restoreTimer);
      restoreTimer = null;
    }
    if (PF.effects && PF.effects.konamiMatrix) PF.effects.konamiMatrix.stop();
    if (overlayCanvas && overlayCanvas.parentNode) overlayCanvas.parentNode.removeChild(overlayCanvas);
    overlayCanvas = null;
    active = false;
  }

  PF.konami = {
    enable: function () {
      if (enabled) return;
      enabled = true;
      pos = 0;
      document.addEventListener('keydown', onKeydown);
    },
    disable: function () {
      enabled = false;
      pos = 0;
      document.removeEventListener('keydown', onKeydown);
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    PF.konami.enable();
  });
})();
