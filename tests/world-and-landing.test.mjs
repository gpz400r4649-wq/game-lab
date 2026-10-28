import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh3D,validate3D,create3D,step3D,movePlayer} from '../engine3d.js';
import {constructionPart,snapEditorPiece,placement,makeTool,topAt,editorPlacementReason,alignPiece} from '../building3d.js';
import {WORLD_SIZES,worldSize,resizeReason,spawnReason} from '../world3d.js';
import {shootVolley,updateCombat} from '../combat3d.js';
test('スロープの上面と上端から床をつなぐと、４方向とも同じ上階になる',()=>{
 for(const rotation of [0,90,180,270])for(const base of [0,.25])for(const face of ['slope','high']){
  const a=rotation*Math.PI/180,s=Math.sin(a),c=Math.cos(a),r=constructionPart('ramp',0,0,base,rotation),normal=face==='slope'?{x:0,y:.8,z:.6}:{x:-s,y:0,z:-c};
  const f=snapEditorPiece(constructionPart('floor'),{x:-s*1.9,y:base+2.9,z:-c*1.9},r,normal);
  assert.equal(f.y,3);assert.ok(Math.abs(f.x+s*4)<.001);assert.ok(Math.abs(f.z+c*4)<.001);
  const g={objects:[r],player:{x:s*5,y:0,z:c*5}};const result=placement(g,makeTool('floor'),{x:0,y:2.8,z:0,surface:r,normal});assert.ok(result.valid,result.reason);assert.equal(result.piece.y,3);assert.equal(result.piece.x,f.x);assert.equal(result.piece.z,f.z);
  const p=fresh3D();p.objects=[r,f];const run=create3D(p);Object.assign(run.player,{x:s*1.4,z:c*1.4,y:topAt(r,s*1.4,c*1.4),grounded:true,supportId:r.id});for(let i=0;i<50;i++)step3D(run,p,{z:-1,yaw:a},.02);assert.equal(run.player.supportId,f.id);assert.equal(run.player.y,3.25);
 }
});
test('L字の壁の角で、移動量を超えた押し戻しが起きない',()=>{
 for(const reverse of [false,true])for(const rotate of [false,true]){
  const walls=[constructionPart('wall',0,-2),constructionPart('wall',2,0,0,90)];if(reverse)walls.reverse();if(rotate)for(const o of walls){[o.x,o.z]=[o.z,o.x];[o.w,o.d]=[o.d,o.w];}
  const p={x:1.5,y:0,z:-1.5,vy:0,grounded:true};if(rotate)[p.x,p.z]=[p.z,p.x];
  for(let i=0;i<300;i++){const before={...p};movePlayer(p,walls,rotate?-.07:.07,rotate?.07:-.07,.02,i===100);assert.ok(Math.abs(p.x-before.x)<=.07001,JSON.stringify(p));assert.ok(Math.abs(p.z-before.z)<=.07001,JSON.stringify(p));assert.ok(Number.isFinite(p.y));}
 }
});
test('マップの広さは保存され、旧作品は60mのまま引き継ぐ',()=>{
 const legacy=fresh3D();delete legacy.worldSize;assert.equal(validate3D(legacy).worldSize,60);
 for(const size of WORLD_SIZES){const p=fresh3D();p.worldSize=size;p.spawn.x=size/2-4;p.objects=[constructionPart('floor',-size/2+4,0,3)];assert.deepEqual(validate3D(p),p);assert.equal(create3D(p).worldSize,size);}
 for(const size of [-1,0,100,9999,'960',null])assert.throws(()=>validate3D({...fresh3D(),worldSize:size}));
});
test('広い世界でも移動・建築・弾が旧境界を越えて働き、外周と配置数を制限する',()=>{
 const p=fresh3D();p.worldSize=960;p.spawn={x:200,y:0,z:200};const g=create3D(p);for(let i=0;i<20;i++)step3D(g,p,{x:1},.02);assert.ok(g.player.x>201);
 const piece=snapEditorPiece(constructionPart('floor'),{x:204,z:204},null,null,p);assert.equal(piece.x,204);assert.equal(editorPlacementReason(piece,[],p.spawn,p),'');assert.equal(alignPiece(constructionPart('floor',900,900),p).x,476);
 const result=placement(g,makeTool('floor'),{x:204,y:0,z:204});assert.ok(result.valid,result.reason);
 assert.ok(!placement({...g,objects:Array(150).fill(piece)},makeTool('floor'),{x:204,y:0,z:204}).valid);
 shootVolley(g,{x:200,y:1,z:200},{x:1,y:0,z:0},p.loadout[0]);updateCombat(g,.02);assert.equal(g.bullets.length,1);
 g.player.x=478.99;for(let i=0;i<20;i++)step3D(g,p,{x:1},.02);assert.equal(g.player.x,479);
});
test('縮小で部品やスタートを消さず、重なる場所へのスタート移動を断る',()=>{
 const p=fresh3D();p.worldSize=960;p.objects=[constructionPart('wall',200,0)];assert.ok(resizeReason(p,60));assert.equal(resizeReason(p,960),'');p.objects=[];p.spawn.x=200;assert.ok(resizeReason(p,60));p.spawn.x=0;p.objects=[constructionPart('floor')];assert.ok(spawnReason(p,0,0));assert.equal(spawnReason(p,20,20),'');assert.ok(spawnReason(p,500,0));assert.equal(worldSize(p),960);
});

test('保存済みの床が板１枚分高くても、スロープから上階へ移れる',()=>{for(const base of [0,.25])for(const rotation of [0,90,180,270]){const a=rotation*Math.PI/180,s=Math.sin(a),c=Math.cos(a),r=constructionPart('ramp',0,0,base,rotation),f=constructionPart('floor',-s*4,-c*4,3.25),p=fresh3D();p.objects=[r,f];const g=create3D(p);Object.assign(g.player,{x:s*1.4,z:c*1.4,y:topAt(r,s*1.4,c*1.4),grounded:true,supportId:r.id});for(let i=0;i<50;i++)step3D(g,p,{z:-1,yaw:a},.02);assert.equal(g.player.supportId,f.id);assert.equal(g.player.y,3.5);}});

test('外周で配置した壁も保存・読込できる座標に収める',()=>{for(const size of WORLD_SIZES){const p=fresh3D();p.worldSize=size;const wall=snapEditorPiece(constructionPart('wall'),{x:size/2,z:size/2},null,null,p);p.objects=[wall];assert.deepEqual(validate3D(p),p);}});
