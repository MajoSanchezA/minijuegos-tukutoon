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
   ===================================================================== */
(function(global){
'use strict';

function TukuToonTracePage(cfg){
  cfg = cfg || {};

  var VOWELS = cfg.letras || global.VOCALES;
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

    '<main><svg id="stage" viewBox="0 0 300 400" ' +
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
var SAMPLE_STEP = 4;    // se muestrea el path cada 4 unidades del viewBox
var TOL         = cfg.tolerancia || 46;  // tolerancia generosa: dedos chiquitos
var LOOKAHEAD   = 14;   // muestras maximas de avance por movimiento: no se puede saltear
var SVG_NS      = 'http://www.w3.org/2000/svg';
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
  esperandoPunto = false; puntoEl = null; puntoHalo = null;
  var v = VOWELS[vIdx], F = forma(v);
  svg.innerHTML = '';
  strokeData = [];

  var gRoot = document.createElementNS(SVG_NS, 'g');
  svg.appendChild(gRoot);

  F.strokes.forEach(function(d, si){
    var g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'stroke-g' + (si === 0 ? ' active' : ''));

    var edge = mkPath(d, 'road-edge');
    var road = mkPath(d, 'road');
    var prog = mkPath(d, 'progress');
    var dash = mkPath(d, 'dashes');
    prog.setAttribute('stroke', v.color);

    g.appendChild(edge); g.appendChild(road); g.appendChild(prog); g.appendChild(dash);
    gRoot.appendChild(g);

    var len = road.getTotalLength();
    var samples = [];
    for(var l = 0; l <= len; l += SAMPLE_STEP){
      var pt = road.getPointAtLength(l);
      samples.push({ x:pt.x, y:pt.y, l:l });
    }
    var last = road.getPointAtLength(len);
    samples.push({ x:last.x, y:last.y, l:len });

    prog.style.strokeDasharray = '0 ' + (len + 10);
    prog.style.display = 'none';   // linecap round pinta un punto con largo 0

    strokeData.push({ g:g, prog:prog, road:road, dash:dash, len:len, samples:samples });
  });

  addArrows();

  // punto de la i minuscula: aparece apagado y se enciende recien cuando
  // el palito esta trazado (ver completeStroke)
  if(F.punto){
    var pt = F.punto;
    var pg = document.createElementNS(SVG_NS, 'g');
    pg.setAttribute('class', 'punto-g');
    pg.innerHTML =
      '<circle class="punto-edge" cx="' + pt.x + '" cy="' + pt.y + '" r="' + (pt.r + 6) + '"/>' +
      '<circle class="punto-base" cx="' + pt.x + '" cy="' + pt.y + '" r="' + pt.r + '"/>' +
      '<circle class="punto-halo" cx="' + pt.x + '" cy="' + pt.y + '" r="' + (pt.r + 4) + '"/>';
    svg.appendChild(pg);
    puntoEl   = pg.querySelector('.punto-base');
    puntoHalo = pg.querySelector('.punto-halo');
  }

  // carita
  var f = F.face;
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
    var a = s.road.getPointAtLength(Math.max(0, s.len - 14));
    var b = s.road.getPointAtLength(s.len);
    var ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    var tri = document.createElementNS(SVG_NS, 'path');
    tri.setAttribute('d', 'M-6 -6 L7 0 L-6 6 Z');
    tri.setAttribute('fill', '#fff');
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

function paintProgress(){
  var s = strokeData[strokeIdx]; if(!s) return;
  var l = s.samples[sampleIdx].l;
  s.prog.style.display = l > 0 ? '' : 'none';
  s.prog.style.strokeDasharray = l + ' ' + (s.len + 10);
}

function advance(p){
  var s = strokeData[strokeIdx]; if(!s) return;
  var top = Math.min(sampleIdx + LOOKAHEAD, s.samples.length - 1);
  var best = -1, tol2 = TOL * TOL;
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
      puntoEl.style.fill = VOWELS[vIdx].color;
      pop(760, .18);
      sparkles(pu, VOWELS[vIdx].color);
      completeLetter();
    }
    e.preventDefault();
    return;
  }

  var s = strokeData[strokeIdx]; if(!s) return;
  var p = toSvg(e);
  var startTol = TOL * 1.25;
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
  s.g.classList.remove('active');
  s.g.classList.add('finished');
  s.dash.style.display = 'none';
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
  promptEl.textContent = '¡Muy bien! 🎉';
  confetti(v.color);
  fanfare();
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
      handEl.setAttribute('y', pt.y + 34);
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
  cardEl.classList.add('show');
}
function hideCard(){ cardEl.classList.remove('show'); }

document.getElementById('btn-again').addEventListener('click', function(e){
  e.stopPropagation(); hideCard(); loadVowel(vIdx);
});
document.getElementById('btn-next').addEventListener('click', function(e){
  e.stopPropagation(); hideCard(); loadVowel((vIdx + 1) % VOWELS.length);
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

  loadVowel(0);


}

global.TukuToonTracePage = TukuToonTracePage;

})(window);
