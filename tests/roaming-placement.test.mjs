import test from 'node:test';import assert from 'node:assert/strict';
import {fitRoamingEnemy,inGridRange} from '../enemy-range3d.js';
function enemy(){return {x:0,y:6,z:0,facing:90,routine:{idle:'roam',notice:'near',lost:'resume'},moveRange:{space:'world',cells:[[4,0],[2,0],[3,0]]}};}
test('歩き回る敵は最寄りのエリア内マスに収まり、高さと向きを保つ',()=>{const e=enemy();assert.equal(fitRoamingEnemy(e,{worldSize:60}),true);assert.deepEqual({x:e.x,y:e.y,z:e.z,facing:e.facing},{x:8,y:6,z:0,facing:90});assert.ok(inGridRange(e.moveRange,{x:0,z:0},e));});
test('すでにエリア内ならマスの中心へ動かさず、その位置を保つ',()=>{const e=enemy();e.x=9.1;e.z=.7;const before=structuredClone(e);assert.equal(fitRoamingEnemy(e,60),false);assert.deepEqual(e,before);});
test('空のエリア・制限なし・別の行動は勝手に動かさない',()=>{for(const patch of [{moveRange:undefined},{moveRange:{space:'world',cells:[]}},{routine:{idle:'patrol',notice:'near'}},{routine:{idle:'path',notice:'near'}},{routine:{idle:'roam',notice:'always'}}]){const e={...enemy(),...patch},before=structuredClone(e);assert.equal(fitRoamingEnemy(e,60),false);assert.deepEqual(e,before);}});
test('広いマップの端の半分のマスでもマップ内へ配置する',()=>{const e=enemy();e.moveRange.cells=[[30,30]];assert.equal(fitRoamingEnemy(e,240),true);assert.equal(e.x,118);assert.equal(e.z,118);assert.ok(inGridRange(e.moveRange,{x:0,z:0},e));});
