import test from 'node:test';import assert from 'node:assert/strict';
import {fresh3D,part,create3D,step3D,validate3D} from '../engine3d.js';
import {dropEnemyLoot} from '../enemy-loot3d.js';
test('倒された敵は持つ銃と追加の銃・経験値・鍵を一度だけ落とす',()=>{const p=fresh3D(),e=part('enemy',8,0);e.dropHeldWeapon=true;e.enemyWeaponId=p.loadout[0].id;e.enemyDrops=[{type:'weapon',weaponId:e.enemyWeaponId},{type:'experience'},{type:'key'}];p.objects=[e];const g=create3D(p),r=g.objects[0];r.hp=0;step3D(g,p,{},.02);assert.equal(g.drops.length,4);assert.equal(g.drops.filter(o=>o.type==='weapon').length,2);dropEnemyLoot(g,r);assert.equal(g.drops.length,4);assert.equal(p.objects[0].hp,3);assert.equal(p.objects[0].lootDropped,undefined);});
test('経験値・鍵・同じ銃を拾えて、元の作品は変えない',()=>{const p=fresh3D(),g=create3D(p),id=p.loadout[0].id;dropEnemyLoot(g,{x:0,y:0,z:0,h:2,enemyDrops:[{type:'experience'},{type:'key'},{type:'weapon',weaponId:id}]});for(const o of g.drops)Object.assign(o,{x:g.player.x,z:g.player.z,y:0,pickupAt:0});step3D(g,p,{},.02);assert.equal(g.stars,1);assert.equal(g.keys,1);assert.equal(g.inventoryCounts[id],2);assert.equal(g.drops.length,0);assert.equal(create3D(p).stars,0);});
test('未設定では落とさず、削除された銃を出さず、64個上限を守る',()=>{const g=create3D(fresh3D()),source={x:0,y:0,z:0,h:2};dropEnemyLoot(g,{...source});assert.equal(g.drops.length,0);dropEnemyLoot(g,{...source,enemyDrops:[{type:'weapon',weaponId:'missing'}]});assert.equal(g.drops.length,0);for(let i=0;i<20;i++)dropEnemyLoot(g,{...source,enemyDrops:Array.from({length:6},()=>({type:'key'}))});assert.equal(g.drops.length,64);});
test('落とす設定を保存し、不正な種類や多すぎる件数を拒否する',()=>{const p=fresh3D(),e=part('enemy');p.objects=[e];e.dropHeldWeapon=true;e.enemyDrops=[{type:'experience'},{type:'key'}];assert.equal(validate3D(p).objects[0].enemyDrops[0].type,'star');e.enemyDrops=[{type:'bad'}];assert.throws(()=>validate3D(p));e.enemyDrops=Array.from({length:7},()=>({type:'key'}));assert.throws(()=>validate3D(p));});
test('ランダム銃は所持済みだけでも拾え、１個だけ増える',()=>{const p=fresh3D(),gun=p.loadout[0],item=part('weapon',p.spawn.x,p.spawn.z);item.weaponId='@random';p.objects=[item];const g=create3D(validate3D(p));step3D(g,p,{},.02);assert.equal(g.inventoryCounts[gun.id],2);step3D(g,p,{},.02);assert.equal(g.inventoryCounts[gun.id],2);assert.equal(item.weaponId,'@random');});
test('ランダムで拾った建築銃を装備して壁を建てられる',()=>{
 const p=fresh3D(),gun=p.loadout[0];
 Object.assign(gun,{effect:'wall',pickupOnly:true});
 const item=part('weapon',p.spawn.x,p.spawn.z);item.weaponId='@random';p.objects=[item];
 const g=create3D(validate3D(p));step3D(g,p,{},.02);
 assert.equal(g.inventoryCounts[gun.id],1);
 step3D(g,p,{fire:true,buildPoint:{x:4,y:0,z:g.player.z}},.02);
 assert.equal(g.buildings[0]?.type,'wall');
});
