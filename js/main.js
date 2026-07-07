/**
 * main.js — bootstraps PF.state, renders data-driven sections, wires the shared
 * IntersectionObserver, hamburger/menu, scroll progress bar, loading screen,
 * hero typing effect, and the contact form's mailto submission.
 * Loads LAST in the D1 script order so PF.data/PF.particles/PF.posters/
 * PF.backgrounds/PF.effects/PF.konami/PF.games are already attached to window.PF.
 */
window.PF = window.PF || {};

(function () {
  'use strict';

  var reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var hoverFineQuery = window.matchMedia('(hover: hover) and (pointer: fine)');

  PF.state = {
    activeSection: 'section1',
    modalOpen: null,
    soundOn: false,
    reducedMotion: reducedMotionQuery.matches,
    isTouch: !hoverFineQuery.matches
  };

  if (reducedMotionQuery.addEventListener) {
    reducedMotionQuery.addEventListener('change', function (e) {
      PF.state.reducedMotion = e.matches;
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    renderHeroLinks();
    renderAbout();
    renderTechnologies();
    renderSocials3D();
    renderAsciiDeco();
    setupEmbeddedGames();
    setupScramble();
    typeHeroName();
    if (PF.backgrounds && PF.backgrounds.initInfiniteText) PF.backgrounds.initInfiniteText();
    if (PF.posters && PF.posters.renderAllStatic) PF.posters.renderAllStatic();
    if (PF.effects && PF.effects.glitchObserve) {
      PF.effects.glitchObserve(document.querySelectorAll('.section-heading, .poster-title'));
    }
    setupObserver();
    setupHamburger();
    setupContactForm();
    dismissLoadingScreen();
  }

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = String(str == null ? '' : str);
    return div.innerHTML;
  }

  // ---------------------------------------------------------------------
  // Rendering (D2: PF.data is the single source of truth)
  // ---------------------------------------------------------------------

  function renderHeroLinks() {
    var container = document.querySelector('[data-render="hero-links"]');
    if (!container || !PF.data) return;
    var c = PF.data.contact;
    var gh = PF.icons ? PF.icons.github : '';
    var li = PF.icons ? PF.icons.linkedin : '';
    container.innerHTML =
      '<a class="hero-link mono" href="' + escapeHtml(c.github) + '" target="_blank" rel="noopener noreferrer" aria-label="Perfil de GitHub de Erick">' +
      '<span class="hl-icon" aria-hidden="true">' + gh + '</span><span>GitHub</span></a>' +
      '<a class="hero-link mono" href="' + escapeHtml(c.linkedin) + '" target="_blank" rel="noopener noreferrer" aria-label="Perfil de LinkedIn de Erick">' +
      '<span class="hl-icon" aria-hidden="true">' + li + '</span><span>LinkedIn</span></a>';
    // location pin icon
    var loc = document.querySelector('.location-badge .loc-icon');
    if (loc && PF.icons) loc.innerHTML = PF.icons.pin;
    // CV button document icon (checkpoint 4)
    var cvIcon = document.querySelector('.cv-button .cv-icon');
    if (cvIcon && PF.icons && PF.icons.doc) cvIcon.innerHTML = PF.icons.doc;
  }

  function renderAbout() {
    var container = document.querySelector('[data-render="about"]');
    if (!container || !PF.data) return;
    var a = PF.data.about;
    var paras = a.paragraphs.map(function (p) {
      return '<p>' + escapeHtml(p) + '</p>';
    }).join('');
    var chips = a.interests.map(function (t) {
      return '<span class="tag-chip">' + escapeHtml(t) + '</span>';
    }).join('');
    container.innerHTML =
      '<div class="about-card reveal-up">' +
      '<p class="about-lead mono">' + escapeHtml(a.headline) + '</p>' +
      paras +
      '<div class="tag-row about-interests"><span class="about-interests-label mono">intereses:</span>' + chips + '</div>' +
      '</div>';
  }

  // Honeycomb of hexagons (checkpoint 4 Tanda B): dark hex + dim brand logo;
  // hover/focus paints the cell with the brand color and lights the icon, then
  // fades back slowly. One hex softly pulses to invite the first hover; after
  // any hover it stops PERMANENTLY for the session.
  function renderTechnologies() {
    var container = document.querySelector('[data-render="technologies"]');
    if (!container || !PF.data) return;
    var techs = PF.data.technologies;
    var perRow = 3;
    var html = '';
    for (var r = 0; r < techs.length; r += perRow) {
      html += '<div class="hexrow">';
      for (var i = r; i < Math.min(r + perRow, techs.length); i++) {
        var t = techs[i];
        // Checkpoint 5: `--hexfill` is a distinct background shade (falls back
        // to the brand color) so icons whose hue matches their brand (Angular,
        // Lean, React, JS) stay visible when the cell is painted.
        var fill = t.fill || t.color;
        html +=
          '<button type="button" class="hex" style="--brand:' + escapeHtml(t.color) + ';--hexfill:' + escapeHtml(fill) + '" aria-label="' + escapeHtml(t.name) + '">' +
          '<span class="hex-inner">' +
          '<img class="hex-icon" src="' + escapeHtml(t.icon) + '" alt="" width="42" height="42" loading="lazy" decoding="async" />' +
          '<span class="hex-name mono">' + escapeHtml(t.name) + '</span>' +
          '</span></button>';
      }
      html += '</div>';
    }
    container.innerHTML = html;
    setupHexInvite(container);
    setupHexTap(container);
  }

  // Touch devices have no hover: tapping a hex paints it (fast) then fades back
  // (slow, via the base .hex transition) — "pinta con fade, sin hover".
  function setupHexTap(container) {
    container.addEventListener('click', function (e) {
      var hex = e.target && e.target.closest ? e.target.closest('.hex') : null;
      if (!hex) return;
      hex.classList.add('is-lit');
      if (hex._litTimer) clearTimeout(hex._litTimer);
      hex._litTimer = setTimeout(function () { hex.classList.remove('is-lit'); }, 1600);
    });
  }

  function setupHexInvite(container) {
    var invited = false;
    try { invited = window.sessionStorage.getItem('pf-hex-hovered') === '1'; } catch (e) { invited = false; }
    var firstHex = container.querySelector('.hex');
    if (!invited && !PF.state.reducedMotion && firstHex) firstHex.classList.add('hex-invite');

    function clearInvite() {
      if (firstHex) firstHex.classList.remove('hex-invite');
      try { window.sessionStorage.setItem('pf-hex-hovered', '1'); } catch (e) { /* no-op */ }
      container.removeEventListener('pointerenter', clearInvite, true);
      container.removeEventListener('focusin', clearInvite);
    }
    container.addEventListener('pointerenter', clearInvite, true);
    container.addEventListener('focusin', clearInvite);
  }

  // Contact PENTAGON (checkpoint 4 Tanda B): five 3D-hover nodes
  // (GitHub · LinkedIn · Gmail · WhatsApp · YouTube). Layout is pure CSS.
  function renderSocials3D() {
    var container = document.querySelector('[data-render="socials-3d"]');
    if (!container || !PF.data || !PF.data.socials3d) return;
    container.innerHTML = PF.data.socials3d.map(function (s) {
      var isMail = s.url.indexOf('mailto:') === 0;
      var targetAttrs = isMail ? '' : ' target="_blank" rel="noopener noreferrer"';
      return (
        '<li class="s3d-item" style="--brand:' + escapeHtml(s.color) + '">' +
        '<a class="s3d-link" href="' + escapeHtml(s.url) + '"' + targetAttrs + ' aria-label="' + escapeHtml(s.ariaLabel) + '">' +
        '<span class="s3d-layer" aria-hidden="true"></span>' +
        '<span class="s3d-layer" aria-hidden="true"></span>' +
        '<span class="s3d-layer" aria-hidden="true"></span>' +
        '<span class="s3d-face" aria-hidden="true">' + s.svg + '</span>' +
        '</a></li>'
      );
    }).join('');
  }

  // Embedded IN-PLACE games (checkpoint 4 Tanda B): TicTacToe (Logros, always
  // on), Blocks 3D (Proyectos, hover→Jugar) and Diana (Formación, hover→Jugar).
  function setupEmbeddedGames() {
    // Tres en Raya — always interactive, floating on the Logros section.
    var tttHost = document.getElementById('ticTacToe');
    if (tttHost && PF.games && PF.games.tictactoe) PF.games.tictactoe.mount(tttHost);

    // Blocks 3D — needs the locally-vendored three.js; skip gracefully if absent.
    var blocksHost = document.getElementById('blocksEmbed');
    if (blocksHost && PF.embed && PF.games && PF.games.blocks3d && window.THREE) {
      PF.embed.attach({
        host: blocksHost,
        section: document.getElementById('section4'),
        game: PF.games.blocks3d,
        name: 'Blocks — torre 3D'
      });
    } else if (blocksHost) {
      blocksHost.classList.add('pf-embed-unavailable');
    }

    // Typer — mecanografía por lenguaje, embebida IN-PLACE en la Formación.
    // Se monta directo (como TicTacToe): su propia pantalla de selección de
    // lenguaje hace de estado "idle", sin CTA de PF.embed.
    var typerHost = document.getElementById('typerEmbed');
    if (typerHost && PF.games && PF.games.typing && PF.games.typing.init) {
      // init() already renders the language picker (the "idle" state), so no
      // separate start() call is needed for the always-on embedded instance.
      PF.games.typing.init(typerHost, PF.state);
    }

    // Mobile-only "Jugar" buttons: open the game in the shared modal (T6).
    setupMobilePlayButtons();
  }

  // On phones the inline previews read poorly, so each game section hides its
  // embed and shows a bottom "Jugar" button that opens the shared modal.
  function setupMobilePlayButtons() {
    if (!(PF.games && PF.games.open)) return;
    document.querySelectorAll('.pf-mobile-play[data-modal-game]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-modal-game');
        if (id) PF.games.open(id, btn);
      });
    });
  }

  // Scramble-text hover effect (checkpoint 4 Tanda B) on the Formación title:
  // random terminal glyphs resolve into the real text.
  function setupScramble() {
    var GLYPHS = '$%^&*<>/\\{}[]#@!?01';
    document.querySelectorAll('.scramble[data-scramble]').forEach(function (el) {
      var target = el.getAttribute('data-scramble');
      var timer = null;
      function run() {
        if (PF.state.reducedMotion) return;
        if (timer) clearInterval(timer);
        var frame = 0;
        var steps = target.length + 8;
        timer = setInterval(function () {
          var out = '';
          for (var i = 0; i < target.length; i++) {
            if (i < frame - 2) out += target[i];
            else if (target[i] === ' ') out += ' ';
            else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
          }
          el.textContent = out;
          frame++;
          if (frame > steps) { clearInterval(timer); timer = null; el.textContent = target; }
        }, 40);
      }
      el.addEventListener('mouseenter', run);
      el.addEventListener('focus', run, true);
      var link = el.closest('a');
      if (link) link.addEventListener('focus', run);
    });
  }

  function renderAsciiDeco() {
    var container = document.getElementById('asciiDecoHero');
    if (!container || !PF.data) return;
    var pre = document.createElement('pre');
    pre.textContent = PF.data.asciiArt;
    container.appendChild(pre);
  }

  // ---------------------------------------------------------------------
  // Hero typing effect
  // ---------------------------------------------------------------------

  function typeHeroName() {
    var el = document.getElementById('heroName');
    if (!el) return;
    var text = (PF.data && PF.data.contact && PF.data.contact.name) || 'Erick Luis Flores Paz';

    if (PF.state.reducedMotion) {
      el.textContent = text;
      return;
    }

    var i = 0;
    el.textContent = '';
    (function step() {
      if (i <= text.length) {
        el.textContent = text.slice(0, i);
        i++;
        setTimeout(step, 70);
      }
    })();
  }

  // ---------------------------------------------------------------------
  // Loading screen
  // ---------------------------------------------------------------------

  function dismissLoadingScreen() {
    var screen = document.getElementById('loading-screen');
    var linesEl = document.getElementById('loadingLines');
    if (!screen) return;

    function finish() {
      screen.classList.add('hidden');
      screen.setAttribute('aria-hidden', 'true');
      setTimeout(function () {
        if (screen.parentNode) screen.parentNode.removeChild(screen);
      }, 650);
    }

    if (PF.state.reducedMotion) {
      finish();
      return;
    }

    var bootLines = ['$ booting portfolio...', '$ loading modules... OK', '$ listo.'];
    var i = 0;

    function printNext() {
      if (i >= bootLines.length) {
        setTimeout(finish, 300);
        return;
      }
      var line = document.createElement('div');
      line.className = 'line';
      line.textContent = bootLines[i];
      if (linesEl) linesEl.appendChild(line);
      i++;
      setTimeout(printNext, 260);
    }

    if (document.readyState === 'complete') {
      printNext();
    } else {
      window.addEventListener('load', printNext, { once: true });
    }
  }

  // ---------------------------------------------------------------------
  // Shared IntersectionObserver (drives active-section state)
  // ---------------------------------------------------------------------

  function setupObserver() {
    var sections = Array.prototype.slice.call(document.querySelectorAll('.section'));
    var sectionNumberEl = document.getElementById('sectionNumber');
    var scrollDownEl = document.getElementById('scrollDown');
    var progressFill = document.getElementById('progressFill');
    var seenInView = new WeakSet();
    var lastSectionId = sections.length ? sections[sections.length - 1].id : null;
    var debounceTimer = null;
    var confettiFired = false;

    function activateSection(target) {
      var idx = Number(target.dataset.index);
      var num = String(idx + 1).padStart(2, '0');

      PF.state.activeSection = target.id;
      document.body.setAttribute('data-section', target.id);
      if (sectionNumberEl) sectionNumberEl.textContent = num;

      if (progressFill && sections.length > 1) {
        var pct = (idx / (sections.length - 1)) * 100;
        progressFill.style.height = pct + '%';
      }

      if (scrollDownEl) {
        scrollDownEl.classList.toggle('hide', target.id === lastSectionId);
      }

      // Single active-section canvas loop (design.md).
      var isHome = target.id === 'section1';
      var isPoster = target.classList.contains('section--poster');
      var isContact = target.classList.contains('section--contact');

      if (isHome) {
        if (PF.particles && PF.particles.start) PF.particles.start(document.getElementById('particlesCanvas'));
      } else if (PF.particles && PF.particles.stop) {
        PF.particles.stop();
      }

      // Poster sections animate only their own canvas while active. The Blocks
      // (Proyectos) and Diana (Formación) embeds run their own rAF ONLY while
      // being played (idle = a single static frame), so no extra loop here.
      if (isPoster) {
        if (PF.posters && PF.posters.activate) PF.posters.activate(target.id);
      } else if (PF.posters && PF.posters.stopAll) {
        PF.posters.stopAll();
      }

      if (isContact) {
        if (PF.backgrounds && PF.backgrounds.greenLightsStart) {
          PF.backgrounds.greenLightsStart(target.querySelector('[data-bg="green-lights"]'));
        }
        if (!confettiFired) {
          confettiFired = true;
          if (PF.effects && PF.effects.confettiBurst) PF.effects.confettiBurst();
        }
      } else if (PF.backgrounds && PF.backgrounds.greenLightsStop) {
        PF.backgrounds.greenLightsStop();
      }

      // Batch 3.11: gate the continuously-animating infinite-text bg (CSS
      // drift) to the active section only — pause it everywhere else.
      document.querySelectorAll('.bg-infinite-text .it-flow').forEach(function (flow) {
        var owner = flow.closest('.section');
        flow.style.animationPlayState = owner && owner.id === target.id ? 'running' : 'paused';
      });

      // Arm-once entry animations scoped to this section.
      var revealEls = target.querySelectorAll('.reveal-up, .reveal-left, .reveal-right, .reveal-scale');
      revealEls.forEach(function (el) {
        if (!seenInView.has(el)) {
          el.classList.add('in-view');
          seenInView.add(el);
        }
      });
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.intersectionRatio >= 0.5) {
            if (debounceTimer) clearTimeout(debounceTimer);
            var target = entry.target;
            debounceTimer = setTimeout(function () {
              activateSection(target);
            }, 120); // iOS double-fire debounce
          }
        });
      },
      { threshold: 0.5, rootMargin: '-1px' }
    );

    sections.forEach(function (s) {
      observer.observe(s);
    });
  }

  // ---------------------------------------------------------------------
  // Hamburger overlay menu
  // ---------------------------------------------------------------------

  function setupHamburger() {
    var btn = document.getElementById('hamburgerBtn');
    var overlay = document.getElementById('menuOverlay');
    var closeBtn = document.getElementById('menuCloseBtn');
    if (!btn || !overlay) return;

    var lastFocused = null;

    function onKeydown(e) {
      if (e.key === 'Escape') closeMenu();
    }

    function openMenu() {
      lastFocused = document.activeElement;
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
      btn.setAttribute('aria-expanded', 'true');
      btn.classList.add('open');
      var firstFocusable = overlay.querySelector('a, button');
      if (firstFocusable) firstFocusable.focus();
      document.addEventListener('keydown', onKeydown);
    }

    function closeMenu() {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
      btn.setAttribute('aria-expanded', 'false');
      btn.classList.remove('open');
      document.removeEventListener('keydown', onKeydown);
      if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
      } else {
        btn.focus();
      }
    }

    btn.addEventListener('click', function () {
      if (overlay.classList.contains('open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', closeMenu);
    }

    overlay.querySelectorAll('a[data-target]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        closeMenu();
        var target = document.getElementById(link.dataset.target);
        if (target) {
          target.scrollIntoView({ behavior: PF.state.reducedMotion ? 'auto' : 'smooth' });
        }
      });
    });
  }

  // ---------------------------------------------------------------------
  // Contact form — mailto submission (no backend/CMS, no network POST)
  // ---------------------------------------------------------------------

  function setupContactForm() {
    var form = document.getElementById('contactForm');
    if (!form || !PF.data) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements.name ? form.elements.name.value.trim() : '';
      var email = form.elements.email ? form.elements.email.value.trim() : '';
      var message = form.elements.message ? form.elements.message.value.trim() : '';

      var subject = encodeURIComponent('Contacto desde portfolio — ' + (name || 'Visitante'));
      var body = encodeURIComponent(message + '\n\n—\nDe: ' + name + ' <' + email + '>');

      window.location.href = 'mailto:' + PF.data.contact.email + '?subject=' + subject + '&body=' + body;

      // Batch 3 hook: PF.effects.confettiBurst() fires here once implemented.
      if (PF.effects && PF.effects.confettiBurst) {
        PF.effects.confettiBurst();
      }
    });
  }
})();
