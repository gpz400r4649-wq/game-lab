import test from 'node:test';import assert from 'node:assert/strict';
import {part,fresh3D,create3D,step3D,validate3D,ENEMY_PRESETS,BEHAVIORS} from '../engine3d.js';
function setup(program=[],on=true){const p=fresh3D();p.spawn={x:4,y:0,z:0};const e=part('enemy',0,0);e.program=structuredClone(program);e.attackEnabled=on;e.attackRange={shape:'custom',cross:4,circle:2,cells:[[1,0]]};p.objects=[e];return {p,g:create3D(p)};}
test('行動タイプは移動だけで、動かない敵も攻撃できる',()=>{
 assert.equal(ENEMY_PRESETS.guard,undefined);assert.equal(ENEMY_PRESETS.still.name,'動かない');assert.equal(BEHAVIORS.shoot,undefined);
 for(const preset of Object.values(ENEMY_PRESETS))for(const on of [true,false]){const {p,g}=setup(preset.program,on);const before=JSON.stringify(p);step3D(g,p,{},.02);assert.equal(g.bullets.length>0,on);assert.equal(g.objects[0].x!==0,preset.program.length>0);assert.equal(JSON.stringify(p),before);}
});
test('どの移動タイプでも範囲外では撃たず、範囲に戻ると撃つ',()=>{
 for(const preset of Object.values(ENEMY_PRESETS)){const {p,g}=setup(preset.program);g.player.z=4;step3D(g,p,{},.02);assert.equal(g.bullets.length,0);g.player.z=0;step3D(g,p,{},.02);assert.ok(g.bullets.length>0);}
});
test('攻撃オフなら接触ダメージも与えず、移動と範囲は保存する',()=>{
 const {p,g}=setup([{action:'chase',speed:2}],false);g.player.x=.5;for(let i=0;i<30;i++)step3D(g,p,{},.02);assert.equal(g.player.hp,5);assert.equal(g.bullets.length,0);assert.ok(g.objects[0].x>0);assert.deepEqual(validate3D(JSON.parse(JSON.stringify(p))),p);
});
test('古い射撃ブロックは攻撃設定へ移し、以前の非射撃敵はオフにする',()=>{
 for(const shooting of [true,false]){const {p}=setup([{action:'patrol',speed:2}]);const e=p.objects[0];delete e.attackEnabled;delete e.attackSpeed;if(shooting)e.program.push({action:'shoot',speed:7});const original=JSON.stringify(p),q=validate3D(p),enemy=q.objects[0];assert.equal(enemy.attackEnabled,shooting);assert.equal(enemy.attackSpeed,shooting?7:3);assert.deepEqual(enemy.program,[{action:'patrol',speed:2}]);assert.deepEqual(enemy.attackRange,e.attackRange);assert.equal(JSON.stringify(p),original);assert.deepEqual(validate3D(q),q);assert.equal(create3D(p).objects[0].attackEnabled,shooting);}
});
test('明示した攻撃オフを古い射撃ブロックが上書きせず、不正な設定は拒否する',()=>{
 const {p}=setup([{action:'shoot',speed:3}],false);assert.equal(validate3D(p).objects[0].attackEnabled,false);
 for(const value of ['false',0,null,{}]){const {p}=setup();p.objects[0].attackEnabled=value;assert.throws(()=>validate3D(p));}
 for(const value of [NaN,Infinity,0,9]){const {p}=setup();p.objects[0].attackSpeed=value;assert.throws(()=>validate3D(p));}
});
test('射撃の速度は移動の速さから独立している',()=>{
 for(const speed of [.5,8]){const {p,g}=setup([{action:'patrol',speed}]);step3D(g,p,{},.02);const b=g.bullets[0];assert.ok(Math.abs(Math.hypot(b.vx,b.vy,b.vz)-8)<.00001);}
});
