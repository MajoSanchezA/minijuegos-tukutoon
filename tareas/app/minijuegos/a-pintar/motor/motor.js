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
  // Carpeta iconos/ deducida del <script src> de este mismo archivo. A
  // diferencia de bgSrc y menuHref (que cada página pasa a mano porque
  // las de paginas/<nombre>/ están dos niveles más abajo), los iconos
  // se resuelven solos: así agregar un dibujo nuevo no obliga a pasar
  // una ruta más. cfg.iconsBase lo puede pisar si alguna vez hace falta.
  const SCRIPT_SRC = (document.currentScript && document.currentScript.src) || '';
  // Raíz de a-pintar/ vista desde motor/. De acá salen los assets que
  // son iguales para todas las páginas (iconos, capa de decoración), así
  // no hay que pasarles una ruta por página como sí pasa con bgSrc.
  const RAIZ = SCRIPT_SRC ? SCRIPT_SRC.replace(/\/[^/]*$/, '/../') : '';
  const ICONS_BASE = RAIZ + 'iconos/';
  const DECO_SRC = RAIZ + 'decoracion-dibujo.png';

  const DEFAULT_PALETTE = ['#FF6F59','#FFC94A','#2EC4B6','#5AA9E6','#B388EB','#FFB4C6','#8BC34A','#E8735A','#2B2140','#FFFFFF'];

  // Único ícono que sigue siendo SVG: el tilde de "Listo", que va en
  // blanco sobre el círculo coral. Los demás (salir, reiniciar y las
  // herramientas) son PNG ilustrados del arte, en iconos/.
  const ICON = {
    done: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
  };

  // Herramientas de trazo libre (todas menos balde/borrador comparten
  // "aplicar color en un punto"; cada una tiene su propia textura).
  const STROKE_TOOLS = ['marker', 'pencil', 'brush', 'spray', 'glitter'];

  // La barra muestra CINCO herramientas: es el set de iconos ilustrados
  // que hizo diseño, y con chicos de 2 a 5 años cinco botones grandes se
  // aciertan mejor que siete chicos. 'marker' (marcador) y 'spray'
  // (aerosol) siguen implementados más abajo (stampMarker / stampSpray) y
  // listos para volver: alcanza con sumarles un icono y su línea acá.
  // 'icon' es el nombre del archivo dentro de iconos/, no un SVG.
  const TOOLS = [
    { id: 'bucket', title: 'Balde', icon: 'balde.png' },
    { id: 'pencil', title: 'Lápiz', icon: 'lapiz.png' },
    { id: 'brush', title: 'Acuarela', icon: 'pincel.png' },
    { id: 'glitter', title: 'Brillantina', icon: 'especial.png' },
    { id: 'eraser', title: 'Borrar', icon: 'borrador.png' }
  ];


  /* ---------------------------------------------------------------
     Lápices de color
     Los paths salen de BOTONES/LAPIZ_BASE_SELECTOR DE COLOR.ai — que por
     dentro es un PDF — pasados a SVG. El cuerpo va parametrizado en vez
     de tener un PNG por color: las paletas son propias de cada dibujo
     (9 o 10 colores por personaje), así que un archivo por lápiz no era
     viable. Las relaciones de tono salen del mismo archivo de diseño:
     sobre un cuerpo #C94BFE, el brillo sube 10 puntos de luminosidad y
     la punta baja a 0.906 con 16 puntos menos de saturación. La madera
     es fija, es la misma en todos los lápices del arte.
     En el archivo el lápiz está parado (191 x 1418). En la barra va
     acostado con la punta hacia el dibujo, así que se rota 90°.
     --------------------------------------------------------------- */
  const LAPIZ_W = 191, LAPIZ_H = 1418;
  const LAPIZ_FIGURAS = [
    ['punta','M96.0 1363.0C90.8 1361.9 85.8 1364.0 80.6 1363.8C77.5 1363.7 77.2 1365.4 78.6 1367.6C83.5 1375.1 88.4 1382.5 93.4 1389.9C94.7 1391.8 96.1 1392.2 97.6 1389.9C102.6 1382.3 107.7 1374.7 112.7 1367.2C114.2 1364.8 113.4 1363.7 110.8 1363.8C105.8 1364.1 101.0 1361.9 96.0 1363.0M141.7 1357.5C132.2 1375.2 122.1 1392.6 109.2 1408.1C100.5 1418.5 91.4 1418.5 82.3 1408.5C72.8 1398.2 65.9 1386.0 58.6 1374.1C55.0 1368.2 51.2 1362.3 48.6 1355.8C49.6 1350.1 52.6 1345.9 58.6 1345.1C60.8 1344.8 62.9 1344.1 65.0 1343.7C76.1 1343.9 87.1 1341.5 98.2 1341.7C107.6 1341.8 116.8 1344.1 126.2 1343.7C127.7 1344.0 129.1 1344.4 130.6 1344.7C139.0 1346.1 141.4 1348.9 141.7 1357.5Z'],
    ['madera2','M141.7 1357.5C141.4 1348.9 139.0 1346.1 130.6 1344.7C129.1 1344.4 127.7 1344.0 126.3 1343.7C126.8 1342.5 127.4 1341.2 128.0 1340.1C140.6 1318.1 153.2 1296.1 165.7 1274.0C167.9 1270.2 171.0 1266.6 170.5 1261.7C171.3 1262.8 172.2 1263.7 172.9 1264.8C178.0 1272.3 183.6 1273.2 190.6 1267.6C190.8 1270.6 189.3 1273.0 188.0 1275.5C176.1 1298.9 162.4 1321.4 149.4 1344.2C146.9 1348.7 144.2 1353.1 141.7 1357.5Z'],
    ['madera2','M65.0 1343.7C62.9 1344.1 60.8 1344.8 58.6 1345.1C52.6 1345.9 49.6 1350.1 48.6 1355.8C32.8 1329.1 17.5 1302.1 3.0 1274.7C1.9 1272.5 0.0 1270.4 0.6 1267.6C6.5 1273.6 15.7 1271.4 18.6 1264.4C19.1 1263.3 19.6 1262.3 20.7 1261.8C20.5 1263.8 21.1 1265.7 22.1 1267.5C36.4 1292.9 50.7 1318.3 65.0 1343.7Z'],
    ['cuerpo','M61.9 1116.7C49.9 1121.6 34.3 1111.5 33.5 1100.6C32.6 1089.4 32.9 1078.3 32.8 1067.2C32.7 1020.8 32.7 974.3 32.7 927.8C30.3 929.9 28.3 932.3 26.6 934.9C28.3 932.3 30.3 929.9 32.7 927.8C32.7 791.2 32.8 654.6 32.8 518.0C32.8 434.9 32.8 351.8 32.7 268.6C32.7 259.4 36.4 252.4 44.3 248.0C55.2 242.0 74.4 247.3 75.8 263.9C77.4 281.9 76.6 299.9 76.6 317.8C76.7 426.6 76.7 535.4 76.7 644.2C76.7 721.7 76.7 799.3 76.7 876.8C76.7 949.1 76.6 1021.4 76.7 1093.7C76.7 1104.6 72.2 1112.5 61.9 1116.7M32.8 147.4C33.1 143.7 32.8 139.2 33.4 134.7C34.3 127.6 43.1 118.7 49.8 117.9C60.5 116.6 70.2 121.0 74.3 129.3C75.9 132.5 76.2 136.1 76.4 139.5C76.8 146.6 77.3 153.7 75.9 160.8C73.4 173.6 63.4 178.8 54.1 178.4C41.5 177.9 33.0 168.8 32.8 156.6C32.7 153.8 32.8 150.9 32.8 147.4M172.6 14.6C172.6 10.7 171.1 9.1 167.6 8.0C149.7 2.4 131.1 2.0 112.7 1.1C91.6 0.0 70.6 1.1 49.6 3.0C40.2 3.8 31.0 5.8 21.9 8.1C20.3 8.5 17.9 9.1 18.2 10.9C19.1 15.1 17.6 19.3 18.1 23.2C19.7 35.1 18.5 47.0 18.6 58.9C19.0 87.0 18.7 115.1 18.8 143.2C18.8 155.4 18.2 167.6 18.7 179.8C19.1 189.5 18.8 199.3 18.8 209.0C18.8 229.6 18.8 250.2 18.8 270.8C18.8 283.9 18.8 296.9 18.8 310.0C18.8 333.3 18.8 356.5 18.8 379.8C18.8 426.7 18.7 473.6 18.8 520.5C18.9 533.1 18.5 545.6 18.6 558.2C19.0 599.6 18.8 640.9 18.8 682.2C18.8 710.9 18.8 739.5 18.8 768.1C18.8 799.3 18.8 830.6 18.8 861.9C18.8 889.5 18.8 917.2 18.8 944.8C19.2 944.8 19.5 944.7 19.8 944.6C20.4 944.4 20.9 944.1 21.4 943.7C20.9 944.1 20.4 944.4 19.8 944.6C19.5 944.7 19.2 944.8 18.8 944.8C18.8 979.8 18.7 1014.8 18.9 1049.8C18.9 1052.9 18.4 1056.0 18.5 1059.2C18.9 1070.1 19.1 1081.1 18.6 1092.0C18.3 1099.3 18.4 1106.8 18.3 1114.1C18.1 1120.9 18.3 1127.8 18.6 1134.7C19.0 1143.9 17.9 1153.4 18.2 1162.5C18.9 1181.3 18.4 1200.1 18.8 1218.8C18.8 1221.5 18.5 1224.1 18.3 1226.7C18.2 1228.4 17.9 1231.2 19.7 1232.2C21.1 1232.9 22.6 1230.9 23.9 1230.1C30.5 1225.5 38.0 1223.6 45.9 1224.1C56.9 1224.9 65.2 1231.3 73.4 1237.9C79.9 1243.1 85.8 1248.9 93.0 1253.1C97.2 1255.6 100.7 1255.2 104.5 1252.5C110.4 1248.2 115.1 1242.4 120.4 1237.5C135.5 1223.5 150.1 1219.5 167.6 1229.9C172.3 1232.6 172.5 1232.5 172.5 1226.8C172.5 1105.5 172.5 984.1 172.5 862.8C172.5 580.1 172.5 297.4 172.6 14.6Z'],
    ['madera','M153.5 1245.9L143.6 1245.8C146.9 1244.2 150.2 1244.3 153.5 1245.9Z'],
    ['cuerpo','M96.0 1363.0C101.0 1361.9 105.8 1364.1 110.8 1363.8C113.4 1363.7 114.2 1364.8 112.7 1367.2C107.7 1374.7 102.6 1382.3 97.6 1389.9C96.1 1392.2 94.7 1391.8 93.4 1389.9C88.4 1382.5 83.5 1375.1 78.6 1367.6C77.2 1365.4 77.5 1363.7 80.6 1363.8C85.8 1364.0 90.8 1361.9 96.0 1363.0Z'],
    ['brillo','M76.7 876.8C76.7 949.1 76.6 1021.4 76.7 1093.7C76.7 1104.6 72.2 1112.5 61.9 1116.7C49.9 1121.6 34.3 1111.5 33.5 1100.6C32.6 1089.4 32.9 1078.3 32.8 1067.2C32.7 1020.8 32.7 974.3 32.7 927.8C32.7 791.2 32.8 654.6 32.8 518.0C32.8 434.9 32.8 351.8 32.7 268.6C32.7 259.4 36.4 252.4 44.3 248.0C55.2 242.0 74.4 247.3 75.8 263.9C77.4 281.9 76.6 299.9 76.6 317.8C76.7 426.6 76.7 535.4 76.7 644.2C76.7 721.7 76.7 799.3 76.7 876.8Z'],
    ['brillo','M32.8 147.4C33.1 143.7 32.8 139.2 33.4 134.7C34.3 127.6 43.1 118.7 49.8 117.9C60.5 116.6 70.2 121.0 74.3 129.3C75.9 132.5 76.2 136.1 76.4 139.5C76.8 146.6 77.3 153.7 75.9 160.8C73.4 173.6 63.4 178.8 54.1 178.4C41.5 177.9 33.0 168.8 32.8 156.6C32.7 153.8 32.8 150.9 32.8 147.4Z'],
    ['madera','M120.6 1265.9C124.5 1264.8 126.6 1261.9 128.6 1258.8L128.6 1258.8C128.9 1258.5 129.3 1258.1 129.7 1257.8C129.9 1257.5 130.3 1257.1 130.6 1256.8L130.6 1256.9C130.9 1256.5 131.3 1256.1 131.6 1255.8L132.6 1254.7L132.5 1254.8C132.9 1254.5 133.3 1254.1 133.6 1253.8C133.9 1253.5 134.3 1253.1 134.6 1252.8L134.5 1252.8C134.9 1252.5 135.3 1252.1 135.6 1251.8L135.5 1251.8C136.1 1251.5 136.6 1251.2 137.1 1250.8C137.9 1250.1 138.7 1249.5 139.6 1248.8C139.9 1248.5 140.2 1248.2 140.6 1247.9L140.6 1247.8C142.0 1247.7 143.4 1247.7 143.6 1245.8L143.6 1245.8L153.5 1245.9L153.5 1245.9C153.9 1246.8 154.7 1246.7 155.6 1246.7C155.8 1246.8 156.1 1246.9 156.4 1247.0C156.7 1247.5 157.1 1248.0 157.4 1248.5C163.4 1251.3 167.3 1256.2 170.5 1261.7C171.0 1266.6 167.9 1270.2 165.7 1274.0C153.2 1296.1 140.6 1318.1 128.0 1340.1C127.4 1341.2 126.8 1342.5 126.3 1343.7C116.8 1344.1 107.6 1341.8 98.2 1341.7C87.1 1341.5 76.1 1343.9 65.0 1343.7C50.7 1318.3 36.4 1292.9 22.1 1267.5C21.1 1265.7 20.5 1263.8 20.7 1261.8C24.1 1255.1 29.9 1250.5 35.9 1246.6C41.4 1243.0 47.5 1244.5 52.5 1248.2C61.8 1255.1 70.9 1262.4 79.9 1269.8C82.4 1271.8 85.5 1272.5 88.3 1273.9C95.0 1276.9 101.8 1277.0 108.5 1273.9C111.9 1271.8 115.2 1269.8 118.5 1267.8Z']
  ];

  function hexAHsl(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255,
          g = parseInt(hex.slice(3, 5), 16) / 255,
          b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, sat = 0;
    if (max !== min) {
      const d = max - min;
      sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r)      h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else                h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, sat * 100, l * 100];
  }

  function hslAHex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r, g, b;
    if (h < 60)       { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else              { r = c; g = 0; b = x; }
    return '#' + [r, g, b].map(v =>
      ('0' + Math.round((v + m) * 255).toString(16)).slice(-2)).join('').toUpperCase();
  }

  function lapizTonos(hex) {
    const [h, s, l] = hexAHsl(hex);
    return {
      cuerpo: hex.toUpperCase(),
      // Pasado 85 de luminosidad no queda margen para aclarar: ahí el
      // reflejo se invierte y pasa a ser una sombra suave, si no un
      // lápiz blanco queda plano y no se le lee la forma.
      brillo: l <= 85 ? hslAHex(h, s, l + (100 - l) * 0.28) : hslAHex(h, s, l - 7),
      punta:  hslAHex(h, Math.max(0, s - 16), Math.min(l * 0.906, l - 4)),
      madera:  '#FCD6B5',
      madera2: '#C88B74'
    };
  }

  // Acostado: rotar 90° manda la punta (que en el archivo está abajo)
  // hacia la izquierda, o sea hacia el dibujo.
  function lapizSVG(hex) {
    const c = lapizTonos(hex);
    return `<svg viewBox="0 0 ${LAPIZ_H} ${LAPIZ_W}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`
      + `<g transform="translate(${LAPIZ_H},0) rotate(90)">`
      + LAPIZ_FIGURAS.map(f => `<path fill="${c[f[0]]}" d="${f[1]}"/>`).join('')
      + '</g></svg>';
  }

  function buildDOM(cfg) {
    document.title = cfg.pageTitle || ('Colorea con TukuToon — ' + (cfg.title || ''));
    document.body.innerHTML = `
      <img class="bg-photo" src="${cfg.bgSrc || 'fondo-dibujo.png'}" alt="" aria-hidden="true">
      <img class="bg-deco" src="${cfg.decoSrc || DECO_SRC}" alt="" aria-hidden="true">

      <div class="floaty" style="top:10%;left:5%;"><svg width="36" height="36" viewBox="0 0 36 36"><polygon points="18,2 34,32 2,32" fill="#FFC94A"/></svg></div>
      <div class="floaty" style="top:65%;left:3%;"><svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#2EC4B6"/></svg></div>
      <div class="floaty" style="top:18%;right:5%;"><svg width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="14" fill="#FF6F59"/></svg></div>

      <div class="app">
        <div class="rail rail-left">
          ${cfg.showBackButton === false ? '' : `<a class="salir-btn" href="${cfg.menuHref || 'menu.html'}" title="Volver al menú" aria-label="Volver al menú"><img src="${cfg.iconsBase || ICONS_BASE}salir.png" alt="" draggable="false"></a>`}
          <div class="tools" id="tools"></div>
          <div class="brush-size" id="brush-size-wrap" style="display:none;">
            <span>Grosor</span>
            <input type="range" id="brush-size" min="4" max="30" value="14">
          </div>
          <button class="nav-arrow restart" id="clear-btn" title="Empezar de nuevo" aria-label="Empezar de nuevo"><img src="${cfg.iconsBase || ICONS_BASE}reiniciar.png" alt="" draggable="false"></button>
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
    const ICONS_DIR = cfg.iconsBase || ICONS_BASE;
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
    const HOJA_RATIO = 880 / 982;   // proporción real de hoja-dibujo.png
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
      // siempre confiable. (Antes acá se descontaba el alto del
      // encabezado; el diseño no lleva encabezado, así que .app ocupa
      // toda la pantalla.)
      const vh = isRotatedForLandscape()
        ? window.innerWidth
        : (window.innerHeight || document.documentElement.clientHeight);
      const appStyle = getComputedStyle(appEl);
      const appMarginY = parseFloat(appStyle.marginTop) + parseFloat(appStyle.marginBottom);
      const availAppH = Math.max(vh - appMarginY, 160);
      appEl.style.height = availAppH + 'px';

      const availW = stageWrapEl.clientWidth;
      const availH = stageWrapEl.clientHeight;
      if (availW <= 0 || availH <= 0) return;

      // La hoja es un asset con forma propia — borde irregular y sombra
      // dibujados — así que NO se puede estirar a cualquier proporción:
      // conserva siempre la del archivo (hoja-dibujo.png, 880x982). Por
      // eso primero se calcula cuánto puede medir la hoja para entrar en
      // el escenario, y recién después el lienzo se acomoda ADENTRO.
      const hojaW = Math.floor(Math.min(availW, availH * HOJA_RATIO));
      const hojaH = Math.floor(hojaW / HOJA_RATIO);
      paperEl.style.width = hojaW + 'px';
      paperEl.style.height = hojaH + 'px';

      // Márgenes del dibujo dentro de la hoja. El área crema del asset
      // ocupa el 89,8% del ancho (medido sobre el PNG); dejando el
      // dibujo en el 80% queda un aire parejo adentro del crema.
      const innerW = Math.max(hojaW * 0.80, 40);
      const innerH = Math.max(hojaH * 0.88, 40);
      const scale = Math.min(innerW / ratioW, innerH / ratioH);
      const dispW = Math.max(Math.floor(ratioW * scale), 40);
      const dispH = Math.max(Math.floor(ratioH * scale), 30);
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
      b.title = c;
      // El color lo muestra el lápiz, no un fondo: ya no hace falta el
      // borde gris que antes hacía visible el blanco contra la píldora.
      b.innerHTML = lapizSVG(c) + `<span class="sr-only">${c}</span>`;
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
      // t.icon es un archivo de iconos/, no un SVG: va como <img>.
      // El nombre visible queda en el .sr-only para los lectores de
      // pantalla, así que el alt va vacío y no se lee dos veces.
      btn.innerHTML = `<img src="${ICONS_DIR}${t.icon}" alt="" draggable="false">`
        + `<span class="sr-only">${t.title}</span>`;
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
