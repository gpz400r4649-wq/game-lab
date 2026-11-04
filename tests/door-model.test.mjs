import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.min.js';
import {makeDoorModel,updateDoorModel} from '../door-model3d.js';
import {configureDoor,doorDimensions} from '../doors3d.js';
import {part,fresh3D,validate3D,solids} from '../engine3d.js';
import {snapEditorPiece,constructionPart,editorPlacementReason,rotatePiece} from '../building3d.js';
const m=new T.MeshBasicMaterial(),materials={door:m,wall:m,dark:m,star:m};
test('扉本体を変えず、左右の枠を含む幅は4mにそろう',()=>{
 for(const rotation of [0,90]){const o=configureDoor(part('door',0,2),'swing');if(rotation)rotatePiece(o);const model=makeDoorModel(o,materials),bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3());assert.ok(Math.abs((rotation?size.z:size.x)-4)<1e-8);assert.equal(size.y,3);assert.equal(doorDimensions(o).width,3);assert.equal(model.userData.panel.children[0].scale.x,2.8);}
});
test('取っ手は扉の拡大率を受けず、両面で同じ大きさになる',()=>{
 const root=makeDoorModel(configureDoor(part('door'),'swing'),materials);root.updateMatrixWorld(true);for(const handle of root.userData.panel.children.slice(1)){const size=new T.Box3().setFromObject(handle).getSize(new T.Vector3());assert.ok(Math.abs(size.x-.12)<1e-8);assert.ok(Math.abs(size.y-.12)<1e-8);assert.ok(Math.abs(size.z-.07)<1e-8);}
});
test('開き戸もスライドも逆向きに開き、閉じると元に戻る',()=>{
 for(const style of ['swing','slide']){const o=configureDoor(part('door'),style),root=makeDoorModel(o,materials);o.doorAmount=1;updateDoorModel(root,o);const normal=style==='slide'?root.userData.hinge.position.x:root.userData.hinge.rotation.y;o.doorDirection=-1;updateDoorModel(root,o);assert.equal(style==='slide'?root.userData.hinge.position.x:root.userData.hinge.rotation.y,-normal);o.doorAmount=0;updateDoorModel(root,o);assert.equal(Math.abs(style==='slide'?root.userData.hinge.position.x:root.userData.hinge.rotation.y),0);}
});
test('新しいドアは壁と同じ境界に並び、床に置ける',()=>{
 for(const rotation of [0,90]){const point=rotation?{x:1.9,z:0,y:.25}:{x:0,z:1.9,y:.25},floor=constructionPart('floor'),door=snapEditorPiece(configureDoor(part('door'),'swing'),point,floor,{x:0,y:1,z:0});assert.equal(door.rotation,rotation);assert.equal(door.y,0);assert.equal(rotation?door.x:door.z,2);assert.equal(editorPlacementReason(door,[floor],{x:20,y:0,z:20}), '');const model=makeDoorModel(door,materials);model.position.set(door.x,door.y,door.z);const bounds=new T.Box3().setFromObject(model);assert.equal(rotation?bounds.max.z:bounds.max.x,2);}
});
test('開いた後も左右の枠は残り、中央は通れる',()=>{
 const door=configureDoor(part('door',0,0),'swing');door.open=true;const frame=solids([door]);assert.equal(frame.length,2);assert.ok(frame.every(o=>Math.abs(o.x)-o.w/2>=1.39));assert.ok(!frame.includes(door));
});
test('開く向きは保存でき、不正な値を拒否する',()=>{
 const p=fresh3D(),o=configureDoor(part('door'),'swing');p.objects=[o];for(const value of [1,-1]){o.doorDirection=value;assert.equal(validate3D(p).objects[0].doorDirection,value);}for(const value of [0,2,'reverse',null]){o.doorDirection=value;assert.throws(()=>validate3D(p));}
});
