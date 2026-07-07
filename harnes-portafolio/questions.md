# Entrevista de adaptacion — questions.md

Haz estas preguntas **por bloques y en orden** (FASE 1 del SKILL). Cada pregunta tiene un ID estable,
el destino en la config/archivo, y un ejemplo. Si el usuario duda, ofrece 2-3 opciones con recomendacion.

Convencion: `config:ruta` = campo de `portfolio.config.json`; `file:...` = archivo de contenido.

---

## Bloque A — Objetivo y audiencia

| ID | Pregunta | Destino | Ejemplo |
|----|----------|---------|---------|
| Q1 | Cual es el proposito de la web? | (guia narrativa) | "Conseguir mi primer empleo como dev" |
| Q2 | A quien apunta (audiencia)? | (guia narrativa) | "Reclutadores tech y profesores" |
| Q3 | Cual es el call-to-action principal? | `file:index.html` hero + `config:meta.description` | "Descargar CV" / "Contactarme" |

## Bloque B — Identidad y tematica

| ID | Pregunta | Destino | Ejemplo |
|----|----------|---------|---------|
| Q4 | Nombre completo (aparece en el hero) | `config:meta.name` + `content.js` `contact.name` | "Ana Perez Lopez" |
| Q5 | Titulo profesional / subtitulo | `file:index.html` hero-subtitle | "Estudiante de Ingenieria de Software" |
| Q6 | Bio corta (1-3 parrafos) | `content.js` `about.paragraphs` | ver CONTENT-MAP `about` |
| Q7 | Intereses (chips de "Sobre mi") | `content.js` `about.interests` | ["Algoritmos","IA","Robotica"] |
| Q8 | Tono/tematica: se mantiene terminal/hacker u otra? | (guia + paleta) | terminal / minimal / retro / corporativa |

> Recomendacion Q8: si dudan, mantener **terminal/hacker** (es lo que la plantilla luce mejor).
> Cambiar de tematica se logra sobre todo via **paleta + tipografia** (bloques C y D); la estructura
> de slides y efectos se conserva.

## Bloque C — Paleta

Nota para el usuario: **solo eliges los colores base**; el script deriva las variantes claras
(`bright/mid/soft`) y el `glow` automaticamente. Colores en hex (`#rrggbb`).

| ID | Pregunta | Destino |
|----|----------|---------|
| Q9  | Color PRIMARIO (acento principal) | `config:theme.primary` |
| Q10 | Color SECUNDARIO (acento 2) | `config:theme.secondary` |
| Q11 | Fondo principal | `config:theme.bg.primary` |
| Q12 | Fondo de paneles / terminal | `config:theme.bg.secondary` + `theme.bg.terminal` |
| Q13 | Acento de peligro/alerta y de destacado | `config:theme.accents.danger` / `.highlight` |
| Q14 | Colores de texto (principal / secundario / tenue) | `config:theme.text.white/muted/dim` |

> Recomendacion Q9-Q11: baseline actual = primario `#00ff00`, secundario `#00ffff`, fondo `#0a0a0a`.
> Opciones alternativas: ambar `#ffb000` sobre `#0a0a0a`; azul `#4d9fff` + cian sobre `#0d1117`.

## Bloque D — Tipografia

| ID | Pregunta | Destino | Ejemplo |
|----|----------|---------|---------|
| Q15 | Fuente monoespaciada (terminal) | `config:theme.fonts.mono` | "Fira Code", "JetBrains Mono" |
| Q16 | Fuente sans (texto general) | `config:theme.fonts.sans` | "Inter", "Roboto" |

> Deben existir en Google Fonts (el sitio las carga desde ahi). Si no, avisa al usuario.

## Bloque E — Secciones

Las 6 secciones son: `home`, `about`, `logros`, `proyectos`, `formacion`, `contacto`.

| ID | Pregunta | Destino |
|----|----------|---------|
| Q17 | Cuales de las 6 secciones mantener/quitar? | `config:sections[].enabled` |
| Q18 | Renombrar el titulo de alguna seccion? Nuevo orden? | `config:sections[].title` + receta reordenar |

> Quitar/renombrar => aplicar la receta quirurgica de CONTENT-MAP (bloque HTML + menu + wiring).

## Bloque F — Contenido por seccion

Recolecta segun las secciones habilitadas. Formas EXACTAS en CONTENT-MAP.md.

| ID | Pregunta | Destino |
|----|----------|---------|
| Q19a | Proyectos: por cada uno -> titulo, lenguaje, fecha, descripcion, nota, tags, link, imagenes | `content.js` `projects[]` |
| Q19b | Logros: titulo, emisor, fecha, tipo, descripcion, imagen (marca cual es el destacado dorado) | `content.js` `logros[]` |
| Q19c | Formacion: titulo, emisor, fecha, horas, descripcion, imagen | `content.js` `formacion[]` |
| Q19d | Tecnologias (hexagonos): nombre + color de marca + icono SVG | `content.js` `technologies[]` + `assets/icons/tech/` |
| Q19e | Redes/contacto: GitHub, LinkedIn, email, WhatsApp, YouTube... (url + etiqueta) | `content.js` `socials3d[]` + `contact` |

> Las imagenes nuevas van a `assets/img/` (o `assets/img/certs/`); los iconos tech a
> `assets/icons/tech/` como SVG. `check.mjs` verifica que existan en disco.

## Bloque G — Juegos

| ID | Pregunta | Destino |
|----|----------|---------|
| Q20 | Mantener todos los juegos, algunos o ninguno? | `config:games.*` |

> Juegos: `tictactoe`, `blocks3d`, `typing` (embebidos en index secciones 03/04/05);
> `snake`, `diana`, `pong` (slides finales de las subpaginas). Quitar => receta "quitar un juego".

## Bloque H — Deploy

| ID | Pregunta | Destino | Ejemplo |
|----|----------|---------|---------|
| Q21 | Donde se publica? | `config:deploy.target` | github-pages (por defecto) / netlify / otro |
