import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.min.js';
import {configureBuildingPart,fencePresetKey,fenceSolids,FENCE_PRESETS,validArchitecture} from '../architecture3d.js';
import {makeFenceModel,fenceGeometry} from '../architecture-model3d.js';
import {part,fresh3D,create3D,validate3D} from '../engine3d.js';
import {rotatePiece,snapEditorPiece,editorPlacementReason,blockTemplate,giveBlock,placeBlock,keepStructures} from '../building3d.js';
import {initializeCharacterDefaults,inheritNewCharacter} from '../character-defaults3d.js';
import {createStructureRenderer} from '../structure-render3d.js';
import {shootVolley,updateCombat} from '../combat3d.js';
const keys=['fenceHalfWidth','fenceHalfWidthLow'],spawn={x:20,y:0,z:20},material=new T.MeshBasicMaterial(),half=(key,x=-1,z=0)=>configureBuildingPart(part('wall',x,z),key);
test('幅が半マスの柵を高い・低い２種類から選べ、両向きとも保存できる',()=>{
 for(const key of keys)for(const rotation of [0,90]){const o=half(key);if(rotation)rotatePiece(o);assert.equal(fencePresetKey(o),key);assert.ok(FENCE_PRESETS[key]);assert.equal(o.wallHalf,'halfVertical');assert.deepEqual([o.w,o.h,o.d],rotation?[.25,key==='fenceHalfWidth'?3:1.5,2]:[2,key==='fenceHalfWidth'?3:1.5,.25]);assert.ok(validArchitecture(o));const p=fresh3D();p.objects=[o];assert.deepEqual(validate3D(JSON.parse(JSON.stringify(p))),p);const size=new T.Box3().setFromObject(makeFenceModel(o,material)).getSize(new T.Vector3());assert.equal(size.y,o.h);assert.ok(Math.abs((rotation?size.z:size.x)-2)<.000001);}
});
test('２枚で１マスを埋め、中央でL字につなげられ、同じ場所への重複は拒否する',()=>{
 for(const key of keys){const a=snapEditorPiece(half(key),{x:-.8,y:0,z:.1}),b=half(key);assert.deepEqual([a.x,a.z],[-1,0]);rotatePiece(b);assert.deepEqual([b.x,b.z],[0,1]);assert.equal(editorPlacementReason(b,[a],spawn),'');assert.notEqual(editorPlacementReason({...a,id:crypto.randomUUID()},[a],spawn),'');const other=half(key,1,0);assert.equal(editorPlacementReason(other,[a],spawn),'');assert.equal(other.x+other.w/2-a.x+a.w/2,4);}
});
test('半幅の柵は棒５本と横木２本ででき、表示と当たり判定が両向きで一致する',()=>{
 for(const key of keys)for(const rotation of [0,90]){const o=half(key);if(rotation)rotatePiece(o);const solids=fenceSolids(o),model=makeFenceModel(o,material);model.position.set(o.x,o.y,o.z);model.updateMatrixWorld(true);assert.equal(solids.length,7);for(const bar of solids){const ray=new T.Raycaster(new T.Vector3(bar.x,bar.y+bar.h/2,bar.z+3),new T.Vector3(0,0,-1));if(rotation)ray.set(new T.Vector3(bar.x+3,bar.y+bar.h/2,bar.z),new T.Vector3(-1,0,0));assert.ok(ray.intersectObject(model,true).length);}
  const width=rotation?o.d:o.w,post=solids[0],postWidth=rotation?post.d:post.w;assert.equal(width,2);assert.equal(postWidth,.16);assert.equal(fenceGeometry(o.h,2),fenceGeometry(o.h,2));assert.notEqual(fenceGeometry(o.h,2),fenceGeometry(o.h,4));
 }
});
test('弾は柵の棒に当たり、棒どうしの隙間は通り抜ける',()=>{
 for(const key of keys)for(const x of [-.9,-.675]){const o=half(key,0,0),p=fresh3D();p.objects=[o];const g=create3D(p);shootVolley(g,{x,y:o.h/2,z:-1},{x:0,y:0,z:1},{...p.loadout[0],aimJitter:0,size:.1,damage:3,speed:20,range:4});for(let i=0;i<15;i++)updateCombat(g,.01);assert.equal(g.objects[0].hp,x===-.9?17:20);}
});
test('全体設定の体力・壊れた時の回収・拾って置き直す形と向きを保つ',()=>{
 for(const key of keys){const p=fresh3D();initializeCharacterDefaults(p,part);p.characterDefaults.block.hp=80;const o=inheritNewCharacter(p,half(key));assert.equal(o.hp,80);assert.deepEqual(o.destroyEvents,[{type:'dropSelf'}]);const g=create3D(p);giveBlock(g,blockTemplate(o));const result=placeBlock(g,{buildPoint:{x:.1,y:0,z:.8},buildRotation:90});assert.ok(result.valid,result.reason);assert.equal(fencePresetKey(result.piece),key);assert.deepEqual([result.piece.x,result.piece.z,result.piece.w,result.piece.d],[0,1,.25,2]);assert.equal(result.piece.hp,80);keepStructures(p,g);assert.ok(validate3D(p));}
});
test('半幅の柵も高さ別にまとめて描画でき、通常幅とは別の形を使う',()=>{
 const objects=keys.map((key,i)=>half(key,-1,i*2)),geometries={box:new T.BoxGeometry(1,1,1),'wall:fence':fenceGeometry(3),'wall:fenceHalf':fenceGeometry(1.5),'wall:fenceHalfWidth':fenceGeometry(3,2),'wall:fenceHalfWidthLow':fenceGeometry(1.5,2)},scene=new T.Scene(),renderer=createStructureRenderer(scene,{wall:material},geometries),meshes=new Map(objects.map(o=>[o.id,makeFenceModel(o,material)]));renderer.sync(objects,meshes);for(const key of keys){const batch=scene.children.find(child=>child.geometry===geometries['wall:'+key]);assert.equal(batch.count,1);}
});
test('柵と半幅の組み合わせは許可し、不正なハーフ指定は拒否する',()=>{
 const o=half(keys[0]);assert.ok(validArchitecture(o));o.wallHalf='halfHorizontal';assert.equal(validArchitecture(o),false);o.wallHalf='halfVertical';o.wallStyle='diagonal';assert.equal(validArchitecture(o),false);
});
