/**
 * subpage-effects.js — wires the Batch 3 matrixRain/dotGrid canvases into the
 * logros.html / proyectos.html subpage backgrounds. Kept separate from
 * subpage.js (owned by the item-rendering task) so this batch's changes stay
 * isolated to files it is responsible for. Reuses PF.effects (js/effects.js),
 * which already gates start() behind mobile/reduced-motion checks and only
 * ever runs one canvas loop per page (this file starts at most one).
 */
window.PF = window.PF || {};

(function () {
  'use strict';

  // Checkpoint 4 Tanda B: proyectos → travelling-light grid of squares;
  // formacion → clustering green particle field; logros keeps its dot grid.
  var CANVAS_BY_PAGE = {
    proyectos: 'gridSquares',
    formacion: 'particleField',
    logros: 'dotGrid'
  };

  document.addEventListener('DOMContentLoaded', function () {
    var page = document.body.getAttribute('data-page');
    var effectName = CANVAS_BY_PAGE[page];
    if (!effectName || !PF.effects || !PF.effects[effectName]) return;

    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.className = 'subpage-fx-canvas';
    document.body.insertBefore(canvas, document.body.firstChild);

    PF.effects[effectName].start(canvas);
  });
})();
