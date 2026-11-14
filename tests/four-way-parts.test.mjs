import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.min.js';
import {configureBuildingPart,fenceSolids} from '../architecture3d.js';
import {makeFenceModel} from '../architecture-model3d.js';
import {part,fresh3D,validate3D,movePlayer,create3D} from '../engine3d.js';
import {alignPiece,rotatePiece,constructionPart,editorPlacementReason,snapEditorPiece,blockTemplate,giveBlock,placeBlock,placement,makeTool} from '../building3d.js';
import {configureDoor,doorDimensions,doorLocalX,doorSolids,doorFrameSolids,slidingDoorPanels,doorInteraction,doorwayOccupied,setDoorPanelOpen,animateDoors} from '../doors3d.js';
import {makeDoorModel,updateDoorModel} from '../door-model3d.js';
const material=new T.MeshBasicMaterial(),materials={wall:material,door:material,white:material,dark:material,glass:material,star:material},spawn={x:20,y:0,z:20};
function save(o){const p=fresh3D();p.objects=[o];return validate3D(JSON.parse(JSON.stringify(p))).objects[0];}
test('ハーフの壁と柵は中央・外周とも４方向を回り、４回で同じ場所へ戻る',()=>{
 for(const key of ['halfVertical','halfHorizontal','fenceHalfWidth','fenceHalfWidthLow'])for(const z of [0,2]){const o=configureBuildingPart(part('wall',key==='halfHorizontal'?0:-1,z),key),before=structuredClone(o),locations=[];for(let i=0;i<4;i++){rotatePiece(o);locations.push([o.x,o.z,o.rotation]);assert.deepEqual(save(o),o);assert.equal(editorPlacementReason(o,[],spawn),'');}assert.equal(new Set(locations.map(v=>v.join(','))).size,4);assert.deepEqual(o,before);if(key!=='halfHorizontal'&&z===0)assert.deepEqual(locations,[[0,1,90],[1,0,180],[0,-1,270],[-1,0,0]]);}
});
test('半マスの床も４つの置く側を順に選べる',()=>{const o=constructionPart('halfFloor',-1,0),locations=[];for(let i=0;i<4;i++){rotatePiece(o);locations.push([o.x,o.z]);assert.deepEqual(save(o),o);}assert.deepEqual(locations,[[0,1],[1,0],[0,-1],[-1,0]]);});
test('１マスのドアは４方向へ回せ、180度・270度の向きを保存できる',()=>{
 for(const key of ['swing','key','glassSwing','glassDouble','doubleSlide','frame','windowSwing']){const o=configureDoor(part('door',0,2),key),before=structuredClone(o),locations=[];for(let i=0;i<4;i++){rotatePiece(o);locations.push([o.x,o.z,o.rotation]);assert.deepEqual(save(o),o);assert.equal(editorPlacementReason(o,[],spawn),'');}assert.deepEqual(locations,[[2,0,90],[0,-2,180],[-2,0,270],[0,2,0]]);assert.deepEqual(o,before);}
 for(const key of ['fusuma','glassFusuma']){const o=configureDoor(part('door',2,2),key);alignPiece(o);for(let i=0;i<4;i++){rotatePiece(o);assert.deepEqual([o.x,o.z],[2,2]);assert.deepEqual(save(o),o);}}
});
test('反対向きにしたドアの壁・開口部・動く扉が、実際のモデルと一致する',()=>{
 for(const key of ['swing','glassSwing','glassDouble','glassSlide','fusuma'])for(const phase of [180,270]){const o=configureDoor(part('door',0,2),key);alignPiece(o);while((o.rotation||0)!==phase)rotatePiece(o);const root=makeDoorModel(o,materials);root.position.set(o.x,o.y,o.z);root.updateMatrixWorld(true);const d=doorDimensions(o),angle=phase*Math.PI/180,toWorld=(x,z=0)=>({x:o.x+Math.round(Math.cos(angle))*x+Math.round(Math.sin(angle))*z,z:o.z-Math.round(Math.sin(angle))*x+Math.round(Math.cos(angle))*z});
  for(const solid of doorFrameSolids(o)){const p={x:solid.x,y:solid.y+solid.h/2,z:solid.z},normal=new T.Vector3(Math.sin(angle),0,Math.cos(angle)),ray=new T.Raycaster(new T.Vector3(p.x,p.y,p.z).addScaledVector(normal,2),normal.negate());assert.ok(ray.intersectObject(root,true).length);}
  const opening=toWorld(d.openingCenter);assert.ok(Math.abs(doorLocalX(o,opening)-d.openingCenter)<1e-8);assert.equal(doorwayOccupied(o,{...opening,y:0}),true);
  const index=o.doorStyle==='fusuma'||o.doorStyle==='doubleSlide'?0:null;if(index!==null){const panel=slidingDoorPanels(o)[0],position=toWorld(panel.baseX);assert.equal(doorInteraction(o,{...position,y:0}).index,0);setDoorPanelOpen(o,0,true);}else o.open=true;animateDoors({objects:[o]},.25);updateDoorModel(root,o);root.updateMatrixWorld(true);
  const local=index!==null?slidingDoorPanels(o)[0].baseX:d.openingCenter,at=toWorld(local,1),body={...at,y:0,vy:0,grounded:true};for(let i=0;i<30;i++)movePlayer(body,[o],-Math.sin(angle)*.1,-Math.cos(angle)*.1,.02,false);const endZ=Math.sin(angle)*(body.x-o.x)+Math.cos(angle)*(body.z-o.z);assert.ok(endZ<-.5);
 }
});
test('反対向きのハーフ柵も棒の位置と表示が一致する',()=>{
 for(const key of ['fenceHalfWidth','fenceHalfWidthLow'])for(const phase of [180,270]){const o=configureBuildingPart(part('wall',-1,0),key);while((o.rotation||0)!==phase)rotatePiece(o);const model=makeFenceModel(o,material);model.position.set(o.x,o.y,o.z);model.updateMatrixWorld(true);const angle=phase*Math.PI/180;for(const bar of fenceSolids(o)){const normal=new T.Vector3(Math.sin(angle),0,Math.cos(angle)),ray=new T.Raycaster(new T.Vector3(bar.x,bar.y+bar.h/2,bar.z).addScaledVector(normal,2),normal.negate());assert.ok(ray.intersectObject(model,true).length);}}
});
test('拾ったハーフ壁と柵は、建築時にも180度・270度を選べる',()=>{
 for(const key of ['halfVertical','halfHorizontal','fenceHalfWidth','fenceHalfWidthLow'])for(const phase of [180,270]){const o=configureBuildingPart(part('wall',-1,0),key),p=fresh3D(),g=create3D(p);giveBlock(g,blockTemplate(o));const r=placeBlock(g,{buildPoint:{x:-.8,y:0,z:.8},buildRotation:phase});assert.ok(r.valid,r.reason);assert.equal(r.piece.rotation,phase);p.objects=[r.piece];assert.ok(validate3D(p));}
});
test('180度のドアの上に床を置いても、元のマスから位置がずれない',()=>{const door=configureDoor(part('door',0,2),'swing');rotatePiece(door);rotatePiece(door);const floor=snapEditorPiece(part('floor'),{x:0,y:3,z:-2},door,{x:0,y:1,z:0});assert.deepEqual([floor.x,floor.y,floor.z],[0,3,0]);const g=create3D(fresh3D()),r=placement(g,makeTool('floor'),{x:0,y:3,z:-2.1,surface:door,normal:{x:0,y:1,z:0}});assert.deepEqual([r.piece.x,r.piece.y,r.piece.z],[0,3,0]);});
