import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.min.js';
import {makeDoorModel,updateDoorModel} from '../door-model3d.js';
import {configureDoor,doorDimensions,setDoorPanelOpen,animateDoors} from '../doors3d.js';
import {part,fresh3D,validate3D,solids} from '../engine3d.js';
import {snapEditorPiece,constructionPart,editorPlacementReason,rotatePiece} from '../building3d.js';
const m=new T.MeshBasicMaterial(),materials={door:m,wall:m,dark:m,star:m};
test('普通のドアは半マス幅にし、残る半分を壁で埋めて全体を１マスにそろう',()=>{
 for(const rotation of [0,90]){const o=configureDoor(part('door',0,2),'swing');if(rotation)rotatePiece(o);const model=makeDoorModel(o,materials),bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3());assert.ok(Math.abs((rotation?size.z:size.x)-4)<1e-8);assert.equal(size.y,3);assert.equal(doorDimensions(o).width,4);assert.equal(model.userData.panel.children[0].scale.x,1.8);}
});
test('取っ手は扉の拡大率を受けず、両面で同じ大きさになる',()=>{
 const root=makeDoorModel(configureDoor(part('door'),'swing'),materials);root.updateMatrixWorld(true);for(const handle of root.userData.panel.children.slice(1)){const size=new T.Box3().setFromObject(handle).getSize(new T.Vector3());assert.ok(Math.abs(size.x-.12)<1e-8);assert.ok(Math.abs(size.y-.12)<1e-8);assert.ok(Math.abs(size.z-.07)<1e-8);}
});
test('開き戸もスライドも逆向きに開き、閉じると元に戻る',()=>{
 const o=configureDoor(part('door'),'swing'),root=makeDoorModel(o,materials);o.doorAmount=1;updateDoorModel(root,o);const normal=root.userData.hinge.rotation.y;o.doorDirection=-1;updateDoorModel(root,o);assert.equal(root.userData.hinge.rotation.y,-normal);o.doorAmount=0;updateDoorModel(root,o);assert.equal(Math.abs(root.userData.hinge.rotation.y),0);
 const slide=configureDoor(part('door'),'slide'),model=makeDoorModel(slide,materials);for(const direction of [1,-1]){slide.doorDirection=direction;slide.doorAmount=1;updateDoorModel(model,slide);const leaves=model.userData.variantLeaves;assert.ok(Math.abs(leaves[0].hinge.position.x-leaves[1].hinge.position.x)<1e-8);slide.doorAmount=0;updateDoorModel(model,slide);assert.ok(leaves.every(l=>l.hinge.position.x===l.startX));}
});

test('新しいドアは壁と同じ境界に並び、床に置ける',()=>{
 for(const rotation of [0,90]){const point=rotation?{x:1.9,z:0,y:.25}:{x:0,z:1.9,y:.25},floor=constructionPart('floor'),door=snapEditorPiece(configureDoor(part('door'),'swing'),point,floor,{x:0,y:1,z:0});assert.equal(door.rotation,rotation);assert.equal(door.y,0);assert.equal(rotation?door.x:door.z,2);assert.equal(editorPlacementReason(door,[floor],{x:20,y:0,z:20}), '');const model=makeDoorModel(door,materials);model.position.set(door.x,door.y,door.z);const bounds=new T.Box3().setFromObject(model);assert.equal(rotation?bounds.max.z:bounds.max.x,2);}
});
test('半マスのドアを開いても、残りの半分の壁と枠は残る',()=>{
 const door=configureDoor(part('door',0,0),'swing');door.open=true;const frame=solids([door]);assert.equal(frame.length,3);assert.ok(frame.some(o=>o.w>=2&&o.x>0));const left=doorDimensions(door).openingCenter;assert.ok(!frame.some(o=>Math.abs(left-o.x)<o.w/2&&o.y<1.7));
});

test('開く向きは保存でき、不正な値を拒否する',()=>{
 const p=fresh3D(),o=configureDoor(part('door'),'swing');p.objects=[o];for(const value of [1,-1]){o.doorDirection=value;assert.equal(validate3D(p).objects[0].doorDirection,value);}for(const value of [0,2,'reverse',null]){o.doorDirection=value;assert.throws(()=>validate3D(p));}
});

test('ふすまの各扉の両面の矢印は、90度回した後も実際に動く方向を指す',()=>{
 for(const rotation of [0,90])for(const index of [0,1]){const o=configureDoor(part('door'),'slide');if(rotation)rotatePiece(o);const root=makeDoorModel(o,materials),moving=root.userData.variantLeaves[index].panel;root.updateMatrixWorld(true);const arrows=moving.children.filter(n=>n.name==='slide-direction');assert.equal(arrows.length,2);assert.ok(arrows[0].position.z*arrows[1].position.z<0);const closed=moving.getWorldPosition(new T.Vector3());setDoorPanelOpen(o,index,true);animateDoors({objects:[o]},.25);updateDoorModel(root,o);root.updateMatrixWorld(true);const travel=moving.getWorldPosition(new T.Vector3()).sub(closed).normalize();for(const arrow of arrows){const a=arrow.localToWorld(new T.Vector3(0,0,0)),b=arrow.localToWorld(new T.Vector3(1,0,0)).sub(a).normalize();assert.ok(b.dot(travel)>.999);}}
 const swing=makeDoorModel(configureDoor(part('door'),'swing'),materials);assert.equal(swing.userData.arrows.length,0);
});
