import {fitRaceGate} from './race3d.js?v=20261120o';
import {courseStart} from './road3d.js?v=20261120o';
import {alignPiece,gridStep,GRID_PARTS,editorPlacementReason} from './building3d.js?v=20261119p';
import {coordinateLimit,worldHalf} from './world3d.js?v=20261119d';
import {nearbyObjects} from './spatial3d.js?v=20261119d';
import {MAX_PARTS} from './limits3d.js?v=20261119d';
import {fitTownPart,townPlacementReason} from './town3d.js?v=20261120p';
export function dragCandidate(original,grab,point,objects,spawn,world){
 if(!point||![point.x,point.z,grab.x,grab.z].every(Number.isFinite))return null;
 const piece={...original,x:original.x+point.x-grab.x,z:original.z+point.z-grab.z},limit=coordinateLimit(world);
 piece.x=Math.max(-limit,Math.min(limit,piece.x));piece.z=Math.max(-limit,Math.min(limit,piece.z));
 if(piece.type==='town'){
  fitTownPart(piece,world?.roads||[],piece);
  return {piece,reason:townPlacementReason(piece,objects,world)};
 }
 if(GRID_PARTS.has(piece.type))alignPiece(piece,world);else if(piece.type==='raceGate'&&world?.roads?.length)fitRaceGate(piece,world.roads,piece);else{piece.x=Math.round(piece.x);piece.z=Math.round(piece.z);}
 return {piece,reason:editorPlacementReason(piece,objects.filter(o=>o.id!==original.id),spawn,world)};
}

export function findDuplicatePosition(project,original){
 if(project.objects.length>=MAX_PARTS)return null;
 const grid=GRID_PARTS.has(original.type),index={objects:project.objects},id=crypto.randomUUID();
 const limit=coordinateLimit(project),half=worldHalf(project);
 const spawn=courseStart(project);
 const stepX=gridStep(original,'x'),stepZ=gridStep(original,'z');
 const maxRing=Math.ceil(2*limit/Math.min(stepX,stepZ));
 function tryOffset(dx,dz){
  const piece={...original,id,x:original.x+dx*stepX,z:original.z+dz*stepZ};
  if(Math.abs(piece.x)>limit||Math.abs(piece.z)>limit)return null;
  if(grid)alignPiece(piece,project);
  else if(piece.type==='raceGate')fitRaceGate(piece,project.roads||[],piece);
  else if(piece.type==='town'){
   fitTownPart(piece,project.roads||[],piece);
   if(piece.x===original.x&&piece.z===original.z||townPlacementReason(piece,project.objects,project))return null;
   return piece;
  }
  if(piece.x===original.x&&piece.z===original.z)return null;
  const left=piece.x-piece.w/2,right=piece.x+piece.w/2,near=piece.z-piece.d/2,far=piece.z+piece.d/2;
  if(left< -half||right>half||near< -half||far>half)return null;
  const neighbors=nearbyObjects(index,left,near,right,far);
  if(editorPlacementReason(piece,neighbors,spawn,project))return null;
  if(neighbors.some(other=>{
   if(grid&&GRID_PARTS.has(other.type))return false;
   if(other.type==='floor'&&other.h<=.4&&other.y<=piece.y+.001)return false;
   return Math.abs(other.x-piece.x)<(other.w+piece.w)/2-.015&&
    Math.abs(other.z-piece.z)<(other.d+piece.d)/2-.015&&
    piece.y<other.y+other.h-.015&&piece.y+piece.h>other.y+.015;
  }))return null;
  return piece;
 }
 for(let ring=1;ring<=maxRing;ring++){
  for(const [x,z] of [[ring,0],[0,ring],[-ring,0],[0,-ring]]){
   const copy=tryOffset(x,z);if(copy)return copy;
  }
  for(let offset=-ring;offset<=ring;offset++){
   if(offset===0)continue;
   const offsets=[[ring,offset],[-ring,offset]];
   if(Math.abs(offset)<ring)offsets.push([offset,ring],[offset,-ring]);
   for(const [x,z] of offsets){
    const copy=tryOffset(x,z);if(copy)return copy;
   }
  }
 }
 return null;
}
