/* =====================================================================
   MOTOR DE GLOBOS — engine del minijuego de explotar globos.
   Mismo criterio que motor/motor.js en a-pintar y motor/motor-trazos.js
   en el de trazos: el motor arma TODO el DOM por JS (header, consigna,
   escenario, selector, tarjeta) y la pagina HTML en si es minima.

   Uso desde una pagina:

       <link rel="stylesheet" href="motor/motor-globos.css">
       <script src="globos.js"></script>
       <script src="motor/motor-globos.js"></script>
       <script>TukuToonBalloonPage({ rondas:GLOBOS_RONDAS, colores:GLOBOS_COLORES });</script>

   Config aceptada:
     rondas     array de rondas (ver globos.js). Obligatorio.
     colores    paleta de globos (ver globos.js). Obligatorio.
     ronda      id de una ronda sola: esconde el selector de abajo
     vuelo      true para arrancar con los globos volando (default false)
     titulo     texto grande del header            (default 'TukuToon')
     subtitulo  bajada del header                  (default 'GLOBOS')
     menuHref   si viene, agrega boton de volver al menu
     storeKey   clave de localStorage del progreso (default abajo)

   ---------------------------------------------------------------------
   COMO FUNCIONA

   QUIETOS vs VOLANDO. Son el mismo juego con una diferencia de motor: si
   `vuelo` esta apagado no hay loop de animacion y los globos son blancos
   fijos (tocar donde se ve: sirve desde los 2 anos); si esta prendido
   corre un requestAnimationFrame que los sube despacio, y pasa a ser un
   juego de seguimiento y anticipacion (4-5 anos). Lo elige el adulto con
   el boton del header, no la ronda.

   NO HAY FORMA DE PERDER. Un globo que se va por arriba no se pierde:
   vuelve a entrar por abajo (ver `subir`). No hay reloj, no hay puntaje
   que baje, y tocar el globo equivocado no saca nada — solo se bambolea.
   A esta edad el fracaso no ensena nada, y el chico juega sin adulto al
   lado que le explique que paso.

   EL TOQUE NO SE RESUELVE CON pointer-events. Los globos tienen
   pointer-events:none y el toque lo escucha el SVG entero: se busca el
   globo mas cercano al dedo y se acepta si cae dentro de TOL_TOQUE
   radios. Es el mismo criterio de perdon que la tolerancia del juego de
   trazos, y ademas evita el problema de siempre con blancos en
   movimiento — pegarle al borde de un globo que ya se corrio.

   LAS COORDENADAS SON DOBLES. El modelo guarda cada globo en unidades
   normalizadas (nx, ny de 0 a 1) y el viewBox del SVG se setea en pixeles
   reales de pantalla. Asi el globo nunca sale ovalado, y al rotar el
   celular o cambiar de tamano la escena se re-arma sola sin que nada
   salte de lugar (ver `recalcular`).
   ===================================================================== */
(function(global){
'use strict';

function TukuToonBalloonPage(cfg){
  cfg = cfg || {};

  var COLORES = cfg.colores || global.GLOBOS_COLORES;
  var RONDAS  = cfg.rondas  || global.GLOBOS_RONDAS;
  if(!RONDAS || !RONDAS.length || !COLORES || !COLORES.length){
    document.body.innerHTML = '<p style="font:16px sans-serif;padding:24px">' +
      'No llegaron las rondas: falta cargar globos.js antes que el motor.</p>';
    return;
  }

  // una ronda sola (?ronda=azul): sin selector abajo
  var unaSola = false;
  if(cfg.ronda){
    var iPedida = indiceDeRonda(cfg.ronda);
    if(iPedida >= 0){ unaSola = true; }
  }

  buildDOM(cfg, unaSola);


/* =====================================================================
   DOM — lo arma el motor entero, la pagina no trae markup
   ===================================================================== */
function buildDOM(cfg, unaSola){
  var titulo    = cfg.titulo    || 'TukuToon';
  var subtitulo = cfg.subtitulo || 'GLOBOS';

  var volver = cfg.menuHref
    ? '<a class="icon-btn" id="menu-btn" href="' + cfg.menuHref +
      '" title="Volver al menu" aria-label="Volver al menu">&#8592;</a>'
    : '';

  document.body.innerHTML =
    '<div class="sky" aria-hidden="true">' +
      '<div class="cloud c1"></div><div class="cloud c2"></div><div class="cloud c3"></div>' +
    '</div>' +

    '<header>' +
      volver +
      '<button class="icon-btn" id="reset-btn" title="Empezar esta ronda de nuevo" ' +
        'aria-label="Empezar de nuevo">&#8634;</button>' +
      '<button class="icon-btn modo-btn" id="modo-btn" ' +
        'title="Globos quietos o volando" ' +
        'aria-label="Cambiar entre globos quietos y volando">QUIETOS</button>' +
      '<div class="brand">' + titulo + '<small>' + subtitulo + '</small></div>' +
      '<div class="stars" id="stars" aria-label="Rondas completadas"></div>' +
    '</header>' +

    '<p class="prompt" id="prompt"></p>' +

    '<main><svg id="stage" preserveAspectRatio="xMidYMid meet"></svg></main>' +

    '<footer id="picker"' + (unaSola ? ' class="oculto"' : '') + '></footer>' +
    '<canvas id="fx"></canvas>' +

    '<div id="card" role="dialog" aria-modal="true">' +
      '<div class="card-box">' +
        '<div class="card-globos" id="card-globos"></div>' +
        '<div class="card-word" id="card-word"></div>' +
        '<div class="card-hint">Tocá para seguir jugando</div>' +
        '<div class="card-actions">' +
          '<button class="btn-again" id="btn-again">&#8634; Otra vez</button>' +
          '<button class="btn-next" id="btn-next">Siguiente &#8594;</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

/* ---------- el dibujo del globo, en unidades locales ----------
   El cuerpo esta centrado en (0,0) y mide 200 de ancho. Todo lo demas
   —el nudo, el hilo, la cara— cuelga de ahi. El motor solo escala: un
   globo de radio R en pantalla es este dibujo por R/100.
   Si se cambia el alto del dibujo hay que revisar los transform-origin
   en porcentaje de motor-globos.css. */
var CUERPO = 'M0 -118 C 60 -118 100 -64 100 -4 C 100 58 56 110 14 124 ' +
             'L 0 128 L -14 124 C -56 110 -100 58 -100 -4 C -100 -64 -60 -118 0 -118 Z';
var NUDO   = 'M-15 122 L15 122 L0 148 Z';
var HILO   = 'M0 146 C 20 166 -14 186 5 208';

/* El globo se arma nodo por nodo con createElementNS, igual que las letras
   en motor-trazos.js, y NO con innerHTML: adentro de un <g> ya existente,
   innerHTML no es confiable entre navegadores — hay versiones que parsean
   ese markup como HTML y dejan elementos del namespace equivocado, que no
   dibujan nada y tampoco dan error. */
function nodo(tag, attrs){
  var e = document.createElementNS(SVG_NS, tag);
  for(var k in attrs){
    if(Object.prototype.hasOwnProperty.call(attrs, k)){ e.setAttribute(k, attrs[k]); }
  }
  return e;
}
function cara(){
  var g = nodo('g', { 'class':'face' });
  var ojos = nodo('g', { 'class':'eyes' });
  ojos.appendChild(nodo('ellipse', { cx:-33, cy:-22, rx:9, ry:12 }));
  ojos.appendChild(nodo('ellipse', { cx:33,  cy:-22, rx:9, ry:12 }));
  g.appendChild(ojos);
  g.appendChild(nodo('circle', { 'class':'cheek', cx:-57, cy:10, r:13 }));
  g.appendChild(nodo('circle', { 'class':'cheek', cx:57,  cy:10, r:13 }));
  g.appendChild(nodo('path',   { 'class':'mouth', d:'M-21 14 Q 0 38 21 14' }));
  return g;
}
/* El dibujo de un globo, dentro de un <g>. Sale igual para el escenario,
   los botones de abajo y la tarjeta final: un solo dibujo, un solo lugar
   donde tocarlo. `clase` es lo que necesita el escenario para colgarle las
   animaciones (ver los transform-origin en motor-globos.css). */
function globoNodo(color, conCara, clase){
  var g = nodo('g', clase ? { 'class':clase } : {});
  g.appendChild(nodo('path',    { 'class':'hilo',   d:HILO }));
  g.appendChild(nodo('path',    { 'class':'nudo',   d:NUDO, fill:color }));
  g.appendChild(nodo('path',    { 'class':'cuerpo', d:CUERPO, fill:color }));
  g.appendChild(nodo('ellipse', { 'class':'brillo', cx:-42, cy:-56, rx:20, ry:30,
                                  transform:'rotate(-20 -42 -56)' }));
  if(conCara){ g.appendChild(cara()); }
  return g;
}
/* Un globo suelto en su propio <svg>, para botones y tarjeta. */
function globoSuelto(color, conCara){
  var s = nodo('svg', { viewBox:'-116 -136 232 362', 'aria-hidden':'true' });
  s.appendChild(globoNodo(color, conCara));
  return s;
}

/* ---------- parametros ---------- */
var SVG_NS     = 'http://www.w3.org/2000/svg';
var STORE_KEY  = cfg.storeKey || 'tukutoon:globos:completadas';
var TOL_TOQUE  = 1.4;    // radio de perdon del toque, en radios de globo
var R_MIN      = 24;     // un globo mas chico que esto no se puede tocar
var R_MAX      = 108;    // ni mas grande que esto, o parece otro juego
var CELDA_ANCHO = 2.25;  // ancho minimo de celda, en radios (globo + aire)
/* Alto minimo de celda. El globo con hilo mide 3,26 radios: pedir 3,75 le
   deja media cabeza de aire a cada fila. No es decoracion — ese sobrante es
   todo el margen que tiene el globo para correrse de su lugar exacto, y sin
   el las filas quedan alineadas como una grilla de escuela. */
var CELDA_ALTO  = 3.75;
var CELDA_CUERPO = 2.55; // solo el cuerpo + aire: es lo que no se puede pisar
/* El dibujo no esta centrado en el cuerpo: sube 1,18 radios hasta la
   coronilla y baja 2,08 hasta la punta del hilo. Para que el globo entero
   quede centrado en su celda, el cuerpo va esta diferencia mas arriba del
   centro — si no, la fila de abajo termina pegada al borde. */
var DESFASE_Y  = (2.08 - 1.18) / 2;
var SUBE_MIN   = 0.050;  // altos de pantalla por segundo: 20 s de recorrido
var SUBE_MAX   = 0.085;  // ...y 12 s el mas rapido
var VAIVEN     = 0.30;   // cuanto se mece de costado, en radios
var ERRORES_PISTA = 2;   // toques errados seguidos antes de dar una pista

var NUMEROS = ['cero','uno','dos','tres','cuatro','cinco','seis','siete',
               'ocho','nueve','diez','once','doce'];

/* ---------- estado ---------- */
var svg      = document.getElementById('stage');
var fx       = document.getElementById('fx');
var ctx      = fx.getContext('2d');
var cardEl   = document.getElementById('card');
var promptEl = document.getElementById('prompt');
var mainEl   = document.querySelector('main');

var rIdx     = 0;      // ronda activa
var vuelo    = !!cfg.vuelo;
var globos   = [];
var faltan   = 0;      // globos del color pedido que quedan sin reventar
var errores  = 0;      // toques errados seguidos
var locked   = false;  // true mientras se festeja / hay tarjeta
var reventados = [];   // colores reventados, en orden: se ven en la tarjeta
var W = 0, H = 0, R = 40;
var loopRAF = null, ultimoTs = 0, tSeg = 0;
var tarjetaTO = null;  // la tarjeta final en camino, para poder cancelarla
var done     = loadDone();
var reduced  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- helpers chicos ---------- */
/* Si el minimo termina siendo mayor que el maximo (pasa cuando la pantalla
   todavia no tiene tamano y los margenes no entran), devuelve el medio en
   vez de quedarse pegado al minimo: asi un escenario degenerado no apila
   todos los globos en la misma esquina. */
function clamp(v, a, b){
  if(a > b) return (a + b) / 2;
  return v < a ? a : (v > b ? b : v);
}
function barajar(a){
  for(var i = a.length - 1; i > 0; i--){
    var j = (Math.random() * (i + 1)) | 0, t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function colorPorId(id){
  for(var i = 0; i < COLORES.length; i++){ if(COLORES[i].id === id) return COLORES[i]; }
  return COLORES[0];
}
function indiceDeRonda(id){
  for(var i = 0; i < RONDAS.length; i++){ if(RONDAS[i].id === id) return i; }
  return -1;
}
/* El color con el que se pinta el chrome de la ronda. La ronda libre no
   pide ningun color: ahi manda el amarillo de la marca. */
function colorDeRonda(r){ return r.objetivo ? colorPorId(r.objetivo).color : '#FFD84D'; }
function blancosDe(r){ return r.objetivo ? (r.blancos || 3) : r.cuantos; }

/* =====================================================================
   AUDIO (WebAudio, sin assets)
   ===================================================================== */
var AC = null, ruido = null;
function audio(){
  try{
    if(!AC){ var C = window.AudioContext || window.webkitAudioContext; if(C){ AC = new C(); } }
    if(AC && AC.state === 'suspended'){ AC.resume(); }
  }catch(e){ AC = null; }
  return AC;
}
function tono(freq, dur, vol, tipo){
  var a = audio(); if(!a) return;
  try{
    var o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.type = tipo || 'sine';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 1.9, t + dur);
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + .02);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + .02);
  }catch(e){}
}
/* El "pop". Un oscilador no suena a globo: lo que suena a globo es ruido
   blanco muy corto pasado por un filtro angosto. El buffer se genera una
   sola vez y lo que cambia de un globo a otro es la frecuencia del
   filtro, asi ocho globos seguidos no suenan identicos. */
function plop(){
  var a = audio(); if(!a) return;
  try{
    if(!ruido){
      var n = Math.ceil(a.sampleRate * .13);
      ruido = a.createBuffer(1, n, a.sampleRate);
      var d = ruido.getChannelData(0);
      for(var i = 0; i < n; i++){
        var caida = 1 - i / n;
        d[i] = (Math.random() * 2 - 1) * caida * caida * caida;
      }
    }
    var src = a.createBufferSource(); src.buffer = ruido;
    var bp = a.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 780 + Math.random() * 700;
    bp.Q.value = 1.4;
    var g = a.createGain(); g.gain.value = .55;
    src.connect(bp); bp.connect(g); g.connect(a.destination);
    src.start();
  }catch(e){}
  tono(920 + Math.random() * 260, .1, .12);
}
/* Ese no era. Grave, corto y suave: avisa sin retar. */
function noEra(){
  var a = audio(); if(!a) return;
  try{
    var o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.type = 'sine';
    o.frequency.setValueAtTime(300, t);
    o.frequency.exponentialRampToValueAtTime(180, t + .18);
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(.13, t + .02);
    g.gain.exponentialRampToValueAtTime(.0001, t + .2);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + .24);
  }catch(e){}
}
function fanfarria(){
  [523, 659, 784, 1047].forEach(function(f, i){
    setTimeout(function(){ tono(f, .2, .26); }, i * 110);
  });
}
function speak(text){
  try{
    if(!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();   // que no se encimen dos rondas rapidas
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES'; u.rate = .8; u.pitch = 1.25;
    window.speechSynthesis.speak(u);
  }catch(e){}
}

/* =====================================================================
   PROGRESO GUARDADO (local, por navegador)
   ===================================================================== */
function loadDone(){
  try{
    var raw = localStorage.getItem(STORE_KEY);
    var arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  }catch(e){ return []; }
}
function saveDone(){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(done)); }catch(e){}
}

/* =====================================================================
   UI: estrellas, selector de rondas y consigna
   ===================================================================== */
function buildStars(){
  var box = document.getElementById('stars');
  box.innerHTML = '';
  RONDAS.forEach(function(r){
    var s = document.createElementNS(SVG_NS, 'svg');
    s.setAttribute('viewBox', '0 0 100 100');
    s.setAttribute('class', 'star' + (done.indexOf(r.id) >= 0 ? ' on' : ''));
    var p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', 'M50 8 L62 38 L95 40 L69 60 L78 92 L50 74 L22 92 L31 60 L5 40 L38 38 Z');
    s.appendChild(p);
    box.appendChild(s);
  });
}
/* El boton de cada ronda es el globo que hay que reventar. La ronda libre
   son tres globos de colores distintos: un chico que todavia no lee ve de
   una si esa ronda pide un color o los acepta todos. */
function iconoDeRonda(r){
  if(r.objetivo){ return globoSuelto(colorPorId(r.objetivo).color, true); }
  var tres = ['rojo', 'amarillo', 'azul'];
  var s = nodo('svg', { viewBox:'-320 -146 640 372', 'aria-hidden':'true' });
  [-186, 0, 186].forEach(function(dx, i){
    var g = globoNodo(colorPorId(tres[i]).color, false);
    g.setAttribute('transform', 'translate(' + dx + ',' + (i === 1 ? -16 : 10) + ')');
    s.appendChild(g);
  });
  return s;
}
function buildPicker(){
  var box = document.getElementById('picker');
  box.innerHTML = '';
  RONDAS.forEach(function(r, i){
    var b = document.createElement('button');
    b.className = 'rbtn' + (i === rIdx ? ' sel' : '') + (done.indexOf(r.id) >= 0 ? ' done' : '');
    b.appendChild(iconoDeRonda(r));
    b.setAttribute('aria-label', r.objetivo
      ? 'Globos ' + colorPorId(r.objetivo).plural
      : 'Todos los globos');
    // el selector nunca se bloquea: cambiar de ronda siempre es seguro,
    // incluso durante el festejo
    b.addEventListener('click', function(){ hideCard(); cargarRonda(i); });
    box.appendChild(b);
  });
}
function refreshChrome(){
  buildStars();
  buildPicker();
  var c = colorDeRonda(RONDAS[rIdx]);
  cardEl.style.setProperty('--c', c);
  var mb = document.getElementById('modo-btn');
  mb.textContent = vuelo ? 'VOLANDO' : 'QUIETOS';
  mb.className = 'icon-btn modo-btn' + (vuelo ? ' vuela' : '');
}
function ponerConsigna(r){
  var c = colorDeRonda(r);
  promptEl.style.setProperty('--c', r.objetivo ? c : '#FFD84D');
  promptEl.innerHTML = r.consigna ? r.consigna
    : (r.objetivo
        ? 'Explotá solo los globos <b>' + colorPorId(r.objetivo).plural + '</b>'
        : 'Explotá todos los globos');
}

/* =====================================================================
   ARMADO DE LA RONDA
   ===================================================================== */
/* Que color le toca a cada globo. Los distractores se reparten entre
   TODOS los otros colores antes de repetir ninguno: con cinco colores
   sobrantes y cinco distractores, sale uno de cada — asi el chico compara
   el color pedido contra varios, no contra uno solo repetido. */
function reparto(r){
  var lista = [], i;
  if(!r.objetivo){
    var paleta = barajar(COLORES.slice());
    for(i = 0; i < r.cuantos; i++){
      lista.push({ colorId: paleta[i % paleta.length].id, blanco: true });
    }
    return barajar(lista);
  }
  var n = blancosDe(r);
  for(i = 0; i < n; i++){ lista.push({ colorId: r.objetivo, blanco: true }); }
  var otros = barajar(COLORES.filter(function(c){ return c.id !== r.objetivo; }));
  for(i = 0; i < r.cuantos - n; i++){
    lista.push({ colorId: otros[i % otros.length].id, blanco: false });
  }
  return barajar(lista);
}

/* La grilla existe para una sola cosa: que dos globos no se pisen. Cada uno
   cae en una celda distinta y se corre un poco adentro de la suya, en vez de
   tirar posiciones al azar y rezar. Cuantas columnas salen de repartir el
   area disponible en celdas con la proporcion de un globo (mas altas que
   anchas), asi el tamano que sale es el mas grande que entra. */
function grilla(n){
  var aspecto = CELDA_ANCHO / CELDA_ALTO;   // la celda ideal es mas alta que ancha
  var cols = Math.round(Math.sqrt(n * (W / H) / aspecto));
  cols = Math.max(1, Math.min(cols, n));
  var rows = Math.ceil(n / cols);
  return { cols:cols, rows:rows, cw:W / cols, ch:H / rows };
}
/* Mide el escenario y deja dicho si esa medida sirve. Puede no servir: una
   pestana que carga en segundo plano, o un panel todavia sin abrir, dan un
   rectangulo de cero. Ahi no se puede repartir nada — se arma igual para no
   romper y el ResizeObserver vuelve a repartir cuando hay pantalla de
   verdad (ver `recalcular`). */
var medidaOk = false;
function medir(){
  var b = svg.getBoundingClientRect();
  var w = Math.round(b.width  || mainEl.clientWidth);
  var h = Math.round(b.height || mainEl.clientHeight);
  medidaOk = (w >= 60 && h >= 60);
  W = Math.max(1, w);
  H = Math.max(1, h);
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
}

function cargarRonda(i){
  rIdx = ((i % RONDAS.length) + RONDAS.length) % RONDAS.length;
  var r = RONDAS[rIdx];

  detenerVuelo();
  // El selector de abajo funciona incluso durante el festejo, asi que puede
  // haber una tarjeta en camino de la ronda anterior. Si no se cancela,
  // aparece sola un segundo despues, encima de la ronda recien empezada y
  // contando globos que ya no existen.
  if(tarjetaTO){ clearTimeout(tarjetaTO); tarjetaTO = null; }
  locked = false;
  errores = 0;
  reventados = [];
  globos = [];
  svg.innerHTML = '';

  medir();
  reparto(r).forEach(function(item){
    var col = colorPorId(item.colorId);

    // dos grupos anidados: el de afuera lleva la posicion (atributo, puesto
    // por JS) y el de adentro las animaciones (propiedad, puesta por CSS)
    var el = nodo('g', { 'class':'globo' });
    var anim = globoNodo(col.color, true, 'anim');
    el.appendChild(anim);
    svg.appendChild(el);

    // las animaciones de "ese no era" y de la pista se limpian solas al
    // terminar, asi el mismo globo las puede volver a disparar
    anim.addEventListener('animationend', function(){
      el.classList.remove('mal'); el.classList.remove('pista');
    });

    globos.push({
      el:el, anim:anim, color:col.color, colorId:col.id,
      blanco:item.blanco, reventado:false,
      nx:.5, ny:.5, px:0, py:0,
      vy:SUBE_MIN + Math.random() * (SUBE_MAX - SUBE_MIN),
      fase:Math.random() * 6.28,
      osc:.7 + Math.random() * .6
    });
  });

  faltan = globos.filter(function(b){ return b.blanco; }).length;
  repartirPosiciones();
  ponerConsigna(r);
  refreshChrome();
  if(vuelo) arrancarVuelo();
}

/* Le da a cada globo su celda y su lugar adentro de ella. Esta separado de
   `cargarRonda` porque tambien se usa al girar el celular: ahi la grilla
   cambia (cuatro columnas y dos filas no sirven en vertical) y hay que
   repartir de nuevo, sin rearmar los globos ni perder la ronda. */
function repartirPosiciones(){
  var g = grilla(globos.length);
  R = clamp(Math.min(g.cw / CELDA_ANCHO, g.ch / CELDA_ALTO), R_MIN, R_MAX);

  var celdas = [];
  for(var c = 0; c < g.cols; c++){
    for(var f = 0; f < g.rows; f++){ celdas.push({ c:c, f:f }); }
  }
  barajar(celdas);

  // Cuanto se puede correr adentro de su celda: lo que sobra de verdad, no
  // una fraccion fija. Con una fraccion fija, dos globos de celdas vecinas
  // se terminan tocando en el peor caso.
  //
  // A lo alto la cuenta reserva solo el CUERPO y no el hilo (CELDA_CUERPO
  // en vez de CELDA_ALTO): si no, la celda queda justa, la holgura da cero
  // y las filas salen alineadas como una grilla de escuela. Que el hilo de
  // uno pase por al lado del globo de abajo es lo que hacen los globos de
  // verdad; lo que no puede pasar es que se toquen los cuerpos, y eso lo
  // sigue garantizando reservar 2,55 radios de alto para un cuerpo que
  // mide 2.
  var holguraX = Math.max(0, g.cw - R * CELDA_ANCHO);
  var holguraY = Math.max(0, g.ch - R * CELDA_CUERPO);

  globos.forEach(function(b, k){
    var cel = celdas[k % celdas.length];
    b.nx = ((cel.c + .5) * g.cw + (Math.random() - .5) * holguraX) / W;
    b.ny = ((cel.f + .5) * g.ch - R * DESFASE_Y + (Math.random() - .5) * holguraY) / H;
  });
  acomodar();
}

/* Deja cada globo entero adentro de la pantalla y lo dibuja donde va.
   Volando no se recorta nada: ahi entrar y salir es el juego. */
function acomodar(){
  // los margenes se topean en .45: en una pantalla muy angosta el globo
  // ocupa mas de lo que hay y el rango se daria vuelta
  var mx     = Math.min((R * 1.12) / W, .45);
  var arriba = Math.min((R * 1.3)  / H, .45);
  var abajo  = Math.min((R * 2.25) / H, .45);
  globos.forEach(function(b){
    if(!vuelo){
      b.nx = clamp(b.nx, mx, 1 - mx);
      b.ny = clamp(b.ny, arriba, 1 - abajo);
    }
    posicionar(b);
  });
}
function posicionar(b){
  var x = b.nx * W, y = b.ny * H;
  if(vuelo && !reduced){ x += Math.sin(tSeg * b.osc + b.fase) * R * VAIVEN; }
  b.px = x; b.py = y;
  b.el.setAttribute('transform',
    'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ') scale(' + (R / 100).toFixed(4) + ')');
}
/* Resize y rotacion del celular. Como el modelo esta en unidades
   normalizadas, casi siempre alcanza con medir de nuevo y redibujar. Se
   reparte de cero en dos casos: cuando la medida anterior no servia (la
   pantalla todavia no existia, ver `medir`) y cuando la pantalla paso de
   apaisada a parada o al reves, porque ahi la grilla que habia deja de
   tener sentido. */
function recalcular(){
  if(!globos.length) return;
  var servia = medidaOk, eraApaisada = W > H;
  medir();
  if(!medidaOk) return;
  if(!servia || eraApaisada !== (W > H)){ repartirPosiciones(); return; }
  var g = grilla(globos.length);
  R = clamp(Math.min(g.cw / CELDA_ANCHO, g.ch / CELDA_ALTO), R_MIN, R_MAX);
  acomodar();
}

/* =====================================================================
   EL VUELO
   ===================================================================== */
function arrancarVuelo(){
  if(loopRAF) return;
  ultimoTs = 0;
  loopRAF = requestAnimationFrame(subir);
}
function detenerVuelo(){
  if(loopRAF){ cancelAnimationFrame(loopRAF); loopRAF = null; }
}
function subir(ts){
  loopRAF = requestAnimationFrame(subir);
  // dt topeado: si el celular se bloquea y vuelve, los globos no se
  // teletransportan a la mitad de la pantalla
  var dt = ultimoTs ? Math.min((ts - ultimoTs) / 1000, .05) : .016;
  ultimoTs = ts;
  tSeg += dt;
  for(var i = 0; i < globos.length; i++){
    var b = globos[i];
    if(b.reventado) continue;
    b.ny -= b.vy * dt;
    // el que se escapa por arriba vuelve a entrar por abajo, en otra
    // columna: nunca se pierde un globo, no hay forma de quedarse trabado
    if(b.ny < -.3){ b.ny = 1.3; b.nx = .08 + Math.random() * .84; }
    posicionar(b);
  }
}

/* =====================================================================
   EL TOQUE
   ===================================================================== */
function toSvg(evt){
  var m = svg.getScreenCTM();
  var pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  if(!m) return { x:pt.x, y:pt.y };
  var r = pt.matrixTransform(m.inverse());
  return { x:r.x, y:r.y };
}
function onDown(e){
  if(locked) return;
  e.preventDefault();
  audio();   // el primer toque es el que destraba el audio en el celular
  var p = toSvg(e);
  var mejor = null, mejorD = Infinity;
  for(var i = 0; i < globos.length; i++){
    var b = globos[i];
    if(b.reventado) continue;
    var dx = p.x - b.px, dy = p.y - b.py;
    var d = Math.sqrt(dx * dx + dy * dy);
    if(d < mejorD){ mejorD = d; mejor = b; }
  }
  if(!mejor || mejorD > R * TOL_TOQUE) return;   // toco el cielo: no pasa nada
  if(mejor.blanco){ reventar(mejor); } else { rechazar(mejor); }
}

function reventar(b){
  b.reventado = true;
  b.el.classList.add('pop');
  reventados.push(b.color);
  chispas(b.px, b.py, b.color);
  plop();
  errores = 0;
  setTimeout(function(){
    if(b.el.parentNode){ b.el.parentNode.removeChild(b.el); }
  }, 320);
  faltan--;
  if(faltan <= 0){ ganar(); }
}

/* Ese no era. El globo se bambolea, suena grave y suave, y no pasa nada
   mas: no se descuenta, no se pierde, la consigna no cambia. A los dos
   errados seguidos se da una pista sola, sin que el chico tenga que
   pedirla ni que haya un adulto explicando. */
function rechazar(b){
  b.el.classList.add('mal');
  noEra();
  errores++;
  if(errores >= ERRORES_PISTA){
    errores = 0;
    globos.forEach(function(g){
      if(!g.reventado && g.blanco){ g.el.classList.add('pista'); }
    });
  }
}

function ganar(){
  locked = true;
  var r = RONDAS[rIdx];
  if(done.indexOf(r.id) < 0){ done.push(r.id); saveDone(); }
  refreshChrome();
  // los que sobraron se despiden volando
  globos.forEach(function(b){ if(!b.reventado){ b.el.classList.add('vuela'); } });
  confetti(colorDeRonda(r));
  fanfarria();
  // la tarjeta llega despues del festejo, no encima
  tarjetaTO = setTimeout(showCard, 950);
}

/* =====================================================================
   PARTICULAS: pedacitos de globo + confeti al ganar
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

function svgToScreen(x, y){
  var m = svg.getScreenCTM();
  if(!m) return { x:window.innerWidth / 2, y:window.innerHeight / 2 };
  var pt = svg.createSVGPoint(); pt.x = x; pt.y = y;
  var r = pt.matrixTransform(m);
  return { x:r.x, y:r.y };
}
/* Los pedacitos salen del color del globo, no blancos: lo que estalla
   tiene que parecer el globo que estaba ahi. */
function chispas(x, y, color){
  var o = svgToScreen(x, y);
  var n = reduced ? 10 : 22;
  for(var i = 0; i < n; i++){
    var a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 5;
    parts.push({ x:o.x, y:o.y, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp - 1.4,
                 g:.14, r:3 + Math.random() * 4, life:1, dec:.022 + Math.random() * .02,
                 c:(Math.random() < .78 ? color : '#FFFFFF'), sq:false });
  }
  runFx();
}
function confetti(color){
  var cols = [color, '#FFD84D', '#EF658E', '#2EC4B6', '#FFFFFF', '#B388EB'];
  var n = reduced ? 24 : 90;
  for(var i = 0; i < n; i++){
    parts.push({
      x:Math.random() * window.innerWidth,
      y:-20 - Math.random() * 160,
      vx:(Math.random() - .5) * 2.4,
      vy:2 + Math.random() * 3.4,
      g:.06, r:4 + Math.random() * 5, life:1, dec:.006,
      c:cols[(Math.random() * cols.length) | 0], sq:true,
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
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.life -= p.dec;
      if(p.rot !== undefined){ p.rot += p.vr; }
      if(p.life <= 0 || p.y > window.innerHeight + 40){ parts.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.fillStyle = p.c;
      if(p.sq){
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0);
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.5); ctx.restore();
      }else{
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.284); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    if(parts.length){
      fxRAF = requestAnimationFrame(loop);
    }else{
      fxRAF = null;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  });
}

/* =====================================================================
   TARJETA FINAL
   Muestra los globos que reventó, uno al lado del otro, y el numero. No
   es decoracion: contar lo que acaba de hacer es la parte de matematica
   que el juego regala gratis, y en la ronda de color ademas deja el
   color y su nombre juntos ("3 globos azules").
   ===================================================================== */
function showCard(){
  var r = RONDAS[rIdx];
  var n = reventados.length;
  var c = colorDeRonda(r);
  cardEl.style.setProperty('--c', c);

  var fila = document.getElementById('card-globos');
  fila.innerHTML = '';
  reventados.slice(0, 8).forEach(function(col){ fila.appendChild(globoSuelto(col, true)); });

  var plural = r.objetivo ? ' ' + colorPorId(r.objetivo).plural : '';
  document.getElementById('card-word').innerHTML =
    '¡<b>' + n + '</b> globos' + plural + '!';
  cardEl.classList.add('show');
  speak((NUMEROS[n] || n) + ' globos' + plural);
}
function hideCard(){ cardEl.classList.remove('show'); }

document.getElementById('btn-again').addEventListener('click', function(e){
  e.stopPropagation(); hideCard(); cargarRonda(rIdx);
});
document.getElementById('btn-next').addEventListener('click', function(e){
  e.stopPropagation();
  if(unaSola && cfg.menuHref){ location.href = cfg.menuHref; return; }
  hideCard(); cargarRonda(unaSola ? rIdx : rIdx + 1);
});
cardEl.addEventListener('click', function(e){
  if(e.target === cardEl){ hideCard(); cargarRonda(unaSola ? rIdx : rIdx + 1); }
});
document.getElementById('reset-btn').addEventListener('click', function(){
  hideCard(); cargarRonda(rIdx);
});
document.getElementById('modo-btn').addEventListener('click', function(){
  vuelo = !vuelo;
  hideCard(); cargarRonda(rIdx);
});

svg.addEventListener('pointerdown', onDown);

/* =====================================================================
   ARRANQUE
   ===================================================================== */
window.addEventListener('resize', function(){
  sizeFx();
  recalcular();
});
/* El resize de la ventana no alcanza: el escenario tambien cambia de
   tamano cuando aparece el teclado, cuando se muestra una pestana que
   cargo escondida (ahi midio cero) o cuando el celular gira sin cambiar el
   tamano de ventana. Observar el SVG cubre los tres. Setear el viewBox no
   cambia la caja del elemento, asi que esto no se puede realimentar. */
if(window.ResizeObserver){
  new ResizeObserver(function(){ recalcular(); }).observe(svg);
}
document.addEventListener('gesturestart', function(e){ e.preventDefault(); });
// pestana en segundo plano: al volver, que el dt no venga de hace un minuto
document.addEventListener('visibilitychange', function(){
  if(!document.hidden){ ultimoTs = 0; }
});

cargarRonda(unaSola ? indiceDeRonda(cfg.ronda) : 0);


}

global.TukuToonBalloonPage = TukuToonBalloonPage;

})(window);
