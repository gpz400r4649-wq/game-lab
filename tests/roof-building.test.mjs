import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.min.js';
import {configureBuildingPart} from '../architecture3d.js';
import {makeRoofSlopeGeometry,makeGableGeometry} from '../architecture-model3d.js';
import {part,fresh3D,create3D,validate3D,movePlayer} from '../engine3d.js';
import {topAt,bottomAt,snapEditorPiece,rotatePiece,editorPlacementReason,constructionPart,blockTemplate,giveBlock,placeBlock,keepStructures} from '../building3d.js';
import {initializeCharacterDefaults,inheritNewCharacter} from '../character-defaults3d.js';
import {shootVolley,updateCombat} from '../combat3d.js';
const mat=new T.MeshBasicMaterial(),spawn={x:20,y:0,z:20};
const roof=()=>{const o=configureBuildingPart(part('roof',0,0),'roofSlope');o.y=3;return o;};
for(const rotation of [0,90,180,270])test(rotation+'度の屋根の頂点で反対の斜面をそろえ、端に三角の壁を置ける',()=>{
 const left=roof();left.rotation=rotation;const a=rotation*Math.PI/180,high={x:-Math.sin(a),z:-Math.cos(a)},ridge={x:Math.cos(a),z:-Math.sin(a)},point={x:left.x+high.x*1.9,y:5.9,z:left.z+high.z*1.9},right=snapEditorPiece(roof(),point,left,{x:0,y:1,z:0});
 assert.equal(right.rotation,(rotation+180)%360);assert.equal(right.y,3);assert.ok(Math.abs(topAt(left,high.x*2,high.z*2)-topAt(right,high.x*2,high.z*2))<1e-8);assert.equal(editorPlacementReason(right,[left],spawn),'');
 const row=snapEditorPiece(roof(),{x:ridge.x*1.9,y:4.5,z:ridge.z*1.9},left,{x:0,y:1,z:0});assert.equal(row.rotation,rotation);assert.equal(row.y,3);assert.equal(editorPlacementReason(row,[left],spawn),'');
 for(const side of [-1,1]){const cap=snapEditorPiece(configureBuildingPart(part('wall'),'gableLeft'),{x:ridge.x*side*1.9,y:4.5,z:ridge.z*side*1.9},left,{x:0,y:1,z:0});assert.equal(cap.y,3);assert.equal(cap.h,3);assert.equal(editorPlacementReason(cap,[left],spawn),'');for(const t of [-1.5,0,1.5]){const x=cap.x+high.x*t,z=cap.z+high.z*t;assert.ok(Math.abs(topAt(cap,x,z)-topAt(left,x,z))<1e-8);}}
});
test('斜面と三角の壁の3D形状は当たり判定の高さと一致し、屋根の裏も薄い',()=>{
 for(const kind of ['roofSlope','gableLeft','gableRight'])for(const rotation of kind==='roofSlope'?[0,90,180,270]:[0,90]){
  const o=configureBuildingPart(part(kind==='roofSlope'?'roof':'wall',0,0),kind);o.rotation=rotation;if(rotation===90&&o.type==='wall')[o.w,o.d]=[o.d,o.w];const geometry=kind==='roofSlope'?makeRoofSlopeGeometry():makeGableGeometry(kind),mesh=new T.Mesh(geometry,mat),turned=rotation%180===90;mesh.rotation.y=rotation*Math.PI/180;mesh.scale.set(turned?o.d:o.w,o.h,turned?o.w:o.d);mesh.updateMatrixWorld(true);
  for(const t of [-1.5,0,1.5]){const x=o.type==='wall'&&rotation===90?0:t,z=o.type==='wall'&&rotation===90?t:0,hit=new T.Raycaster(new T.Vector3(x,10,z),new T.Vector3(0,-1,0)).intersectObject(mesh)[0];assert.ok(hit);assert.ok(Math.abs(hit.point.y-topAt(o,x,z))<1e-5);if(o.roofStyle){const underside=new T.Raycaster(new T.Vector3(x,-2,z),new T.Vector3(0,1,0)).intersectObject(mesh)[0];assert.ok(underside);assert.ok(Math.abs(underside.point.y-bottomAt(o,x,z))<1e-5);}}
 }
});
test('屋根の下の空間を部屋として歩けて、ジャンプすると屋根の裏に当たる',()=>{
 const r=roof();r.rotation=270;const floor=constructionPart('floor');floor.y=2.75;const p={x:1.25,y:3,z:-1.5,vy:0,grounded:true,supportId:floor.id};for(let i=0;i<30;i++)movePlayer(p,[floor,r],0,.1,.02,false);assert.ok(p.z>1.4);assert.equal(p.y,3);
 p.z=0;const ceiling=bottomAt(r,p.x,p.z);let max=0;for(let i=0;i<70;i++){movePlayer(p,[floor,r],0,0,.02,i===0);max=Math.max(max,p.y+1.7);}assert.ok(max>4.8);assert.ok(max<=ceiling+.02);assert.equal(p.y,3);
});
test('屋根の下の弾は通り、薄い屋根面に当たった弾は止まる',()=>{
 for(const [y,passes]of [[4.8,true],[5.3,false]]){const p=fresh3D(),r=roof();r.rotation=270;p.objects=[r];const g=create3D(p);shootVolley(g,{x:1.25,y,z:-1.5},{x:0,y:0,z:1},{speed:10,interval:1,damage:1,spread:1,size:.1});for(let i=0;i<8;i++){g.time+=.02;updateCombat(g,.02);}assert.equal(g.bullets.length>0,passes);}
});
test('屋根・三角の壁の保存と共通体力、屋根の４方向の回転・アイテム再配置を保つ',()=>{
 const p=fresh3D();initializeCharacterDefaults(p,part);p.characterDefaults.block.hp=75;for(const key of ['roofSlope','gableLeft','gableRight']){const o=inheritNewCharacter(p,configureBuildingPart(part(key==='roofSlope'?'roof':'wall',0,0),key));p.objects.push(o);assert.equal(o.hp,75);}assert.ok(validate3D(JSON.parse(JSON.stringify(p))));
 const r=roof();for(const angle of [90,180,270,0]){rotatePiece(r);assert.equal(r.rotation,angle);}
 const stage=fresh3D(),g=create3D(stage);giveBlock(g,blockTemplate(r));const result=placeBlock(g,{buildPoint:{x:0,y:0,z:0},buildRotation:270});assert.ok(result.valid,result.reason);assert.equal(result.piece.rotation,270);assert.equal(result.piece.roofStyle,'slope');keepStructures(stage,g);assert.ok(validate3D(stage));
});
test('不正な屋根や三角の壁の指定を拒否する',()=>{
 for(const o of [{...part('roof'),roofStyle:'bad'},{...part('wall'),wallGable:'bad'},{...part('enemy'),roofStyle:'slope'}]){const p=fresh3D();p.objects=[o];assert.throws(()=>validate3D(p));}
});
