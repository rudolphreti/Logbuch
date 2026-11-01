import { cp, mkdir, rm } from 'node:fs/promises';
import { pages } from '../templates.js';
await rm('dist', { recursive: true, force: true });
await mkdir('dist');
for (const file of ['index.html', 'styles.css', 'app.js', 'core.js', 'templates.js', ...pages]) await cp(file, `dist/${file}`);
console.log('Gotowe: dist/ (aplikacja statyczna, bez zależności).');
