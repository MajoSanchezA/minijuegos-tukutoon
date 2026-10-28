/* Construye la galería del menú desde paginas.js. */
(function () {
  // Guarda el menú y todos los dibujos para que el juego abra sin conexión
  // después de la primera visita. Los service workers requieren HTTP(S).
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register(new URL('../sw.js', document.currentScript.src))
      .catch(() => {});
  }

  const gallery = document.getElementById('gallery');
  const empty = document.getElementById('empty');

  // El juego comparte estos recursos entre todos los dibujos. Empieza a
  // descargarlos desde el menú para que no aparezcan los iconos de imagen
  // rota ni el fondo morado mientras el navegador los busca al navegar.
  [
    'fondo-dibujo.svg',
    'hoja-dibujo.png',
    'iconos/pincel.png',
    'iconos/borrador.png',
    'iconos/lapiz.png',
    'iconos/balde.png',
    'iconos/especial.png',
    'iconos/descargar.png',
    'iconos/reiniciar.png'
  ].forEach((path) => {
    const preload = new Image();
    preload.src = new URL(path, window.location.href).href;
  });

  function savedProgress(id) {
    try {
      return localStorage.getItem('tukutoon:progreso:' + id);
    } catch (_) {
      return null;
    }
  }

  function savedProgressCenter(id) {
    try {
      const value = localStorage.getItem('tukutoon:progreso-centro:' + id);
      if (value !== null && Number.isFinite(Number(value))) return Number(value);
    } catch (_) {}
    // Progreso antiguo: estos eran los centros verticales antes del ajuste.
    return ({ tuku: 0.36, tico: 0.384 })[id] ?? 0.5;
  }

  function showEmpty(message) {
    empty.textContent = message;
    empty.hidden = false;
  }

  if (typeof PAGINAS === 'undefined' || !Array.isArray(PAGINAS) || PAGINAS.length === 0) {
    showEmpty('Todavía no hay dibujos cargados.');
    return;
  }

  PAGINAS.forEach((drawing) => {
    const card = document.createElement('a');
    card.className = `card card-${drawing.id}`;
    card.href = drawing.url;
    card.setAttribute('aria-label', `Colorear con ${drawing.nombre}`);

    const image = document.createElement('img');
    const progress = savedProgress(drawing.id);
    image.src = progress || drawing.miniatura;
    // Tuku ya tiene el centro visual de la captura alineado con la tarjeta;
    // evitar el desplazamiento antiguo que lo bajaba y lo recortaba.
    if (progress && drawing.id === 'tico') {
      const oldCenter = savedProgressCenter(drawing.id);
      const correction = 11;
      const shift = Math.max(0, Math.min(correction, (0.5 - oldCenter) / (0.5 - 0.384) * correction));
      image.style.setProperty('--preview-shift-y', `${shift}%`);
    }
    image.alt = `Dibujo de ${drawing.nombre} para colorear`;
    image.draggable = false;
    card.appendChild(image);
    gallery.appendChild(card);
  });
})();
