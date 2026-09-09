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
├── fondo-dibujo.png        # EL fondo del juego: mesa + hoja + decoración ya
│                             # compuestos en una sola imagen, 1748x804. Es lo único
│                             # que carga el motor (ver por qué más abajo)
├── fondo-mesa.png           # la mesa sola (03_CENITAL_MESA del arte). FUENTE, no se
│                             # usa en el juego
├── decoracion-dibujo.png    # útiles y stickers, con alfa. FUENTE
├── hoja-dibujo.png          # la hoja crema, 880x982, con su borde irregular y su
│                             # sombra. FUENTE
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
│   │                        # 144x144, recortados al dibujo y escalados para que LLENEN el
│   │                        # lienzo: en el prototipo ocupan el 100% de su caja de 48. Si se
│   │                        # les deja margen adentro se ven chicos Y más separados, porque
│   │                        # ese aire se suma al hueco entre iconos)
│   ├── balde.png            # balde
│   ├── lapiz.png            # lápiz
│   ├── pincel.png           # acuarela
│   ├── especial.png         # brillantina
│   ├── borrador.png         # borrador
│   ├── salir.png            # la X de volver al menú
│   ├── reiniciar.png        # la flecha circular de empezar de nuevo
│   └── descargar.png        # el botón naranja de guardar el dibujo
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
- **El fondo es UNA sola imagen con la hoja ya dibujada adentro** (`fondo-dibujo.png`,
  1748x804 = el doble del frame del prototipo). Es un **`<img class="bg-photo">`** real con
  `object-fit:cover`, no un `background-image` de CSS — ver más abajo, en "Horizontal forzado
  en celular", por qué.

  **Por qué compuesta y no en capas:** en el diseño la decoración va ENCIMA de la hoja — mirá
  el lápiz oscuro de abajo a la izquierda, que le pasa por arriba. Con la hoja como elemento
  aparte eso es imposible: o la hoja queda arriba de la decoración (mal), o la decoración
  queda arriba de todo y tapa los rails. Además así la hoja cae exactamente donde la puso
  diseño, sin que la ubique el layout.

  **Cómo se recompone** (con las tres fuentes que quedaron en la carpeta): lienzo de 1748x804,
  `fondo-mesa.png` y `decoracion-dibujo.png` escaladas con `cover` centrado, y
  `hoja-dibujo.png` en **x=516, y=92, 806x899** — medido sobre el frame del prototipo, donde
  la hoja va de x 258 a 661 y su borde de arriba cae en y=46 (por 2, porque componemos al
  doble). Orden: mesa, hoja, decoración. Si se recompone, hay que actualizar la constante
  `FONDO` en `motor.js`.
- **Los tamaños de la interfaz son proporcionales al alto del juego, no px fijos.**
  `fitStage()` los recalcula en cada resize y los publica como variables CSS en `<html>`
  (`--ico`, `--rail-gap`, `--grosor`, `--lapiz`, `--lapiz-sel`); `motor.css` solo las consume,
  con valores de arranque en `:root` para la primera pintada. Las proporciones (objeto `P` en
  motor.js) están medidas sobre el frame del prototipo, 874x402: **icono 11,9% del alto**,
  aire entre iconos 2,5%, **grosor del lápiz 9,5%**, hoja 112% de alto con el borde de arriba
  al 11,4%.
  Con px fijos esto se veía bien en un celular horizontal y demasiado chico en una pantalla más
  alta, porque el `@media` de pantallas bajas dejaba de aplicar justo cuando había más lugar.
  Por eso `.app` tampoco lleva `margin` vertical ni `max-width`: en el diseño la columna de
  iconos llena el alto entero y los rails tocan los bordes.
- El grosor del lápiz es **siempre** el 9,5% del diseño, aunque la paleta no entre entera: se
  ven **seis** (`P.lapicesVisibles`) y el resto se desliza, como en el prototipo. Antes se
  achicaban para que entraran todos y quedaban finitos.
  **La barra de scroll va oculta a propósito** (`scrollbar-width:none` + `::-webkit-scrollbar`):
  si se viera, se comería 15px de ancho y los lápices dejarían de llegar al borde de la
  pantalla, que es justo donde tienen que cortarse. Se desliza con el dedo igual.
- **TODO se ubica desde las coordenadas del fondo, no desde el layout.** Antes los rails eran
  flex y repartían el espacio disponible; el diseño, en cambio, pone cada cosa en un lugar fijo
  respecto del arte. Por eso nada coincidía y cada arreglo puntual corría otra cosa. Ahora los
  cinco grupos —columna de iconos, hoja, lápices, guardar y reiniciar— se posicionan en
  absoluto: `fitStage()` mapea coordenadas del fondo a pantalla con las funciones `X()` e
  `Y()`, que replican la transformación de `object-fit:cover`. **Todas las posiciones viven en
  la constante `FONDO`** de motor.js, medidas sobre el frame del prototipo (874x402) y llevadas
  al doble. Si cambia el prototipo o se recompone el fondo, se toca ahí y nada más.
- Tres cosas que hay que entender de esa distribución, porque no son evidentes:
  - **Guardar NO pertenece a la columna de la izquierda**, y va **AL LADO de la estrella, a la
    misma altura** — en el prototipo las dos ocupan y 328..369. Es un botón suelto, igual que
    reiniciar del otro lado. Puesto al costado, la columna entra con la separación del diseño
    (123) sin que nada se pise; puesto debajo no entraba.
  - **Reiniciar va al COSTADO de los lápices, no debajo** (x 82,7% / y 87,1%).
  - El `top` de guardar y de reiniciar NO se calcula desde `FONDO` sino **con la misma cuenta
    que usa el rail para su último icono**. Calculado aparte quedaban 2px más arriba que la
    estrella: el rail acumula el redondeo del gap seis veces y el resultado no coincide al
    píxel.
  - **Lo que va pegado a un borde se mide DESDE ese borde** (`desdeIzq` / `desdeDer`), no con
    `X()`. Si la pantalla es más angosta que el diseño, el fondo se recorta a lo ancho, y con
    `X()` la interfaz se iba recortada junto con él: a 663x456 la columna quedaba en x −66 y
    los lápices en 827 con la pantalla de 663, o sea las dos afuera. Medido desde el borde, sin
    recorte da exactamente lo mismo y con recorte se queda donde se ve.
- **El layout está calibrado para la relación del prototipo, 2,17** (un celular horizontal real
  da 2,16). En ventanas mucho más angostas —1,45, por ejemplo— la hoja pasa a ocupar el 69% del
  ancho en vez del 46%, y guardar y reiniciar terminan apoyados sobre ella. Como la hoja está
  dibujada dentro del fondo no se la puede achicar para hacerles lugar: es el precio de haberla
  compuesto, y en el dispositivo real no pasa.
- **El orden de las herramientas es el del prototipo** (pincel, borrador, lápiz, balde,
  estrella) y NO el que uno pondría: el balde va cuarto aunque sea el que más se usa. Por eso
  la que arranca elegida se define aparte, en `TOOL_INICIAL`, en vez de ser la primera de la
  lista.
- **No hay control de grosor.** El trazo es fijo, una fracción del ancho del dibujo (`TRAZO`),
  así se siente igual en un dibujo de 1100 px que en uno de 2000. Un chico de 2 a 5 años no va
  a regular un slider, y el diseño tampoco lo tiene.
- El **brillo** del lápiz sube 10 puntos de luminosidad, que es exactamente lo que hace el
  archivo de diseño (cuerpo `#C94BFE` → brillo `#D97EFE`). Antes subía un 28% de lo que faltaba
  para blanco: con colores pastel eso daba 5 puntos y el lápiz quedaba plano.
- El **viewBox del lápiz arranca en negativo** (`LAPIZ_AIRE`): el contorno sobresale media
  pluma del dibujo, y sin ese aire el borde de la PUNTA quedaba cortado justo del lado que más
  se ve.
- **Como la hoja viene dentro del fondo, `fitStage()` tiene que deducir dónde cayó**: replica
  a mano la transformación de `object-fit:cover` (escala para cubrir, y el sobrante se recorta
  por partes iguales de los dos lados) y con eso le da `left/top/width/height` a `.paper`, que
  ya no dibuja nada y quedó solo como la caja que ubica al lienzo. Los números de la hoja
  dentro del fondo están en la constante `FONDO` de `motor.js`.
  La hoja es **más alta que la pantalla** y se corta contra el borde de abajo, así que el
  dibujo se centra en la parte **visible** de la hoja y no en la hoja entera — si se centrara
  en la hoja entera quedaría medio tapado. Ya no es un rectángulo al que le poníamos borde y sombra por CSS (eso se
  podía estirar a la proporción que pidiera cada dibujo): ahora es un asset con su propio borde
  irregular y su propia sombra dibujada, así que estirarla la deforma. `fitStage()` primero
  calcula cuánto puede medir la hoja respetando `HOJA_RATIO` (880/982, la proporción real del
  archivo) y recién después acomoda el lienzo adentro, en el 80% de su ancho. Ese 80% sale de
  medir el PNG: el área crema ocupa el 89,8% del ancho, así que el dibujo queda con aire parejo
  adentro del crema. `.paper` ya no lleva `border-radius` ni `box-shadow` — se los sumaría a los
  que la imagen ya trae.
- **El afuera del dibujo se PINTA pero no se RELLENA.** Son dos cosas distintas y al principio
  las trataba como una sola, bloqueando las dos:
  - Con el **balde** quedaba el cuadrado. Es la región más grande y la más fácil de tocar sin
    querer, y como el dibujo es cuadrado el relleno tapaba la hoja entera de un color, con un
    borde recto que no tiene nada que ver con el personaje. Por eso sigue con `labels = -2`.
  - Con los **pinceles** no molesta: el chico decora alrededor del personaje y el trazo se
    corta solo contra el borde del lienzo, que ya está adentro de la hoja. Por eso el afuera
    **no** se marca en `wallMask`.
  Se recorre TODO el borde de la imagen para encontrarlo, no solo las esquinas: si el personaje
  llega cerca de un lado —los brazos de Tuku, por ejemplo— parte el afuera en varias regiones
  sueltas, y mirando solo las cuatro esquinas quedaban rellenables las de los costados.
- Capas: canvas de pintura debajo (`#paint-canvas`) + canvas de tinta (líneas) encima
  (`#ink-canvas`). Los trazos nunca pisan las líneas (se respeta `wallMask`).
- Herramientas (`TOOLS` en motor.js): la barra muestra **cinco**, y cada una tiene que
  SENTIRSE distinta al arrastrar — si todas dejan la misma mancha, sobran cuatro:
  - **Balde**: el único que no es trazo. Rellena la región entera de un toque.
  - **Acuarela** (`stampBrush`): lo que la hace acuarela y no un aerógrafo es el **borde
    mojado** — el agua arrastra el pigmento hacia la orilla y al secarse deja ahí una franja
    más oscura que en el medio. Eso no sale de un estampado suelto, porque el estampado no sabe
    dónde termina el trazo: el agua se va acumulando en una máscara (`acuaMask`) y el color se
    recompone mirándola, con una campana centrada donde el agua empieza a escasear. Cada trazo
    es UNA aguada: se compone sobre una foto de la pintura tomada al apretar (`acuaFondo`), así
    que repasar quince veces adentro del mismo trazo no lo pone quince veces más oscuro, pero
    levantar el dedo y volver a pasar SÍ superpone otra aguada. Es como se comporta la de
    verdad.
  - **Lápiz de color** (`stampPencil`): fino (30% del trazo base), con el grano del papel y con
    **veta**: raya en la dirección en la que va la mano. La veta sale de leer el ruido en
    coordenadas giradas —constante a lo largo del trazo, cambiante a lo ancho—, así que quedan
    rayitas paralelas al movimiento. Por eso `applyStroke` recibe la dirección del trazo.
  - **Brillantina** (`stampGlitter`): un velo suave del color y, encima, **chispas** sueltas
    en forma de cruz de 5px (`chispa`), unas casi blancas y otras del color subido de tono.
    Antes era color sólido con píxeles claros al azar, y eso no se lee como brillo: se lee
    como ruido. Lo que lo hace leer como destello es la FORMA de cruz.
  - **Borrador** (`stampEraser`): borra **por trazo**, no la región entera. Antes era un balde
    al revés —un toque y desaparecía todo el color de esa zona— y así no se puede corregir un
    pedacito. Va más gordo que el pincel (radio × 1,5): un borrador de verdad es un ladrillo y
    tiene que perdonar la puntería. Es el único que **no mira `wallMask`**: tiene que limpiar
    todo lo que encuentre. Las líneas del dibujo van en el otro lienzo y no se tocan nunca.
  - **Cada material tiene su grosor** (`RADIO`), y el paso entre estampados va con el radio DE
    LA HERRAMIENTA, no con el grosor base: el lápiz es fino y avanzando el paso del pincel
    quedan huecos entre estampado y estampado — el trazo sale punteado.
  - **En `ruido(x, y)` los desplazamientos van con `>>>`, no con `>>`.** Con el aritmético el
    signo se arrastra y el XOR final fuerza el bit más alto a 0 siempre: la función nunca pasa
    de 0,5 y promedia 0,25 en vez de 0,5. Con eso el lápiz casi no pintaba —apenas el 5% de los
    píxeles llegaba al umbral de agarre, contra el 65% esperado— y parecía un problema de
    grosor o de alfa, que no lo era.
  - **El grano tiene que ser ruido ESTABLE, no `Math.random()`** (función `ruido(x, y)`). Con
    `Math.random()` cada pasada cae en píxeles distintos, así que al repasar se rellena todo
    parejo y el grano desaparece: queda un relleno plano y sucio. Con ruido estable las mismas
    fibras agarran color siempre y las mismas quedan en blanco, entonces repasar OSCURECE sin
    perder la textura. Las chispas de la brillantina son la excepción y SÍ van al azar:
    tienen que titilar por todos lados mientras el chico arrastra, no quedarse pegadas.
  Son cinco porque es el set de iconos que hizo diseño y porque con chicos
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
    reiniciar, guardar, que también son PNG del arte — ya no queda ningún ícono SVG).
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
  el brillo sube 10 puntos de luminosidad. La madera es fija (`#FCD6B5` /
  `#C88B74`), es la misma en todos los lápices del arte. Pasado 85 de luminosidad el brillo se
  invierte y pasa a ser sombra: un lápiz casi blanco no tiene margen para aclarar y quedaría
  plano.
  - En el archivo el lápiz está parado (191x1418); en la barra va **acostado con la punta hacia
    el dibujo**, así que `lapizSVG` lo rota 90°.
  - **Cómo se arma el lápiz, medido sobre el prototipo.** El arte del `.ai` viene PLANO, sin
    contorno; el contorno lo pone el motor. Todo lo de abajo sale de escanear los lápices del
    prototipo píxel por píxel, que es la única fuente confiable — a ojo me equivoqué tres veces.
    - **El contorno rodea SOLO el cuerpo** (`LAPIZ_CUERPO`). El cono de madera NO lleva contorno
      de color: sus bordes son los dos filos marrones que el arte ya trae (`#C88B74`, 18px sobre
      un cono de 162 en el prototipo), y esos filos se ven contra el fondo, no están tapados.
      Contornear el cono además deja un escalón feo, porque el cono es más ancho que el cuerpo.
    - **La punta va del MISMO color que el contorno.** Es una argolla —un triángulo con otro
      adentro— y el prototipo la pinta del color del borde con el color del cuerpo adentro:
      leyendo el lápiz verde a lo largo del eje salen 30px de `#01AF01` (el anillo), 18px de
      `#00C600` (el cuerpo) y 24px de `#00B700`. El anillo que ya trae el arte mide 28 unidades,
      justo el grosor del contorno, así que la punta no necesita contorno aparte.
    - **El contorno asoma el 11% del grosor por lado** (24px de borde sobre 216 de lápiz en el
      prototipo). El cuerpo mide 155 unidades de grosor, así que `LAPIZ_BORDE` = 44 deja 22 por
      lado.
    - **El color del borde baja la luminosidad a 0,88** (cuerpo `#00CE00` → borde `#00B500`).
      Con 0,62, que era lo que había antes, quedaba un borde casi negro y pesadísimo. Por debajo
      de 22 aclara en vez de oscurecer, si no un lápiz casi negro se queda sin contorno.
  - **El contorno es geometría, no un filtro.** Se dibuja como una **capa de abajo**: el mismo
    cuerpo, relleno y engordado con un `stroke` del color del borde. Encima van los rellenos
    normales, que lo tapan entero, así que del contorno solo queda lo que asoma por afuera.
    - **No sacarlo con desenfoque + umbral.** Eso no engorda la silueta: la derrite. Con una
      desviación de 24 sobre un lápiz de 191 de grosor el cuerpo pierde los lados rectos y queda
      como una salchicha, y las figuras que no entran en la unión —los filos del cono, que son
      la parte MÁS ANCHA del lápiz— asoman peladas como púas marrones.
    - **Tampoco `feMorphology`**: engorda con un núcleo rectangular, cuadra las esquinas y el
      contorno sale blocado, sobre todo en la punta.
    - Y **no poner el `stroke` en cada figura**: eso dibuja también los bordes INTERNOS, el
      cuerpo y el cono se superponen y en la junta quedan dos líneas oscuras. Eso es el
      **contorno doble**. Un solo `stroke`, sobre el cuerpo, en una capa de abajo.
  - **El cuerpo se estira 20 unidades para llegar al cono** (`LAPIZ_CRECE`). En el archivo de
    diseño las dos aristas NO se tocan: la del cono corre unas 20 unidades por debajo de la del
    cuerpo. Sin contorno casi no se nota, pero al ponerle contorno ese hueco se abre y se ve el
    FONDO entre el cuerpo y la madera. El cuerpo se dibuja con un `stroke` de su propio color, y
    como el cono va después, el estirón queda tapado en todo lo demás. El trazo del contorno
    lleva sumado ese estirón, para que lo que asoma siga siendo `LAPIZ_BORDE / 2`.
  - `.nav-arrow` necesita `padding:0` explícito: un `<button>` trae `1px 6px` por defecto y,
    con `box-sizing:border-box`, esos 12px de los lados le comen el ancho al icono — el de
    reiniciar salía achatado.
  - **Dónde va cada rail** (medido sobre el frame del prototipo, 874x402): los siete iconos de
    la izquierda van repartidos parejo, del 10,2% al 98,8% del alto — siete cajas del 11,9% más
    seis huecos del 2,5% ya suman el 98,3%, así que alcanza con el `gap` y NO hay que empujar
    el último con `margin-top:auto`. Los lápices, en cambio, van **abajo**: en el prototipo el
    primero cae al 28,5% y el último al 88,2%, justo arriba de reiniciar, y eso lo consigue el
    `margin-top:auto` de `.swatches`.
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
- **El control de grosor (`.brush-size`) cuelga del `.app`, no del rail**, aunque
  visualmente esté al lado de la columna de iconos. Metido en el rail rompía dos veces: como
  elemento en el flujo era un octavo ítem en una columna calculada para siete, y flotado con
  `position:absolute` sobresalía del ancho del rail, le disparaba una barra de scroll
  horizontal, y esa barra le comía 15px de alto — con lo que la columna volvía a desbordar.
- **Los dos botones de acción están cruzados respecto de lo que uno esperaría, y es a
  propósito**: en el prototipo el naranja de **guardar** va abajo del rail IZQUIERDO y el
  turquesa de **reiniciar** abajo del DERECHO. El id `done-btn` quedó con su nombre viejo, de
  cuando era el botón "Listo".
- Al tocar guardar (`done-btn`), `motor.js` hace tres cosas: **baja el dibujo como PNG**
  (`descargarDibujo()`), guarda la miniatura para el menú y muestra el confeti. El PNG se arma
  aparte sobre fondo blanco, porque los dos lienzos del juego son transparentes — se ve la hoja
  de atrás — y un PNG transparente se vería raro al abrirlo o imprimirlo. Si el navegador
  bloquea la descarga, el resto sigue funcionando igual.
- Al tocar guardar, además del confeti, `motor.js` guarda una foto del
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
