import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh3D,part,create3D,step3D,validate3D,solids} from '../engine3d.js';
import {makeTool,equipTool} from '../building3d.js';
import {shootVolley,updateCombat} from '../combat3d.js';
import {EVENT_LIMIT} from '../events3d.js';
function stage(...objects){const p=fresh3D();p.spawn={x:0,y:0,z:0};p.objects=objects;return p;}
const tick=(g,p,n=1)=>{for(let i=0;i<n;i++)step3D(g,p,{},.02);};

test('星を拾って、作った銃と待機中の敵を同時に有効にする',()=>{
  const item=part('star',0,0),enemy=part('enemy',7,0),gun=makeTool('shoot','ロケットくん');
  enemy.startsHidden=true;enemy.program=[{action:'chase',speed:2}];gun.pickupOnly=true;
  item.events=[{type:'giveTool',target:gun.id},{type:'spawnEnemy',target:enemy.id}];
  const p=stage(item,enemy);p.loadout.push(gun);const original=JSON.stringify(p),g=create3D(p);
  assert.equal(equipTool(g,p,1),false);assert.ok(g.objects[1].hidden);
  tick(g,p);assert.equal(g.equipped,1);assert.ok(g.inventory.includes(gun.id));assert.equal(g.objects[1].hidden,false);
  const x=g.objects[1].x;tick(g,p,100);assert.ok(g.objects[1].x<x);assert.equal(g.objects.length,2);assert.equal(g.inventory.length,2);
  assert.equal(g.stars,0);assert.equal(g.score,0);assert.equal(JSON.stringify(p),original);
});
test('カギの元の役割に、特定のドアを開くイベントを追加できる',()=>{
  const key=part('key',0,0),door=part('door',0,-5);door.settings.condition='unset';key.events=[{type:'addKey'},{type:'openDoor',target:door.id}];
  const p=stage(door,key),g=create3D(p);tick(g,p,50);assert.equal(g.keys,1);assert.ok(g.objects[0].open);assert.ok(!solids(g.objects).includes(g.objects[0]));
});
test('ドアの役割を回復に置き換えると、条件を満たしても勝手に開かない',()=>{
  const door=part('door',8,0);door.settings.condition='keys';door.events=[{type:'heal',amount:2}];const p=stage(door,part('key',0,0)),g=create3D(p);g.player.hp=1;
  tick(g,p,10);assert.equal(g.player.hp,3);assert.ok(!g.objects[0].open);assert.equal(g.keys,1);
});
test('回復に銃を拾う役割を加えると、満タンでも拾えて１回だけ起きる',()=>{
  const heal=part('heal',0,0),p=stage(heal),gun=makeTool();gun.pickupOnly=true;p.loadout.push(gun);heal.events=[{type:'heal',amount:3},{type:'giveTool',target:gun.id}];
  const g=create3D(p);tick(g,p,10);assert.equal(g.player.hp,5);assert.ok(g.objects[0].collected);assert.equal(g.inventory.length,2);
});
test('何も起こさないアイテムも取れて消える',()=>{
  const key=part('key',0,0);key.events=[];const p=stage(key),g=create3D(p);tick(g,p,10);assert.ok(g.objects[0].collected);assert.equal(g.keys,0);
});
test('中間地点とゴールも役割を変えたりイベントを追加できる',()=>{
  const checkpoint=part('checkpoint',0,0),goal=part('goal',5,0);
  checkpoint.events=[{type:'checkpoint'},{type:'addScore',amount:3}];goal.settings.condition='touch';goal.events=[{type:'addKey'}];
  const p=stage(checkpoint,goal),g=create3D(p);tick(g,p,20);assert.equal(g.score,3);assert.equal(g.checkpoint.id,checkpoint.id);
  g.player.x=5;tick(g,p,20);assert.equal(g.keys,1);assert.equal(g.state,'playing');
});
test('待機中の敵は動かず攻撃もせず、直撃・爆発でも傷つかない',()=>{
  const enemy=part('enemy',0,-3);enemy.startsHidden=true;enemy.program=[{action:'chase',speed:3},{action:'shoot',speed:3}];
  const p=stage(enemy),g=create3D(p);tick(g,p,30);assert.equal(g.player.hp,5);assert.equal(g.objects[0].z,-3);assert.equal(g.bullets.length,0);
  for(const impact of ['damage','explode']){shootVolley(g,{x:0,y:1,z:0},{x:0,y:0,z:-1},{damage:30,impact,blastRadius:6});for(let i=0;i<40;i++)updateCombat(g,.02);}
  assert.equal(g.objects[0].hp,3);assert.ok(g.objects[0].hidden);
});
test('敵が出現した後は射撃と撃破が有効になる',()=>{
  const enemy=part('enemy',0,-3),key=part('key',0,0);enemy.startsHidden=true;enemy.hp=1;key.events=[{type:'spawnEnemy',target:enemy.id}];
  const p=stage(enemy,key),g=create3D(p);tick(g,p);shootVolley(g,{x:0,y:1,z:0},{x:0,y:0,z:-1},{damage:1});for(let i=0;i<40;i++)updateCombat(g,.02);
  assert.ok(!g.objects.some(x=>x.id===enemy.id));assert.equal(g.score,10);
});
test('出現待ちの敵が残っていると全滅ゴールをクリアできない',()=>{
  const enemy=part('enemy',8,-8),goal=part('goal',0,0);enemy.startsHidden=true;goal.settings.condition='enemies';const p=stage(enemy,goal),g=create3D(p);tick(g,p);assert.equal(g.state,'playing');
});
test('全部の銃を拾う設定にしても、拾う前は発射できず安全に動く',()=>{
  const p=stage(part('key',5,0));p.loadout[0].pickupOnly=true;p.objects[0].events=[{type:'giveTool',target:p.loadout[0].id}];const g=create3D(p);
  assert.equal(g.equipped,-1);for(let i=0;i<10;i++)step3D(g,p,{fire:true},.02);assert.equal(g.bullets.length,0);
  g.player.x=5;tick(g,p);assert.equal(g.equipped,0);step3D(g,p,{fire:true},.02);assert.equal(g.bullets.length,1);
});
test('イベントの対象を消しても停止せず、ファイル読込もできる',()=>{
  const key=part('key',0,0);key.events=[{type:'giveTool',target:'deleted'},{type:'spawnEnemy',target:'deleted'},{type:'openDoor',target:''}];
  const p=validate3D(stage(key)),g=create3D(p);assert.doesNotThrow(()=>tick(g,p,30));assert.ok(g.objects[0].collected);
});
test('テストをやり直すと出現待ち・銃・イベントを元に戻す',()=>{
  const key=part('key',0,0),enemy=part('enemy',8,0),p=stage(key,enemy);enemy.startsHidden=true;p.loadout[0].pickupOnly=true;key.events=[{type:'giveTool',target:p.loadout[0].id},{type:'spawnEnemy',target:enemy.id}];
  const g=create3D(p);tick(g,p);assert.equal(g.equipped,0);assert.equal(g.objects[1].hidden,false);
  const retry=create3D(p);assert.equal(retry.equipped,-1);assert.ok(retry.objects[1].hidden);assert.ok(!retry.objects[0].collected);assert.ok(!retry.objects[0].triggered);
});
test('保存読込でイベントを保持し、不正な数・型・件数は拒否する',()=>{
  const key=part('key',0,0),p=stage(key);key.events=[{type:'heal',amount:2}];assert.deepEqual(validate3D(p),p);
  for(const events of [[{type:'eval'}],[{type:'heal',amount:Infinity}],[{type:'heal',amount:0}],[{type:'giveTool',target:3}],Array(EVENT_LIMIT+1).fill({type:'addKey'}),null]){const invalid=structuredClone(p);invalid.objects[0].events=events;assert.throws(()=>validate3D(invalid));}
  p.loadout[0].pickupOnly='yes';assert.throws(()=>validate3D(p));
});
