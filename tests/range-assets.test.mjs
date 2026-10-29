import test from 'node:test';import assert from 'node:assert/strict';
import {fresh3D,part,validate3D,create3D,step3D} from '../engine3d.js';
import {worldMoveRange,makeAttackRange,validMoveRange,MOVE_MAX_CELLS,inGridRange} from '../enemy-range3d.js';
import {saveRangeAsset,saveEnemyAsset,applyRangeAsset,applyEnemyAsset,validLibrary} from '../assets3d.js';
test('以前の範囲を同じ場所のマップ座標に変換し、その後敵を動かしてもずれない',()=>{
 const p=fresh3D(),e=part('enemy',8,-4);e.moveRange=makeAttackRange('cross',1,1);p.objects=[e];const before=JSON.stringify(p),q=validate3D(p),r=q.objects[0].moveRange;assert.equal(r.space,'world');assert.ok(r.cells.some(c=>c[0]===2&&c[1]===-1));assert.equal(JSON.stringify(p),before);q.objects[0].x=20;assert.deepEqual(validate3D(q).objects[0].moveRange,r);assert.deepEqual(validate3D(q),q);
});
test('絶対位置の移動範囲は異なる場所の敵でも同じマスを制限する',()=>{
 const p=fresh3D();p.spawn={x:20,y:0,z:0};const e=part('enemy',8,0);e.attackEnabled=false;e.program=[{action:'chase',speed:2}];e.moveRange={space:'world',cells:[[2,0],[3,0]]};p.objects=[e];const g=create3D(p);for(let i=0;i<500;i++){step3D(g,p,{},.02);assert.ok(inGridRange(g.objects[0].moveRange,{x:0,z:0},g.objects[0]));}assert.ok(g.objects[0].x<=12.1);p.objects[0].x=0;const h=create3D(p);step3D(h,p,{},.02);assert.equal(h.objects[0].x,0);
});
test('範囲素材と敵素材は深いコピーで使え、作品保存と一緒に引き継がれる',()=>{
 const p=fresh3D(),e=part('enemy',8,-4);e.moveRange=worldMoveRange(makeAttackRange('cross',2,1),e);e.searchRange=makeAttackRange('circle',2,2);e.chaseMode='remember';e.program=[{action:'search',speed:4}];p.objects=[e];
 const attack=saveRangeAsset(p,e,'attackRange','十字の攻撃'),move=saveRangeAsset(p,e,'moveRange','校庭'),enemy=saveEnemyAsset(p,e,'校庭のロボット');const copy=part('enemy',-8,4);applyRangeAsset(copy,attack,'attackRange');assert.deepEqual(copy.attackRange,e.attackRange);copy.attackRange.cells.pop();assert.notDeepEqual(copy.attackRange,attack.range);
 applyEnemyAsset(copy,enemy);assert.deepEqual(copy.moveRange,e.moveRange);copy.moveRange.cells.pop();assert.notDeepEqual(copy.moveRange,enemy.config.moveRange);assert.deepEqual(e.moveRange,move.range);const q=validate3D(JSON.parse(JSON.stringify(p)));assert.deepEqual(q,p);assert.equal(q.library.enemies[0].config.chaseMode,'remember');p.library.enemies=[];assert.ok(copy.moveRange.cells.length);assert.equal(fresh3D().library,undefined);
});
test('移動範囲はマップ全域の座標を扱い、重複・小数・上限越えを拒否する',()=>{
 assert.ok(validMoveRange({space:'world',cells:[[-120,120],[0,0]]}));for(const cells of [[[121,0]],[[.1,0]],[[0,0],[0,0]],Array(MOVE_MAX_CELLS+1).fill([0,0])])assert.equal(validMoveRange({space:'world',cells}),false);
});
test('素材の種類・名前・不正な設定・保存数の上限を検証する',()=>{
 const p=fresh3D(),e=part('enemy');assert.throws(()=>saveRangeAsset(p,e,'bad','x'));assert.throws(()=>saveEnemyAsset(p,e,' '));for(let i=0;i<64;i++)saveRangeAsset(p,e,'attackRange',`範囲${i}`);assert.throws(()=>saveRangeAsset(p,e,'attackRange','65'));for(let i=0;i<32;i++)saveEnemyAsset(p,e,`敵${i}`);assert.throws(()=>saveEnemyAsset(p,e,'33'));assert.ok(validLibrary(p.library));
 for(const change of [q=>q.ranges[0].name='',q=>q.ranges[0].kind='bad',q=>q.enemies[0].config.hp=999,q=>q.enemies[0].config.program=[{action:'bad',speed:1}],q=>q.ranges[1].id=q.ranges[0].id,q=>q.ranges[0].range=null]){const lib=structuredClone(p.library);change(lib);assert.equal(validLibrary(lib),false);const bad=fresh3D();bad.library=lib;assert.throws(()=>validate3D(bad));}
 assert.throws(()=>applyRangeAsset(e,p.library.ranges[0],'searchRange'));
});
