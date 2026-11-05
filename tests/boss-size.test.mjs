import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh3D,part,validate3D,create3D} from '../engine3d.js';
import {shootVolley,updateCombat} from '../combat3d.js';
test('体力500の三倍ボスを保存し、頭の高さで弾が当たる',()=>{
 const p=fresh3D(),boss=part('enemy',0,0);Object.assign(boss,{hp:500,enemyScale:3,w:6,h:6,d:6});p.objects=[boss];
 const g=create3D(validate3D(JSON.parse(JSON.stringify(p))));
 shootVolley(g,{x:1.4,y:4.9,z:1.6},{x:0,y:0,z:-1},{speed:40,damage:5});updateCombat(g,.033);
 assert.equal(g.objects[0].hp,495);assert.equal(boss.hp,500);
 boss.hp=501;assert.throws(()=>validate3D(p));
});
