import {GRID_PARTS,editorPlacementReason} from './building3d.js?v=20261114b';
import {MAX_PARTS,MAX_BUILD_Y} from './limits3d.js?v=20261114b';
import {coordinateLimit} from './world3d.js?v=20261114b';
import {rangeCell,validMoveRange,validAttackRange} from './enemy-range3d.js?v=20261114b';
import {validPatrolRoute,validWaypoints} from './patrol-route3d.js?v=20261114b';
import {validate3D} from './engine3d.js?v=20261114b';
export function groupSteps(objects){return {horizontal:objects.some(o=>GRID_PARTS.has(o.type)||[o.moveRange,o.searchRange,o.attackRange].some(r=>r?.space==='world'))?4:1,vertical:objects.some(o=>['wall','floor','roof','ramp','box','door'].includes(o.type))?3:.5};}
export function groupCandidate(project,ids,delta,{copy=false}={}){
 const chosen=new Set(ids),sources=project.objects.filter(o=>chosen.has(o.id));
 if(!sources.length)return {pieces:[],reason:'パーツをえらぼう'};
 if(!['x','y','z'].every(key=>Number.isFinite(delta[key])))return {pieces:[],reason:'動かす場所をえらぼう'};
 if(copy&&project.objects.length+sources.length>MAX_PARTS)return {pieces:[],reason:'コピーすると2000個をこえます'};
 const steps=groupSteps(sources),dx=Math.round(delta.x/steps.horizontal)*steps.horizontal,dz=Math.round(delta.z/steps.horizontal)*steps.horizontal,dy=Math.round(delta.y/steps.vertical)*steps.vertical,limit=coordinateLimit(project);
 const pieces=sources.map(source=>{
  const next=structuredClone(source);next.x+=dx;next.y+=dy;next.z+=dz;
  for(const key of ['moveRange','searchRange','attackRange'])if(next[key]?.space==='world')next[key].cells=next[key].cells.map(([x,z])=>[x+rangeCell(next.x)-rangeCell(source.x),z+rangeCell(next.z)-rangeCell(source.z)]);
  for(const key of ['patrolRoute','waypoints'])if(next[key])for(const point of next[key]){point.x+=dx;point.z+=dz;}
  return next;
 });
 const obstacles=copy?project.objects:project.objects.filter(o=>!chosen.has(o.id));
 let reason='';
 for(const piece of pieces){
  if(Math.abs(piece.x)>limit||Math.abs(piece.z)>limit||piece.y<0||piece.y>MAX_BUILD_Y){reason='ステージの中に置こう';break;}
  if(!validPatrolRoute(piece.patrolRoute,limit)||!validWaypoints(piece.waypoints,limit)||!validMoveRange(piece.moveRange)||!validAttackRange(piece.searchRange)||!validAttackRange(piece.attackRange)){reason='コースやはんいがステージの外に出るよ';break;}
  // The parts already fit each other; check only against parts outside the group.
  reason=editorPlacementReason(piece,obstacles,project.spawn,project);if(reason)break;
 }
 return {pieces,reason,delta:{x:dx,y:dy,z:dz}};
}
export function commitGroup(project,ids,delta,{copy=false}={}){
 const result=groupCandidate(project,ids,delta,{copy});if(result.reason)throw Error(result.reason);
 const mapping=new Map(result.pieces.map(o=>[o.id,copy?crypto.randomUUID():o.id]));
 if(copy)for(const piece of result.pieces){
  piece.id=mapping.get(piece.id);
  for(const key of ['events','destroyEvents'])for(const action of piece[key]||[])if(['openDoor','spawnEnemy'].includes(action.type)&&mapping.has(action.target))action.target=mapping.get(action.target);
  if(mapping.has(piece.doorId))piece.doorId=mapping.get(piece.doorId);
 }
 const replacements=new Map(result.pieces.map(o=>[o.id,o]));
 const candidate={...project,objects:copy?[...project.objects,...result.pieces]:project.objects.map(o=>replacements.get(o.id)||o)};
 validate3D(candidate);
 // Keep unrelated objects and their inheritance snapshots intact.
 project.objects=candidate.objects;
 return result.pieces.map(o=>o.id);
}
export function copyGroupNearby(project,ids){
 const chosen=new Set(ids),pieces=project.objects.filter(o=>chosen.has(o.id));if(!pieces.length)throw Error('パーツをえらぼう');
 const steps=groupSteps(pieces),extent=axis=>Math.ceil((Math.max(...pieces.map(o=>o[axis]+o[axis==='x'?'w':'d']/2))-Math.min(...pieces.map(o=>o[axis]-o[axis==='x'?'w':'d']/2)))/steps.horizontal)*steps.horizontal+steps.horizontal;
 let last='コピーを置く場所が空いていません';
 for(const distance of [1,2,3])for(const [x,z]of [[extent('x')*distance,0],[0,extent('z')*distance],[-extent('x')*distance,0],[0,-extent('z')*distance]]){
  const delta={x,y:0,z},result=groupCandidate(project,ids,delta,{copy:true});if(result.reason){last=result.reason;continue;}return commitGroup(project,ids,delta,{copy:true});
 }
 throw Error(last);
}
