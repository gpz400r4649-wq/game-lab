import test from 'node:test';
import assert from 'node:assert/strict';
import {constructionPart,snapEditorPiece,editorPlacementReason,gridStep,makeTool,placement} from '../building3d.js';
import {configureBuildingPart} from '../architecture3d.js';
const spawn={x:24,y:0,z:24},up={x:0,y:1,z:0};
test('床の上面の広い端から四方向へ、同じ階でつなげる',()=>{
 for(const y of [0,3,6,57])for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
  const floor=constructionPart('floor',-4,4,y),point={x:floor.x+dx*1.3,y:y+.25,z:floor.z+dz*1.3};
  const next=snapEditorPiece(constructionPart('floor'),point,floor,up);
  assert.deepEqual([next.x,next.y,next.z],[floor.x+dx*4,y,floor.z+dz*4]);assert.equal(editorPlacementReason(next,[floor],spawn),'');
 }
});
test('床の中央では勝手に隣へずらさず、重複を知らせる',()=>{
 const floor=constructionPart('floor',0,0,6),next=snapEditorPiece(constructionPart('floor'),{x:.2,y:6.25,z:.2},floor,up);
 assert.equal(next.x,0);assert.equal(next.z,0);assert.ok(editorPlacementReason(next,[floor],spawn));
});
test('ふつうの床とハーフ床は半段の壁につながり、移動も1.5m刻みになる',()=>{
 const wall={...constructionPart('wall',0,2,3),wallHalf:'halfHorizontal',h:1.5};
 const game={objects:[wall],player:{x:8,y:3,z:0}};
 const point={x:1,y:4.5,z:2};
 for(const type of ['floor','halfFloor']){
  const piece=snapEditorPiece(constructionPart(type),point,wall,up);
  assert.equal(gridStep(piece,'y'),1.5);
  assert.equal(piece.y,4.5);
  assert.equal(editorPlacementReason(piece,[wall],spawn),'');
  const testRun=placement(game,makeTool(type),{...point,surface:wall,normal:up});
  assert.ok(testRun.valid,testRun.reason);
  assert.equal(testRun.piece.y,piece.y);
 }
});
test('床の側面や下面の端をねらっても、つないだ床が板1枚ぶん下がらない',()=>{
 for(const y of [1.5,4.25])for(const normal of [up,{x:1,y:0,z:0},{x:0,y:-1,z:0}]){
  const target=constructionPart('floor',0,0,y);
  const point={x:1.95,y:y+(normal.y>0?.25:0),z:0};
  const next=snapEditorPiece(constructionPart('floor'),point,target,normal);
  assert.deepEqual([next.x,next.y,next.z],[4,y,0]);
  assert.equal(editorPlacementReason(next,[target],spawn),'');
  const game={objects:[target],player:{x:-5,y,z:0}};
  const testRun=placement(game,makeTool('floor'),{...point,surface:target,normal});
  assert.ok(testRun.valid,testRun.reason);
  assert.deepEqual([testRun.piece.x,testRun.piece.y,testRun.piece.z],[4,y,0]);
 }
});
test('薄い壁の上面は端を押しても下と同じ向き・位置で積める',()=>{
 for(const rotation of [0,90])for(const y of [0,3,6,54])for(const offset of [-1.95,0,1.95]){
  const wall=constructionPart('wall',rotation===90?2:0,rotation===0?2:0,y,rotation);
  const next=snapEditorPiece(constructionPart('wall'),{x:wall.x+(rotation===0?offset:0),y:y+3,z:wall.z+(rotation===90?offset:0)},wall,up);
  assert.deepEqual([next.x,next.y,next.z,next.rotation],[wall.x,y+3,wall.z,rotation]);assert.equal(editorPlacementReason(next,[wall],spawn),'');
 }
});
test('壁の端は別の壁の途中にT字でつながり、互いに突き抜ける配置は拒否する',()=>{
 const existing=constructionPart('wall',0,0,0,90);
 const end=constructionPart('wall',2,0);
 assert.equal(editorPlacementReason(end,[existing],spawn),'');
 assert.equal(editorPlacementReason(existing,[end],spawn),'');
 assert.notEqual(editorPlacementReason({...end,x:0},[existing],spawn),'');
 assert.notEqual(editorPlacementReason({...end,x:1},[existing],spawn),'');
});
test('半段の床の端に小さな壁を置くと、高さと既存の壁とのつなぎ目がそろう',()=>{
 const floor=constructionPart('halfFloor',1,0,1.5);
 const wall=configureBuildingPart(constructionPart('wall'),'quarterWall');
 const next=snapEditorPiece(wall,{x:1,y:1.75,z:1.92},floor,up);
 assert.deepEqual([next.x,next.y,next.z,next.rotation],[1,1.5,2,0]);
 const side=constructionPart('wall',0,2,1.5,90);
 assert.equal(editorPlacementReason(next,[floor,side],spawn),'');
});
test('床の延長は既存の部品・マップ外への配置を許さない',()=>{
 const floor=constructionPart('floor',24,0,0),next=snapEditorPiece(constructionPart('floor'),{x:25.5,y:.25,z:0},floor,up);
 assert.equal(next.x,28);assert.equal(editorPlacementReason(next,[floor,next],spawn).length>0,true);
 const edge=snapEditorPiece(constructionPart('floor'),{x:29.5,y:.25,z:0},next,up);assert.ok(editorPlacementReason(edge,[floor,next],spawn));
});
