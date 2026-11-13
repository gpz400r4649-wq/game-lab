import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.min.js';
import {DOOR_PRESETS,configureDoor,doorDimensions,doorSolids,nearbyDoor} from '../doors3d.js';
import {configureBuildingPart,fenceSolids} from '../architecture3d.js';
import {makeCornerRampGeometry,makeFenceModel,fenceGeometry} from '../architecture-model3d.js';
import {makeDoorModel,updateDoorModel} from '../door-model3d.js';
import {part,fresh3D,validate3D,solids,movePlayer,create3D,step3D} from '../engine3d.js';
import {alignPiece,rotatePiece,topAt,editorPlacementReason,blockTemplate} from '../building3d.js';
import {isBatchedStructure,createStructureRenderer} from '../structure-render3d.js';
import {shootVolley,updateCombat} from '../combat3d.js';
const mat=new T.MeshBasicMaterial(),materials={wall:mat,door:mat,dark:mat,white:mat,glass:mat};
const sizeOf=model=>new T.Box3().setFromObject(model).getSize(new T.Vector3());
for(const key of ['double','doubleSlide','fusuma','frame','windowFrame','windowGlass','windowSwing'])test(key+': グリッド寸法・回転・保存を保つ',()=>{
 const p=fresh3D(),o=configureDoor(part('door',0,2),key);alignPiece(o);const width=key==='fusuma'?8:4;assert.equal(doorDimensions(o).outerWidth,width);assert.equal(sizeOf(makeDoorModel(o,materials)).x,width);assert.equal(sizeOf(makeDoorModel(o,materials)).y,3);
 const at={x:o.x,z:o.z};rotatePiece(o);assert.equal(sizeOf(makeDoorModel(o,materials)).z,width);if(key==='fusuma')assert.deepEqual({x:o.x,z:o.z},at);assert.equal(editorPlacementReason(o,[],{x:20,y:0,z:20}),'');p.objects=[o];assert.equal(validate3D(p).objects[0].doorVariant,key);
});
test('中央開きは左右へ開き、ふすまは固定した片側へ重なり、逆向きにも対応する',()=>{
 for(const key of ['double','doubleSlide','fusuma','windowSwing'])for(const rotation of [0,90]){const o=configureDoor(part('door'),key);if(rotation)rotatePiece(o);const model=makeDoorModel(o,materials),leaves=model.userData.variantLeaves;o.doorAmount=1;updateDoorModel(model,o);
 if(o.doorStyle==='doubleSwing')assert.equal(leaves[0].hinge.rotation.y,-leaves[1].hinge.rotation.y);
 if(key==='doubleSlide'){assert.ok(leaves[0].hinge.position.x<leaves[0].startX);assert.ok(leaves[1].hinge.position.x>leaves[1].startX);}
 if(key==='fusuma'){assert.equal(leaves[0].hinge.position.x,leaves[1].hinge.position.x);o.doorDirection=-1;updateDoorModel(model,o);assert.equal(leaves[0].hinge.position.x,leaves[1].hinge.position.x);}
 }
});
test('枠だけのドアは最初から通れ、窓枠は上下の壁が残り、ガラス窓は中央をふさぐ',()=>{
 const frame=configureDoor(part('door',0,0),'frame');assert.equal(nearbyDoor({player:{x:0,y:0,z:1},objects:[frame]}),null);const player={x:0,y:0,z:1,vy:0,grounded:true};for(let i=0;i<30;i++)movePlayer(player,[frame],0,-.1,.02,false);assert.ok(player.z<-.5);
 const window=configureDoor(part('door',0,0),'windowFrame');assert.equal(doorSolids(window).length,4);assert.ok(doorSolids(window).some(s=>s.y===0&&Math.abs(s.h-.8)<1e-8));const glass=configureDoor(part('door'),'windowGlass');assert.equal(doorSolids(glass).length,5);
});
test('ふすまは開けても固定した半分は残り、回転後も見た目と当たり判定が一致する',()=>{
 for(const direction of [1,-1])for(const rotation of [0,90]){const o=configureDoor(part('door',2,2),'fusuma');o.doorDirection=direction;if(rotation)rotatePiece(o);o.open=true;o.doorAmount=1;const fixed=doorSolids(o).find(s=>s.id.endsWith('fixed-panel'));const model=makeDoorModel(o,materials);model.position.set(o.x,o.y,o.z);model.updateMatrixWorld(true);const leaf=model.userData.variantLeaves.find(l=>l.sign===direction),world=leaf.hinge.getWorldPosition(new T.Vector3());assert.ok(Math.abs(fixed.x-world.x)<1e-8);assert.ok(Math.abs(fixed.z-world.z)<1e-8);}
});
for(const style of ['inner','outer'])test(style+': 角スロープの実際の三角形と歩ける高さが４方向で一致する',()=>{
 const geometry=makeCornerRampGeometry(style);for(const rotation of [0,90,180,270]){const o=configureBuildingPart(part('ramp',0,0),style);o.rotation=rotation;const mesh=new T.Mesh(geometry,mat);mesh.rotation.y=rotation*Math.PI/180;mesh.scale.set(4,3,4);mesh.updateMatrixWorld(true);
 for(const [x,z]of [[-1.5,-.7],[1.5,-.7],[-.7,1.5],[.8,.4]]){const ray=new T.Raycaster(new T.Vector3(x,10,z),new T.Vector3(0,-1,0)),hit=ray.intersectObject(mesh)[0];assert.ok(hit);assert.ok(Math.abs(hit.point.y-topAt(o,x,z))<1e-6);}
 const p=fresh3D();p.objects=[o];assert.equal(validate3D(p).objects[0].rampStyle,style);assert.equal(blockTemplate(o).rampStyle,style);assert.equal(isBatchedStructure(o),true);
 }
});
test('角スロープを実際に歩いて登れる',()=>{
 for(const style of ['inner','outer']){const ramp=configureBuildingPart(part('ramp',0,0),style),p={x:style==='inner'?1.7:-1.7,y:0,z:2.3,vy:0,grounded:true};for(let i=0;i<45;i++)movePlayer(p,[ramp],0,-.09,.02,false);assert.ok(p.y>2,'height '+p.y);}
});
test('柵は１マスの幅で、全高と半分の高さが見た目・当たり判定・保存でそろう',()=>{
 for(const key of ['fence','fenceHalf'])for(const rotation of [0,90]){const o=configureBuildingPart(part('wall',0,2),key);if(rotation)rotatePiece(o);const size=sizeOf(makeFenceModel(o,mat));assert.equal(rotation?size.z:size.x,4);assert.equal(size.y,key==='fence'?3:1.5);assert.equal(fenceSolids(o).length,11);assert.equal(solids([o]).length,11);assert.equal(isBatchedStructure(o),true);assert.equal(blockTemplate(o).wallStyle,key);const p=fresh3D();p.objects=[o];assert.ok(validate3D(p));}
});
test('窓の枠や柵の隙間を弾が通り、ガラスと柱には当たる',()=>{
 for(const [key,x,y,passes]of [['windowFrame',0,1.7,true],['windowGlass',0,1.7,false],['fence',.23,1.4,true],['fence',0,1.4,false]]){const p=fresh3D(),o=key.startsWith('window')?configureDoor(part('door',0,0),key):configureBuildingPart(part('wall',0,0),key);p.objects=[o];const g=create3D(p);shootVolley(g,{x,y,z:2},{x:0,y:0,z:-1},{speed:10,interval:1,damage:1,spread:1,size:.1});for(let i=0;i<16;i++){g.time+=.02;updateCombat(g,.02);}assert.equal(g.bullets.length>0,passes,key+' '+x);}
});
test('新しいドアと窓は操作で開閉し、勝手には開かない',()=>{
 for(const key of ['double','doubleSlide','fusuma','windowSwing']){const p=fresh3D(),o=configureDoor(part('door',0,0),key);p.objects=[o];p.spawn.z=2;const g=create3D(p);step3D(g,p,{},.02);assert.equal(g.objects[0].open,false);step3D(g,p,{useDoor:true,yaw:0},.02);assert.equal(g.objects[0].open,true);}
});
test('不正な素材の種類を読み込まない',()=>{
 for(const [type,key]of [['wall','wallStyle'],['ramp','rampStyle'],['door','doorVariant']]){const p=fresh3D();p.objects=[{...part(type),[key]:'bad'}];assert.throws(()=>validate3D(p));}
});

test('柵を多数置いても、見える描画は形ごとにまとめられ、削除も反映する',()=>{
 const scene=new T.Scene(),geometry=fenceGeometry(3),render=createStructureRenderer(scene,{wall:mat,floor:mat,roof:mat,ramp:mat,box:mat,platform:mat},{box:new T.BoxGeometry(1,1,1),'wall:fence':geometry,'wall:fenceHalf':fenceGeometry(1.5),'ramp:inner':makeCornerRampGeometry('inner'),'ramp:outer':makeCornerRampGeometry('outer')}),objects=Array.from({length:100},(_,i)=>configureBuildingPart(part('wall',i*4,2),'fence')),meshes=new Map();
 for(const o of objects){const mesh=makeFenceModel(o,mat);mesh.position.set(o.x,o.y,o.z);render.mark(mesh);meshes.set(o.id,mesh);}
 render.sync(objects,meshes);const active=scene.children.filter(m=>m.count>0);assert.equal(active.length,1);assert.equal(active[0].count,100);assert.equal(active[0].geometry,geometry);assert.ok([...meshes.values()].every(m=>m.layers.mask===2));render.sync(objects.slice(0,40),meshes);assert.equal(active[0].count,40);
});
