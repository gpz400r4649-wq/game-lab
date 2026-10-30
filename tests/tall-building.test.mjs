import test from 'node:test';import assert from 'node:assert/strict';
import {MAX_BUILD_Y,MAX_BUILD_LEVEL,MAX_PARTS} from '../limits3d.js';
import {fresh3D,part,create3D,step3D,validate3D} from '../engine3d.js';
import {constructionPart,snapEditorPiece,editorPlacementReason,topAt,placement,makeTool,placeStructure,keepStructures,blockTemplate,giveBlock,blockPlacement} from '../building3d.js';
import {shootVolley,updateCombat} from '../combat3d.js';
import {moveEditorCamera} from '../editor-camera3d.js';

test('高い階の壁・床・屋根・スロープとアイテムを積み重ねられる',()=>{
 const p=fresh3D();p.spawn={x:20,y:0,z:20};for(const y of [12,24,45,57]){const wall=constructionPart('wall',0,2,y);for(const type of ['wall','floor','roof','ramp']){const o=snapEditorPiece(constructionPart(type),{x:0,y:y+3,z:2},wall,{x:0,y:1,z:0},p);assert.ok(o.y>=y+3);assert.ok(o.y<=MAX_BUILD_Y);assert.equal(editorPlacementReason(o,[wall],p.spawn,p),'');}const star=snapEditorPiece(part('star'),{x:0,y:y+3,z:2},wall,{x:0,y:1,z:0},p);assert.equal(star.y,y+3);}
});
test('60mまでの部品は保存・読み込みでき、上限超過と非数値は拒否する',()=>{
 const p=fresh3D();p.objects=[constructionPart('floor',0,0,15),constructionPart('wall',4,2,30),constructionPart('roof',8,0,MAX_BUILD_Y),{...part('star',0,0),y:48}];assert.deepEqual(validate3D(p),p);for(const y of [MAX_BUILD_Y+.01,Infinity,NaN,-1]){const bad=structuredClone(p);bad.objects[0].y=y;assert.throws(()=>validate3D(bad));assert.ok(editorPlacementReason(bad.objects[0],[],p.spawn,p));}assert.equal(MAX_PARTS,2000);
});
test('高い階でも全４方向のスロープから上階の床へ歩いて移れる',()=>{
 for(const base of [12,27,54])for(const rotation of [0,90,180,270]){const a=rotation*Math.PI/180,s=Math.sin(a),c=Math.cos(a),r=constructionPart('ramp',0,0,base,rotation),f=constructionPart('floor',-s*4,-c*4,base+3),p=fresh3D();p.objects=[r,f];const g=create3D(p);Object.assign(g.player,{x:s*1.4,z:c*1.4,y:topAt(r,s*1.4,c*1.4),grounded:true,supportId:r.id});for(let i=0;i<50;i++)step3D(g,p,{z:-1,yaw:a},.02);assert.equal(g.player.supportId,f.id);assert.equal(g.player.y,base+3.25);}
});
test('建築銃は高い階で建築でき、作品に残した後も保存できる',()=>{
 for(const y of [15,30,60]){const p=fresh3D(),tool=makeTool('wall');p.loadout.push(tool);const g=create3D(p);g.player.y=y;g.equipped=1;const point={x:0,y,z:0},result=placeStructure(g,p,{buildPoint:point});assert.ok(result.valid,result.reason);assert.equal(result.piece.y,y);assert.equal(keepStructures(p,g),1);assert.deepEqual(validate3D(p),p);}
 const p=fresh3D(),g=create3D(p);g.player.y=57;assert.ok(placement(g,makeTool('wall'),{x:0,y:0,z:0},0,19).valid);assert.equal(placement(g,makeTool('wall'),{x:0,y:0,z:0},0,MAX_BUILD_LEVEL+1).valid,false);assert.equal(placement(g,makeTool('wall'),{x:0,y:63,z:0}).valid,false);
});
test('拾ったブロックも高い床の上に置ける',()=>{
 const p=fresh3D(),floor=constructionPart('floor',0,0,30);p.objects=[floor];const g=create3D(p);g.player.y=30;giveBlock(g,blockTemplate(part('box')));const result=blockPlacement(g,{x:0,y:30.25,z:0,surface:floor,normal:{x:0,y:1,z:0}});assert.ok(result.valid,result.reason);assert.equal(result.piece.y,30.25);
});
test('屋上の高さでも弾が消えず、敵に命中する',()=>{
 const p=fresh3D(),enemy=part('enemy',0,0);enemy.y=60;enemy.hp=1;enemy.attackEnabled=false;p.objects=[enemy];const g=create3D(p);shootVolley(g,{x:0,y:61,z:5},{x:0,y:0,z:-1},makeTool());for(let i=0;i<20;i++)updateCombat(g,.02);assert.equal(g.objects.length,0);assert.equal(g.score,10);assert.equal(p.objects[0].hp,1);
});
test('編集カメラは最上階より上から見下ろせ、上下の範囲を保つ',()=>{
 const target={x:0,y:MAX_BUILD_Y,z:0};for(let i=0;i<100;i++)moveEditorCamera(target,{y:1},0,20,.05,60);assert.equal(target.y,MAX_BUILD_Y+10);assert.ok(target.y>MAX_BUILD_Y);
});
