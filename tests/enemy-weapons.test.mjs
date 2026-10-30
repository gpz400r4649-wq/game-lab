import test from 'node:test';import assert from 'node:assert/strict';
import {fresh3D,part,create3D,step3D,validate3D,enemyWeapon} from '../engine3d.js';
import {makeTool,constructionPart} from '../building3d.js';
import {makeAttackRange} from '../enemy-range3d.js';
import {shootVolley,updateCombat,resolveShotOrigin} from '../combat3d.js';
import {playerGunMuzzle} from '../muzzle3d.js';
import {LIMITS} from '../weapons3d.js';
function setup(){const p=fresh3D();p.spawn={x:0,y:0,z:20};const enemy=part('enemy',0,0);enemy.attackRange=makeAttackRange('circle',8,8);const weapon=makeTool('shoot','てきの銃');p.loadout.push(weapon);enemy.enemyWeaponId=weapon.id;p.objects=[enemy];return {p,enemy,weapon};}
test('敵は共有一覧の射撃銃を参照し、保存・複製・読み込みでも装備を保つ',()=>{
 const {p,enemy,weapon}=setup(),before=structuredClone(p);assert.equal(enemyWeapon(enemy,p.loadout),weapon);assert.equal(validate3D(p).objects[0].enemyWeaponId,weapon.id);assert.equal(create3D(p).objects[0].enemyWeaponId,weapon.id);assert.deepEqual(p,before);const copy=structuredClone(enemy);assert.equal(enemyWeapon(copy,p.loadout),weapon);
 for(const value of [null,2,{},[]]){const bad=structuredClone(p);bad.objects[0].enemyWeaponId=value;assert.throws(()=>validate3D(bad));}
});
test('敵用に拾って使う銃を指定しても、プレイヤーに追加装備しない',()=>{
 const {p,weapon}=setup();weapon.pickupOnly=true;const g=create3D(p);assert.ok(!g.inventory.includes(weapon.id));step3D(g,p,{},.01);assert.equal(g.bullets.length,1);
});
test('共有銃の弾数・弾速・威力・大きさ・射程・形・命中効果・発射間隔を反映する',()=>{
 const {p,weapon}=setup();Object.assign(weapon,{speed:35,spread:3,damage:7,size:.6,range:30,projectile:'rocket',impacts:['explode','bounce'],interval:.12,aimJitter:0});const before=structuredClone(p),g=create3D(p);step3D(g,p,{},.01);assert.equal(g.bullets.length,3);for(const b of g.bullets){assert.equal(b.enemy,true);assert.equal(b.damage,7);assert.equal(b.radius,.3);assert.equal(b.projectile,'rocket');assert.deepEqual(b.impacts,['explode','bounce']);assert.ok(Math.abs(Math.hypot(b.vx,b.vy,b.vz)-35)<.001);assert.ok(b.remaining<30);}assert.equal(g.objects[0].cooldown,.12);step3D(g,p,{},.02);assert.equal(g.bullets.length,3);g.objects[0].cooldown=0;step3D(g,p,{},.01);assert.equal(g.bullets.length,6);assert.deepEqual(p,before);
});
test('敵ごとに別の銃を選べ、共通銃の変更は次の発射から反映する',()=>{
 const {p,weapon}=setup(),second=part('enemy',8,0),other=makeTool('shoot','もう一つ');other.damage=2;second.enemyWeaponId=other.id;second.attackRange=makeAttackRange('circle',8,8);p.loadout.push(other);p.objects.push(second);weapon.damage=4;const g=create3D(p);step3D(g,p,{},.01);assert.deepEqual(g.bullets.map(b=>b.damage),[4,2]);weapon.damage=8;g.objects[0].cooldown=0;step3D(g,p,{},.01);assert.equal(g.bullets.at(-1).damage,8);
});
test('未設定・削除・建築銃への変更は以前の攻撃に戻り、建築を勝手に追加しない',()=>{
 for(const mode of ['none','deleted','builder']){const {p,enemy,weapon}=setup();if(mode==='none')delete enemy.enemyWeaponId;if(mode==='deleted')p.loadout.pop();if(mode==='builder')weapon.effect='wall';assert.equal(enemyWeapon(enemy,p.loadout),null);assert.ok(validate3D(p));const g=create3D(p);step3D(g,p,{},.01);assert.equal(g.bullets.length,1);assert.equal(g.bullets[0].damage,1);assert.ok(Math.abs(Math.hypot(g.bullets[0].vx,g.bullets[0].vy,g.bullets[0].vz)-8)<.001);assert.equal(g.objects[0].cooldown,1.4);assert.equal(g.buildings.length,0);}
});
test('銃を選んでも攻撃チェックとマスの制限は維持する',()=>{
 for(const mode of ['off','outside']){const {p,enemy}=setup();if(mode==='off')enemy.attackEnabled=false;else enemy.attackRange={shape:'custom',cross:1,circle:1,cells:[]};const g=create3D(p);step3D(g,p,{},.02);assert.equal(g.bullets.length,0);}
});
test('銃口から発射し、自分の体は無視して手前の壁を越えて撃たない',()=>{
 const {p,enemy,weapon}=setup(),g=create3D(p),yaw=Math.PI,start={x:0,y:1.1,z:0},muzzle=playerGunMuzzle(enemy,weapon,yaw);assert.deepEqual(resolveShotOrigin(g,start,muzzle,.1,enemy.id),muzzle);step3D(g,p,{},.01);assert.ok(Math.abs(g.bullets[0].x)>.2);const wall=constructionPart('wall',0,.7);g.objects.push(wall);const blocked=resolveShotOrigin(g,start,muzzle,.1,enemy.id);assert.ok(blocked.z<muzzle.z);
});
test('敵のロケットは壁で爆発してプレイヤーとブロックにダメージを与え、敵自身は傷つけない',()=>{
 const p=fresh3D();p.spawn={x:1,y:0,z:1};const enemy=part('enemy',1,-1),wall=constructionPart('wall',0,0);p.objects=[enemy,wall];const g=create3D(p);shootVolley(g,{x:0,y:1,z:1},{x:0,y:0,z:-1},{...makeTool(),projectile:'rocket',impact:'explode',damage:2,blastRadius:3},true);for(let i=0;i<10;i++){g.time+=.02;updateCombat(g,.02);}assert.equal(g.player.hp,3);assert.equal(g.objects.find(o=>o.id===wall.id).hp,18);assert.equal(g.objects.find(o=>o.id===enemy.id).hp,3);assert.ok(g.effects.some(e=>e.kind==='blast'));
});
test('敵ロケットの直撃も爆発し、同時に二重のダメージを与えない',()=>{
 const p=fresh3D();p.spawn={x:0,y:0,z:0};const g=create3D(p);shootVolley(g,{x:0,y:1,z:1},{x:0,y:0,z:-1},{...makeTool(),projectile:'rocket',impact:'explode',damage:2},true);for(let i=0;i<6;i++)updateCombat(g,.02);assert.equal(g.player.hp,3);assert.ok(g.effects.some(e=>e.kind==='blast'));
});
test('多数の敵が最大設定で連射しても弾と演出の上限を守る',()=>{
 const {p,enemy,weapon}=setup();Object.assign(weapon,{spread:8,interval:.08,projectile:'rocket',impact:'explode'});p.objects=Array.from({length:50},(_,i)=>({...structuredClone(enemy),id:String(i),x:i%5*4-8,z:Math.floor(i/5)*-2}));const g=create3D(p);for(let i=0;i<100;i++){step3D(g,p,{},.02);assert.ok(g.bullets.length<=LIMITS.bullets);assert.ok(g.effects.length<=LIMITS.effects);}
});
