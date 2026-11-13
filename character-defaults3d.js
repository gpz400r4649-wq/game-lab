import {DESTRUCTIBLE_TYPES} from './weapons3d.js?v=20261113m';
import {coordinateLimit,worldSize} from './world3d.js?v=20261113m';
import {rangeCell} from './enemy-range3d.js?v=20261113m';
const ENEMY_KEYS=['startsHidden','hp','enemyScale','movementSpeed','program','routine','chaseMode','chaseGraceSeconds','attackEnabled','attackSpeed','enemyWeaponId','searchRange','attackRange','moveRange','patrolRoute','waypoints','routeEnd','dropHeldWeapon','enemyDrops'];
const ALLY_KEYS=['hp','allyGun','allyAttack','allyRangeCells'];
const BLOCK_KEYS=['hp','destructible'];
export const sharedDefaultsType=type=>DESTRUCTIBLE_TYPES.has(type)?'block':type;
const snapshots=new WeakMap();
const clone=value=>value===undefined?undefined:structuredClone(value);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const sharedKeys=type=>type==='enemy'?ENEMY_KEYS:type==='ally'?ALLY_KEYS:sharedDefaultsType(type)==='block'?BLOCK_KEYS:[];

function assign(object,key,value){
 if(value===undefined)delete object[key];
 else object[key]=clone(value);
}

function inheritedValue(project,object,key,value){
 const result=clone(value);if(!result)return result;
 if(['moveRange','searchRange','attackRange'].includes(key)&&result.space==='world'){
  const half=worldSize(project)/2;
  result.cells=result.cells.map(([x,z])=>[x+rangeCell(object.x),z+rangeCell(object.z)]).filter(([x,z])=>x*4>=-half&&x*4<=half&&z*4>=-half&&z*4<=half);
 }
 if(['patrolRoute','waypoints'].includes(key)){
  for(const point of result){point.x+=object.x;point.z+=object.z;}
  const limit=coordinateLimit(project);
  for(const axis of ['x','z']){
   const min=Math.min(...result.map(point=>point[axis])),max=Math.max(...result.map(point=>point[axis]));
   const shift=Math.max(-limit-min,Math.min(limit-max,0));
   for(const point of result)point[axis]+=shift;
  }
 }
 return result;
}
function applyInherited(project,object,key,value){assign(object,key,inheritedValue(project,object,key,value));}
export function writeCharacterDefaults(project,object){
 const defaults=project.characterDefaults[sharedDefaultsType(object.type)];
 for(const key of sharedKeys(object.type)){
  const value=clone(object[key]);
  if(value?.space==='world')value.cells=value.cells.map(([x,z])=>[x-rangeCell(object.x),z-rangeCell(object.z)]);
  if(value&&['patrolRoute','waypoints'].includes(key))for(const point of value){point.x-=object.x;point.z-=object.z;}
  assign(defaults,key,inheritedValue(project,{x:0,z:0},key,value));
 }
 project.sharedRangeDefaults=true;
 synchronizeCharacterDefaults(project);
}

export function initializeCharacterDefaults(project,factory){
 project.characterDefaults??={};
 for(const type of ['enemy','ally','block']){
  const original=factory(type==='block'?'box':type,0,0);
  if(!project.characterDefaults[type]){
   project.characterDefaults[type]=Object.fromEntries(sharedKeys(type).filter(key=>original[key]!==undefined).map(key=>[key,clone(original[key])]));
   if(type==='enemy')project.characterDefaults[type].movementSpeed=2;
  }
  const defaults=project.characterDefaults[type];
  for(const key of sharedKeys(type))if(!(key in defaults)&&original[key]!==undefined){
   // A legacy global program already expresses its saved behaviour without a routine.
   if(key==='routine'&&type==='enemy')continue;
   defaults[key]=clone(original[key]);
  }
  if(type==='enemy')defaults.movementSpeed??=2;
  for(const object of project.objects.filter(o=>sharedDefaultsType(o.type)===type)){
   if(!project.sharedRangeDefaults&&object.characterOverrides)for(const key of ['moveRange','patrolRoute','waypoints','routeEnd'])if(!equal(object[key],factory(object.type,object.x,object.z)[key])&&!object.characterOverrides.includes(key))object.characterOverrides.push(key);
   // Legacy settings that differ from the original template become local overrides.
   if(object.characterOverrides===undefined){
    const placedOriginal=factory(object.type,object.x,object.z);
    object.characterOverrides=sharedKeys(type).filter(key=>!equal(object[key],placedOriginal[key]));
    if(type==='enemy'&&object.program.some(block=>block.speed!==2))object.characterOverrides.push('movementSpeed');
   }
  }
 }
 synchronizeCharacterDefaults(project);
}

export function synchronizeCharacterDefaults(project){
 if(!project.characterDefaults)return;
 for(const object of project.objects){
  const keys=sharedKeys(object.type),defaults=project.characterDefaults[sharedDefaultsType(object.type)];
  if(!keys.length||!defaults)continue;
  const previous=snapshots.get(object);
  const overrides=new Set(object.characterOverrides||[]);
  if(previous)for(const key of keys)if(!equal(object[key],previous[key]))overrides.add(key);
  object.characterOverrides=[...overrides];
  for(const key of keys)if(!overrides.has(key))applyInherited(project,object,key,defaults[key]);
  if(object.type==='enemy'&&object.enemyScale!==undefined)object.w=object.h=object.d=2*object.enemyScale;
  snapshots.set(object,Object.fromEntries(keys.map(key=>[key,clone(object[key])])));
 }
}

export function inheritNewCharacter(project,object){
 const defaults=project.characterDefaults?.[sharedDefaultsType(object.type)];
 if(!defaults)return object;
 object.characterOverrides=[];
 for(const key of sharedKeys(object.type))applyInherited(project,object,key,defaults[key]);
 if(object.enemyScale!==undefined)object.w=object.h=object.d=2*object.enemyScale;
 snapshots.set(object,Object.fromEntries(sharedKeys(object.type).map(key=>[key,clone(object[key])])));
 return object;
}

export function useCharacterDefaults(project,object,keys,inherit){
 const overrides=new Set(object.characterOverrides||[]);
 for(const key of keys){
  if(inherit){overrides.delete(key);applyInherited(project,object,key,project.characterDefaults[sharedDefaultsType(object.type)][key]);}
  else overrides.add(key);
 }
 object.characterOverrides=[...overrides];
 if(keys.includes('enemyScale'))object.w=object.h=object.d=2*(object.enemyScale||1);
 snapshots.set(object,Object.fromEntries(sharedKeys(object.type).map(key=>[key,clone(object[key])])));
 synchronizeCharacterDefaults(project);
}

export function applyBlockDefaults(project){
 const defaults=project.characterDefaults?.block;if(!defaults)return 0;
 let count=0;
 for(const object of project.objects){
  if(sharedDefaultsType(object.type)!=='block')continue;
  object.characterOverrides=(object.characterOverrides||[]).filter(key=>!BLOCK_KEYS.includes(key));
  for(const key of BLOCK_KEYS)applyInherited(project,object,key,defaults[key]);
  snapshots.set(object,Object.fromEntries(BLOCK_KEYS.map(key=>[key,clone(object[key])])));count++;
 }
 return count;
}
