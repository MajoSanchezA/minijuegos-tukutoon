(() => {
  const fileInput = document.querySelector('#image-file');
  const dropZone = document.querySelector('#drop-zone');
  const canvas = document.querySelector('#image-canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const wrap = document.querySelector('#image-wrap');
  const emptyState = document.querySelector('#empty-state');
  const downloadButton = document.querySelector('#download-button');
  const customColor = document.querySelector('#custom-color');
  const intensity = document.querySelector('#intensity');
  const intensityValue = document.querySelector('#intensity-value');
  const meta = document.querySelector('#image-meta');
  const status = document.querySelector('#status-message');
  const checkerLabel = document.querySelector('#checker-label');
  const swatches = [...document.querySelectorAll('.swatch')];
  let sourcePixels = null;
  let sourceName = 'imagen';
  let hue = 214;
  let renderToken = 0;

  const hexToRgb = (hex) => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  });

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const delta = max - min;
    let h = 0;
    const l = (max + min) / 2;
    let s = 0;
    if (delta) {
      s = delta / (1 - Math.abs(2 * l - 1));
      if (max === r) h = ((g - b) / delta) % 6;
      else if (max === g) h = (b - r) / delta + 2;
      else h = (r - g) / delta + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h, s, l };
  }

  function hslToRgb(h, s, l) {
    const chroma = (1 - Math.abs(2 * l - 1)) * s;
    const x = chroma * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - chroma / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) [r, g] = [chroma, x];
    else if (h < 120) [r, g] = [x, chroma];
    else if (h < 180) [g, b] = [chroma, x];
    else if (h < 240) [g, b] = [x, chroma];
    else if (h < 300) [r, b] = [x, chroma];
    else [r, b] = [chroma, x];
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  }

  function applyColor() {
    if (!sourcePixels) return;
    const token = ++renderToken;
    const image = new ImageData(new Uint8ClampedArray(sourcePixels.data), sourcePixels.width, sourcePixels.height);
    const pixels = image.data;
    const target = hexToRgb(customColor.value);
    const targetHsl = rgbToHsl(target.r, target.g, target.b);
    const amount = Number(intensity.value) / 100;
    // Map the whole image into a monochrome color ramp. Luminance carries the
    // original lighting and relief: highlights become pale tints, shadows deep
    // shades, and every original color joins the selected color family.
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] === 0) continue;
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const original = rgbToHsl(r, g, b);
      // Compress the brightest tones so preserved highlights don't wash out
      // the chosen color or make the recolored image feel extra glossy.
      const lightness = 0.08 + 0.75 * Math.pow(luminance, 1.15);
      // Let brighter areas lean gently toward cyan and darker areas toward a
      // deeper blue. This gives the result a small, coherent color palette.
      const paletteHue = (targetHsl.h + (0.48 - luminance) * 42 + 360) % 360;
      const paletteSaturation = Math.min(0.96, targetHsl.s * (0.57 + 0.35 * (1 - luminance)) + original.s * 0.1);
      const [newR, newG, newB] = hslToRgb(paletteHue, paletteSaturation, lightness);
      pixels[i] = r + (newR - r) * amount;
      pixels[i + 1] = g + (newG - g) * amount;
      pixels[i + 2] = b + (newB - b) * amount;
    }
    if (token === renderToken) ctx.putImageData(image, 0, 0);
  }

  function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      status.textContent = 'Elige un archivo de imagen válido.';
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const maxDimension = 3000;
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      sourcePixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
      sourceName = file.name.replace(/\.[^.]+$/, '') || 'imagen';
      emptyState.hidden = true;
      wrap.hidden = false;
      checkerLabel.hidden = false;
      downloadButton.disabled = false;
      meta.textContent = `${canvas.width} × ${canvas.height} px`;
      status.textContent = 'Los cambios aparecen al instante';
      applyColor();
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      status.textContent = 'No se pudo abrir esta imagen. Prueba con otro archivo.';
      URL.revokeObjectURL(url);
    };
    image.src = url;
  }

  fileInput.addEventListener('change', (event) => loadFile(event.target.files[0]));
  dropZone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInput.click(); }
  });
  for (const eventName of ['dragenter', 'dragover']) {
    dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.add('dragover'); });
  }
  for (const eventName of ['dragleave', 'drop']) {
    dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.remove('dragover'); });
  }
  dropZone.addEventListener('drop', (event) => loadFile(event.dataTransfer.files[0]));

  function selectColor(color, selectedHue = null) {
    customColor.value = color;
    if (selectedHue !== null) hue = selectedHue;
    swatches.forEach((swatch) => {
      const swatchHue = Number(swatch.dataset.hue);
      swatch.classList.toggle('active', selectedHue !== null && swatchHue === selectedHue);
    });
    applyColor();
  }
  swatches.forEach((swatch) => swatch.addEventListener('click', () => {
    hue = Number(swatch.dataset.hue);
    selectColor(getComputedStyle(swatch.querySelector('span')).getPropertyValue('--swatch').trim(), hue);
  }));
  customColor.addEventListener('input', () => {
    const rgb = hexToRgb(customColor.value);
    const max = Math.max(rgb.r, rgb.g, rgb.b), min = Math.min(rgb.r, rgb.g, rgb.b);
    const delta = max - min;
    if (delta) {
      if (max === rgb.r) hue = ((rgb.g - rgb.b) / delta + (rgb.g < rgb.b ? 6 : 0)) * 60;
      else if (max === rgb.g) hue = ((rgb.b - rgb.r) / delta + 2) * 60;
      else hue = ((rgb.r - rgb.g) / delta + 4) * 60;
    }
    swatches.forEach((swatch) => swatch.classList.remove('active'));
    applyColor();
  });
  intensity.addEventListener('input', () => {
    intensityValue.value = `${intensity.value}%`;
    intensityValue.textContent = `${intensity.value}%`;
    intensity.style.background = `linear-gradient(90deg,#698fe8 ${intensity.value}%,#e6eaf2 ${intensity.value}%)`;
    applyColor();
  });
  intensity.dispatchEvent(new Event('input'));

  downloadButton.addEventListener('click', () => {
    if (!sourcePixels) return;
    canvas.toBlob((blob) => {
      if (!blob) { status.textContent = 'No se pudo exportar la imagen.'; return; }
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${sourceName}-colorizada.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      status.textContent = '¡Imagen descargada en PNG!';
    }, 'image/png');
  });
})();
