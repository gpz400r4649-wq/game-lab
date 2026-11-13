import test from 'node:test';
import assert from 'node:assert/strict';
import {configureBuildingPart,FLOOR_PRESETS,validArchitecture} from '../architecture3d.js';
import {part,fresh3D,create3D,movePlayer,validate3D} from '../engine3d.js';
import {constructionPart,snapEditorPiece,rotatePiece,gridStep,editorPlacementReason,makeTool,placement,placeStructure,blockTemplate,giveBlock,placeBlock,keepStructures} from '../building3d.js';
import {dragCandidate} from '../editor-drag3d.js';
import {shootVolley,updateCombat} from '../combat3d.js';
const spawn={x:20,y:0,z:20},half=(x=-1,z=0,y=0,rotation=0)=>constructionPart('halfFloor',x,z,y,rotation);
test('床の一覧に通常とハーフがあり、床と同じ厚さで半分の面積になる',()=>{
 assert.ok(FLOOR_PRESETS.floorHalf);const o=configureBuildingPart(part('floor'),'floorHalf');assert.equal(o.floorHalf,true);assert.deepEqual([o.w,o.h,o.d],[2,.25,4]);assert.ok(validArchitecture(o));configureBuildingPart(o,'floor');assert.equal(o.floorHalf,undefined);assert.deepEqual([o.w,o.h,o.d],[4,.25,4]);const bad=half();bad.type='wall';assert.equal(validArchitecture(bad),false);
});
test('２枚で１マスを埋め、左右・前後の両向きにマスにそろう',()=>{
 for(const rotation of [0,90]){const a=half(),b=half();if(rotation){rotatePiece(a);rotatePiece(b);}const axis=rotation?'z':'x';a[axis]=-1;b[axis]=1;assert.equal(editorPlacementReason(a,[],spawn),'');assert.equal(editorPlacementReason(b,[a],spawn),'');assert.notEqual(editorPlacementReason(a,[a],spawn),'');assert.notEqual(editorPlacementReason(constructionPart('floor'),[a],spawn),'');assert.equal(a.w*a.d+b.w*b.d,16);}
 const left=snapEditorPiece(half(),{x:-.7,y:0,z:.3}),right=snapEditorPiece(half(),{x:.7,y:0,z:.3});assert.deepEqual([left.x,left.z,right.x,right.z],[-1,0,1,0]);assert.equal(gridStep(left,'x'),2);assert.equal(gridStep(left,'z'),4);
});
test('90度回しても同じマス内で向きが変わり、４回で元の位置に戻る',()=>{
 const o=half(),result=[];for(let i=0;i<4;i++){rotatePiece(o);result.push([o.x,o.z,o.rotation]);assert.ok(validArchitecture(o));}assert.deepEqual(result,[[0,1,90],[1,0,0],[0,-1,90],[-1,0,0]]);
 const moved=dragCandidate(o,{x:-1,z:0},{x:1.2,z:4.1},[],spawn,60);assert.equal(moved.reason,'');assert.deepEqual([moved.piece.x,moved.piece.z],[1,4]);
});
test('壁際に置け、スロープの高い端へも半マスの幅に合わせてつながる',()=>{
 assert.equal(editorPlacementReason(half(),[constructionPart('wall',0,2),constructionPart('wall',-2,0,0,90)],spawn),'');const ramp=constructionPart('ramp');
 const a=snapEditorPiece(half(),{x:-.8,y:3,z:-1.9},ramp,{x:0,y:1,z:0});assert.deepEqual([a.x,a.y,a.z],[-1,3,-4]);assert.equal(editorPlacementReason(a,[ramp],spawn),'');
 const b=snapEditorPiece(half(0,0,0,90),{x:0,y:3,z:-1.9},ramp,{x:0,y:1,z:0});assert.deepEqual([b.x,b.y,b.z],[0,3,-3]);assert.equal(editorPlacementReason(b,[ramp],spawn),'');
});
test('２階のハーフ床に着地でき、空いた半分では床を踏まない',()=>{
 const o=half(-1,0,3),on={x:-1,y:5,z:0,vy:0,grounded:false},off={x:1,y:5,z:0,vy:0,grounded:false};for(let i=0;i<100;i++){movePlayer(on,[o],0,0,.02,false);movePlayer(off,[o],0,0,.02,false);}assert.equal(on.y,3.25);assert.equal(off.y,0);
 const a=half(-1,0,3),b=half(1,0,3),walker={x:-1,y:3.25,z:0,vy:0,grounded:true,supportId:a.id};for(let i=0;i<20;i++)movePlayer(walker,[a,b],.1,0,.02,false);assert.ok(walker.x>.9);assert.equal(walker.y,3.25);
});
test('弾はハーフ床に当たり、空いた半分を通る',()=>{
 for(const x of [-1,1]){const p=fresh3D();p.objects=[half(-1,0,3)];const g=create3D(p);shootVolley(g,{x,y:3.1,z:-3},{x:0,y:0,z:1},{...makeTool(),aimJitter:0,damage:3,speed:20,range:6});for(let i=0;i<25;i++)updateCombat(g,.01);assert.equal(g.objects[0].hp,x===-1?17:20);}
});
test('建築銃でも左右・前後と高さを指定し、壁の上とスロープにもそろう',()=>{
 const p=fresh3D(),tool=makeTool('halfFloor');p.loadout.push(tool);assert.ok(validate3D(p));const g=create3D(p);g.equipped=1;for(const rotation of [0,90])for(const side of [-1,1]){const point=rotation?{x:0,y:0,z:side*.8}:{x:side*.8,y:0,z:0},r=placement(g,tool,point,rotation,1);assert.ok(r.valid,r.reason);assert.deepEqual([r.piece.x,r.piece.y,r.piece.z],rotation?[0,3,side]:[side,3,0]);assert.ok(validArchitecture(r.piece));}
 const wall=constructionPart('wall',0,2),atWall=placement(g,tool,{x:-.8,y:3,z:2,surface:wall,normal:{x:0,y:1,z:0}});assert.equal(atWall.piece.x,-1);const ramp=constructionPart('ramp'),atRamp=placement(g,tool,{x:0,y:3,z:-1.9,surface:ramp,normal:{x:0,y:1,z:0}},90);assert.deepEqual([atRamp.piece.x,atRamp.piece.y,atRamp.piece.z],[0,3,-3]);assert.ok(atRamp.valid,atRamp.reason);
 assert.ok(placeStructure(g,p,{buildPoint:{x:-.8,y:0,z:0}}).valid);assert.ok(placeStructure(g,p,{buildPoint:{x:.8,y:0,z:0}}).valid);assert.equal(g.buildings.length,2);keepStructures(p,g);assert.ok(validate3D(p));assert.ok(p.objects.every(o=>o.floorHalf));
});
test('拾ったハーフ床も向きと半マス位置を保って置き直せ、保存できる',()=>{
 for(const rotation of [0,90]){const p=fresh3D(),g=create3D(p);giveBlock(g,blockTemplate(half()));const point=rotation?{x:0,y:0,z:-.8}:{x:-.8,y:0,z:0},r=placeBlock(g,{buildPoint:point,buildRotation:rotation});assert.ok(r.valid,r.reason);assert.equal(r.piece.floorHalf,true);assert.deepEqual([r.piece.x,r.piece.z],rotation?[0,-1]:[-1,0]);keepStructures(p,g);assert.deepEqual(validate3D(JSON.parse(JSON.stringify(p))),p);}
});
