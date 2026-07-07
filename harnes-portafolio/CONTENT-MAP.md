# CONTENT-MAP — donde vive cada cosa

Mapa determinista de la plantilla. Las formas de objeto documentadas son las **reales** de
`js/content.js` (leelo tambien: es la fuente de verdad). `PF.data` esta **congelado** (`Object.freeze`)
y se renderiza desde `js/main.js` (index) y `js/subpage.js` (subpaginas).

---

## 1. Mapa campo -> archivo -> clave/selector

| Cosa | Archivo | Clave / selector |
|------|---------|------------------|
| Paleta (colores) | `css/main.css` | tokens del `:root` (via `apply-theme.mjs`) |
| Fuentes | `css/main.css` + HTML `<link>` Google Fonts | `font-family` + `apply-theme.mjs` |
| Nombre (hero) | `js/content.js` | `contact.name` (render `#heroName`) |
| Subtitulo hero | `index.html` seccion 01 | `.hero-subtitle` (texto literal) |
| Badge de ubicacion | `index.html` seccion 01 + `js/content.js` | `.location-badge` / `contact.location` |
| Boton CV | `index.html` seccion 01 | `<a class="cv-button" href="assets/curriculum.pdf">` |
| Bio "Sobre mi" | `js/content.js` | `about.headline`, `about.paragraphs[]`, `about.interests[]` (render `data-render="about"`) |
| Hexagonos de tecnologias | `js/content.js` + `assets/icons/tech/*.svg` | `technologies[]` (render `data-render="technologies"`) |
| Logros | `js/content.js` | `logros[]` (poster en index sec.03; timeline en `logros.html`) |
| Proyectos | `js/content.js` | `projects[]` (poster en index sec.04; timeline en `proyectos.html`) |
| Formacion | `js/content.js` | `formacion[]` (poster en index sec.05; timeline en `formacion.html`) |
| Redes / contacto | `js/content.js` | `socials3d[]` (render `data-render="socials-3d"`) + `contact` |
| Frases del Typer | `js/content.js` | `typingSentences[]` |
| ASCII del hero | `js/content.js` | `asciiArt` |
| Titulos de menu | `index.html` | `<nav class="menu-overlay"> <a data-target="sectionN">` |
| `<title>` / `<meta description>` | cada HTML `<head>` | literal |

Secciones del index: `#section1` HOME · `#section2` SOBRE MI · `#section3` LOGROS ·
`#section4` PROYECTOS · `#section5` FORMACION · `#section6` CONTACTO. El menu usa `data-target`.

---

## 2. Formas EXACTAS de los objetos de PF.data

### `contact`
```js
{ name, email, phone, location, github, linkedin,
  profileImg: { src, alt, w, h } }        // src en assets/img/ (retrato del hero)
```

### `about`
```js
{ headline: 'string',
  paragraphs: ['parrafo 1', 'parrafo 2'],
  interests: ['chip 1', 'chip 2', 'chip 3'] }
```

### `technologies[]` (hexagonos)
```js
{ name: 'C++',
  color: '#00599c',                       // acento de marca (borde/glow)
  fill:  '#6b5600',                        // OPCIONAL: fondo distinto si el icono se funde con su color
  icon:  'assets/icons/tech/cplusplus.svg' } // SVG local, NUNCA emoji, NUNCA CDN
```

### `projects[]` (dos variantes de visual)
```js
// Variante con imagenes:
{ id, title, lang, date, dateISO, description, note,
  tags: ['C++','Consola'],
  link, linkLabel, linkType: 'youtube'|'github',
  images: [ { src, alt, w, h }, ... ] }    // src en assets/img/

// Variante con video (p.ej. EcoAlerta):
{ ..., video: { src, poster, w, h, label } }   // src en assets/video/, poster en assets/img/

// Variante "stats" (sin captura): visual generado
{ id, title, lang, date, dateISO, description,
  stats: ['53.082 estrellas', '179 tests'],
  link, linkLabel, visual: 'stats' }

// Variante "iframe" (portada = html escalado):
{ ..., visual: 'iframe', iframe: { src, title, natW, natH } }  // src en assets/
```

### `logros[]`
```js
{ id, title, issuer, date, dateISO,
  kindLabel: 'MEDALLA DE ORO'|'PREMIO'|'RECONOCIMIENTO'|'DISTINCION',
  gold: true,                              // OPCIONAL: marca la pieza dorada destacada (solo una)
  description,
  image: { src, alt, w, h },               // src en assets/img/ o assets/img/certs/
  link, linkLabel, linkIcon }              // OPCIONALES (link externo del logro)
```

### `formacion[]`
```js
{ id, title, issuer, date, dateISO,
  hours: '100 horas academicas',           // OPCIONAL
  description,
  image: { src, alt, w, h } }              // src en assets/img/ o assets/img/certs/
```

### `socials3d[]` (pentagono 3D de contacto)
```js
{ name: 'GitHub',
  url: 'https://...'|'mailto:...'|'https://wa.me/...',
  ariaLabel: 'texto accesible',
  color: '#ffffff',                        // color de marca
  svg: '<svg ...>...</svg>' }              // SVG inline (viene de la tabla `svg` al inicio de content.js)
```
Los SVG de marca viven en el objeto `svg` al principio de `content.js` (email, youtube, gmail,
whatsapp, github, linkedin, pin, doc, gamepad, speakerOn/Off). Reutiliza esos; no metas emojis.

---

## 3. Recetas quirurgicas

### Agregar un proyecto
1. Anade un objeto a `projects[]` en `content.js` con la forma de arriba (elige la variante de visual).
2. Copia las imagenes a `assets/img/` con las dimensiones reales en `w`/`h` (evita saltos de layout).
3. `alt` descriptivo en cada imagen (a11y). `tags` cortos.
4. Corre `check.mjs` (verifica que las imagenes existan y la sintaxis).

### Cambiar iconos tech
1. Guarda el nuevo SVG en `assets/icons/tech/<nombre>.svg` (SVG limpio, sin scripts).
2. Apunta `technologies[].icon` a esa ruta. Ajusta `color` (y `fill` si el logo se funde con su color).
3. Nunca uses un emoji ni una URL remota.

### Quitar un juego
- `tictactoe` / `blocks3d` / `typing` (embebidos en el index):
  1. En `index.html`, elimina el bloque `data-render`/`data-embed` del juego y su boton
     `.pf-mobile-play` con `data-modal-game="<juego>"` dentro de la seccion correspondiente
     (03 tictactoe, 04 blocks, 05 typing).
  2. En `portfolio.config.json` pon `games.<juego>: false` (documental).
  3. NO borres `js/games/*` ni sus `<script>` (otros wirings los referencian); basta con no invocarlos.
- `snake` / `diana` / `pong` (slides finales de subpaginas): estan en las subpaginas; si no quieres el
  juego, deja la subpagina sin su slide final segun `subpage-games.js` — pero **no edites** ese motor;
  si dudas, mantenlos.

### Quitar una seccion del index (p.ej. LOGROS)
1. Elimina el bloque `<section id="section3" ...> ... </section>` completo en `index.html`.
2. Elimina su entrada del menu: `<li><a data-target="section3">LOGROS</a></li>`.
3. Verifica que ninguna otra referencia (`data-target`, anclas `#section3`, back-links de subpaginas)
   quede colgando. `check.mjs` (check 6) falla si el menu apunta a una seccion inexistente.
4. Marca `sections[].enabled:false` para esa seccion en la config.
5. No es obligatorio renumerar las demas, pero si renumeras hazlo en `id`, `data-index`, `data-target`
   y en el back-link de la subpagina asociada, todo a la vez.

### Renombrar / reordenar secciones
- Renombrar: cambia el texto del `<a data-target=...>` en el menu y el encabezado visible de la seccion
  (`.section-heading`/`.poster-kicker`). Actualiza `sections[].title` en la config.
- Reordenar: mueve los bloques `<section>` y sus `<li>` del menu juntos; manten `id`/`data-index`
  coherentes con el nuevo orden. Prueba el scroll-snap tras el cambio.

### Cambiar textos del hero
- Subtitulo: `.hero-subtitle` en `index.html` (literal).
- Terminal decorativa (`.hero-terminal`): texto literal en `index.html` — puedes ajustarlo, es decorativo.
- Nombre: `contact.name` en `content.js` (NO en el HTML; se renderiza en `#heroName`).

---

## 4. Que NO tocar y por que

- `js/games/*`, `js/effects.js`, `js/particles.js`, `js/backgrounds.js`, `js/posters.js`,
  `js/main.js`, `js/subpage*.js`: motores de juegos, efectos y los IntersectionObservers que activan
  las secciones. Editarlos rompe la interactividad y el scroll-snap.
- `assets/vendor/three.min.js`: three.js vendorizado (r128) para Blocks 3D. No lo cambies por un CDN.
- Los scripts del harness (`scripts/*`): son la herramienta, no el contenido.
- El bloque `:root` de `css/main.css` a mano: cambialo **solo** via `apply-theme.mjs`.
