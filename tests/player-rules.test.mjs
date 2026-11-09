import test from 'node:test';import assert from 'node:assert/strict';
import {fresh3D,create3D,step3D,validate3D,part} from '../engine3d.js';
test('作品の性能を移動・ジャンプ・回復・復活へ反映する',()=>{
 const p=fresh3D();p.playerRules={hp:40,speed:10,jumpHeight:3};p.loadout[0].pickupOnly=true;
 const g=create3D(validate3D(p));assert.equal(g.player.hp,40);assert.equal(g.inventory.length,0);
 const start=g.player.x;step3D(g,p,{x:1,jump:true},.02);assert.ok(Math.abs(g.player.x-start-.2)<1e-6);assert.ok(g.player.vy>10);
 g.player.hp=0;g.checkpoint={x:0,y:0,z:0};step3D(g,p,{},.02);assert.equal(g.player.hp,40);
 g.player.hp=39;const heal=part('heal',g.player.x,g.player.z);heal.events=[{type:'heal',amount:20}];g.objects.push(heal);step3D(g,p,{},.02);assert.equal(g.player.hp,40);
});
