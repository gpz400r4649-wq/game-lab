import {alignPiece,GRID_PARTS,editorPlacementReason} from './building3d.js?v=20261029v';
import {coordinateLimit} from './world3d.js?v=20261029v';
export function dragCandidate(original,grab,point,objects,spawn,world){
 if(!point||![point.x,point.z,grab.x,grab.z].every(Number.isFinite))return null;
 const piece={...original,x:original.x+point.x-grab.x,z:original.z+point.z-grab.z},limit=coordinateLimit(world);
 piece.x=Math.max(-limit,Math.min(limit,piece.x));piece.z=Math.max(-limit,Math.min(limit,piece.z));
 if(GRID_PARTS.has(piece.type))alignPiece(piece,world);else{piece.x=Math.round(piece.x);piece.z=Math.round(piece.z);}
 return {piece,reason:editorPlacementReason(piece,objects.filter(o=>o.id!==original.id),spawn,world)};
}
