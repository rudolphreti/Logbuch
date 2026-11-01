import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyProject, validateProject, placement } from '../core.js';
import { frames, fields } from '../templates.js';

test('the supplied two-page template contains exactly nine photo frames', () => {
  assert.equal(frames.length, 9);
  assert.equal(frames.filter(f => f.page === 0).length, 1);
  assert.equal(frames.filter(f => f.page === 1).length, 8);
  const project = emptyProject();
  for (const field of fields) assert.equal(project.texts[field.id], '');
  assert.deepEqual(validateProject(project).photos, Array(9).fill(null));
});
test('cover and zoom never leave gaps, even at extreme pan positions', () => {
  for (const [w,h] of [[4000,200],[100,4000],[1000,1000]]) for (const frame of frames) for (const zoom of [1,2,6]) for (const x of [-1,0,1]) for (const y of [-1,0,1]) {
    const pos = placement(w,h,frame,{zoom,x,y});
    assert.ok(pos.x <= frame.x+.00001);
    assert.ok(pos.y <= frame.y+.00001);
    assert.ok(pos.x+pos.w >= frame.x+frame.w-.00001);
    assert.ok(pos.y+pos.h >= frame.y+frame.h-.00001);
  }
});
test('portable JSON retains photo data, crop, text and mood', () => {
  const p=emptyProject();p.photos[8]={src:'data:image/png;base64,aGVsbG8=',name:'żagle.png',zoom:2.2,x:-.5,y:.7};p.texts.story='Nasz weekend ⚓';p.mood=4;
  const imported=validateProject(JSON.parse(JSON.stringify(p)));
  assert.deepEqual(imported.photos,p.photos);assert.deepEqual(imported.texts,p.texts);assert.equal(imported.mood,4);
});
test('malformed projects and remote image references are rejected', () => {
  for(const modify of [p=>p.version=2,p=>p.photos=[],p=>p.photos[0]={src:'https://example.com/a.png',name:'x',zoom:1,x:0,y:0},p=>p.photos[0]={src:'data:image/png;base64,YQ==',name:'x',zoom:Infinity,x:0,y:0},p=>p.texts.story='a'.repeat(401),p=>p.mood=8]){const p=emptyProject();modify(p);assert.throws(()=>validateProject(p));}
});
