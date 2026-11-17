import test from 'node:test';
import assert from 'node:assert/strict';
import {part,fresh3D,validate3D} from '../engine3d.js';
import {configureDoor} from '../doors3d.js';
import {configureBuildingPart} from '../architecture3d.js';
import {alignPiece,constructionPart,snapEditorPiece,rotatePiece,gridStep,editorPlacementReason} from '../building3d.js';
import {dragCandidate} from '../editor-drag3d.js';
import {groupCandidate} from '../group-edit3d.js';
const spawn={x:20,y:0,z:20};
const middle=key=>key==='wall'?constructionPart('wall'):configureDoor(part('door'),key);
for(const key of ['wall','frame','windowFrame','windowGlass','windowSwing','swing','glassSlide'])for(const turned of [false,true])test(`${key}: ハーフ壁の間に半マスずらして接続・積み重ね・保存できる (${turned?90:0}度)`,()=>{
 const axis=turned?'z':'x',thin=turned?'x':'z',size=turned?'d':'w';
 const left=configureBuildingPart(part('wall',-1,2),'halfVertical');
 if(turned){[left.w,left.d]=[left.d,left.w];left.rotation=90;left.x=2;left.z=-1;}
 const normal={x:0,y:0,z:0};normal[axis]=1;
 const point={x:left.x,y:1,z:left.z};point[axis]+=1;
 const center=snapEditorPiece(middle(key),point,left,normal);
 assert.equal(center[axis],2);assert.equal(center[thin],2);
 assert.equal(center[axis]-center[size]/2,left[axis]+left[size]/2);
 assert.equal(editorPlacementReason(center,[left],spawn),'');
 const end={x:center.x,y:1,z:center.z};end[axis]+=2;
 const right=snapEditorPiece(configureBuildingPart(part('wall'),'halfVertical'),end,center,normal);
 assert.equal(right[axis],5);assert.equal(right[axis]-right[size]/2,center[axis]+center[size]/2);
 assert.equal(editorPlacementReason(right,[left,center],spawn),'');
 const header=snapEditorPiece(configureBuildingPart(part('wall'),'halfHorizontal'),{x:center.x,y:3,z:center.z},center,{x:0,y:1,z:0});
 assert.equal(header[axis],2);assert.equal(header[thin],2);assert.equal(header.y,3);
 assert.equal(editorPlacementReason(header,[left,center,right],spawn),'');
 assert.notEqual(editorPlacementReason({...center,id:'duplicate'},[left,center,right],spawn),'');
 const p=fresh3D();p.spawn=spawn;p.objects=[left,center,right,header];
 assert.deepEqual(validate3D(JSON.parse(JSON.stringify(p))).objects.map(o=>[o.x,o.y,o.z]),p.objects.map(o=>[o.x,o.y,o.z]));
 const copied=groupCandidate(p,p.objects.map(o=>o.id),{x:8,y:0,z:8},{copy:true});
 assert.equal(copied.reason,'');for(let i=0;i<p.objects.length;i++)assert.deepEqual([copied.pieces[i].x,copied.pieces[i].z],[p.objects[i].x+8,p.objects[i].z+8]);
});
test('普通の壁と窓をドラッグ・移動で半マスずらし、回転後も位置が丸め直されない',()=>{
 for(const key of ['wall','windowGlass','swing']){
  const o=middle(key);o.x=0;o.z=2;
  const moved=dragCandidate(o,{x:0,z:2},{x:2,z:2},[],spawn,60);
  assert.equal(moved.reason,'');assert.deepEqual([moved.piece.x,moved.piece.z],[2,2]);
  const p=moved.piece;assert.equal(gridStep(p,'x'),2);assert.equal(gridStep(p,'z'),2);
  const first=[p.x,p.z,p.w,p.d,p.rotation||0];for(let i=0;i<(key==='wall'?2:4);i++)rotatePiece(p);
  assert.deepEqual([p.x,p.z,p.w,p.d,p.rotation||0],first);
  p.x+=gridStep(p,'x');alignPiece(p);assert.equal(p.x,4);
 }
});
test('普通の床とブロックのグリッドは１マスのまま、壁と窓は端でもはみ出さない',()=>{
 for(const type of ['floor','box']){const o=type==='floor'?constructionPart('floor'):part('box');assert.equal(gridStep(o,'x'),4);o.x=1.9;alignPiece(o);assert.equal(o.x,0);}
 for(const key of ['wall','windowGlass'])for(const sign of [-1,1]){const o=middle(key);o.x=30*sign;o.z=30*sign;alignPiece(o);assert.ok(Math.abs(o.x)+o.w/2<=30);assert.ok(Math.abs(o.z)+o.d/2<=30);}
});
