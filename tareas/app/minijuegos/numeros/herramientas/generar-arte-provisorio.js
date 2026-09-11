/* =====================================================================
   ARTE PROVISORIO DE LOS NUMEROS — herramienta interna, NO es parte del juego.

   Genera los PNG de `cifras/` (relleno a color, contorno hueco y la tinta de
   cada trazo) dibujando los ejes de trazado de `numeros.js` como una linea
   gruesa. Es un reemplazo temporal del arte del disenador: ver
   PEDIDO-NUMEROS.md.

   Cuando llegue el arte de verdad esta herramienta deja de usarse — los PNG
   se reemplazan por los del disenador, con los mismos nombres.

   Uso (hace falta node y playwright instalados):
       node herramientas/generar-arte-provisorio.js

   La geometria NO se duplica aca: sale de `numeros.js`, que es la fuente de
   verdad. Si cambia un trazo, se regenera el arte y queda alineado solo.
   ===================================================================== */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RAIZ   = path.join(__dirname, '..');
const SALIDA = path.join(RAIZ, 'cifras');
const W      = 122;   // ancho del trazo, en unidades del lienzo de 1000
const BORDE  = 11;    // lo que sobresale el contorno a cada lado

// numeros.js es un <script> comun (declara `var NUMEROS`), no un modulo
const NUMEROS = (function(){
  var sandbox = {};
  new Function('global', fs.readFileSync(path.join(RAIZ, 'numeros.js'), 'utf8') +
    '; global.NUMEROS = NUMEROS;')(sandbox);
  return sandbox.NUMEROS;
})();

const oscuro = hex => '#' + [1,3,5].map(i =>
  Math.round(parseInt(hex.substr(i,2),16) * 0.6).toString(16).padStart(2,'0')).join('');

const svg = inner => '<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="2000" ' +
  'viewBox="0 0 1000 1000">' + inner + '</svg>';
const linea = (d, color, w) => '<path d="' + d + '" fill="none" stroke="' + color +
  '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"/>';

// todos los bordes primero y todos los rellenos despues: asi la silueta queda
// con un contorno parejo y los trazos no se tapan entre si
const arte = (ds, c) => svg(ds.map(d => linea(d, oscuro(c), W + BORDE*2)).join('') +
                            ds.map(d => linea(d, c, W)).join(''));

// el borde con el interior recortado: queda solo el filo, hueco adentro.
// OJO: sin maskUnits="userSpaceOnUse" el navegador recorta la mascara al
// bounding box del grupo y se come los filos de afuera.
const contorno = (ds, c) => svg(
  '<defs><mask id="hueco" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="1000">' +
    '<rect width="1000" height="1000" fill="#fff"/>' +
    ds.map(d => linea(d, '#000', W)).join('') +
  '</mask></defs>' +
  '<g mask="url(#hueco)">' + ds.map(d => linea(d, oscuro(c), W + BORDE*2)).join('') + '</g>');

// la tinta de un trazo: su mancha sola, sin borde. El motor la dilata para
// que tape tambien el contorno del arte.
const tinta = (d, c) => svg(linea(d, c, W));

(async () => {
  fs.mkdirSync(SALIDA, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport:{ width:2000, height:2000 } });

  async function png(markup, file){
    await page.setContent('<body style="margin:0">' + markup + '</body>');
    await page.locator('svg').screenshot({ path: path.join(SALIDA, file), omitBackground:true });
  }

  for (const n of NUMEROS){
    const ds = n.mayus.strokes, c = n.color;
    await png(arte(ds, c),     n.letter + '.png');
    await png(contorno(ds, c), n.letter + '-contorno.png');
    for (let i = 0; i < ds.length; i++){
      await png(tinta(ds[i], c), n.letter + '-t' + (i+1) + '.png');
    }
    console.log('  ' + n.letter + ' — ' + (2 + ds.length) + ' piezas');
  }

  await browser.close();
  console.log('Arte provisorio generado en ' + SALIDA);
})();
