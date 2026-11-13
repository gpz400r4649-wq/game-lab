import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.min.js';
import {configureBuildingPart,isDiagonal,diagonalContains,diagonalDistance,validArchitecture} from '../architecture3d.js';
import {makeDiagonalWallGeometry} from '../architecture-model3d.js';
import {part,fresh3D,create3D,validate3D,movePlayer} from '../engine3d.js';
import {constructionPart,snapEditorPiece,rotatePiece,editorPlacementReason,makeTool,placement,placeStructure,blockTemplate,giveBlock,placeBlock,keepStructures,selectBuildType} from '../building3d.js';
import {shootVolley,updateCombat,resolveShotOrigin} from '../combat3d.js';
import {createStructureRenderer} from '../structure-render3d.js';
const spawn={x:20,y:0,z:20},wall=(rotation=0)=>constructionPart('diagonal',0,0,0,rotation);
function player(x,z,y=0){return {x,y,z,vy:0,grounded:y===0};}
test('ななめの壁は１マス内の対角線で、２方向とも保存できる',()=>{
 for(const rotation of [0,90]){const o=wall(rotation);assert.equal(o.type,'wall');assert.equal(o.wallStyle,'diagonal');assert.deepEqual([o.w,o.h,o.d],[4,3,4]);assert.ok(validArchitecture(o));const p=fresh3D();p.objects=[o];assert.deepEqual(validate3D(p),p);assert.ok(diagonalContains(o,1,rotation===0?1:-1));assert.equal(diagonalContains(o,1,rotation===0?-1:1),false);assert.ok(diagonalDistance(o,{x:1,z:rotation===0?-1:1})>1);}
 const bad=wall();bad.w=8;assert.equal(validArchitecture(bad),false);bad.w=4;bad.wallHalf='halfHorizontal';assert.equal(validArchitecture(bad),false);
});
test('つくる画面はマスの中心に置き、積み重ね・移動・回転でも中心がずれない',()=>{
 const piece=snapEditorPiece(configureBuildingPart(part('wall'),'diagonal'),{x:.8,y:0,z:.5});assert.deepEqual([piece.x,piece.y,piece.z],[0,0,0]);rotatePiece(piece);assert.deepEqual([piece.x,piece.z,piece.rotation],[0,0,90]);rotatePiece(piece);assert.equal(piece.rotation,0);
 const top=snapEditorPiece(wall(),{x:.1,y:3,z:.1},piece,{x:0,y:1,z:0});assert.deepEqual([top.x,top.y,top.z],[0,3,0]);assert.equal(editorPlacementReason(top,[piece],spawn),'');assert.notEqual(editorPlacementReason(wall(),[piece],spawn),'');
 const next=snapEditorPiece(wall(),{x:1.9,y:1,z:1.5},piece,{x:1,y:0,z:0});assert.deepEqual([next.x,next.z],[4,4]);assert.equal(editorPlacementReason(next,[piece],spawn),'');
});
test('周囲の４枚の壁や足元の床とつなぎ、交差する壁や同じマスのブロックには重ねない',()=>{
 const diagonal=wall(),floor=constructionPart('floor'),edges=[constructionPart('wall',0,2),constructionPart('wall',0,-2),constructionPart('wall',2,0,0,90),constructionPart('wall',-2,0,0,90)];assert.equal(editorPlacementReason(diagonal,[floor,...edges],spawn),'');assert.notEqual(editorPlacementReason(diagonal,[wall(90)],spawn),'');assert.notEqual(editorPlacementReason(diagonal,[part('box',0,0)],spawn),'');assert.equal(editorPlacementReason(diagonal,[],{x:1.3,y:0,z:-1.3}),'');assert.notEqual(editorPlacementReason(diagonal,[],{x:0,y:0,z:0}),'');
});
test('空いた三角部分を歩けるが、両向きのななめの壁は通り抜けない',()=>{
 for(const rotation of [0,90]){const o=wall(rotation),sign=rotation===0?1:-1,body=player(1,-sign);for(let i=0;i<20;i++)movePlayer(body,[o],0,sign*.1,.02,false);assert.ok(sign*body.z<.5);assert.ok(sign*body.z>0);const free=player(1.3,-sign*1.3);movePlayer(free,[o],.1,0,.02,false);assert.ok(free.x>1.3);}
});
test('上に乗る判定も壁の形どおりで、空いた三角部分には空中の床ができない',()=>{
 for(const rotation of [0,90]){const sign=rotation===0?1:-1,o=wall(rotation),on=player(1,sign,5),off=player(1.3,-sign*1.3,5);for(let i=0;i<100;i++){movePlayer(on,[o],0,0,.02,false);movePlayer(off,[o],0,0,.02,false);}assert.equal(on.y,3);assert.equal(off.y,0);}
});
function fireAt(x,z,direction,rotation=0,impacts=['damage']){const p=fresh3D(),o=wall(rotation);o.hp=20;p.objects=[o];const g=create3D(p);shootVolley(g,{x,y:1.5,z},direction,{...makeTool(),aimJitter:0,recoil:0,speed:20,range:6,damage:3,impacts});for(let i=0;i<15;i++){g.time+=.01;updateCombat(g,.01);}return g;}
test('弾は見た目の壁に当たり、空いた三角部分を通り、銃口の遮り判定も一致する',()=>{
 for(const rotation of [0,90]){const sign=rotation===0?1:-1;assert.equal(fireAt(1,-sign*.5,{x:0,y:0,z:sign},rotation).objects[0].hp,17);assert.equal(fireAt(1.3,-sign*1.3,{x:1,y:0,z:0},rotation).objects[0].hp,20);const p=fresh3D();p.objects=[wall(rotation)];const g=create3D(p),free={x:1.3,y:1.5,z:-sign*1.3},end={x:1.7,y:1.5,z:-sign*1.3};assert.deepEqual(resolveShotOrigin(g,free,end),end);const blocked=resolveShotOrigin(g,{x:1,y:1.5,z:-sign},{x:1,y:1.5,z:sign*1.5});assert.ok(sign*blocked.z<1);}
});
test('跳ね返る弾は斜めの壁の法線で方向を変える',()=>{const g=fireAt(0,-1,{x:0,y:0,z:1},0,['bounce']),b=g.bullets[0];assert.ok(b);assert.ok(b.vx>10);assert.ok(Math.abs(b.vz)<.001);});
test('建築銃の斜め壁は向きとマスにそろい、１つの銃でも通常の壁と切り替えられる',()=>{
 const p=fresh3D(),tool=makeTool('diagonal');tool.buildChoices=['diagonal','wall','floor','roof','ramp'];p.loadout.push(tool);assert.ok(validate3D(p));const g=create3D(p);g.equipped=1;
 for(const rotation of [0,90,180,270]){const r=placement(g,tool,{x:.2,y:0,z:.3},rotation);assert.ok(r.valid,r.reason);assert.deepEqual([r.piece.x,r.piece.z],[0,0]);assert.equal(r.piece.rotation,rotation%180);}
 assert.ok(placeStructure(g,p,{buildPoint:{x:0,y:0,z:0},buildRotation:90}).valid);assert.equal(g.buildings[0].rotation,90);assert.equal(keepStructures(p,g),1);assert.ok(isDiagonal(p.objects[0]));assert.ok(selectBuildType(g,p,'wall'));const normal=placement(g,tool,{x:8,y:0,z:0});assert.equal(normal.piece.wallStyle,undefined);assert.equal(normal.piece.z,2);
});
test('壊して拾った斜め壁も同じマスに置け、向き・保存・体力を保つ',()=>{
 const p=fresh3D(),g=create3D(p);giveBlock(g,blockTemplate(wall()));g.blockEquipped=g.blockInventory[0].id;const r=placeBlock(g,{buildPoint:{x:0,y:0,z:0},buildRotation:90});assert.ok(r.valid,r.reason);assert.ok(isDiagonal(r.piece));assert.deepEqual([r.piece.x,r.piece.z,r.piece.rotation],[0,0,90]);keepStructures(p,g);assert.equal(p.objects[0].hp,20);assert.ok(validate3D(p));
});
test('実際の表示・選択用の形と描画バッチが２方向で一致する',()=>{
 const geometry=makeDiagonalWallGeometry(),material=new T.MeshBasicMaterial(),scene=new T.Scene(),renderer=createStructureRenderer(scene,{wall:material},{box:new T.BoxGeometry(1,1,1),'wall:diagonal':geometry}),objects=[],meshes=new Map();
 for(const rotation of [0,90]){const o=wall(rotation),root=new T.Group(),mesh=new T.Mesh(geometry,material);mesh.scale.set(4,3,4);root.rotation.y=rotation*Math.PI/180;root.add(mesh);root.updateMatrixWorld(true);const ray=(x,z,dy=-1)=>new T.Raycaster(new T.Vector3(x,dy===-1?5:1.5,z),new T.Vector3(0,dy===-1?-1:0,dy===-1?0:dy));assert.ok(ray(0,0).intersectObject(root,true).length);assert.equal(ray(1.3,rotation===0?-1.3:1.3).intersectObject(root,true).length,0);for(const side of [-1,1]){const cast=new T.Raycaster(new T.Vector3(0,1.5,side*3),new T.Vector3(0,0,-side));assert.ok(cast.intersectObject(root,true).length);}objects.push(o);meshes.set(o.id,root);}
 renderer.sync(objects,meshes);const batch=scene.children.find(m=>m.geometry===geometry);assert.equal(batch.count,2);const matrix=new T.Matrix4();batch.getMatrixAt(1,matrix);assert.ok(matrix.elements.every((v,i)=>Math.abs(v-meshes.get(objects[1].id).children[0].matrixWorld.elements[i])<.000001));
});
