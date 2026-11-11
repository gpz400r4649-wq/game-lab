import {keepStructures} from '../building3d.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {part,fresh3D,validate3D,create3D} from '../engine3d.js';
import {initializeCharacterDefaults,synchronizeCharacterDefaults,inheritNewCharacter,useCharacterDefaults} from '../character-defaults3d.js';
import {applyBlockDefaults,writeCharacterDefaults,sharedKeys} from '../character-defaults3d.js';

for(const type of ['enemy','ally'])test(type+'は基本設定を参照し、個別の体力だけを上書きできる',()=>{
 const p=fresh3D();p.objects=[part(type,0,0),part(type,8,0)];initializeCharacterDefaults(p,part);
 const [a,b]=p.objects;p.characterDefaults[type].hp=10;synchronizeCharacterDefaults(p);assert.equal(a.hp,10);assert.equal(b.hp,10);
 useCharacterDefaults(p,a,['hp'],false);a.hp=20;synchronizeCharacterDefaults(p);
 p.characterDefaults[type].hp=12;synchronizeCharacterDefaults(p);assert.equal(a.hp,20);assert.equal(b.hp,12);
 const next=inheritNewCharacter(p,part(type,12,0));assert.equal(next.hp,12);p.objects.push(next);
 const saved=validate3D(JSON.parse(JSON.stringify(p)));saved.characterDefaults[type].hp=15;synchronizeCharacterDefaults(saved);
 assert.equal(saved.objects[0].hp,20);assert.equal(saved.objects[1].hp,15);assert.equal(saved.objects[2].hp,15);
 useCharacterDefaults(saved,saved.objects[0],['hp'],true);assert.equal(saved.objects[0].hp,15);
});
test('旧作品の独自の体力と速度を引き継ぎ、体力を変えても位置と向きを保つ',()=>{
 const p=fresh3D(),a=part('enemy',8,4);a.hp=100;a.facing=90;a.program=[{action:'patrol',speed:4}];p.objects=[a];
 initializeCharacterDefaults(p,part);p.characterDefaults.enemy.hp=10;p.characterDefaults.enemy.movementSpeed=3;synchronizeCharacterDefaults(p);
 assert.equal(a.hp,100);assert.equal(a.movementSpeed,undefined);assert.equal(a.program[0].speed,4);assert.deepEqual([a.x,a.z,a.facing],[8,4,90]);
 const g=create3D(p);g.objects[0].hp=1;assert.equal(a.hp,100);
});
test('基本設定の不正な体力や個別指定を読み込まない',()=>{
 const p=fresh3D();p.objects=[part('enemy')];initializeCharacterDefaults(p,part);
 p.characterDefaults.enemy.hp=501;assert.throws(()=>validate3D(p));p.characterDefaults.enemy.hp=3;
 p.objects[0].characterOverrides=['x'];assert.throws(()=>validate3D(p));
});

test('見本で塗った移動エリアとコースは各敵の位置へ反映され、見本自体は作品に入らない',()=>{
 const p=fresh3D();p.objects=[part('enemy',8,4)];initializeCharacterDefaults(p,part);
 const preview=inheritNewCharacter(p,part('enemy',0,0));preview.characterOverrides=[...sharedKeys('enemy')];
 preview.moveRange={space:'world',shape:'custom',cells:[[0,0],[1,0],[2,0]]};preview.patrolRoute=[{x:0,z:0},{x:8,z:0}];
 writeCharacterDefaults(p,preview);
 assert.equal(p.objects.length,1);assert.deepEqual(p.objects[0].moveRange.cells,[[2,1],[3,1],[4,1]]);
 assert.deepEqual(p.objects[0].patrolRoute,[{x:8,z:4},{x:16,z:4}]);
 assert.deepEqual(inheritNewCharacter(p,part('enemy',-8,0)).patrolRoute,[{x:-8,z:0},{x:0,z:0}]);
 assert.ok(validate3D(p));
});
test('以前に個別で塗ったエリアは基本設定を更新しても保つ',()=>{
 const p=fresh3D(),enemy=part('enemy',8,4);p.objects=[enemy];initializeCharacterDefaults(p,part);
 enemy.moveRange={space:'world',shape:'custom',cells:[[5,5]]};synchronizeCharacterDefaults(p);
 p.characterDefaults.enemy.moveRange.cells=[[0,0]];synchronizeCharacterDefaults(p);
 assert.deepEqual(enemy.moveRange.cells,[[5,5]]);
 const saved=validate3D(p);assert.deepEqual(saved.objects[0].moveRange.cells,[[5,5]]);
});

test('全種類のブロックは共通の体力と壊れ方を参照し、個別設定と新規配置にも対応する',()=>{
 const p=fresh3D();p.objects=['wall','floor','roof','ramp','box','platform','moving'].map((type,i)=>part(type,i*4,0));initializeCharacterDefaults(p,part);
 p.characterDefaults.block.hp=50;synchronizeCharacterDefaults(p);assert.ok(p.objects.every(o=>o.hp===50));
 const first=p.objects[0];useCharacterDefaults(p,first,['hp'],false);first.hp=80;synchronizeCharacterDefaults(p);p.characterDefaults.block.hp=100;p.characterDefaults.block.destructible=false;synchronizeCharacterDefaults(p);
 assert.equal(first.hp,80);assert.ok(p.objects.slice(1).every(o=>o.hp===100));assert.ok(p.objects.every(o=>o.destructible===false));const next=inheritNewCharacter(p,part('wall',-8,0));assert.equal(next.hp,100);assert.equal(next.destructible,false);
 const saved=validate3D(JSON.parse(JSON.stringify(p)));saved.characterDefaults.block.hp=120;synchronizeCharacterDefaults(saved);assert.equal(saved.objects[0].hp,80);assert.equal(saved.objects[1].hp,120);assert.equal(applyBlockDefaults(saved),7);assert.ok(saved.objects.every(o=>o.hp===120&&o.characterOverrides.length===0));
});
test('旧ブロックの個別体力とイベント・場所を保ち、一括適用は体力と壊れ方だけをそろえる',()=>{
 const p=fresh3D(),wall=part('wall',8,4);wall.hp=75;wall.destroyEvents=[{type:'addStar',amount:1}];p.objects=[wall];initializeCharacterDefaults(p,part);p.characterDefaults.block.hp=100;synchronizeCharacterDefaults(p);assert.equal(wall.hp,75);
 const before=structuredClone(wall);applyBlockDefaults(p);assert.equal(wall.hp,100);assert.deepEqual(wall.destroyEvents,before.destroyEvents);assert.deepEqual([wall.x,wall.y,wall.z,wall.w,wall.h,wall.d],[before.x,before.y,before.z,before.w,before.h,before.d]);
 const old=JSON.parse(JSON.stringify(p));delete old.characterDefaults.block;delete old.objects[0].characterOverrides;assert.ok(validate3D(old).characterDefaults.block);
 p.characterDefaults.block.hp=201;assert.throws(()=>validate3D(p));p.characterDefaults.block.hp=20;p.characterDefaults.block.destructible='no';assert.throws(()=>validate3D(p));
});
test('建築銃から作品に残す体力は個別設定として保ち、一括適用でそろえられる',()=>{
 const p=fresh3D();initializeCharacterDefaults(p,part);p.characterDefaults.block.hp=50;const built={...part('wall',0,0),built:true,hp:10,maxHp:80};assert.equal(keepStructures(p,{buildings:[built]}),1);synchronizeCharacterDefaults(p);assert.equal(p.objects[0].hp,80);assert.ok(p.objects[0].characterOverrides.includes('hp'));applyBlockDefaults(p);assert.equal(p.objects[0].hp,50);assert.ok(validate3D(p));
});
