/* Música compartida entre el menú de dibujos y cada página para colorear. */
(() => {
  const scriptUrl = new URL(document.currentScript.src);
  const jsFolder = scriptUrl.pathname.lastIndexOf('/js/');
  const appRoot = jsFolder >= 0
    ? new URL(scriptUrl.pathname.slice(0, jsFolder + 1), scriptUrl.origin).href
    : new URL('./', scriptUrl).href;
  const music = new Audio(new URL('audio/musica-fondo.mp3', appRoot).href);
  music.id = 'tukutoon-background-music';
  music.preload = 'auto';
  music.loop = true;
  music.volume = 0.18;
  music.setAttribute('aria-hidden', 'true');
  music.tabIndex = -1;
  music.style.display = 'none';
  document.body.appendChild(music);

  const positionKey = 'tukutoon:musica-fondo:tiempo';
  let started = false;
  let pending = false;

  try {
    const savedTime = Number(sessionStorage.getItem(positionKey));
    if (Number.isFinite(savedTime) && savedTime > 0) {
      music.addEventListener('loadedmetadata', () => {
        if (music.duration > 0) music.currentTime = savedTime % music.duration;
      }, { once: true });
    }
  } catch (_) {}

  function startMusic() {
    if (document.hidden || started || pending) return;
    pending = true;
    music.play().then(() => {
      started = true;
      pending = false;
    }).catch(() => {
      pending = false;
    });
  }

  function savePosition() {
    try {
      if (Number.isFinite(music.currentTime)) {
        sessionStorage.setItem(positionKey, String(music.currentTime));
      }
    } catch (_) {}
  }

  music.load();
  startMusic();
  window.addEventListener('pointerdown', startMusic, { capture: true });
  window.addEventListener('keydown', startMusic);
  window.addEventListener('pagehide', savePosition);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      savePosition();
      music.pause();
    } else if (started) {
      music.play().catch(() => {});
    }
  });
})();
