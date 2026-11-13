import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh3D,part,validate3D,create3D,step3D,WEAPON_PRESETS} from '../engine3d.js';
import {makeTool,constructionPart} from '../building3d.js';
import {initializeCharacterDefaults,inheritNewCharacter,synchronizeCharacterDefaults} from '../character-defaults3d.js';
import {prepareEnemyDropWeapon,dropEnemyLoot} from '../enemy-loot3d.js';
import {fireDestructionEvents} from '../events3d.js';
test('新しい作品と銃は反動・ブレ・サプレッサー・味方への当たり方を体験できる',()=>{
 const p=fresh3D();assert.equal(p.objects.length,0);assert.equal(p.playerHitsAlly,true);for(const gun of [p.loadout[0],makeTool()]){assert.equal(gun.recoil,1);assert.equal(gun.aimJitter,1);assert.equal(gun.appearance.suppressor,true);}assert.equal(WEAPON_PRESETS.standard.recoil,1);assert.equal(WEAPON_PRESETS.standard.aimJitter,1);assert.ok(validate3D(p));
});
test('新しい敵は近づくと追いかけ、倒れると持つ銃と星を落とす',()=>{
 const p=fresh3D();p.spawn={x:0,y:0,z:-4};initializeCharacterDefaults(p,part);const enemy=inheritNewCharacter(p,part('enemy',0,0));prepareEnemyDropWeapon(p,enemy);p.objects.push(enemy);synchronizeCharacterDefaults(p);assert.ok(p.loadout.some(t=>t.id===enemy.enemyWeaponId));assert.equal(p.loadout.filter(t=>!t.pickupOnly).length,1);assert.deepEqual(enemy.routine,{idle:'wait',notice:'near',lost:'return'});assert.equal(enemy.dropHeldWeapon,true);assert.deepEqual(enemy.enemyDrops,[{type:'star'}]);const before=JSON.stringify(p),g=create3D(p);step3D(g,p,{},.02);assert.ok(g.objects[0].z<0);assert.ok(g.bullets.some(b=>b.enemy));dropEnemyLoot(g,g.objects[0]);assert.deepEqual(g.drops.map(o=>o.type),['weapon','star']);assert.equal(JSON.stringify(p),before);assert.ok(validate3D(p));
});
test('敵の銃は使い回して８種類の上限を超えず、指定済みの銃は変えない',()=>{
 const p=fresh3D(),first=part('enemy'),next=part('enemy');prepareEnemyDropWeapon(p,first);prepareEnemyDropWeapon(p,next);assert.equal(p.loadout.length,2);assert.equal(first.enemyWeaponId,next.enemyWeaponId);const assigned=part('enemy');assigned.enemyWeaponId=p.loadout[0].id;prepareEnemyDropWeapon(p,assigned);assert.equal(assigned.enemyWeaponId,p.loadout[0].id);p.loadout=Array.from({length:8},()=>makeTool());const full=part('enemy');prepareEnemyDropWeapon(p,full);assert.equal(p.loadout.length,8);assert.equal(full.enemyWeaponId,p.loadout[0].id);
});
test('新しい全種類の建築ブロックと建築銃のブロックは壊すとアイテムになる',()=>{
 for(const block of [...['box','platform','moving','wall','floor','roof','ramp'].map(t=>part(t)),constructionPart('wall')]){const g=create3D(fresh3D());assert.deepEqual(block.destroyEvents,[{type:'dropSelf'}]);fireDestructionEvents(g,block);assert.equal(g.drops.length,1);assert.equal(g.drops[0].type,'blockItem');}
 assert.equal(part('weapon').weaponId,'@random');
});
test('保存したなし・オフと以前の動かない敵を読み込み時に有効へ書き換えない',()=>{
 const p=fresh3D(),enemy=part('enemy'),wall=part('wall');p.playerHitsAlly=false;Object.assign(p.loadout[0],{recoil:0,aimJitter:0,appearance:{...p.loadout[0].appearance,suppressor:false}});Object.assign(enemy,{program:[],routine:{idle:'wait',notice:'none',lost:'resume'},attackEnabled:false,dropHeldWeapon:false,enemyDrops:[]});wall.destroyEvents=[];p.objects=[enemy,wall];const saved=validate3D(JSON.parse(JSON.stringify(p)));initializeCharacterDefaults(saved,part);const e=saved.objects[0];assert.equal(saved.playerHitsAlly,false);assert.equal(saved.loadout[0].recoil,0);assert.equal(saved.loadout[0].aimJitter,0);assert.equal(saved.loadout[0].appearance.suppressor,false);assert.equal(e.routine.notice,'none');assert.deepEqual(e.program,[]);assert.equal(e.attackEnabled,false);assert.equal(e.dropHeldWeapon,false);assert.deepEqual(e.enemyDrops,[]);assert.deepEqual(saved.objects[1].destroyEvents,[]);
 delete enemy.routine;delete enemy.dropHeldWeapon;delete enemy.enemyDrops;delete wall.destroyEvents;const old=validate3D(JSON.parse(JSON.stringify(p)));initializeCharacterDefaults(old,part);assert.deepEqual(old.objects[0].program,[]);assert.equal(old.objects[0].dropHeldWeapon,undefined);assert.equal(old.objects[0].enemyDrops,undefined);assert.equal(old.objects[1].destroyEvents,undefined);
});

test('以前のぜんたい設定の動かないプログラムを新しい気づく設定で上書きしない',()=>{
 const p=fresh3D(),enemy=part('enemy');enemy.program=[];delete enemy.routine;p.characterDefaults={enemy:{hp:3,program:[],attackEnabled:false,dropHeldWeapon:false,enemyDrops:[]},ally:{hp:3}};p.objects=[enemy];initializeCharacterDefaults(p,part);assert.equal(p.characterDefaults.enemy.routine,undefined);const next=inheritNewCharacter(p,part('enemy'));assert.equal(next.routine,undefined);assert.deepEqual(next.program,[]);assert.equal(next.dropHeldWeapon,false);assert.deepEqual(next.enemyDrops,[]);
});

test('以前の歩き回るぜんたい設定にも新しい待つルールを足さない',()=>{
 const p=fresh3D();p.characterDefaults={enemy:{hp:3,program:[{action:'search',speed:2}],chaseMode:'remember'},ally:{hp:3}};initializeCharacterDefaults(p,part);assert.equal(p.characterDefaults.enemy.routine,undefined);const next=inheritNewCharacter(p,part('enemy'));assert.equal(next.routine,undefined);assert.equal(next.chaseMode,'remember');assert.deepEqual(next.program,[{action:'search',speed:2}]);
});
