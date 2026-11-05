import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh3D,part,validate3D,create3D} from '../engine3d.js';
import {shootVolley,updateCombat} from '../combat3d.js';
for(const scale of [3,9.5,10])test(scale+'倍のボスを保存し、頭の高さで弾が当たる',()=>{
 const p=fresh3D(),boss=part('enemy',0,0);Object.assign(boss,{hp:500,enemyScale:scale,w:2*scale,h:2*scale,d:2*scale});p.objects=[boss];
 const g=create3D(validate3D(JSON.parse(JSON.stringify(p))));
 shootVolley(g,{x:.45*scale,y:1.65*scale,z:.5*scale},{x:0,y:0,z:-1},{speed:40,damage:5});updateCombat(g,.033);
 assert.equal(g.objects[0].hp,495);assert.equal(boss.hp,500);
 boss.hp=501;assert.throws(()=>validate3D(p));
});
