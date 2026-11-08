import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { extname } from 'node:path';
import { pages } from '../templates.js';
await rm('dist', { recursive: true, force: true });
await mkdir('dist');
const files = ['index.html', 'styles.css', 'app.js', 'core.js', 'templates.js', ...pages];
// Keep existing asset URLs available for direct links. The application itself
// uses content-addressed filenames, including the complete module dependency chain.
for (const file of files) await cp(file, `dist/${file}`);
const names = new Map();
async function versioned(file, content) {
  const hash = createHash('sha256').update(content).digest('hex').slice(0, 16);
  const extension = extname(file);
  const name = `${file.slice(0, -extension.length)}.${hash}${extension}`;
  names.set(file, name);
  await writeFile(`dist/${name}`, content);
}
for (const file of [...pages, 'styles.css', 'core.js']) await versioned(file, await readFile(file));
let templates = await readFile('templates.js', 'utf8');
for (const file of pages) templates = templates.replaceAll(file, names.get(file));
await versioned('templates.js', templates);
let app = await readFile('app.js', 'utf8');
for (const file of ['core.js', 'templates.js']) app = app.replaceAll(`'./${file}'`, `'./${names.get(file)}'`);
await versioned('app.js', app);
let html = await readFile('index.html', 'utf8');
for (const file of ['styles.css', 'app.js']) html = html.replaceAll(`"${file}"`, `"${names.get(file)}"`);
await writeFile('dist/index.html', html);
console.log('Fertig: dist/ (statische Anwendung mit versionierten Dateien).');
