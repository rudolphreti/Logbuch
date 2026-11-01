import { emptyProject, validateProject, clamp, placement, scalePhotoZoom, MAX_PHOTO_ZOOM } from './core.js';
import { W, H, pages, frames, fields } from './templates.js';

const $ = id => document.getElementById(id);
const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const cache = new Map();
let state = emptyProject(), selected = null, view = 'spread', preview = false;
let db, saveTimer, saveSequence = 0, toastTimer, busy = false, zoom = 1, initialized = false, recoveryBlocked = false;
let history = [], future = [], interaction = null;
let pngURLs = [];
const clone = value => structuredClone(value);

function toast(message, error = false) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').classList.toggle('error', error);
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, error ? 7000 : 4200);
}
function status(text, error = false) {
  $('save-status').replaceChildren(Object.assign(document.createElement('span'), { className: 'status-dot' }), document.createTextNode(text));
  $('save-status').classList.toggle('error', error);
  $('save-status').title = text;
}
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('logbuch-studio', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('projects');
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Zamknij inną kartę z dziennikiem i odśwież stronę.'));
    request.onsuccess = () => resolve(request.result);
  });
}
function persist() {
  clearTimeout(saveTimer);
  if (!initialized) return;
  if (recoveryBlocked) { status('Błąd odczytu — zaimportuj JSON', true); return; }
  if (!db) { status('Brak zapisu — pobierz kopię JSON', true); return; }
  const sequence = ++saveSequence;
  try {
    const tx = db.transaction('projects', 'readwrite');
    tx.objectStore('projects').put(clone(state), 'active');
    tx.oncomplete = () => { if (sequence === saveSequence) status('Zapisano na urządzeniu'); };
    tx.onerror = () => {
      status('Nie zapisano — pobierz kopię JSON', true);
      toast('Nie udało się zapisać projektu na urządzeniu. Zwolnij miejsce lub pobierz kopię JSON.', true);
    };
    tx.onabort = tx.onerror;
  } catch { status('Brak zapisu — pobierz kopię JSON', true); }
}
function changed(immediate = false) {
  clearPNGDownloads();
  state.updatedAt = new Date().toISOString();
  status('Zapisywanie…');
  clearTimeout(saveTimer);
  if (immediate) persist(); else saveTimer = setTimeout(persist, 250);
  updateHistoryButtons();
}
function remember() { history.push(clone(state)); if (history.length > 24) history.shift(); future = []; }
function updateHistoryButtons() { $('undo-button').disabled = !history.length || busy; $('redo-button').disabled = !future.length || busy; }
function restoreHistory(redo = false) {
  if (busy) return;
  const source = redo ? future : history, target = redo ? history : future;
  if (!source.length) return;
  target.push(clone(state)); state = source.pop();
  syncAll(); changed(true);
}
function imageFor(src) {
  if (!cache.has(src)) {
    const img = new Image();
    const promise = new Promise((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = () => { cache.delete(src); reject(new Error('Nie można odczytać zdjęcia. Użyj JPG, PNG lub WebP.')); };
    });
    img.src = src;
    cache.set(src, { img, promise });
  }
  return cache.get(src).promise;
}
function setBusy(value) {
  busy = value; document.body.classList.toggle('busy', value);
  for (const id of ['upload-button','import-button','replace-photo','download-png','download-json']) $(id).disabled = value;
  $('project-title').disabled = value;
  document.querySelectorAll('.inline-text,.mood-button').forEach(e => e.disabled = value);
  updateOverlays(); updatePhotoToolbar(); updateHistoryButtons();
}
async function processPhoto(file) {
  if (file.size > 30 * 1024 * 1024) throw new Error(`„${file.name}” przekracza limit 30 MB.`);
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error(`„${file.name}”: obsługujemy JPG, PNG i WebP.`);
  const url = URL.createObjectURL(file);
  try {
    const img = await imageFor(url);
    if (!img.naturalWidth || !img.naturalHeight) throw new Error('Zdjęcie ma nieprawidłowy rozmiar.');
    const factor = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * factor); canvas.height = Math.round(img.naturalHeight * factor);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const src = canvas.toDataURL('image/jpeg', .91);
    await imageFor(src);
    return { src, name: file.name.slice(0, 255), zoom: 1, x: 0, y: 0 };
  } finally { URL.revokeObjectURL(url); cache.delete(url); }
}
async function addPhotos(files, replacement = null) {
  if (busy || !files.length) return;
  const slots = replacement === null ? state.photos.map((p,i) => p ? -1 : i).filter(i => i >= 0) : [replacement];
  if (!slots.length) { toast('Wszystkie ramki są pełne. Wybierz zdjęcie i kliknij „Wymień”.'); return; }
  const picked = [...files].slice(0, slots.length);
  setBusy(true);
  let result = [], errors = [];
  try {
    for (const file of picked) {
      try { result.push(await processPhoto(file)); }
      catch (error) { errors.push(error.message); }
    }
    if (result.length) {
      remember(); result.forEach((photo, i) => { state.photos[slots[i]] = photo; });
      selected = slots[0]; syncAll(); changed(true);
      navigator.storage?.persist?.().catch(() => {});
      const extra = files.length > slots.length ? ' Pozostałe pliki pominięto — jest 9 ramek.' : '';
      toast(`Dodano ${result.length} ${result.length === 1 ? 'zdjęcie' : 'zdjęć'}.${extra}`);
    }
    if (errors.length) toast(errors.join(' '), true);
  } catch (error) { toast(error.message, true); }
  finally { setBusy(false); }
}

function textLayout(ctx, text, field) {
  let size = field.size, lines, lineHeight;
  const single = field.h <= 35;
  const width = field.w - 4;
  const wrap = () => {
    ctx.font = `${size}px Georgia, "Times New Roman", serif`;
    if (single) return [text.replace(/[\r\n]+/g, ' ')];
    const result = [];
    for (const paragraph of text.split('\n')) {
      let line = '';
      for (const word of paragraph.split(/\s+/)) {
        if (ctx.measureText((line ? line + ' ' : '') + word).width <= width) line += (line ? ' ' : '') + word;
        else {
          if (line) result.push(line);
          line = '';
          for (const char of word) {
            if (ctx.measureText(line + char).width > width && line) { result.push(line); line = ''; }
            line += char;
          }
        }
      }
      result.push(line);
    }
    return result;
  };
  while (true) {
    lines = wrap();
    lineHeight = field.line ? field.line * size / field.size : size * 1.15;
    if ((lines.length * lineHeight <= field.h && (!single || ctx.measureText(lines[0]).width <= width)) || size <= 8) break;
    size -= .5;
  }
  const metrics = ctx.measureText('Mg');
  const ascent = metrics.fontBoundingBoxAscent ?? size * .9;
  const descent = metrics.fontBoundingBoxDescent ?? size * .2;
  return { lines, size, lineHeight, baseline: (lineHeight - ascent - descent) / 2 + ascent };
}
function drawWrapped(ctx, text, field) {
  if (!text) return;
  ctx.save();
  const layout = textLayout(ctx, text, field);
  ctx.beginPath(); ctx.rect(field.x, field.y, field.w, field.h); ctx.clip();
  ctx.fillStyle = '#173456'; ctx.textBaseline = 'alphabetic';
  layout.lines.forEach((line, i) => ctx.fillText(line, field.x + 2, field.y + layout.baseline + i * layout.lineHeight));
  ctx.restore();
}

function renderPage(ctx, page) {
  ctx.clearRect(0,0,W,H);
  const bg = cache.get(pages[page])?.img;
  if (bg?.complete && bg.naturalWidth) ctx.drawImage(bg,0,0,W,H);
  frames.forEach((frame,i) => {
    const photo = state.photos[i], img = photo && cache.get(photo.src)?.img;
    if (frame.page !== page || !img?.complete || !img.naturalWidth) return;
    const pos = placement(img.naturalWidth, img.naturalHeight, frame, photo);
    ctx.save(); ctx.clip(new Path2D(frame.path));
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    ctx.drawImage(img, pos.x, pos.y, pos.w, pos.h); ctx.restore();
  });
  fields.filter(f => f.page === page).forEach(f => drawWrapped(ctx, state.texts[f.id], f));
  if (page === 0 && state.mood !== null) {
    ctx.save(); ctx.strokeStyle = '#758353'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc([582,670,757,845,933][state.mood],1357,33,0,Math.PI*2); ctx.stroke(); ctx.restore();
  }
}
let renderPending = false;
function render() {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(() => { renderPending = false; for (let p=0;p<2;p++) renderPage($(`page-${p}`).getContext('2d'),p); });
}
function positionElement(element, box) {
  element.style.left = `${box.x/W*100}%`; element.style.top = `${box.y/H*100}%`;
  element.style.width = `${box.w/W*100}%`; element.style.height = `${box.h/H*100}%`;
}
function buildOverlays() {
  for (let p = 0; p < 2; p++) $(`overlays-${p}`).replaceChildren();
  frames.forEach((frame, i) => {
    const el = document.createElement('button');
    el.className = 'frame-overlay'; el.dataset.frame = i;
    el.setAttribute('aria-label', `Zdjęcie ${i + 1}: ${frame.name}`);
    el.title = 'Kliknij, aby dodać zdjęcie. Przeciągnij, aby zmienić kadr.';
    positionElement(el, frame);
    if (frame.shape === 'Koło') el.classList.add('circle');
    el.addEventListener('click', () => {
      if (busy || movedPhoto) { movedPhoto = false; return; }
      selectFrame(i);
      if (!state.photos[i]) choosePhoto(i);
    });
    el.addEventListener('dblclick', () => { if (!busy && state.photos[i]) choosePhoto(i); });
    el.addEventListener('pointerdown', e => startDrag(e, i));
    el.addEventListener('pointermove', moveDrag);
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
    el.addEventListener('wheel', e => {
      if (!state.photos[i] || busy || interaction?.kind === 'drag') return;
      e.preventDefault(); selectFrame(i);
      if (!interaction) { remember(); interaction = { kind: 'wheel' }; }
      state.photos[i].zoom = scalePhotoZoom(state.photos[i].zoom, Math.exp(-e.deltaY * .0015));
      updatePhotoToolbar(); render(); changed();
      clearTimeout(wheelTimer); wheelTimer = setTimeout(() => { interaction = null; }, 300);
    }, { passive: false });
    el.addEventListener('keydown', e => {
      if (!state.photos[i] || busy || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      e.preventDefault(); selectFrame(i); remember();
      const photo = state.photos[i], amount = e.shiftKey ? .15 : .04;
      if (e.key === 'ArrowLeft') photo.x = clamp(photo.x - amount, -1, 1);
      if (e.key === 'ArrowRight') photo.x = clamp(photo.x + amount, -1, 1);
      if (e.key === 'ArrowUp') photo.y = clamp(photo.y - amount, -1, 1);
      if (e.key === 'ArrowDown') photo.y = clamp(photo.y + amount, -1, 1);
      render(); changed();
    });
    el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drop-target'); });
    el.addEventListener('dragleave', () => el.classList.remove('drop-target'));
    el.addEventListener('drop', e => {
      e.preventDefault(); e.stopPropagation(); el.classList.remove('drop-target');
      selected = i; addPhotos(e.dataTransfer.files, i);
    });
    $(`overlays-${frame.page}`).append(el);
  });
  fields.forEach(field => {
    const input = document.createElement('textarea');
    input.id = `text-${field.id}`; input.dataset.field = field.id; input.className = 'inline-text';
    input.setAttribute('aria-label', field.label); input.title = field.label;
    input.maxLength = field.max; input.spellcheck = false;
    input.placeholder = field.id.startsWith('caption') ? 'Dodaj podpis…' : 'Kliknij i pisz…';
    input.value = state.texts[field.id];
    input.rows = 1; input.wrap = field.h <= 35 ? 'off' : 'soft';
    positionElement(input, field);
    let edited = false;
    input.addEventListener('focus', () => {
      edited = false; deselectPhoto();
      if (innerWidth < 700) {
        if (view === 'spread') setView(String(field.page));
        const scale = $(`page-${field.page}`).getBoundingClientRect().width / W;
        if (field.size * scale < 14) { zoom = Math.min(4, zoom * 16 / (field.size * scale)); updateViewZoom(); }
        requestAnimationFrame(() => input.scrollIntoView({ block: 'center', inline: 'center' }));
      }
    });
    input.addEventListener('input', () => {
      if (busy) return;
      if (!edited) { remember(); edited = true; }
      state.texts[field.id] = input.value;
      syncInlineMetrics(); render(); changed();
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape' || (e.key === 'Enter' && (field.h <= 35 || e.ctrlKey || e.metaKey))) { e.preventDefault(); input.blur(); }
    });
    input.addEventListener('beforeinput', e => { if (field.h <= 35 && e.inputType === 'insertLineBreak') e.preventDefault(); });
    input.addEventListener('paste', e => {
      if (field.h > 35) return;
      const text = e.clipboardData.getData('text/plain');
      if (!/[\r\n]/.test(text)) return;
      e.preventDefault();
      const start = input.selectionStart, end = input.selectionEnd;
      const cleaned = text.replace(/[\r\n]+/g, ' ').slice(0, field.max - (input.value.length - end + start));
      input.setRangeText(cleaned, start, end, 'end'); input.dispatchEvent(new Event('input'));
    });
    input.addEventListener('blur', () => { edited = false; input.scrollTop = 0; input.scrollLeft = 0; persist(); });
    $(`overlays-${field.page}`).append(input);
  });
  [582, 670, 757, 845, 933].forEach((x, i) => {
    const el = document.createElement('button'); el.className = 'mood-button'; el.dataset.mood = i;
    el.setAttribute('aria-label', ['Bardzo smutny', 'Smutny', 'Spokojny', 'Wesoły', 'Wspaniały'][i]);
    positionElement(el, { x: x - 30, y: 1327, w: 60, h: 60 });
    el.addEventListener('click', () => { if (busy) return; remember(); state.mood = state.mood === i ? null : i; updateOverlays(); render(); changed(); });
    $('overlays-0').append(el);
  });
  updateOverlays();
}

let wheelTimer, movedPhoto = false, replacementTarget = null;
function choosePhoto(i) { replacementTarget = i; $('replace-input').click(); }
function startDrag(e, i) {
  if (busy || !state.photos[i] || e.button !== 0 || interaction?.kind === 'drag') return;
  document.activeElement?.blur(); selectFrame(i); clearTimeout(wheelTimer); interaction = null;
  movedPhoto = false;
  interaction = { kind: 'drag', i, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, x: state.photos[i].x, y: state.photos[i].y, remembered: false };
  e.currentTarget.setPointerCapture(e.pointerId);
  e.preventDefault();
}
function moveDrag(e) {
  if (interaction?.kind !== 'drag' || interaction.pointerId !== e.pointerId) return;
  const drag = interaction;
  if (!drag.remembered && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 2) return;
  if (!drag.remembered) { remember(); drag.remembered = true; movedPhoto = true; }
  const frame = frames[drag.i], photo = state.photos[drag.i], img = cache.get(photo.src).img;
  const scale = $(`page-${frame.page}`).getBoundingClientRect().width / W;
  const pos = placement(img.naturalWidth, img.naturalHeight, frame, photo);
  const rangeX = Math.abs(pos.w - frame.w) / 2, rangeY = Math.abs(pos.h - frame.h) / 2;
  photo.x = rangeX > .001 ? clamp(drag.x + (e.clientX - drag.startX) / scale / rangeX, -1, 1) : 0;
  photo.y = rangeY > .001 ? clamp(drag.y + (e.clientY - drag.startY) / scale / rangeY, -1, 1) : 0;
  render(); changed();
}
function endDrag(e) {
  if (interaction?.kind === 'drag' && interaction.pointerId === e.pointerId) {
    const edited = interaction.remembered; interaction = null;
    if (edited) changed(true);
  }
}
function updateOverlays() {
  document.querySelectorAll('[data-frame]').forEach(el => {
    const i = Number(el.dataset.frame), filled = !!state.photos[i];
    el.classList.toggle('selected', i === selected);
    el.classList.toggle('filled', filled);
    el.innerHTML = filled ? '' : icon('plus') + '<span>Dodaj zdjęcie</span>';
    el.setAttribute('aria-pressed', String(i === selected)); el.disabled = busy;
  });
  document.querySelectorAll('[data-mood]').forEach(el => el.setAttribute('aria-pressed', String(Number(el.dataset.mood) === state.mood)));
  for (let p = 0; p < 2; p++) $(`overlays-${p}`).classList.toggle('preview', preview);
  syncInlineMetrics();
}
function selectFrame(i) {
  selected = i; zoomEditing = false;
  if (view !== 'spread' && Number(view) !== frames[i].page) setView(String(frames[i].page));
  updateOverlays(); updatePhotoToolbar();
}
function deselectPhoto() { selected = null; updateOverlays(); updatePhotoToolbar(); }
function updatePhotoToolbar() {
  const photo = selected === null ? null : state.photos[selected];
  $('photo-toolbar').hidden = !photo || preview;
  if (!photo) return;
  $('selected-title').textContent = `Zdjęcie ${String(selected + 1).padStart(2, '0')}`;
  $('photo-zoom').value = photo.zoom;
  if (document.activeElement !== $('photo-scale')) {
    $('photo-scale').value = Number((photo.zoom * 100).toPrecision(12));
    $('photo-scale').removeAttribute('aria-invalid');
  }
  for (const id of ['photo-zoom', 'photo-scale', 'reset-crop', 'remove-photo', 'photo-minus', 'photo-plus']) $(id).disabled = busy;
  positionPhotoToolbar();
}
function positionPhotoToolbar() {
  const toolbar = $('photo-toolbar');
  if (selected === null || !state.photos[selected] || preview) { toolbar.hidden = true; return; }
  const el = document.querySelector(`[data-frame="${selected}"]`), rect = el.getBoundingClientRect();
  const topEdge = document.querySelector('.workspace-toolbar').getBoundingClientRect().bottom;
  const visible = rect.bottom > topEdge && rect.top < innerHeight - 42 && rect.right > 0 && rect.left < innerWidth;
  toolbar.hidden = !visible;
  if (!visible || innerWidth <= 700) return;
  const width = toolbar.offsetWidth, height = toolbar.offsetHeight;
  toolbar.style.left = `${clamp(rect.left + rect.width / 2 - width / 2, 12, innerWidth - width - 12)}px`;
  const below = rect.bottom + 12;
  const top = below + height < innerHeight - 48 ? below : rect.top - height - 12;
  toolbar.style.top = `${clamp(top, topEdge + 8, innerHeight - height - 48)}px`;
}
const measure = document.createElement('canvas').getContext('2d');
function syncInlineMetrics() {
  for (const field of fields) {
    const input = $(`text-${field.id}`);
    if (!input) continue;
    const scale = $(`page-${field.page}`).getBoundingClientRect().width / W;
    if (!scale) continue;
    const layout = textLayout(measure, state.texts[field.id], field);
    input.style.fontSize = `${layout.size * scale}px`;
    input.style.lineHeight = `${layout.lineHeight * scale}px`;
    input.style.paddingLeft = `${2 * scale}px`;
    input.style.paddingRight = `${2 * scale}px`;
  }
}
function setView(value) {
  view = value;
  document.querySelectorAll('[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  $('spread').classList.toggle('single', view !== 'spread');
  document.querySelectorAll('.page-wrap').forEach(el => el.hidden = view !== 'spread' && el.dataset.page !== view);
  zoom = 1; updateViewZoom();
}
function updateViewZoom() {
  $('spread').style.width = `${zoom * 100}%`;
  $('spread').style.maxWidth = zoom === 1 ? (view === 'spread' ? '1260px' : '900px') : 'none';
  $('fit-button').textContent = zoom === 1 ? 'Dopasuj' : `${Math.round(zoom * 100)}%`;
  requestAnimationFrame(() => { syncInlineMetrics(); positionPhotoToolbar(); });
}
function syncAll() {
  $('project-title').value = state.title;
  $('photo-count').textContent = `${state.photos.filter(Boolean).length} / 9`;
  for (const field of fields) $(`text-${field.id}`).value = state.texts[field.id];
  updateOverlays(); updatePhotoToolbar(); render(); updateHistoryButtons();
}

function download(blob,name){const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(link.href),10000);}
function filename(){return(state.title.trim()||'piracki-dziennik').replace(/[^\p{L}\p{N}_-]+/gu,'-').slice(0,80);}
function clearPNGDownloads() {
  pngURLs.forEach(url => URL.revokeObjectURL(url)); pngURLs = [];
  $('png-downloads').hidden = true; $('png-download-links').replaceChildren();
}
async function exportPNG(){
  if(busy)return;setBusy(true);
  try{
    await Promise.all([...pages,...state.photos.filter(Boolean).map(p=>p.src)].map(imageFor));
    const blobs = await Promise.all(pages.map(async (_, page) => {
      const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
      renderPage(canvas.getContext('2d'), page);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error(`Nie udało się przygotować PNG strony ${page + 1}.`);
      return blob;
    }));
    clearPNGDownloads();
    blobs.forEach((blob, page) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob); pngURLs.push(link.href);
      link.download = `${filename()}-strona-${page + 1}.png`;
      link.className = 'button button-light'; link.textContent = `Pobierz stronę ${page + 1}`;
      $('png-download-links').append(link);
    });
    $('png-downloads').hidden = false;
    // Keep individual links available if the browser limits automatic downloads.
    [...$('png-download-links').children].forEach(link => link.click());
    toast('Przygotowano dwa osobne pliki PNG — po jednym na każdą stronę.');
  }catch(error){toast(error.message,true);}finally{setBusy(false);}
}
async function importJSON(file){
  if(!file||busy)return;
  if(file.size>120*1024*1024){toast('Plik JSON przekracza limit 120 MB.',true);return;}
  setBusy(true);
  try{
    const project=validateProject(JSON.parse(await file.text()));
    await Promise.all(project.photos.filter(Boolean).map(p=>imageFor(p.src)));
    remember();state=project;recoveryBlocked=false;syncAll();changed(true);toast('Projekt wczytany. Możesz kontynuować swoją historię.');
  }catch(error){toast(error instanceof SyntaxError?'Nieprawidłowy plik JSON. Wybierz plik wyeksportowany z Logbuch.':error.message,true);}
  finally{setBusy(false);}
}

$('upload-button').addEventListener('click',()=>$('photos-input').click());
$('photos-input').addEventListener('change',async e=>{await addPhotos(e.target.files);e.target.value='';});
$('replace-photo').addEventListener('click',()=>{if(selected!==null)choosePhoto(selected);});
$('replace-input').addEventListener('change',async e=>{const target=replacementTarget ?? selected;if(target!==null)await addPhotos(e.target.files,target);replacementTarget=null;e.target.value='';});
$('import-button').addEventListener('click',()=>$('json-input').click());
$('json-input').addEventListener('change',async e=>{await importJSON(e.target.files[0]);e.target.value='';});
$('remove-photo').addEventListener('click',()=>{if(busy||!state.photos[selected])return;remember();state.photos[selected]=null;syncAll();changed(true);toast('Zdjęcie usunięte. Możesz cofnąć tę zmianę.');});
$('reset-crop').addEventListener('click',()=>{if(busy||!state.photos[selected])return;remember();Object.assign(state.photos[selected],{zoom:1,x:0,y:0});updatePhotoToolbar();render();changed(true);});
let zoomEditing=false;
$('photo-zoom').addEventListener('input',e=>{if(busy||!state.photos[selected])return;if(!zoomEditing){remember();zoomEditing=true;}state.photos[selected].zoom=Number(e.target.value);updatePhotoToolbar();render();changed();});
$('photo-zoom').addEventListener('change',()=>{zoomEditing=false;persist();});
$('photo-zoom').addEventListener('blur',()=>{zoomEditing=false;});
$('photo-scale').addEventListener('input', e => {
  if (busy || selected === null || !state.photos[selected]) return;
  const value = Number(e.target.value), photoZoom = value / 100;
  if (!e.target.value || !Number.isFinite(photoZoom) || photoZoom <= 0 || photoZoom > MAX_PHOTO_ZOOM) {
    e.target.setAttribute('aria-invalid', 'true'); return;
  }
  e.target.removeAttribute('aria-invalid');
  if (!zoomEditing) { remember(); zoomEditing = true; }
  state.photos[selected].zoom = photoZoom; updatePhotoToolbar(); render(); changed();
});
$('photo-scale').addEventListener('blur', () => { zoomEditing = false; updatePhotoToolbar(); persist(); });
$('photo-scale').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
let titleEditing=false;
$('project-title').addEventListener('input',e=>{if(!titleEditing){remember();titleEditing=true;}state.title=e.target.value;changed();});
$('project-title').addEventListener('blur',()=>{titleEditing=false;persist();});
$('undo-button').addEventListener('click',()=>restoreHistory());$('redo-button').addEventListener('click',()=>restoreHistory(true));
document.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>setView(el.dataset.view)));
$('preview-button').addEventListener('click',()=>{preview=!preview;$('preview-button').setAttribute('aria-pressed',String(preview));updateOverlays();updatePhotoToolbar();});
$('zoom-in').addEventListener('click',()=>{zoom=clamp(zoom+.25,.5,4);updateViewZoom();});
$('zoom-out').addEventListener('click',()=>{zoom=clamp(zoom-.25,.5,4);updateViewZoom();});
$('fit-button').addEventListener('click',()=>{zoom=1;updateViewZoom();});
$('export-button').addEventListener('click',()=>$('export-dialog').showModal());
$('help-button').addEventListener('click',()=>$('help-dialog').showModal());
document.querySelectorAll('.close-dialog').forEach(el=>el.addEventListener('click',()=>el.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(el=>el.addEventListener('click',e=>{if(e.target===el){const r=el.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)el.close();}}));
$('download-png').addEventListener('click',exportPNG);
$('download-json').addEventListener('click',()=>{persist();download(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),`${filename()}.json`);$('export-dialog').close();toast('Zapisano projekt JSON razem ze zdjęciami, kadrami i tekstami.');});
const dropZone=$('upload-button');
dropZone.addEventListener('dragover',e=>{e.preventDefault();dropZone.classList.add('dragging');});
dropZone.addEventListener('dragleave',()=>dropZone.classList.remove('dragging'));
dropZone.addEventListener('drop',e=>{e.preventDefault();dropZone.classList.remove('dragging');addPhotos(e.dataTransfer.files);});
document.addEventListener('dragover',e=>{if([...e.dataTransfer.types].includes('Files'))e.preventDefault();});
document.addEventListener('drop',e=>{if([...e.dataTransfer.types].includes('Files'))e.preventDefault();});
$('close-photo-tools').addEventListener('click',deselectPhoto);
function changePhotoZoom(factor) {
  if(busy || selected===null || !state.photos[selected])return;
  remember();state.photos[selected].zoom=scalePhotoZoom(state.photos[selected].zoom,factor);
  updatePhotoToolbar();render();changed();
}
$('photo-minus').addEventListener('click',()=>changePhotoZoom(1/1.1));
$('photo-plus').addEventListener('click',()=>changePhotoZoom(1.1));
document.addEventListener('pointerdown',e=>{
  if(selected!==null&&!e.target.closest('.frame-overlay,.photo-toolbar,#replace-input'))deselectPhoto();
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!e.target.closest('dialog'))deselectPhoto();
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!['INPUT','TEXTAREA'].includes(e.target.tagName)){
    e.preventDefault();restoreHistory(e.shiftKey);
  }
});
window.addEventListener('scroll',positionPhotoToolbar,true);
window.addEventListener('resize',()=>{syncInlineMetrics();positionPhotoToolbar();});
const pageObserver=new ResizeObserver(()=>{syncInlineMetrics();positionPhotoToolbar();});
document.querySelectorAll('.page-surface').forEach(el=>pageObserver.observe(el));
document.addEventListener('visibilitychange',()=>{if(document.hidden)persist();});
window.addEventListener('pagehide',persist);

async function init(){
  setBusy(true);
  status('Wczytywanie projektu…');
  buildOverlays();syncAll();
  if(innerWidth<700)setView('0');
  try{
    db=await openDatabase();
    const saved=await new Promise((resolve,reject)=>{const request=db.transaction('projects').objectStore('projects').get('active');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    if(saved){
      try{const project=validateProject(saved);await Promise.all(project.photos.filter(Boolean).map(p=>imageFor(p.src)));state=project;syncAll();}
      catch{toast('Nie udało się odczytać zapisanego projektu. Zaimportuj kopię JSON. Nie nadpisujemy zapisu.',true);recoveryBlocked=true;status('Błąd odczytu — zaimportuj JSON',true);}
    }
    if(db&&!recoveryBlocked)status('Zapisano na urządzeniu');
  }catch{status('Brak zapisu — pobierz kopię JSON',true);toast('Ta przeglądarka blokuje zapis lokalny. Korzystaj z eksportu JSON, aby zachować projekt.',true);}
  try{await Promise.all(pages.map(imageFor));render();}
  catch{toast('Nie udało się wczytać szablonu. Odśwież stronę.',true);}
  initialized=true;setBusy(false);
}
init();
