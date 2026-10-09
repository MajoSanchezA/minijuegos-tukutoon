const filters = document.querySelectorAll('.filter');
const cards = document.querySelectorAll('.mini-card');
const characterFilters = document.querySelectorAll('.character-filter-button');
let selectedCategory = 'todos';
let selectedCharacter = 'todos';
function updateGallery() {
  cards.forEach((card) => {
    const categoryMatches = selectedCategory === 'todos' || selectedCategory === 'personajes' || card.dataset.category === selectedCategory;
    const characterMatches = selectedCharacter === 'todos' || card.dataset.character === selectedCharacter;
    card.hidden = !(categoryMatches && characterMatches);
  });
}
filters.forEach((button) => button.addEventListener('click', () => {
  filters.forEach((item) => item.classList.toggle('active', item === button));
  filters.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  selectedCategory = button.dataset.filter;
  selectedCharacter = 'todos';
  characterFilters.forEach((item) => {
    const active = item.dataset.characterFilter === 'todos';
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  updateGallery();
}));
characterFilters.forEach((button) => button.addEventListener('click', () => {
  characterFilters.forEach((item) => item.classList.toggle('active', item === button));
  characterFilters.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  selectedCharacter = button.dataset.characterFilter;
  selectedCategory = 'todos';
  filters.forEach((item) => {
    const active = item.dataset.filter === 'todos';
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  updateGallery();
}));

const referenceFilters = document.querySelectorAll('.reference-filter');
const referenceCards = document.querySelectorAll('.reference-card');
const referenceEmpty = document.querySelector('.reference-empty');
function filterReferences(category) {
  referenceFilters.forEach((item) => {
    const active = item.dataset.referenceFilter === category;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  let visibleCount = 0;
  referenceCards.forEach((card) => {
    const visible = card.dataset.referenceCategory === category;
    card.hidden = !visible;
    if (visible) visibleCount += 1;
  });
  referenceEmpty.hidden = visibleCount !== 0;
}
referenceFilters.forEach((button) => button.addEventListener('click', () => {
  filterReferences(button.dataset.referenceFilter);
}));
filterReferences(document.querySelector('.reference-filter.active').dataset.referenceFilter);
function selectReferenceCharacter(character) {
  const characterCheckbox = document.querySelector(`input[name="characters"][value="${character}"]`);
  if (characterCheckbox) characterCheckbox.checked = true;
}
document.querySelectorAll('.reference-submit').forEach((link) => link.addEventListener('click', () => {
  selectReferenceCharacter(link.dataset.referenceCharacter);
}));

const referenceDialog = document.querySelector('#reference-dialog');
const referenceDialogImage = referenceDialog.querySelector('.reference-dialog-image');
const referenceDialogTitle = referenceDialog.querySelector('#reference-dialog-title');
const referenceDialogDownload = referenceDialog.querySelector('.reference-dialog-details .reference-download');
const referenceDialogThumbnails = referenceDialog.querySelector('.reference-dialog-thumbnails');
const referenceItems = Array.from(referenceCards, (card) => ({
  character: card.dataset.referenceCharacter,
  key: card.querySelector('[data-reference-preview]').dataset.referencePreview,
  name: card.querySelector('h3').textContent.trim(),
  image: card.querySelector('.reference-preview img').getAttribute('src'),
  download: card.querySelector('.reference-download').getAttribute('href'),
}));
const referenceVariants = {
  aida: [
    { name: 'Cuerpo completo', image: 'assets/personajes/aida-referencia.png?v=2', download: 'assets/personajes/aida-referencia.png?v=2' },
    { name: 'Retrato', image: 'assets/personajes/aida.png', download: 'assets/personajes/aida.png' },
  ],
};
let activeReferenceIndex = 0;
let activeVariantIndex = 0;
function showReference(index, variantIndex = 0) {
  activeReferenceIndex = index;
  const reference = referenceItems[activeReferenceIndex];
  const variants = referenceVariants[reference.key] || [{ name: reference.name, image: reference.image, download: reference.download }];
  activeVariantIndex = (variantIndex + variants.length) % variants.length;
  const variant = variants[activeVariantIndex];
  referenceDialogImage.src = variant.image;
  referenceDialogImage.alt = variants.length > 1
    ? `Referencia visual: ${reference.name}, ${variant.name.toLowerCase()}`
    : `Referencia visual: ${reference.name}`;
  referenceDialogTitle.textContent = reference.name;
  referenceDialogDownload.href = variant.download;
  referenceDialogDownload.download = variant.download.split('/').pop().split('?')[0];
  const hasVariants = variants.length > 1;
  referenceDialogThumbnails.hidden = !hasVariants;
  referenceDialog.querySelector('.reference-dialog-prev').hidden = !hasVariants;
  referenceDialog.querySelector('.reference-dialog-next').hidden = !hasVariants;
  referenceDialogThumbnails.replaceChildren();
  if (!hasVariants) return;
  variants.forEach((item, buttonIndex) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'reference-dialog-thumbnail';
    button.setAttribute('aria-label', `Ver variante ${item.name.toLowerCase()} de ${reference.name}`);
    button.setAttribute('aria-pressed', String(buttonIndex === activeVariantIndex));
    button.classList.toggle('active', buttonIndex === activeVariantIndex);
    button.innerHTML = `<img src="${item.image}" alt="">`;
    button.addEventListener('click', () => showReference(activeReferenceIndex, buttonIndex));
    referenceDialogThumbnails.append(button);
  });
}
document.querySelectorAll('[data-reference-preview]').forEach((button) => button.addEventListener('click', () => {
  const index = Array.from(referenceCards).findIndex((card) => card === button.closest('.reference-card'));
  if (index < 0) return;
  showReference(index, 0);
  referenceDialog.showModal();
}));
referenceDialog.querySelector('.reference-dialog-close').addEventListener('click', () => referenceDialog.close());
referenceDialog.querySelector('.reference-dialog-prev').addEventListener('click', () => showReference(activeReferenceIndex, activeVariantIndex - 1));
referenceDialog.querySelector('.reference-dialog-next').addEventListener('click', () => showReference(activeReferenceIndex, activeVariantIndex + 1));
referenceDialog.querySelector('.reference-dialog-submit').addEventListener('click', () => {
  selectReferenceCharacter(referenceItems[activeReferenceIndex].character);
  referenceDialog.close();
  window.location.hash = '#subir';
});
referenceDialog.addEventListener('click', (event) => {
  if (event.target === referenceDialog) referenceDialog.close();
});
referenceDialog.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') showReference(activeReferenceIndex - 1);
  if (event.key === 'ArrowRight') showReference(activeReferenceIndex + 1);
});

const fileInput = document.querySelector('#art-file');
const consent = document.querySelector('#adult-consent');
const submit = document.querySelector('.submit-button');
const preview = document.querySelector('#file-preview');
const adultModes = document.querySelectorAll('input[name="adult-mode"]');
const guardianFields = document.querySelector('.guardian-fields');
const adultFields = document.querySelector('.adult-fields');
const guardianName = document.querySelector('#guardian-name');
const guardianEmail = document.querySelector('#adult-email');
const adultEmail = document.querySelector('#adult-email-self');
const consentCopy = document.querySelector('.consent-copy');
function updateAdultMode() {
  const isGuardian = document.querySelector('input[name="adult-mode"]:checked').value === 'guardian';
  guardianFields.hidden = !isGuardian;
  adultFields.hidden = isGuardian;
  guardianName.disabled = !isGuardian;
  guardianName.required = isGuardian;
  guardianEmail.disabled = !isGuardian;
  guardianEmail.required = isGuardian;
  adultEmail.disabled = isGuardian;
  adultEmail.required = !isGuardian;
  consent.required = isGuardian;
  consent.checked = false;
  consent.closest('.verification-consent').hidden = !isGuardian;
  consentCopy.textContent = 'Soy madre, padre o tutor legal del artista, tengo 18 años o más y autorizo este envío.';
  updateForm();
}
function updateForm() {
  const file = fileInput.files[0];
  const tooLarge = file && file.size > 10 * 1024 * 1024;
  const isGuardian = document.querySelector('input[name="adult-mode"]:checked').value === 'guardian';
  const activeAdultFields = isGuardian ? [guardianName, guardianEmail] : [adultEmail];
  const adultDetailsComplete = activeAdultFields.every((field) => field.value.trim() && field.checkValidity());
  const artistDetailsComplete = ['#artist-name', '#artist-country']
    .map((selector) => document.querySelector(selector))
    .every((field) => field.value.trim() && field.checkValidity());
  const permissionComplete = !isGuardian || consent.checked;
  submit.disabled = !(file && permissionComplete && adultDetailsComplete && artistDetailsComplete && !tooLarge);
  if (tooLarge) preview.textContent = 'La foto supera los 10 MB. Elige una imagen más pequeña.';
  else if (file) preview.textContent = `Foto lista: ${file.name}`;
  else preview.textContent = '';
}
fileInput.addEventListener('change', updateForm);
consent.addEventListener('change', updateForm);
adultModes.forEach((mode) => mode.addEventListener('change', updateAdultMode));
document.querySelectorAll('#artist-name, #artist-country, #guardian-name, #adult-email, #adult-email-self')
  .forEach((field) => field.addEventListener('input', updateForm));
document.querySelector('#artist-country').addEventListener('change', updateForm);
document.querySelector('#art-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const isGuardian = document.querySelector('input[name="adult-mode"]:checked').value === 'guardian';
  if (fileInput.files.length && (!isGuardian || consent.checked)) {
    preview.textContent = 'La demostración está lista, pero todavía no envía la foto. La galería se conectará más adelante.';
  }
});
updateAdultMode();
updateForm();
