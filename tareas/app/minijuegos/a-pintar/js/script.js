/* ============================================================
   js/script.js — lógica del menú (NO reusable en otro juego).
   Lee la lista PAGINAS (definida en ../paginas.js) y genera las
   tarjetas del grid en menu.html. Para agregar un dibujo nuevo, no
   toques este archivo: sumá una línea en paginas.js.
   ============================================================ */
(function () {
  const ACCENT_COLORS = ['#FF6F59', '#2EC4B6', '#FFC94A', '#B388EB', '#8BC34A', '#5AA9E6'];

  const grid = document.getElementById('grid');
  const emptyEl = document.getElementById('empty');

  function showMessage(html) {
    emptyEl.innerHTML = html;
    emptyEl.style.display = 'block';
  }

  // Si el chico ya pintó este dibujo y tocó "Listo", motor.js guardó una
  // foto en localStorage con esta misma clave (carpeta del dibujo).
  function savedProgress(id) {
    try {
      return localStorage.getItem('tukutoon:progreso:' + id);
    } catch (e) {
      return null;
    }
  }

  function renderGrid(drawings) {
    if (!Array.isArray(drawings) || drawings.length === 0) {
      showMessage('Todavía no hay dibujos cargados. Agregá uno a <code>paginas.js</code>.');
      return;
    }
    drawings.forEach((d, i) => {
      const color = d.color || ACCENT_COLORS[i % ACCENT_COLORS.length];
      const a = document.createElement('a');
      a.className = 'card';
      a.href = d.url;
      a.style.setProperty('--card-color', color);
      const thumbSrc = savedProgress(d.id) || d.miniatura;
      const thumbInner = thumbSrc
        ? `<img src="${thumbSrc}" alt="Vista previa de ${d.nombre}" loading="lazy">`
        : `<span class="emoji-only">${d.emoji || '🎨'}</span>`;
      a.innerHTML = `
        <span class="card-thumb">
          ${thumbInner}
        </span>
      `;
      grid.appendChild(a);
    });
  }

  if (typeof PAGINAS === 'undefined') {
    showMessage('No se encontró <code>paginas.js</code>. Revisá que esté en esta carpeta y que menu.html lo cargue antes de js/script.js.');
    return;
  }
  renderGrid(PAGINAS);

  // Flechitas: deslizan el carrusel y se esconden solas cuando no hay
  // más para ver hacia ese lado (así el chico no toca una flecha "muerta").
  const arrowLeft = document.getElementById('grid-arrow-left');
  const arrowRight = document.getElementById('grid-arrow-right');
  if (arrowLeft && arrowRight) {
    function updateArrows() {
      const max = grid.scrollWidth - grid.clientWidth;
      arrowLeft.hidden = grid.scrollLeft <= 4;
      arrowRight.hidden = grid.scrollLeft >= max - 4;
    }
    function scrollByCards(dir) {
      const step = (grid.querySelector('.card')?.getBoundingClientRect().width || 190) + 26;
      grid.scrollBy({ left: dir * step * 2, behavior: 'smooth' });
    }
    arrowLeft.addEventListener('click', () => scrollByCards(-1));
    arrowRight.addEventListener('click', () => scrollByCards(1));
    grid.addEventListener('scroll', updateArrows);
    window.addEventListener('resize', updateArrows);
    updateArrows();
  }
})();
