/* =====================================================================
   MOTOR DE CLASIFICAR — engine del minijuego de arrastrar y ordenar por
   color. Mismo criterio que motor-globos.js y motor-trazos.js: el motor
   arma TODO el DOM por JS (header, consigna, escenario, selector,
   tarjeta) y la pagina HTML en si es minima.

   Uso desde una pagina:

       <link rel="stylesheet" href="motor/motor-clasificar.css">
       <script src="clasificar.js"></script>
       <script src="motor/motor-clasificar.js"></script>
       <script>TukuToonSortPage({ rondas:CLASIFICAR_RONDAS, colores:CLASIFICAR_COLORES });</script>

   Config aceptada:
     rondas     array de rondas (ver clasificar.js). Obligatorio.
     colores    paleta de colores (ver clasificar.js). Obligatorio.
     ronda      id de una ronda sola: arranca ahi (en vez de la primera) y
                "Siguiente" en la tarjeta va a `menuHref` en vez de avanzar
     titulo     texto grande del header            (default 'TukuToon')
     subtitulo  bajada del header                  (default 'CLASIFICAR')
     menuHref   si viene, agrega boton de volver al menu
     storeKey   clave de localStorage del progreso (default abajo)

   ---------------------------------------------------------------------
   LA MECANICA: TODO TIENE UN LUGAR

   A diferencia de globos —donde hay que ELEGIR entre tocar o no tocar
   cada uno— aca CADA objeto de la ronda tiene una cesta que le
   corresponde. No hay distractores sueltos: se termina cuando el ultimo
   objeto cae en su cesta, sin importar el orden. El ejercicio no es
   "reconoce el azul entre otros colores" (eso ya lo hace globos): es
   "date cuenta de que hay que separar por color, y hacelo con las manos".

   ARRASTRAR. El motor escucha pointerdown en el SVG entero y busca la
   bolita mas cercana al dedo (mismo criterio de tolerancia que el toque
   en globos). Al agarrarla, el elemento se manda al frente del SVG (para
   que quede siempre arriba de las demas mientras se mueve) y el puntero
   queda "capturado" en el SVG (`setPointerCapture`): asi los eventos de
   mover y soltar le siguen llegando aunque el dedo se vaya de encima del
   dibujo a mitad de camino, que es el descuido tipico de un chico chico.

   SOLTAR. Se busca la cesta mas cercana al soltar. Si el color coincide,
   la bolita es absorbida (se anima hacia el centro de la cesta y
   desaparece) y la cesta anota una marca mas. Si la cesta no es la que
   corresponde, la bolita rebota de vuelta a SU MISMO lugar de origen (no
   a uno nuevo: asi el chico no pierde el mapa mental de donde estaba
   cada cosa) con una sacudida y un sonido suave — no hay descuento, no
   hay reintentos limitados. Si no se solto sobre ninguna cesta, vuelve
   igual, en silencio: todavia esta decidiendo.

   LA PISTA. Dos rebotes seguidos (contra cualquier cesta, de cualquier
   bolita) hacen que la cesta correcta de LA ULTIMA bolita rebotada lata
   sola un instante. No interrumpe nada, no hay que pedirla.
   ===================================================================== */
(function(global){
'use strict';

// Carpeta iconos/ deducida del <script src> de este mismo archivo, mismo
// criterio que ICONS_BASE en motor.js de a-pintar y en motor-trazos.js de
// vocales: asi ninguna pagina tiene que pasar una ruta a mano. Se calcula
// aca arriba, no adentro de TukuToonSortPage, porque document.currentScript
// solo vale mientras este script se esta ejecutando por primera vez.
var SCRIPT_SRC = (document.currentScript && document.currentScript.src) || '';
var ICONS_BASE = SCRIPT_SRC ? SCRIPT_SRC.replace(/\/[^/]*$/, '/../iconos/') : '';

function TukuToonSortPage(cfg){
  cfg = cfg || {};

  var COLORES = cfg.colores || global.CLASIFICAR_COLORES;
  var RONDAS  = cfg.rondas  || global.CLASIFICAR_RONDAS;
  if(!RONDAS || !RONDAS.length || !COLORES || !COLORES.length){
    document.body.innerHTML = '<p style="font:16px sans-serif;padding:24px">' +
      'No llegaron las rondas: falta cargar clasificar.js antes que el motor.</p>';
    return;
  }

  var unaSola = false;
  if(cfg.ronda && indiceDeRonda(cfg.ronda) >= 0){ unaSola = true; }

  buildDOM(cfg);


/* =====================================================================
   DOM — lo arma el motor entero, la pagina no trae markup
   ===================================================================== */
function buildDOM(cfg){
  var titulo    = cfg.titulo    || 'TukuToon';
  var subtitulo = cfg.subtitulo || 'CLASIFICAR';
  var iconsBase = cfg.iconsBase || ICONS_BASE;

  var volver = cfg.menuHref
    ? '<a class="icon-btn icon-art" id="menu-btn" href="' + cfg.menuHref +
      '" title="Volver al menu" aria-label="Volver al menu">' +
      '<img src="' + iconsBase + 'volver.png" alt="" draggable="false"></a>'
    : '';

  // La mascota guia es opcional: sin `cfg.mascota` el motor sigue andando
  // igual (por ejemplo si algun dia se reusa este motor para otro
  // personaje, o para ninguno). Va DENTRO de <main>, al lado del
  // escenario — no encima ni suelta — para que `main` la reparta con flex
  // y el SVG del juego ceda ese ancho solo, sin que el motor tenga que
  // saber de su existencia (ver mas abajo, `medir()` sigue midiendo
  // nada mas que #stage).
  var mascota = cfg.mascota
    ? '<div class="mascota-dock"><img id="mascota" class="mascota" ' +
      'src="' + cfg.mascota.src + '" alt="' + (cfg.mascota.alt || '') + '"></div>'
    : '';

  document.body.innerHTML =
    '<div class="room-scene" aria-hidden="true">' +
      '<img id="room-plan" class="room-plan" alt="" draggable="false">' +
      '<div class="room-window"><i></i><i></i></div>' +
      '<div class="room-shelf"></div>' +
      '<div class="play-table"></div>' +
      '<div class="play-rug"></div>' +
      '<div class="room-floor"></div>' +
    '</div>' +

    '<header>' +
      volver +
      '<div class="brand">' + titulo + '<small>' + subtitulo + '</small></div>' +
      '<div class="stars" id="stars" aria-label="Rondas completadas"></div>' +
    '</header>' +

    '<p class="prompt" id="prompt">Llevá cada bolita a su cesta</p>' +

    '<main><svg id="stage" preserveAspectRatio="xMidYMid meet"></svg>' + mascota + '</main>' +

    '<canvas id="fx"></canvas>' +

    '<div id="card" aria-live="polite">' +
      '<button class="btn-next" id="btn-next">Siguiente &#8594;</button>' +
    '</div>';
}

/* El nodo generico: createElementNS y NO innerHTML, mismo motivo que en
   motor-globos.js — adentro de un <g> existente, innerHTML no es
   confiable entre navegadores. */
function nodo(tag, attrs){
  var e = document.createElementNS(SVG_NS, tag);
  for(var k in attrs){
    if(Object.prototype.hasOwnProperty.call(attrs, k)){ e.setAttribute(k, attrs[k]); }
  }
  return e;
}

/* ---------- la bolita ----------
   Un circulo de radio 100 (mismo criterio de unidades locales que el
   globo en motor-globos.js: el motor solo escala por R/100), con carita.
   No representa ningun objeto en particular a proposito: este nivel
   clasifica por color solamente, asi que la forma no debe distraer ni
   sugerir otra categoria. */
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
function bolaVisual(color, clase){
  var g = nodo('g', clase ? { 'class':clase } : {});
  g.appendChild(nodo('circle',  { 'class':'cuerpo', r:100, fill:color }));
  g.appendChild(nodo('ellipse', { 'class':'brillo', cx:-38, cy:-46, rx:22, ry:28,
                                  transform:'rotate(-20 -38 -46)' }));
  g.appendChild(cara());
  return g;
}
/* Una bolita suelta en su propio <svg>, para botones y tarjeta. */
function bolaSuelta(color){
  var s = nodo('svg', { viewBox:'-112 -112 224 224', 'aria-hidden':'true' });
  s.appendChild(bolaVisual(color));
  return s;
}
function objetoVisual(src, clase, apoyado){
  var g = nodo('g', clase ? { 'class':clase } : {});
  if(apoyado){
    // Recortamos el margen transparente y alineamos el borde inferior real
    // del PNG con el piso. Así cada juguete nace apoyado sobre su sombra.
    var familia = src.split('-')[0];
    var recortes = {
      balon:[313,86,400,402], bloques:[288,96,566,408], carro:[217,102,610,392],
      crayones:[326,46,376,490], dino2:[269,62,457,440], dino3:[296,32,447,508],
      osito:[358,69,314,454]
    };
    var marco = recortes[familia] || [260,40,504,496];
    var recorteApoyado = nodo('svg', {
      x:-100, y:-200, width:200, height:200,
      viewBox:marco[0]+' '+marco[1]+' '+marco[2]+' '+marco[3],
      preserveAspectRatio:'xMidYMax meet', 'class':'objeto-imagen'
    });
    recorteApoyado.appendChild(nodo('image', {
      x:0, y:0, width:1024, height:576, href:src,
      preserveAspectRatio:'none'
    }));
    g.appendChild(recorteApoyado);
    return g;
  }
  // Los balones PNG tienen mucho margen transparente alrededor del balón.
  // Recortamos ese margen dentro de un SVG anidado para que ocupen el mismo
  // espacio que las bolitas dibujadas por el motor.
  if(/^balon-(rojo|amarillo|azul|verde)\.png$/.test(src)){
    var recorte = nodo('svg', {
      x:-100, y:-100, width:200, height:200,
      viewBox:'300 75 424 424', preserveAspectRatio:'xMidYMid meet',
      'class':'objeto-imagen'
    });
    recorte.appendChild(nodo('image', {
      x:0, y:0, width:1024, height:572, href:src,
      preserveAspectRatio:'none'
    }));
    g.appendChild(recorte);
    return g;
  }
  g.appendChild(nodo('image', {
    x:-170, y:-96, width:340, height:192, href:src,
    preserveAspectRatio:'xMidYMid meet', 'class':'objeto-imagen'
  }));
  return g;
}
function objetoSuelto(obj){
  var s = nodo('svg', { viewBox:'-170 -96 340 192', 'aria-hidden':'true' });
  s.appendChild(objetoVisual(obj.src));
  return s;
}

/* ---------- la cesta ----------
   Un balde simple: cuerpo redondeado + borde ovalado arriba sugiriendo la
   abertura. Mismas unidades locales (radio de referencia 100) que la
   bolita, para que el motor escale las dos cosas con la misma cuenta. */
function cestaVisual(color, clase, baulSrc, lado, centroX, escala){
  var g = nodo('g', clase ? { 'class':clase } : {});
  if(baulSrc){
    // Recortamos el lienzo transparente alrededor del cofre, conservando
    // su proporción y perspectiva al adaptarlo al tamaño de pantalla.
    var marco = lado === 'izquierda' ? [400,740,520,340] : [1010,740,540,340];
    var recorte = nodo('svg', {
      x:centroX - marco[2] * escala / 2, y:H - marco[3] * escala,
      width:marco[2] * escala, height:marco[3] * escala,
      viewBox:marco.join(' '), preserveAspectRatio:'none', 'class':'baul-imagen'
    });
    recorte.appendChild(nodo('image', {
      x:0, y:0, width:SCENE_W, height:SCENE_H, href:baulSrc,
      preserveAspectRatio:'none'
    }));
    g.appendChild(recorte);
    return g;
  }
  g.appendChild(nodo('rect', {
    'class':'cuerpo', x:-92, y:-58, width:184, height:150, rx:24,
    fill:color, 'fill-opacity':.16, stroke:color
  }));
  g.appendChild(nodo('ellipse', {
    'class':'rim', cx:0, cy:-58, rx:96, ry:18,
    fill:color, 'fill-opacity':.32, stroke:color
  }));
  return g;
}

/* Una marca de la fila de progreso arriba de una cesta: circulo hueco que
   se llena al color cuando ese cupo ya se cumplio. Un <g>, NO un <svg>
   anidado: un <svg> sin width/height propios se expande a un tamano
   gigante en vez de respetar el `transform` que le pone el motor — eso
   sirve para bolaSuelta()/cestaVisual() cuando van SUELTOS (boton, card),
   pero rompe apenas se cuelgan adentro del escenario. */
function marcaVisual(){
  var g = nodo('g', { 'class':'marca' });
  g.appendChild(nodo('circle', { 'class':'cuerpo', r:48 }));
  return g;
}

/* ---------- parametros ---------- */
var SVG_NS    = 'http://www.w3.org/2000/svg';
var STORE_KEY = cfg.storeKey || 'tukutoon:clasificar:completadas';
var TOL_TOQUE = 1.35;    // radio de perdon para agarrar una bolita, en radios de bolita
var TOL_CESTA = 1.55;    // radio de perdon para soltar sobre una cesta, en radios de cesta
var R_MIN     = 26;      // bolita mas chica que esto no se puede agarrar bien
var R_MAX     = 92;
var CELDA     = 2.35;    // celda minima para el reparto de bolitas, en radios (cuadrada)
var ERRORES_PISTA = 2;   // rebotes seguidos antes de dar una pista

/* ---------- estado ---------- */
var svg      = document.getElementById('stage');
var fx       = document.getElementById('fx');
var ctx      = fx.getContext('2d');
var cardEl   = document.getElementById('card');
var promptEl = document.getElementById('prompt');
var mainEl   = document.querySelector('main');
var roomPlanEl = document.getElementById('room-plan');
var mascotaEl = document.getElementById('mascota');   // null si no vino cfg.mascota

var rIdx     = 0;
var bolas    = [];       // las que quedan por ordenar
var cestas   = [];
var faltan   = 0;
var errores  = 0;
var locked   = false;
var ordenadas = [];       // colores ordenados, en orden: para la tarjeta
var W = 0, H = 0;
var drag = null;          // la bolita que se esta arrastrando, o null
var dragId = null;        // pointerId del arrastre en curso
var tarjetaTO = null;
var done     = loadDone();
var reduced  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- helpers chicos ---------- */
/* Si el minimo termina siendo mayor que el maximo (pasa cuando el
   escenario todavia no tiene tamano de verdad y los margenes no entran),
   devuelve el medio en vez de quedarse pegado al minimo — aprendido en
   motor-globos.js: si no, todo se apila en la misma esquina. */
function clamp(v, a, b){
  if(a > b) return (a + b) / 2;
  return v < a ? a : (v > b ? b : v);
}
var SCENE_W = 1920, SCENE_H = 1080;
function escenaAjuste(){
  var escala = Math.max(W / SCENE_W, H / SCENE_H);
  return {
    escalaX:escala,
    escalaY:escala,
    offsetX:(W - SCENE_W * escala) / 2,
    offsetY:H - SCENE_H * escala
  };
}
function puntoEscena(x, y, ajuste){
  ajuste = ajuste || escenaAjuste();
  return {
    x:x * ajuste.escalaX + ajuste.offsetX,
    y:y * ajuste.escalaY + ajuste.offsetY
  };
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

/* =====================================================================
   AUDIO: grabaciones locales para acierto, error y cierre de ronda.
   ===================================================================== */
var sonidos = {};
function reproducirSonido(nombre, volumen){
  try{
    var sonido = sonidos[nombre];
    if(!sonido){
      sonido = new Audio('audio/' + nombre + '.mp3');
      sonido.preload = 'auto';
      sonidos[nombre] = sonido;
    }
    sonido.pause();
    sonido.currentTime = 0;
    sonido.volume = volumen;
    var reproduccion = sonido.play();
    if(reproduccion && reproduccion.catch){ reproduccion.catch(function(){}); }
  }catch(e){}
}
function plink(){ reproducirSonido('acierto', .7); }
function noEra(){ reproducirSonido('incorrecto', .75); }
function aplausos(){ reproducirSonido('aplausos', .68); }
/* =====================================================================
   LA MASCOTA GUIA (Tuku)
   Queda quieta al costado del escenario — no persigue nada, no habla — y
   reacciona con una animacion CSS corta cuando pasa algo: una bolita bien,
   una mal, o se gano la ronda. Es decorativo puro: el juego funciona igual
   sin `cfg.mascota`, asi que todo esto no toca ninguna otra parte del
   motor.
   ===================================================================== */
function reaccionMascota(tipo){
  if(!mascotaEl) return;
  mascotaEl.classList.remove('reac-bien', 'reac-mal', 'reac-festejo');
  // fuerza un reflow: sin esto, sacar y volver a poner la MISMA clase en
  // el mismo tick no reinicia la animacion (el navegador la ve como que
  // nunca cambio), y dos bolitas bien seguidas solo animan la primera
  void mascotaEl.offsetWidth;
  mascotaEl.classList.add('reac-' + tipo);
}
if(mascotaEl){
  mascotaEl.addEventListener('animationend', function(e){
    // la respiracion de reposo es infinita y no hay que tocarla; solo se
    // limpia la clase de la reaccion que ya termino
    if(e.animationName !== 'respirar'){
      mascotaEl.classList.remove('reac-bien', 'reac-mal', 'reac-festejo');
    }
  });
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
   UI: estrellas y consigna
   Sin selector de rondas abajo: se avanza en orden con "Siguiente" en la
   tarjeta final, y con "Otra vez" se repite la que esta jugando. Una
   ronda especifica sigue estando disponible por URL (?ronda=id).
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
function refreshChrome(){
  buildStars();
}
function ponerConsigna(){
  promptEl.textContent = 'Llevá cada juguete a su cofre';
}

/* =====================================================================
   MEDIDA DEL ESCENARIO
   ===================================================================== */
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

/* =====================================================================
   ARMADO DE LA RONDA
   ===================================================================== */
function cargarRonda(i){
  rIdx = ((i % RONDAS.length) + RONDAS.length) % RONDAS.length;
  var r = RONDAS[rIdx];
  if(roomPlanEl && r.plano){ roomPlanEl.src = r.plano; }

  if(tarjetaTO){ clearTimeout(tarjetaTO); tarjetaTO = null; }
  drag = null; dragId = null;
  locked = false;
  errores = 0;
  ordenadas = [];
  bolas = [];
  cestas = [];
  svg.innerHTML = '';
  // limpieza defensiva: una ronda nueva no deberia empezar con la mascota
  // a mitad de una reaccion de la ronda anterior
  if(mascotaEl){ mascotaEl.classList.remove('reac-bien', 'reac-mal', 'reac-festejo'); }

  medir();

  // Cada plano ya incluye la pareja exacta de cofres de esta ronda.
  var escalaCofre = Math.min(W / SCENE_W, H / SCENE_H);
  var rCesta = clamp(50 * escalaCofre, 28, 64);
  r.colores.forEach(function(colorId, i){
    var col = colorPorId(colorId);
    var baulSrc = /^(rojo|amarillo|azul|verde)$/.test(colorId)
      ? 'cofre' + colorId + (i === 0 ? '' : '2') + '.png' : null;
    var lado = i === 0 ? 'izquierda' : 'derecha';
    var caja = i === 0
      ? { x:.343, y:.809, mitadAncho:.132, mitadAlto:.191 }
      : { x:.691, y:.809, mitadAncho:.135, mitadAlto:.191 };
    var cx = W * caja.x;
    var cy = H * caja.y;
    // No redibujamos los cofres: ya vienen integrados en cada imagen.
    // El grupo vacío conserva la interacción y las pistas de la ronda.
    var el = baulSrc ? nodo('g', { 'class':'cesta' })
      : cestaVisual(col.color, 'cesta', null, lado, cx, escalaCofre);

    // la fila de marcas de esta cesta, dibujada arriba de ella
    var marcas = [];
    var totalColor = r.objetos
      ? r.objetos.filter(function(obj){ return obj.colorId === colorId; }).length
      : r.porColor;
    var anchoMarcas = Math.min(totalColor * rCesta * .62, rCesta * 2.6);
    var pasoM = totalColor > 1 ? anchoMarcas / (totalColor - 1) : 0;
    for(var m = 0; !baulSrc && m < totalColor; m++){
      var mk = marcaVisual();
      var mx = cx - anchoMarcas / 2 + pasoM * m;
      var my = cy - rCesta * 1.55;
      var esc = rCesta * .0028;
      mk.setAttribute('transform', 'translate(' + mx + ',' + my + ') scale(' + esc + ')');
      mk.style.setProperty('--m', col.color);
      svg.appendChild(mk);
      marcas.push(mk);
    }

    cestas.push({
      el:el, colorId:colorId, color:col.color,
      x:cx, y:cy, r:rCesta,
      cajaX:caja.x, cajaY:caja.y,
      hitWRatio:caja.mitadAncho, hitHRatio:caja.mitadAlto,
      hitW:baulSrc ? W * caja.mitadAncho : null,
      hitH:baulSrc ? H * caja.mitadAlto : null,
      lado:lado,
      fullFrame:!!baulSrc,
      completados:0, total:totalColor, marcas:marcas
    });
    if(!baulSrc){
      el.setAttribute('transform',
        'translate(' + cx.toFixed(1) + ',' + cy.toFixed(1) + ') scale(' + (rCesta / 100).toFixed(4) + ')');
      svg.appendChild(el);
    }
  });

  // las bolitas: una lista con `porColor` de cada color, barajada para que
  // el orden en pantalla no siga el orden de las cestas
  var lista = [];
  if(r.objetos){
    lista = r.objetos.slice();
  }else{
    r.colores.forEach(function(colorId){
      for(var k = 0; k < r.porColor; k++){ lista.push(colorId); }
    });
  }
  barajar(lista);

  // Calcular las posiciones sobre el plano original del cuarto para respetar
  // el borde del piso y el espacio que ocupan el estante, el tobogán y cofres.
  var ajustePiso = escenaAjuste();
  var lineaPiso = SCENE_H * .568;
  var inicioPiso = lineaPiso + SCENE_H * .065;
  var finPiso = SCENE_H * .97;
  var rBola = clamp(Math.min(W, H) * 0.064, 31, 42);
  var separacion = clamp(rBola * 2.02, 64, 88);
  var posiciones = [];

  function lugarJuguete(){
    var mejor = null, mejorDistancia = -1;
    for(var intento = 0; intento < 1800; intento++){
      var sceneY = inicioPiso + Math.random() * (finPiso - inicioPiso);
      var profundidadPiso = (sceneY - lineaPiso) / (SCENE_H - lineaPiso);
      var profundidad = (sceneY - inicioPiso) / (finPiso - inicioPiso);
      var escalaVisual = .82 + profundidad * .16;
      var medioJugueteEscena = rBola * escalaVisual / ajustePiso.escalaX;
      // La habitación se abre hacia delante; los bordes curvos mantienen
      // cada juguete dentro del suelo y fuera de los muebles laterales.
      var bordeIzquierdo = .24 * Math.pow(1 - profundidadPiso, 1.15);
      var bordeDerecho = 1 - bordeIzquierdo;
      var xMin = bordeIzquierdo + medioJugueteEscena / SCENE_W;
      var xMax = bordeDerecho - medioJugueteEscena / SCENE_W;
      if(xMax <= xMin) continue;
      var sceneX = (xMin + Math.random() * (xMax - xMin)) * SCENE_W;

      // Los cofres forman parte del fondo: en su zona solo dejamos juguetes
      // si quedan enteros en el hueco o a los lados, nunca sobre su imagen.
      if(sceneY > SCENE_H * .70){
        var xRel = sceneX / SCENE_W;
        var medioRel = medioJugueteEscena / SCENE_W;
        var fueraDeCofres = xRel + medioRel < .211 ||
          (xRel - medioRel > .475 && xRel + medioRel < .556) ||
          xRel - medioRel > .826;
        if(!fueraDeCofres) continue;
      }
      var punto = puntoEscena(sceneX, sceneY, ajustePiso);
      var candidato = {
        x:punto.x,
        y:punto.y,
        escalaVisual:escalaVisual
      };
      // Comparar los centros visibles (el origen de cada sprite está en su base).
      var centroY = candidato.y - rBola * candidato.escalaVisual;
      var distancia = Infinity;
      posiciones.forEach(function(otro){
        var dx = candidato.x - otro.x;
        var otroCentroY = otro.y - rBola * otro.escalaVisual;
        distancia = Math.min(distancia, Math.sqrt(dx * dx + Math.pow(centroY - otroCentroY, 2)));
      });
      if(!posiciones.length || distancia >= separacion){
        posiciones.push(candidato);
        return candidato;
      }
      if(distancia > mejorDistancia){ mejor = candidato; mejorDistancia = distancia; }
    }
    // En el caso extremo de una ronda muy llena, usar el punto más despejado.
    posiciones.push(mejor);
    return mejor;
  }

  lista.forEach(function(item, k){
    var colorId = typeof item === 'string' ? item : item.colorId;
    var col = colorPorId(colorId);
    var sitio = lugarJuguete();
    var x = sitio.x, y = sitio.y;
    // Los que quedan más cerca del fondo se ven un poco más pequeños.
    var escalaVisual = sitio.escalaVisual;

    var el = nodo('g', { 'class':'bola caida' });
    if(item && item.src){
      el.appendChild(nodo('ellipse', {
        'class':'sombra-objeto', cx:0, cy:3, rx:70, ry:10
      }));
    }
    var anim = item.src ? objetoVisual(item.src, 'anim', true) : bolaVisual(col.color, 'anim');
    el.appendChild(anim);
    anim.addEventListener('animationend', function(){
      el.classList.remove('mal');
    });

    var b = {
      el:el, anim:anim, item:item, colorId:colorId, color:col.color,
      x:x, y:y, ox:x, oy:y, r:rBola, escalaVisual:escalaVisual, ordenada:false
    };
    bolas.push(b);
    posicionarBola(b);
  });

  // Dibujar primero los juguetes del fondo y luego los más cercanos, como
  // ocurriría en el plano de la habitación.
  bolas.slice().sort(function(a, b){ return a.y - b.y; }).forEach(function(b){
    svg.appendChild(b.el);
  });

  // Los cofres se dibujan sobre los juguetes y el objeto arrastrado pasa
  // temporalmente al frente para seguir el puntero y caer en la abertura.
  cestas.forEach(function(c){ if(c.fullFrame){ svg.appendChild(c.el); } });

  faltan = lista.length;
  ponerConsigna();
  refreshChrome();
}

function posicionarBola(b, escalaExtra){
  var e = (b.r / 100) * (b.escalaVisual || 1) * (escalaExtra || 1);
  b.el.setAttribute('transform',
    'translate(' + b.x.toFixed(1) + ',' + b.y.toFixed(1) + ') scale(' + e.toFixed(4) + ')');
}

/* Reparte todo al arrancar una ronda. Los cambios de tamano del escenario
   se resuelven en `recalcular` para conservar el progreso actual. */
function recalcular(){
  if(!bolas.length && !cestas.length) return;
  var servia = medidaOk, anchoAnterior = W, altoAnterior = H;
  medir();
  if(!medidaOk) return;
  if(!servia){ cargarRonda(rIdx); return; }
  if(W === anchoAnterior && H === altoAnterior) return;

  // Mantener la ronda activa al cambiar el viewport. Reiniciarla en cada
  // resize (incluidos los cambios de alto de las barras del navegador en
  // celular) podia borrar el progreso o dejar las cestas fuera del SVG.
  var sx = W / anchoAnterior, sy = H / altoAnterior;
  var escala = Math.min(sx, sy);
  var escalaCofre = Math.min(W / SCENE_W, H / SCENE_H);
  bolas.forEach(function(b){
    b.x *= sx; b.ox *= sx;
    b.y *= sy; b.oy *= sy;
    b.r *= escala;
    posicionarBola(b, b.ordenada ? .5 : 1);
  });
  cestas.forEach(function(c){
    c.x = W * c.cajaX;
    c.y = H * c.cajaY;
    c.r = clamp(50 * escalaCofre, 28, 64);
    if(c.fullFrame){
      c.hitW = W * c.hitWRatio;
      c.hitH = H * c.hitHRatio;
    }else{
      c.el.setAttribute('transform',
        'translate(' + c.x.toFixed(1) + ',' + c.y.toFixed(1) + ') scale(' + (c.r / 100).toFixed(4) + ')');
    }

    var anchoMarcas = Math.min(c.total * c.r * .62, c.r * 2.6);
    var pasoM = c.total > 1 ? anchoMarcas / (c.total - 1) : 0;
    c.marcas.forEach(function(marca, i){
      var mx = c.x - anchoMarcas / 2 + pasoM * i;
      var my = c.y - c.r * 1.55;
      marca.setAttribute('transform', 'translate(' + mx + ',' + my + ') scale(' + (c.r * .0028) + ')');
    });
  });
}

/* =====================================================================
   ARRASTRAR Y SOLTAR
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
  if(locked || drag) return;
  var p = toSvg(e);
  var mejor = null, mejorD = Infinity;
  for(var i = 0; i < bolas.length; i++){
    var b = bolas[i];
    // una bolita ya acertada sigue en `bolas` hasta que termina su
    // animacion de desvanecido (ver `correcta`): sin este filtro, un
    // segundo toque rapido sobre ella la vuelve a contar
    if(b.ordenada) continue;
    var dx = p.x - b.x, dy = p.y - b.y, d = Math.sqrt(dx * dx + dy * dy);
    if(d < mejorD){ mejorD = d; mejor = b; }
  }
  if(!mejor || mejorD > mejor.r * TOL_TOQUE) return;   // toco el aire: no pasa nada

  e.preventDefault();
  drag = mejor;
  dragId = e.pointerId;
  drag.el.classList.remove('suave');
  drag.el.classList.add('arrastrando');
  svg.appendChild(drag.el);   // al frente: siempre arriba de las demas mientras se mueve
  try{ svg.setPointerCapture(dragId); }catch(err){}

  drag.x = p.x; drag.y = p.y;
  posicionarBola(drag, 1.16);
}

function onMove(e){
  if(!drag || e.pointerId !== dragId) return;
  e.preventDefault();
  var p = toSvg(e);
  drag.x = p.x; drag.y = p.y;
  posicionarBola(drag, 1.16);
}

function onUp(e){
  if(!drag || e.pointerId !== dragId) return;
  e.preventDefault();
  try{ svg.releasePointerCapture(dragId); }catch(err){}

  var b = drag;
  drag = null; dragId = null;
  b.el.classList.remove('arrastrando');

  var cesta = cestaMasCercana(b);
  if(cesta && cesta.colorId === b.colorId){ correcta(b, cesta); }
  else if(cesta){ rechazar(b, cesta); }
  else{ volverAOrigen(b); }
}
function onCancel(e){
  if(!drag || e.pointerId !== dragId) return;
  try{ svg.releasePointerCapture(dragId); }catch(err){}
  var b = drag; drag = null; dragId = null;
  b.el.classList.remove('arrastrando');
  volverAOrigen(b);
}

function cestaMasCercana(b){
  var mejor = null, mejorD = Infinity;
  for(var i = 0; i < cestas.length; i++){
    var c = cestas[i];
    var dx = b.x - c.x, dy = b.y - c.y, d = Math.sqrt(dx * dx + dy * dy);
    if(c.hitW && c.hitH){
      var anchoTacto = c.hitW + b.r * .7;
      var altoTacto = c.hitH + b.r * .7;
      d = Math.max(Math.abs(dx) / anchoTacto, Math.abs(dy) / altoTacto);
      if(d > 1) continue;
    }else{
      d = d / (c.r * TOL_CESTA);
      if(d > 1) continue;
    }
    if(d < mejorD){ mejorD = d; mejor = c; }
  }
  return mejor;
}

function volverAOrigen(b){
  b.x = b.ox; b.y = b.oy;
  b.el.classList.add('suave');
  posicionarBola(b, 1);
}

/* Cesta equivocada: rebota a su lugar, se sacude y avisa suave. Cuenta
   como un error para la pista. */
function rechazar(b, cesta){
  volverAOrigen(b);
  b.el.classList.add('mal');
  noEra();
  reaccionMascota('mal');
  errores++;
  if(errores >= ERRORES_PISTA){
    errores = 0;
    var suCesta = cestaDe(b.colorId);
    if(suCesta){
      suCesta.el.classList.add('pista');
      setTimeout(function(){ suCesta.el.classList.remove('pista'); }, 2000);
    }
  }
}
function cestaDe(colorId){
  for(var i = 0; i < cestas.length; i++){ if(cestas[i].colorId === colorId) return cestas[i]; }
  return null;
}

/* Cesta correcta: vuela al centro de la cesta, se encoge y desaparece; la
   cesta anota una marca mas. */
function correcta(b, cesta){
  errores = 0;
  b.ordenada = true;
  b.x = cesta.x; b.y = cesta.y + cesta.r * .08;
  b.el.classList.add('suave');
  posicionarBola(b, .5);
  b.el.classList.add('entra');
  plink();
  reaccionMascota('bien');

  cesta.completados++;
  var marca = cesta.marcas[cesta.completados - 1];
  if(marca){ marca.classList.add('hecha'); }
  chispas(cesta.x, cesta.y, cesta.color);

  setTimeout(function(){
    if(b.el.parentNode){ b.el.parentNode.removeChild(b.el); }
  }, 340);

  ordenadas.push(b.item && b.item.src ? b.item : b.color);
  faltan--;
  if(faltan <= 0){ ganar(); }
}

function ganar(){
  locked = true;
  var r = RONDAS[rIdx];
  if(done.indexOf(r.id) < 0){ done.push(r.id); saveDone(); }
  refreshChrome();
  confetti('#2E9B63');
  aplausos();
  reaccionMascota('festejo');
  tarjetaTO = setTimeout(showCard, 700);
}

/* =====================================================================
   PARTICULAS: chispitas al caer + confeti al ganar
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
function chispas(x, y, color){
  var o = svgToScreen(x, y);
  var n = reduced ? 8 : 16;
  for(var i = 0; i < n; i++){
    var a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 3.5;
    parts.push({ x:o.x, y:o.y, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp - .8,
                 g:.13, r:2.5 + Math.random() * 3, life:1, dec:.03 + Math.random() * .02,
                 c:(Math.random() < .75 ? color : '#FFFFFF'), sq:false });
  }
  runFx();
}
function confetti(color){
  var cols = [color, '#FFD84D', '#EF658E', '#5AA9E6', '#FFFFFF', '#B388EB'];
  var n = reduced ? 24 : 90;
  for(var i = 0; i < n; i++){
    parts.push({
      x:Math.random() * window.innerWidth, y:-20 - Math.random() * 160,
      vx:(Math.random() - .5) * 2.4, vy:2 + Math.random() * 3.4,
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
   ===================================================================== */
function showCard(){
  cardEl.classList.add('show');
}
function hideCard(){ cardEl.classList.remove('show'); }

document.getElementById('btn-next').addEventListener('click', function(e){
  e.stopPropagation();
  if(unaSola && cfg.menuHref){ location.href = cfg.menuHref; return; }
  hideCard(); cargarRonda(unaSola ? rIdx : rIdx + 1);
});

svg.addEventListener('pointerdown', onDown);
svg.addEventListener('pointermove', onMove);
svg.addEventListener('pointerup', onUp);
svg.addEventListener('pointercancel', onCancel);

/* =====================================================================
   ARRANQUE
   ===================================================================== */
window.addEventListener('resize', function(){
  sizeFx();
  recalcular();
});
/* El resize de la ventana no alcanza — ver el mismo comentario en
   motor-globos.js: el escenario tambien cambia cuando aparece el teclado
   o cuando una pestana escondida se muestra. */
if(window.ResizeObserver){
  new ResizeObserver(function(){ recalcular(); }).observe(svg);
}
document.addEventListener('gesturestart', function(e){ e.preventDefault(); });
document.addEventListener('visibilitychange', function(){
  // si el chico solto el dedo con la pestana en segundo plano, el pointerup
  // pudo no llegar: al volver, que la bolita no quede pegada al dedo fantasma
  if(document.hidden && drag){ var b = drag; drag = null; dragId = null;
    b.el.classList.remove('arrastrando'); volverAOrigen(b); }
});

cargarRonda(unaSola ? indiceDeRonda(cfg.ronda) : 0);


}

global.TukuToonSortPage = TukuToonSortPage;

})(window);
