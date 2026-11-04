import test from 'node:test';
import assert from 'node:assert/strict';
import {constructionPart,snapEditorPiece,editorPlacementReason} from '../building3d.js';
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
test('薄い壁の上面は端を押しても下と同じ向き・位置で積める',()=>{
 for(const rotation of [0,90])for(const y of [0,3,6,54])for(const offset of [-1.95,0,1.95]){
  const wall=constructionPart('wall',rotation===90?2:0,rotation===0?2:0,y,rotation);
  const next=snapEditorPiece(constructionPart('wall'),{x:wall.x+(rotation===0?offset:0),y:y+3,z:wall.z+(rotation===90?offset:0)},wall,up);
  assert.deepEqual([next.x,next.y,next.z,next.rotation],[wall.x,y+3,wall.z,rotation]);assert.equal(editorPlacementReason(next,[wall],spawn),'');
 }
});
test('床の延長は既存の部品・マップ外への配置を許さない',()=>{
 const floor=constructionPart('floor',24,0,0),next=snapEditorPiece(constructionPart('floor'),{x:25.5,y:.25,z:0},floor,up);
 assert.equal(next.x,28);assert.equal(editorPlacementReason(next,[floor,next],spawn).length>0,true);
 const edge=snapEditorPiece(constructionPart('floor'),{x:29.5,y:.25,z:0},next,up);assert.ok(editorPlacementReason(edge,[floor,next],spawn));
});
