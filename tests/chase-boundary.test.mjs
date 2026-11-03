import test from 'node:test';import assert from 'node:assert/strict';
import {part,fresh3D,create3D,step3D} from '../engine3d.js';
import {setEnemyRoutineChoice} from '../enemy-behavior-presets3d.js';
import {enemyMessageState} from '../enemy-messages3d.js';
function setup(target={x:2,z:0}){const p=fresh3D(),e=part('enemy',0,0);e.attackEnabled=false;setEnemyRoutineChoice(e,{idle:'path',notice:'near'});e.moveRange={space:'world',cells:[]};for(let x=-3;x<=3;x++)for(let z=-3;z<=3;z++)e.moveRange.cells.push([x,z]);e.searchRange=structuredClone(e.moveRange);p.objects=[e];p.spawn={...target,y:0};return {p,g:create3D(p)};}
const tick=(g,p,n)=>{for(let i=0;i<n;i++)step3D(g,p,{},.02);};
for(const target of [{x:2,z:0},{x:-2,z:0},{x:0,z:2},{x:0,z:-2},{x:2,z:2},{x:6,z:2},{x:-6,z:-2}])test('つながったマスの境目にいるプレイヤーまで追う：'+JSON.stringify(target),()=>{const {p,g}=setup(target);tick(g,p,500);const e=g.objects[0];assert.ok(Math.hypot(e.x-target.x,e.z-target.z)<.05);assert.equal(e.debugBlocked,'');});
test('マスの境目から同じマス内で動いても追跡が止まらない',()=>{const {p,g}=setup();tick(g,p,2);g.player.x=2.2;tick(g,p,200);assert.ok(Math.abs(g.objects[0].x-2.2)<.05);});
for(const [reason,cells]of [['outside',[[1,0]]],['disconnected',[[0,0],[2,0]]],['edge',[[0,0]]]])test('進めない理由を表示する：'+reason,()=>{const {p}=setup({x:8,z:0});p.objects[0].moveRange.cells=cells;const g=create3D(p);tick(g,p,250);assert.equal(g.objects[0].debugBlocked,reason);assert.notEqual(enemyMessageState(g.objects[0],g.player).text,'おいかけている');});
test('つながっていてもブロックにふさがれたら止まる理由を表示する',()=>{const {p}=setup({x:12,z:0});p.objects.push(part('box',4,0));const g=create3D(p);tick(g,p,250);assert.equal(g.objects[0].debugBlocked,'obstacle');assert.ok(g.objects[0].x<2);assert.equal(enemyMessageState(g.objects[0],g.player).text,'かべ・ブロックですすめないよ');});
