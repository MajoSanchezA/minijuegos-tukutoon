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
├── fondo-dibujo.png        # la mesa vista desde arriba (03_CENITAL_MESA del arte),
│                             # opaca, 1920x1080. Capa de más abajo
├── decoracion-dibujo.png    # útiles y stickers sueltos, con alfa, 1920x1080. Va
│                             # encima de la mesa; el centro está vacío a propósito
├── hoja-dibujo.png          # la hoja crema, 880x982, con su borde irregular y su
│                             # sombra ya dibujados. Fondo de `.paper`
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
├── iconos/                  # iconos ilustrados de las herramientas (PNG con transparencia,
│   │                        # 144x144, recortados al contenido y centrados para que todos
│   │                        # se vean del mismo tamaño en la barra)
│   ├── balde.png            # balde
│   ├── lapiz.png            # lápiz
│   ├── pincel.png           # acuarela
│   ├── especial.png         # brillantina
│   ├── borrador.png         # borrador
│   ├── salir.png            # la X de volver al menú
│   ├── reiniciar.png        # la flecha circular de empezar de nuevo
│   └── descargar.png        # el botón naranja de descarga (TODAVÍA NO SE USA:
│                            # falta decidir la funcionalidad, ver Pendientes)
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
- **El fondo son tres capas separadas**, como venía armado el arte:
  1. `fondo-dibujo.png` — la mesa, opaca. `<img class="bg-photo">`, z-index 0.
  2. `decoracion-dibujo.png` — los útiles y stickers, con alfa. `<img class="bg-deco">`,
     z-index 1. El centro de esta capa está vacío a propósito: ahí va la hoja.
  3. `hoja-dibujo.png` — fondo CSS de `.paper`, que se posiciona por separado.

  Las dos primeras son **`<img>` reales**, no `background-image` de CSS — ver más abajo, en
  "Horizontal forzado en celular", por qué. Las dos miden 1920x1080 y usan el mismo
  `object-fit:cover`, así que recortan igual y **la decoración nunca se despega de la mesa**.
  Si alguna vez se cambia una, la otra tiene que mantener la misma proporción.
- **La hoja es la que manda la geometría del escenario, y por eso `fitStage()` calcula al
  revés que antes.** Ya no es un rectángulo al que le poníamos borde y sombra por CSS (eso se
  podía estirar a la proporción que pidiera cada dibujo): ahora es un asset con su propio borde
  irregular y su propia sombra dibujada, así que estirarla la deforma. `fitStage()` primero
  calcula cuánto puede medir la hoja respetando `HOJA_RATIO` (880/982, la proporción real del
  archivo) y recién después acomoda el lienzo adentro, en el 80% de su ancho. Ese 80% sale de
  medir el PNG: el área crema ocupa el 89,8% del ancho, así que el dibujo queda con aire parejo
  adentro del crema. `.paper` ya no lleva `border-radius` ni `box-shadow` — se los sumaría a los
  que la imagen ya trae.
- Capas: canvas de pintura debajo (`#paint-canvas`) + canvas de tinta (líneas) encima
  (`#ink-canvas`). Los trazos nunca pisan las líneas (se respeta `wallMask`).
- Herramientas (`TOOLS` en motor.js): la barra muestra **cinco** — balde, lápiz (fino,
  semitransparente, granulado), acuarela (muy translúcida, se acumula al repasar el mismo
  lugar), brillantina (color sólido + destellos casi blancos al azar) y borrador (limpia la
  región completa). Son cinco porque es el set de iconos que hizo diseño y porque con chicos
  de 2 a 5 años cinco botones grandes se aciertan mejor que siete chicos. **Marcador** (trazo
  duro y opaco) y **aerosol** (puntitos dispersos) siguen implementados (`stampMarker` /
  `stampSpray`, y sus ids siguen en `STROKE_TOOLS`) pero no están en la barra: para
  devolverlos alcanza con conseguirles un icono y sumarles su línea a `TOOLS`.
- **Los iconos de las herramientas son PNG ilustrados a color** (`iconos/`), no SVG. En
  `TOOLS`, `icon` es el nombre del archivo, no marcado. Consecuencias:
  - **Van a 48px, el tamaño chico de la grilla de iconos del sistema de diseño** (los tres
    tamaños son 120, 80 y 48). El prototipo del juego usa ese, y nuestra pantalla en celular
    horizontal (844x390) mide casi lo mismo que el frame del prototipo (874x402), así que van
    1:1 sin recalcular. Los PNG traen el dibujo al 83% de su caja, así que a 48px de caja el
    dibujo mide unos 40px — lo mismo que se mide en el prototipo. **No se achican en el
    `@media` de pantallas bajas**: lo que se comprime ahí es el aire entre ellos.
  - El icono de la herramienta elegida llega a 48px pero **no lo pasa**. Si se saliera de su
    botón, el rail contaría ese desborde en su área de scroll y aparecerían las dos barras.
    Por eso los no elegidos van a 44 y el elegido a 48, en vez de agrandar el elegido más allá
    de su caja.
  - `.tools` es un flex propio, con su `gap` aparte del `gap` del rail. Si se aprieta uno hay
    que apretar el otro: con cinco botones, 10px de hueco son 40px que hacen desbordar el rail.
  - No se les puede cambiar el color por CSS. Por eso la herramienta elegida se marca
    **agrandando el icono** y no invirtiendo su color ni
    pintándole un fondo coral encima. El botón en sí es transparente — los iconos van
    sueltos, sin la pastilla crema que sí llevan los botones redondos de acción (volver,
    reiniciar, listo, que siguen siendo SVG en `ICON`).
  - Es a propósito que el estado activo NO use `transform:scale()`: el rail tiene
    `overflow-y:auto`, y eso obliga al navegador a calcular `overflow-x` como `auto`
    también, así que cualquier escalado del botón se pasa del ancho del rail y dispara una
    barra de scroll horizontal. Creciendo el icono dentro de un botón de tamaño fijo eso no
    puede pasar.
  - La ruta de `iconos/` se deduce sola del `src` del propio `<script>` de motor.js
    (`ICONS_BASE`), así que —a diferencia de `bgSrc` y `menuHref`— **las páginas no tienen
    que pasar ninguna ruta**. `cfg.iconsBase` la puede pisar si alguna vez hace falta.
- **En `motor.css`, los dos bloques `@media` de tamaño de pantalla van AL FINAL del archivo, a
  propósito.** Pisan a `.tool-btn`, `.swatch`, `.nav-arrow` y `.brush-size` con la misma
  especificidad (una clase), así que lo único que los hace ganar es estar después. Estuvieron
  arriba mucho tiempo y esas reglas no hacían nada: en celular los botones seguían midiendo el
  tamaño de escritorio y el rail de herramientas desbordaba con barra de scroll. Si agregás una
  regla nueva a un componente, va ANTES de ese bloque. En el mismo bloque, ojo con
  `@media (max-width:420px)`: ahí NO se agrandan `.tool-btn` ni `.swatch` aunque parezca que un
  celular chico los pide más grandes — con la rotación forzada el juego siempre se ve apaisado,
  así que en un celular vertical el ANCHO de pantalla es el alto disponible del juego, y menos
  ancho significa menos lugar para los rails, no más.
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
- **No hay encabezado.** El diseño no lleva píldora con título ni subtítulo: la pantalla es la
  hoja y los dos rails, nada más. `cfg.title` sigue usándose para el `document.title` (la
  pestaña del navegador), y `cfg.titleHtml`, `cfg.subtitle` y `cfg.badgeEmoji` quedaron sin uso
  visible — no los borré de las páginas porque no molestan y documentan qué dibujo es cada una.
  Sacar el encabezado no fue solo estético: liberó 57px de alto, que son los que necesitaba la
  hoja vertical para no dejar sin lugar a los rails en celular.
- Botón "volver al menú": es la X (`iconos/salir.png`), arriba del todo en el rail izquierdo,
  suelta y sin pastilla igual que las herramientas. Usa `cfg.menuHref` (por defecto
  `'menu.html'`, pero las páginas dentro de `paginas/<nombre>/` necesitan pasar
  `'../../menu.html'` porque están dos niveles más abajo).
- **Los colores son lápices, no círculos.** `lapizSVG(hex)` en motor.js los dibuja: los paths
  salen de `BOTONES/LAPIZ_BASE_SELECTOR DE COLOR.ai` del arte — que por dentro es un PDF, así
  que se descomprimieron sus flujos de contenido y se pasaron los operadores de dibujo a SVG,
  invirtiendo el eje Y. Van **parametrizados por color en vez de un PNG por lápiz**: las paletas
  son propias de cada dibujo (9 o 10 colores por personaje), así que un archivo por color no era
  viable. Las relaciones de tono salen del mismo archivo de diseño: sobre un cuerpo `#C94BFE`,
  el brillo sube 10 puntos de luminosidad (un 28% de lo que le falta para llegar a blanco) y la
  punta baja a 0.906 con 16 puntos menos de saturación. La madera es fija (`#FCD6B5` /
  `#C88B74`), es la misma en todos los lápices del arte. Pasado 85 de luminosidad el brillo se
  invierte y pasa a ser sombra: un lápiz casi blanco no tiene margen para aclarar y quedaría
  plano.
  - En el archivo el lápiz está parado (191x1418); en la barra va **acostado con la punta hacia
    el dibujo**, así que `lapizSVG` lo rota 90°.
  - **Se cortan contra el borde de la pantalla**, como en el prototipo: `.rail-right` cancela
    el padding lateral del `.app` con un margen negativo. El corte lo hace el propio SVG, con
    `preserveAspectRatio="xMinYMid slice"` — el dibujo se escala para CUBRIR la caja y lo que
    sobra se recorta del lado derecho, dejando la punta siempre visible. El rail no puede
    dejar que se desborden de verdad porque su `overflow-y:auto` fuerza `overflow-x` a `auto`.
  - Recortar así (y no achicando el `viewBox`) deja **el grosor y el largo independientes**:
    `--grosor` fija el alto, que no cambia nunca, y `--lapiz` / `--lapiz-sel` el ancho. Por eso
    el elegido sobresale hacia el dibujo sin engordar ni correr a los demás de fila.
  - **`--grosor` está calculado para que la paleta más larga entre sin barra de scroll.** Con
    10 colores (Aida) el margen es de 5px. Si alguna paleta pasa de 10, hay que bajarlo: si
    aparece la barra, además de que un nene de 3 años no la va a usar, se come 15px de ancho y
    los lápices dejan de llegar al borde de la pantalla.
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
- **Los dibujos son los `*_sktch.png` del arte, cuadrados y con fondo transparente.** Se
  aplanan sobre blanco al incrustarlos porque el motor lee el transparente como pared; ese
  blanco no se ve nunca, porque el motor solo dibuja los píxeles de línea y el resto de las
  capas queda transparente, así que se ve la hoja de atrás. Los que había antes traían un fondo
  crema opaco metido en el propio PNG.
- (Histórico) Los dibujos anteriores no llegaban a la proporción del diseño. El Figma
  (`TUKUTOON APP UI STYLE GUIDELINE`, nodo `ZONA DE DIBUJO`) pide el dibujo **cuadrado**: los
  cuatro personajes están en marcos de 285×285 y `ana_sktch` exportado da 1100×1100. En el repo
  hay Aida 720×755 (0,95), Ana 1904×2082 (0,91) y Tuku 2200×1674 (1,31) — las dos primeras
  andan cerca, Tuku no. Además Ana (4,0 MP) y Tuku (3,7 MP) son ~7× más pesados que Aida
  (0,5 MP) para `buildRegions()`, que recorre píxel por píxel al abrir: conviene pasarlos por
  `herramientas/preparar-dibujo.html` con el reescalado activado.
  (Una versión anterior de este archivo decía que había que pedirlos **horizontales a
  1500×1000**. Era un error: se dedujo del layout viejo, sin el diseño a la vista. Van
  cuadrados.)
- Juego de trazos (tracing): sin empezar, pendiente de las plantillas de trayectorias.
