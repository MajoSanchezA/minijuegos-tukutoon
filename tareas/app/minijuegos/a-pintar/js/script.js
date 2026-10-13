/* Construye la galería del menú desde paginas.js. */
(function () {
  const gallery = document.getElementById('gallery');
  const empty = document.getElementById('empty');

  function savedProgress(id) {
    try {
      return localStorage.getItem('tukutoon:progreso:' + id);
    } catch (_) {
      return null;
    }
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
    card.className = 'card';
    card.href = drawing.url;
    card.setAttribute('aria-label', `Colorear con ${drawing.nombre}`);

    const image = document.createElement('img');
    image.src = savedProgress(drawing.id) || drawing.miniatura;
    image.alt = `Dibujo de ${drawing.nombre} para colorear`;
    image.draggable = false;
    card.appendChild(image);
    gallery.appendChild(card);
  });
})();
