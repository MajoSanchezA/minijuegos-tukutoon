# Proyecto TukuToon — Juegos para niños de 2 a 5 años

Contexto: app de juegos infantiles de TukuToon (Team Toon Studio). Esta carpeta (`a-pintar/`)
contiene el juego de pintar/colorear. Más adelante se sumará un juego de trazos (tracing).

## Reglas de trabajo

- Responde siempre en español.
- Edita los archivos existentes en su lugar. No crees copias, versiones "-v2" ni duplicados de
  un mismo archivo — la única duplicación esperada es la de `plantillas/plantilla-horizontal.html`
  al crear un dibujo nuevo (eso es intencional, ver más abajo, no es una excepción a esta regla).
- Respeta la organización de carpetas descrita abajo.
- Los juegos deben funcionar en celular (touch). La app en general funciona con internet, así
  que NO hace falta que este juego funcione offline — está bien que las páginas carguen las
  tipografías desde Google Fonts (`fonts.googleapis.com`).
- Tipografía oficial de marca (todas las páginas cargan las tres desde Google Fonts):
  **Fredoka** para títulos y destacables, **Comfortaa** para subtítulos y cuerpo de texto,
  **Plus Jakarta Sans** para textos de soporte (labels chicos).

## Estructura de carpetas

```
a-pintar/
├── index.html              # redirige a menu.html
├── menu.html               # molde vacío del grid de miniaturas (sin contenido de dibujos)
├── paginas.js              # fuente de verdad del menú: const PAGINAS = [...]
├── fondo-menu.png          # imagen de fondo (playa) usada SOLO en el menú
├── fondo-dibujo.png        # imagen de fondo (lápiz + hoja sobre violeta), usada en
│                             # motor.css, se ve en TODAS las páginas de dibujo
├── hoja-dibujo.png          # recorte de SOLO la hoja crema de fondo-dibujo.png
│                             # (sin el violeta ni el lápiz), fondo de `.paper` en
│                             # motor.css (ver más abajo)
├── CLAUDE.md                # este archivo
├── GUIA-DISENADORES.md      # spec de entrega de los PNG de linea, para mandarle
│                             # al equipo de diseno (formato, tamano, errores que rompen
│                             # el juego, checklist)
│
├── css/
│   └── style.css           # estilos del menú/index (NO del motor de dibujo)
├── js/
│   └── script.js           # lee PAGINAS (paginas.js) y arma las tarjetas del menú
│
├── motor/                  # engine reutilizable de dibujo — compartido por TODAS las páginas
│   ├── motor.js             # TukuToonColorPage({...}): paleta, pinceles, balde, fit a pantalla
│   └── motor.css            # estilos visuales del juego de colorear
│
├── plantillas/
│   └── plantilla-horizontal.html   # molde para crear una página de colorear nueva
│                                   # (queda como referencia del formato; el flujo
│                                   # normal ahora usa herramientas/preparar-dibujo.html)
│
├── herramientas/            # utilidades internas, NO son parte del juego
│   └── preparar-dibujo.html # se abre con doble clic: valida el PNG del diseñador y
│                            # genera la página de colorear con el base64 ya incrustado
│
└── paginas/                 # una carpeta por dibujo (autocontenida)
    ├── aida/
    │   ├── colorea-tukutoon-aida.html   # el .png de aida va incrustado en base64 adentro
    │   └── aida.png          # solo se usa como miniatura del menú (ver más abajo)
    └── ana/
        ├── colorea-tukutoon-ana.html
        └── ana.png
```

`paginas.js` NO es `.json` a propósito: se carga con `<script src="paginas.js">` para que
`menu.html` funcione tanto abierto por doble clic (`file://`) como servido por http, sin
depender de `fetch()` (que el navegador bloquea para archivos locales).

## Cómo funciona el motor de dibujo (motor.js / motor.css)

- Cada página de dibujo llama a `TukuToonColorPage({ title, subtitle, imgSrc, menuHref, bgSrc,
  ... })`, que arma todo el DOM (header, barras, lienzo, modal) por JS — la página HTML en sí es
  mínima. `bgSrc` es la ruta a `fondo-dibujo.png` vista desde esa página (default `'fondo-dibujo.png'`,
  pero las páginas dentro de `paginas/<nombre>/` pasan `'../../fondo-dibujo.png'`, dos niveles
  arriba — mismo criterio que `menuHref`).
- `imgSrc` es un PNG de línea (trazos negros/oscuros sobre fondo blanco opaco). Al cargar, el
  motor umbraliza (luminancia < 175 = línea), etiqueta las regiones cerradas por flood fill y
  precalcula sus píxeles (`buildRegions`). El balde rellena la región tocada.
- **`imgSrc` SIEMPRE va como `data:image/png;base64,...` incrustado, nunca como nombre de
  archivo externo (`'dibujo.png'`).** Motivo: el motor lee los píxeles del dibujo con
  `canvas.getImageData()`, y cuando la página se abre con doble clic (`file://`), Chrome/Edge
  bloquea esa lectura por seguridad si la imagen viene de un archivo aparte — el balde y los
  pinceles dejan de funcionar SIN ningún error visible (el dibujo se queda en el marcador de
  posición para siempre). Con `data:` incrustado ese bloqueo no existe. El `.png` de cada
  carpeta sigue existiendo igual, pero solo como `miniatura` en `paginas.js` (una `<img>`
  normal, no un canvas, así que ahí sí es seguro usar el archivo externo). Si `init()` ve
  algo raro al procesar la imagen, ahora lo muestra en el marcador de posición en vez de
  fallar en silencio (`try/catch` en `motor.js`).
- El fondo de página es `fondo-dibujo.png` (lápiz + hoja sobre violeta), igual que en el resto
  del sitio. **Es un `<img class="bg-photo">` real** (agregado en `buildDOM()`, primer elemento
  del `body`, posicionado `absolute; inset:0; object-fit:cover` detrás de todo por z-index), NO
  un `background-image` de CSS — ver más abajo, en "Horizontal forzado en celular", por qué. El
  contenedor `.paper` (donde vive el lienzo) usa por separado `hoja-dibujo.png` (recorte de SOLO
  la hoja crema, sin el violeta ni el lápiz) como fondo CSS estirado
  (`background-size:100% 100%`) — así el dibujo queda "apoyado" sobre una hoja con la misma
  textura que la de la imagen de fondo, en vez de sobre un rectángulo crema liso. No están
  alineados píxel a píxel con la hoja de `fondo-dibujo.png` (la posición de esta varía según el
  tamaño/proporción de pantalla porque usa `object-fit:cover`), pero al compartir la misma
  textura se leen como una sola hoja.
- Capas: canvas de pintura debajo (`#paint-canvas`) + canvas de tinta (líneas) encima
  (`#ink-canvas`). Los trazos nunca pisan las líneas (se respeta `wallMask`).
- Herramientas (`TOOLS` en motor.js): balde, marcador (trazo duro y opaco), lápiz (fino,
  semitransparente, granulado), acuarela (muy translúcida, se acumula al repasar el mismo
  lugar), aerosol (puntitos dispersos), brillantina (color sólido + destellos casi blancos
  al azar) y borrador (limpia la región completa).
- `fitStage()` recalcula el tamaño del lienzo para que TODO el juego (header + barras + dibujo)
  entre en una sola pantalla sin scroll, respetando la proporción real de la imagen.
- **Horizontal forzado en celular**: en `motor.css` (y en `css/style.css` para el menú),
  `@media screen and (orientation:portrait)` rota 90° (`transform:rotate(90deg)` +
  `width:100vh; height:100vw`, centrado con `position:absolute; top:50%; left:50%;
  margin-top:-50vw; margin-left:-50vh;`) para que el juego/menú se vea siempre horizontal aunque
  el chico sostenga el teléfono parado — es un truco 100% CSS, no usa `screen.orientation.lock()`
  (esa API no funciona en Safari/iOS fuera de una app instalada, y en Chrome solo dentro de
  pantalla completa). El transform va en `<html>`, NO en `<body>` (probamos eso primero: cuando el
  MISMO elemento tenía a la vez `transform:rotate()` y su propio `background-image`, en el
  celular real el fondo dejaba de pintarse del todo — quedaba solo el color de respaldo).
  Moviendo el transform a `<html>` (sin fondo propio) y dejando que `<body>` ocupe el 100% de
  `<html>` por flujo normal, el fondo volvió a aparecer, PERO en algunos celulares seguía sin
  rotar junto con el resto de la página (se veía "derecho"/horizontal fijo mientras el resto sí
  giraba) — otro bug de rendering real, esta vez específico de `background-image` en un elemento
  hijo de un ancestro con `transform`. La solución final fue sacar el fondo de CSS por completo y
  ponerlo como el `<img class="bg-photo">` real que se describe más arriba: al ser contenido de
  verdad (no "pintura de fondo"), un `<img>` sí hereda la rotación del ancestro de forma
  confiable en todos los navegadores probados. Si en algún momento hay que tocar este mecanismo
  de nuevo, NO volver a poner la imagen como `background-image` de un elemento rotado o
  descendiente de uno rotado — usar siempre un `<img>`.

  El `<body>` se centra con `position:absolute; top:50%; left:50%; margin-top:-50vw;
  margin-left:-50vh;` en `<html>` (en vez del truco más común de `top:100%` + `transform-origin`
  en una esquina) para que, antes de rotar, el elemento nunca quede posicionado fuera del
  viewport — eso también hacía que el fondo no se pintara en algunos celulares.

  En `fitStage()`, la altura disponible NO se lee de `document.body.clientHeight`
  (esa cadena de `position:absolute` + `height:100%` no se resuelve igual en todos los
  celulares): en vez de eso, `fitStage()` detecta con `window.matchMedia('(orientation:portrait)')`
  si el truco de rotación está activo y, si lo está, usa directamente `window.innerWidth` (una
  medida física del viewport, siempre confiable) como alto disponible. La altura del header se
  lee con `headerEl.offsetHeight` (no `getBoundingClientRect()`, que si devuelve valores ya
  rotados/cruzados). Si se cambia esta parte del cálculo, hay que mantener esta lógica o el
  lienzo se calcula mal en celular vertical. El menú (`css/style.css`) tiene el mismo truco de
  rotación + `<img class="bg-photo">` (mismo `@media` en su `<html>`), para que el menú y las
  páginas de dibujo se vean siempre horizontales los dos, sin que la orientación cambie al pasar
  de uno a otro.

  **Toque desalineado del pincel (tercer bug de esta rotación)**: con la rotación activa,
  `getCanvasPixel()` (en `motor.js`) NO puede usar `paintCanvas.getBoundingClientRect()` para
  ubicar el toque contra el canvas — en algunos celulares eso da un canvas rect desalineado a
  través de la rotación de `<html>`, y el balde/pincel terminaba pintando en un lugar distinto de
  donde tocaba el chico. La solución: cuando `isRotatedForLandscape()` es true, el punto de
  toque se pasa a mano al sistema de coordenadas SIN rotar de `<html>` con la fórmula cerrada de
  una rotación de 90° centrada en el viewport (`localX = clientY`, `localY = innerWidth -
  clientX` — se deduce de cómo está armado el `<html>` rotado: `width:100vh; height:100vw`,
  centrado con `top:50%;left:50%` + márgenes negativos, `rotate(90deg)`), y la posición del
  canvas se mide con `offsetRect()` (suma `offsetLeft`/`offsetTop` por la cadena de
  `offsetParent`) en vez de `getBoundingClientRect()`, porque esas dos propiedades no se ven
  afectadas por el transform de un ancestro. Si se cambia el ángulo de rotación o el
  centrado del `<html>` en motor.css, hay que volver a deducir esta fórmula — no es genérica
  para cualquier transform, es específica de esta rotación de 90° centrada en el viewport.
- Botón "volver al menú" arriba a la izquierda: usa `cfg.menuHref` (por defecto `'menu.html'`,
  pero las páginas dentro de `paginas/<nombre>/` necesitan pasar `'../../menu.html'` porque
  están dos niveles más abajo).
- Al tocar "Listo" (`done-btn`), además del confeti, `motor.js` guarda una foto del
  dibujo ya pintado (fondo blanco + color + líneas, achicada a 480px) en `localStorage`, con
  clave `tukutoon:progreso:<carpeta>` (la carpeta se deduce sola de la URL, ej. `.../paginas/
  ana/...` → `tukutoon:progreso:ana`). `js/script.js` la busca por `d.id` al armar el menú y,
  si existe, la muestra en vez de `miniatura` — así la tarjeta pasa a mostrar el dibujo pintado
  por el chico en lugar de la línea en blanco. Si `localStorage` no está disponible (poco
  común), no rompe nada: sigue mostrando `miniatura`. Es progreso local del navegador/equipo,
  no se sincroniza entre dispositivos.

## Dibujos actuales

- **Aida** (`paginas/aida/`) — tiene `palette` propia, muestreada del arte oficial a color:
  `#6D3642 · #E4A17A · #F6DF9D · #FEB66C · #74B9B8 · #ADE8C1 · #EF658E · #FFFFFF · #5AA9E6 · #2B2140`
- **Ana** (`paginas/ana/`) — línea vectorizada en Figma, exportada como PNG. Tiene `palette`
  propia: `#FEFBEB · #050403 · #EFC46E · #C0764C · #9ED972 · #EFE4AD · #BEB69E · #F5C8EF`
- **Tuku** (`paginas/tuku/`) — línea vectorizada en Figma, exportada como PNG. Tiene `palette`
  propia: `#B35D8A · #F9DBBC · #D64973 · #93C5D5 · #180F0E · #F7F7F8 · #E98489 · #A6A6A6 · #232C49`
- Paleta genérica por defecto (10 colores, en `motor.js` → `DEFAULT_PALETTE`), para dibujos
  sin `palette` propia:
  `#FF6F59 · #FFC94A · #2EC4B6 · #5AA9E6 · #B388EB · #FFB4C6 · #8BC34A · #E8735A · #2B2140 · #FFFFFF`

## Flujo para agregar un dibujo nuevo

El PNG de línea lo prepara el equipo de diseño siguiendo `GUIA-DISENADORES.md` (ese archivo
está escrito para mandárselo tal cual: formato, tamaño, los errores que rompen el juego y una
checklist). Con el PNG en la mano:

1. Abrir `herramientas/preparar-dibujo.html` con doble clic y soltar el PNG adentro.
2. Leer la revisión que devuelve. Mirar la vista de **Zonas**: cada área que el balde puede
   rellenar por separado sale de un color distinto, así que dos partes que deberían ser
   distintas y salen del mismo color = contorno abierto → se rebota al diseñador.
3. Completar nombre corto, título, emoji y paleta (si el diseñador mandó la versión a color,
   el botón "Muestrear del arte a color" saca los 9 colores principales solo).
4. Bajar los dos archivos que genera, crear `paginas/<nombre-corto>/` y guardarlos ahí.
5. Pegar la entrada que da la herramienta dentro de `PAGINAS`, en `paginas.js`. No hace falta
   tocar `menu.html`, `js/script.js` ni el motor.

La herramienta se encarga sola de las dos cosas que antes se hacían a mano y eran fáciles de
olvidar: incrustar el PNG como `data:image/png;base64,...` (obligatorio, ver "Cómo funciona el
motor" más arriba) y aplanar sobre blanco los PNG que hayan venido con fondo transparente.

`preparar-dibujo.html` replica la lógica del motor (umbral de luminancia `175` + flood fill de
4 vecinos) para que la revisión coincida con lo que el juego va a hacer de verdad. **Si esos
valores cambian en `motor.js`, hay que cambiarlos también en la herramienta** (`THRESH`).

Si por algún motivo hace falta armar la página a mano, `plantillas/plantilla-horizontal.html`
sigue ahí con el formato de referencia y los pasos explicados en sus comentarios.

## Pendientes conocidos

- Botones deshacer y guardar/foto del dibujo terminado.
- Modo pedagógico "colorea como el modelo": miniatura de referencia + celebración cuando
  cada región queda del color correcto (asociación de colores, edades 2-5).
- Sello de textura/patrón como herramienta extra (rayas, puntos, estrellas…).
- Solo hay tres dibujos cargados (Aida, Ana, Tuku) — falta sumar más personajes siguiendo
  el flujo de arriba.
- Los tres dibujos actuales no cumplen la spec de `GUIA-DISENADORES.md`: Aida (720×755) y Ana
  (1904×2082) son **verticales**, y el layout es horizontal — quedan chicos y centrados con
  huecos grandes a los lados. Además Ana (4,0 MP) y Tuku (3,7 MP) son ~7× más pesados que Aida
  (0,5 MP) para `buildRegions()`, que recorre píxel por píxel al abrir. Conviene volver a
  pedirlos horizontales a 1500×1000, o al menos pasarlos por `herramientas/preparar-dibujo.html`
  con el reescalado activado.
- Juego de trazos (tracing): sin empezar, pendiente de las plantillas de trayectorias.
