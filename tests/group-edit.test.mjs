import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh3D,part,validate3D} from '../engine3d.js';
import {groupCandidate,groupSteps,commitGroup,copyGroupNearby} from '../group-edit3d.js';
import {initializeCharacterDefaults,synchronizeCharacterDefaults} from '../character-defaults3d.js';
import {createEditHistory} from '../history3d.js';
const project=()=>{const p=fresh3D();p.worldSize=240;p.spawn.z=80;return p;};
test('家をまとめて動かしても、パーツ同士の位置・向き・高さを保ち、グリッドへそろう',()=>{
 const p=project();p.objects=[part('floor',0,0),part('wall',0,2),part('roof',0,0)];p.objects[2].y=3;const before=structuredClone(p);
 const result=groupCandidate(p,p.objects.map(o=>o.id),{x:7.5,y:3,z:4});assert.equal(result.reason,'');assert.deepEqual(result.delta,{x:8,y:3,z:4});assert.deepEqual(p,before);
 commitGroup(p,p.objects.map(o=>o.id),{x:7.5,y:3,z:4});for(const [i,o]of p.objects.entries()){assert.deepEqual([o.x,o.y,o.z],[before.objects[i].x+8,before.objects[i].y+3,before.objects[i].z+4]);assert.equal(o.rotation,before.objects[i].rotation);}assert.ok(validate3D(p));
});
test('ほかの建物・スタート・マップ外・高さ制限で、途中のパーツだけが動くことはない',()=>{
 for(const delta of [{x:8,y:0,z:0},{x:0,y:-3,z:0},{x:120,y:0,z:0},{x:0,y:63,z:0}]){const p=project(),a=part('box',0,0),b=part('box',4,0);p.objects=[a,b,part('box',8,0)];const before=JSON.stringify(p);assert.throws(()=>commitGroup(p,[a.id,b.id],delta));assert.equal(JSON.stringify(p),before);}
 const p=project(),o=part('box',0,0);p.objects=[o];p.spawn={x:8,y:0,z:0};assert.throws(()=>commitGroup(p,[o.id],{x:8,y:0,z:0}));assert.equal(o.x,0);
});
test('コピーしたスイッチとドア、出現イベントはコピー先同士につながり、外の対象と銃は保つ',()=>{
 const p=project(),door=part('door',0,0),plate=part('plate',8,0),enemy=part('enemy',0,12),key=part('key',8,12),external=part('door',-20,0);plate.doorId=door.id;
 key.events=[{type:'openDoor',target:door.id},{type:'spawnEnemy',target:enemy.id},{type:'openDoor',target:external.id},{type:'giveTool',target:door.id}];door.events=[{type:'openDoor',target:door.id}];p.objects=[door,plate,enemy,key,external];const original=JSON.stringify(p.objects);
 const ids=commitGroup(p,[door.id,plate.id,enemy.id,key.id],{x:24,y:0,z:0},{copy:true}),[d,s,e,k]=p.objects.filter(o=>ids.includes(o.id));
 assert.equal(s.doorId,d.id);assert.deepEqual(k.events.map(a=>a.target),[d.id,e.id,external.id,door.id]);assert.equal(d.events[0].target,d.id);assert.equal(JSON.stringify(p.objects.slice(0,5)),original);assert.ok(validate3D(p));
});
test('敵と一緒に個別の移動エリア・探す場所・コースも移動し、ぜんたい設定との関係を保つ',()=>{
 const p=project(),enemy=part('enemy',0,0);p.objects=[enemy];initializeCharacterDefaults(p,part);enemy.hp=40;enemy.moveRange={space:'world',shape:'custom',cells:[[0,0],[1,0]]};enemy.patrolRoute=[{x:0,z:0},{x:8,z:0}];synchronizeCharacterDefaults(p);
 commitGroup(p,[enemy.id],{x:8,y:3,z:4});synchronizeCharacterDefaults(p);const e=p.objects[0];assert.deepEqual(e.moveRange.cells,[[2,1],[3,1]]);assert.deepEqual(e.patrolRoute,[{x:8,z:4},{x:16,z:4}]);assert.equal(e.hp,40);assert.ok(e.characterOverrides.includes('hp'));assert.ok(e.characterOverrides.includes('moveRange'));
 p.characterDefaults.enemy.attackSpeed=5;synchronizeCharacterDefaults(p);assert.equal(e.attackSpeed,5);assert.ok(validate3D(p));
});
test('コースがマップからはみ出す時は全部の移動を取り消す',()=>{const p=project(),e=part('enemy',110,0);e.patrolRoute=[{x:110,z:0},{x:118,z:0}];p.objects=[e];const before=JSON.stringify(p);assert.throws(()=>commitGroup(p,[e.id],{x:4,y:0,z:0}));assert.equal(JSON.stringify(p),before);});
test('コピー先が近くで見つかり、2000個までの制限と空の選択を守る',()=>{
 const p=project(),a=part('box',0,0),b=part('box',4,0);p.objects=[a,b];const ids=copyGroupNearby(p,[a.id,b.id]);assert.equal(ids.length,2);assert.equal(p.objects.length,4);assert.equal(p.objects[3].x-p.objects[2].x,4);
 p.objects=Array.from({length:2000},(_,i)=>part('star',i%20,Math.floor(i/20)%20));const before=JSON.stringify(p);assert.throws(()=>copyGroupNearby(p,[p.objects[0].id]));assert.equal(JSON.stringify(p),before);assert.throws(()=>commitGroup(p,[],{x:4,y:0,z:0}));
});
test('一度の移動・コピー・削除を、それぞれ一度のもどす・すすむで扱える',()=>{
 const p=project();p.objects=[part('floor',0,0),part('wall',0,2)];const initial=JSON.stringify(p),history=createEditHistory(p);commitGroup(p,p.objects.map(o=>o.id),{x:8,y:0,z:0});history.record(p);const moved=JSON.stringify(p);copyGroupNearby(p,p.objects.map(o=>o.id));history.record(p);const copied=JSON.stringify(p);p.objects=p.objects.slice(0,2);history.record(p);assert.equal(JSON.stringify(history.undo()),copied);assert.equal(JSON.stringify(history.undo()),moved);assert.equal(JSON.stringify(history.undo()),initial);assert.equal(JSON.stringify(history.redo()),moved);
});
