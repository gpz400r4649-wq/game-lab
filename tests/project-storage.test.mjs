import test from 'node:test';
import assert from 'node:assert/strict';
import {stringifyStoredProject,parseStoredProject} from '../project-storage3d.js';
import {MAX_PARTS,MAX_PROJECT_BYTES} from '../limits3d.js';
import {fresh3D,validate3D,create3D,step3D} from '../engine3d.js';
import {constructionPart} from '../building3d.js';
import {createEditHistory} from '../history3d.js';
import {nearbyObjects} from '../spatial3d.js';
function school(){const p=fresh3D();p.worldSize=480;p.spawn={x:-200,y:0,z:-200};p.objects=Array.from({length:MAX_PARTS},(_,i)=>constructionPart(i%2?'wall':'floor',i%80*4-160,Math.floor(i/80)%50*4-100,Math.floor(i/4000)*3));return p;}
test('8000パーツの作品を小さく保存して、全てのパーツと設定を復元する',()=>{
 const p=school(),normal=JSON.stringify(p),before=normal,stored=stringifyStoredProject(p);assert.equal(MAX_PARTS,8000);assert.ok(stored.length<normal.length*.35);assert.ok(stored.length*2<2*1024*1024);assert.equal(JSON.stringify(p),before);const loaded=parseStoredProject(stored);assert.deepEqual(loaded,p);assert.equal(validate3D(loaded).objects.length,8000);loaded.objects[0].settings.value=20;assert.notEqual(loaded.objects[1].settings.value,20);
});
test('以前の通常JSONも読め、小さい作品は以前と同じ形で保存する',()=>{
 const p=fresh3D();p.title='学校のつづき';p.objects=[constructionPart('wall')];const normal=JSON.stringify(p);assert.deepEqual(parseStoredProject(normal),p);assert.equal(stringifyStoredProject(p),normal);assert.deepEqual(validate3D(parseStoredProject(normal)),p);
});
test('イベント・個別の設定・半パーツなどの異なる値をまとめて消さない',()=>{
 const p=school();Object.assign(p.objects[0],{wallHalf:'halfVertical',w:2,hp:77,characterOverrides:['hp'],destroyEvents:[]});p.objects[1].floorHalf=true;p.objects[1].w=2;p.objects[1].destroyEvents=[{type:'dropItem',target:'key'}];assert.deepEqual(parseStoredProject(stringifyStoredProject(p)),p);
});
test('大きい作品のもどす・すすむも圧縮して、編集内容を戻せる',()=>{
 const p=school(),history=createEditHistory(p);for(let i=0;i<5;i++){p.title='学校 '+i;p.objects[0].hp=40+i;history.record(p);}for(let i=3;i>=0;i--){const previous=history.undo();assert.equal(previous.title,'学校 '+i);assert.equal(previous.objects[0].hp,40+i);assert.equal(previous.objects.length,MAX_PARTS);}const next=history.redo();assert.equal(next.title,'学校 1');
});
test('不正な保存データや、展開すると巨大になるデータを拒否する',()=>{
 const p=school(),data=JSON.parse(stringifyStoredProject(p));for(const patch of [{version:2},{parts:[[999999,'id',0,0,0]]},{templates:[null],parts:[[0,'id',0,0,0]]},{parts:[[0,'id']]}])assert.throws(()=>parseStoredProject(JSON.stringify({...data,...patch})));
 const huge={...data,templates:[{text:'x'.repeat(100000)}],parts:Array.from({length:400},(_,i)=>[0,String(i),0,0,0])};assert.ok(JSON.stringify(huge).length<MAX_PROJECT_BYTES);assert.throws(()=>parseStoredProject(JSON.stringify(huge)));
});
test('動かない学校の近傍マップを使い回し、移動とサイズ変更は反映する',()=>{
 const g={time:0,objects:[constructionPart('wall',0,0),constructionPart('floor',100,100)]};nearbyObjects(g,-1,-1,1,1);const cells=g._spatial.cells,bucket=cells.get('0:0');g.time++;assert.equal(nearbyObjects(g,-1,-1,1,1).length,1);assert.equal(g._spatial.cells,cells);assert.equal(cells.get('0:0'),bucket);g.objects[0].x=100;g.time++;assert.equal(nearbyObjects(g,-1,-1,1,1).length,0);g.objects[1]=constructionPart('wall',0,0);g.time++;assert.equal(nearbyObjects(g,-1,-1,1,1).length,1);
});
test('8000パーツで連射しても、静的な建物の検索マップを作り直さない',()=>{
 const p=school(),g=create3D(p);step3D(g,p,{fire:true},.02);const objects=g.objects,cells=g._spatial.cells;for(let i=0;i<30;i++)step3D(g,p,{fire:true,x:1},.02);assert.equal(g.objects,objects);assert.equal(g._spatial.cells,cells);assert.ok(g.player.x>p.spawn.x);assert.ok(g.bullets.length<=96);
});
