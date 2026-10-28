import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh3D,part,create3D,step3D,validate3D} from '../engine3d.js';
import {makeTool,placeBlock,undoStructure,keepStructures,giveBlock,blockTemplate} from '../building3d.js';
import {shootVolley,updateCombat} from '../combat3d.js';
import {LOOT_LIMIT} from '../loot3d.js';
function stage(...objects){const p=fresh3D();p.objects=objects;return p;}
const tick=(g,p,n=1)=>{for(let i=0;i<n;i++)step3D(g,p,{},.02);};
function destroy(g,o){o.hp=0;updateCombat(g,.01);}

test('置いた銃にふれると、その銃を拾い持ち替える。編集データは変えない',()=>{
 const item=part('weapon',0,8),gun=makeTool('shoot','ひろうマシンガン');gun.pickupOnly=true;item.weaponId=gun.id;const p=stage(item);p.loadout.push(gun);const before=JSON.stringify(p),g=create3D(p);
 assert.ok(!g.inventory.includes(gun.id));tick(g,p,3);assert.ok(g.inventory.includes(gun.id));assert.equal(g.equipped,1);assert.ok(g.objects[0].collected);assert.equal(g.inventory.filter(id=>id===gun.id).length,1);assert.equal(JSON.stringify(p),before);
});
test('銃が未指定・削除済みの銃アイテムは勝手に消えない',()=>{
 const p=stage(part('weapon',0,8)),g=create3D(p);tick(g,p);assert.ok(!g.objects[0].collected);g.objects[0].weaponId='deleted';tick(g,p);assert.ok(!g.objects[0].collected);
});
test('未設定の壁・床・屋根・スロープなどは壊れるだけで、アイテムを出さない',()=>{
 for(const type of ['wall','floor','roof','ramp','box','platform','moving']){const p=stage(part(type,0,0)),g=create3D(p);destroy(g,g.objects[0]);assert.equal(g.objects.length,0);assert.equal(g.drops.length,0);}
});
test('アイテム化を設定したブロックは１回だけドロップし、形と元の体力を保つ',()=>{
 for(const type of ['wall','floor','roof','ramp','box','platform','moving']){const block=part(type,0,0);block.hp=7;block.destroyEvents=[{type:'dropSelf'}];const p=stage(block),g=create3D(p),before=JSON.stringify(p);destroy(g,g.objects[0]);updateCombat(g,.01);assert.equal(g.drops.length,1);assert.equal(g.drops[0].type,'blockItem');assert.equal(g.drops[0].blockTemplate.type,type);assert.equal(g.drops[0].blockTemplate.hp,7);assert.equal(JSON.stringify(p),before);}
});
test('拾ったブロックを１個だけ置き直せて、もどすと個数も戻る',()=>{
 const block=part('wall',0,0);block.hp=7;block.destroyEvents=[{type:'dropSelf'}];const p=stage(block),g=create3D(p);destroy(g,g.objects[0]);tick(g,p,20);g.player.z=0;tick(g,p);assert.equal(g.drops.length,0);assert.equal(g.blockInventory[0].count,1);
 g.player.z=8;const result=placeBlock(g,{buildPoint:{x:0,y:0,z:0}});assert.ok(result.valid,result.reason);assert.equal(g.blockInventory[0].count,0);assert.equal(g.objects[0].hp,7);assert.deepEqual(g.objects[0].destroyEvents,[{type:'dropSelf'}]);assert.ok(!placeBlock(g,{buildPoint:{x:4,y:0,z:0}}).valid);assert.equal(g.objects.length,1);
 assert.ok(undoStructure(g));assert.equal(g.objects.length,0);assert.equal(g.blockInventory[0].count,1);
});
test('置けない場所では拾ったブロックの個数を減らさない',()=>{
 const p=fresh3D(),g=create3D(p);giveBlock(g,blockTemplate(part('wall')));const result=placeBlock(g,{buildPoint:{x:100,y:0,z:100}});assert.ok(!result.valid);assert.equal(g.blockInventory[0].count,1);
});
test('置き直した建築を作品に残すときは、プレイ用の印を保存しない',()=>{
 const p=fresh3D(),g=create3D(p),block=part('ramp');block.destroyEvents=[{type:'dropSelf'}];giveBlock(g,blockTemplate(block));assert.ok(placeBlock(g,{buildPoint:{x:0,y:0,z:0}}).valid);assert.equal(keepStructures(p,g),1);assert.equal(p.objects[0].fromBlockItem,undefined);assert.deepEqual(validate3D(p),p);
});
test('壁を撃って壊すと銃が地面に落ち、近づいて初めて拾える',()=>{
 const block=part('wall',0,0),gun=makeTool('shoot','たからの銃');gun.pickupOnly=true;block.hp=1;block.destroyEvents=[{type:'dropWeapon',target:gun.id}];const p=stage(block);p.loadout.push(gun);const g=create3D(p);
 shootVolley(g,{x:0,y:1,z:2},{x:0,y:0,z:-1},makeTool());tick(g,p,40);assert.equal(g.objects.length,0);assert.equal(g.drops.length,1);assert.equal(g.drops[0].type,'weapon');assert.ok(!g.inventory.includes(gun.id));g.player.z=0;tick(g,p);assert.ok(g.inventory.includes(gun.id));assert.equal(g.drops.length,0);
});
test('星・カギ・回復のドロップも、拾ったときだけ効果が起きる',()=>{
 const block=part('box');block.destroyEvents=[{type:'dropItem',target:'star'},{type:'dropItem',target:'key'},{type:'dropItem',target:'heal'}];const p=stage(block),g=create3D(p);g.player.hp=3;destroy(g,g.objects[0]);tick(g,p,20);assert.equal(g.stars,0);assert.equal(g.keys,0);assert.equal(g.drops.length,3);g.player.x=block.x;g.player.z=block.z;tick(g,p);assert.equal(g.stars,1);assert.equal(g.keys,1);assert.equal(g.player.hp,4);assert.equal(g.drops.length,0);
});
test('集中爆発でもドロップを重複実行せず、地面のアイテム数に上限がある',()=>{
 const p=fresh3D();p.objects=Array.from({length:100},()=>{const o=part('wall',0,0);o.hp=1;o.destroyEvents=[{type:'dropSelf'}];return o;});const g=create3D(p);shootVolley(g,{x:0,y:1,z:2},{x:0,y:0,z:-1},{...makeTool(),impacts:['explode'],damage:30,blastRadius:6,spread:8});tick(g,p,10);assert.equal(g.objects.length,0);assert.equal(g.drops.length,LOOT_LIMIT);assert.equal(new Set(g.drops.map(o=>o.id)).size,LOOT_LIMIT);tick(g,p,10);assert.equal(g.drops.length,LOOT_LIMIT);
});
test('拾ったアイテム・ブロックの持ちものは、遊び直すと元へ戻る',()=>{
 const block=part('wall');block.destroyEvents=[{type:'dropSelf'}];const p=stage(block),g=create3D(p);destroy(g,g.objects[0]);tick(g,p,20);g.player.x=block.x;g.player.z=block.z;tick(g,p);assert.equal(g.blockInventory[0].count,1);const retry=create3D(p);assert.equal(retry.drops.length,0);assert.equal(retry.blockInventory.length,0);assert.equal(retry.objects.length,1);
});
test('銃と破壊イベントを保存でき、不正なイベントや対象の型を拒否する',()=>{
 const gun=part('weapon'),block=part('floor'),p=stage(gun,block);gun.weaponId=p.loadout[0].id;block.destroyEvents=[{type:'dropSelf'},{type:'dropWeapon',target:p.loadout[0].id}];assert.deepEqual(validate3D(JSON.parse(JSON.stringify(p))),p);
 for(const events of [null,[{type:'unknown'}],[{type:'dropWeapon',target:123}],[{type:'dropItem',target:'enemy'}],Array(7).fill({type:'dropSelf'})]){const invalid=structuredClone(p);invalid.objects[1].destroyEvents=events;assert.throws(()=>validate3D(invalid));}
 const bad=structuredClone(p);bad.objects[0].destroyEvents=[{type:'dropSelf'}];assert.throws(()=>validate3D(bad));bad.objects[0].destroyEvents=undefined;bad.objects[0].weaponId=123;assert.throws(()=>validate3D(bad));
});
test('ブロックの持ちものは８種類・99個までで、空いた枠を使い直せる',()=>{
 const g=create3D(fresh3D()),t=blockTemplate(part('wall'));for(let i=0;i<99;i++)assert.ok(giveBlock(g,t));assert.ok(!giveBlock(g,t));assert.equal(g.blockInventory[0].count,99);
 for(let hp=2;hp<=8;hp++)assert.ok(giveBlock(g,{...t,hp}));assert.equal(g.blockInventory.length,8);assert.ok(!giveBlock(g,{...t,hp:9}));g.blockInventory[0].count=0;assert.ok(giveBlock(g,{...t,hp:9}));assert.equal(g.blockInventory.length,8);
});
test('こわれないブロックには、破壊イベントを設定してもドロップしない',()=>{
 const block=part('wall',0,0);block.destructible=false;block.hp=1;block.destroyEvents=[{type:'dropSelf'}];const p=stage(block),g=create3D(p);shootVolley(g,{x:0,y:1,z:2},{x:0,y:0,z:-1},{...makeTool(),damage:30});tick(g,p,20);assert.equal(g.objects.length,1);assert.equal(g.drops.length,0);
});
test('落とすアイテムの選択途中の空欄でも作品を読み直せる',()=>{
 const block=part('floor');block.destroyEvents=[{type:'dropItem',target:''}];const p=validate3D(stage(block)),g=create3D(p);destroy(g,g.objects[0]);assert.equal(g.drops.length,0);
});
