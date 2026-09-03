/* =====================================================================
   MOTOR DE TRAZOS — engine reutilizable del minijuego de trazar letras.
   Compartido por todas las paginas de trazado, igual que motor/motor.js
   en a-pintar.

   Uso desde una pagina:

       <link rel="stylesheet" href="motor/motor-trazos.css">
       <script src="vocales.js"></script>
       <script src="motor/motor-trazos.js"></script>
       <script>TukuToonTracePage({ letras: VOCALES });</script>

   El motor arma TODO el DOM por JS (header, consigna, lienzo, selector,
   tarjeta) — la pagina HTML en si es minima.

   Config aceptada:
     letras     array de letras (ver vocales.js). Obligatorio.
     titulo     texto grande del header            (default 'TukuToon')
     subtitulo  bajada del header                  (default 'TRAZA LAS VOCALES')
     menuHref   si viene, agrega boton de volver al menu
     caso       'mayus' | 'minus' con que arranca   (default 'mayus')
     storeKey   clave de localStorage del progreso  (default abajo)
     tolerancia radio de perdon del trazo, en unidades del viewBox (default 46)
     vocal      si viene (ej. 'A'), la pagina muestra SOLO esa vocal y encadena
                sus dos formas: primero la mayuscula, y al terminarla pasa sola
                a la minuscula. Es el modo que usa el menu. Sin `vocal`, la
                pagina muestra las cinco con el selector de abajo.

   COMO FUNCIONA EL TRAZADO
   - Cada trazo es un path abierto que se muestrea cada SAMPLE_STEP unidades
     con getPointAtLength(). En cada pointermove se busca la muestra MAS
     avanzada que caiga dentro de la tolerancia, mirando como maximo
     LOOKAHEAD muestras hacia adelante. Ese tope es lo que impide dos cosas:
     saltearse pedazos del trazo, y trazar en reversa.
   - Levantar el dedo NO pierde progreso: la manita guia reaparece desde
     donde iba.
   - El progreso se pinta con stroke-dasharray sobre el path de color.
     OJO: con stroke-linecap:round y dasharray 0, el navegador igual pinta
     un punto en el arranque — por eso el path de progreso arranca en
     display:none y aparece recien cuando hay avance real.
   - El punto de la i minuscula no es un trazo (un punto no tiene largo):
     se resuelve como un toque, ver `esperandoPunto`.

   QUE VE EL CHICO MIENTRAS TRAZA
   El dedo NO va destapando la letra de a poco. Lo que se pinta detras del
   dedo es la LINEA GUIA (`rastro`): la raya punteada se va llenando del
   color de la vocal a medida que el chico avanza. La figura de la letra
   aparece de golpe recien cuando el trazo esta completo.

   Es a proposito: la linea es lo que el chico esta siguiendo, asi que es
   ahi donde tiene que ver que va bien; y que la letra se pinte entera de
   una sirve de premio y marca con claridad que ese trazo termino.

   COMO SE REVELA EL COLOR
   El arte va en dos capas: abajo el estado apagado, arriba el color,
   recortado por una mascara que crece con el dedo. Hay dos calidades
   segun lo que haya entregado el disenador:

   a) SOLO EL RELLENO (minimo). La mascara es una linea gruesa de ancho
      fijo sobre el eje del trazo. Funciona, pero como el arte no tiene
      ancho constante deja algun borde sin cubrir, y en los cruces puede
      revelar de mas.

   b) CON LA TINTA DE CADA TRAZO (`tintas`). La mascara pasa a ser la
      tinta real de ese trazo, dilatada para tapar tambien el contorno
      (las piezas vienen sin borde: solo cubren ~80% de la letra), e
      intersectada con el avance del dedo. Cobertura exacta y cero
      invasion de los trazos vecinos — por eso ahi el `grosor` puede ser
      generoso, la tinta lo recorta igual.

   El estado apagado sale de `contorno` si el disenador lo mando; si no,
   se genera desaturando el relleno.
   ===================================================================== */
(function(global){
'use strict';

function TukuToonTracePage(cfg){
  cfg = cfg || {};

  var VOWELS = cfg.letras || global.VOCALES;
  // Modo "una vocal": la vista muestra la A y la a juntas, encadenadas. El
  // vinculo entre mayuscula y minuscula no es obvio a los 2-5 anos, y verlas
  // como dos caras de la misma vocal es justamente lo que hay que ensenar.
  var unaSola = false;
  if(cfg.vocal && VOWELS){
    var solo = VOWELS.filter(function(v){
      return v.letter.toUpperCase() === String(cfg.vocal).toUpperCase(); });
    if(solo.length){ VOWELS = solo; unaSola = true; }
  }
  if(!VOWELS || !VOWELS.length){
    document.body.innerHTML = '<p style="font:16px sans-serif;padding:24px">' +
      'No llegaron las letras: falta cargar vocales.js antes que el motor.</p>';
    return;
  }

  buildDOM(cfg);


/* =====================================================================
   DOM — lo arma el motor entero, la pagina no trae markup
   ===================================================================== */
function buildDOM(cfg){
  var titulo    = cfg.titulo    || 'TukuToon';
  var subtitulo = cfg.subtitulo || 'TRAZA LAS VOCALES';

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
      '<button class="icon-btn" id="reset-btn" title="Empezar esta letra de nuevo" ' +
        'aria-label="Empezar de nuevo">&#8634;</button>' +
      '<button class="icon-btn caso-btn" id="caso-btn" ' +
        'title="Cambiar entre mayuscula y minuscula" ' +
        'aria-label="Cambiar mayuscula o minuscula">Aa</button>' +
      '<div class="brand">' + titulo + '<small>' + subtitulo + '</small></div>' +
      '<div class="stars" id="stars" aria-label="Letras completadas"></div>' +
    '</header>' +

    '<p class="prompt" id="prompt">Segu\u00ed el camino con el dedo</p>' +

    '<main><svg id="stage" viewBox="0 0 1000 1000" ' +
      'preserveAspectRatio="xMidYMid meet"></svg></main>' +

    '<footer id="picker"></footer>' +
    '<canvas id="fx"></canvas>' +

    '<div id="card" role="dialog" aria-modal="true">' +
      '<div class="card-box">' +
        '<div class="card-emoji" id="card-emoji"></div>' +
        '<div class="card-word" id="card-word"></div>' +
        '<div class="card-hint">Toc\u00e1 para seguir jugando</div>' +
        '<div class="card-actions">' +
          '<button class="btn-again" id="btn-again">&#8634; Otra vez</button>' +
          '<button class="btn-next" id="btn-next">Siguiente &#8594;</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

/* Mayuscula o minuscula. La forma activa sale siempre de forma(v), nunca
   de v.strokes directo, asi agregar otro caso (cursiva, por ejemplo) es
   sumar una clave mas a cada vocal. */
var caso = cfg.caso || 'mayus';
function forma(v){ return v[caso]; }
function letraDe(v){ return caso === 'mayus' ? v.letter : v.letter.toLowerCase(); }

/* ---------- parametros de trazado ---------- */
var SAMPLE_STEP = 12;   // se muestrea el path cada 12 unidades del viewBox
var TOL         = cfg.tolerancia || 150; // tolerancia generosa: dedos chiquitos
var LOOKAHEAD   = 14;   // muestras maximas de avance por movimiento: no se puede saltear
var SVG_NS      = 'http://www.w3.org/2000/svg';
var XLINK_NS    = 'http://www.w3.org/1999/xlink';
var maskSeq     = 0;
var STORE_KEY   = cfg.storeKey || 'tukutoon:vocales:completadas';

/* ---------- estado ---------- */
var svg      = document.getElementById('stage');
var fx       = document.getElementById('fx');
var ctx      = fx.getContext('2d');
var cardEl   = document.getElementById('card');
var promptEl = document.getElementById('prompt');

var vIdx       = 0;     // vocal activa
var strokeIdx  = 0;     // trazo activo dentro de la vocal
var sampleIdx  = 0;     // muestra alcanzada dentro del trazo activo
var drawing    = false;
var locked     = false; // true mientras se festeja / hay tarjeta
var strokeData = [];
var handEl     = null;
var colorEl    = null;  // el grupo con el arte a color, para soltarle la mascara
var puntoEl    = null;  // el punto de la i minuscula
var puntoHalo  = null;
var esperandoPunto = false;
var done       = loadDone();
var reduced    = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* =====================================================================
   AUDIO (WebAudio, sin assets)
   ===================================================================== */
var AC = null;
function audio(){
  try{
    if(!AC){ var C = window.AudioContext || window.webkitAudioContext; if(C){ AC = new C(); } }
    if(AC && AC.state === 'suspended'){ AC.resume(); }
  }catch(e){ AC = null; }
  return AC;
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
function speak(text){
  try{
    if(!('speechSynthesis' in window)) return;
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
   UI: estrellas y selector de vocales
   ===================================================================== */
function buildStars(){
  var box = document.getElementById('stars');
  box.innerHTML = '';
  VOWELS.forEach(function(v){
    var s = document.createElementNS(SVG_NS, 'svg');
    s.setAttribute('viewBox', '0 0 100 100');
    s.setAttribute('class', 'star' + (done.indexOf(letraDe(v)) >= 0 ? ' on' : ''));
    var p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', 'M50 8 L62 38 L95 40 L69 60 L78 92 L50 74 L22 92 L31 60 L5 40 L38 38 Z');
    s.appendChild(p);
    box.appendChild(s);
  });
}
function buildPicker(){
  var box = document.getElementById('picker');
  box.innerHTML = '';

  if(unaSola){
    // el par de la vocal: A y a, con la activa marcada y la hecha con tilde
    var v0 = VOWELS[0];
    [['mayus', v0.letter], ['minus', v0.letter.toLowerCase()]].forEach(function(par){
      var b = document.createElement('button');
      var hecha = done.indexOf(par[1]) >= 0;
      b.className = 'vbtn par' + (caso === par[0] ? ' sel' : '') + (hecha ? ' done' : '');
      b.style.setProperty('--c', v0.color);
      b.textContent = par[1];
      b.setAttribute('aria-label', (par[0] === 'mayus' ? 'May\u00fascula ' : 'Min\u00fascula ') + par[1]);
      b.addEventListener('click', function(){
        if(caso === par[0]) return;
        hideCard(); caso = par[0]; loadVowel(0);
      });
      box.appendChild(b);
    });
    return;
  }

  VOWELS.forEach(function(v, i){
    var b = document.createElement('button');
    b.className = 'vbtn' + (i === vIdx ? ' sel' : '') + (done.indexOf(letraDe(v)) >= 0 ? ' done' : '');
    b.style.setProperty('--c', v.color);
    b.textContent = letraDe(v);
    b.setAttribute('aria-label', 'Vocal ' + letraDe(v));
    // el selector nunca se bloquea: cambiar de vocal siempre es seguro, incluso
    // durante el festejo (si no, queda mudo hasta que aparece la tarjeta)
    b.addEventListener('click', function(){ hideCard(); loadVowel(i); });
    box.appendChild(b);
  });
}
function refreshChrome(){
  buildStars();
  buildPicker();
  cardEl.style.setProperty('--c', VOWELS[vIdx].color);
  var cb = document.getElementById('caso-btn');
  // en modo una vocal el flujo encadena las dos formas: el boton sobra
  cb.style.display = unaSola ? 'none' : '';
  cb.textContent = caso === 'mayus' ? 'Aa' : 'aA';
  cb.className = 'icon-btn caso-btn' + (caso === 'minus' ? ' min' : '');
}

/* =====================================================================
   CONSTRUCCION DE LA LETRA
   ===================================================================== */
function mkPath(d, cls){
  var p = document.createElementNS(SVG_NS, 'path');
  p.setAttribute('d', d);
  p.setAttribute('class', cls);
  return p;
}

function loadVowel(i){
  vIdx = i; strokeIdx = 0; sampleIdx = 0; drawing = false; locked = false;
  esperandoPunto = false; puntoEl = null; puntoHalo = null; colorEl = null;
  var v = VOWELS[vIdx], F = forma(v);
  svg.innerHTML = '';
  strokeData = [];

  // cada forma se muestra con su propio encuadre (ver `caja` en vocales.js)
  svg.setAttribute('viewBox', F.caja || '0 0 1000 1000');

  var gRoot = document.createElementNS(SVG_NS, 'g');

  /* El arte del disenador va en dos capas superpuestas:
       - abajo, la letra desaturada: el estado "todavia no trazada"
       - arriba, la misma letra a color, recortada por una mascara que
         crece con el dedo. Asi el color aparece por donde el chico paso.
     La mascara tiene un path por trazo; su stroke-dasharray es el progreso. */
  var maskId = 'revelado-' + (++maskSeq);
  var defs = document.createElementNS(SVG_NS, 'defs');
  // convierte la tinta de un trazo en mascara: la dilata para que tape
  // tambien el contorno del arte, y la pinta de blanco (mascara = luminancia)
  var dilId = 'tinta-' + maskSeq;
  var fd = document.createElementNS(SVG_NS, 'filter');
  fd.setAttribute('id', dilId);
  fd.setAttribute('filterUnits', 'userSpaceOnUse');
  fd.setAttribute('x', '-100'); fd.setAttribute('y', '-100');
  fd.setAttribute('width', '1200'); fd.setAttribute('height', '1200');
  var fm = document.createElementNS(SVG_NS, 'feMorphology');
  fm.setAttribute('operator', 'dilate');
  fm.setAttribute('radius', String(cfg.dilatado || 16));
  fd.appendChild(fm);
  var fc = document.createElementNS(SVG_NS, 'feColorMatrix');
  fc.setAttribute('type', 'matrix');
  fc.setAttribute('values', '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0');
  fd.appendChild(fc);

  var blurId = 'suave-' + maskSeq;
  var fl = document.createElementNS(SVG_NS, 'filter');
  fl.setAttribute('id', blurId);
  fl.setAttribute('filterUnits', 'userSpaceOnUse');
  fl.setAttribute('x', '-200'); fl.setAttribute('y', '-200');
  fl.setAttribute('width', '1400'); fl.setAttribute('height', '1400');
  var gb = document.createElementNS(SVG_NS, 'feGaussianBlur');
  gb.setAttribute('stdDeviation', String(cfg.suavizado || 8));
  fl.appendChild(gb);
  defs.appendChild(fl);
  defs.appendChild(fd);

  var mask = document.createElementNS(SVG_NS, 'mask');
  mask.setAttribute('id', maskId);
  mask.setAttribute('maskUnits', 'userSpaceOnUse');
  mask.setAttribute('x', '0'); mask.setAttribute('y', '0');
  mask.setAttribute('width', '1000'); mask.setAttribute('height', '1000');
  defs.appendChild(mask);
  svg.appendChild(defs);

  // los paths del revelado van dentro de un grupo desenfocado
  var maskG = document.createElementNS(SVG_NS, 'g');
  maskG.setAttribute('filter', 'url(#' + blurId + ')');
  mask.appendChild(maskG);

  // Estado apagado: si el disenador mando un contorno, ese; si no, el
  // relleno desaturado. El contorno se lee mejor como "esperando que lo
  // llenen", y ademas trata igual a todas las letras (desaturar deja la
  // E mucho mas oscura que la A, porque conserva la luminosidad original).
  var gris = document.createElementNS(SVG_NS, 'image');
  gris.setAttribute('class', F.contorno ? 'arte-contorno' : 'arte-gris');
  gris.setAttribute('x', '0'); gris.setAttribute('y', '0');
  gris.setAttribute('width', '1000'); gris.setAttribute('height', '1000');
  gris.setAttributeNS(XLINK_NS, 'href', F.contorno || F.arte);
  gris.setAttribute('href', F.contorno || F.arte);
  svg.appendChild(gris);

  // El arte a color. Con `tintas` se arma una capa por trazo (cada una
  // recortada por su tinta Y por el avance del dedo); sin `tintas`, una
  // sola capa recortada por la mascara de ejes.
  //
  // OJO con la estructura: NO se puede poner un `mask` sobre un grupo que
  // vive DENTRO del contenido de otra <mask> — Chrome no lo aplica y no
  // revela nada. Por eso las dos mascaras se apilan sobre contenido normal.
  var gColor = document.createElementNS(SVG_NS, 'g');
  if(!F.tintas){ gColor.setAttribute('mask', 'url(#' + maskId + ')'); }
  colorEl = gColor;
  if(!F.tintas){
    var color = document.createElementNS(SVG_NS, 'image');
    color.setAttribute('class', 'arte-color');
    color.setAttribute('x', '0'); color.setAttribute('y', '0');
    color.setAttribute('width', '1000'); color.setAttribute('height', '1000');
    color.setAttributeNS(XLINK_NS, 'href', F.arte);
    color.setAttribute('href', F.arte);
    gColor.appendChild(color);
  }
  svg.appendChild(gColor);

  svg.appendChild(gRoot);   // las guias van encima del arte

  F.strokes.forEach(function(d, si){
    var g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'stroke-g' + (si === 0 ? ' active' : ''));

    var dash = mkPath(d, 'dashes');
    // El rastro va DEBAJO del punteado: la raya blanca queda encima del
    // color, como la linea del medio de una calle recien pintada.
    var rastro = mkPath(d, 'rastro');
    rastro.setAttribute('stroke', v.color);
    g.appendChild(rastro);
    g.appendChild(dash);
    gRoot.appendChild(g);

    // El path que marca cuanto avanzo el dedo.
    var rev = mkPath(d, 'revelado');
    rev.setAttribute('stroke', '#fff');
    rev.setAttribute('stroke-width', F.grosor || 240);

    var tinta = F.tintas && F.tintas[si];
    if(tinta){
      // mascara A: la tinta de este trazo, dilatada para tapar el contorno
      var tintaId = 'tinta-' + maskSeq + '-' + si;
      var mT = document.createElementNS(SVG_NS, 'mask');
      mT.setAttribute('id', tintaId);
      mT.setAttribute('maskUnits', 'userSpaceOnUse');
      mT.setAttribute('x', '-100'); mT.setAttribute('y', '-100');
      mT.setAttribute('width', '1200'); mT.setAttribute('height', '1200');
      var imgT = document.createElementNS(SVG_NS, 'image');
      imgT.setAttribute('x', '0'); imgT.setAttribute('y', '0');
      imgT.setAttribute('width', '1000'); imgT.setAttribute('height', '1000');
      imgT.setAttributeNS(XLINK_NS, 'href', tinta);
      imgT.setAttribute('href', tinta);
      imgT.setAttribute('filter', 'url(#' + dilId + ')');
      mT.appendChild(imgT);
      defs.appendChild(mT);

      // mascara B: hasta donde llego el dedo
      var avanceId = 'avance-' + maskSeq + '-' + si;
      var mAv = document.createElementNS(SVG_NS, 'mask');
      mAv.setAttribute('id', avanceId);
      mAv.setAttribute('maskUnits', 'userSpaceOnUse');
      mAv.setAttribute('x', '-100'); mAv.setAttribute('y', '-100');
      mAv.setAttribute('width', '1200'); mAv.setAttribute('height', '1200');
      var gAv = document.createElementNS(SVG_NS, 'g');
      gAv.setAttribute('filter', 'url(#' + blurId + ')');
      gAv.appendChild(rev);
      mAv.appendChild(gAv);
      defs.appendChild(mAv);

      // las dos apiladas sobre una copia del arte a color
      var capaAvance = document.createElementNS(SVG_NS, 'g');
      capaAvance.setAttribute('mask', 'url(#' + avanceId + ')');
      var capaTinta = document.createElementNS(SVG_NS, 'g');
      capaTinta.setAttribute('mask', 'url(#' + tintaId + ')');
      var imgC = document.createElementNS(SVG_NS, 'image');
      imgC.setAttribute('class', 'arte-color');
      imgC.setAttribute('x', '0'); imgC.setAttribute('y', '0');
      imgC.setAttribute('width', '1000'); imgC.setAttribute('height', '1000');
      imgC.setAttributeNS(XLINK_NS, 'href', F.arte);
      imgC.setAttribute('href', F.arte);
      capaTinta.appendChild(imgC);
      capaAvance.appendChild(capaTinta);
      gColor.appendChild(capaAvance);
    }else{
      maskG.appendChild(rev);
    }

    var len = rev.getTotalLength();
    var samples = [];
    for(var l = 0; l <= len; l += SAMPLE_STEP){
      var pt = rev.getPointAtLength(l);
      samples.push({ x:pt.x, y:pt.y, l:l });
    }
    var last = rev.getPointAtLength(len);
    samples.push({ x:last.x, y:last.y, l:len });

    rev.style.strokeDasharray = '0 ' + (len + 10);
    rev.style.display = 'none';   // linecap round revela un punto con largo 0

    rastro.style.strokeDasharray = '0 ' + (len + 10);
    rastro.style.display = 'none';   // linecap round pinta un punto con largo 0

    strokeData.push({ g:g, prog:rev, road:rev, dash:dash, rastro:rastro,
                      len:len, samples:samples, grosor:(F.grosor || 240) });
  });

  addArrows();

  /* Punto de la i. Antes se dibujaba con circulos propios encima del arte,
     y como el contorno del disenador YA trae su punto, quedaban los dos
     superpuestos: un pegote gris tapando el dibujo. Ahora el punto apagado
     es el del contorno, y al tocarlo se revela su tinta igual que un trazo.
     Lo unico dibujado es el aro que late, para que se note que hay que
     tocarlo ahi. */
  if(F.punto){
    var pt = F.punto;

    if(F.tintaPunto){
      var mPt = document.createElementNS(SVG_NS, 'mask');
      mPt.setAttribute('id', 'punto-' + maskSeq);
      mPt.setAttribute('maskUnits', 'userSpaceOnUse');
      mPt.setAttribute('x', '-100'); mPt.setAttribute('y', '-100');
      mPt.setAttribute('width', '1200'); mPt.setAttribute('height', '1200');
      var imPt = document.createElementNS(SVG_NS, 'image');
      imPt.setAttribute('x', '0'); imPt.setAttribute('y', '0');
      imPt.setAttribute('width', '1000'); imPt.setAttribute('height', '1000');
      imPt.setAttributeNS(XLINK_NS, 'href', F.tintaPunto);
      imPt.setAttribute('href', F.tintaPunto);
      imPt.setAttribute('filter', 'url(#' + dilId + ')');
      mPt.appendChild(imPt);
      defs.appendChild(mPt);

      var capaPt = document.createElementNS(SVG_NS, 'g');
      capaPt.setAttribute('mask', 'url(#punto-' + maskSeq + ')');
      capaPt.style.display = 'none';
      var imgPt = document.createElementNS(SVG_NS, 'image');
      imgPt.setAttribute('class', 'arte-color');
      imgPt.setAttribute('x', '0'); imgPt.setAttribute('y', '0');
      imgPt.setAttribute('width', '1000'); imgPt.setAttribute('height', '1000');
      imgPt.setAttributeNS(XLINK_NS, 'href', F.arte);
      imgPt.setAttribute('href', F.arte);
      capaPt.appendChild(imgPt);
      gColor.appendChild(capaPt);
      puntoEl = capaPt;
    }

    var pg = document.createElementNS(SVG_NS, 'g');
    pg.setAttribute('class', 'punto-g');
    pg.innerHTML =
      '<circle class="punto-halo" cx="' + pt.x + '" cy="' + pt.y + '" r="' + (pt.r + 10) + '"/>';
    svg.appendChild(pg);
    puntoHalo = pg.querySelector('.punto-halo');
  }

  // carita: apagada por defecto. El arte del disenador ya tiene su
  // propio caracter, y una carita generica encima lo abarata.
  var f = cfg.caritas ? F.face : null;
  if(f){
  var face = document.createElementNS(SVG_NS, 'g');
  face.setAttribute('class', 'face');
  face.setAttribute('transform', 'translate(' + f.x + ' ' + f.y + ') scale(' + f.s + ')');
  face.innerHTML =
    '<circle class="cheek" cx="-23" cy="7" r="5.5"/>' +
    '<circle class="cheek" cx="23" cy="7" r="5.5"/>' +
    '<g class="eyes">' +
      '<ellipse cx="-13" cy="-7" rx="4.6" ry="6.4"/>' +
      '<ellipse cx="13" cy="-7" rx="4.6" ry="6.4"/>' +
    '</g>' +
    '<path class="mouth" d="M-11 7 Q0 17 11 7"/>';
  svg.appendChild(face);
  }

  // manita guia
  handEl = document.createElementNS(SVG_NS, 'text');
  handEl.setAttribute('class', 'hand');
  handEl.setAttribute('text-anchor', 'middle');
  handEl.textContent = '👆';
  svg.appendChild(handEl);

  promptEl.textContent = 'Seguí el camino con el dedo';
  refreshChrome();
  startHand();
}

function addArrows(){
  strokeData.forEach(function(s){
    var a = s.road.getPointAtLength(Math.max(0, s.len - 45));
    var b = s.road.getPointAtLength(s.len);
    var ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    var tri = document.createElementNS(SVG_NS, 'path');
    tri.setAttribute('d', 'M-13 -13 L15 0 L-13 13 Z');
    tri.setAttribute('fill', 'rgba(48,34,86,.6)');
    tri.setAttribute('class', 'arrow');
    tri.setAttribute('opacity', '.95');
    tri.setAttribute('transform', 'translate(' + b.x + ' ' + b.y + ') rotate(' + ang + ')');
    s.g.appendChild(tri);
  });
}

/* =====================================================================
   TRAZADO
   ===================================================================== */
function toSvg(evt){
  var m = svg.getScreenCTM();
  if(!m) return { x:-9999, y:-9999 };
  var pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  var p = pt.matrixTransform(m.inverse());
  return { x:p.x, y:p.y };
}
function dist2(a, b){ var dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; }

/* El perdon no puede ser mayor que el propio trazo: si TOL (150) supera al
   largo, cualquier punto del trazo queda al alcance desde cualquier otro y
   el trazo se puede dar por hecho sin recorrerlo. Pasa en los trazos cortos
   — el palito de la i mide 176 y la barrita de la e, 175. */
function tolDe(s){
  return Math.min(TOL, Math.max(70, s.len * 0.6));
}

function paintProgress(){
  var s = strokeData[strokeIdx]; if(!s) return;
  var l = s.samples[sampleIdx].l;
  // Se pinta la LINEA, no la letra. La mascara del arte (s.prog) se queda
  // en cero hasta que el trazo este completo — ver completeStroke.
  s.rastro.style.display = l > 0 ? '' : 'none';
  s.rastro.style.strokeDasharray = l + ' ' + (s.len + 10);
}

function advance(p){
  var s = strokeData[strokeIdx]; if(!s) return;
  // El tope de avance no puede superar una fraccion del propio trazo. En
  // los trazos cortos LOOKAHEAD queda mas largo que el trazo entero (la
  // barra del medio de la E mide 134 unidades y LOOKAHEAD permite 168), y
  // entonces un solo toque lo completaba de una.
  var tope = Math.max(2, Math.min(LOOKAHEAD, Math.floor(s.samples.length * 0.35)));
  var top = Math.min(sampleIdx + tope, s.samples.length - 1);
  var tolS = tolDe(s);
  var best = -1, tol2 = tolS * tolS;
  for(var i = sampleIdx; i <= top; i++){
    if(dist2(p, s.samples[i]) <= tol2){ best = i; }  // la mas avanzada dentro de la tolerancia
  }
  if(best > sampleIdx){
    sampleIdx = best;
    paintProgress();
    if(sampleIdx >= s.samples.length - 1){ completeStroke(); }
  }
}

function onDown(e){
  if(locked) return;
  audio();

  // si falta el punto de la i, el unico gesto valido es tocarlo
  if(esperandoPunto){
    var pu = forma(VOWELS[vIdx]).punto;
    var q = toSvg(e);
    if(dist2(q, pu) <= (pu.r + TOL) * (pu.r + TOL)){
      esperandoPunto = false;
      puntoHalo.classList.remove('on');
      if(puntoEl) puntoEl.style.display = '';
      pop(760, .18);
      sparkles(pu, VOWELS[vIdx].color);
      completeLetter();
    }
    e.preventDefault();
    return;
  }

  var s = strokeData[strokeIdx]; if(!s) return;
  var p = toSvg(e);
  var startTol = tolDe(s) * 1.25;
  if(dist2(p, s.samples[sampleIdx]) <= startTol * startTol){
    drawing = true;
    stopHand();
    try{ svg.setPointerCapture(e.pointerId); }catch(err){}
    advance(p);
  }else{
    promptEl.textContent = 'Empezá desde la manita 👆';
    startHand();
  }
  e.preventDefault();
}
function onMove(e){
  if(!drawing || locked) return;
  advance(toSvg(e));
  e.preventDefault();
}
function onUp(e){
  if(!drawing) return;
  drawing = false;
  try{ svg.releasePointerCapture(e.pointerId); }catch(err){}
  // levantar el dedo NO pierde progreso: la manita vuelve desde donde iba
  if(!locked){ startHand(); }
}

function completeStroke(){
  var s = strokeData[strokeIdx];
  s.prog.style.display = '';
  s.prog.style.strokeDasharray = 'none';
  // NO ensanchar la mascara aca. Se probo (x1.22, para tapar el borde gris
  // que deja el ancho fijo sobre un arte de ancho variable) y el remedio fue
  // peor: en la A las dos diagonales terminaban tapando la barrita, asi que
  // el chico veia la letra completa y el juego le pedia un trazo mas que ya
  // no tenia nada que revelar. El borde gris que quede durante el trazado se
  // limpia solo al completar la letra, cuando se suelta la mascara entera.
  s.g.classList.remove('active');
  s.g.classList.add('finished');
  // el trazo ya esta hecho: se van las guias y queda la letra pintada
  s.dash.style.display = 'none';
  s.rastro.style.display = 'none';
  var ar = s.g.querySelector('.arrow'); if(ar){ ar.style.display = 'none'; }
  s.road.classList.add('done');
  drawing = false;

  sparkles(s.samples[s.samples.length - 1], VOWELS[vIdx].color);
  pop(660, .18);

  strokeIdx++;
  sampleIdx = 0;

  if(strokeIdx >= strokeData.length){
    if(puntoEl && !esperandoPunto){
      esperandoPunto = true;
      puntoHalo.classList.add('on');
      promptEl.textContent = 'Ahora tocá el puntito 👆';
      stopHand();
      return;
    }
    completeLetter();
  }else{
    strokeData[strokeIdx].g.classList.add('active');
    promptEl.textContent = 'Ahora este ✨';
    startHand();
  }
}

function completeLetter(){
  locked = true;
  stopHand();
  var v = VOWELS[vIdx];
  if(done.indexOf(letraDe(v)) < 0){ done.push(letraDe(v)); saveDone(); }
  refreshChrome();
  if(colorEl){
    // el arte entero, sin ninguna mascara: asi no queda ningun resto
    // apagado por mas que las tintas no cubran el 100% de la letra
    colorEl.removeAttribute('mask');
    colorEl.innerHTML = '';
    var entero = document.createElementNS(SVG_NS, 'image');
    entero.setAttribute('class', 'arte-color');
    entero.setAttribute('x', '0'); entero.setAttribute('y', '0');
    entero.setAttribute('width', '1000'); entero.setAttribute('height', '1000');
    entero.setAttributeNS(XLINK_NS, 'href', forma(VOWELS[vIdx]).arte);
    entero.setAttribute('href', forma(VOWELS[vIdx]).arte);
    colorEl.appendChild(entero);
  }
  confetti(v.color);
  fanfare();

  if(unaSola && caso === 'mayus' && v.minus){
    // Termino la mayuscula: se festeja corto y pasa sola a la minuscula.
    // La tarjeta con la palabra se guarda para el final, cuando estan las dos:
    // asi el premio es de la vocal completa, no de media.
    promptEl.textContent = '¡Muy bien! Ahora la chiquita';
    setTimeout(function(){ speak(v.letter); }, 380);
    setTimeout(function(){
      caso = 'minus';
      loadVowel(0);
    }, 1500);
    return;
  }

  promptEl.textContent = '¡Muy bien! 🎉';
  setTimeout(function(){ speak(v.letter); }, 420);
  setTimeout(function(){ speak(v.word); }, 1250);
  setTimeout(showCard, 900);
}

svg.addEventListener('pointerdown', onDown);
svg.addEventListener('pointermove', onMove);
svg.addEventListener('pointerup', onUp);
svg.addEventListener('pointercancel', onUp);

/* =====================================================================
   MANITA GUIA
   ===================================================================== */
var handRAF = null, handT0 = 0;
function startHand(){
  stopHand();
  if(!handEl) return;
  var s = strokeData[strokeIdx]; if(!s) return;
  var from = s.samples[sampleIdx].l, to = s.len;
  var dur  = Math.max(900, (to - from) * 9);   // ms
  handT0 = 0;
  handEl.classList.remove('hide');

  handRAF = requestAnimationFrame(function frame(ts){
    if(!handT0){ handT0 = ts; }
    var t = (ts - handT0) % (dur + 500);
    if(t > dur){
      handEl.classList.add('hide');
    }else{
      handEl.classList.remove('hide');
      var pt = s.road.getPointAtLength(Math.min(from + (to - from) * (t / dur), s.len));
      handEl.setAttribute('x', pt.x);
      handEl.setAttribute('y', pt.y + 92);
    }
    handRAF = requestAnimationFrame(frame);
  });
}
function stopHand(){
  if(handRAF){ cancelAnimationFrame(handRAF); handRAF = null; }
  if(handEl){ handEl.classList.add('hide'); }
}

/* =====================================================================
   PARTICULAS: chispitas por trazo + confeti por vocal
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

function svgToScreen(p){
  var m = svg.getScreenCTM();
  if(!m) return { x:window.innerWidth / 2, y:window.innerHeight / 2 };
  var pt = svg.createSVGPoint(); pt.x = p.x; pt.y = p.y;
  var r = pt.matrixTransform(m);
  return { x:r.x, y:r.y };
}

function sparkles(svgPoint, color){
  var o = svgToScreen(svgPoint);
  var n = reduced ? 8 : 18;
  for(var i = 0; i < n; i++){
    var a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 4;
    parts.push({ x:o.x, y:o.y, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp - 1,
                 g:.12, r:2 + Math.random() * 3, life:1, dec:.02 + Math.random() * .02,
                 c:(Math.random() < .5 ? color : '#FFFFFF'), sq:false });
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
   TARJETA DE PALABRA
   ===================================================================== */
function showCard(){
  var v = VOWELS[vIdx];
  cardEl.style.setProperty('--c', v.color);
  document.getElementById('card-emoji').textContent = v.emoji;
  document.getElementById('card-word').innerHTML =
    '<b>' + letraDe(v) + '</b>' + v.word.slice(1).toLowerCase();
  if(unaSola && cfg.menuHref){
    document.getElementById('btn-next').innerHTML = 'Al men\u00fa \u2192';
  }
  cardEl.classList.add('show');
}
function hideCard(){ cardEl.classList.remove('show'); }

document.getElementById('btn-again').addEventListener('click', function(e){
  e.stopPropagation(); hideCard(); loadVowel(vIdx);
});
document.getElementById('btn-next').addEventListener('click', function(e){
  e.stopPropagation();
  if(unaSola && cfg.menuHref){ location.href = cfg.menuHref; return; }
  hideCard(); loadVowel((vIdx + 1) % VOWELS.length);
});
cardEl.addEventListener('click', function(e){
  if(e.target === cardEl){ hideCard(); loadVowel((vIdx + 1) % VOWELS.length); }
});
document.getElementById('reset-btn').addEventListener('click', function(){
  hideCard(); loadVowel(vIdx);
});
document.getElementById('caso-btn').addEventListener('click', function(){
  caso = (caso === 'mayus') ? 'minus' : 'mayus';
  hideCard(); loadVowel(vIdx);
});

/* =====================================================================
   ARRANQUE
   ===================================================================== */
window.addEventListener('resize', function(){
  sizeFx();
  if(!locked && !drawing){ startHand(); }
});
document.addEventListener('gesturestart', function(e){ e.preventDefault(); });

  // en modo una vocal se arranca siempre por la mayuscula
  if(unaSola) caso = 'mayus';
  loadVowel(0);


}

global.TukuToonTracePage = TukuToonTracePage;

})(window);
