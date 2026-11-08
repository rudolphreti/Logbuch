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

test('free movement works at cover size and beyond the former crop limits', async () => {
  const {transformPhoto} = await import('../core.js');
  const box = {x:10,y:20,w:300,h:200};
  const original = {src:'data:image/png;base64,YQ==',name:'photo',zoom:1,x:0,y:0};
  const moved = transformPhoto(900,600,box,original,1,{x:0,y:0},{x:700,y:-500});
  const pos = placement(900,600,box,moved);
  assert.equal(pos.x,710); assert.equal(pos.y,-480);
  const p=emptyProject();p.photos[0]=moved;
  assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))).photos[0],moved);
  for(const value of [NaN,Infinity,'100']) {
    p.photos[0]={...moved,offsetX:value};assert.throws(()=>validateProject(p));
  }
});
test('pinch preserves the image point under the moving midpoint', async () => {
  const {transformPhoto} = await import('../core.js');
  const box={x:0,y:0,w:300,h:200}, photo={zoom:1,x:.4,y:-.3};
  const before=placement(1600,900,box,photo);
  const from={x:80,y:70},to={x:120,y:95};
  const updated=transformPhoto(1600,900,box,photo,2,from,to);
  const after=placement(1600,900,box,updated);
  assert.ok(Math.abs((from.x-before.x)/before.w-(to.x-after.x)/after.w)<1e-12);
  assert.ok(Math.abs((from.y-before.y)/before.h-(to.y-after.y)/after.h)<1e-12);
});
test('wheel zoom is gentle and normalizes pixel, line and page deltas', async () => {
  const {wheelZoomFactor} = await import('../core.js');
  assert.ok(wheelZoomFactor(120)>.95);
  assert.equal(wheelZoomFactor(16),wheelZoomFactor(1,1));
  assert.equal(wheelZoomFactor(800),wheelZoomFactor(1,2));
  assert.ok(Math.abs(wheelZoomFactor(120)*wheelZoomFactor(-120)-1)<1e-12);
});


test('rotation, scale and translation keep the same image point under the gesture', async () => {
  const {transformPhoto} = await import('../core.js');
  const box={x:20,y:30,w:300,h:200},photo={zoom:1.3,x:.2,y:-.3,rotation:25};
  const from={x:80,y:60},to={x:110,y:95};
  const before=placement(900,600,box,photo);
  const result=transformPhoto(900,600,box,photo,1.7,from,to,70);
  const after=placement(900,600,box,result);
  const point=(pos,anchor,angle)=>{
    const dx=anchor.x-pos.x-pos.w/2,dy=anchor.y-pos.y-pos.h/2,r=-angle*Math.PI/180;
    return [(dx*Math.cos(r)-dy*Math.sin(r))/pos.w,(dx*Math.sin(r)+dy*Math.cos(r))/pos.h];
  };
  const a=point(before,from,25),b=point(after,to,95);
  assert.ok(a.every((v,i)=>Math.abs(v-b[i])<1e-12));
  const project=emptyProject();project.photos[0]={...result,src:'data:image/png;base64,YQ==',name:'rotated'};
  assert.equal(validateProject(JSON.parse(JSON.stringify(project))).photos[0].rotation,95);
  project.photos[0].rotation=Infinity;assert.throws(()=>validateProject(project));
});
