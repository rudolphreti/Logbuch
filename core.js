export const VERSION = 1;
export const TEMPLATE = 'pirate-logbook-v1';
export const TEXT_IDS = ['host', 'from', 'to', 'companion', 'friday', 'saturday', 'sunday', 'treasure', 'caption1', 'caption2', 'caption3', 'caption4', 'caption5', 'caption6', 'caption7', 'caption8', 'story'];
export function emptyProject() {
  return { version: VERSION, template: TEMPLATE, title: 'Nasza wielka przygoda', photos: Array(9).fill(null), texts: Object.fromEntries(TEXT_IDS.map(id => [id, ''])), mood: null, updatedAt: new Date().toISOString() };
}
export const clamp = (v, low, high) => Math.min(high, Math.max(low, v));
export const MAX_PHOTO_ZOOM = 6;
// Multiplicative steps keep shrinking below any UI slider threshold.
export const scalePhotoZoom = (zoom, factor) => clamp(zoom * factor, Number.MIN_VALUE, MAX_PHOTO_ZOOM);
export function placement(imageWidth, imageHeight, box, photo) {
  const scale = Math.max(box.w / imageWidth, box.h / imageHeight) * photo.zoom;
  const w = imageWidth * scale, h = imageHeight * scale;
  return { x: box.x + (box.w - w) / 2 + (photo.offsetX ?? photo.x * Math.abs(w - box.w) / 2), y: box.y + (box.h - h) / 2 + (photo.offsetY ?? photo.y * Math.abs(h - box.h) / 2), w, h };
}
// Anchor coordinates are in page canvas pixels; legacy x/y remain readable.
export function transformPhoto(imageWidth, imageHeight, box, photo, factor, from, to = from) {
  const before = placement(imageWidth, imageHeight, box, photo);
  const zoom = scalePhotoZoom(photo.zoom, factor), ratio = zoom / photo.zoom;
  const w = before.w * ratio, h = before.h * ratio;
  return { ...photo, zoom, x: 0, y: 0,
    offsetX: to.x - (from.x - before.x) * ratio - box.x - (box.w - w) / 2,
    offsetY: to.y - (from.y - before.y) * ratio - box.y - (box.h - h) / 2 };
}
export function wheelZoomFactor(delta, mode = 0) {
  const pixels = delta * (mode === 1 ? 16 : mode === 2 ? 800 : 1);
  return Math.exp(-clamp(pixels, -120, 120) * .0004);
}
export function validateProject(input) {
  if (!input || input.version !== VERSION || input.template !== TEMPLATE || !Array.isArray(input.photos) || input.photos.length !== 9) throw new Error('To nie jest plik projektu Logbuch w obsługiwanej wersji.');
  const result = emptyProject();
  if (typeof input.title !== 'string' || input.title.length > 80) throw new Error('Nieprawidłowa nazwa projektu.');
  result.title = input.title;
  result.photos = input.photos.map(photo => {
    if (photo === null) return null;
    if (!photo || typeof photo.src !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(photo.src) || photo.src.length > 20_000_000 || typeof photo.name !== 'string' || photo.name.length > 255) throw new Error('Projekt zawiera nieprawidłowe zdjęcie.');
    if (![photo.zoom, photo.x, photo.y].every(Number.isFinite) || photo.zoom <= 0 || photo.zoom > MAX_PHOTO_ZOOM || Math.abs(photo.x) > 1 || Math.abs(photo.y) > 1) throw new Error('Nieprawidłowe ustawienia kadru.');
    const offsets = {};
    for (const key of ['offsetX', 'offsetY']) {
      if (photo[key] !== undefined) {
        if (!Number.isFinite(photo[key])) throw new Error('Nieprawidłowe przesunięcie zdjęcia.');
        offsets[key] = photo[key];
      }
    }
    return { src: photo.src, name: photo.name, zoom: photo.zoom, x: photo.x, y: photo.y, ...offsets };
  });
  if (!input.texts || typeof input.texts !== 'object') throw new Error('Brak pól tekstowych projektu.');
  for (const id of TEXT_IDS) {
    const text = input.texts[id] ?? '';
    const max = ['friday','saturday','sunday','story'].includes(id) ? 400 : id === 'treasure' ? 200 : 80;
    if (typeof text !== 'string' || text.length > max) throw new Error('Nieprawidłowa lub zbyt długa treść pola tekstowego.');
    result.texts[id] = text;
  }
  if (input.mood !== null && input.mood !== undefined && (!Number.isInteger(input.mood) || input.mood < 0 || input.mood > 4)) throw new Error('Nieprawidłowy nastrój.');
  result.mood = input.mood ?? null;
  return result;
}
