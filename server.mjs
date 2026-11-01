import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve(process.env.SERVE_DIST === '1' ? 'dist' : '.');
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const port = Number(process.env.PORT || (portIndex >= 0 ? args[portIndex + 1] : 3000));
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.json':'application/json; charset=utf-8' };
http.createServer(async (req, res) => {
  try {
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    const relative = path.slice(root.length).split(sep).filter(Boolean);
    if (relative.some(p => p.startsWith('.')) || ['server.mjs', 'package.json'].includes(relative[0])) { res.writeHead(404).end(); return; }
    const file = (await stat(path)).isDirectory() ? resolve(path, 'index.html') : path;
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch { res.writeHead(404).end('Nie znaleziono pliku'); }
}).listen(port, '0.0.0.0', () => console.log(`Logbuch Studio: http://localhost:${port}`));
