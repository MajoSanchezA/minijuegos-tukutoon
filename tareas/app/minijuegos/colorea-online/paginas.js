/* ============================================================
   paginas.js — fuente de verdad del menú de "Colorea con TukuToon".
   Para agregar un dibujo nuevo, sumá un objeto a esta lista (ver
   plantillas/plantilla-horizontal.html) — no hace falta tocar nada más.

   Es .js (no .json) a propósito: así menu.html funciona tanto
   abriéndolo directo por doble clic (file://) como servido por http,
   sin depender de fetch(), que el navegador bloquea para archivos
   locales.
   ============================================================ */
// ⚠️ TEMPORAL: Aida/Ana/Tuku están repetidas varias veces acá abajo nada
// más para probar cómo se ve y se comporta el carrusel de flechitas con
// más tarjetas (cada copia abre el dibujo real, funcionan igual que las
// originales). Cuando terminemos de probar el layout, borrar las copias
// y dejar solo una entrada por personaje.
const PAGINAS = [
  {
    id: 'aida',
    nombre: 'Aida',
    emoji: '👑',
    miniatura: 'paginas/aida/aida.png',
    url: 'paginas/aida/colorea-tukutoon-aida.html'
  },
  {
    id: 'ana',
    nombre: 'Ana',
    emoji: '🐥',
    miniatura: 'paginas/ana/ana.png',
    url: 'paginas/ana/colorea-tukutoon-ana.html'
  },
  {
    id: 'tuku',
    nombre: 'Tuku',
    emoji: '🖍️',
    miniatura: 'paginas/tuku/tuku.png',
    url: 'paginas/tuku/colorea-tukutoon-tuku.html'
  },
  {
    id: 'aida',
    nombre: 'Aida',
    emoji: '👑',
    miniatura: 'paginas/aida/aida.png',
    url: 'paginas/aida/colorea-tukutoon-aida.html'
  },
  {
    id: 'ana',
    nombre: 'Ana',
    emoji: '🐥',
    miniatura: 'paginas/ana/ana.png',
    url: 'paginas/ana/colorea-tukutoon-ana.html'
  },
  {
    id: 'tuku',
    nombre: 'Tuku',
    emoji: '🖍️',
    miniatura: 'paginas/tuku/tuku.png',
    url: 'paginas/tuku/colorea-tukutoon-tuku.html'
  },
  {
    id: 'aida',
    nombre: 'Aida',
    emoji: '👑',
    miniatura: 'paginas/aida/aida.png',
    url: 'paginas/aida/colorea-tukutoon-aida.html'
  },
  {
    id: 'ana',
    nombre: 'Ana',
    emoji: '🐥',
    miniatura: 'paginas/ana/ana.png',
    url: 'paginas/ana/colorea-tukutoon-ana.html'
  },
  {
    id: 'tuku',
    nombre: 'Tuku',
    emoji: '🖍️',
    miniatura: 'paginas/tuku/tuku.png',
    url: 'paginas/tuku/colorea-tukutoon-tuku.html'
  }
];
