/* ============================================================
   motor.js — motor compartido del sistema "Colorea con TukuToon"
   No lo dupliques por dibujo. Cada página de dibujo hace:

     <link rel="stylesheet" href="motor.css">
     ...
     <script src="motor.js"></script>
     <script>
       TukuToonColorPage({
         title: 'Nombre del dibujo',
         subtitle: 'Frase de ayuda (opcional)',
         imgSrc: 'archivo.png'   // o un data:image/... incrustado
       });
     </script>

   Ver plantilla-dibujo.html para el arranque mínimo de una página nueva.
   ============================================================ */
(function () {
  const DEFAULT_PALETTE = ['#FF6F59','#FFC94A','#2EC4B6','#5AA9E6','#B388EB','#FFB4C6','#8BC34A','#E8735A','#2B2140','#FFFFFF'];

  // Íconos de herramienta (line-icons, mismo estilo que el resto del set).
  const ICON = {
    bucket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12l7-7 8 8-7 7z"/><path d="M8 8l8 8"/><circle cx="19" cy="17" r="2"/></svg>',
    marker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="8" rx="1"/><path d="M9 10l-2 10h10l-2-10"/><path d="M10 20h4"/></svg>',
    pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    brush: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 15l6-10 3 3-10 6z"/><path d="M4 20c1-3 3-4 5-4"/></svg>',
    spray: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="7" width="8" height="13" rx="2"/><path d="M10 7V4a2 2 0 0 1 4 0v3"/><path d="M4 9.5l2 .8M3 13h2.2M4 16.5l2-.8"/></svg>',
    glitter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/><path d="M19 15l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6.6-1.7z"/></svg>',
    eraser: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="12" width="12" height="7" rx="1"/><path d="M9 12l6-7 5 4-6 7z"/></svg>',
    restart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 9 15 9"/></svg>',
    done: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>'
  };

  // Herramientas de trazo libre (todas menos balde/borrador comparten
  // "aplicar color en un punto"; cada una tiene su propia textura).
  const STROKE_TOOLS = ['marker', 'pencil', 'brush', 'spray', 'glitter'];

  const TOOLS = [
    { id: 'bucket', title: 'Balde', icon: ICON.bucket },
    { id: 'marker', title: 'Marcador', icon: ICON.marker },
    { id: 'pencil', title: 'Lápiz', icon: ICON.pencil },
    { id: 'brush', title: 'Acuarela', icon: ICON.brush },
    { id: 'spray', title: 'Aerosol', icon: ICON.spray },
    { id: 'glitter', title: 'Brillantina', icon: ICON.glitter },
    { id: 'eraser', title: 'Borrar', icon: ICON.eraser }
  ];

  function buildDOM(cfg) {
    document.title = cfg.pageTitle || ('Colorea con TukuToon — ' + (cfg.title || ''));
    document.body.innerHTML = `
      <img class="bg-photo" src="${cfg.bgSrc || 'fondo-dibujo.png'}" alt="" aria-hidden="true">

      <div class="floaty" style="top:10%;left:5%;"><svg width="36" height="36" viewBox="0 0 36 36"><polygon points="18,2 34,32 2,32" fill="#FFC94A"/></svg></div>
      <div class="floaty" style="top:65%;left:3%;"><svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#2EC4B6"/></svg></div>
      <div class="floaty" style="top:18%;right:5%;"><svg width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="14" fill="#FF6F59"/></svg></div>

      <header>
        ${cfg.showBackButton === false ? '' : `<a class="back-btn" href="${cfg.menuHref || 'menu.html'}" title="Volver al menú" aria-label="Volver al menú">${ICON.back}</a>`}
        <div class="pill">
          <span class="pill-badge" aria-hidden="true">${cfg.badgeEmoji || '🖌️'}</span>
          <h1>${cfg.titleHtml || 'Colorea con <span>TukuToon</span>'}</h1>
          <p>${cfg.subtitle || 'Toca para rellenar con el balde, o dibuja libre con el pincel'}</p>
        </div>
        ${cfg.showBackButton === false ? '' : '<span class="back-btn-spacer" aria-hidden="true"></span>'}
      </header>

      <div class="app">
        <div class="rail rail-left">
          <div class="tools" id="tools"></div>
          <div class="brush-size" id="brush-size-wrap" style="display:none;">
            <span>Grosor</span>
            <input type="range" id="brush-size" min="4" max="30" value="14">
          </div>
          <button class="nav-arrow restart" id="clear-btn" title="Empezar de nuevo" aria-label="Empezar de nuevo">${ICON.restart}</button>
        </div>

        <div class="stage-wrap">
          <div class="paper">
            <div class="canvas-wrap placeholder" id="canvas-wrap">
              <canvas id="paint-canvas"></canvas>
              <canvas id="ink-canvas"></canvas>
              <div class="placeholder-msg" id="placeholder-msg">
                <div class="ico">🖼️</div>
                <h4 id="placeholder-title">Aquí va tu dibujo</h4>
                <p id="placeholder-text">Todavía no hay una imagen configurada para esta página.</p>
              </div>
              <div class="loading" id="loading" style="display:none;">Preparando el dibujo…</div>
            </div>
          </div>
        </div>

        <div class="rail rail-right">
          <div class="swatches" id="swatches"></div>
          <button class="nav-arrow done" id="done-btn" title="¡Listo!" aria-label="Listo">${ICON.done}</button>
        </div>
      </div>

      <div class="modal-overlay" id="modal-overlay">
        <div class="modal">
          <div class="badge">🌟</div>
          <h3>¡Muy bien hecho!</h3>
          <p>Le diste vida a tu dibujo de TukuToon. ¡Sigue coloreando más dibujos!</p>
          <button id="modal-close">Genial, seguir jugando</button>
        </div>
      </div>
    `;
  }

  window.TukuToonColorPage = function (config) {
    const cfg = config || {};
    const PALETTE = cfg.palette || DEFAULT_PALETTE;
    buildDOM(cfg);

    const state = { color: PALETTE[0], tool: 'bucket', brushSize: 14 };

    let W = 0, H = 0;
    let wallMask = null;      // Uint8Array: 1 = línea/borde
    let labels = null;        // Int32Array: id de región por píxel, -2 = borde
    let regionPixels = [];    // Uint32Array por región
    let regionBounds = [];    // [x,y,w,h] por región, para repintar rápido
    let paintData = null;     // ImageData de la capa de color
    let inkData = null;       // ImageData de las líneas negras (overlay)

    const paintCanvas = document.getElementById('paint-canvas');
    const inkCanvas = document.getElementById('ink-canvas');
    const pctx = paintCanvas.getContext('2d', { willReadFrequently: true });
    const ictx = inkCanvas.getContext('2d');
    const wrap = document.getElementById('canvas-wrap');
    const loadingEl = document.getElementById('loading');
    const placeholderEl = document.getElementById('placeholder-msg');
    const stageWrapEl = document.querySelector('.stage-wrap');
    const paperEl = document.querySelector('.paper');
    const appEl = document.querySelector('.app');
    const headerEl = document.querySelector('header');

    function hexToRgb(hex) {
      const v = parseInt(hex.slice(1), 16);
      return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
    }

    // Clave de guardado del progreso: el nombre de la carpeta del dibujo
    // (paginas/<esto>/...), así coincide solo con el "id" en paginas.js
    // sin tener que repetirlo a mano en cada página.
    function progressKey() {
      try {
        const parts = location.pathname.split('/').filter(Boolean);
        const folder = parts.length >= 2 ? parts[parts.length - 2] : 'dibujo';
        return 'tukutoon:progreso:' + decodeURIComponent(folder);
      } catch (e) {
        return 'tukutoon:progreso:dibujo';
      }
    }

    // Guarda una miniatura del dibujo ya pintado (fondo blanco + color + líneas)
    // en localStorage, para que el menú la muestre como vista previa. Si el
    // navegador no permite localStorage (poco común), no rompe nada.
    function saveProgressSnapshot() {
      if (!paintData) return;
      try {
        const maxDim = 480;
        const scale = Math.min(1, maxDim / Math.max(W, H));
        const outW = Math.max(1, Math.round(W * scale));
        const outH = Math.max(1, Math.round(H * scale));
        const out = document.createElement('canvas');
        out.width = outW; out.height = outH;
        const octx = out.getContext('2d');
        octx.fillStyle = '#ffffff';
        octx.fillRect(0, 0, outW, outH);
        octx.drawImage(paintCanvas, 0, 0, outW, outH);
        octx.drawImage(inkCanvas, 0, 0, outW, outH);
        localStorage.setItem(progressKey(), out.toDataURL('image/png'));
      } catch (e) {
        // Sin espacio o sin localStorage disponible: seguimos con la miniatura original.
      }
    }

    // Detecta si el truco de horizontal forzado (motor.css, <html>
    // rotado 90°) está activo — mismo media query que motor.css. Se usa
    // acá y en getCanvasPixel().
    function isRotatedForLandscape() {
      return !!(window.matchMedia && window.matchMedia('(orientation:portrait)').matches);
    }

    // Posición de un elemento sumando offsetLeft/offsetTop a través de
    // toda la cadena de offsetParent, en vez de getBoundingClientRect().
    // A diferencia de getBoundingClientRect(), offsetLeft/offsetTop NO
    // se ven afectados por el transform de un ancestro — necesario para
    // ubicar el canvas de forma confiable cuando <html> está rotado
    // (ver getCanvasPixel()).
    function offsetRect(el) {
      let left = 0, top = 0, node = el;
      while (node) {
        left += node.offsetLeft || 0;
        top += node.offsetTop || 0;
        node = node.offsetParent;
      }
      return { left, top, width: el.offsetWidth, height: el.offsetHeight };
    }

    // Calcula el tamaño exacto (px) del lienzo para que TODO el juego
    // (encabezado + barras + dibujo) entre en pantalla sin scroll,
    // respetando la proporción real del dibujo (o 3:2 antes de cargar).
    let ratioW = 3, ratioH = 2;
    function fitStage() {
      // Fijamos la altura de .app "a mano" en vez de confiar en que
      // flex:1 reparta bien el alto en algunos navegadores/entornos —
      // eso es lo que causaba una franja vacía debajo del juego.
      // No confiamos en que document.body.clientHeight ya venga
      // "intercambiado" por la cadena de position:absolute +
      // height:100% del truco de horizontal forzado (motor.css) — en
      // algunos navegadores no se resuelve como uno esperaría. En vez
      // de eso, usamos window.innerWidth como alto disponible cuando
      // esa rotación está activa: es un valor físico del viewport,
      // siempre confiable. headerEl.offsetHeight (no
      // getBoundingClientRect) porque offsetHeight no se ve afectado
      // por el transform de un ancestro, mientras que
      // getBoundingClientRect() sí da valores ya rotados/cruzados.
      const vh = isRotatedForLandscape()
        ? window.innerWidth
        : (window.innerHeight || document.documentElement.clientHeight);
      const headerH = headerEl.offsetHeight;
      const appStyle = getComputedStyle(appEl);
      const appMarginY = parseFloat(appStyle.marginTop) + parseFloat(appStyle.marginBottom);
      const availAppH = Math.max(vh - headerH - appMarginY, 160);
      appEl.style.height = availAppH + 'px';

      const availW = stageWrapEl.clientWidth;
      const availH = stageWrapEl.clientHeight;
      if (availW <= 0 || availH <= 0) return;
      const paperStyle = getComputedStyle(paperEl);
      const extraX = parseFloat(paperStyle.paddingLeft) + parseFloat(paperStyle.paddingRight) + parseFloat(paperStyle.borderLeftWidth) + parseFloat(paperStyle.borderRightWidth);
      const extraY = parseFloat(paperStyle.paddingTop) + parseFloat(paperStyle.paddingBottom) + parseFloat(paperStyle.borderTopWidth) + parseFloat(paperStyle.borderBottomWidth);
      const innerW = Math.max(availW - extraX, 60);
      const innerH = Math.max(availH - extraY, 60);
      const scale = Math.min(innerW / ratioW, innerH / ratioH);
      const dispW = Math.max(Math.floor(ratioW * scale), 60);
      const dispH = Math.max(Math.floor(ratioH * scale), 40);
      wrap.style.width = dispW + 'px';
      wrap.style.height = dispH + 'px';
    }
    window.addEventListener('resize', fitStage);
    window.addEventListener('orientationchange', () => setTimeout(fitStage, 60));
    window.addEventListener('load', fitStage);
    fitStage();

    function init() {
      if (!cfg.imgSrc) {
        loadingEl.style.display = 'none';
        return; // se queda en modo "marcador de posición"
      }
      const img = new Image();
      img.onload = () => {
        try {
          W = img.naturalWidth;
          H = img.naturalHeight;
          ratioW = W; ratioH = H;
          fitStage();
          paintCanvas.width = W; paintCanvas.height = H;
          inkCanvas.width = W; inkCanvas.height = H;

          const off = document.createElement('canvas');
          off.width = W; off.height = H;
          const octx = off.getContext('2d');
          octx.drawImage(img, 0, 0, W, H);
          const src = octx.getImageData(0, 0, W, H);

          wallMask = new Uint8Array(W * H);
          inkData = octx.createImageData(W, H);
          const THRESH = 175; // luminancia por debajo de esto = "línea"
          for (let i = 0, p = 0; i < src.data.length; i += 4, p++) {
            const r = src.data[i], g = src.data[i + 1], b = src.data[i + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            const isWall = lum < THRESH;
            wallMask[p] = isWall ? 1 : 0;
            const alpha = isWall ? Math.round(255 - lum) : 0;
            inkData.data[i] = 30; inkData.data[i + 1] = 22; inkData.data[i + 2] = 40;
            inkData.data[i + 3] = alpha;
          }
          ictx.putImageData(inkData, 0, 0);

          buildRegions();

          paintData = pctx.createImageData(W, H);
          pctx.putImageData(paintData, 0, 0);

          wrap.classList.remove('placeholder');
          loadingEl.style.display = 'none';
        } catch (err) {
          // Si esto tira "SecurityError: tainted canvas", es que imgSrc apunta a un
          // archivo externo (no a un data:) y la página se abrió con file:// —
          // el navegador bloquea leer píxeles de una imagen cargada así. Solución:
          // usar imgSrc: "data:image/png;base64,..." en vez de un nombre de archivo.
          document.getElementById('placeholder-title').textContent = 'Error al procesar el dibujo';
          document.getElementById('placeholder-text').textContent = String(err && err.message || err);
          loadingEl.style.display = 'none';
        }
      };
      img.onerror = () => {
        document.getElementById('placeholder-title').textContent = 'No se encontró el archivo';
        document.getElementById('placeholder-text').innerHTML = `No se pudo cargar la imagen configurada en <code>imgSrc</code>. Verifica el nombre del archivo y que esté en esta misma carpeta.`;
        loadingEl.style.display = 'none';
      };
      img.src = cfg.imgSrc;
    }

    function buildRegions() {
      labels = new Int32Array(W * H).fill(-1);
      for (let i = 0; i < wallMask.length; i++) { if (wallMask[i]) labels[i] = -2; }
      regionPixels = [];
      regionBounds = [];
      let regionId = 0;
      const stackArr = [];
      for (let start = 0; start < labels.length; start++) {
        if (labels[start] !== -1) continue;
        stackArr.length = 0;
        stackArr.push(start);
        labels[start] = regionId;
        const pixels = [];
        let minX = W, minY = H, maxX = 0, maxY = 0;
        while (stackArr.length) {
          const idx = stackArr.pop();
          pixels.push(idx);
          const x = idx % W, y = (idx / W) | 0;
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
          if (x > 0) { const n = idx - 1; if (labels[n] === -1) { labels[n] = regionId; stackArr.push(n); } }
          if (x < W - 1) { const n = idx + 1; if (labels[n] === -1) { labels[n] = regionId; stackArr.push(n); } }
          if (y > 0) { const n = idx - W; if (labels[n] === -1) { labels[n] = regionId; stackArr.push(n); } }
          if (y < H - 1) { const n = idx + W; if (labels[n] === -1) { labels[n] = regionId; stackArr.push(n); } }
        }
        regionPixels.push(Uint32Array.from(pixels));
        regionBounds.push([minX, minY, maxX - minX + 1, maxY - minY + 1]);
        regionId++;
      }
    }

    function fillRegionAt(px, py, rgba) {
      const idx = py * W + px;
      const regionId = labels[idx];
      if (regionId === undefined || regionId < 0) return; // tocó una línea/borde
      const pixels = regionPixels[regionId];
      const data = paintData.data;
      for (let k = 0; k < pixels.length; k++) {
        const p = pixels[k] * 4;
        data[p] = rgba[0]; data[p + 1] = rgba[1]; data[p + 2] = rgba[2]; data[p + 3] = rgba[3];
      }
      const [bx, by, bw, bh] = regionBounds[regionId];
      pctx.putImageData(paintData, 0, 0, bx, by, bw, bh);
    }

    // Composición "source-over" (sin premultiplicar) para pinceles que
    // se mezclan con lo que ya había pintado, en vez de taparlo.
    function compositeOver(data, p, r, g, b, srcA) {
      if (srcA <= 0) return;
      if (srcA >= 1) { data[p] = r; data[p + 1] = g; data[p + 2] = b; data[p + 3] = 255; return; }
      const destA = data[p + 3] / 255;
      const outA = srcA + destA * (1 - srcA);
      if (outA <= 0) { data[p] = 0; data[p + 1] = 0; data[p + 2] = 0; data[p + 3] = 0; return; }
      data[p] = Math.round((r * srcA + data[p] * destA * (1 - srcA)) / outA);
      data[p + 1] = Math.round((g * srcA + data[p + 1] * destA * (1 - srcA)) / outA);
      data[p + 2] = Math.round((b * srcA + data[p + 2] * destA * (1 - srcA)) / outA);
      data[p + 3] = Math.round(outA * 255);
    }

    // Marcador: trazo duro, opaco, de borde firme.
    function stampMarker(px, py, rgba, radius) {
      const data = paintData.data;
      const r2 = radius * radius;
      const x0 = Math.max(0, px - radius), x1 = Math.min(W - 1, px + radius);
      const y0 = Math.max(0, py - radius), y1 = Math.min(H - 1, py + radius);
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x - px, dy = y - py;
          if (dx * dx + dy * dy > r2) continue;
          const idx = y * W + x;
          if (wallMask[idx]) continue;
          const p = idx * 4;
          data[p] = rgba[0]; data[p + 1] = rgba[1]; data[p + 2] = rgba[2]; data[p + 3] = 255;
        }
      }
      pctx.putImageData(paintData, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    }

    // Acuarela: muy translúcida y con borde suave, se va acumulando a medida
    // que pasás el pincel varias veces por el mismo lugar (como pintura real).
    function stampBrush(px, py, rgba, radius) {
      const data = paintData.data;
      const r2 = radius * radius;
      const x0 = Math.max(0, px - radius), x1 = Math.min(W - 1, px + radius);
      const y0 = Math.max(0, py - radius), y1 = Math.min(H - 1, py + radius);
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x - px, dy = y - py;
          const d2 = dx * dx + dy * dy;
          if (d2 > r2) continue;
          const idx = y * W + x;
          if (wallMask[idx]) continue;
          const falloff = 1 - Math.sqrt(d2) / radius;
          const alpha = 0.045 + 0.09 * falloff; // baja, para que se acumule al repasar
          compositeOver(data, idx * 4, rgba[0], rgba[1], rgba[2], alpha);
        }
      }
      pctx.putImageData(paintData, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    }

    // Brillantina: color sólido + destellos aleatorios casi blancos.
    function stampGlitter(px, py, rgba, radius) {
      const data = paintData.data;
      const r2 = radius * radius;
      const x0 = Math.max(0, px - radius), x1 = Math.min(W - 1, px + radius);
      const y0 = Math.max(0, py - radius), y1 = Math.min(H - 1, py + radius);
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x - px, dy = y - py;
          if (dx * dx + dy * dy > r2) continue;
          const idx = y * W + x;
          if (wallMask[idx]) continue;
          const p = idx * 4;
          data[p] = rgba[0]; data[p + 1] = rgba[1]; data[p + 2] = rgba[2]; data[p + 3] = 255;
          if (Math.random() < 0.05) {
            data[p] = Math.round(rgba[0] + (255 - rgba[0]) * 0.9);
            data[p + 1] = Math.round(rgba[1] + (255 - rgba[1]) * 0.9);
            data[p + 2] = Math.round(rgba[2] + (255 - rgba[2]) * 0.9);
          }
        }
      }
      pctx.putImageData(paintData, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    }

    // Lápiz: trazo fino, semitransparente y granulado.
    function stampPencil(px, py, rgba, radius) {
      const data = paintData.data;
      const r = Math.max(2, Math.round(radius * 0.55));
      const r2 = r * r;
      const x0 = Math.max(0, px - r), x1 = Math.min(W - 1, px + r);
      const y0 = Math.max(0, py - r), y1 = Math.min(H - 1, py + r);
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x - px, dy = y - py;
          if (dx * dx + dy * dy > r2) continue;
          if (Math.random() < 0.4) continue; // grano
          const idx = y * W + x;
          if (wallMask[idx]) continue;
          compositeOver(data, idx * 4, rgba[0], rgba[1], rgba[2], 0.55);
        }
      }
      pctx.putImageData(paintData, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    }

    // Aerosol: nube de puntitos dispersos, como una lata de spray.
    function stampSpray(px, py, rgba, radius) {
      const data = paintData.data;
      const count = Math.max(6, Math.round(radius * 2.2));
      let minX = px, maxX = px, minY = py, maxY = py;
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = Math.sqrt(Math.random()) * radius;
        const x = Math.round(px + Math.cos(ang) * dist);
        const y = Math.round(py + Math.sin(ang) * dist);
        if (x < 0 || x >= W || y < 0 || y >= H) continue;
        const idx = y * W + x;
        if (wallMask[idx]) continue;
        compositeOver(data, idx * 4, rgba[0], rgba[1], rgba[2], 0.65);
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
      const bx = Math.max(0, minX - 1), by = Math.max(0, minY - 1);
      const bw = Math.min(W - 1, maxX + 1) - bx + 1, bh = Math.min(H - 1, maxY + 1) - by + 1;
      pctx.putImageData(paintData, 0, 0, bx, by, bw, bh);
    }

    function applyStroke(tool, x, y, rgba, radius) {
      if (tool === 'marker') stampMarker(x, y, rgba, radius);
      else if (tool === 'pencil') stampPencil(x, y, rgba, radius);
      else if (tool === 'brush') stampBrush(x, y, rgba, radius);
      else if (tool === 'spray') stampSpray(x, y, rgba, radius);
      else if (tool === 'glitter') stampGlitter(x, y, rgba, radius);
    }

    function getCanvasPixel(evt) {
      const point = evt.touches ? evt.touches[0] : evt;
      let left, top, width, height, clientX, clientY;
      if (isRotatedForLandscape()) {
        // getBoundingClientRect() del canvas, a través del <html>
        // rotado, dio desalineado en algunos celulares (el toque no
        // coincidía con dónde pintaba). En vez de confiar en eso,
        // pasamos el punto del toque al sistema de coordenadas SIN
        // rotar de <html> con la fórmula cerrada de una rotación de
        // 90° centrada en el viewport (así es como está armado el
        // truco de horizontal forzado en motor.css: <html> con
        // width:100vh/height:100vw centrado y rotate(90deg)), y
        // ubicamos el canvas con offsetRect() (transform-invariant) en
        // vez de getBoundingClientRect().
        clientX = point.clientY;
        clientY = window.innerWidth - point.clientX;
        const r = offsetRect(paintCanvas);
        left = r.left; top = r.top; width = r.width; height = r.height;
      } else {
        const rect = paintCanvas.getBoundingClientRect();
        clientX = point.clientX; clientY = point.clientY;
        left = rect.left; top = rect.top; width = rect.width; height = rect.height;
      }
      const x = Math.floor((clientX - left) / width * W);
      const y = Math.floor((clientY - top) / height * H);
      return [Math.max(0, Math.min(W - 1, x)), Math.max(0, Math.min(H - 1, y))];
    }

    let drawing = false;
    let lastX = 0, lastY = 0;
    function pointerDown(evt) {
      if (!paintData) return;
      const [x, y] = getCanvasPixel(evt);
      if (state.tool === 'bucket') {
        fillRegionAt(x, y, [...hexToRgb(state.color), 255]);
      } else if (state.tool === 'eraser') {
        fillRegionAt(x, y, [0, 0, 0, 0]);
      } else {
        drawing = true;
        lastX = x; lastY = y;
        applyStroke(state.tool, x, y, hexToRgb(state.color), state.brushSize);
      }
    }
    // Va de lastX,lastY a x,y estampando puntos intermedios, no solo en
    // el punto final: en celular el touchmove dispara con menos
    // frecuencia que el mouse, así que a trazo rápido el dedo puede
    // moverse varios píxeles entre un evento y el siguiente — sin esto
    // quedan saltos/puntitos sueltos en vez de un trazo continuo.
    function strokeTo(x, y, rgba, radius) {
      const dx = x - lastX, dy = y - lastY;
      const dist = Math.hypot(dx, dy);
      const step = Math.max(1, radius * 0.4);
      const steps = Math.max(1, Math.ceil(dist / step));
      for (let i = 1; i <= steps; i++) {
        const px = Math.round(lastX + (dx * i) / steps);
        const py = Math.round(lastY + (dy * i) / steps);
        applyStroke(state.tool, px, py, rgba, radius);
      }
      lastX = x; lastY = y;
    }
    function pointerMove(evt) {
      if (!drawing || !STROKE_TOOLS.includes(state.tool)) return;
      const [x, y] = getCanvasPixel(evt);
      strokeTo(x, y, hexToRgb(state.color), state.brushSize);
    }
    function pointerUp() { drawing = false; }

    paintCanvas.addEventListener('mousedown', (e) => { pointerDown(e); });
    paintCanvas.addEventListener('mousemove', pointerMove);
    window.addEventListener('mouseup', pointerUp);
    paintCanvas.addEventListener('touchstart', (e) => { pointerDown(e); e.preventDefault(); }, { passive: false });
    paintCanvas.addEventListener('touchmove', (e) => { pointerMove(e); e.preventDefault(); }, { passive: false });
    paintCanvas.addEventListener('touchend', pointerUp);

    // paleta de colores
    const swatchWrap = document.getElementById('swatches');
    PALETTE.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'swatch' + (i === 0 ? ' selected' : '');
      b.style.background = c;
      if (c === '#FFFFFF') b.style.border = '2px solid #ddd';
      b.addEventListener('click', () => {
        state.color = c;
        document.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
        b.classList.add('selected');
      });
      swatchWrap.appendChild(b);
    });

    // herramientas
    const toolsWrap = document.getElementById('tools');
    const brushSizeWrap = document.getElementById('brush-size-wrap');
    TOOLS.forEach((t, i) => {
      const btn = document.createElement('button');
      btn.className = 'tool-btn' + (i === 0 ? ' active' : '');
      btn.dataset.tool = t.id;
      btn.title = t.title;
      btn.innerHTML = t.icon + `<span class="sr-only">${t.title}</span>`;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.tool = t.id;
        brushSizeWrap.style.display = STROKE_TOOLS.includes(state.tool) ? 'flex' : 'none';
      });
      toolsWrap.appendChild(btn);
    });
    document.getElementById('brush-size').addEventListener('input', (e) => {
      state.brushSize = parseInt(e.target.value, 10);
    });

    // borrar todo
    document.getElementById('clear-btn').addEventListener('click', () => {
      if (!paintData) return;
      paintData.data.fill(0);
      pctx.putImageData(paintData, 0, 0);
    });

    // listo + recompensa
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('done-btn').addEventListener('click', () => {
      if (!paintData) return;
      saveProgressSnapshot();
      overlay.classList.add('show');
      spawnConfetti();
    });
    document.getElementById('modal-close').addEventListener('click', () => {
      overlay.classList.remove('show');
    });

    function spawnConfetti() {
      const colors = PALETTE.slice(0, 7);
      for (let i = 0; i < 24; i++) {
        const el = document.createElement('div');
        el.className = 'confetti';
        el.style.left = Math.random() * 100 + '%';
        el.style.width = el.style.height = (6 + Math.random() * 6) + 'px';
        el.style.background = colors[Math.floor(Math.random() * colors.length)];
        el.style.animationDuration = (1.2 + Math.random() * 1) + 's';
        document.querySelector('.modal').appendChild(el);
        setTimeout(() => el.remove(), 2400);
      }
    }

    init();
  };
})();
