/* =====================================================================
   MOTOR DE TORTUGUITAS — engine del minijuego de contar arrastrando.

   Uso desde una pagina:

       <link rel="stylesheet" href="motor/motor-tortugas.css">
       <script src="tortugas.js"></script>
       <script src="motor/motor-tortugas.js"></script>
       <script>TukuToonTurtlesPage({});</script>

   El motor arma TODO el DOM por JS (header, consigna, escena, tarjeta) —
   la pagina HTML en si es minima, igual que en globos y vocales.

   Config aceptada:
     cantidad   cuantas tortuguitas hay que llevar al mar (default TORTUGAS_CANTIDAD)
     numeros    array de { texto, audio }, en orden (default TORTUGAS_NUMEROS)
     arte       ruta del PNG de la tortuga   (default TORTUGAS_ARTE)
     titulo     texto grande del header      (default 'TukuToon')
     subtitulo  bajada del header            (default 'CINCO TORTUGUITAS')
     menuHref   si viene, agrega boton de volver al menu

   LA MECANICA
   El chico arrastra cada tortuga desde la arena hasta el mar. El destino
   no es un blanco puntual sino TODA el area del mar: alcanza con soltar
   arriba de la linea de la orilla, no hay que embocar nada exacto — a los
   2-5 anos lo que importa es la accion de "llevarla", no la precision.

   Al soltarla en el agua: chapoteo (visual + un sonido sintetizado, sin
   ningun asset de audio), la tortuga nada a su lugar en el mar, el
   contador crece de a uno Y SE ESCUCHA ESE NUMERO — pero no con una voz
   sintetizada aparte, sino con un recorte de la propia cancion (`numero-
   1.mp3` a `numero-5.mp3`, ver `entregar()`): el chico escucha siempre la
   misma cancion que despues suena entera al terminar la ronda, nunca dos
   voces distintas contando lo mismo.

   Si la suelta afuera del mar, vuelve sola a su lugar en la arena: no hay
   castigo, solo intentar de nuevo.

   LA CANCION
   Al completar la ronda arranca sola `cancion-tortuguitas.mp3` — hoy es un
   recorte corto (el estribillo), no la cancion completa: 3 minutos y
   monedas es demasiado para el cierre de una ronda. La cancion entera
   queda igual en la carpeta como `cancion-tortuguitas-completa.mp3`, por
   si hace falta sacar otro recorte mas adelante. Si el navegador bloquea
   el autoplay por algun motivo, no rompe nada: el error queda atrapado y
   el juego sigue, el chico simplemente no escucha el audio esa vez (ver
   `terminar()` y `reproducirNumero()` mas abajo).

   EL ENCADENADO: nada se superpone. El clip de "cinco" tiene que terminar
   de sonar SOLO antes de que arranque la cancion, y la cancion tiene que
   terminar de sonar SOLA antes de que salga la tarjeta con "Otra vez" —
   los dos casos escuchan el evento `ended` del propio `<audio>`, no un
   `setTimeout` con un numero de milisegundos puesto a ojo (que se
   desincroniza apenas alguno de los dos clips se recorta mas largo o mas
   corto que hoy).
   ===================================================================== */
(function(global){
'use strict';

function TukuToonTurtlesPage(cfg){
  cfg = cfg || {};

  var CANTIDAD = cfg.cantidad || global.TORTUGAS_CANTIDAD || 5;
  var NUMEROS  = cfg.numeros  || global.TORTUGAS_NUMEROS  || [];
  var ARTE     = cfg.arte     || global.TORTUGAS_ARTE;

  buildDOM(cfg);

  var escena    = document.getElementById('escena');
  var contadorEl = document.getElementById('contador');
  var promptEl  = document.getElementById('prompt');
  var fx        = document.getElementById('fx');
  var ctx       = fx.getContext('2d');
  var cardEl    = document.getElementById('card');

  var tortugas  = [];   // { el, cuerpo, entregada }
  var entregadas = 0;
  var reduced   = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* =====================================================================
   DOM
   ===================================================================== */
function buildDOM(cfg){
  var titulo    = cfg.titulo    || 'TukuToon';
  var subtitulo = cfg.subtitulo || 'CINCO TORTUGUITAS';

  var volver = cfg.menuHref
    ? '<a class="icon-btn" id="menu-btn" href="' + cfg.menuHref +
      '" title="Volver al menu" aria-label="Volver al menu">←</a>'
    : '';

  document.body.innerHTML =
    '<header>' +
      volver +
      '<div class="brand">' + titulo + '<small>' + subtitulo + '</small></div>' +
    '</header>' +

    '<p class="prompt" id="prompt">¡Llevá las tortuguitas al mar!</p>' +
    '<p class="contador" id="contador"></p>' +

    '<main><div id="escena"></div></main>' +

    '<canvas id="fx"></canvas>' +
    '<audio id="cancion" preload="none" src="cancion-tortuguitas.mp3"></audio>' +
    '<audio id="voz-numero" preload="auto"></audio>' +

    '<div id="card" role="dialog" aria-modal="true">' +
      '<div class="card-box">' +
        '<div class="card-emoji" id="card-emoji"></div>' +
        '<div class="card-word">¡Llegaron al mar!</div>' +
        '<div class="card-hint" id="card-hint">Tocá para jugar de nuevo</div>' +
        '<div class="card-actions">' +
          '<button id="btn-again">↺ Otra vez</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

/* =====================================================================
   AUDIO (WebAudio, sin assets) — igual filosofia que motor-trazos.js
   ===================================================================== */
var AC = null;
function audio(){
  try{
    if(!AC){ var C = window.AudioContext || window.webkitAudioContext; if(C){ AC = new C(); } }
    if(AC && AC.state === 'suspended'){ AC.resume(); }
  }catch(e){ AC = null; }
  return AC;
}
function splashSound(){
  var a = audio(); if(!a) return;
  try{
    var t = a.currentTime;
    var o = a.createOscillator(), g = a.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(320, t);
    o.frequency.exponentialRampToValueAtTime(80, t + .22);
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(.3, t + .02);
    g.gain.exponentialRampToValueAtTime(.0001, t + .28);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + .3);

    // el "spray": un chorrito de ruido filtrado, corto
    var n = a.sampleRate * .14;
    var buf = a.createBuffer(1, n, a.sampleRate);
    var data = buf.getChannelData(0);
    for(var i = 0; i < n; i++){ data[i] = (Math.random() * 2 - 1) * (1 - i / n); }
    var src = a.createBufferSource(); src.buffer = buf;
    var bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800;
    var ng = a.createGain();
    ng.gain.setValueAtTime(.22, t);
    ng.gain.exponentialRampToValueAtTime(.0001, t + .14);
    src.connect(bp); bp.connect(ng); ng.connect(a.destination);
    src.start(t);
  }catch(e){}
}
function pop(freq, dur){
  var a = audio(); if(!a) return;
  try{
    var f = freq || 520, d = dur || .16;
    var o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.type = 'sine';
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 1.9, t + d);
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(.26, t + .02);
    g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + d + .02);
  }catch(e){}
}
function fanfare(){
  [523, 659, 784, 1047].forEach(function(f, i){
    setTimeout(function(){ pop(f, .2); }, i * 110);
  });
}
/* =====================================================================
   UBICACION EN PANTALLA — mapeada a `fondo-tortuguitas.png`, no a la
   pantalla.

   El fondo se pinta con `background-size:cover` (ver el comentario del
   CSS): la foto tapa toda la pantalla siempre, recortando lo que sobre
   segun la ventana. `imgAPantalla` hace la misma cuenta que hace el
   navegador para pintar el `cover` — mismo `Math.max(ancho, alto)` y
   mismo `background-position` — asi que una fraccion de la foto (0..1,
   igual que un viewBox) cae siempre sobre lo mismo del dibujo.

   `ZONA_ARENA` y `ZONA_MAR` (donde arrancan y donde nadan) NO salen de
   mirar la foto sola: salen de dos capturas marcadas a mano sobre el
   juego corriendo — el circulo de "donde pueden estar en tierra" y el de
   "donde pueden estar en el agua" — pasadas a fracciones de la foto con
   esta misma cuenta. `COLS_ARENA`/`COLS_MAR` son cuantas columnas usa la
   grilla de dispersion de cada una (ver `sortearLayout()` mas abajo): la
   arena entra comoda en una de 3, el mar — mas apretado contra la orilla
   — en una de 2.

   El tamano de la tortuga (`actualizarTamano()`) mide las dos celdas —
   arena y mar son geometrias distintas — y usa la mas chica, porque la
   MISMA tortuga pasa por las dos. */
var ART_W = 1280, ART_H = 720;   // tamano real de fondo-tortuguitas.png
var ART_POS_X = 0.05, ART_POS_Y = 0.5;   // debe coincidir con el `background-position` del CSS

var COLS_ARENA = 3, COLS_MAR = 2;
var ZONA_ARENA = { x0:0.441, x1:0.992, y0:0.537, y1:0.889 };
// El circulo de agua que marcaron es mas grande que el agua limpia que
// tiene la foto: la orilla es diagonal (no una linea recta) y tiene
// puntas de arena y de roca metiendose en el agua, asi que un rectangulo
// que la siga de cerca (mas ancho que alto, pegado a la orilla) siempre
// termina agarrando alguna de esas puntas por una esquina. La solucion
// no fue ajustar numeros a ojo ni por color de pixel (la arena mojada
// junto al agua tiene un tono muy parecido a la espuma, y los intentos
// por color daban falsos positivos y negativos) — fue DIBUJAR el
// rectangulo candidato sobre la foto y mirarlo. Este ademas tiene que
// entrar en 1 SOLA columna (angosto de mas) para "una tortuga por fila"
// — se ve en fila india, nada natural. `y0` lo baja lo justo para dejar
// margen contra la roca con musguito que hay arriba (ver la foto): mas
// arriba de eso hay que arrimarse a la orilla, que es donde estaba el
// problema original.
var ZONA_MAR = { x0:0.01, x1:0.21, y0:0.58, y1:0.97 };

/* El fondo (`background` en el CSS) se pinta sobre el BODY entero —
   header y consigna incluidos, aunque ahi arriba se vea tapado por ellos
   — no sobre `#escena`. `#escena` es mas bajo que el body (le falta lo
   que ocupan el header y la consigna), asi que esta cuenta va SIEMPRE
   sobre el `body`, nunca sobre `#escena` — si usara el tamano de
   `#escena`, el "achicado" (`dispH`) le saldria distinto al que el
   navegador uso de verdad para pintar el fondo. Recien al final se resta
   la esquina de `#escena` (`er.left/er.top`) porque el JS pinta la
   tortuga con `left/top` relativos a `#escena`, no al body. */
function coverParams(){
  var b = document.body.getBoundingClientRect();
  var escala = Math.max(b.width / ART_W, b.height / ART_H);
  var dispW = ART_W * escala, dispH = ART_H * escala;
  return {
    dispW: dispW, dispH: dispH,
    offX: (b.width  - dispW) * ART_POS_X,
    offY: (b.height - dispH) * ART_POS_Y
  };
}
function imgAPantalla(fx, fy){
  var c = coverParams();
  var er = escena.getBoundingClientRect();
  return { x: c.offX + fx * c.dispW - er.left, y: c.offY + fy * c.dispH - er.top };
}
function pantallaAImg(px, py){
  var c = coverParams();
  var er = escena.getBoundingClientRect();
  return { x: (px + er.left - c.offX) / c.dispW, y: (py + er.top - c.offY) / c.dispH };
}

// el limite mar/arena de la foto es diagonal (la orilla se curva): esta
// recta lineal lo sigue lo bastante bien entre y=0.60 y y=0.97, que es la
// unica franja donde hace falta (ver ENTREGAR_Y mas abajo)
function limiteMarEnY(fy){
  var y = Math.max(0.60, Math.min(0.97, fy));
  return 0.19 + (y - 0.60) * 0.55;
}
function esMar(fx, fy){
  if(fy < 0.32 || fy > 0.97) return false;   // cielo arriba, o afuera del cuadro abajo
  return fx < limiteMarEnY(fy);
}

/* =====================================================================
   DISPERSAR EN UNA ZONA — arena Y mar usan la misma idea.

   La zona se reparte en una grilla de `cols` x filas, se baraja el orden
   de las celdas y cada tortuguita cae en un punto al azar DENTRO de su
   celda (con un margen `PAD` para no quedar pegada a la celda vecina).
   Eso da un desparramo que se ve natural pero nunca las apila una sobre
   otra — ni "desordenadas por la playa" ni amontonadas en el agua.

   Las columnas NO se calculan solas con sqrt(n): `COLS_ARENA`/`COLS_MAR`
   se fijan a mano mirando cuanto ancho real hay para repartir en cada
   zona (ver el comentario grande de arriba).

   El sorteo (`arenaLayout`/`marLayout`) se guarda una sola vez por
   ronda, no en cada `slotsArena()`/`slotsMar()`: si se sorteara de nuevo
   en cada llamada, el tamano que calcula `actualizarTamano()` (que mide
   la celda) y las posiciones donde el JS realmente dibuja terminarian
   mirando dos sorteos distintos. Se vuelve a sortear en `reiniciar()`,
   para que cada partida se vea distinta. */
// PAD no es un margen cualquiera: tiene que dejarle lugar al TAMANO para
// que nunca se pisen. Si una tortuga cae en el borde permitido de su
// celda (a PAD de distancia del borde real), la mitad de su ancho no
// puede pasarse de ahi — si no, invade la celda vecina. Esa cuenta da
// tamano <= 2*PAD*celda, que es de donde sale el factor de abajo en
// `tamanoEnZona()`. Subir PAD sin bajar ese factor (o al reves) vuelve a
// abrir la puerta a que se pisen. En .4 el bamboleo queda mas discreto
// (el punto solo se mueve dentro del 20% central de la celda) pero deja
// usar tortugas bastante mas grandes que con .2-.3 sin arriesgar nada.
var PAD = 0.4;
var arenaLayout = null, marLayout = null;

function sortearLayout(n, cols){
  cols = Math.min(n, cols);
  var rows = Math.ceil(n / cols);
  var celdas = [];
  for(var r = 0; r < rows; r++){ for(var c = 0; c < cols; c++){ celdas.push({ c:c, r:r }); } }
  for(var i = celdas.length - 1; i > 0; i--){   // Fisher-Yates
    var j = (Math.random() * (i + 1)) | 0;
    var tmp = celdas[i]; celdas[i] = celdas[j]; celdas[j] = tmp;
  }
  var rel = [];
  for(var k = 0; k < n; k++){
    var cel = celdas[k];
    rel.push({
      fx: (cel.c + PAD + Math.random() * (1 - 2 * PAD)) / cols,
      fy: (cel.r + PAD + Math.random() * (1 - 2 * PAD)) / rows
    });
  }
  return { cols:cols, rows:rows, rel:rel };
}
/* ZONA_ARENA/ZONA_MAR son el circulo que marcaron a mano SOBRE UNA
   VENTANA PUNTUAL (1437x660), en fracciones DE LA FOTO — eso ya es
   independiente del tamano de pantalla —, pero con `background-size:
   cover` no alcanza con eso para el LIMITE DE ABAJO: en una ventana mas
   ancha y mas baja que aquella, `cover` agranda la foto todavia mas para
   taparle el alto (`dispH` crece), y el mismo y1 que en 660px de alto
   quedaba comodo dentro de la pantalla cae AFUERA en una ventana mas
   baja — las tortugas de esa fila quedan recortadas por el
   `overflow:hidden` de `main` y se pierden de vista.

   `zonaVisible()` no le pisa el y1 a la zona porque si: calcula, con el
   tamano REAL de la ventana de ahora, hasta que fraccion de la FOTO se
   puede bajar sin pasarse del borde de abajo (con `MARGEN_INFERIOR` de
   colchon, en fraccion del alto de la foto) y usa lo que sea MAS CHICO
   entre eso y el y1 que marcaron. El numero de `MARGEN_INFERIOR` se
   ajusto para reproducir casi exacto el y1 de la marca (0.889) en la
   ventana 1437x660 donde se marco — ahi no cambia nada; en una mas baja,
   la zona se acorta sola en vez de dejar tortugas afuera de cuadro. */
var MARGEN_INFERIOR = 0.02;
function zonaVisible(zona){
  var c = coverParams();
  var er = escena.getBoundingClientRect();
  // er.bottom, no er.height: el borde que importa es el de ABAJO de
  // #escena en la pantalla (donde lo corta `overflow:hidden`), medido
  // desde el mismo origen (el body) que usa `coverParams()`.
  var y1Max = (er.bottom - c.offY) / c.dispH - MARGEN_INFERIOR;
  return { x0:zona.x0, x1:zona.x1, y0:zona.y0, y1:Math.min(zona.y1, Math.max(zona.y0 + 0.05, y1Max)) };
}

function ubicarEnZona(layout, zona){
  return layout.rel.map(function(p){
    return imgAPantalla(zona.x0 + p.fx * (zona.x1 - zona.x0), zona.y0 + p.fy * (zona.y1 - zona.y0));
  });
}
function slotsArena(){ return ubicarEnZona(arenaLayout, zonaVisible(ZONA_ARENA)); }
function slotsMar(){ return ubicarEnZona(marLayout, zonaVisible(ZONA_MAR)); }

/* El tamano de la tortuga NO puede ser un clamp() fijo en vw: en una
   ventana ancha y baja `cover` agranda muchisimo la foto, y un tamano
   fijo termina mas grande que la celda real y se pisan. Se mide la celda
   REAL de las dos zonas — arena y mar son geometrias distintas — y se
   usa la mas chica: el tamano tiene que entrar en las dos a la vez,
   porque la MISMA tortuga pasa por las dos.
   `ART_ASPECT` es ancho/alto del PNG recortado (la tortuga es un dibujo
   apaisado, no un emoji cuadrado), asi el ancho tambien entra en la celda
   y no solo el alto. El factor `2*PAD` (no un numero suelto como .82) es
   el que garantiza que, sumado al bamboleo que permite `sortearLayout()`,
   nunca se pase al terreno de la celda vecina — ver el comentario de
   `PAD` mas arriba. */
var ART_ASPECT = 450 / 198;   // medidas del PNG recortado, ver tortugas.js
var MARGEN = 2 * PAD * 0.9;   // *0.9: margen de mas, contra el redondeo
function tamanoEnZona(layout, zona){
  var c = coverParams();   // la escala del `cover` es la del body, ver coverParams()
  var celdaW = (zona.x1 - zona.x0) * c.dispW / layout.cols;
  var celdaH = (zona.y1 - zona.y0) * c.dispH / layout.rows;
  return Math.min(celdaH, celdaW / ART_ASPECT) * MARGEN;
}
function actualizarTamano(){
  var tam = Math.min(
    tamanoEnZona(arenaLayout, zonaVisible(ZONA_ARENA)),
    tamanoEnZona(marLayout, zonaVisible(ZONA_MAR))
  );
  escena.style.setProperty('--tam-tortuga', Math.max(24, Math.min(84, tam)) + 'px');
}

/* =====================================================================
   LAS TORTUGAS
   ===================================================================== */
function crearTortugas(){
  if(!arenaLayout){ arenaLayout = sortearLayout(CANTIDAD, COLS_ARENA); }
  if(!marLayout){ marLayout = sortearLayout(CANTIDAD, COLS_MAR); }
  var slots = slotsArena();
  actualizarTamano();
  tortugas = [];
  for(var i = 0; i < CANTIDAD; i++){
    var el = document.createElement('div');
    el.className = 'tortuga';
    el.innerHTML = '<img class="cuerpo" src="' + ARTE + '" alt="" draggable="false">';
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', 'Tortuguita, arrastrala al mar');
    escena.appendChild(el);
    var t = { el:el, entregada:false, slotArena:slots[i] };
    ubicar(t, slots[i]);
    engancharDrag(t);
    tortugas.push(t);
  }
}
function ubicar(t, p){
  t.el.style.left = p.x + 'px';
  t.el.style.top  = p.y + 'px';
}
function reacomodar(){
  actualizarTamano();
  var sa = slotsArena(), sm = slotsMar();
  var iEntregada = 0;
  tortugas.forEach(function(t, i){
    if(t.entregada){ ubicar(t, sm[iEntregada++]); }
    else{ t.slotArena = sa[i]; if(!t.arrastrando){ ubicar(t, sa[i]); } }
  });
}

function engancharDrag(t){
  var el = t.el;
  el.addEventListener('pointerdown', function(e){
    if(t.entregada || locked) return;
    t.arrastrando = true;
    el.classList.add('arrastrando');
    try{ el.setPointerCapture(e.pointerId); }catch(err){}
    audio();
    mover(e);
    e.preventDefault();
  });
  el.addEventListener('pointermove', function(e){
    if(!t.arrastrando) return;
    mover(e);
    e.preventDefault();
  });
  el.addEventListener('pointerup', function(e){
    if(!t.arrastrando) return;
    soltar(e);
  });
  el.addEventListener('pointercancel', function(e){
    if(!t.arrastrando) return;
    soltar(e);
  });

  function mover(e){
    var r = escena.getBoundingClientRect();
    var x = Math.max(0, Math.min(r.width,  e.clientX - r.left));
    var y = Math.max(0, Math.min(r.height, e.clientY - r.top));
    ubicar(t, { x:x, y:y });
  }
  function soltar(e){
    t.arrastrando = false;
    el.classList.remove('arrastrando');
    try{ el.releasePointerCapture(e.pointerId); }catch(err){}

    var r = escena.getBoundingClientRect();
    var x = Math.max(0, Math.min(r.width,  e.clientX - r.left));
    var y = Math.max(0, Math.min(r.height, e.clientY - r.top));
    var fr = pantallaAImg(x, y);

    if(esMar(fr.x, fr.y)){
      entregar(t);
    }else{
      ubicar(t, t.slotArena);   // vuelve sola: sin castigo, solo intentar de nuevo
    }
  }
}

var locked = false;

function entregar(t){
  t.entregada = true;
  el_chapoteo(t);
  splashSound();

  var i = entregadas;               // indice ANTES de sumar: es su lugar en la fila del mar
  entregadas++;
  ubicar(t, slotsMar()[i]);
  t.el.classList.add('en-mar');

  actualizarContador(entregadas);

  // En la quinta, `terminar()` (fanfarria + confeti + la cancion) no
  // arranca con un setTimeout a ojo: espera a que termine de sonar SOLO
  // el clip de "cinco" (ver `alTerminar` en `reproducirNumero`). Un
  // tiempo fijo se desincroniza apenas se recorta un clip mas largo o mas
  // corto; el evento `ended` del propio audio no.
  var esUltima = entregadas >= CANTIDAD;
  if(esUltima){ locked = true; }

  var dato = NUMEROS[i];
  setTimeout(function(){
    if(dato && dato.audio){ reproducirNumero(dato.audio, esUltima ? terminar : null); }
    else if(esUltima){ terminar(); }
  }, 150);
}

// El mismo <audio> se reusa para los cinco recortes: no hace falta uno por
// numero, alcanza con cambiarle el `src` cada vez. `alTerminar`, si viene,
// se llama cuando el clip termina de sonar SOLO (evento `ended`) — y
// tambien si el navegador bloquea el autoplay, para que el juego no se
// quede esperando un sonido que nunca va a sonar.
function reproducirNumero(archivo, alTerminar){
  var v = document.getElementById('voz-numero');
  v.onended = null;
  if(alTerminar){ v.onended = function(){ v.onended = null; alTerminar(); }; }
  try{
    v.src = archivo;
    v.currentTime = 0;
    var p = v.play();
    if(p && p.catch){ p.catch(function(){ if(alTerminar){ v.onended = null; alTerminar(); } }); }
  }catch(e){ if(alTerminar){ v.onended = null; alTerminar(); } }
}

function el_chapoteo(t){
  var r = escena.getBoundingClientRect();
  var x = parseFloat(t.el.style.left), y = parseFloat(t.el.style.top);
  var s = document.createElement('div');
  s.className = 'chapoteo';
  s.textContent = '💦';
  s.style.left = x + 'px';
  s.style.top  = y + 'px';
  escena.appendChild(s);
  setTimeout(function(){ s.remove(); }, 600);
}

/* =====================================================================
   EL CONTADOR: "1 🐢", "1 2 🐢🐢"… crece de a uno con cada tortuguita.
   ===================================================================== */
function actualizarContador(n){
  var nums = [];
  for(var i = 0; i < n; i++){
    nums.push((NUMEROS[i] && NUMEROS[i].texto) || String(i + 1));
  }
  contadorEl.innerHTML = n
    ? '<span class="num">' + nums.join(' ') + '</span> <span class="emojis">' + repetirArte(n) + '</span>'
    : '';
  contadorEl.classList.remove('pulso');
  void contadorEl.offsetWidth;   // reinicia la animacion aunque se repita
  contadorEl.classList.add('pulso');
}

/* =====================================================================
   CIERRE DE LA RONDA
   ===================================================================== */
function terminar(){
  promptEl.textContent = '¡Muy bien! 🎉';
  fanfare();
  confetti();

  // El "arrastrar y soltar" que acaba de terminar la ronda ES el gesto del
  // usuario que habilita el autoplay con sonido — por eso este .play() no
  // lo bloquea el navegador. La tarjeta no sale con un setTimeout a ojo:
  // espera a que la cancion termine de sonar SOLA (evento `ended`), igual
  // que el clip de cada numero — y si el navegador igual bloquea el
  // autoplay, sale de una para no dejar al chico esperando algo que no va
  // a sonar.
  var cancion = document.getElementById('cancion');
  cancion.onended = function(){ cancion.onended = null; showCard(); };
  try{
    cancion.currentTime = 0;
    var p = cancion.play();
    if(p && p.catch){ p.catch(function(){ cancion.onended = null; showCard(); }); }
  }catch(e){ cancion.onended = null; showCard(); }
}

function showCard(){
  document.getElementById('card-emoji').innerHTML = repetirArte(CANTIDAD);
  document.getElementById('card-hint').textContent =
    '🎵 Cinco Tortuguitas — tocá para jugar de nuevo';
  cardEl.classList.add('show');
}
function hideCard(){ cardEl.classList.remove('show'); }
function repetirArte(n){
  var o = '';
  for(var i = 0; i < n; i++){ o += '<img src="' + ARTE + '" alt="">'; }
  return o;
}

function reiniciar(){
  hideCard();
  locked = false;
  entregadas = 0;
  promptEl.textContent = '¡Llevá las tortuguitas al mar!';
  actualizarContador(0);
  try{ var c = document.getElementById('cancion'); c.pause(); c.currentTime = 0; }catch(e){}
  tortugas.forEach(function(t){ t.el.remove(); });
  arenaLayout = sortearLayout(CANTIDAD, COLS_ARENA);   // desparramo nuevo en cada partida
  marLayout   = sortearLayout(CANTIDAD, COLS_MAR);
  crearTortugas();
}

document.getElementById('btn-again').addEventListener('click', function(e){
  e.stopPropagation(); reiniciar();
});
cardEl.addEventListener('click', function(e){
  if(e.target === cardEl){ reiniciar(); }
});

/* =====================================================================
   EFECTOS: confeti al terminar (canvas, sin assets)
   ===================================================================== */
var parts = [], fxRAF = null;
function sizeFx(){
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  fx.width  = Math.floor(window.innerWidth * dpr);
  fx.height = Math.floor(window.innerHeight * dpr);
  fx.style.width  = window.innerWidth + 'px';
  fx.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
sizeFx();
function confetti(){
  var cols = ['#2C97D8', '#FFD84D', '#EF658E', '#2EC4B6', '#FFFFFF', '#8BC34A'];
  var n = reduced ? 24 : 90;
  for(var i = 0; i < n; i++){
    parts.push({
      x:Math.random() * window.innerWidth,
      y:-20 - Math.random() * 160,
      vx:(Math.random() - .5) * 2.4,
      vy:2 + Math.random() * 3.4,
      g:.06, r:4 + Math.random() * 5, life:1, dec:.006,
      c:cols[(Math.random() * cols.length) | 0],
      rot:Math.random() * 6.28, vr:(Math.random() - .5) * .3
    });
  }
  runFx();
}
function runFx(){
  if(fxRAF) return;
  fxRAF = requestAnimationFrame(function loop(){
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for(var i = parts.length - 1; i >= 0; i--){
      var p = parts[i];
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.life -= p.dec; p.rot += p.vr;
      if(p.life <= 0 || p.y > window.innerHeight + 40){ parts.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.fillStyle = p.c;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.5); ctx.restore();
    }
    ctx.globalAlpha = 1;
    if(parts.length){ fxRAF = requestAnimationFrame(loop); }
    else{ fxRAF = null; ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); }
  });
}

/* =====================================================================
   ARRANQUE
   ===================================================================== */
window.addEventListener('resize', function(){ sizeFx(); reacomodar(); });
document.addEventListener('gesturestart', function(e){ e.preventDefault(); });

actualizarContador(0);
crearTortugas();

}

global.TukuToonTurtlesPage = TukuToonTurtlesPage;

})(window);
