import test from 'node:test';import assert from 'node:assert/strict';
import {part} from '../engine3d.js';import {dragCandidate} from '../editor-drag3d.js';import {MAX_PARTS} from '../limits3d.js';
test('ドラッグ候補はつかんだ位置の差で移動し、作品や高さ・設定を変更しない',()=>{
 const o=part('enemy',5,2);o.y=3;o.program=[{action:'search',speed:2}];const before=JSON.stringify(o),r=dragCandidate(o,{x:5.3,z:2.4},{x:9.8,z:8.1},[o],null,60);assert.equal(r.piece.x,10);assert.equal(r.piece.z,8);assert.equal(r.piece.y,3);assert.deepEqual(r.piece.program,o.program);assert.equal(JSON.stringify(o),before);
});
test('回した壁も向きと高さを保ち、壁用のグリッドにそろう',()=>{
 const wall=part('wall');Object.assign(wall,{x:2,z:0,y:3,w:.25,d:4,rotation:90});const r=dragCandidate(wall,{x:1.8,z:.1},{x:6.1,z:4.2},[wall],null,60);assert.equal(r.piece.x,6);assert.equal(r.piece.z,4);assert.equal(r.piece.y,3);assert.equal(r.piece.rotation,90);assert.equal(r.reason,'');
});
test('ほかの部品やスタートに重なる候補は無効になり、元の部品は残る',()=>{
 const o=part('box',0,0),block=part('box',4,0),before=JSON.stringify(o);let r=dragCandidate(o,{x:0,z:0},{x:4,z:0},[o,block],null,60);assert.ok(r.reason);r=dragCandidate(o,{x:0,z:0},{x:8,z:0},[o],{x:8,y:0,z:0},60);assert.ok(r.reason);assert.equal(JSON.stringify(o),before);
});
test('マップの外へのドラッグは部品の大きさも含めて端で止まる',()=>{
 const o=part('floor',0,0);const r=dragCandidate(o,{x:0,z:0},{x:999,z:-999},[o],null,240);assert.ok(Math.abs(r.piece.x)+o.w/2<=120);assert.ok(Math.abs(r.piece.z)+o.d/2<=120);assert.equal(r.reason,'');
});
test('2000部品の上限でも、追加ではなく既存部品の移動ならできる',()=>{
 const o=part('floor',0,0),objects=[o,...Array.from({length:MAX_PARTS-1},()=>part('star',20,20))],r=dragCandidate(o,{x:0,z:0},{x:8,z:0},objects,null,60);assert.equal(r.reason,'');assert.equal(objects.length,MAX_PARTS);assert.equal(o.x,0);
});
test('投影できない位置やキャンセル用の空の位置では候補を作らない',()=>{
 const o=part('enemy');assert.equal(dragCandidate(o,{x:0,z:0},null,[o],null,60),null);assert.equal(dragCandidate(o,{x:0,z:0},{x:NaN,z:0},[o],null,60),null);
});
