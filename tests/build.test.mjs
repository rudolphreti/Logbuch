import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pages } from '../templates.js';

test('replacing a template changes every dependent production URL', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'logbuch-build-'));
  try {
    await mkdir(join(dir, 'scripts'));
    for (const file of ['package.json','scripts/build.mjs','index.html','app.js','core.js','templates.js','styles.css',...pages]) {
      await cp(new URL(`../${file}`, import.meta.url), join(dir, file));
    }
    const build = () => execFileSync(process.execPath, ['scripts/build.mjs'], {cwd:dir});
    async function graph() {
      const html = await readFile(join(dir,'dist/index.html'),'utf8');
      const appName = html.match(/src="(app\.[a-f0-9]+\.js)"/)[1];
      const app = await readFile(join(dir,'dist',appName),'utf8');
      const templateName = app.match(/\.\/(templates\.[a-f0-9]+\.js)/)[1];
      const template = await readFile(join(dir,'dist',templateName),'utf8');
      const imageName = template.match(/export const pages = \['([^']+)'/)[1];
      return {appName,templateName,imageName};
    }
    build();const before = await graph();
    assert.notEqual(before.imageName,pages[0]);
    assert.deepEqual(await readFile(join(dir,'dist',before.imageName)),await readFile(join(dir,pages[0])));
    build();assert.deepEqual(await graph(),before,'unchanged input produces stable URLs');
    const updated = Buffer.concat([await readFile(join(dir,pages[0])), Buffer.from('changed fixture')]);
    await writeFile(join(dir,pages[0]),updated);
    build();const after = await graph();
    for (const key of Object.keys(before)) assert.notEqual(after[key],before[key],key);
    assert.deepEqual(await readFile(join(dir,'dist',after.imageName)),updated);
  } finally { await rm(dir,{recursive:true,force:true}); }
});
