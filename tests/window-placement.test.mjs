import test from 'node:test';
import assert from 'node:assert/strict';
import {part,fresh3D,validate3D} from '../engine3d.js';
import {configureDoor} from '../doors3d.js';
import {snapEditorPiece,constructionPart,editorPlacementReason,rotatePiece} from '../building3d.js';
const spawn={x:20,y:0,z:20};
for(const key of ['windowFrame','windowGlass','windowSwing'])for(const rotation of [0,90]){
 test(`${key} ${rotation}度: 壁や窓の上端をどこから押しても真上に重ねられる`,()=>{
  for(const type of ['wall','window'])for(const edge of [-1.99,0,1.99]){
   const target=type==='wall'?constructionPart('wall',0,2):configureDoor(part('door',0,2),key);if(rotation)rotatePiece(target);target.y=3;
   const point={x:target.x+(rotation?.11:edge),y:6,z:target.z+(rotation?edge:.11)},piece=snapEditorPiece(configureDoor(part('door'),key),point,target,{x:0,y:1,z:0});
   assert.equal(piece.rotation,rotation);assert.equal(piece.x,target.x);assert.equal(piece.z,target.z);assert.equal(piece.y,6);assert.equal(editorPlacementReason(piece,[target],spawn),'');const p=fresh3D();p.objects=[target,piece];assert.ok(validate3D(p));
  }
 });
 test(`${key} ${rotation}度: 壁の広い面の端と側面から隣にそろえて置ける`,()=>{
  for(const sign of [-1,1])for(const endFace of [true,false]){
   const wall=constructionPart('wall',0,2);if(rotation)rotatePiece(wall);const axis=rotation?'z':'x',normalAxis=rotation?'x':'z',point={x:wall.x,y:1.5,z:wall.z},normal={x:0,y:0,z:0};point[axis]+=sign*(endFace?2:1.8);point[normalAxis]+=(endFace?0:.125);normal[endFace?axis:normalAxis]=endFace?sign:1;
   const piece=snapEditorPiece(configureDoor(part('door'),key),point,wall,normal);assert.equal(piece.rotation,rotation);assert.equal(piece[axis],wall[axis]+sign*4);assert.equal(piece[normalAxis],wall[normalAxis]);assert.equal(editorPlacementReason(piece,[wall],spawn),'');
  }
 });
 test(`${key} ${rotation}度: 壁や窓とのL字の角で枠同士を接続できる`,()=>{
  const wall=constructionPart('wall',0,2),window=configureDoor(part('door',2,0),key);rotatePiece(window);window.x=2;window.z=0;
  if(rotation){rotatePiece(wall);rotatePiece(window);}assert.equal(editorPlacementReason(window,[wall],spawn),'');
 });
}
test('窓を置く操作で同じマスへの重ね置きや、壁を横切る配置は許可しない',()=>{
 const wall=constructionPart('wall',0,2),window=configureDoor(part('door',0,2),'windowGlass');assert.notEqual(editorPlacementReason(window,[wall],spawn),'');rotatePiece(window);window.x=0;window.z=2;assert.notEqual(editorPlacementReason(window,[wall],spawn),'');
});
