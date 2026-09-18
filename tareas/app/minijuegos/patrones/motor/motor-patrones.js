/* =====================================================================
   MOTOR DE PATRONES — engine del minijuego de completar guirnaldas.
   Mismo criterio que motor-globos.js: el motor arma TODO el DOM por JS
   (header, consigna, Tukutoon, guirnalda, bandeja, selector, tarjeta) y
   la pagina HTML en si es minima.

   Uso desde una pagina:

       <link rel="stylesheet" href="motor/motor-patrones.css">
       <script src="patrones.js"></script>
       <script src="motor/motor-patrones.js"></script>
       <script>TukuToonPatternPage({ rondas:PATRONES_RONDAS, bancos:PATRONES_BANCOS });</script>

   Config aceptada:
     rondas     array de rondas (ver patrones.js). Obligatorio.
     bancos     bancos de figuras (ver patrones.js). Obligatorio.
     ronda      id de una ronda sola: esconde el selector de abajo
     titulo     texto grande del header            (default 'TukuToon')
     subtitulo  bajada del header                  (default 'PATRONES')
     menuHref   si viene, agrega boton de volver al menu
     storeKey   clave de localStorage del progreso (default abajo)

   ---------------------------------------------------------------------
   LA HISTORIA

   Tukutoon esta armando una decoracion (guirnalda de globos, lucecitas,
   adornos) y le falta una pieza. El chico la arrastra desde la bandeja de
   abajo hasta el hueco. Si es la que sigue en el patron, se cuelga sola y
   Tukutoon festeja; si no, vuelve rebotando a la bandeja sin que nada se
   pierda ni se resta.

   NO HAY DIBUJO PROPIO DE LAS PIEZAS, SON EMOJIS. La figura es
   directamente el caracter de texto del banco (ver patrones.js). Lo que
   SI se dibuja a mano es Tukutoon (`tukuGrupo`), en SVG con primitivas
   simples (rectangulos, circulos, un par de curvas) — nada de asset:
   así cualquiera puede tocar sus colores o su pose sin pedirle nada a un
   disenador.

   ---------------------------------------------------------------------
   EL ARRASTRE (Pointer Events, no Drag&Drop de HTML)

   Se usa `pointerdown/move/up` y no la API nativa de drag&drop porque
   esa API tiene soporte flojo en mobile/touch, que es donde vive este
   juego. Cada pieza vive dentro de un `.slot` de tamaño fijo en la
   bandeja: al agarrarla, la pieza pasa a `position:fixed` y sigue al
   dedo, pero el `.slot` (vacio por dentro mientras tanto) sigue
   ocupando su lugar — así la bandeja no se reacomoda debajo del dedo
   mientras se arrastra.

   SOLTAR CERCA ALCANZA. El hueco (`sobreHueco`) acepta el toque con un
   margen de perdon de la mitad de su tamano para cada lado: un dedo de
   2 a 4 anos no suelta pixel-perfecto.

   NO HAY FORMA DE PERDER. Soltar la pieza que no es sobre el hueco solo
   la hace rebotar de vuelta a la bandeja con un sonido grave — no resta
   ni bloquea nada. A los dos rebotes seguidos DE ESTE MISMO patron, la
   pieza correcta late sola en la bandeja, igual criterio que la pista de
   globos.

   UN PATRON POR VEZ, VARIOS POR RONDA. Colgar un patron bien no gana la
   ronda: hacen falta ACIERTOS_POR_RONDA para que se sume la estrella,
   así la ronda es practica de la regla y no un tiro unico.
   ===================================================================== */
(function(global){
'use strict';

function TukuToonPatternPage(cfg){
  cfg = cfg || {};

  var BANCOS = cfg.bancos || global.PATRONES_BANCOS;
  var RONDAS = cfg.rondas || global.PATRONES_RONDAS;
  if(!RONDAS || !RONDAS.length || !BANCOS){
    document.body.innerHTML = '<p style="font:16px sans-serif;padding:24px">' +
      'No llegaron las rondas: falta cargar patrones.js antes que el motor.</p>';
    return;
  }

  // una ronda sola (?ronda=abc): sin selector abajo
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
  var subtitulo = cfg.subtitulo || 'PATRONES';

  var volver = cfg.menuHref
    ? '<a class="icon-btn" id="menu-btn" href="' + cfg.menuHref +
      '" title="Volver al menu" aria-label="Volver al menu">&#8592;</a>'
    : '';

  document.body.innerHTML =
    '<header>' +
      volver +
      '<button class="icon-btn" id="reset-btn" title="Empezar esta ronda de nuevo" ' +
        'aria-label="Empezar de nuevo">&#8634;</button>' +
      '<div class="brand">' + titulo + '<small>' + subtitulo + '</small></div>' +
      '<div class="stars" id="stars" aria-label="Rondas completadas"></div>' +
    '</header>' +

    '<p class="prompt" id="prompt"></p>' +

    '<main>' +
      '<div class="tuku" id="tuku" aria-hidden="true"></div>' +
      '<div class="secuencia" id="secuencia"></div>' +
      '<div class="bandeja" id="bandeja"></div>' +
    '</main>' +

    '<footer id="picker"' + (unaSola ? ' class="oculto"' : '') + '></footer>' +

    '<div id="card" role="dialog" aria-modal="true">' +
      '<div class="card-box">' +
        '<div class="card-tuku" id="card-tuku"></div>' +
        '<div class="card-emoji" id="card-emoji"></div>' +
        '<div class="card-word" id="card-word"></div>' +
        '<div class="card-hint">Tocá para seguir jugando</div>' +
        '<div class="card-actions">' +
          '<button class="btn-again" id="btn-again">&#8634; Otra vez</button>' +
          '<button class="btn-next" id="btn-next">Siguiente &#8594;</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

/* ---------- parametros ---------- */
var STORE_KEY        = cfg.storeKey || 'tukutoon:patrones:completadas';
var N_OPCIONES       = 4;   // cuantas piezas se ofrecen siempre en la bandeja
var ACIERTOS_POR_RONDA = 3; // patrones bien colgados para ganar la estrella
var ERRORES_PISTA    = 2;   // rebotes seguidos (de este patron) antes de la pista

/* ---------- estado ---------- */
var promptEl = document.getElementById('prompt');
var cardEl   = document.getElementById('card');
var tukuWrap = document.getElementById('tuku');

var rIdx     = 0;         // ronda activa
var roles    = {};        // letra del patron -> figura sorteada esta vuelta
var secuenciaActual = [];  // figuras mostradas antes del hueco
var correcto = null;       // figura que corresponde al hueco
var opcionesActuales = []; // figuras de las piezas de la bandeja, en su orden
var huecoEl  = null;       // la ficha vacia, destino del arrastre
var piezasEls = [];        // [{el, valor, slot}] de la bandeja actual
var aciertos = 0;   // patrones colgados bien en esta ronda
var errores  = 0;   // rebotes seguidos, de ESTE patron
var resueltos = []; // figuras correctas colgadas, en orden: para la tarjeta
var locked   = false; // true durante el festejo de un acierto o la tarjeta
var done     = loadDone();

/* ---------- helpers chicos ---------- */
function barajar(a){
  for(var i = a.length - 1; i > 0; i--){
    var j = (Math.random() * (i + 1)) | 0, t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function indiceDeRonda(id){
  for(var i = 0; i < RONDAS.length; i++){ if(RONDAS[i].id === id) return i; }
  return -1;
}
/* Las letras distintas de un patron, en el orden en que aparecen. AAB
   tiene solo dos (A y B) aunque la lista mida 3 — eso es lo que hace que
   el reparto de figuras (`sortearRoles`) le de una figura a A y otra a B,
   no tres. */
function rolesUnicos(patron){
  var vistos = [], out = [];
  patron.forEach(function(p){ if(vistos.indexOf(p) < 0){ vistos.push(p); out.push(p); } });
  return out;
}

/* =====================================================================
   TUKUTOON — el personaje, dibujado con primitivas SVG (sin assets)
   Cabeza rectangular con ojos de corazon, dos moños-antena, brazos en
   alto y piernas paradas: la misma pose "festejando" del personaje que
   ya existe en el juego de colorear (a-pintar/paginas/tuku), pero acá
   coloreado y simplificado a formas basicas para poder animarlo.
   ===================================================================== */
var SVG_NS = 'http://www.w3.org/2000/svg';
function nodo(tag, attrs){
  var e = document.createElementNS(SVG_NS, tag);
  for(var k in attrs){
    if(Object.prototype.hasOwnProperty.call(attrs, k)){ e.setAttribute(k, attrs[k]); }
  }
  return e;
}
function corazonOjo(cx){
  var g = nodo('g', { transform:'translate(' + cx + ',-4)', 'class':'ojo' });
  g.appendChild(nodo('circle', { r:30, 'class':'ojo-fondo' }));
  var cor = nodo('g', { 'class':'ojo-corazon' });
  cor.appendChild(nodo('circle', { cx:-8, cy:-5, r:9 }));
  cor.appendChild(nodo('circle', { cx:8,  cy:-5, r:9 }));
  cor.appendChild(nodo('path',   { d:'M-15 -3 L0 14 L15 -3 Z' }));
  g.appendChild(cor);
  return g;
}
function moño(){
  var g = nodo('g', { 'class':'moño' });
  g.appendChild(nodo('path', { d:'M0 0 L-20 -11 L-20 11 Z' }));
  g.appendChild(nodo('path', { d:'M0 0 L20 -11 L20 11 Z' }));
  g.appendChild(nodo('circle', { r:5, 'class':'moño-nudo' }));
  return g;
}
function antena(lado){
  var x = 16 * lado;
  var g = nodo('g', { transform:'translate(' + (78 * lado) + ',-82)' });
  g.appendChild(nodo('line', { x1:0, y1:0, x2:x, y2:-30, 'class':'antena-linea' }));
  var b = moño();
  b.setAttribute('transform', 'translate(' + x + ',-30)');
  g.appendChild(b);
  return g;
}
function brazo(lado){
  var x1 = 104 * lado, x2 = 150 * lado, x3 = 168 * lado, x4 = 148 * lado;
  var g = nodo('g', { 'class':'brazo' });
  g.appendChild(nodo('path', {
    d:'M' + x1 + ' -6 C ' + x2 + ' -2 ' + x3 + ' -55 ' + x4 + ' -96',
    'class':'brazo-linea'
  }));
  var mano = nodo('g', { transform:'translate(' + x4 + ',-96)', 'class':'mano' });
  mano.appendChild(nodo('circle', { r:20 }));
  [-14, 0, 14].forEach(function(dx){
    mano.appendChild(nodo('line', { x1:dx, y1:-16, x2:dx * 1.3, y2:-32, 'class':'dedo' }));
  });
  g.appendChild(mano);
  return g;
}
function pierna(lado){
  var x = 30 * lado;
  var g = nodo('g', {});
  g.appendChild(nodo('rect', { x:x - 15, y:76, width:30, height:54, rx:15, 'class':'pierna-caño' }));
  g.appendChild(nodo('ellipse', { cx:x, cy:136, rx:24, ry:13, 'class':'pie' }));
  return g;
}
function cabeza(){
  return nodo('rect', { x:-108, y:-84, width:216, height:164, rx:36, 'class':'cabeza' });
}
function cara(){
  var g = nodo('g', {});
  g.appendChild(corazonOjo(-46));
  g.appendChild(corazonOjo(46));
  g.appendChild(nodo('ellipse', { cx:0, cy:26, rx:6, ry:5, 'class':'nariz' }));
  g.appendChild(nodo('path', { d:'M-18 40 Q0 56 18 40', 'class':'boca' }));
  return g;
}
function tukuGrupo(){
  var g = nodo('g', { 'class':'tuku-dibujo' });
  g.appendChild(pierna(-1));
  g.appendChild(pierna(1));
  g.appendChild(brazo(-1));
  g.appendChild(brazo(1));
  g.appendChild(cabeza());
  g.appendChild(cara());
  g.appendChild(antena(-1));
  g.appendChild(antena(1));
  return g;
}
function tukuSuelto(clase){
  var s = nodo('svg', { viewBox:'-200 -170 400 340', 'aria-hidden':'true' });
  if(clase){ s.setAttribute('class', clase); }
  s.appendChild(tukuGrupo());
  return s;
}

var tukuDibujoEl = null;
function pintarTuku(){
  tukuWrap.innerHTML = '';
  var svg = tukuSuelto('tuku-svg');
  tukuWrap.appendChild(svg);
  tukuDibujoEl = svg.querySelector('.tuku-dibujo');
  tukuDibujoEl.addEventListener('animationend', function(e){
    if(e.animationName === 'tuku-feliz' || e.animationName === 'tuku-fiesta'){
      tukuDibujoEl.classList.remove('feliz');
      tukuDibujoEl.classList.remove('fiesta');
    }
  });
  var mini = tukuSuelto('tuku-svg');
  var cardTuku = document.getElementById('card-tuku');
  cardTuku.innerHTML = '';
  cardTuku.appendChild(mini);
}
/* El festejo chico: una pieza que se cuelga bien. */
function tukuFeliz(){
  if(!tukuDibujoEl) return;
  tukuDibujoEl.classList.remove('feliz'); void tukuDibujoEl.offsetWidth;
  tukuDibujoEl.classList.add('feliz');
}
/* El festejo grande: se gana la ronda entera. Ademas de la animacion mas
   grande, tira unas chispitas de emoji alrededor — no hace falta canvas
   ni particulas de verdad para que se sienta una fiesta. */
var festejoEls = [];
function tukuFiesta(){
  if(!tukuDibujoEl) return;
  tukuDibujoEl.classList.remove('fiesta'); void tukuDibujoEl.offsetWidth;
  tukuDibujoEl.classList.add('fiesta');
  var emojis = ['✨', '🎉', '💜', '⭐', '🎊'];
  for(var i = 0; i < 10; i++){
    var s = document.createElement('span');
    s.className = 'chispa';
    s.textContent = emojis[(Math.random() * emojis.length) | 0];
    s.style.left = (40 + Math.random() * 20) + '%';
    s.style.setProperty('--dx', (Math.random() * 140 - 70) + 'px');
    s.style.setProperty('--dy', (-(60 + Math.random() * 90)) + 'px');
    s.style.setProperty('--rot', (Math.random() * 60 - 30) + 'deg');
    s.style.animationDelay = (Math.random() * .15) + 's';
    tukuWrap.appendChild(s);
    festejoEls.push(s);
  }
  setTimeout(function(){
    festejoEls.forEach(function(s){ if(s.parentNode){ s.parentNode.removeChild(s); } });
    festejoEls = [];
  }, 1400);
}

/* =====================================================================
   AUDIO (WebAudio, sin assets) — igual criterio que motor-globos.js
   ===================================================================== */
var AC = null;
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
function bien(){ tono(720 + Math.random() * 180, .16, .18); }
/* Ese no era. Dos notas cortas que bajan ("uh-uh"): se reconoce de una
   como error, sin ser un buzzer que asuste — sigue sin retar, solo avisa
   mas claro que antes (una sola nota grave se perdia entre los demas
   sonidos del juego). */
function noEra(){
  var a = audio(); if(!a) return;
  try{
    var t = a.currentTime;
    [[220, 0, .09], [165, .11, .16]].forEach(function(nota){
      var o = a.createOscillator(), g = a.createGain();
      var ini = t + nota[1], dur = nota[2];
      o.type = 'triangle';
      o.frequency.setValueAtTime(nota[0], ini);
      g.gain.setValueAtTime(.0001, ini);
      g.gain.exponentialRampToValueAtTime(.17, ini + .02);
      g.gain.exponentialRampToValueAtTime(.0001, ini + dur);
      o.connect(g); g.connect(a.destination);
      o.start(ini); o.stop(ini + dur + .02);
    });
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
    window.speechSynthesis.cancel();
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
   UI: estrellas y selector de rondas
   ===================================================================== */
function buildStars(){
  var box = document.getElementById('stars');
  box.innerHTML = '';
  RONDAS.forEach(function(r){
    var s = nodo('svg', { viewBox:'0 0 100 100' });
    s.setAttribute('class', 'star' + (done.indexOf(r.id) >= 0 ? ' on' : ''));
    var p = nodo('path', { d:'M50 8 L62 38 L95 40 L69 60 L78 92 L50 74 L22 92 L31 60 L5 40 L38 38 Z' });
    s.appendChild(p);
    box.appendChild(s);
  });
}
/* El boton de cada ronda muestra tres figuras del primer banco de la
   ronda, como muestra de lo que se va a encontrar ahi adentro. */
function iconoDeRonda(r){
  var banco = BANCOS[r.bancos[0]] || [];
  return banco.slice(0, 3).join(' ');
}
function buildPicker(){
  var box = document.getElementById('picker');
  box.innerHTML = '';
  RONDAS.forEach(function(r, i){
    var b = document.createElement('button');
    b.className = 'rbtn' + (i === rIdx ? ' sel' : '') + (done.indexOf(r.id) >= 0 ? ' done' : '');
    b.innerHTML = '<span class="rbtn-icono">' + iconoDeRonda(r) + '</span>';
    b.setAttribute('aria-label', 'Ronda de patrones ' + r.id.toUpperCase());
    // el selector nunca se bloquea: cambiar de ronda siempre es seguro,
    // incluso durante el festejo
    b.addEventListener('click', function(){ hideCard(); cargarRonda(i); });
    box.appendChild(b);
  });
}
function refreshChrome(){
  buildStars();
  buildPicker();
}

/* =====================================================================
   ARMADO DE UN PATRON
   ===================================================================== */
/* Sortea de que banco sale esta vuelta y le reparte una figura a cada
   letra distinta del patron. Deja en `distractores` el resto del banco
   barajado, para que `armarOpciones` tenga de donde sacar las figuras que
   no aparecen en la secuencia. */
var distractores = [];
function sortearRoles(r){
  var nombreBanco = r.bancos[(Math.random() * r.bancos.length) | 0];
  var banco = barajar((BANCOS[nombreBanco] || []).slice());
  var letras = rolesUnicos(r.patron);
  roles = {};
  letras.forEach(function(letra, i){ roles[letra] = banco[i]; });
  distractores = banco.slice(letras.length);
}
/* La letra que le toca a una posicion de la fila: el patron se repite
   solo, dando la vuelta con el modulo. */
function letraEn(r, pos){ return r.patron[pos % r.patron.length]; }

function cargarPatron(r){
  sortearRoles(r);
  secuenciaActual = [];
  for(var i = 0; i < r.mostrar; i++){ secuenciaActual.push(roles[letraEn(r, i)]); }
  correcto = roles[letraEn(r, r.mostrar)];
  armarOpciones(r);
  pintarSecuencia();
  pintarBandeja();
}
/* Las opciones son siempre cuatro: la correcta, las otras figuras del
   patron (aparecen en la fila pero en el rol que no toca — asi elegir "una
   que ya vi" sin pensar el rol no alcanza) y el resto relleno con figuras
   que ni estaban en la fila. */
function armarOpciones(r){
  var letraCorrecta = letraEn(r, r.mostrar);
  var opciones = [correcto];
  rolesUnicos(r.patron).forEach(function(letra){
    if(letra !== letraCorrecta){ opciones.push(roles[letra]); }
  });
  var extra = barajar(distractores.slice());
  while(opciones.length < N_OPCIONES && extra.length){ opciones.push(extra.shift()); }
  opcionesActuales = barajar(opciones);
}

function pintarSecuencia(){
  var box = document.getElementById('secuencia');
  box.innerHTML = '';
  secuenciaActual.forEach(function(sym){
    var t = document.createElement('span');
    t.className = 'ficha';
    t.textContent = sym;
    box.appendChild(t);
  });
  var falta = document.createElement('span');
  falta.className = 'ficha falta';
  falta.id = 'ficha-falta';
  falta.textContent = '❓';
  box.appendChild(falta);
  huecoEl = falta;
}

/* =====================================================================
   LA BANDEJA Y EL ARRASTRE
   ===================================================================== */
function pintarBandeja(){
  var box = document.getElementById('bandeja');
  box.innerHTML = '';
  piezasEls = [];
  opcionesActuales.forEach(function(valor){
    var slot = document.createElement('div');
    slot.className = 'slot';
    var pieza = document.createElement('div');
    pieza.className = 'pieza';
    pieza.textContent = valor;
    pieza.setAttribute('aria-label', 'Arrastrar ' + valor + ' hasta el hueco');
    slot.appendChild(pieza);
    box.appendChild(slot);
    piezasEls.push({ el:pieza, valor:valor, slot:slot });
    engancharArrastre(pieza, valor);
  });
}
/* Un margen de perdon de medio hueco para cada lado: soltar "cerca" tiene
   que alcanzar para un dedo de 2 a 4 anos. */
function sobreHueco(x, y){
  if(!huecoEl) return false;
  var r = huecoEl.getBoundingClientRect();
  var m = Math.max(r.width, r.height) * .5;
  return x > r.left - m && x < r.right + m && y > r.top - m && y < r.bottom + m;
}
function engancharArrastre(el, valor){
  function bajar(e){
    if(locked) return;
    e.preventDefault();
    audio();
    var r = el.getBoundingClientRect();
    el._offX = e.clientX - r.left;
    el._offY = e.clientY - r.top;
    el.style.width  = r.width  + 'px';
    el.style.height = r.height + 'px';
    el.style.left = r.left + 'px';
    el.style.top  = r.top  + 'px';
    el.classList.add('arrastrando');
    try{ el.setPointerCapture(e.pointerId); }catch(ex){}
  }
  function mover(e){
    if(!el.classList.contains('arrastrando')) return;
    el.style.left = (e.clientX - el._offX) + 'px';
    el.style.top  = (e.clientY - el._offY) + 'px';
    if(huecoEl){ huecoEl.classList.toggle('sobre', sobreHueco(e.clientX, e.clientY)); }
  }
  function soltar(e){
    if(!el.classList.contains('arrastrando')) return;
    el.classList.remove('arrastrando');
    try{ el.releasePointerCapture(e.pointerId); }catch(ex){}
    if(huecoEl){ huecoEl.classList.remove('sobre'); }
    if(sobreHueco(e.clientX, e.clientY)){
      if(valor === correcto){ colocarPieza(el); }else{ rechazarPieza(el); }
    }else{
      volverACasa(el);
    }
  }
  el.addEventListener('pointerdown', bajar);
  el.addEventListener('pointermove', mover);
  el.addEventListener('pointerup', soltar);
  el.addEventListener('pointercancel', soltar);
}
/* Vuelve rebotando a su lugar en la bandeja. El `.slot` nunca se movio
   (sigue reservando su lugar aunque la pieza este `position:fixed`), asi
   que su rect de ESTE momento es exactamente donde tiene que aterrizar. */
function volverACasa(el){
  var r = el.parentNode.getBoundingClientRect();
  el.classList.add('volviendo');
  void el.offsetWidth;
  el.style.left = r.left + 'px';
  el.style.top  = r.top  + 'px';
  el.addEventListener('transitionend', function fin(){
    el.removeEventListener('transitionend', fin);
    el.classList.remove('volviendo');
    el.style.left = ''; el.style.top = ''; el.style.width = ''; el.style.height = '';
  }, { once:true });
}
function rechazarPieza(el){
  noEra();
  el.classList.add('mal');
  setTimeout(function(){ el.classList.remove('mal'); volverACasa(el); }, 240);
  errores++;
  if(errores >= ERRORES_PISTA){ errores = 0; marcarPista(); }
}
/* A los dos rebotes seguidos de este mismo patron, la pieza correcta
   late sola en la bandeja — igual criterio que la pista de globos: nadie
   tiene que pedirla, y no hace falta un adulto al lado explicando cual
   era. */
function marcarPista(){
  piezasEls.forEach(function(p){ if(p.valor === correcto){ p.el.classList.add('pista'); } });
}
function colocarPieza(el){
  locked = true;
  el.classList.add('acertando');
  void el.offsetWidth;
  var r = huecoEl.getBoundingClientRect();
  el.style.left = (r.left + r.width  / 2 - el.offsetWidth  / 2) + 'px';
  el.style.top  = (r.top  + r.height / 2 - el.offsetHeight / 2) + 'px';
  bien();
  el.addEventListener('transitionend', function fin(){
    el.removeEventListener('transitionend', fin);
    if(el.parentNode){ el.parentNode.removeChild(el); }
    huecoEl.textContent = correcto;
    huecoEl.classList.remove('falta');
    huecoEl.classList.add('hecha');
    tukuFeliz();
    errores = 0;
    aciertos++;
    resueltos.push(correcto);
    setTimeout(function(){
      if(aciertos >= ACIERTOS_POR_RONDA){ ganar(); }
      else{ locked = false; cargarPatron(RONDAS[rIdx]); }
    }, 550);
  }, { once:true });
}

/* =====================================================================
   RONDA
   ===================================================================== */
function cargarRonda(i){
  rIdx = ((i % RONDAS.length) + RONDAS.length) % RONDAS.length;
  var r = RONDAS[rIdx];
  locked = false;
  errores = 0;
  aciertos = 0;
  resueltos = [];
  promptEl.innerHTML = '🌈 ¡Ayudá a Tukutoon a terminar ' + r.tema + '!';
  cargarPatron(r);
  refreshChrome();
}

function ganar(){
  locked = true;
  var r = RONDAS[rIdx];
  if(done.indexOf(r.id) < 0){ done.push(r.id); saveDone(); }
  refreshChrome();
  tukuFiesta();
  fanfarria();
  setTimeout(showCard, 700);
}

/* =====================================================================
   TARJETA FINAL
   ===================================================================== */
function showCard(){
  var fila = document.getElementById('card-emoji');
  fila.innerHTML = '';
  resueltos.forEach(function(sym){
    var s = document.createElement('span');
    s.textContent = sym;
    fila.appendChild(s);
  });
  document.getElementById('card-word').innerHTML =
    '¡Decoraste con <b>' + resueltos.length + '</b> piezas!';
  cardEl.classList.add('show');
  speak('Muy bien, decoraste con ' + resueltos.length + ' piezas');
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

/* =====================================================================
   ARRANQUE
   ===================================================================== */
pintarTuku();
cargarRonda(unaSola ? indiceDeRonda(cfg.ronda) : 0);
/* La bienvenida hablada, apenas entra al juego — antes de que el chico
   toque nada, para que sea una instruccion y no un festejo. Si el
   navegador no deja hablar sin que haya un toque previo (pasa en iOS),
   se pierde esta linea nomas: el resto del juego no depende de ella. */
speak('Ayudá a Tuku, la tambora, a armar la guirnalda');


}

global.TukuToonPatternPage = TukuToonPatternPage;

})(window);
