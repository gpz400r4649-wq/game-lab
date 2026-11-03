import test from 'node:test';import assert from 'node:assert/strict';
import {ENEMY_BEHAVIOR_EXAMPLES,applyEnemyBehaviorExample,enemyBehaviorExampleKey,basicEnemyBehavior,enemyBehaviorFlow} from '../enemy-behavior-presets3d.js';
import {fresh3D,part,create3D,step3D,validate3D} from '../engine3d.js';
import {makeAttackRange} from '../enemy-range3d.js';
function setup(key){const p=fresh3D(),enemy=part('enemy',0,0);enemy.attackEnabled=false;applyEnemyBehaviorExample(enemy,key);p.objects=[enemy];p.spawn={x:20,y:0,z:0};return {p,g:create3D(p)};}
function tick(g,p,n=1){for(let i=0;i<n;i++)step3D(g,p,{},.02);}
test('９種類は重複しない動きの組み合わせで、すべて保存・読み込みできる',()=>{
 assert.equal(Object.keys(ENEMY_BEHAVIOR_EXAMPLES).length,9);const combinations=new Set();for(const [key,example]of Object.entries(ENEMY_BEHAVIOR_EXAMPLES)){const p=fresh3D(),enemy=part('enemy');assert.ok(example.name);assert.ok(example.flow);assert.ok(applyEnemyBehaviorExample(enemy,key));assert.equal(enemyBehaviorExampleKey(enemy),key);p.objects=[enemy];assert.deepEqual(validate3D(p),p);combinations.add(JSON.stringify([enemy.program,example.chaseMode]));}assert.equal(combinations.size,9);
});
test('見本を選んでも体力・銃・攻撃チェック・向き・設定済みの３範囲を変えない',()=>{
 for(const key of Object.keys(ENEMY_BEHAVIOR_EXAMPLES)){const enemy=part('enemy',8,12);Object.assign(enemy,{hp:12,facing:90,enemyWeaponId:'my-gun',attackEnabled:false,attackSpeed:7,searchRange:{...makeAttackRange('cross',5,2),space:'facing'}});const before=structuredClone(enemy);applyEnemyBehaviorExample(enemy,key);for(const field of ['id','x','y','z','hp','facing','enemyWeaponId','attackEnabled','attackSpeed','moveRange','searchRange','attackRange','settings'])assert.deepEqual(enemy[field],before[field],field);}
});
test('見本の動きの配列を共有せず、１体の編集が別の敵や見本へ漏れない',()=>{
 const a=part('enemy'),b=part('enemy');applyEnemyBehaviorExample(a,'chaseInside');applyEnemyBehaviorExample(b,'chaseInside');a.program[0].speed=8;assert.equal(b.program[0].speed,2);assert.equal(ENEMY_BEHAVIOR_EXAMPLES.chaseInside.program[0].speed,2);const before=structuredClone(a);assert.equal(applyEnemyBehaviorExample(a,'unknown'),false);assert.deepEqual(a,before);
});
test('速さだけを変えても行動タイプは正しく表示し、組み合わせは自分の調整と判別する',()=>{
 const enemy=part('enemy');applyEnemyBehaviorExample(enemy,'chaseInside');enemy.program[0].speed=3;assert.equal(basicEnemyBehavior(enemy),'chase');assert.equal(enemyBehaviorExampleKey(enemy),'custom');enemy.program=[{speed:4,action:'chase'}];assert.equal(enemyBehaviorExampleKey(enemy),'fastChase');enemy.program.push({action:'patrol',speed:1});assert.equal(basicEnemyBehavior(enemy),'custom');assert.equal(enemyBehaviorExampleKey(enemy),'custom');assert.ok(enemyBehaviorFlow(enemy).includes('ブロック'));
});
test('旧作品に範囲がなくても、移動用の見本を選んだ時だけ必要な初期値を補う',()=>{
 const enemy=part('enemy',8,8);delete enemy.moveRange;delete enemy.searchRange;const originalAttack=structuredClone(enemy.attackRange);applyEnemyBehaviorExample(enemy,'still');assert.equal(enemy.moveRange,undefined);applyEnemyBehaviorExample(enemy,'searchInside');assert.equal(enemy.moveRange.space,'world');assert.equal(enemy.searchRange.space,'facing');assert.equal(enemy.searchRange.circle,2);assert.deepEqual(enemy.attackRange,originalAttack);
});
test('待ってから追う３種類は、範囲を出た後の動きが説明どおり異なる',()=>{
 for(const key of ['chaseInside','chaseRemember','chaseAlways']){const {p,g}=setup(key),enemy=g.objects[0];tick(g,p,5);assert.equal(enemy.x>0,key==='chaseAlways');g.player.x=4;tick(g,p,5);assert.ok(enemy.x>0);g.player.x=20;const before=enemy.x;tick(g,p,100);assert.equal(enemy.x>before,key!=='chaseInside');}
});
test('歩いて探す２種類は、見失うと探し直すか追い続けるかを選べる',()=>{
 for(const key of ['searchInside','searchRemember']){const {p,g}=setup(key),enemy=g.objects[0];tick(g,p,20);assert.ok(Math.hypot(enemy.x,enemy.z)>.1);assert.equal(enemy.foundPlayer,false);g.player.x=enemy.x;g.player.z=enemy.z-4;tick(g,p,5);assert.equal(enemy.foundPlayer,true);g.player.x=20;g.player.z=0;tick(g,p,5);assert.equal(enemy.chaseMode,key==='searchInside'?'inside':'remember');if(key==='searchInside')assert.ok(enemy.roamTarget);else assert.ok(enemy.navigation.stamp.startsWith('search:true:'));}
});
test('速い・ゆっくりの見本は実際の移動速度が違い、左右移動は追跡しない',()=>{
 let distances=[];for(const key of ['patrol','slowPatrol']){const {p,g}=setup(key);tick(g,p);distances.push(g.objects[0].x);assert.equal(g.objects[0].z,0);}assert.ok(Math.abs(distances[0]-distances[1]*2)<.000001);distances=[];for(const key of ['chaseInside','fastChase']){const {p,g}=setup(key);g.player.x=4;tick(g,p);distances.push(g.objects[0].x);}assert.ok(Math.abs(distances[1]-distances[0]*2)<.000001);
});
test('その場で待つ見本は、攻撃のオン・オフをそのまま尊重する',()=>{
 for(const on of [true,false]){const p=fresh3D(),enemy=part('enemy',0,0);enemy.attackEnabled=on;applyEnemyBehaviorExample(enemy,'still');p.objects=[enemy];p.spawn={x:4,y:0,z:0};const g=create3D(p);tick(g,p);assert.equal(g.objects[0].x,0);assert.equal(g.objects[0].z,0);assert.equal(g.bullets.length>0,on);}
});
