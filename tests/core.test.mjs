import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyProject, validateProject, placement, scalePhotoZoom } from '../core.js';
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
test('smaller photos can move naturally across the white space inside a frame', () => {
  for (const frame of frames) {
    const left = placement(900,600,frame,{zoom:.01,x:-1,y:-1});
    const center = placement(900,600,frame,{zoom:.01,x:0,y:0});
    const right = placement(900,600,frame,{zoom:.01,x:1,y:1});
    assert.ok(Math.abs(left.x-frame.x)<1e-9);
    assert.ok(Math.abs(left.y-frame.y)<1e-9);
    assert.ok(Math.abs(right.x+right.w-frame.x-frame.w)<1e-9);
    assert.ok(Math.abs(right.y+right.h-frame.y-frame.h)<1e-9);
    assert.ok(left.x<center.x && center.x<right.x);
    assert.ok(left.y<center.y && center.y<right.y);
  }
});
test('zoom can shrink repeatedly without an arbitrary lower limit, including JSON round trips', () => {
  let zoom=1;
  for(let i=0;i<500;i++) zoom=scalePhotoZoom(zoom,1/1.1);
  assert.ok(zoom>0 && zoom<1e-20);
  const project=emptyProject();
  project.photos[0]={src:'data:image/png;base64,YQ==',name:'tiny.png',zoom,x:.2,y:-.3};
  assert.equal(validateProject(JSON.parse(JSON.stringify(project))).photos[0].zoom,zoom);
  assert.equal(scalePhotoZoom(2,1.1),2.2);
  assert.equal(scalePhotoZoom(6,1.1),6);
  assert.ok(scalePhotoZoom(Number.MIN_VALUE,.1)>0);
});
test('zero, negative and nonfinite scales are rejected while old crops stay compatible', () => {
  const project=emptyProject();
  project.photos[0]={src:'data:image/png;base64,YQ==',name:'photo.png',zoom:1,x:-.4,y:.5};
  assert.deepEqual(validateProject(project).photos,project.photos);
  for(const zoom of [0,-.1,Infinity,NaN,6.1]){
    project.photos[0].zoom=zoom;assert.throws(()=>validateProject(project));
  }
});
test('malformed projects and remote image references are rejected', () => {
  for(const modify of [p=>p.version=2,p=>p.photos=[],p=>p.photos[0]={src:'https://example.com/a.png',name:'x',zoom:1,x:0,y:0},p=>p.photos[0]={src:'data:image/png;base64,YQ==',name:'x',zoom:Infinity,x:0,y:0},p=>p.texts.story='a'.repeat(401),p=>p.mood=8]){const p=emptyProject();modify(p);assert.throws(()=>validateProject(p));}
});
