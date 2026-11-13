import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.min.js';
import {makeDoorModel,updateDoorModel} from '../door-model3d.js';
import {nearbyDoor,DOOR_PRESETS,configureDoor,doorDimensions,doorUsesGlass,doorSolids,doorInteraction,setDoorPanelOpen,animateDoors} from '../doors3d.js';
import {part,fresh3D,validate3D,movePlayer} from '../engine3d.js';
import {rotatePiece,editorPlacementReason} from '../building3d.js';
const wood=new T.MeshBasicMaterial({color:0xd8b587}),paper=new T.MeshBasicMaterial({color:0xffffff}),glass=new T.MeshBasicMaterial({color:0xb5e2ef,transparent:true,opacity:.4,depthWrite:false}),materials={wall:wood,door:wood,white:paper,glass,dark:wood,star:wood};
const variants=['glassSwing','glassDouble','glassSlide','glassFusuma'];
test('ふすまの白い板を木わくの内側に収め、正面・側面の重なる外面をなくす',()=>{
 for(const variant of ['slide','doubleSlide','fusuma','keyslide']){const door=configureDoor(part('door'),variant),root=makeDoorModel(door,materials);for(const leaf of root.userData.variantLeaves){const infill=leaf.panel.children.find(n=>n.name==='fusuma-paper'),uprights=leaf.panel.children.filter(n=>n.name==='leaf-upright'),rails=leaf.panel.children.filter(n=>n.name==='leaf-rail');assert.ok(infill);assert.equal(infill.material,paper);assert.ok(infill.scale.x<leaf.leafWidth-.1);assert.ok(infill.scale.y<doorDimensions(door).openingHeight-.1);for(const edge of [...uprights,...rails])assert.ok(infill.scale.z<edge.scale.z-.02);assert.ok(uprights.every(u=>Math.abs(u.position.x)-u.scale.x/2>=infill.scale.x/2-1e-8));assert.ok(rails.every(r=>Math.abs(r.position.y)-r.scale.y/2>=infill.scale.y/2-1e-8));}
  setDoorPanelOpen(door,0,true);animateDoors({objects:[door]},.25);updateDoorModel(root,door);const [a,b]=root.userData.variantLeaves;assert.ok(Math.abs(a.hinge.position.x-b.hinge.position.x)<1e-8);const thickness=a.panel.children.find(n=>n.name==='leaf-rail').scale.z;assert.ok(Math.abs(a.hinge.position.z-b.hinge.position.z)>thickness+.02);
 }
});
for(const variant of variants)test(variant+' は透明ガラス１枚と木わくででき、向こう側が見える',()=>{
 const o=configureDoor(part('door'),variant),root=makeDoorModel(o,materials);assert.ok(doorUsesGlass(o));assert.equal(DOOR_PRESETS[variant].window,undefined);for(const leaf of root.userData.variantLeaves){const panes=leaf.panel.children.filter(n=>n.name==='door-glass');assert.equal(panes.length,1);assert.equal(panes[0].material,glass);assert.ok(panes[0].scale.y>2.6);assert.equal(panes[0].material.transparent,true);assert.equal(panes[0].material.depthWrite,false);assert.equal(leaf.panel.children.some(n=>n.material===paper),false);assert.equal(leaf.panel.children.filter(n=>n.name==='leaf-upright').length,2);assert.equal(leaf.panel.children.filter(n=>n.name==='leaf-rail').length,2);assert.equal(leaf.panel.children.some(n=>n.name==='leaf-middle-rail'),false);}
});
test('ガラス戸もマスの幅・回転・保存と、開ける前後の当たり判定を保つ',()=>{
 for(const variant of variants)for(const rotation of [0,90]){const o=configureDoor(part('door',0,2),variant);if(rotation)rotatePiece(o);const p=fresh3D();p.objects=[o];assert.deepEqual(validate3D(p),p);const root=makeDoorModel(o,materials),size=new T.Box3().setFromObject(root).getSize(new T.Vector3());assert.ok(Math.abs((rotation?size.z:size.x)-(variant==='glassFusuma'?8:4))<1e-8);assert.equal(size.y,3);assert.equal(editorPlacementReason(o,[],{x:20,y:0,z:20}),'');assert.ok(doorSolids(o).some(s=>s.id.includes('panel')));}
});
test('半マスのガラス戸は端を軸に開き、逆向きにも開けられる',()=>{
 const o=configureDoor(part('door'),'glassSwing'),root=makeDoorModel(o,materials),leaf=root.userData.variantLeaves[0],d=doorDimensions(o);assert.equal(leaf.hinge.position.x,d.openingCenter-d.opening/2);assert.equal(leaf.panel.position.x,d.opening/2);o.doorAmount=1;updateDoorModel(root,o);assert.equal(leaf.hinge.rotation.y,-Math.PI/2);o.doorDirection=-1;updateDoorModel(root,o);assert.equal(leaf.hinge.rotation.y,Math.PI/2);o.open=true;assert.equal(doorSolids(o).some(s=>s.id.includes('panel')),false);
});
test('観音開きと２枚・４枚のガラス引き戸も、対応する扉だけが開く',()=>{
 const double=configureDoor(part('door'),'glassDouble'),model=makeDoorModel(double,materials);double.open=true;animateDoors({objects:[double]},.25);updateDoorModel(model,double);assert.equal(model.userData.variantLeaves[0].hinge.rotation.y,-model.userData.variantLeaves[1].hinge.rotation.y);
 for(const variant of ['glassSlide','glassFusuma']){const o=configureDoor(part('door',0,0),variant),root=makeDoorModel(o,materials),leaf=root.userData.variantLeaves.at(-1),localX=leaf.hinge.position.x;const action=doorInteraction(o,{x:localX,z:1});setDoorPanelOpen(o,action.index,true);animateDoors({objects:[o]},.25);updateDoorModel(root,o);assert.equal(root.userData.variantLeaves.filter(l=>l.hinge.position.x!==l.startX).length,1);assert.equal(doorSolids(o).filter(s=>s.id.includes('panel:')).length,variant==='glassFusuma'?3:1);const body={x:localX,y:0,z:1,vy:0,grounded:true};for(let i=0;i<30;i++)movePlayer(body,[o],0,-.1,.02,false);assert.ok(body.z<-.5);}
});

test('２マス幅のガラス戸は、端の扉の近くからもあけられる',()=>{const o=configureDoor(part('door',0,0),'glassFusuma');assert.equal(nearbyDoor({player:{x:3.7,y:0,z:1},objects:[o]},0),o);rotatePiece(o);assert.equal(nearbyDoor({player:{x:o.x+1,y:0,z:o.z-3.7},objects:[o]},Math.PI/2),o);});
