/**
 * subpage.js — shared renderer for logros.html / proyectos.html /
 * formacion.html. Reads body[data-page], renders one item per full-screen
 * scroll-snap section from PF.data, and drives the animated vertical timeline
 * (rail fill + nodes activate as you scroll). Vanilla + file://-safe:
 * classic defer, relative paths, single window.PF namespace, single observer.
 */
window.PF = window.PF || {};

(function () {
  'use strict';

  var reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  PF.state = PF.state || {
    reducedMotion: reducedMotionQuery.matches,
    isTouch: !window.matchMedia('(hover: hover) and (pointer: fine)').matches
  };

  var PAGES = {
    logros: { anchor: 'section3', label: 'LOGROS', data: 'logros', render: renderLogros },
    proyectos: { anchor: 'section4', label: 'PROYECTOS', data: 'projects', render: renderProject },
    formacion: { anchor: 'section5', label: 'FORMACIÓN', data: 'formacion', render: renderFormacion }
  };

  document.addEventListener('DOMContentLoaded', init);

  function esc(str) {
    var d = document.createElement('div');
    d.textContent = String(str == null ? '' : str);
    return d.innerHTML;
  }

  function init() {
    var page = document.body.getAttribute('data-page');
    var cfg = PAGES[page];
    if (!cfg || !PF.data) return;

    // Back link target (static title/back label already correct per page)
    var back = document.querySelector('.back-link');
    if (back) back.setAttribute('href', 'index.html#' + cfg.anchor);

    var items = (PF.data[cfg.data] || []).slice().sort(function (a, b) {
      return (a.dateISO || '').localeCompare(b.dateISO || '');
    });

    var container = document.getElementById('scrollContainer');
    if (!container) return;
    container.innerHTML = items.map(function (it, i) {
      return (
        '<section class="sub-item" data-index="' + i + '">' +
        cfg.render(it, i) +
        '</section>'
      );
    }).join('');

    buildRailNodes(items);
    setupObserver(items.length);
    scaleIframeCovers();
    dismissLoading();
  }

  // Scale each colored-ASCII cover iframe so its native pixel size fits the
  // frame width at any viewport (transform: scale from top-left).
  function scaleIframeCovers() {
    var frames = document.querySelectorAll('.harnes-frame');
    if (!frames.length) return;
    function apply() {
      frames.forEach(function (frame) {
        var iframe = frame.querySelector('.harnes-iframe');
        if (!iframe) return;
        var natW = Number(frame.getAttribute('data-natw')) || 1490;
        var natH = Number(frame.getAttribute('data-nath')) || 500;
        var scale = frame.clientWidth / natW;
        iframe.style.width = natW + 'px';
        iframe.style.height = natH + 'px';
        iframe.style.transform = 'scale(' + scale + ')';
        frame.style.height = (natH * scale) + 'px';
      });
    }
    apply();
    // Re-apply after the iframe document paints (fonts/layout) and on resize.
    setTimeout(apply, 300);
    window.addEventListener('resize', function () {
      clearTimeout(window.__harnesScaleT);
      window.__harnesScaleT = setTimeout(apply, 150);
    });
  }

  // ---- item renderers ---------------------------------------------------

  function mediaGallery(images) {
    if (!images || !images.length) return '';
    return '<div class="item-media">' + images.map(function (im) {
      return '<img src="' + esc(im.src) + '" width="' + im.w + '" height="' + im.h +
        '" loading="lazy" alt="' + esc(im.alt) + '" />';
    }).join('') + '</div>';
  }

  // Checkpoint 3: EcoAlerta uses a backup video instead of a static shot.
  function videoMedia(v) {
    return '<div class="item-media item-video">' +
      '<video controls muted loop playsinline preload="metadata"' +
      ' width="' + v.w + '" height="' + v.h + '"' +
      ' poster="' + esc(v.poster) + '"' +
      (v.label ? ' aria-label="' + esc(v.label) + '"' : '') + '>' +
      '<source src="' + esc(v.src) + '" type="video/mp4" />' +
      '</video></div>';
  }

  function renderProject(p) {
    // Checkpoint 4: some projects (aproximation_NGP, harnes-erickfp) migrated
    // from the old EXPERIENCIA section and carry stats + a generated visual
    // instead of a screenshot gallery.
    var stats = (p.stats || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
    var body =
      '<div class="item-body">' +
      '<span class="item-date mono">' + esc(p.date) + '</span>' +
      '<div class="item-kind">PROYECTO · ' + esc(p.lang) + '</div>' +
      '<h2 class="item-title">' + esc(p.title) + '</h2>' +
      '<p class="item-desc">' + esc(p.description) + '</p>' +
      (p.note ? '<p class="item-note">' + esc(p.note) + '</p>' : '') +
      (stats ? '<ul class="item-stats">' + stats + '</ul>' : '') +
      '<a class="item-link" href="' + esc(p.link) + '" target="_blank" rel="noopener noreferrer">↗ ' + esc(p.linkLabel) + '</a>' +
      '</div>';
    var media;
    if (p.video) media = videoMedia(p.video);
    else if (p.visual) media = experienceVisual(p);
    else media = mediaGallery(p.images);
    return '<div class="item-card reveal-up' + (media ? '' : ' single') + '">' + body + media + '</div>';
  }

  // Checkpoint 4: LOGROS = premios y reconocimientos. Gold medal is the
  // featured (golden) item; the rest render their scanned certificate.
  function renderLogros(l) {
    var meta = [];
    if (l.issuer) meta.push(l.issuer);
    var body =
      '<div class="item-body">' +
      '<span class="item-date mono">' + esc(l.date) + '</span>' +
      '<div class="item-kind">' + esc(l.kindLabel || 'RECONOCIMIENTO') + '</div>' +
      '<h2 class="item-title">' + esc(l.title) + '</h2>' +
      (meta.length ? '<p class="item-meta">' + esc(meta.join(' · ')) + '</p>' : '') +
      '<p class="item-desc">' + esc(l.description) + '</p>' +
      (l.link ? '<a class="item-link" href="' + esc(l.link) + '" target="_blank" rel="noopener noreferrer">↗ ' + esc(l.linkLabel || 'Ver más') + '</a>' : '') +
      '</div>';
    var media;
    if (l.gold) {
      media = '<div class="medal-badge" role="img" aria-label="Medalla de Oro nacional">★</div>';
    } else if (l.image) {
      media = '<div class="item-media cert-frame"><img src="' + esc(l.image.src) + '" width="' + l.image.w +
        '" height="' + l.image.h + '" loading="lazy" alt="' + esc(l.image.alt) + '" /></div>';
    } else {
      media = '';
    }
    return '<div class="item-card reveal-up' + (l.gold ? ' gold' : '') + (media ? '' : ' single') + '">' + body + media + '</div>';
  }

  function experienceVisual(e) {
    if (e.visual === 'image' && e.image) {
      return '<div class="item-media"><img src="' + esc(e.image.src) + '" width="' + e.image.w +
        '" height="' + e.image.h + '" loading="lazy" alt="' + esc(e.image.alt) + '" /></div>';
    }
    if (e.visual === 'stats') {
      // No screenshot exists → generated attractive stats panel (not a fake screenshot).
      var curve = '<svg class="gen-curve" viewBox="0 0 300 70" preserveAspectRatio="none" aria-hidden="true">' +
        '<polyline points="0,60 40,52 80,55 120,38 160,42 200,22 240,28 300,10" fill="none" stroke="#00ff00" stroke-width="2"/>' +
        '<polyline points="0,64 40,60 80,58 120,50 160,46 200,40 240,34 300,26" fill="none" stroke="#00ffff" stroke-width="1.5" opacity="0.6"/>' +
        '</svg>';
      return '<div class="gen-visual" role="img" aria-label="Panel de resultados: 53.082 estrellas Gaia DR3, 179 tests">' +
        '<div class="gen-stats-grid">' +
        '<div class="gen-stat"><div class="num">53.082</div><div class="lbl">estrellas · Gaia DR3</div></div>' +
        '<div class="gen-stat"><div class="num">179</div><div class="lbl">tests automatizados</div></div>' +
        '<div class="gen-stat"><div class="num">DR3</div><div class="lbl">catálogo Gaia</div></div>' +
        '<div class="gen-stat"><div class="num">100%</div><div class="lbl">tests en verde</div></div>' +
        '</div>' + curve + '</div>';
    }
    if (e.visual === 'iframe' && e.iframe) {
      // Colored-ASCII HTML export used as a scaled cover; acts as an image
      // (pointer-events:none, tabindex=-1, sandbox, lazy). Scale is set by
      // scaleIframeCovers() after layout so the art fits the card at any width.
      return '<div class="item-media harnes-cover">' +
        '<div class="harnes-frame" data-natw="' + e.iframe.natW + '" data-nath="' + e.iframe.natH + '">' +
        '<iframe class="harnes-iframe" src="' + esc(e.iframe.src) + '" title="' + esc(e.iframe.title) +
        '" loading="lazy" tabindex="-1" aria-hidden="true" scrolling="no" sandbox></iframe>' +
        '</div></div>';
    }
    if (e.visual === 'terminal') {
      return '<div class="gen-terminal" role="img" aria-label="Salida de terminal de harnes-erickfp">' +
        '<div class="tl"><span class="prompt">$</span> harnes run --agent build</div>' +
        '<div class="tl"><span class="ok">✓</span> plan generado · esperando aprobación humana</div>' +
        '<div class="tl"><span class="warn">?</span> approve step 3/7 &gt; <span class="ok">yes</span></div>' +
        '<div class="tl"><span class="ok">✓</span> 126 tests passed · 95% coverage</div>' +
        '<div class="tl"><span class="prompt">$</span> <span class="blink-cur"></span></div>' +
        '</div>';
    }
    return '';
  }

  function renderFormacion(f) {
    var meta = [];
    if (f.issuer) meta.push(f.issuer);
    if (f.hours) meta.push(f.hours);
    var body =
      '<div class="item-body">' +
      '<span class="item-date mono">' + esc(f.date) + '</span>' +
      '<div class="item-kind">' + (f.gold ? 'RECONOCIMIENTO' : 'CERTIFICADO') + '</div>' +
      '<h2 class="item-title">' + esc(f.title) + '</h2>' +
      (meta.length ? '<p class="item-meta">' + esc(meta.join(' · ')) + '</p>' : '') +
      '<p class="item-desc">' + esc(f.description) + '</p>' +
      '</div>';
    var media;
    if (f.gold) {
      media = '<div class="medal-badge" role="img" aria-label="Medalla de Oro nacional">★</div>';
    } else if (f.image) {
      media = '<div class="item-media cert-frame"><img src="' + esc(f.image.src) + '" width="' + f.image.w +
        '" height="' + f.image.h + '" loading="lazy" alt="' + esc(f.image.alt) + '" /></div>';
    } else {
      media = '';
    }
    return '<div class="item-card reveal-up' + (f.gold ? ' gold' : '') + (media ? '' : ' single') + '">' + body + media + '</div>';
  }

  // ---- timeline ---------------------------------------------------------

  function buildRailNodes(items) {
    var rail = document.querySelector('.timeline-rail');
    var count = items.length;
    if (!rail || count < 1) return;
    for (var i = 0; i < count; i++) {
      var node = document.createElement('div');
      node.className = 'rail-node';
      node.style.top = (count === 1 ? 0 : (i / (count - 1)) * 100) + '%';
      // Checkpoint 4: real date shown adjacent to the node while it is active.
      var label = document.createElement('span');
      label.className = 'rail-node-date mono';
      label.textContent = items[i].date || '';
      node.appendChild(label);
      rail.appendChild(node);
    }
  }

  function setupObserver(count) {
    var fill = document.querySelector('.timeline-rail-fill');
    var nodes = document.querySelectorAll('.rail-node');
    var seen = new WeakSet();

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.intersectionRatio >= 0.5) {
          var idx = Number(entry.target.dataset.index);
          if (fill) fill.style.height = (count <= 1 ? 100 : (idx / (count - 1)) * 100) + '%';
          nodes.forEach(function (n, i) {
            n.classList.toggle('active', i <= idx);
            n.classList.toggle('current', i === idx);
          });
          var reveal = entry.target.querySelector('.reveal-up');
          if (reveal && !seen.has(reveal)) {
            reveal.classList.add('in-view');
            seen.add(reveal);
          }
        }
      });
    }, { threshold: 0.5, rootMargin: '-1px' });

    document.querySelectorAll('.sub-item').forEach(function (s) { observer.observe(s); });
  }

  // ---- loading screen ---------------------------------------------------

  function dismissLoading() {
    var screen = document.getElementById('loading-screen');
    if (!screen) return;
    function finish() {
      screen.classList.add('hidden');
      setTimeout(function () { if (screen.parentNode) screen.parentNode.removeChild(screen); }, 650);
    }
    if (PF.state.reducedMotion) { finish(); return; }
    if (document.readyState === 'complete') {
      setTimeout(finish, 500);
    } else {
      window.addEventListener('load', function () { setTimeout(finish, 400); }, { once: true });
    }
  }
})();
