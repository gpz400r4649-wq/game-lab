import test from 'node:test';
import assert from 'node:assert/strict';
import {configureBuildingPart} from '../architecture3d.js';
import {part,fresh3D,create3D,validate3D} from '../engine3d.js';
import {constructionPart,snapEditorPiece,rotatePiece,gridStep,editorPlacementReason,blockTemplate,giveBlock,placeBlock,keepStructures} from '../building3d.js';
import {initializeCharacterDefaults,inheritNewCharacter,synchronizeCharacterDefaults} from '../character-defaults3d.js';
import {dragCandidate} from '../editor-drag3d.js';
const spawn={x:20,y:0,z:20};
function half(key,x=0,z=2){return configureBuildingPart(part('wall',x,z),key);}
test('縦ハーフ２枚を左右に並べると、１マスの壁になり、同じマスには重ねられない',()=>{
 const floor=constructionPart('floor'),left=snapEditorPiece(half('halfVertical'),{x:-.8,y:.25,z:1.9},floor,{x:0,y:1,z:0}),right=snapEditorPiece(half('halfVertical'),{x:.8,y:.25,z:1.9},floor,{x:0,y:1,z:0});
 assert.deepEqual([left.x,right.x,left.w,right.w,left.h],[-1,1,2,2,3]);assert.equal(right.x-right.w/2,left.x+left.w/2);assert.equal(editorPlacementReason(right,[left,floor],spawn),'');assert.notEqual(editorPlacementReason({...left,id:'copy'},[left],spawn),'');assert.equal(gridStep(left,'x'),2);assert.equal(gridStep(left,'z'),2);
 const moved=dragCandidate(left,{x:left.x,z:left.z},{x:left.x+2,z:left.z},[],spawn,60);assert.equal(moved.piece.x,right.x);assert.equal(moved.reason,'');
});
test('横ハーフ２枚を上下に積むと普通の壁と同じ高さになり、回しても高さは変わらない',()=>{
 const lower=half('halfHorizontal'),upper=snapEditorPiece(half('halfHorizontal'),{x:1.8,y:1.5,z:2.1},lower,{x:0,y:1,z:0});assert.deepEqual([lower.w,lower.h,upper.y,upper.h],[4,1.5,1.5,1.5]);assert.equal(upper.y+upper.h,3);assert.equal(editorPlacementReason(upper,[lower],spawn),'');assert.equal(gridStep(upper,'y'),1.5);rotatePiece(upper);assert.equal(upper.h,1.5);assert.equal(upper.d,4);
});
test('縦ハーフの左右を90度回しても区別し、戻すと元の位置になる',()=>{
 const pieces=[half('halfVertical',-1),half('halfVertical',1)],before=pieces.map(o=>[o.x,o.z,o.w,o.d]);for(const o of pieces)rotatePiece(o);assert.deepEqual(pieces.map(o=>[o.x,o.z]),[[2,1],[2,-1]]);assert.ok(pieces.every(o=>o.w===.25&&o.d===2));assert.equal(editorPlacementReason(pieces[1],[pieces[0]],spawn),'');assert.equal(gridStep(pieces[0],'z'),2);for(const o of pieces)rotatePiece(o);assert.deepEqual(pieces.map(o=>[o.x,o.z,o.w,o.d]),before);
});
test('ハーフ壁は通常の壁の隣や真上でもグリッドにそろう',()=>{
 const wall=constructionPart('wall',0,2);for(const sign of [-1,1]){const next=snapEditorPiece(half('halfVertical'),{x:sign*1.8,y:1,z:2.125},wall,{x:0,y:0,z:1});assert.equal(next.x,sign*3);assert.equal(editorPlacementReason(next,[wall],spawn),'');const top=snapEditorPiece(half('halfVertical'),{x:sign*.8,y:3,z:2},wall,{x:0,y:1,z:0});assert.equal(top.x,sign);assert.equal(top.y,3);}
});
for(const key of ['halfVertical','halfHorizontal'])test(key+'は全体設定・保存・アイテムから置き直しても種類と大きさを保つ',()=>{
 const p=fresh3D();initializeCharacterDefaults(p,part);p.characterDefaults.block.hp=100;const o=inheritNewCharacter(p,half(key,-1));p.objects=[o];assert.equal(o.hp,100);const restored=validate3D(JSON.parse(JSON.stringify(p)));assert.equal(restored.objects[0].wallHalf,key);restored.characterDefaults.block.hp=150;synchronizeCharacterDefaults(restored);assert.equal(restored.objects[0].hp,150);
 const stage=fresh3D(),floor=constructionPart('floor');stage.objects=[floor];const g=create3D(stage);giveBlock(g,blockTemplate(o));const result=placeBlock(g,{buildPoint:{x:-.8,y:.25,z:1.9,surface:floor,normal:{x:0,y:1,z:0}}});assert.ok(result.valid,result.reason);assert.equal(result.piece.wallHalf,key);assert.equal(result.piece.w,o.w);assert.equal(result.piece.h,o.h);assert.equal(keepStructures(stage,g),1);assert.equal(validate3D(stage).objects[1].wallHalf,key);
});
test('不正なハーフ壁の指定や他のパーツへの指定を拒否する',()=>{
 for(const o of [{...part('wall'),wallHalf:'bad'},{...part('enemy'),wallHalf:'halfVertical'}]){const p=fresh3D();p.objects=[o];assert.throws(()=>validate3D(p));}
});

test('拾った縦ハーフは指定した向きを保ち、横ハーフは1.5mずつ積める',()=>{
 const p=fresh3D(),g=create3D(p);giveBlock(g,blockTemplate(half('halfVertical')));const vertical=placeBlock(g,{buildPoint:{x:1.9,y:0,z:1.9},buildRotation:90});assert.ok(vertical.valid,vertical.reason);assert.equal(vertical.piece.rotation,90);assert.deepEqual([vertical.piece.x,vertical.piece.z,vertical.piece.w,vertical.piece.d],[2,1,.25,2]);
 const lower=half('halfHorizontal',-4,2),second=create3D(p);second.objects=[lower];giveBlock(second,blockTemplate(lower));const horizontal=placeBlock(second,{buildPoint:{x:-4,y:1.5,z:2,surface:lower,normal:{x:0,y:1,z:0}}});assert.ok(horizontal.valid,horizontal.reason);assert.equal(horizontal.piece.y,1.5);
});
