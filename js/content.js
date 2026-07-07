/**
 * content.js — single source of truth for all real portfolio data.
 * D2 (design.md): PF.data is frozen; main.js + subpage.js render from it.
 * Load order (D1): content.js -> particles.js -> posters.js -> backgrounds.js
 *   -> effects.js -> konami.js -> games/* -> main.js  (subpages load subpage.js)
 *
 * Batch 2: restructured to 7 sections (HOME, SOBRE MÍ, TECNOLOGÍAS, EXPERIENCIA,
 * PROYECTOS, FORMACIÓN, CONTACTO); inline-SVG brand icons (no emojis, no CDN);
 * canvas-poster sections + subpage data (logros/proyectos/formacion).
 */
window.PF = window.PF || {};

(function () {
  'use strict';

  // -----------------------------------------------------------------------
  // Inline brand-icon SVGs (24x24, fill=currentColor). NO CDN, NO emojis.
  // -----------------------------------------------------------------------
  var svg = {
    email:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 4h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 2v.4l9 5.6 9-5.6V6H3Zm18 2.75-7.94 4.94a2 2 0 0 1-2.12 0L3 8.75V18h18V8.75Z"/></svg>',
    youtube:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.24 3.6L9.6 15.6Z"/></svg>',
    // Gmail brand mark (Simple Icons path, public domain).
    gmail:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/></svg>',
    // WhatsApp brand mark (Simple Icons path, public domain).
    whatsapp:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.893c0 2.096.549 4.142 1.595 5.945L0 24l6.335-1.652a12.062 12.062 0 005.71 1.447h.006c6.585 0 11.946-5.335 11.949-11.896 0-3.176-1.24-6.165-3.495-8.411z"/></svg>',
    github:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .5C5.73.5.79 5.44.79 11.72c0 4.96 3.22 9.16 7.68 10.64.56.1.77-.24.77-.54 0-.27-.01-1.16-.02-2.1-3.13.68-3.79-1.34-3.79-1.34-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.68.08-.68 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.63 1.22 3.27.94.1-.73.39-1.22.71-1.5-2.5-.28-5.13-1.25-5.13-5.57 0-1.23.44-2.24 1.16-3.03-.12-.28-.5-1.42.11-2.96 0 0 .95-.3 3.1 1.16.9-.25 1.86-.37 2.82-.38.96 0 1.92.13 2.82.38 2.15-1.46 3.1-1.16 3.1-1.16.61 1.54.23 2.68.11 2.96.72.79 1.16 1.8 1.16 3.03 0 4.33-2.64 5.28-5.15 5.56.4.35.76 1.03.76 2.08 0 1.5-.01 2.71-.01 3.08 0 .3.2.65.78.54 4.46-1.49 7.67-5.69 7.67-10.64C23.21 5.44 18.27.5 12 .5Z"/></svg>',
    linkedin:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.66H9.35V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z"/></svg>',
    pin:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 4.9 7 13 7 13s7-8.1 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"/></svg>',
    doc:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm7 1.5V7h3.5L13 3.5ZM8 12h8v1.6H8V12Zm0 3.4h8V17H8v-1.6ZM8 8.6h4v1.6H8V8.6Z"/></svg>',
    gamepad:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 6h10a5 5 0 0 1 5 5v.8a4.2 4.2 0 0 1-7.7 2.36l-.3-.46a1.2 1.2 0 0 0-1-.54H10.9a1.2 1.2 0 0 0-1 .54l-.3.46A4.2 4.2 0 0 1 2 11.8V11a5 5 0 0 1 5-5Zm-.5 3a.9.9 0 0 0-.9.9v.6h-.6a.9.9 0 0 0 0 1.8h.6v.6a.9.9 0 0 0 1.8 0v-.6h.6a.9.9 0 0 0 0-1.8h-.6v-.6a.9.9 0 0 0-.9-.9Zm9.25.25a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm2 2.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"/></svg>',
    speakerOn:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3Zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12Zm-2.5-9v2.06a7 7 0 0 1 0 13.88V21a9 9 0 0 0 0-18Z"/></svg>',
    speakerOff:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3Zm18.29-.71-1.42-1.42L17.66 9.1 15.44 6.88l-1.41 1.41L16.24 10.5l-2.21 2.22 1.41 1.41 2.22-2.21 2.21 2.21 1.42-1.41-2.22-2.22 2.22-2.21Z"/></svg>'
  };

  var contact = {
    name: 'Erick Luis Flores Paz',
    email: 'erickflorespaz2006@gmail.com',
    phone: '+591 63710729',
    location: 'Cochabamba, Bolivia',
    github: 'https://github.com/ErickFP7314',
    linkedin: 'https://www.linkedin.com/in/erick-luis-flores-paz-095120322/',
    profileImg: { src: 'assets/img/perfil.png', alt: 'Retrato de Erick Luis Flores Paz', w: 720, h: 1280 }
  };

  // Socials — inline SVG brand icons + per-brand color.
  // Checkpoint 4 (Tanda B): Facebook/Instagram/TikTok removed definitively.
  // All contact links now live in ONE 3D-hover PENTAGON block (five nodes):
  // GitHub · LinkedIn · Gmail · WhatsApp · YouTube. There is no longer a
  // separate "professional links" list in the form column.
  var socGithub = { name: 'GitHub', url: 'https://github.com/ErickFP7314', ariaLabel: 'Perfil de GitHub de Erick', color: '#ffffff', svg: svg.github };
  var socLinkedin = { name: 'LinkedIn', url: 'https://www.linkedin.com/in/erick-luis-flores-paz-095120322/', ariaLabel: 'Perfil de LinkedIn de Erick', color: '#0a66c2', svg: svg.linkedin };
  var socGmail = { name: 'Gmail', url: 'mailto:erickflorespaz2006@gmail.com', ariaLabel: 'Enviar un correo a Erick por Gmail', color: '#ea4335', svg: svg.gmail };
  var socWhatsapp = { name: 'WhatsApp', url: 'https://wa.me/59163710729', ariaLabel: 'Escribir a Erick por WhatsApp', color: '#25d366', svg: svg.whatsapp };
  var socYoutube = { name: 'YouTube', url: 'https://www.youtube.com/@ProEFP', ariaLabel: 'Canal de YouTube, arroba Pro E F P', color: '#ff0000', svg: svg.youtube };

  // Pentagon order (clockwise from top): GitHub · LinkedIn · Gmail · WhatsApp · YouTube.
  var socials3d = [socGithub, socLinkedin, socGmail, socWhatsapp, socYoutube];
  var socials = socials3d;
  var socialsPro = []; // retired — form column no longer renders a separate list

  // 02 SOBRE MÍ
  var about = {
    headline: 'Programador y estudiante de Ingeniería de Software',
    paragraphs: [
      'Comencé en la programación a través de las olimpiadas de informática, resolviendo problemas algorítmicos en C++.',
      'Hoy soy estudiante de Ingeniería de Software en Jala University, donde me enfoco en construir soluciones que resuelvan problemas sociales, ambientales y de mi comunidad.'
    ],
    interests: ['Algoritmos', 'Computación cuántica', 'Agentes de IA generativa']
  };

  // 02 TECNOLOGÍAS — honeycomb of hexagons (checkpoint 4 Tanda B). Real brand
  // logos vendored locally from Devicon (assets/icons/tech/*.svg); Lean 4 is a
  // hand-authored local mark. `color` is the brand accent (border/glow/invite).
  // Checkpoint 5: `fill` (optional) is a DISTINCT hex background shade for techs
  // whose icon melts into their own brand color when painted (Angular red on
  // red, Lean/React/JS on same-hue). When `fill` is absent the hex paints with
  // `color` as before. A dark drop-shadow on the hovered icon (CSS) adds edge
  // separation universally so no logo disappears against its cell.
  var technologies = [
    { name: 'C++', color: '#00599c', icon: 'assets/icons/tech/cplusplus.svg' },
    { name: 'Java', color: '#5382a1', icon: 'assets/icons/tech/java.svg' },
    { name: 'Python', color: '#3776ab', icon: 'assets/icons/tech/python.svg' },
    { name: 'HTML', color: '#e34f26', icon: 'assets/icons/tech/html5.svg' },
    { name: 'CSS', color: '#1572b6', icon: 'assets/icons/tech/css3.svg' },
    { name: 'JavaScript', color: '#f7df1e', fill: '#6b5600', icon: 'assets/icons/tech/javascript.svg' },
    { name: 'Angular', color: '#dd0031', fill: '#4a0d18', icon: 'assets/icons/tech/angular.svg' },
    { name: 'React', color: '#61dafb', fill: '#0d3a47', icon: 'assets/icons/tech/react.svg' },
    { name: 'Lean 4', color: '#4f9cff', fill: '#12294d', icon: 'assets/icons/tech/lean.svg' }
  ];

  // 04 PROYECTOS (rendered in proyectos.html subpage; poster on main page).
  var projects = [
    {
      id: 'tictactoe',
      title: 'Tic-Tac-Toe — C++',
      lang: 'C++',
      date: '19 de mayo de 2020',
      dateISO: '2020-05-19',
      description: 'Tres en raya para dos jugadores en C++ por consola, con control de turnos y detección automática de victoria.',
      note: 'Uno de mis primeros programas: control de turnos, validación de jugadas y detección de ganador desde cero.',
      tags: ['C++', 'Consola'],
      link: 'https://www.youtube.com/watch?v=MCLyISnPqb8&list=PLjCoEQ2yrJn760U6ZvYFChjpnsx1LOcxu&pp=sAgC',
      linkLabel: 'Ver en YouTube',
      linkType: 'youtube',
      images: [
        { src: 'assets/img/tictactoe-consola.png', alt: 'Tic-Tac-Toe ejecutándose en consola', w: 359, h: 347 },
        { src: 'assets/img/tictactoe-tablero.png', alt: 'Tablero del Tic-Tac-Toe', w: 325, h: 295 }
      ]
    },
    {
      id: 'tetris',
      title: 'Tetris — C++ / Allegro',
      lang: 'C++',
      date: '3 de agosto de 2020',
      dateISO: '2020-08-03',
      description: 'Clásico Tetris implementado en C++ con la librería gráfica Allegro: piezas, colisiones, líneas y puntaje en tiempo real.',
      note: 'Erick diseñó a mano TODOS los sprites, el diseño de cada pieza y el arte de la portada del juego.',
      tags: ['C++', 'Allegro', 'Juegos'],
      link: 'https://www.youtube.com/watch?v=c-vrkRO-J8M&list=PLjCoEQ2yrJn4Asiv4m9kc2Erj4U3EgGpD&pp=sAgC',
      linkLabel: 'Ver en YouTube',
      linkType: 'youtube',
      images: [
        { src: 'assets/img/tetris-portada.png', alt: 'Portada del Tetris diseñada por Erick', w: 999, h: 567 },
        { src: 'assets/img/tetris-gameplay.png', alt: 'Gameplay del Tetris con sprites propios', w: 464, h: 511 }
      ]
    },
    {
      id: 'ticket-validation',
      title: 'Verificador de Billetes — Bolivia',
      lang: 'Flutter',
      date: '2025',
      dateISO: '2025-01-01',
      description: 'App móvil con Flutter y Google ML Kit para verificar la autenticidad de billetes bolivianos (Series A y B) mediante OCR en tiempo real.',
      note: 'Escaneo en vivo con la cámara y análisis OCR para distinguir billetes auténticos de falsificaciones.',
      tags: ['Flutter', 'Dart', 'ML Kit'],
      link: 'https://github.com/ErickFP7314/ticket-validation',
      linkLabel: 'Ver en GitHub',
      linkType: 'github',
      images: [
        { src: 'assets/img/billetes-escaneo.png', alt: 'Pantalla de escaneo de billetes', w: 1168, h: 879 },
        { src: 'assets/img/billetes-resultados.png', alt: 'Resultados del análisis de billetes', w: 1125, h: 670 }
      ]
    },
    {
      id: 'eco-alerta',
      title: 'EcoAlerta Bolivia',
      lang: 'Web + IA',
      date: '2026',
      dateISO: '2026-01-01',
      description: 'Plataforma web que combina datos satelitales de la NASA (FIRMS) con Google Gemini 2.0 para evaluar el riesgo de incendios forestales.',
      note: 'Construido para la hackatón de GDG La Paz: monitoreo de focos de calor casi en tiempo real con análisis de riesgo por IA.',
      tags: ['NASA FIRMS', 'Gemini AI', 'Web'],
      link: 'https://github.com/ErickFP7314/eco-alerta',
      linkLabel: 'Ver en GitHub',
      linkType: 'github',
      // Checkpoint 3: EcoAlerta muestra un video de respaldo (con poster) en
      // lugar de la captura estática.
      video: {
        src: 'assets/video/ecoalerta-respaldo.mp4',
        poster: 'assets/img/ecoalerta-dashboard.png',
        w: 1754, h: 946,
        label: 'Video de respaldo de EcoAlerta Bolivia mostrando el dashboard de focos de calor'
      }
    },
    // Checkpoint 4: aproximation_NGP + harnes-erickfp migraron desde la antigua
    // sección EXPERIENCIA (ahora LOGROS) a PROYECTOS, con sus visuales/juegos.
    {
      id: 'aproximation_ngp',
      title: 'aproximation_NGP',
      lang: 'Open Source',
      date: '2025',
      dateISO: '2025-03-01',
      description: 'Fork astrofísico enfocado en el catálogo Gaia DR3, con mejoras de precisión y una batería de tests exhaustiva.',
      stats: ['53.082 estrellas catalogadas (Gaia DR3)', '179 tests automatizados'],
      link: 'https://github.com/ErickFP7314/aproximation_NGP',
      linkLabel: 'Ver repositorio en GitHub',
      visual: 'stats' // no screenshot exists → generated CSS/SVG stats visual
    },
    {
      id: 'harnes-erickfp',
      title: 'harnes-erickfp',
      lang: 'Dev Tool',
      date: '2025',
      dateISO: '2025-08-01',
      description: 'CLI harness para agentes de IA con puerta de aprobación humana obligatoria, pensado para flujos de desarrollo asistido seguros.',
      stats: ['Puerta de aprobación humana obligatoria', '126 tests · 95% de cobertura', 'Orquestación de agentes de IA vía CLI'],
      link: 'https://github.com/ErickFP7314/harnes-erickfp',
      linkLabel: 'Ver repositorio en GitHub',
      // Checkpoint 3: portada visual = export ASCII coloreado (iframe escalado,
      // actúa como imagen). Natural 1490x500 (149 cols x 10px, 25 filas x 20px).
      visual: 'iframe',
      iframe: { src: 'assets/harnes-portada.html', title: 'Portada Harnes ErickFP', natW: 1490, natH: 500 }
    }
  ];

  // 05 FORMACIÓN (rendered in formacion.html; poster on main page).
  // Checkpoint 4: solo certificados de FORMACIÓN (cursos/talleres/campamentos).
  // La medalla de oro y los premios migraron a LOGROS.
  var formacion = [
    {
      id: 'curso-multimedia-educacion-uatf',
      title: 'Diseño de Contenido Multimedia para la Educación Virtual',
      issuer: 'UATF · Dirección de Postgrado',
      date: '7 – 21 sep 2020',
      dateISO: '2020-09-07',
      hours: '100 horas académicas',
      description: 'Curso de edición de imagen y video para educación virtual: Canva, Photoshop, PowerPoint, Camtasia, Filmora y OBS Studio.',
      image: { src: 'assets/img/certs/curso-multimedia-educacion-uatf-2020.png', alt: 'Certificado del curso Diseño de Contenido Multimedia para la Educación Virtual (UATF Postgrado, 2020)', w: 850, h: 601 }
    },
    {
      id: 'curso-programacion-basica-uatf',
      title: 'Curso de Programación Básica',
      issuer: 'UATF · Facultad de Ciencias Puras',
      date: '16 may – 3 jun 2022',
      dateISO: '2022-05-16',
      hours: '18 horas académicas',
      description: 'Curso introductorio de programación organizado por la carrera de Ingeniería Informática de la UATF.',
      image: { src: 'assets/img/certs/curso-programacion-basica-uatf-2022.png', alt: 'Certificado del curso de Programación Básica (UATF Ciencias Puras, 2022)', w: 850, h: 601 }
    },
    {
      id: 'curso-python-uatf',
      title: 'Curso de Programación en Python',
      issuer: 'UATF · Facultad de Ciencias Puras',
      date: '4 – 18 may 2023',
      dateISO: '2023-05-04',
      hours: '12 horas académicas',
      description: 'Curso de programación en Python organizado por la carrera de Ingeniería Informática de la UATF.',
      image: { src: 'assets/img/certs/curso-python-uatf-2023.png', alt: 'Certificado del curso de Programación en Python (UATF Ciencias Puras, 2023)', w: 850, h: 601 }
    },
    {
      id: 'taller-competitiva',
      title: 'Taller de Programación Competitiva — Módulo Especialista ICPC-UMSS',
      issuer: 'ICPC · UMSS',
      date: '14 jun – 19 jul 2025',
      dateISO: '2025-06-14',
      hours: '24 horas',
      description: 'Módulo especialista de programación competitiva enfocado en técnicas avanzadas de resolución de problemas.',
      image: { src: 'assets/img/cert-taller-competitiva-2025.png', alt: 'Certificado del Taller de Programación Competitiva ICPC-UMSS 2025', w: 800, h: 1083 }
    },
    {
      id: 'campamento-icpc',
      title: 'Campamento de Entrenamiento Internacional ICPC-UMSS 2025',
      issuer: 'ICPC · UMSS',
      date: '21 – 25 jul 2025',
      dateISO: '2025-07-21',
      hours: '40 horas',
      description: 'Campamento internacional de entrenamiento intensivo ICPC con enfoque en algoritmos y estructuras de datos avanzadas.',
      image: { src: 'assets/img/cert-icpc-campamento-2025.png', alt: 'Certificado del Campamento Internacional ICPC-UMSS 2025', w: 800, h: 1025 }
    },
    {
      id: 'curso-intro-ia-platzi',
      title: 'Introducción a la Inteligencia Artificial',
      issuer: 'Platzi',
      date: '25 mar 2026',
      dateISO: '2026-03-25',
      hours: '4 horas',
      description: 'Curso en línea de Platzi sobre fundamentos teóricos y prácticos de la Inteligencia Artificial.',
      image: { src: 'assets/img/certs/curso-intro-ia-platzi-2026.png', alt: 'Certificado del curso Introducción a la Inteligencia Artificial (Platzi, 2026)', w: 850, h: 601 }
    },
    {
      id: 'claude-code',
      title: 'Claude Code in Action',
      issuer: 'Anthropic Academy',
      date: '13 jun 2026',
      dateISO: '2026-06-13',
      description: 'Curso de la Anthropic Academy sobre desarrollo asistido por agentes con Claude Code.',
      image: { src: 'assets/img/cert-claude-code-anthropic.png', alt: 'Certificado Claude Code in Action de Anthropic Academy', w: 1280, h: 684 }
    }
  ];

  // 03 LOGROS (rendered in logros.html; poster on main page).
  // Checkpoint 4: premios y reconocimientos. La medalla de oro es la pieza
  // destacada (dorada); el resto son certificados clasificados como "premio".
  var logros = [
    {
      id: 'medalla-oro-obi',
      title: 'Medalla de Oro — Olimpiada Boliviana de Informática 2020',
      issuer: 'Olimpiada Científica Estudiantil Plurinacional Boliviana (nacional)',
      date: '2020',
      dateISO: '2020-11-01',
      kindLabel: 'MEDALLA DE ORO',
      gold: true,
      description: 'Medalla de Oro a nivel nacional en el área de Informática de la Olimpiada Boliviana, resolviendo problemas algorítmicos en C++.',
      image: { src: 'assets/img/medallero-2020.png', alt: 'Medallero de la Olimpiada Boliviana de Informática 2020 con la delegación premiada', w: 1600, h: 1335 },
      link: 'https://www.facebook.com/photo/?fbid=4043497392397422',
      linkLabel: 'Ver publicación',
      linkIcon: 'facebook'
    },
    {
      id: 'medalla-plata-nacional-informatica-2020',
      title: 'Medalla de Plata — Informática (Nivel 2)',
      issuer: 'UMSA · Olimpiada Científica Boliviana',
      date: 'mar 2021',
      dateISO: '2021-03-31',
      kindLabel: 'PREMIO',
      description: 'Medalla de Plata a nivel nacional en el área de Informática, Categoría Nivel 2, de la Olimpiada Científica Boliviana 2020.',
      image: { src: 'assets/img/certs/medalla-plata-nacional-informatica-2020.png', alt: 'Certificado de Medalla de Plata en Informática Nivel 2, Olimpiada Científica Boliviana 2020', w: 850, h: 601 }
    },
    {
      id: 'oro-departamental-informatica-2022',
      title: 'Oro Departamental — Informática (Nivel 3)',
      issuer: 'Dirección Departamental de Educación Potosí',
      date: 'feb 2022',
      dateISO: '2022-02-01',
      kindLabel: 'PREMIO',
      description: 'Medalla de Oro en la etapa departamental de Potosí de la 10ª Olimpiada Científica Estudiantil Plurinacional Boliviana, área de Informática Nivel 3.',
      image: { src: 'assets/img/certs/oro-departamental-informatica-2022.png', alt: 'Certificado de Oro departamental en Informática Nivel 3, Olimpiada 2022', w: 850, h: 601 }
    },
    {
      id: 'segundo-lugar-icpc-nacional-2022',
      title: 'Segundo Lugar — Concurso Nacional de Programación ICPC',
      issuer: 'UATF · Ingeniería de Sistemas · ICPC',
      date: '8 oct 2022',
      dateISO: '2022-10-08',
      kindLabel: 'PREMIO',
      description: 'Segundo lugar en el Concurso Nacional de Programación ICPC, sede carrera de Ingeniería de Sistemas de la UATF.',
      image: { src: 'assets/img/certs/segundo-lugar-icpc-nacional-2022.png', alt: 'Certificado de Segundo Lugar en el Concurso Nacional de Programación ICPC 2022', w: 850, h: 601 }
    },
    {
      id: 'primer-lugar-intercolegial-uatf-2023',
      title: 'Primer Lugar — Competencia de Programación Intercolegial (Nivel 3)',
      issuer: 'UATF · Ingeniería Informática',
      date: 'sep 2023',
      dateISO: '2023-09-01',
      kindLabel: 'PREMIO',
      description: 'Primer lugar en el Nivel 3 de la Competencia de Programación Intercolegial organizada por la carrera de Ingeniería Informática de la UATF.',
      image: { src: 'assets/img/certs/primer-lugar-intercolegial-uatf-2023.png', alt: 'Certificado de Primer Lugar en la Competencia de Programación Intercolegial UATF 2023', w: 850, h: 601 }
    },
    {
      id: 'reconocimiento-asamblea-potosi-2023',
      title: 'Reconocimiento — 1er Lugar Etapa Departamental (Informática N3)',
      issuer: 'Asamblea Legislativa Departamental de Potosí',
      date: 'nov 2023',
      dateISO: '2023-11-01',
      kindLabel: 'RECONOCIMIENTO',
      description: 'Reconocimiento del Pleno de la Asamblea Legislativa Departamental de Potosí por el Primer Lugar en la etapa departamental de la Olimpiada Científica, área de Informática Nivel 3.',
      image: { src: 'assets/img/certs/reconocimiento-asamblea-potosi-2023.png', alt: 'Reconocimiento de la Asamblea Legislativa Departamental de Potosí, 2023', w: 601, h: 850 }
    },
    {
      id: 'reconocimiento-1er-lugar-ddepotosi-2023',
      title: 'Certificado de Reconocimiento — 1er Lugar Informática N3 (12ª OCEPB)',
      issuer: 'Dirección Departamental de Educación Potosí',
      date: 'nov 2023',
      dateISO: '2023-11-15',
      kindLabel: 'RECONOCIMIENTO',
      description: 'Certificado de reconocimiento por el Primer Lugar en el área de Informática Nivel 3 de la Tercera Etapa Departamental de la 12ª Olimpiada Científica Estudiantil Plurinacional Boliviana.',
      image: { src: 'assets/img/certs/reconocimiento-1er-lugar-ddepotosi-2023.png', alt: 'Certificado de Reconocimiento por Primer Lugar en Informática Nivel 3, 12ª OCEPB 2023', w: 850, h: 601 }
    },
    {
      id: 'decreto-reconocimiento-potosi-2023',
      title: 'Decreto Departamental de Reconocimiento — Trayectoria en Olimpiadas',
      issuer: 'Gobierno Autónomo Departamental de Potosí',
      date: '4 dic 2023',
      dateISO: '2023-12-04',
      kindLabel: 'DISTINCIÓN',
      description: 'Decreto Departamental Nº 539/2023 que reconoce y felicita públicamente su trayectoria en olimpiadas de Informática: Medalla de Oro (2021) y Primer Lugar (2022 y 2023).',
      image: { src: 'assets/img/certs/decreto-reconocimiento-potosi-2023.png', alt: 'Decreto Departamental Nº 539/2023 de reconocimiento del Gobierno de Potosí', w: 601, h: 850 }
    }
    // Checkpoint 5: la hackatón GDG La Paz se retiró de LOGROS (EcoAlerta
    // conserva su mención de GDG en PROYECTOS).
  ];

  var typingSentences = [
    'El código limpio siempre parece haber sido escrito por alguien que se preocupa.',
    'Primero resuelve el problema, luego escribe el código.',
    'La simplicidad es la sofisticación suprema.',
    'Un buen programador mira ambos lados del monitor.',
    'Hecho es mejor que perfecto.'
  ];

  // Hand-authored ASCII decoration for the hero (mirrors assets/ascii-hero.html).
  var asciiArt = [
    ' ┌─[ EFP ]─┐',
    ' │01000101│',
    ' │01010000│',
    ' └────────┘'
  ].join('\n');

  PF.icons = Object.freeze(svg);

  PF.data = Object.freeze({
    contact: contact,
    socials: socials,
    socialsPro: socialsPro,
    socials3d: socials3d,
    about: about,
    technologies: technologies,
    projects: projects,
    logros: logros,
    formacion: formacion,
    typingSentences: typingSentences,
    asciiArt: asciiArt
  });
})();
