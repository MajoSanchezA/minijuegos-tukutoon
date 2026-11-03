import { removeBackground } from '@imgly/background-removal';

const input = document.querySelector('#image-file');
const dropArea = document.querySelector('#drop-area');
const replaceButton = document.querySelector('#replace-button');
const removeButton = document.querySelector('#remove-button');
const downloadButton = document.querySelector('#download-button');
const previewCanvas = document.querySelector('#preview-canvas');
const previewContext = previewCanvas.getContext('2d', { willReadFrequently: true });
const emptyState = document.querySelector('#empty-state');
const originalTab = document.querySelector('#original-tab');
const resultTab = document.querySelector('#result-tab');
const sourceInfo = document.querySelector('#source-info');
const fileName = document.querySelector('#file-name');
const statusBox = document.querySelector('#status-box');
const progressWrap = document.querySelector('#progress-wrap');
const progressText = document.querySelector('#progress-text');
const progressPercent = document.querySelector('#progress-percent');
const progressBar = document.querySelector('#progress-bar');
const transparentTag = document.querySelector('#transparent-tag');
const previewCaption = document.querySelector('#preview-caption');
const retouchTools = document.querySelector('#retouch-tools');
const brushSize = document.querySelector('#brush-size');

let sourceUrl = null;
let currentFile = null;
let sourcePixels = null;
let maskAlpha = null;
let resultReady = false;
let processing = false;
let currentView = 'result';
let brushMode = 'restore';
let drawing = false;
let lastBrushPoint = null;

function setStatus(message, isError = false) {
  statusBox.hidden = !message;
  statusBox.classList.toggle('error', isError);
  statusBox.querySelector('p').textContent = message;
}

function paintPreview(view = currentView) {
  if (!sourcePixels) return;
  const output = new ImageData(new Uint8ClampedArray(sourcePixels.data), sourcePixels.width, sourcePixels.height);
  if (view === 'result' && resultReady && maskAlpha) {
    for (let i = 0, pixel = 0; i < output.data.length; i += 4, pixel++) {
      output.data[i + 3] = Math.round(output.data[i + 3] * maskAlpha[pixel] / 255);
    }
  }
  previewContext.putImageData(output, 0, 0);
}

function showView(view) {
  currentView = view;
  const canShowResult = view === 'result' && resultReady;
  paintPreview(view);
  previewCanvas.hidden = !sourcePixels;
  emptyState.hidden = Boolean(sourcePixels);
  resultTab.classList.toggle('active', view === 'result');
  originalTab.classList.toggle('active', view === 'original');
  transparentTag.hidden = !canShowResult;
  previewCaption.textContent = canShowResult
    ? 'Fondo eliminado · Puedes retocar el recorte antes de descargar'
    : resultReady ? 'Vista del archivo original' : 'El sujeto se conservará en PNG transparente';
  previewCanvas.classList.toggle('retouching', canShowResult && retouchTools.dataset.enabled === 'true');
}

async function chooseFile(file) {
  if (!file || !['image/png', 'image/jpeg', 'image/webp', 'image/bmp'].includes(file.type)) {
    setStatus('Elige una imagen PNG, JPG o WEBP.', true);
    return;
  }
  if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  currentFile = file;
  sourceUrl = URL.createObjectURL(file);
  maskAlpha = null;
  resultReady = false;
  retouchTools.hidden = true;
  retouchTools.dataset.enabled = 'false';
  fileName.textContent = file.name;
  sourceInfo.hidden = false;
  removeButton.disabled = false;
  downloadButton.disabled = true;
  resultTab.disabled = false;
  setStatus('La primera vez se descargará el modelo de IA. Puede tardar un momento.');

  try {
    const image = await createImageBitmap(file);
    const maxDimension = 6000;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    previewCanvas.width = Math.round(image.width * scale);
    previewCanvas.height = Math.round(image.height * scale);
    previewContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    previewContext.drawImage(image, 0, 0, previewCanvas.width, previewCanvas.height);
    sourcePixels = previewContext.getImageData(0, 0, previewCanvas.width, previewCanvas.height);
    fileName.textContent = `${file.name} · ${previewCanvas.width} × ${previewCanvas.height} px`;
    image.close();
    showView('original');
  } catch (error) {
    sourcePixels = null;
    setStatus('No se pudo abrir esta imagen.', true);
  }
}

async function runRemoval() {
  if (!currentFile || !sourcePixels || processing) return;
  processing = true;
  removeButton.disabled = true;
  downloadButton.disabled = true;
  retouchTools.hidden = true;
  progressWrap.hidden = false;
  progressText.textContent = 'Preparando el modelo de IA…';
  progressPercent.textContent = '';
  progressBar.style.width = '4%';
  setStatus('La imagen se procesa en este dispositivo. En el primer uso se descargan los archivos del modelo.');

  try {
    const resultBlob = await removeBackground(currentFile, {
      // The large ISNet model gives finer masks for small details such as teeth.
      model: 'isnet',
      device: 'gpu',
      progress: (key, current, total) => {
        if (total > 0) {
          const percent = Math.max(2, Math.min(96, Math.round((current / total) * 100)));
          progressBar.style.width = `${percent}%`;
          progressPercent.textContent = `${percent}%`;
          progressText.textContent = key.toLowerCase().includes('fetch') || key.toLowerCase().includes('download')
            ? 'Descargando el modelo…' : 'Detectando y recortando…';
        } else {
          progressText.textContent = 'Detectando y recortando…';
          progressBar.style.width = '65%';
        }
      },
    });

    const resultImage = await createImageBitmap(resultBlob);
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = resultImage.width;
    maskCanvas.height = resultImage.height;
    const maskContext = maskCanvas.getContext('2d', { willReadFrequently: true });
    maskContext.drawImage(resultImage, 0, 0);
    const resultPixels = maskContext.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    maskAlpha = new Uint8ClampedArray(sourcePixels.width * sourcePixels.height);
    for (let y = 0; y < sourcePixels.height; y++) {
      for (let x = 0; x < sourcePixels.width; x++) {
        const sourceIndex = y * sourcePixels.width + x;
        const resultX = Math.min(resultPixels.width - 1, Math.floor(x * resultPixels.width / sourcePixels.width));
        const resultY = Math.min(resultPixels.height - 1, Math.floor(y * resultPixels.height / sourcePixels.height));
        const resultIndex = (resultY * resultPixels.width + resultX) * 4 + 3;
        maskAlpha[sourceIndex] = resultPixels.data[resultIndex];
      }
    }
    resultImage.close();
    resultReady = true;
    retouchTools.hidden = false;
    retouchTools.dataset.enabled = 'true';
    downloadButton.disabled = false;
    progressBar.style.width = '100%';
    progressPercent.textContent = '100%';
    progressText.textContent = '¡Listo!';
    showView('result');
    setStatus('Fondo eliminado. Si falta un detalle, usa Restaurar y pinta sobre esa zona.');
  } catch (error) {
    console.error('No se pudo quitar el fondo:', error);
    const details = error?.message ? ` (${error.message})` : '';
    setStatus(`No se pudo quitar el fondo${details}. Revisa tu conexión e inténtalo de nuevo.`, true);
    progressText.textContent = 'No se pudo completar';
    progressBar.style.width = '0%';
  } finally {
    processing = false;
    removeButton.disabled = false;
  }
}

function canvasPoint(event) {
  const rect = previewCanvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * previewCanvas.width / rect.width,
    y: (event.clientY - rect.top) * previewCanvas.height / rect.height,
  };
}

function applyBrushSegment(from, to) {
  const scale = previewCanvas.width / previewCanvas.getBoundingClientRect().width;
  const radius = Math.max(1, Number(brushSize.value) * scale / 2);
  const dx = to.x - from.x, dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(distance / Math.max(1, radius * 0.35)));
  const maxX = previewCanvas.width - 1, maxY = previewCanvas.height - 1;

  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    const cx = from.x + dx * t, cy = from.y + dy * t;
    const left = Math.max(0, Math.floor(cx - radius));
    const right = Math.min(maxX, Math.ceil(cx + radius));
    const top = Math.max(0, Math.floor(cy - radius));
    const bottom = Math.min(maxY, Math.ceil(cy + radius));
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        const strength = Math.max(0, Math.min(1, (radius - Math.hypot(x - cx, y - cy)) / Math.max(1, radius * 0.22)));
        if (!strength) continue;
        const index = y * previewCanvas.width + x;
        const value = brushMode === 'restore' ? 255 * strength : 255 * (1 - strength);
        maskAlpha[index] = brushMode === 'restore'
          ? Math.max(maskAlpha[index], value)
          : Math.min(maskAlpha[index], value);
      }
    }
  }
}

function setBrushMode(mode) {
  brushMode = mode;
  document.querySelector('#restore-mode').classList.toggle('active', mode === 'restore');
  document.querySelector('#erase-mode').classList.toggle('active', mode === 'erase');
  previewCanvas.classList.toggle('retouching', currentView === 'result' && resultReady);
  setStatus(mode === 'restore'
    ? 'Pinta sobre el diente para recuperarlo de la imagen original.'
    : 'Pinta sobre restos del fondo para hacerlos transparentes.');
}

input.addEventListener('change', (event) => chooseFile(event.target.files[0]));
replaceButton.addEventListener('click', () => input.click());
removeButton.addEventListener('click', runRemoval);
resultTab.addEventListener('click', () => showView('result'));
originalTab.addEventListener('click', () => showView('original'));
document.querySelector('#restore-mode').addEventListener('click', () => setBrushMode('restore'));
document.querySelector('#erase-mode').addEventListener('click', () => setBrushMode('erase'));
brushSize.addEventListener('input', () => { document.querySelector('#brush-size-label').textContent = `${brushSize.value} px`; });

previewCanvas.addEventListener('pointerdown', (event) => {
  if (!resultReady || currentView !== 'result' || retouchTools.hidden) return;
  event.preventDefault();
  drawing = true;
  lastBrushPoint = canvasPoint(event);
  previewCanvas.setPointerCapture(event.pointerId);
  applyBrushSegment(lastBrushPoint, lastBrushPoint);
  paintPreview('result');
});
previewCanvas.addEventListener('pointermove', (event) => {
  if (!drawing || !lastBrushPoint) return;
  const point = canvasPoint(event);
  applyBrushSegment(lastBrushPoint, point);
  lastBrushPoint = point;
  paintPreview('result');
});
previewCanvas.addEventListener('pointerup', () => { drawing = false; lastBrushPoint = null; });
previewCanvas.addEventListener('pointercancel', () => { drawing = false; lastBrushPoint = null; });

for (const name of ['dragenter', 'dragover']) {
  dropArea.addEventListener(name, (event) => { event.preventDefault(); dropArea.classList.add('dragover'); });
}
for (const name of ['dragleave', 'drop']) {
  dropArea.addEventListener(name, (event) => { event.preventDefault(); dropArea.classList.remove('dragover'); });
}
dropArea.addEventListener('drop', (event) => chooseFile(event.dataTransfer.files[0]));
dropArea.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); input.click(); }
});

downloadButton.addEventListener('click', () => {
  if (!maskAlpha || !sourcePixels || !currentFile) return;
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = sourcePixels.width;
  exportCanvas.height = sourcePixels.height;
  const exportContext = exportCanvas.getContext('2d');
  const output = new ImageData(new Uint8ClampedArray(sourcePixels.data), sourcePixels.width, sourcePixels.height);
  for (let i = 0, pixel = 0; i < output.data.length; i += 4, pixel++) {
    output.data[i + 3] = Math.round(output.data[i + 3] * maskAlpha[pixel] / 255);
  }
  exportContext.putImageData(output, 0, 0);
  exportCanvas.toBlob((blob) => {
    if (!blob) { setStatus('No se pudo exportar la imagen.', true); return; }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentFile.name.replace(/\.[^.]+$/, '') || 'imagen'}-sin-fondo.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
});

window.addEventListener('beforeunload', () => {
  if (sourceUrl) URL.revokeObjectURL(sourceUrl);
});
