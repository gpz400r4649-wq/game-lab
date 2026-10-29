import test from 'node:test';
import assert from 'node:assert/strict';
import {GRID} from '../building3d.js';
import {RANGE_MAX,rangeCell,rangeCells,makeAttackRange,validAttackRange,inAttackRange} from '../enemy-range3d.js';
import {fresh3D,part,validate3D,create3D,step3D} from '../engine3d.js';
test('十字・円・組み合わせはマスの集合になり、別々の長さを持てる',()=>{
 assert.equal(GRID.cell,4);assert.equal(rangeCells('cross',4,2).length,17);assert.equal(rangeCells('circle',4,2).length,13);
 const mixed=makeAttackRange('mixed',4,2);assert.ok(validAttackRange(mixed));
 const e={x:0,z:0,attackRange:mixed};assert.ok(inAttackRange(e,{x:16,z:0}));assert.ok(inAttackRange(e,{x:4,z:4}));assert.equal(inAttackRange(e,{x:12,z:4}),false);
});
test('地面と同じセル境界を使い、負の座標・ずれた敵・移動にも追従する',()=>{
 assert.deepEqual([-6,-2.001,-2,1.999,2,6].map(rangeCell),[-1,-1,0,0,1,2]);
 const e={x:1.8,z:-1.5,attackRange:{shape:'custom',cross:1,circle:1,cells:[[1,0]]}};
 assert.ok(inAttackRange(e,{x:2,z:0}));assert.equal(inAttackRange(e,{x:1.99,z:0}),false);
 e.x=2;assert.ok(inAttackRange(e,{x:6,z:0}));assert.equal(inAttackRange(e,{x:2,z:0}),false);
});
test('自由なマスと穴を保存でき、空の範囲も有効',()=>{
 const p=fresh3D(),e=part('enemy');e.attackRange={shape:'custom',cross:8,circle:1,cells:[[3,-2],[-8,8]]};p.objects.push(e);
 assert.deepEqual(validate3D(JSON.parse(JSON.stringify(p))).objects[0].attackRange,e.attackRange);
 assert.equal(inAttackRange(e,{x:e.x,z:e.z}),false);e.attackRange.cells=[];assert.ok(validAttackRange(e.attackRange));assert.equal(inAttackRange(e,{x:12,z:-12}),false);
});
test('壊れた範囲データ・重複・上限越え・偽の形名を拒否する',()=>{
 for(const r of [null,{}, {...makeAttackRange(),cross:0},{...makeAttackRange(),circle:9},{...makeAttackRange(),shape:'bad'},...[[[0,0],[0,0]],[[.5,0]],[[9,0]],[[0,NaN]],[[0,0,1]],Array(290).fill([0,0])].map(cells=>({shape:'custom',cross:1,circle:1,cells})),{...makeAttackRange(),cells:[]}]){
  assert.equal(validAttackRange(r),false);const p=fresh3D(),e=part('enemy');e.attackRange=r;p.objects.push(e);assert.throws(()=>validate3D(p));
 }
 assert.ok(validAttackRange(makeAttackRange('cross',RANGE_MAX,1)));
});
function scenario(cells,spawn){const p=fresh3D();p.spawn={x:spawn.x,y:0,z:spawn.z};const e=part('enemy',0,0);e.program=[{action:'shoot',speed:3}];if(cells)e.attackRange={shape:'custom',cross:1,circle:1,cells};p.objects.push(e);return {p,g:create3D(p)};}
test('選んだマスに入ると発射し、外・穴・非表示・射撃行動なしでは発射しない',()=>{
 for(const [cells,spawn,expected]of [[[[1,0]],{x:4,z:0},true],[[[1,0]],{x:4,z:4},false],[[],{x:4,z:0},false],[[[5,0]],{x:20,z:0},true]]){
  const {p,g}=scenario(cells,spawn),before=JSON.stringify(p);step3D(g,p,{},.016);assert.equal(g.bullets.length>0,expected);assert.equal(JSON.stringify(p),before);
 }
 const {p,g}=scenario([[1,0]],{x:4,z:4});step3D(g,p,{},.016);assert.equal(g.bullets.length,0);g.player.z=0;step3D(g,p,{},.016);assert.ok(g.bullets.length>0);
 for(const hidden of [true,false]){const {p,g}=scenario([[1,0]],{x:4,z:0});g.objects[0].hidden=hidden;if(!hidden)g.objects[0].program=[];step3D(g,p,{},.016);assert.equal(g.bullets.length,0);}
});
test('既存の作品の射程18mは読み込みだけでは変わらない',()=>{
 for(const [x,expected]of [[17.99,true],[18,false],[20,false]]){const {p,g}=scenario(undefined,{x,z:0});assert.equal(validate3D(p).objects[0].attackRange,undefined);step3D(g,p,{},.016);assert.equal(g.bullets.length>0,expected);}
});
