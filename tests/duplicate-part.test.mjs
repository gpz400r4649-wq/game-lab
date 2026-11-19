import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh3D,part} from '../engine3d.js';
import {configureBuildingPart} from '../architecture3d.js';
import {editorPlacementReason} from '../building3d.js';
import {findDuplicatePosition} from '../editor-drag3d.js';

test('すぐ隣が全部埋まっていても、同じ高さの空きマスに複製できる',()=>{
 const project=fresh3D();
 const original=part('floor',0,0);
 original.y=4.5;
 project.objects=[original,...Array.from({length:8},(_,i)=>i<4?i:i+1).map(index=>{
  const floor=part('floor',(index%3-1)*4,(Math.floor(index/3)-1)*4);
  floor.y=original.y;
  return floor;
 })];
 const copy=findDuplicatePosition(project,original);
 assert.deepEqual([copy.x,copy.y,copy.z],[8,4.5,0]);
 assert.notEqual(copy.id,original.id);
 assert.equal(editorPlacementReason(copy,project.objects,project.spawn,project),'');
 assert.equal(project.objects.length,9);
});

test('４分の１の床はほかのパーツに重ならず、端から内側へ半マス単位で複製できる',()=>{
 const p=fresh3D(),floor=(x,z)=>configureBuildingPart(part('floor',x,z),'floorQuarter');
 const original=floor(27,27);
 p.objects=[original,floor(27,25),floor(25,27)];
 const copy=findDuplicatePosition(p,original);
 assert.deepEqual([copy.x,copy.z],[25,25]);
 assert.equal(copy.floorQuarter,true);
});

test('アイテムの複製は既存のアイテムと重ならず、足元に床があっても置ける',()=>{
 const p=fresh3D(),star=part('star',0,0);
 p.objects=[star,part('star',2,0),part('floor',0,0)];
 const copy=findDuplicatePosition(p,star);
 assert.deepEqual([copy.x,copy.y,copy.z],[0,0,2]);
});
