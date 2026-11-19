import {isFurniture} from './furniture3d.js?v=20261119d';
import {gridStep,editorPlacementReason} from './building3d.js?v=20261119p';
import {MAX_PARTS,MAX_BUILD_Y} from './limits3d.js?v=20261119d';
import {coordinateLimit} from './world3d.js?v=20261119d';
import {rangeCell,validMoveRange,validAttackRange} from './enemy-range3d.js?v=20261119d';
import {validPatrolRoute,validWaypoints} from './patrol-route3d.js?v=20261119d';
import {validate3D} from './engine3d.js?v=20261119x';
export function groupSteps(objects){
 const steps={x:1,y:0.25,z:1};
 for(const part of objects){
  // Each axis uses a step shared by all selected parts so their offsets stay intact.
  for(const axis of ['x','y','z'])steps[axis]=Math.max(steps[axis],gridStep(part,axis));
  if([part.moveRange,part.searchRange,part.attackRange].some(range=>range?.space==='world')){
   steps.x=Math.max(steps.x,4);
   steps.z=Math.max(steps.z,4);
  }
 }
 return steps;
}
export function groupCandidate(project,ids,delta,{copy=false}={}){
 const chosen=new Set(ids),sources=project.objects.filter(o=>chosen.has(o.id));
 if(!sources.length)return {pieces:[],reason:'パーツをえらぼう'};
 if(!['x','y','z'].every(key=>Number.isFinite(delta[key])))return {pieces:[],reason:'動かす場所をえらぼう'};
 if(copy&&project.objects.length+sources.length>MAX_PARTS)return {pieces:[],reason:`コピーすると${MAX_PARTS}個をこえます`};
 const steps=groupSteps(sources),dx=Math.round(delta.x/steps.x)*steps.x,dz=Math.round(delta.z/steps.z)*steps.z,dy=Math.round(delta.y/steps.y)*steps.y,limit=coordinateLimit(project);
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
 const steps=groupSteps(pieces),gapless=pieces.every(isFurniture);
 const extent=axis=>{
  const size=axis==='x'?'w':'d';
  const width=Math.max(...pieces.map(o=>o[axis]+o[size]/2))-Math.min(...pieces.map(o=>o[axis]-o[size]/2));
  return (Math.ceil(width/steps[axis])+(gapless?0:1))*steps[axis];
 };
 const width=extent('x'),depth=extent('z');
 let last='コピーを置く場所が空いていません';
 for(const distance of [1,2,3])for(const [x,z]of [[width*distance,0],[0,depth*distance],[-width*distance,0],[0,-depth*distance]]){
  const delta={x,y:0,z},result=groupCandidate(project,ids,delta,{copy:true});if(result.reason){last=result.reason;continue;}return commitGroup(project,ids,delta,{copy:true});
 }
 throw Error(last);
}
