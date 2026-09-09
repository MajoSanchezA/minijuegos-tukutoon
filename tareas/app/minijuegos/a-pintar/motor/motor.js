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

  const DEFAULT_PALETTE = ['#FF6F59','#FFC94A','#2EC4B6','#5AA9E6','#B388EB','#FFB4C6','#8BC34A','#E8735A','#2B2140','#FFFFFF'];


  // Herramientas de trazo libre (todas menos balde/borrador comparten
  // "aplicar color en un punto"; cada una tiene su propia textura).
  const STROKE_TOOLS = ['marker', 'pencil', 'brush', 'spray', 'glitter', 'eraser'];

  // La barra muestra CINCO herramientas: es el set de iconos ilustrados
  // que hizo diseño, y con chicos de 2 a 5 años cinco botones grandes se
  // aciertan mejor que siete chicos. 'marker' (marcador) y 'spray'
  // (aerosol) siguen implementados más abajo (stampMarker / stampSpray) y
  // listos para volver: alcanza con sumarles un icono y su línea acá.
  // 'icon' es el nombre del archivo dentro de iconos/, no un SVG.
  // El orden es el del prototipo, de arriba hacia abajo. NO es el orden
  // en que uno las pondría: el balde va cuarto aunque sea la que más se
  // usa. Por eso la que arranca elegida se define aparte, en lugar de
  // ser simplemente la primera de la lista.
  const TOOLS = [
    { id: 'brush', title: 'Acuarela', icon: 'pincel.png' },
    { id: 'eraser', title: 'Borrar', icon: 'borrador.png' },
    { id: 'pencil', title: 'Lápiz', icon: 'lapiz.png' },
    { id: 'bucket', title: 'Balde', icon: 'balde.png' },
    { id: 'glitter', title: 'Brillantina', icon: 'especial.png' }
  ];
  const TOOL_INICIAL = 'bucket';


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
  // En el prototipo los lápices se salen por el borde derecho: se ve la
  // punta y un pedazo del cuerpo, gruesos. El rail no puede dejar que
  // se desborden de verdad (tiene overflow-y:auto, que fuerza a
  // overflow-x a auto), así que el recorte lo hace el propio SVG con
  // preserveAspectRatio="xMinYMid slice": el dibujo se escala para
  // CUBRIR la caja y lo que sobra se corta del lado derecho, dejando la
  // punta siempre visible.
  //
  // La ventaja de recortar así, y no achicando el viewBox, es que el
  // grosor y el largo quedan independientes: el CSS fija el alto (que
  // no cambia nunca) y el ancho (que crece cuando el lápiz está
  // elegido). Por eso el elegido "sobresale" hacia el dibujo sin
  // engordar ni correr a los demás de fila.
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
    const t = {
      cuerpo: hex.toUpperCase(),
      // Pasado 85 de luminosidad no queda margen para aclarar: ahí el
      // reflejo se invierte y pasa a ser una sombra suave, si no un
      // lápiz blanco queda plano y no se le lee la forma.
      // +10 de luminosidad, que es exactamente lo que hace el archivo de
      // diseño (cuerpo #C94BFE -> brillo #D97EFE). Antes subía un 28% de
      // lo que faltaba para blanco, y con colores pastel eso son 5
      // puntos: el lápiz quedaba plano, sin volumen.
      brillo: l <= 85 ? hslAHex(h, s, Math.min(97, l + 10)) : hslAHex(h, s, l - 8),
      // El contorno se deriva del propio color. Medido sobre el
      // prototipo: cuerpo #00CE00 -> contorno #00B500, o sea la
      // luminosidad baja a 0,88. Antes bajaba a 0,62 y los lápices
      // quedaban con un borde casi negro, pesadísimo.
      // Debajo de 22 se aclara en vez de oscurecer: un lápiz casi negro
      // no tiene margen para abajo y se quedaría sin contorno.
      borde: l > 22
        ? hslAHex(h, Math.min(100, s * 1.05), Math.min(l * 0.88, l - 5))
        : hslAHex(h, Math.min(100, s * 1.05), l + 14),
      // La punta va del MISMO color que el contorno. En el arte es una
      // argolla —un triángulo con otro triángulo adentro— y el prototipo
      // la pinta del color del borde, con el color del cuerpo adentro:
      // leyendo el lápiz verde a lo largo del eje salen 30px de #01AF01
      // (el anillo), 18px de #00C600 (el cuerpo) y 24px de #00B700.
      // Y el grosor del anillo que ya trae el arte, 28 unidades, es
      // justo el del contorno: por eso la punta no lleva contorno
      // aparte, se pinta y ya.
      punta: null,   // se completa abajo, es el mismo valor que borde
      madera:  '#FCD6B5',
      madera2: '#C88B74'
    };
    t.punta = t.borde;
    return t;
  }

  // El contorno rodea SOLO el cuerpo. Medido en el prototipo: el cono
  // de madera no lleva contorno de color — sus bordes son los dos filos
  // marrones que el arte ya trae (#C88B74, 18px sobre un cono de 162) —
  // y la punta tampoco, porque es una argolla que ya se pinta del color
  // del borde. Contornear el cono, además, dejaba un escalón feo en el
  // ensanche, porque el cono es más ancho que el cuerpo.
  const LAPIZ_CUERPO = 3;
  // Ancho del trazo; la mitad asoma por afuera del cuerpo. El cuerpo
  // mide 155 unidades de grosor, así que 44 dejan 22 por lado: el 11%
  // del grosor total, que es lo que se mide en el prototipo (24px de
  // contorno sobre 216 de lápiz).
  const LAPIZ_BORDE = 44;
  // Cuánto se estira el cuerpo para llegar al cono. En el archivo de
  // diseño las dos aristas NO se tocan: la del cono corre unas 20
  // unidades por debajo de la del cuerpo. Sin contorno casi no se nota,
  // pero al ponerle contorno ese hueco se abre y se ve el fondo entre
  // el cuerpo y la madera. Estirando el cuerpo 20 unidades se cierra, y
  // como el cono se dibuja después, el estirón queda tapado en todo lo
  // demás.
  const LAPIZ_CRECE = 40;   // trazo; la mitad, 20, es lo que se estira
  // El contorno sobresale media pluma del dibujo, así que el viewBox
  // tiene que arrancar antes del 0 y terminar después del alto: si no,
  // el borde queda cortado justo en el lado que más se ve.
  const LAPIZ_AIRE = (LAPIZ_BORDE + LAPIZ_CRECE) / 2 + 2;

  // Acostado: rotar 90° manda la punta (que en el archivo está abajo)
  // hacia la izquierda, o sea hacia el dibujo.
  function lapizSVG(hex) {
    const c = lapizTonos(hex);
    // El contorno es una CAPA DE ABAJO: el mismo cuerpo, relleno y
    // engordado con un trazo del color del borde. Encima van los
    // rellenos normales, que lo tapan entero, así que del contorno solo
    // queda lo que asoma por afuera.
    //
    // Es geometría pura, sin filtros. Antes lo sacaba con un
    // desenfoque + umbral sobre la unión de las figuras y eso no
    // engordaba la silueta: la derretía. Con una desviación de 24
    // sobre un lápiz de 191 de grosor, el cuerpo perdía los lados
    // rectos y quedaba como una salchicha.
    // El trazo del contorno lleva sumado el estirón del cuerpo, para
    // que lo que asoma por afuera siga siendo LAPIZ_BORDE / 2.
    const contorno = `<path fill="${c.borde}" stroke="${c.borde}" `
      + `stroke-width="${LAPIZ_BORDE + LAPIZ_CRECE}" stroke-linejoin="round" `
      + `d="${LAPIZ_FIGURAS[LAPIZ_CUERPO][1]}"/>`;
    const vb = [-LAPIZ_AIRE, -LAPIZ_AIRE,
                LAPIZ_H + LAPIZ_AIRE * 2, LAPIZ_W + LAPIZ_AIRE * 2].join(' ');
    return `<svg viewBox="${vb}" preserveAspectRatio="xMinYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`
      + `<g transform="translate(${LAPIZ_H},0) rotate(90)">`
      + contorno
      + LAPIZ_FIGURAS.map((f, i) => {
          const crece = i === LAPIZ_CUERPO
            ? ` stroke="${c.cuerpo}" stroke-width="${LAPIZ_CRECE}" stroke-linejoin="round"`
            : '';
          return `<path fill="${c[f[0]]}"${crece} d="${f[1]}"/>`;
        }).join('')
      + '</g></svg>';
  }

  function buildDOM(cfg) {
    document.title = cfg.pageTitle || ('Colorea con TukuToon — ' + (cfg.title || ''));
    document.body.innerHTML = `
      <img class="bg-photo" src="${cfg.bgSrc || 'fondo-dibujo.png'}" alt="" aria-hidden="true">

      <div class="floaty" style="top:10%;left:5%;"><svg width="36" height="36" viewBox="0 0 36 36"><polygon points="18,2 34,32 2,32" fill="#FFC94A"/></svg></div>
      <div class="floaty" style="top:65%;left:3%;"><svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#2EC4B6"/></svg></div>
      <div class="floaty" style="top:18%;right:5%;"><svg width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="14" fill="#FF6F59"/></svg></div>

      <div class="app">
        <div class="rail rail-left">
          ${cfg.showBackButton === false ? '' : `<a class="salir-btn" href="${cfg.menuHref || 'menu.html'}" title="Volver al menú" aria-label="Volver al menú"><img src="${cfg.iconsBase || ICONS_BASE}salir.png" alt="" draggable="false"></a>`}
          <div class="tools" id="tools"></div>
        </div>

        <!-- Guardar NO pertenece a la columna de la izquierda: en el
             prototipo cae en x 15,5% mientras los otros seis están en
             12,6%. Es un botón suelto, igual que reiniciar del otro lado.
             Verlo así fue lo que hizo cerrar la cuenta: con seis iconos
             en la columna, la separación del diseño (15,3% del alto) sí
             entra; con siete no, y por eso en el mockup el último queda
             cortado. -->
        <button class="nav-arrow descargar" id="done-btn" title="Guardar el dibujo" aria-label="Guardar el dibujo"><img src="${cfg.iconsBase || ICONS_BASE}descargar.png" alt="" draggable="false"></button>

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

        <!-- Los lápices y reiniciar NO van envueltos en un rail: cada
             uno se ubica por su cuenta desde las coordenadas del fondo, y
             para eso tienen que colgar del .app — si colgaran de un rail
             que a su vez está posicionado, sus coordenadas se resolverían
             contra el rail y no contra la pantalla. -->
        <div class="swatches" id="swatches"></div>
        <button class="nav-arrow restart" id="clear-btn" title="Empezar de nuevo" aria-label="Empezar de nuevo"><img src="${cfg.iconsBase || ICONS_BASE}reiniciar.png" alt="" draggable="false"></button>
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

    // El trazo es fijo: no hay control de grosor. Un chico de 2 a 5 años
    // no va a regular un slider, y el diseño tampoco lo tiene. Va como
    // fracción del ancho del dibujo para que se sienta igual en
    // cualquier dibujo, sea de 1100 o de 2000 px de lado.
    const state = { color: PALETTE[0], tool: TOOL_INICIAL, brushSize: 14 };
    const TRAZO = 1 / 38;   // del ancho del dibujo

    let W = 0, H = 0;
    let wallMask = null;      // Uint8Array: 1 = línea/borde
    let labels = null;        // Int32Array: id de región por píxel, -2 = borde
    let regionPixels = [];    // Uint32Array por región
    let regionBounds = [];    // [x,y,w,h] por región, para repintar rápido
    let paintData = null;     // ImageData de la capa de color
    let inkData = null;       // ImageData de las líneas negras (overlay)
    // La acuarela necesita saber la forma del trazo ENTERO, no solo del
    // punto que está estampando: el borde mojado —esa orilla más oscura
    // que deja el agua al secarse— es una propiedad del contorno del
    // trazo. Por eso va acumulando el agua en una máscara aparte y
    // recompone el color sobre una foto de cómo estaba la pintura antes
    // de empezar el trazo.
    let acuaMask = null;      // Float32Array: cuánta agua dejó ESTE trazo
    let acuaFondo = null;     // copia de la pintura al empezar el trazo
    let acuaBox = null;       // qué ensució, para limpiar solo eso

    const paintCanvas = document.getElementById('paint-canvas');
    const inkCanvas = document.getElementById('ink-canvas');
    const pctx = paintCanvas.getContext('2d', { willReadFrequently: true });
    const ictx = inkCanvas.getContext('2d');
    const wrap = document.getElementById('canvas-wrap');
    const loadingEl = document.getElementById('loading');
    const placeholderEl = document.getElementById('placeholder-msg');
    const stageWrapEl = document.querySelector('.stage-wrap');
    const paperEl = document.querySelector('.paper');
    const railIzqEl = document.querySelector('.rail-left');
    const coloresEl = document.querySelector('.swatches');
    const reiniciarEl = document.getElementById('clear-btn');
    const descargarEl = document.getElementById('done-btn');
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
    // El fondo trae la hoja dibujada adentro. Estos son sus números,
    // medidos sobre el archivo compuesto (1748x804, el doble del frame
    // del prototipo): dónde cae la hoja y cuánto mide. Si se recompone
    // el fondo, hay que actualizarlos.
    // Todo medido sobre el frame del prototipo (874x402) y llevado al
    // doble, que es el tamaño del fondo compuesto. Si se recompone el
    // fondo o se rehace el prototipo, se actualiza acá y listo: no hay
    // ninguna otra posición hardcodeada.
    const FONDO = {
      w: 1748, h: 804,
      hoja:      { x: 516, y: 92, w: 806, h: 899 },
      // Columna de la izquierda: 7 iconos (salir, 5 herramientas,
      // guardar). En el prototipo el primero cae en y=82 y la
      // separación entre centros es 123, pero con esa separación el
      // séptimo se saldría por abajo — en el mockup queda cortado. Acá
      // se aprieta lo necesario para que entren los siete enteros.
      // Seis: salir y las cinco herramientas.
      iconos:    { cx: 220, lado: 96, cy0: 82, paso: 123 },
      // Guardar va AL LADO de la estrella, a la misma altura, no debajo:
      // en el prototipo las dos ocupan y 328..369. Al principio las medí
      // juntas — mi detección de color agarraba las dos como una sola
      // mancha — y lo puse abajo. Puesto al costado, la columna entra
      // con la separación del diseño (123) sin que nada se pise.
      descargar: { cx: 351, cy: 697, lado: 96 },
      // Lápices: 6, pegados al borde derecho.
      lapices:   { der: 1748, largo: 178, grosor: 76, cy0: 229, paso: 96 },
      reiniciar: { cx: 1446, cy: 700, lado: 92 }
    };

    // Proporciones medidas sobre el frame del prototipo (874x402). Van
    // como fracción del alto del juego y NO como px fijos: con px fijos
    // se veían bien en un celular horizontal y demasiado chicos en una
    // pantalla más alta, porque el @media de pantallas bajas dejaba de
    // aplicar. Estas se recalculan en cada fitStage().
    const P = {
      hojaAlto:  1.12,    // la hoja es MÁS ALTA que la pantalla y se corta abajo
      hojaTop:   0.114,   // dónde apoya su borde de arriba
      icono:     0.119,   // caja del icono (48px sobre 402)
      aire:      0.025,   // separación entre iconos
      grosor:    0.095,   // grosor del lápiz (38px sobre 402)
      largoLapiz: 2.74,   // largo visible / grosor
      largoSel:   3.65,   // ídem, para el elegido
      lapicesVisibles: 6  // cuántos entran sin deslizar, como en el prototipo
    };
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

      // El fondo va con object-fit:cover. Para poner cada cosa donde la
      // puso diseño hay que replicar esa transformación a mano: se
      // escala para CUBRIR la pantalla y lo que sobra se recorta por
      // partes iguales de los dos lados. Con eso, X() e Y() pasan
      // cualquier coordenada del fondo a coordenada de pantalla.
      const vw = isRotatedForLandscape()
        ? window.innerHeight
        : (window.innerWidth || document.documentElement.clientWidth);
      const esc = Math.max(vw / FONDO.w, vh / FONDO.h);
      const sobraX = (FONDO.w * esc - vw) / 2;
      const sobraY = (FONDO.h * esc - vh) / 2;
      const X = (v) => v * esc - sobraX;
      const Y = (v) => v * esc - sobraY;
      // Para lo que va PEGADO A UN BORDE hay que medir desde ese borde,
      // no desde el fondo. Si la pantalla es más angosta que el diseño
      // (un celular real da 1.45 contra el 2.17 del prototipo), el fondo
      // se recorta a lo ancho — y con X() la interfaz se iba recortada
      // junto con él: la columna de iconos quedaba en x -66 y los
      // lápices en 827 con la pantalla de 663. Medido desde el borde,
      // cuando no hay recorte da exactamente lo mismo que X(), y cuando
      // lo hay se queda donde se ve.
      const desdeIzq = (v) => v * esc;
      const desdeDer = (v) => vw - (FONDO.w - v) * esc;

      const raiz = document.documentElement;

      // --- columna de la izquierda ---
      const ico = Math.max(Math.round(FONDO.iconos.lado * esc), 30);
      raiz.style.setProperty('--ico', ico + 'px');
      raiz.style.setProperty('--rail-gap',
        Math.max(Math.round((FONDO.iconos.paso - FONDO.iconos.lado) * esc), 2) + 'px');
      // reiniciar se alinea con la estrella y con guardar, misma cuenta
      railIzqEl.style.left = Math.round(desdeIzq(FONDO.iconos.cx) - ico / 2) + 'px';
      railIzqEl.style.top = Math.round(Y(FONDO.iconos.cy0) - ico / 2) + 'px';
      railIzqEl.style.width = ico + 'px';

      // --- lápices ---
      const grosor = Math.max(Math.round(FONDO.lapices.grosor * esc), 12);
      const pasoLapiz = Math.round(FONDO.lapices.paso * esc);
      raiz.style.setProperty('--grosor', grosor + 'px');
      raiz.style.setProperty('--lapiz-gap', Math.max(pasoLapiz - grosor, 0) + 'px');
      raiz.style.setProperty('--lapiz', Math.round(FONDO.lapices.largo * esc) + 'px');
      raiz.style.setProperty('--lapiz-sel', Math.round(FONDO.lapices.largo * 1.33 * esc) + 'px');
      // Alto de seis lápices: los demás se deslizan.
      raiz.style.setProperty('--colores-alto',
        (P.lapicesVisibles * grosor + (P.lapicesVisibles - 1) * Math.max(pasoLapiz - grosor, 0)) + 'px');
      coloresEl.style.top = Math.round(Y(FONDO.lapices.cy0) - grosor / 2) + 'px';
      coloresEl.style.left = Math.round(desdeDer(FONDO.lapices.der)) + 'px';

      // --- guardar: suelto, al lado de la estrella ---
      // El top NO se calcula desde FONDO sino con la misma cuenta que usa
      // el rail para su último icono. Calculándolo aparte quedaba 2px más
      // arriba que la estrella: el rail acumula el redondeo del gap seis
      // veces y el resultado no coincide al píxel.
      const gapPx = Math.max(Math.round((FONDO.iconos.paso - FONDO.iconos.lado) * esc), 2);
      const topRail = Math.round(Y(FONDO.iconos.cy0) - ico / 2);
      descargarEl.style.width = ico + 'px';
      descargarEl.style.height = ico + 'px';
      descargarEl.style.left = Math.round(desdeIzq(FONDO.descargar.cx) - ico / 2) + 'px';
      descargarEl.style.top = (topRail + 5 * (ico + gapPx)) + 'px';

      // --- reiniciar: en el prototipo va al COSTADO de los lápices, no
      // debajo ---
      // Mismo tamaño que el resto de los iconos: en el prototipo reiniciar
      // mide 46x47 contra los 48 de la columna, o sea lo mismo.
      reiniciarEl.style.width = ico + 'px';
      reiniciarEl.style.height = ico + 'px';
      reiniciarEl.style.left = Math.round(desdeDer(FONDO.reiniciar.cx) - ico / 2) + 'px';
      reiniciarEl.style.top = (topRail + 5 * (ico + gapPx)) + 'px';

      // --- la hoja ---
      const hojaX = X(FONDO.hoja.x);
      const hojaTop = Y(FONDO.hoja.y);
      const anchoReal = FONDO.hoja.w * esc;
      const hojaH = FONDO.hoja.h * esc;
      paperEl.style.left = Math.round(hojaX) + 'px';
      paperEl.style.top = Math.round(hojaTop) + 'px';
      paperEl.style.width = Math.round(anchoReal) + 'px';
      paperEl.style.height = Math.round(hojaH) + 'px';

      // El dibujo se centra en la parte VISIBLE de la hoja, no en la
      // hoja entera: la hoja es más alta que la pantalla y se corta
      // abajo, así que centrarlo en la hoja entera lo dejaría medio
      // tapado por el borde.
      const visible = Math.max(Math.min(hojaTop + hojaH, vh) - hojaTop, 60);
      const innerW = Math.max(anchoReal * 0.80, 40);
      const innerH = Math.max(visible * 0.86, 40);
      const scale = Math.min(innerW / ratioW, innerH / ratioH);
      const dispW = Math.max(Math.floor(ratioW * scale), 40);
      const dispH = Math.max(Math.floor(ratioH * scale), 30);
      wrap.style.width = dispW + 'px';
      wrap.style.height = dispH + 'px';
      wrap.style.marginTop = Math.max(Math.round((visible - dispH) / 2), 0) + 'px';
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
          acuaMask = new Float32Array(W * H);
          acuaFondo = new Uint8ClampedArray(paintData.data.length);
          acuaBox = null;

          state.brushSize = Math.max(6, Math.round(W * TRAZO));
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

      // El AFUERA del dibujo se puede PINTAR pero no se puede RELLENAR.
      // Son dos cosas distintas y antes las trataba como una sola:
      //   - Con el balde quedaba el cuadrado. Es la región más grande y
      //     la más fácil de tocar sin querer, y como el dibujo es
      //     cuadrado el relleno tapaba la hoja entera de un color, con
      //     un borde recto que no tiene nada que ver con el personaje.
      //     Por eso sigue con labels = -2: el balde la ignora.
      //   - Con los pinceles, en cambio, no molesta: el chico decora
      //     alrededor del personaje y el trazo se corta solo contra el
      //     borde del lienzo, que ya está adentro de la hoja. Por eso
      //     NO se marca en wallMask.
      //
      // Se recorre TODO el borde, no solo las esquinas: si el personaje
      // llega cerca de un lado —los brazos de Tuku, por ejemplo— parte
      // el afuera en varias regiones sueltas, y mirando solo las cuatro
      // esquinas quedaban rellenables las de los costados.
      const fuera = [];
      const marcarBorde = (i) => {
        if (labels[i] >= 0 && fuera.indexOf(labels[i]) < 0) fuera.push(labels[i]);
      };
      for (let x = 0; x < W; x++) { marcarBorde(x); marcarBorde((H - 1) * W + x); }
      for (let y = 0; y < H; y++) { marcarBorde(y * W); marcarBorde(y * W + W - 1); }
      for (const id of fuera) {
        const pix = regionPixels[id];
        for (let k = 0; k < pix.length; k++) labels[pix[k]] = -2;
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

    // Ruido ESTABLE por píxel: el mismo (x, y) devuelve siempre el mismo
    // valor. Es lo que separa un grano de papel de un ruido de TV: con
    // Math.random() cada pasada del lápiz cae en píxeles distintos y al
    // repasar se termina rellenando todo parejo; con esto las mismas
    // fibras agarran color siempre y las mismas quedan en blanco, así que
    // repasar OSCURECE pero el grano no desaparece.
    // OJO con los desplazamientos: tienen que ser `>>>` y no `>>`. Con el
    // aritmético, el signo se arrastra y el XOR final termina forzando el
    // bit más alto a 0 SIEMPRE, así que la función nunca pasa de 0,5 y da
    // 0,25 de promedio en vez de 0,5. Con eso el lápiz casi no pintaba:
    // apenas el 5% de los píxeles llegaba al umbral de agarre.
    function ruido(x, y) {
      let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
      n = Math.imul(n ^ (n >>> 13), 1274126177);
      return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    }

    // Igual que compositeOver pero tomando como base la foto de antes
    // del trazo, no lo que hay dibujado ahora. Es lo que permite que la
    // acuarela se recomponga cuantas veces haga falta sin acumularse.
    function sobreFondo(data, p, r, g, b, srcA) {
      const destA = acuaFondo[p + 3] / 255;
      const outA = srcA + destA * (1 - srcA);
      if (outA <= 0) { data[p] = 0; data[p + 1] = 0; data[p + 2] = 0; data[p + 3] = 0; return; }
      data[p] = Math.round((r * srcA + acuaFondo[p] * destA * (1 - srcA)) / outA);
      data[p + 1] = Math.round((g * srcA + acuaFondo[p + 1] * destA * (1 - srcA)) / outA);
      data[p + 2] = Math.round((b * srcA + acuaFondo[p + 2] * destA * (1 - srcA)) / outA);
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

    // Cada trazo de acuarela es UNA aguada: arranca de cero sobre una
    // foto de cómo estaba la pintura, así que pasar quince veces por el
    // mismo lugar dentro del mismo trazo no lo pone quince veces más
    // oscuro. Levantar el dedo y volver a pasar SÍ superpone otra
    // aguada, que es exactamente como se comporta la acuarela.
    function acuaIniciar() {
      if (acuaBox) {
        for (let y = acuaBox[1]; y <= acuaBox[3]; y++) {
          acuaMask.fill(0, y * W + acuaBox[0], y * W + acuaBox[2] + 1);
        }
      }
      acuaBox = null;
      acuaFondo.set(paintData.data);
    }

    // Acuarela. Lo que la hace acuarela y no un aerógrafo es el BORDE
    // MOJADO: el agua arrastra el pigmento hacia la orilla y al secarse
    // deja ahí una franja más oscura que en el medio. Eso no se puede
    // sacar de un solo estampado —el estampado no sabe dónde termina el
    // trazo—, así que se acumula el agua en `acuaMask` y el color se
    // recompone mirando esa máscara: donde hay poca agua (la orilla) el
    // pigmento se concentra.
    function stampBrush(px, py, rgba, radius, ux, uy) {
      const data = paintData.data;
      const r2 = radius * radius;
      // 1) mojar
      const mx0 = Math.max(0, px - radius), mx1 = Math.min(W - 1, px + radius);
      const my0 = Math.max(0, py - radius), my1 = Math.min(H - 1, py + radius);
      for (let y = my0; y <= my1; y++) {
        for (let x = mx0; x <= mx1; x++) {
          const dx = x - px, dy = y - py;
          const d2 = dx * dx + dy * dy;
          if (d2 > r2) continue;
          // Meseta con caída CORTA, no una campana. Con una campana el
          // color se apaga a lo largo de casi todo el radio del pincel, y
          // un color fuerte con halo difuso alrededor es justo lo que se
          // ve como NEÓN. La pintura tiene el borde corto.
          const t = Math.sqrt(d2) / radius;
          // El filo no es perfecto: se corre un poco según el papel. Sin
          // esto el trazo tiene dos bordes rectos y paralelos y parece
          // cinta pegada, no pintura apoyada.
          const filo = 0.82 + (ruido(x, y) - 0.5) * 0.12;
          const perfil = t < filo ? 1 : (1 - t) / (1 - filo);
          const idx = y * W + x;
          // El tope corta el oscurecimiento adentro del mismo trazo.
          acuaMask[idx] = Math.min(1.2, acuaMask[idx] + perfil * 0.75);
        }
      }
      const dirX = ux || 1, dirY = uy || 0;
      // 2) recomponer, con un margen: al alargarse el trazo, la orilla
      //    de hace un momento pasa a ser el medio y hay que repintarla.
      const m = Math.ceil(radius * 0.5);
      const x0 = Math.max(0, mx0 - m), x1 = Math.min(W - 1, mx1 + m);
      const y0 = Math.max(0, my0 - m), y1 = Math.min(H - 1, my1 + m);
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const idx = y * W + x;
          const agua = acuaMask[idx];
          if (agua <= 0) continue;
          if (wallMask[idx]) continue;
          const mojado = Math.min(1, agua);
          // El cuerpo de la pintura tapa: con poca agua ya llega a
          // opaco. Esto es lo que hace que se vea el color que el chico
          // eligió y no una versión lavada de ese color — antes el trazo
          // no pasaba de 0,63 de opacidad y sobre la hoja crema eso
          // devuelve otro color, más claro y más apagado.
          // 2,2 y no 1,5: la pintura tapa rápido y el degradé del borde
          // queda angosto. Con un borde ancho el trazo parece soplado
          // con aerógrafo en vez de apoyado con un pincel.
          const cuerpo = Math.min(1, mojado * 1.6);
          // Campana centrada donde el agua empieza a escasear: ahí queda
          // la orilla. Ya no la marca subiendo el alfa —el trazo va casi
          // opaco— sino OSCURECIENDO el pigmento, que es lo que pasa de
          // verdad cuando el agua lo arrastra a la orilla y se seca.
          // La orilla queda justo ADENTRO del borde, donde la pintura ya
          // tapa: así se lee como una línea más oscura que encierra el
          // trazo, no como un resplandor que se escapa hacia afuera.
          const orilla = Math.exp(-Math.pow((mojado - 0.85) / 0.13, 2));
          // Los pelos del pincel no depositan parejo. La variación va en
          // el PIGMENTO y no en la transparencia: variando la
          // transparencia el trazo se vuelve translúcido y disparejo, que
          // es otra vez el aspecto de luz y no de pintura.
          const u = x * dirX + y * dirY, v = -x * dirY + y * dirX;
          const pelo = ruido(Math.floor(u / 14), Math.floor(v / 2));
          const k = (1 - 0.22 * orilla) * (0.95 + 0.1 * pelo);
          sobreFondo(data, idx * 4, rgba[0] * k, rgba[1] * k, rgba[2] * k, cuerpo);
        }
      }
      if (!acuaBox) acuaBox = [x0, y0, x1, y1];
      else {
        if (x0 < acuaBox[0]) acuaBox[0] = x0;
        if (y0 < acuaBox[1]) acuaBox[1] = y0;
        if (x1 > acuaBox[2]) acuaBox[2] = x1;
        if (y1 > acuaBox[3]) acuaBox[3] = y1;
      }
      pctx.putImageData(paintData, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    }

    // Una escama de brillantina. tam 0 es un puntito —la mayoría de las
    // escamas de un frasco son eso, motas que devuelven la luz— y tam 1
    // es un destello en cruz, de los que se ven cuando una escama pega
    // justo con la luz. Un píxel más claro suelto no se lee como brillo;
    // lo que lo hace leer así es que haya de los dos.
    function escama(data, cx, cy, r, g, b, tam) {
      const brazos = tam === 0
        ? [[0, 0, 1], [1, 0, 0.45], [0, 1, 0.45]]
        : [[0, 0, 1], [-1, 0, 0.8], [1, 0, 0.8], [0, -1, 0.8], [0, 1, 0.8],
           [-2, 0, 0.4], [2, 0, 0.4], [0, -2, 0.4], [0, 2, 0.4],
           [-3, 0, 0.15], [3, 0, 0.15], [0, -3, 0.15], [0, 3, 0.15]];
      for (const [dx, dy, peso] of brazos) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || x >= W || y < 0 || y >= H) continue;
        const idx = y * W + x;
        if (wallMask[idx]) continue;
        compositeOver(data, idx * 4, r, g, b, peso);
      }
    }

    // Una estrella de cinco puntas, rellena y con el borde suavizado.
    //
    // Se dibuja a mano sobre los píxeles en vez de usar un `path` del
    // contexto 2D porque el motor trabaja sobre `paintData` y lo empuja
    // con putImageData: cualquier cosa dibujada con el contexto la borra
    // el siguiente estampado de otra herramienta.
    //
    // El borde sale de la fórmula polar de la estrella: dentro de cada
    // sector, el contorno es la recta que va de una punta (radio R) al
    // valle siguiente (radio interior), y a un ángulo phi esa recta está
    // a  R·rin·sen(m) / (R·sen(phi) + rin·sen(m − phi)).  Comparando esa
    // distancia con la del píxel sale, además, el suavizado: en el
    // último píxel el relleno se va apagando en vez de cortar en
    // escalera.
    function estrellaPintada(data, cx, cy, R, giro, r, g, b, alpha) {
      const rin = R * 0.45;
      const beta = Math.PI * 2 / 5, mitad = beta / 2, senMitad = Math.sin(mitad);
      const x0 = Math.max(0, Math.floor(cx - R) - 1), x1 = Math.min(W - 1, Math.ceil(cx + R) + 1);
      const y0 = Math.max(0, Math.floor(cy - R) - 1), y1 = Math.min(H - 1, Math.ceil(cy + R) + 1);
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x - cx, dy = y - cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > R + 1) continue;
          let phi = (Math.atan2(dy, dx) - giro) % beta;
          if (phi < 0) phi += beta;
          if (phi > mitad) phi = beta - phi;
          const borde = (R * rin * senMitad) /
                        (R * Math.sin(phi) + rin * Math.sin(mitad - phi));
          const cobertura = Math.min(1, borde - d + 0.5);
          if (cobertura <= 0) continue;
          const idx = y * W + x;
          if (wallMask[idx]) continue;
          compositeOver(data, idx * 4, r, g, b, alpha * cobertura);
        }
      }
    }

    // Dónde se plantó la última estrella. Las estrellas no se estampan
    // una por punto interpolado —quedarían encimadas y el trazo volvería
    // a ser una franja— sino cada tanto de recorrido.
    let ultEstX = -1e9, ultEstY = -1e9;

    // La herramienta de la estrella PINTA CON ESTRELLAS: el trazo es un
    // reguero de estrellitas del color elegido, de tamaños y giros
    // distintos, con alguna más clara y unas chispitas sueltas entre
    // medio. No lleva ningún velo de color de fondo: si lo llevara,
    // volvería a ser un pincel más y las estrellas se perderían adentro.
    function stampGlitter(px, py, rgba, radius) {
      const data = paintData.data;
      const paso = radius * 1.05;
      const sx = px - ultEstX, sy = py - ultEstY;
      if (sx * sx + sy * sy < paso * paso) return;
      ultEstX = px; ultEstY = py;

      const R = radius * (0.6 + Math.random() * 0.55);
      const giro = Math.random() * Math.PI * 2;
      let r = rgba[0], g = rgba[1], b = rgba[2];
      if (Math.random() < 0.28) {          // alguna más clara, para que respire
        r = Math.round(r + (255 - r) * 0.45);
        g = Math.round(g + (255 - g) * 0.45);
        b = Math.round(b + (255 - b) * 0.45);
      }
      estrellaPintada(data, px, py, R, giro, r, g, b, 1);

      // chispitas alrededor, que es lo que la hace brillar
      for (let i = 0; i < 2; i++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = R * (0.9 + Math.random() * 0.8);
        const cx = Math.round(px + Math.cos(ang) * dist);
        const cy = Math.round(py + Math.sin(ang) * dist);
        if (cx < 0 || cx >= W || cy < 0 || cy >= H) continue;
        if (Math.random() < 0.5) escama(data, cx, cy, 255, 255, 255, Math.random() < 0.4 ? 1 : 0);
        else escama(data, cx, cy, 255, 240, 170, Math.random() < 0.4 ? 1 : 0);
      }
      const m = Math.ceil(R * 1.8) + 4;
      const bx = Math.max(0, px - m), by = Math.max(0, py - m);
      const bw = Math.min(W - 1, px + m) - bx + 1, bh = Math.min(H - 1, py + m) - by + 1;
      pctx.putImageData(paintData, 0, 0, bx, by, bw, bh);
    }

    // Lápiz de color. Tres cosas lo separan de un pincel chico:
    //   - Es FINO de verdad (30% del trazo base). Un lápiz gordo se
    //     confunde con el marcador por más grano que tenga.
    //   - Deja VETA: raya en la dirección en la que va la mano. Se
    //     consigue leyendo el ruido en coordenadas giradas — constante a
    //     lo largo del trazo, cambiante a lo ancho—, así que salen
    //     rayitas paralelas al movimiento, que es como se deposita el
    //     pigmento cuando uno raya.
    //   - Nunca tapa del todo: el papel asoma siempre entre las fibras.
    function stampPencil(px, py, rgba, radius, ux, uy) {
      const data = paintData.data;
      const r2 = radius * radius;
      const x0 = Math.max(0, px - radius), x1 = Math.min(W - 1, px + radius);
      const y0 = Math.max(0, py - radius), y1 = Math.min(H - 1, py + radius);
      const dirX = ux || 1, dirY = uy || 0;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x - px, dy = y - py;
          const d2 = dx * dx + dy * dy;
          if (d2 > r2) continue;
          const idx = y * W + x;
          if (wallMask[idx]) continue;
          const u = x * dirX + y * dirY;        // a lo largo del trazo
          const v = -x * dirY + y * dirX;       // a lo ancho
          const veta = ruido(Math.floor(u / 10), Math.floor(v));
          const papel = ruido(x, y);            // el grano fijo de la hoja
          const agarre = 0.5 * papel + 0.5 * veta;
          if (agarre < 0.30) continue;          // fibra que no agarra color
          const caida = 1 - Math.sqrt(d2) / radius;
          // La fibra que agarra, agarra FUERTE: el color tiene que ser el
          // que el chico eligió. Lo que hace de textura es el papel que
          // queda sin pintar entre fibra y fibra, no un color lavado.
          compositeOver(data, idx * 4, rgba[0], rgba[1], rgba[2],
                        1.0 * (0.5 + 0.5 * caida) * agarre);
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

    // Borrador: borra POR TRAZO, no la región entera. Antes era un balde
    // al revés —un toque y desaparecía todo el color de esa zona—, y así
    // no se puede corregir un pedacito. Deja el píxel transparente, o sea
    // se ve la hoja; las líneas del dibujo van en el otro lienzo y no se
    // tocan nunca. Tampoco mira wallMask: tiene que limpiar todo lo que
    // encuentre, incluso lo que quedó pegado contra una línea.
    function stampEraser(px, py, radius) {
      const data = paintData.data;
      // Más gordo que el pincel: un borrador de verdad es un ladrillo, y
      // para un chico de 2 a 5 años tiene que perdonar la puntería.
      const r = Math.max(4, Math.round(radius * 1.5));
      const r2 = r * r;
      const x0 = Math.max(0, px - r), x1 = Math.min(W - 1, px + r);
      const y0 = Math.max(0, py - r), y1 = Math.min(H - 1, py + r);
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x - px, dy = y - py;
          if (dx * dx + dy * dy > r2) continue;
          const p = (y * W + x) * 4;
          data[p] = 0; data[p + 1] = 0; data[p + 2] = 0; data[p + 3] = 0;
        }
      }
      pctx.putImageData(paintData, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    }

    // Cada material tiene su grosor. Un lápiz de color y un pincel de
    // acuarela no pueden dejar la misma huella: si los cinco pintan del
    // mismo ancho, se sienten iguales por más textura que tengan.
    const RADIO = { brush: 1.25, pencil: 0.30, glitter: 1.0, eraser: 1.5, marker: 0.9, spray: 1.1 };
    function radioDe(tool, base) { return Math.max(2, Math.round(base * (RADIO[tool] || 1))); }

    function applyStroke(tool, x, y, rgba, radius, ux, uy) {
      radius = radioDe(tool, radius);
      if (tool === 'eraser') { stampEraser(x, y, radius); return; }
      if (tool === 'marker') stampMarker(x, y, rgba, radius);
      else if (tool === 'pencil') stampPencil(x, y, rgba, radius, ux, uy);
      else if (tool === 'brush') stampBrush(x, y, rgba, radius, ux, uy);
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
      } else {
        drawing = true;
        lastX = x; lastY = y;
        if (state.tool === 'brush') acuaIniciar();
        // Que el primer toque plante una estrella aunque el dedo no se
        // mueva: si no, tocar y soltar no deja nada.
        if (state.tool === 'glitter') { ultEstX = -1e9; ultEstY = -1e9; }
        applyStroke(state.tool, x, y, hexToRgb(state.color), state.brushSize, 1, 0);
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
      // Hacia dónde va la mano. El lápiz lo necesita: la veta del color
      // se deposita en la dirección en la que uno raya.
      const ux = dist ? dx / dist : 1, uy = dist ? dy / dist : 0;
      // El paso va con el radio DE LA HERRAMIENTA, no con el grosor
      // base: el lápiz es fino y si se avanza el paso del pincel quedan
      // huecos entre estampado y estampado — el trazo sale punteado.
      const step = Math.max(1, radioDe(state.tool, radius) * 0.4);
      const steps = Math.max(1, Math.ceil(dist / step));
      for (let i = 1; i <= steps; i++) {
        const px = Math.round(lastX + (dx * i) / steps);
        const py = Math.round(lastY + (dy * i) / steps);
        applyStroke(state.tool, px, py, rgba, radius, ux, uy);
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
    TOOLS.forEach((t, i) => {
      const btn = document.createElement('button');
      btn.className = 'tool-btn' + (t.id === TOOL_INICIAL ? ' active' : '');
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
      });
      toolsWrap.appendChild(btn);
    });

    // borrar todo
    document.getElementById('clear-btn').addEventListener('click', () => {
      if (!paintData) return;
      paintData.data.fill(0);
      pctx.putImageData(paintData, 0, 0);
    });

    // Guardar: baja el dibujo como PNG, deja la miniatura para el menú
    // y celebra. La descarga es lo que promete el icono naranja del
    // diseño; el confeti y la miniatura ya estaban y se conservan.
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('done-btn').addEventListener('click', () => {
      if (!paintData) return;
      saveProgressSnapshot();
      descargarDibujo();
      overlay.classList.add('show');
      spawnConfetti();
    });

    // El PNG se arma aparte, sobre fondo blanco: los dos lienzos del
    // juego son transparentes (se ve la hoja de atrás), y un PNG
    // transparente se vería raro al abrirlo o imprimirlo.
    function descargarDibujo() {
      try {
        const out = document.createElement('canvas');
        out.width = W; out.height = H;
        const octx = out.getContext('2d');
        octx.fillStyle = '#ffffff';
        octx.fillRect(0, 0, W, H);
        octx.drawImage(paintCanvas, 0, 0);
        octx.drawImage(inkCanvas, 0, 0);
        out.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'tukutoon-' + progressKey().split(':').pop() + '.png';
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 3000);
        }, 'image/png');
      } catch (e) {
        // Si el navegador bloquea la descarga, el resto (miniatura y
        // confeti) tiene que seguir funcionando igual.
      }
    }
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
