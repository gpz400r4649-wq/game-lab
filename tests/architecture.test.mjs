import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.min.js';
import {DOOR_PRESETS,configureDoor,doorDimensions,doorSolids,nearbyDoor,slidingDoorPanels,setDoorPanelOpen,doorInteraction,animateDoors} from '../doors3d.js';
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
 if(key==='doubleSlide'){assert.ok(Math.abs(leaves[0].hinge.position.x-leaves[1].hinge.position.x)<1e-8);}
 if(key==='fusuma'){assert.ok(Math.abs(leaves[0].hinge.position.x-leaves[1].hinge.position.x)<1e-8);o.doorDirection=-1;updateDoorModel(model,o);assert.ok(Math.abs(leaves[0].hinge.position.x-leaves[1].hinge.position.x)<1e-8);}
 }
});
test('枠だけのドアは最初から通れ、窓枠は上下の壁が残り、ガラス窓は中央をふさぐ',()=>{
 const frame=configureDoor(part('door',0,0),'frame');assert.equal(nearbyDoor({player:{x:0,y:0,z:1},objects:[frame]}),null);const player={x:-1,y:0,z:1,vy:0,grounded:true};for(let i=0;i<30;i++)movePlayer(player,[frame],0,-.1,.02,false);assert.ok(player.z<-.5);
 const window=configureDoor(part('door',0,0),'windowFrame');assert.equal(doorSolids(window).length,4);assert.ok(doorSolids(window).some(s=>s.y===0&&Math.abs(s.h-.8)<1e-8));const glass=configureDoor(part('door'),'windowGlass');assert.equal(doorSolids(glass).length,5);
});
test('ふすまの閉じた扉は、回転後も見た目と当たり判定が一致する',()=>{
 for(const direction of [1,-1])for(const rotation of [0,90]){const o=configureDoor(part('door',2,2),'fusuma');o.doorDirection=direction;if(rotation)rotatePiece(o);o.open=true;o.doorAmount=1;const model=makeDoorModel(o,materials);model.position.set(o.x,o.y,o.z);model.updateMatrixWorld(true);
  for(const panel of slidingDoorPanels(o).filter(p=>!p.open)){const fixed=doorSolids(o).find(s=>s.id.endsWith('panel:'+panel.index)),leaf=model.userData.variantLeaves[panel.index],world=leaf.hinge.getWorldPosition(new T.Vector3());assert.ok(Math.abs(rotation?fixed.z-world.z:fixed.x-world.x)<1e-8);assert.ok(Math.abs(rotation?fixed.x-world.x:fixed.z-world.z)<=doorDimensions(o).depth/2);}
 }
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

test('スライドする２枚の扉は開閉の途中もブロックの幅を超えず、重ねる面を分ける',()=>{
 for(const preset of ['slide','keyslide','doubleSlide','fusuma'])for(const rotation of [0,90])for(const direction of [1,-1]){
  const o=configureDoor(part('door'),preset);if(rotation)rotatePiece(o);o.doorDirection=direction;const model=makeDoorModel(o,materials),leaves=model.userData.variantLeaves;
  assert.equal(leaves.length,preset==='fusuma'?4:2);assert.notEqual(leaves[0].hinge.position.z,leaves[1].hinge.position.z);
  for(const amount of [0,.1,.25,.5,.75,1]){o.doorAmount=amount;updateDoorModel(model,o);const size=sizeOf(model);assert.ok((rotation?size.z:size.x)<=doorDimensions(o).outerWidth+1e-8);}
  assert.ok(Math.abs(leaves[0].hinge.position.x-leaves[1].hinge.position.x)<1e-8);
 }
});
test('１マスのふすまは開いた半分を通れ、残る半分は通れず、逆向き・90度回転にも対応する',()=>{
 for(const rotation of [0,90])for(const direction of [1,-1])for(const clear of [true,false]){
  const door=configureDoor(part('door',0,0),'doubleSlide');door.rotation=rotation;if(rotation)[door.w,door.d]=[door.d,door.w];door.doorDirection=direction;door.open=true;const side=(clear?-direction:direction)*doorDimensions(door).opening/4;
  const player={x:rotation?1.5:side,y:0,z:rotation?-side:1.5,vy:0,grounded:true};for(let i=0;i<30;i++)movePlayer(player,[door],rotation?-.1:0,rotation?0:-.1,.02,false);
  assert.equal((rotation?player.x:player.z)<-.5,clear);
 }
});
test('以前のスライドドアも、幅と場所を変えずに中で重なる方式で表示する',()=>{
 const o=part('door',8,2);o.doorStyle='slide';o.doorMode='free';const before=[o.x,o.z,o.w,o.d],model=makeDoorModel(o,materials);o.doorAmount=1;o.open=true;updateDoorModel(model,o);assert.equal(model.userData.variantLeaves.length,2);assert.ok(sizeOf(model).x<=4);assert.deepEqual([o.x,o.z,o.w,o.d],before);assert.ok(doorSolids(o).some(s=>s.id.endsWith('panel:1')));
 const p=fresh3D();p.objects=[o];assert.ok(validate3D(p));
});

test('２枚版と４枚版は近くの１枚だけを開き、場所と90度回転に対応する',()=>{
 for(const preset of ['doubleSlide','fusuma'])for(const rotation of [0,90])for(let index=0;index<(preset==='fusuma'?4:2);index++){
  const p=fresh3D(),door=configureDoor(part('door',2,2),preset);if(rotation)rotatePiece(door);const panel=slidingDoorPanels(door)[index];p.objects=[door];p.spawn={x:door.x+(rotation?1.5:panel.baseX),y:0,z:door.z+(rotation?-panel.baseX:1.5)};const g=create3D(p),runtime=g.objects[0];assert.equal(doorInteraction(runtime,g.player).index,index);step3D(g,p,{useDoor:true,yaw:rotation?Math.PI/2:0},.02);
  assert.deepEqual(runtime.doorPanelOpen,Array.from({length:preset==='fusuma'?4:2},(_,i)=>i===index));const model=makeDoorModel(runtime,materials);assert.equal(model.userData.variantLeaves.length,preset==='fusuma'?4:2);for(let i=0;i<15;i++)step3D(g,p,{},.02);updateDoorModel(model,runtime);const leaf=model.userData.variantLeaves[index],neighbor=model.userData.variantLeaves[index%2===0?index+1:index-1];assert.ok(Math.abs(leaf.hinge.position.x-neighbor.hinge.position.x)<1e-8);assert.equal(door.doorPanelOpen,undefined);
 }
});
test('４枚版は別の組を開いたまま近い扉だけを開閉し、イベントは１度だけ実行する',()=>{
 const p=fresh3D(),door=configureDoor(part('door',0,0),'fusuma');door.events=[{type:'openDoor',target:door.id},{type:'addScore',amount:3}];p.objects=[door];const g=create3D(p),runtime=g.objects[0],at=index=>{g.player.x=slidingDoorPanels(runtime)[index].baseX;g.player.z=1.5;g.player.y=0;};
 at(0);step3D(g,p,{useDoor:true},.02);assert.deepEqual(runtime.doorPanelOpen,[true,false,false,false]);assert.equal(g.score,3);
 at(2);assert.equal(doorInteraction(runtime,g.player).open,false);step3D(g,p,{useDoor:true},.02);assert.deepEqual(runtime.doorPanelOpen,[true,false,true,false]);assert.equal(g.score,3);
 at(0);step3D(g,p,{useDoor:true},.02);assert.deepEqual(runtime.doorPanelOpen,[false,false,true,false]);assert.equal(runtime.open,true);
 at(2);g.player.z=0;step3D(g,p,{useDoor:true},.02);assert.equal(runtime.doorPanelOpen[2],true);at(2);step3D(g,p,{useDoor:true},.02);assert.equal(runtime.open,false);
});
test('開き戸は半マス分の開口だけを通れ、壁で埋めた半分は通れない',()=>{
 for(const preset of ['swing','key'])for(const side of [-1,1])for(const rotation of [0,90])for(const clear of [true,false]){
  const door=configureDoor(part('door',0,0),preset);door.doorSide=side;if(rotation)rotatePiece(door);door.open=true;const localX=(clear?side:-side),player={x:door.x+(rotation?1.5:localX),y:0,z:door.z+(rotation?-localX:1.5),vy:0,grounded:true};for(let i=0;i<30;i++)movePlayer(player,[door],rotation?-.1:0,rotation?0:-.1,.02,false);assert.equal((rotation?player.x-door.x:player.z-door.z)<-.5,clear);
  const model=makeDoorModel(door,materials);assert.ok(model.userData.panel.children[0].scale.x<=2);const p=fresh3D();p.objects=[door];assert.equal(validate3D(p).objects[0].doorSide,side);
 }
});
