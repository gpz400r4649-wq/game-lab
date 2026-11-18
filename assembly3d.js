import {GRID_PARTS,GRID,editorPlacementReason,topAt} from './building3d.js?v=20261118d';
import {MAX_PARTS} from './limits3d.js?v=20261118d';
import {coordinateLimit} from './world3d.js?v=20261118d';

export const MAX_ASSEMBLIES=24;
export const MAX_ASSEMBLY_PARTS=128;
export function validAssemblies(assets){
 if(assets===undefined)return true;
 if(!Array.isArray(assets)||assets.length>MAX_ASSEMBLIES)return false;
 return new Set(assets.map(asset=>asset?.id)).size===assets.length&&assets.every(asset=>
  asset&&typeof asset.id==='string'&&typeof asset.name==='string'&&asset.name.trim()&&asset.name.length<=32&&
  asset.anchor&&['x','y','z'].every(axis=>Number.isFinite(asset.anchor[axis])&&Math.abs(asset.anchor[axis])<=480)&&
  Array.isArray(asset.parts)&&asset.parts.length>0&&asset.parts.length<=MAX_ASSEMBLY_PARTS&&asset.parts.every(part=>part&&GRID_PARTS.has(part.type)));
}

export function saveAssembly(project,parts,name){
 name=name.trim();
 if(!name||name.length>32)throw Error('名前を1〜32文字でつけよう');
 if(!parts.length||parts.length>MAX_ASSEMBLY_PARTS||parts.some(part=>!GRID_PARTS.has(part.type)))throw Error('建築パーツを1〜128個えらぼう');
 if((project.assemblies?.length||0)>=MAX_ASSEMBLIES)throw Error('自分のパーツは24種類まで保存できます');
 const snap=axis=>Math.round(Math.min(...parts.map(part=>part[axis]))/GRID.cell)*GRID.cell;
 const anchor={x:snap('x'),y:Math.min(...parts.map(part=>part.y)),z:snap('z')};
 const asset={id:crypto.randomUUID(),name,anchor,parts:structuredClone(parts)};
 (project.assemblies??=[]).push(asset);
 return asset;
}

export function assemblyCandidate(project,asset,point,turns){
 const snap=value=>Math.round(value/GRID.cell)*GRID.cell;
 const anchor={x:snap(point.x),y:point.y,z:snap(point.z)};
 const parts=asset.parts.map(source=>{
  const part=structuredClone(source);
  let x=source.x-asset.anchor.x,z=source.z-asset.anchor.z;
  for(let i=0;i<turns;i++)[x,z]=[z,-x];
  part.x=anchor.x+x;part.z=anchor.z+z;part.y=anchor.y+source.y-asset.anchor.y;
  if(turns%2){[part.w,part.d]=[part.d,part.w];if(part.settings.axis!=='y')part.settings.axis=part.settings.axis==='x'?'z':'x';}
  const rotation=((part.rotation||0)+90*turns)%360;
  const fullTurn=part.type==='ramp'||part.type==='door'||part.furnitureKind||part.wallHalf||part.roofStyle==='slope';
  if(part.wallGable&&rotation>=180)part.wallGable=part.wallGable==='gableLeft'?'gableRight':'gableLeft';
  part.rotation=fullTurn?rotation:rotation%180;
  return part;
 });
 if(project.objects.length+parts.length>MAX_PARTS)return {parts,reason:`部品は${MAX_PARTS}個まで置けます`};
 for(const part of parts){
  const reason=editorPlacementReason(part,project.objects,project.spawn,project);
  if(reason)return {parts,reason};
 }
 return {parts,reason:''};
}

export function assemblyCopies(parts){
 const ids=new Map(parts.map(part=>[part.id,crypto.randomUUID()]));
 return parts.map(part=>{
  const copy=structuredClone(part);
  copy.id=ids.get(part.id);
  for(const action of [...(copy.events||[]),...(copy.destroyEvents||[])]){
   if(['openDoor','spawnEnemy'].includes(action.type)&&ids.has(action.target))action.target=ids.get(action.target);
  }
  if(ids.has(copy.doorId))copy.doorId=ids.get(copy.doorId);
  return copy;
 });
}

export function temporarySpawn(point,surfaces,world){
 const limit=coordinateLimit(world);
 if(Math.abs(point.x)>limit||Math.abs(point.z)>limit||point.y<0)return null;
 const standsOn=point.y<.03||surfaces.some(part=>Math.abs(part.x-point.x)<=part.w/2&&Math.abs(part.z-point.z)<=part.d/2&&Math.abs(topAt(part,point.x,point.z)-point.y)<.06);
 if(!standsOn)return null;
 const obstructed=surfaces.some(part=>Math.abs(part.x-point.x)<part.w/2+.35&&Math.abs(part.z-point.z)<part.d/2+.35&&part.y<point.y+1.7&&topAt(part,point.x,point.z)>point.y+.06);
 return obstructed?null:{x:point.x,y:point.y,z:point.z};
}
