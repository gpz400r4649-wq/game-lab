import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.min.js';
import {FURNITURE_PRESETS,FURNITURE_SIZES,configureFurniture,isFurniture,validFurniture,furnitureSolids,furniturePieces} from '../furniture3d.js';
import {furnitureGeometry,makeFurnitureModel} from '../furniture-model3d.js';
import {part,fresh3D,create3D,validate3D,movePlayer} from '../engine3d.js';
import {constructionPart,snapEditorPiece,alignPiece,rotatePiece,gridStep,editorPlacementReason,topAt,blockTemplate,giveBlock,placeBlock,keepStructures} from '../building3d.js';
import {initializeCharacterDefaults,inheritNewCharacter} from '../character-defaults3d.js';
import {groupSteps,copyGroupNearby} from '../group-edit3d.js';
import {shootVolley,updateCombat,resolveShotOrigin} from '../combat3d.js';
import {createStructureRenderer} from '../structure-render3d.js';
import {stringifyStoredProject,parseStoredProject} from '../project-storage3d.js';
const kinds=Object.keys(FURNITURE_SIZES),spawn={x:20,y:0,z:20},material=new T.MeshStandardMaterial({color:'white',vertexColors:true});
function furniture(kind='schoolDesk',x=-1,z=-1){return configureFurniture(part('box',x,z),kind);}
test('学習机・３人用の長机・いすを選べ、通常のブロックも残る',()=>{for(const kind of kinds){assert.ok(FURNITURE_PRESETS[kind]);const o=furniture(kind);assert.ok(isFurniture(o));assert.ok(validFurniture(o));const p=fresh3D();p.objects=[o];assert.deepEqual(validate3D(p),p);}const o=furniture();configureFurniture(o,'box');assert.equal(o.furnitureKind,undefined);assert.deepEqual([o.w,o.h,o.d],[4,3,4]);});
test('半マス単位で床の上へそろい、机を前後・左右へすきまなくつなげる',()=>{
 const floor=constructionPart('floor'),a=snapEditorPiece(furniture(),{x:-.8,y:.25,z:-.8},floor,{x:0,y:1,z:0});assert.deepEqual([a.x,a.y,a.z],[-1,.25,-1]);assert.equal(editorPlacementReason(a,[floor],spawn),'');assert.equal(gridStep(a,'x'),2);assert.equal(gridStep(a,'y'),.25);
 for(const [axis,sign]of [['x',-1],['x',1],['z',-1],['z',1]]){const normal={x:axis==='x'?sign:0,y:0,z:axis==='z'?sign:0},point={x:a.x+normal.x,y:a.y+.7,z:a.z+normal.z},next=snapEditorPiece(furniture(),point,a,normal);assert.equal(next[axis],a[axis]+sign*2);assert.equal(next.y,a.y);assert.equal(editorPlacementReason(next,[a,floor],spawn),'');}
 const topEdge=snapEditorPiece(furniture(),{x:a.x+.9,y:a.y+1.2,z:a.z},a,{x:0,y:1,z:0});assert.deepEqual([topEdge.x,topEdge.y,topEdge.z],[1,.25,-1]);assert.notEqual(editorPlacementReason({...a,id:crypto.randomUUID()},[a],spawn),'');
});
test('長机はいす３脚分の幅があり、学習机とも天板をそろえて延ばせる',()=>{
 const table=furniture('longTable',1,1),chairs=[-1,1,3].map(x=>furniture('chair',x,3));assert.equal(table.w,chairs[0].w*3);for(let i=0;i<chairs.length;i++)assert.equal(editorPlacementReason(chairs[i],[table,...chairs.slice(0,i)],spawn),'');const desk=snapEditorPiece(furniture(),{x:3.9,y:1.2,z:1},table,{x:0,y:1,z:0});assert.deepEqual([desk.x,desk.z,desk.y],[5,1,0]);assert.equal(desk.x-desk.w/2,table.x+table.w/2);assert.equal(topAt(table,1,1),topAt(desk,5,1));
});
test('机といすは同じ場所で４方向へ回せ、幅と保存を保つ',()=>{
 for(const kind of kinds){const o=furniture(kind),before=structuredClone(o);for(let i=0;i<4;i++){rotatePiece(o);assert.deepEqual([o.x,o.z],[-1,-1]);assert.equal(o.rotation,(i+1)*90%360);assert.ok(validFurniture(o));const p=fresh3D();p.objects=[o];assert.deepEqual(validate3D(JSON.parse(JSON.stringify(p))),p);}assert.deepEqual(o,{...before,rotation:0});}
 const table=furniture('longTable',1,1);rotatePiece(table);const next=snapEditorPiece(furniture(),{x:1,y:.8,z:3.95},table,{x:0,y:0,z:1});assert.equal(next.rotation,90);assert.deepEqual([next.x,next.z],[1,5]);
});
test('机の脚の隙間は弾が通り、天板・脚・いすの座面には当たる',()=>{
 for(const [kind,x,y,hit]of [['schoolDesk',1,.5,false],['schoolDesk',1,1.14,true],['schoolDesk',1.82,.5,true],['longTable',1,.5,false],['chair',1,.25,false],['chair',1,.58,true]]){const p=fresh3D(),o=furniture(kind,1,1);p.objects=[o];const g=create3D(p);shootVolley(g,{x,y,z:-1},{x:0,y:0,z:1},{...p.loadout[0],aimJitter:0,size:.1,speed:20,range:6,damage:3});for(let i=0;i<20;i++)updateCombat(g,.01);assert.equal(g.objects[0].hp,hit?17:20,[kind,x,y].join(':'));}
});
test('天板と座面に乗れ、当たり判定と実際の表面がそろう',()=>{
 for(const kind of kinds){const o=furniture(kind,1,1),body={x:1,y:3,z:1,vy:0,grounded:false};for(let i=0;i<100;i++)movePlayer(body,[o],0,0,.02,false);assert.ok(Math.abs(body.y-(kind==='chair'?.64:1.2))<1e-8);const root=makeFurnitureModel(o,material);root.position.set(o.x,o.y,o.z);root.updateMatrixWorld(true);const hit=new T.Raycaster(new T.Vector3(1,5,1),new T.Vector3(0,-1,0)).intersectObject(root,true)[0];assert.ok(hit);assert.ok(Math.abs(hit.point.y-body.y)<1e-6);assert.equal(topAt(o,1,1),body.y);}
});
test('全方向でモデルの各板・脚と物理用のパーツが一致する',()=>{
 for(const kind of kinds)for(const phase of [0,90,180,270]){const o=furniture(kind,1,1);while((o.rotation||0)!==phase)rotatePiece(o);const root=makeFurnitureModel(o,material);root.position.set(o.x,o.y,o.z);root.updateMatrixWorld(true);for(const solid of furnitureSolids(o)){const ray=new T.Raycaster(new T.Vector3(solid.x,solid.y+solid.h/2,solid.z+10),new T.Vector3(0,0,-1));assert.ok(ray.intersectObject(root,true).length);}const color=furnitureGeometry(kind).getAttribute('color');assert.ok(color);assert.ok(new Set(Array.from(color.array)).size>3);}
});
test('体力の全体設定・破壊後のアイテム・置き直し・保存で家具の種類を保つ',()=>{
 for(const kind of kinds)for(const phase of [0,90,180,270]){const p=fresh3D();initializeCharacterDefaults(p,part);p.characterDefaults.block.hp=80;const o=inheritNewCharacter(p,furniture(kind));assert.equal(o.hp,80);assert.deepEqual(o.destroyEvents,[{type:'dropSelf'}]);const g=create3D(p);giveBlock(g,blockTemplate(o));const r=placeBlock(g,{buildPoint:{x:.8,y:0,z:.8},buildRotation:phase});assert.ok(r.valid,r.reason);assert.equal(r.piece.furnitureKind,kind);assert.equal(r.piece.rotation,phase);assert.ok(validFurniture(r.piece));keepStructures(p,g);assert.deepEqual(validate3D(parseStoredProject(stringifyStoredProject(p))),p);}
});
test('家具のまとめてコピーも半マス単位でぴったり隣に置く',()=>{
 const p=fresh3D(),o=furniture('schoolDesk',1,1);p.spawn=spawn;p.objects=[o];assert.deepEqual(groupSteps([o]),{horizontal:2,vertical:.25});const [id]=copyGroupNearby(p,[o.id]),copy=p.objects.find(o=>o.id===id);assert.equal(Math.hypot(copy.x-o.x,copy.z-o.z),2);assert.equal(editorPlacementReason(copy,[o],spawn),'');
});
test('家具を形ごとにまとめて描画し、木と金属の色を保つ',()=>{
 const geometries={box:new T.BoxGeometry(1,1,1),...Object.fromEntries(kinds.map(kind=>['furniture:'+kind,furnitureGeometry(kind)]))},scene=new T.Scene(),renderer=createStructureRenderer(scene,{box:material},geometries),objects=kinds.flatMap((kind,i)=>[furniture(kind,1,i*4+1),furniture(kind,11,i*4+1)]),meshes=new Map(objects.map(o=>[o.id,makeFurnitureModel(o,material)]));for(const o of objects)meshes.get(o.id).position.set(o.x,o.y,o.z);renderer.sync(objects,meshes);for(const kind of kinds){const batch=scene.children.find(m=>m.geometry===geometries['furniture:'+kind]);assert.equal(batch.count,2);assert.equal(batch.material.vertexColors,true);const color=new T.Color();batch.getColorAt(0,color);assert.equal(color.getHexString(),'ffffff');}
});
test('不正な家具の種類・別タイプへの指定・合わないサイズを読み込まない',()=>{
 for(const patch of [{furnitureKind:'bad'},{type:'enemy'},{w:5},{h:8},{d:9},{wallHalf:'halfVertical'}]){const p=fresh3D();p.objects=[{...furniture(),...patch}];assert.throws(()=>validate3D(p));}
});
