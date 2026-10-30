import test from 'node:test';import assert from 'node:assert/strict';
import {inEnemyRange,inAttackRange,rangeWorldCells,convertRangeSpace,validAttackRange,validMoveRange,makeAttackRange,enemyYaw,defaultEnemyRanges} from '../enemy-range3d.js';
import {detectsPlayer} from '../enemy-ai3d.js';
import {fresh3D,part,create3D,step3D,validate3D} from '../engine3d.js';
const front=()=>({space:'facing',shape:'custom',cross:4,circle:4,cells:[[0,-1],[0,-2],[1,-2]]});
test('向き指定の非対称な形は４方向で正しく回り、表示と判定が一致する',()=>{
 const r=front();for(const [facing,expected]of [[0,[[2,1],[2,0],[3,0]]],[90,[[1,2],[0,2],[0,1]]],[180,[[2,3],[2,4],[1,4]]],[270,[[3,2],[4,2],[4,3]]]]){const e={x:8,z:8,facing};assert.deepEqual(rangeWorldCells(r,e),expected);for(const [x,z]of expected)assert.ok(inEnemyRange(r,e,{x:x*4,z:z*4}));assert.equal(inEnemyRange(r,e,{x:8,z:8}),false);}
});
test('回転は90度のマスにそろい、移動中の向きも同じ基準で判定する',()=>{
 const r=front(),e={x:0,z:0,facing:180,heading:Math.PI/2};assert.ok(inEnemyRange(r,e,{x:-4,z:0}));e.heading=Math.PI/2+.1;assert.deepEqual(rangeWorldCells(r,e)[0],[-1,0]);e.heading=-Math.PI/2;assert.deepEqual(rangeWorldCells(r,e)[0],[1,0]);assert.equal(enemyYaw({...e,searchRange:r},{x:100,z:100}),e.heading);
});
test('マップのエリア指定は敵が移動・回転しても場所を変えない',()=>{
 const r={space:'world',cells:[[4,-2],[5,-2]]},e={x:0,z:0,facing:0};assert.ok(inEnemyRange(r,e,{x:16,z:-8}));e.x=40;e.z=32;e.facing=270;e.heading=2;assert.ok(inEnemyRange(r,e,{x:16,z:-8}));assert.deepEqual(rangeWorldCells(r,e),r.cells);assert.equal(inEnemyRange(r,e,{x:40,z:32}),false);
});
test('以前の範囲は回転せず敵と移動し、旧作品の挙動を保つ',()=>{
 const r={shape:'custom',cross:4,circle:4,cells:[[0,-1]]},e={x:0,z:0,facing:90};assert.ok(inEnemyRange(r,e,{x:0,z:-4}));e.x=8;assert.ok(inEnemyRange(r,e,{x:8,z:-4}));assert.equal(inEnemyRange(r,e,{x:4,z:0}),false);
});
test('決め方を切り替えても現在のマップ上のマスを維持し、データを直接変えない',()=>{
 const e={x:8,z:8,facing:90},r=front(),before=structuredClone(r),world=convertRangeSpace(r,'world',e),again=convertRangeSpace(world,'facing',e),legacy=convertRangeSpace(world,'legacy',e);assert.deepEqual(rangeWorldCells(world,e),rangeWorldCells(r,e));assert.deepEqual(rangeWorldCells(again,e),rangeWorldCells(r,e));assert.deepEqual(rangeWorldCells(legacy,e),rangeWorldCells(r,e));assert.deepEqual(r,before);
});
test('切り替え先に入らないマスは黙って削除せず、切り替えを拒否する',()=>{
 const r={space:'world',cells:[[30,30]]},before=structuredClone(r);assert.equal(convertRangeSpace(r,'facing',{x:0,z:0}),null);assert.equal(convertRangeSpace(r,'legacy',{x:0,z:0}),null);assert.deepEqual(r,before);
});
test('攻撃・探索はworldとfacingを保存でき、移動範囲は回転型を拒否する',()=>{
 for(const r of [front(),{space:'world',cells:[[120,-120]]}]){assert.ok(validAttackRange(r));const p=fresh3D(),e=part('enemy');e.facing=90;e.attackRange=structuredClone(r);e.searchRange=structuredClone(r);p.objects=[e];assert.deepEqual(validate3D(p),p);}assert.equal(validMoveRange(front()),false);for(const r of [{space:'world',cells:[[121,0]]},{...front(),space:'invalid'},{...front(),cells:[[9,0]]}])assert.equal(validAttackRange(r),false);const p=fresh3D();p.objects=[part('enemy')];for(const value of [45,-90,'90',null]){p.objects[0].facing=value;assert.throws(()=>validate3D(p));}
});
test('動かない敵の前方だけで探索・攻撃し、背後のプレイヤーを勝手に振り向いて見つけない',()=>{
 const p=fresh3D();p.spawn={x:0,y:0,z:4};const e=part('enemy',0,0);e.attackRange=front();e.searchRange=front();e.facing=0;p.objects=[e];const original=structuredClone(p),g=create3D(p),robot=g.objects[0];assert.equal(detectsPlayer(robot,g.player),false);assert.equal(inAttackRange(robot,g.player),false);for(let i=0;i<20;i++)step3D(g,p,{},.02);assert.equal(g.bullets.length,0);assert.equal(robot.heading,0);g.player.z=-4;assert.equal(detectsPlayer(robot,g.player),true);step3D(g,p,{},.02);assert.ok(g.bullets.length>0);assert.deepEqual(p,original);
});
test('移動型の敵は実際の歩く方向へ向き、前方範囲も一緒に変わる',()=>{
 const p=fresh3D();p.spawn={x:0,y:0,z:20};const e=part('enemy',0,0);e.program=[{action:'patrol',speed:2}];e.searchRange=front();e.attackEnabled=false;p.objects=[e];const g=create3D(p);step3D(g,p,{},.02);const robot=g.objects[0];assert.ok(robot.x>0);assert.ok(Math.abs(robot.heading+Math.PI/2)<.001);assert.ok(detectsPlayer(robot,{x:4,z:0}));assert.equal(detectsPlayer(robot,{x:-4,z:0}),false);
});
test('マップ上の同じエリアで離れた敵も探索・攻撃を共有できる',()=>{
 const r={space:'world',cells:[[0,1]]};for(const x of [-12,12]){const e={x,z:0,attackRange:r,searchRange:r};assert.ok(detectsPlayer(e,{x:0,z:4}));assert.ok(inAttackRange(e,{x:0,z:4}));assert.equal(inAttackRange(e,{x:0,z:8}),false);}
});

test('新しい敵の３範囲は円２マスで、探す・攻撃は向きに合わせる',()=>{
 const e=part('enemy',20,-12),expected=makeAttackRange('circle',2,2);assert.equal(e.moveRange.space,'world');assert.deepEqual(e.moveRange.cells,rangeWorldCells(expected,e));for(const key of ['searchRange','attackRange']){assert.equal(e[key].space,'facing');assert.equal(e[key].shape,'circle');assert.equal(e[key].circle,2);assert.equal(e[key].cross,2);assert.deepEqual(e[key].cells,expected.cells);}const p=fresh3D();p.objects=[e];assert.deepEqual(validate3D(p),p);e.searchRange.cells.pop();assert.equal(e.attackRange.cells.length,13);assert.equal(e.moveRange.cells.length,13);
});
test('既存の敵の範囲を読み込み時に初期値で置き換えない',()=>{
 const p=fresh3D(),e=part('enemy');delete e.moveRange;delete e.searchRange;e.attackRange=makeAttackRange('cross',5,3);p.objects=[e];const restored=validate3D(p).objects[0];assert.equal(restored.moveRange,undefined);assert.equal(restored.searchRange,undefined);assert.deepEqual(restored.attackRange,e.attackRange);const defaults=defaultEnemyRanges({x:40,z:-20});assert.ok(defaults.moveRange.cells.some(([x,z])=>x===10&&z===-5));
});
