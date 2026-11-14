import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.min.js';
import {configureBuildingPart,halfFloorMask,halfFloorMasks} from '../architecture3d.js';
import {makeHalfFloorGeometries} from '../architecture-model3d.js';
import {part,fresh3D,create3D,movePlayer,validate3D} from '../engine3d.js';
import {constructionPart,snapEditorPiece,rotatePiece,editorPlacementReason,gridStep,placement,makeTool,blockTemplate,giveBlock,placeBlock,keepStructures} from '../building3d.js';
import {createStructureRenderer} from '../structure-render3d.js';
const spawn={x:20,y:0,z:20};
function halfWall(x=-1,z=0){return configureBuildingPart(part('wall',x,z),'halfVertical');}
function floors(y=0){return [constructionPart('halfFloor',-1,0,y),constructionPart('halfFloor',0,1,y,90)];}
test('ハーフ壁を１マス中央へ置き、90度回して同じマス内にL字でつなげる',()=>{
 const a=snapEditorPiece(halfWall(),{x:-.8,y:0,z:.1}),b=structuredClone(a);b.id=crypto.randomUUID();assert.deepEqual([a.x,a.z],[-1,0]);rotatePiece(b);assert.deepEqual([b.x,b.z,b.rotation],[0,1,90]);assert.equal(editorPlacementReason(b,[a],spawn),'');assert.equal(gridStep(a,'z'),2);assert.equal(gridStep(b,'x'),2);rotatePiece(b);assert.deepEqual([b.x,b.z],[-1,0]);assert.notEqual(editorPlacementReason(b,[a],spawn),'');
});
test('中央と外周のハーフ壁を混ぜられ、通常の壁の位置は変わらない',()=>{
 const center=halfWall(),edge=halfWall(-1,2);assert.equal(editorPlacementReason(edge,[center],spawn),'');const regular=snapEditorPiece(part('wall'),{x:-.8,y:0,z:.1});assert.equal(Math.abs(regular[regular.rotation===90?'x':'z']),2);const p=fresh3D();p.objects=[center,edge];assert.ok(validate3D(p));
});
test('向きの違うハーフ床２枚を同じマスの同じ高さへ置け、重複だけは拒否する',()=>{
 const [a,b]=floors();assert.equal(editorPlacementReason(b,[a],spawn),'');const rotated=constructionPart('halfFloor',1,0);rotatePiece(rotated);assert.equal(editorPlacementReason(rotated,[a],spawn),'');const duplicate={...a,id:crypto.randomUUID()};assert.notEqual(editorPlacementReason(duplicate,[a],spawn),'');
 const bottom=constructionPart('halfFloor',1,0);assert.equal(editorPlacementReason(bottom,[a,b],spawn),'');const last=constructionPart('halfFloor',0,-1,0,90);assert.notEqual(editorPlacementReason(last,[a,b,bottom],spawn),'');
 const stacked=constructionPart('halfFloor',0,1,3,90);assert.equal(editorPlacementReason(stacked,[a,b],spawn),'');
});
test('ハーフ床の上を押しても、L字にする床を隣のマスへ追い出さない',()=>{
 const [a]=floors(),b=snapEditorPiece(constructionPart('halfFloor',0,1,0,90),{x:.2,y:.25,z:.9},a,{x:0,y:1,z:0});assert.deepEqual([b.x,b.y,b.z,b.rotation],[0,0,1,90]);assert.equal(editorPlacementReason(b,[a],spawn),'');
});
test('建築銃と拾った床からもL字を作れ、拾った壁は中央にも置ける',()=>{
 const p=fresh3D();p.objects=[floors()[0]];const g=create3D(p),tool=makeTool('halfFloor'),r=placement(g,tool,{x:0,y:0,z:.8},90);assert.ok(r.valid,r.reason);assert.deepEqual([r.piece.x,r.piece.z],[0,1]);giveBlock(g,blockTemplate(floors()[1]));const built=placeBlock(g,{buildPoint:{x:0,y:0,z:.8},buildRotation:90});assert.ok(built.valid,built.reason);keepStructures(p,g);assert.equal(p.objects.length,2);assert.ok(validate3D(p));
 const h=create3D(fresh3D());giveBlock(h,blockTemplate(halfWall()));const wall=placeBlock(h,{buildPoint:{x:-.8,y:0,z:.1},buildRotation:0});assert.ok(wall.valid,wall.reason);assert.deepEqual([wall.piece.x,wall.piece.z],[-1,0]);
});
test('L字の床は３つの小マスを支え、残りの小マスは空いたまま',()=>{
 const objects=floors(3);for(const [x,z,expected]of [[-1,-1,3.25],[-1,1,3.25],[1,1,3.25],[1,-1,0]]){const body={x,y:5,z,vy:0,grounded:false};for(let i=0;i<100;i++)movePlayer(body,objects,0,0,.02,false);assert.equal(body.y,expected);}
 const walls=[halfWall(),halfWall()];walls[1].id=crypto.randomUUID();rotatePiece(walls[1]);const body={x:-1,y:0,z:-1,vy:0,grounded:true};for(let i=0;i<100;i++){const before={x:body.x,z:body.z};movePlayer(body,walls,.1,.1,.02,false);assert.ok(Math.hypot(body.x-before.x,body.z-before.z)<.143);}
});
function model(o,geometry,material){const root=new T.Group(),turned=o.rotation===90,shape=new T.Mesh(geometry,material);root.position.set(o.x,o.y,o.z);root.rotation.y=(o.rotation||0)*Math.PI/180;shape.position.y=o.h/2;shape.scale.set(turned?o.d:o.w,o.h,turned?o.w:o.d);root.add(shape);return root;}
test('重なる床の四分の一は片方だけ描画し、消したら残る床の表示を自動で戻す',()=>{
 const objects=floors(),mask=halfFloorMask(objects[1],objects);assert.ok(mask===1||mask===2);assert.equal(halfFloorMasks(objects).get(objects[1].id),mask);const geometry=new T.BoxGeometry(1,1,1),material=new T.MeshBasicMaterial(),shapes=makeHalfFloorGeometries(),scene=new T.Scene(),renderer=createStructureRenderer(scene,{floor:material},{box:geometry,...shapes}),meshes=new Map(objects.map(o=>[o.id,model(o,geometry,material)]));renderer.sync(objects,meshes);for(const root of meshes.values())root.updateMatrixWorld(true);
 const ray=(x,z)=>new T.Raycaster(new T.Vector3(x,5,z),new T.Vector3(0,-1,0));const hits=(x,z)=>[...new Set([...meshes.values()].flatMap(root=>ray(x,z).intersectObject(root,true)).map(hit=>hit.object))];assert.equal(hits(-.8,.8).length,1);assert.equal(hits(.8,-.8).length,0);assert.equal(hits(.8,.8).length,1);
 const before=new T.Box3().setFromObject(meshes.get(objects[1].id)).getSize(new T.Vector3());assert.ok(Math.abs(before.x-2)<1e-8);renderer.sync([objects[1]],meshes);const after=new T.Box3().setFromObject(meshes.get(objects[1].id)).getSize(new T.Vector3());assert.ok(Math.abs(after.x-4)<1e-8);assert.equal(objects[1].w,4);assert.equal(objects[1].d,2);
});
