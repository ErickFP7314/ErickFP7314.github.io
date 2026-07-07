/**
 * lightbox.js — reusable image lightbox (checkpoint 4).
 *
 * Included on index.html and every subpage. Delegates clicks on content
 * <img> elements (card / timeline images + the hero portrait) and opens a
 * fullscreen modal with the image enlarged and subtle zoom controls
 * (in / out / reset / close). Only <img> is lightboxed — videos and the
 * Harnes iframe cover are ignored.
 *
 * A11y: role="dialog" + aria-modal, focus trap, ESC + backdrop-click close,
 * restores focus on close, 44px control targets, inline-SVG icons (no emojis).
 * Zoom uses transform:scale; when zoomed the image can be dragged to pan.
 * Vanilla, file://-safe, single window.PF namespace, no CDN.
 */
window.PF = window.PF || {};

(function () {
  'use strict';

  // Match content images only: card/timeline media + the hero portrait, or any
  // element opted-in with .pf-zoomable. Excludes iframes and videos naturally.
  var TRIGGER_SELECTOR = '.item-media img, .profile-photo, img.pf-zoomable';

  var ICONS = {
    zoomIn:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 2a8 8 0 1 0 4.9 14.32l5.39 5.4 1.42-1.42-5.4-5.39A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12A6 6 0 0 1 10 4Zm-1 2v3H6v2h3v3h2v-3h3V9h-3V6H9Z"/></svg>',
    zoomOut:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 2a8 8 0 1 0 4.9 14.32l5.39 5.4 1.42-1.42-5.4-5.39A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12A6 6 0 0 1 10 4ZM6 9h8v2H6V9Z"/></svg>',
    reset:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7Z"/></svg>',
    close:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.3 5.71 12 12l6.3 6.29-1.42 1.42L10.59 13.4l-6.3 6.3-1.4-1.42L9.17 12 2.88 5.71 4.3 4.3l6.29 6.3 6.3-6.3 1.41 1.41Z"/></svg>'
  };

  var MIN = 1;
  var MAX = 4;
  var STEP = 0.5;

  var overlay = null;
  var imgEl = null;
  var lastFocused = null;
  var scale = 1;
  var tx = 0;
  var ty = 0;
  var dragging = false;
  var startX = 0;
  var startY = 0;

  function reduced() {
    return !!(PF.state && PF.state.reducedMotion);
  }

  function applyTransform() {
    if (!imgEl) return;
    imgEl.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
    imgEl.style.cursor = scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'default';
  }

  function setScale(next) {
    scale = Math.max(MIN, Math.min(MAX, next));
    if (scale === 1) { tx = 0; ty = 0; }
    applyTransform();
  }

  function focusables() {
    if (!overlay) return [];
    return Array.prototype.slice.call(
      overlay.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])')
    ).filter(function (el) { return !el.disabled && el.offsetParent !== null; });
  }

  function onKeydown(e) {
    if (!overlay) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === '+' || e.key === '=') { e.preventDefault(); setScale(scale + STEP); return; }
    if (e.key === '-' || e.key === '_') { e.preventDefault(); setScale(scale - STEP); return; }
    if (e.key === 'Tab') {
      var list = focusables();
      if (!list.length) return;
      var first = list[0];
      var last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  function makeBtn(cls, label, iconKey, handler) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'pf-lb-btn ' + cls;
    b.setAttribute('aria-label', label);
    b.innerHTML = ICONS[iconKey];
    b.addEventListener('click', function (e) { e.stopPropagation(); handler(); });
    return b;
  }

  function open(src, alt) {
    if (overlay) return;
    lastFocused = document.activeElement;
    scale = 1; tx = 0; ty = 0;

    overlay = document.createElement('div');
    overlay.className = 'pf-lightbox';

    var dialog = document.createElement('div');
    dialog.className = 'pf-lb-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', alt || 'Imagen ampliada');

    var stage = document.createElement('div');
    stage.className = 'pf-lb-stage';

    imgEl = document.createElement('img');
    imgEl.className = 'pf-lb-img';
    imgEl.src = src;
    imgEl.alt = alt || '';
    imgEl.draggable = false;
    stage.appendChild(imgEl);

    var controls = document.createElement('div');
    controls.className = 'pf-lb-controls';
    controls.appendChild(makeBtn('pf-lb-zoomin', 'Acercar imagen', 'zoomIn', function () { setScale(scale + STEP); }));
    controls.appendChild(makeBtn('pf-lb-zoomout', 'Alejar imagen', 'zoomOut', function () { setScale(scale - STEP); }));
    controls.appendChild(makeBtn('pf-lb-reset', 'Restablecer zoom', 'reset', function () { setScale(1); }));
    var closeBtn = makeBtn('pf-lb-close', 'Cerrar imagen', 'close', function () { close(); });
    controls.appendChild(closeBtn);

    dialog.appendChild(controls);
    dialog.appendChild(stage);
    overlay.appendChild(dialog);

    // Backdrop click (outside the image) closes.
    overlay.addEventListener('mousedown', function (e) {
      if (e.target === overlay || e.target === stage) close();
    });

    // Drag-to-pan when zoomed.
    stage.addEventListener('pointerdown', function (e) {
      if (scale <= 1) return;
      dragging = true;
      startX = e.clientX - tx;
      startY = e.clientY - ty;
      applyTransform();
      try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    });
    stage.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      tx = e.clientX - startX;
      ty = e.clientY - startY;
      applyTransform();
    });
    function endDrag() { dragging = false; applyTransform(); }
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);

    // Wheel to zoom (desktop convenience).
    stage.addEventListener('wheel', function (e) {
      e.preventDefault();
      setScale(scale + (e.deltaY < 0 ? STEP : -STEP));
    }, { passive: false });

    document.body.appendChild(overlay);
    document.body.classList.add('pf-lb-open');
    PF.state = PF.state || {};
    PF.state.lightboxOpen = true;
    document.addEventListener('keydown', onKeydown, true);

    if (!reduced()) requestAnimationFrame(function () { overlay.classList.add('visible'); });
    else overlay.classList.add('visible');

    closeBtn.focus();
  }

  function close() {
    if (!overlay) return;
    document.removeEventListener('keydown', onKeydown, true);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
    imgEl = null;
    dragging = false;
    document.body.classList.remove('pf-lb-open');
    if (PF.state) PF.state.lightboxOpen = false;
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    lastFocused = null;
  }

  // Delegate clicks on eligible content images.
  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!target || target.tagName !== 'IMG') return;
    if (!target.matches(TRIGGER_SELECTOR)) return;
    // Never intercept while a game modal is open.
    if (PF.state && PF.state.modalOpen) return;
    e.preventDefault();
    open(target.currentSrc || target.src, target.alt);
  });

  // Make eligible images look interactive (cursor) once the DOM is ready.
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll(TRIGGER_SELECTOR).forEach(function (im) {
      im.classList.add('pf-lb-trigger');
    });
  });

  PF.lightbox = { open: open, close: close };
})();
