import { removeBackground } from '@imgly/background-removal';

const input = document.querySelector('#image-file');
const dropArea = document.querySelector('#drop-area');
const replaceButton = document.querySelector('#replace-button');
const removeButton = document.querySelector('#remove-button');
const downloadButton = document.querySelector('#download-button');
const previewImage = document.querySelector('#preview-image');
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

let sourceUrl = null;
let resultUrl = null;
let currentFile = null;
let resultReady = false;
let processing = false;
let currentView = 'result';

function setStatus(message, isError = false) {
  statusBox.hidden = !message;
  statusBox.classList.toggle('error', isError);
  statusBox.querySelector('p').textContent = message;
}

function showView(view) {
  currentView = view;
  const canShowResult = view === 'result' && resultReady;
  previewImage.src = canShowResult ? resultUrl : sourceUrl;
  previewImage.alt = canShowResult ? 'Imagen sin fondo' : 'Imagen original';
  previewImage.hidden = !sourceUrl;
  emptyState.hidden = Boolean(sourceUrl);
  resultTab.classList.toggle('active', view === 'result');
  originalTab.classList.toggle('active', view === 'original');
  transparentTag.hidden = !canShowResult;
  previewCaption.textContent = canShowResult
    ? 'Fondo eliminado · Sujeto en PNG transparente'
    : resultReady ? 'Vista del archivo original' : 'El sujeto se conservará en PNG transparente';
}

function chooseFile(file) {
  if (!file || !['image/png', 'image/jpeg', 'image/webp', 'image/bmp'].includes(file.type)) {
    setStatus('Elige una imagen PNG, JPG o WEBP.', true);
    return;
  }
  if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  if (resultUrl) URL.revokeObjectURL(resultUrl);
  currentFile = file;
  sourceUrl = URL.createObjectURL(file);
  resultUrl = null;
  resultReady = false;
  fileName.textContent = file.name;
  sourceInfo.hidden = false;
  removeButton.disabled = false;
  downloadButton.disabled = true;
  resultTab.disabled = false;
  setStatus('La primera vez se descargará el modelo de IA. Puede tardar un momento.');
  showView('original');
}

async function runRemoval() {
  if (!currentFile || processing) return;
  processing = true;
  removeButton.disabled = true;
  downloadButton.disabled = true;
  progressWrap.hidden = false;
  progressText.textContent = 'Preparando el modelo de IA…';
  progressPercent.textContent = '';
  progressBar.style.width = '4%';
  setStatus('La imagen se procesa en este dispositivo. En el primer uso se descargan los archivos del modelo.');

  try {
    const resultBlob = await removeBackground(currentFile, {
      model: 'isnet_quint8',
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
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = URL.createObjectURL(resultBlob);
    resultReady = true;
    showView('result');
    downloadButton.disabled = false;
    progressBar.style.width = '100%';
    progressPercent.textContent = '100%';
    progressText.textContent = '¡Listo!';
    setStatus('Fondo eliminado. Puedes revisar el original o descargar el PNG transparente.');
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

input.addEventListener('change', (event) => chooseFile(event.target.files[0]));
replaceButton.addEventListener('click', () => input.click());
removeButton.addEventListener('click', runRemoval);
resultTab.addEventListener('click', () => showView('result'));
originalTab.addEventListener('click', () => showView('original'));
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
  if (!resultUrl || !currentFile) return;
  const link = document.createElement('a');
  link.href = resultUrl;
  link.download = `${currentFile.name.replace(/\.[^.]+$/, '') || 'imagen'}-sin-fondo.png`;
  link.click();
});

window.addEventListener('beforeunload', () => {
  if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  if (resultUrl) URL.revokeObjectURL(resultUrl);
});
