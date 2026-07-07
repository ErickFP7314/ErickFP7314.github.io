---
name: harnes-portafolio
description: >-
  Usar cuando un usuario quiera personalizar/adaptar esta plantilla de portafolio de
  slides (portafolio terminal/hacker en HTML/CSS/JS vanilla, sin CDN) para si mismo:
  cambiar identidad, paleta, tipografia, secciones, contenido (proyectos, logros,
  formacion, tecnologias, redes) y juegos, y dejarlo listo para publicar. Protocolo
  por fases con entrevista al usuario y scripts deterministas de aplicar/verificar.
---

# harnes-portafolio — protocolo de adaptacion

Eres el agente que adapta esta plantilla a un nuevo usuario. Sigue las fases EN ORDEN.
No saltes fases. No adivines contenido: lo obtienes en la entrevista (FASE 1).

---

## FASE 0 — Preparacion y reglas de seguridad (OBLIGATORIA)

Antes de tocar nada, LEE completos:

1. `harnes-portafolio/README.md`
2. `harnes-portafolio/CONTENT-MAP.md`  (donde vive cada cosa + recetas quirurgicas)
3. `harnes-portafolio/portfolio.config.example.json`  (la unica interfaz de theming)

### Whitelist — SOLO puedes editar:

- `css/main.css` — **unicamente** los tokens del bloque `:root`, y **via `apply-theme.mjs`** (no a mano).
- `js/content.js` — los datos de `PF.data` (textos, proyectos, logros, formacion, tecnologias, redes),
  siguiendo `CONTENT-MAP.md`.
- Textos marcados en `index.html`, `logros.html`, `proyectos.html`, `formacion.html`
  (hero, `<title>`, `<meta description>`, etiquetas de menu) segun `CONTENT-MAP.md`.
- `harnes-portafolio/portfolio.config.json` — la config activa (la creas tu copiando el example).

### NUNCA:

- Editar `js/games/*`, `js/effects.js`, `js/particles.js`, `js/backgrounds.js`, `js/posters.js`,
  `js/main.js`, `js/subpage*.js`, ni los observers/motores. Se rompen los juegos y los efectos.
- Editar los scripts del harness (`apply-theme.mjs`, `check.mjs`, `install-hooks.sh`).
- Introducir CDNs, `<script src="http...">`, frameworks o paquetes npm. El sitio es vanilla y offline.
- Introducir emojis en el HTML. Los iconos son **SVG inline** (nunca emojis). Regla del proyecto.
- Romper el scroll-snap full-screen ni introducir scroll horizontal.

### Reglas de operacion:

- **Siempre dry-run antes de `--write`** con `apply-theme.mjs`.
- **Siempre corre `check.mjs` al final** de cada cambio; debe salir 0.
- **Commit/deploy solo con aprobacion explicita del usuario.** Nunca por tu cuenta.
- A11y no negociable: contraste >= 4.5:1, `focus-visible`, targets >= 44px, `prefers-reduced-motion`.

---

## FASE 1 — Entrevista

Conduce la entrevista de `harnes-portafolio/questions.md`. Reglas:

- Haz las preguntas **EN ORDEN y por BLOQUES** (bloque A, luego B, ...). **No dispares las 20 de golpe.**
- Registra cada respuesta contra su ID (Q1, Q2, ...) y el campo de config al que mapea.
- **Si el usuario no sabe que responder, ofrecele 2-3 opciones concretas con una recomendacion.**
  Ejemplo: "Para la paleta puedo proponerte: (a) verde/cian terminal como esta ahora [recomendado
  si quieres mantener el tono hacker], (b) ambar retro sobre negro, (c) azul/blanco minimal. Cual?"
- Confirma el bloque antes de pasar al siguiente.

---

## FASE 2 — Config

Copia `portfolio.config.example.json` a `harnes-portafolio/portfolio.config.json` y vuelca ahi las
respuestas de la entrevista. Este archivo es la **UNICA interfaz de theming**.

- Colores en hex `#rgb` o `#rrggbb`.
- Las variantes `bright/mid/soft/glow` NO se ponen a mano: las deriva `apply-theme.mjs`.
- Marca `enabled:false` en las secciones a quitar y en los juegos a quitar.

---

## FASE 3 — Aplicar

### 3a. Paleta y fuentes (script)

```
node harnes-portafolio/scripts/apply-theme.mjs            # dry-run: tabla token -> actual -> nuevo
# revisa el diff con el usuario
node harnes-portafolio/scripts/apply-theme.mjs --write    # aplica
```

El script es idempotente y solo toca los tokens conocidos del `:root`. Si una fuente cambia, tambien
actualiza las `font-family` y el `<link>` de Google Fonts, y te AVISA de verificar que exista.
Para volver al baseline: `node harnes-portafolio/scripts/apply-theme.mjs --restore-baseline --write`.

### 3b. Contenido (js/content.js, guiado por CONTENT-MAP.md)

Edita `PF.data` con las respuestas de la entrevista siguiendo las formas EXACTAS documentadas en
`CONTENT-MAP.md` (proyectos, logros, formacion, tecnologias, redes, textos del hero/about).

### 3c. Secciones / juegos a quitar o renombrar

Sigue las **recetas quirurgicas** de `CONTENT-MAP.md` ("quitar una seccion del index", "quitar un
juego", "agregar un proyecto", "cambiar iconos tech"). No mas, no menos.

---

## FASE 4 — Verificar

```
node harnes-portafolio/scripts/check.mjs
```

Debe salir **0** (todo PASS). Si algun check falla, lee el mensaje accionable, corrige y repite.
No avances mientras haya un FAIL.

(Opcional, recomendado: `bash harnes-portafolio/scripts/install-hooks.sh` para que cada commit
corra `check.mjs` automaticamente.)

---

## FASE 5 — Checkpoint visual

Sirve el sitio estaticamente (por ejemplo `python3 -m http.server` desde la raiz, o abrir `index.html`
con `file://`) y **pide al usuario que revise en DESKTOP Y en MOVIL** (el modal de juegos y el layout
cambian a <=768px). Solo tras su visto bueno explicito procede a commit/deploy — y solo si el usuario
lo autoriza.
