import { cp, mkdir, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist');
for (const file of ['index.html', 'styles.css', 'app.js', 'core.js', 'templates.js', '14cea7f1-270b-4b57-9eb0-6372c31789bb.png', '28b87368-8164-4786-9312-609a35903d29.png']) await cp(file, `dist/${file}`);
console.log('Gotowe: dist/ (aplikacja statyczna, bez zależności).');
