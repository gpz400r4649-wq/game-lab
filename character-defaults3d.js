const ENEMY_KEYS=['hp','enemyScale','movementSpeed','program','routine','chaseMode','chaseGraceSeconds','attackEnabled','attackSpeed','enemyWeaponId','searchRange','attackRange','dropHeldWeapon','enemyDrops'];
const ALLY_KEYS=['hp','allyGun','allyAttack','allyRangeCells'];
const snapshots=new WeakMap();
const clone=value=>value===undefined?undefined:structuredClone(value);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const sharedKeys=type=>type==='enemy'?ENEMY_KEYS:type==='ally'?ALLY_KEYS:[];

function assign(object,key,value){
 if(value===undefined)delete object[key];
 else object[key]=clone(value);
}

export function initializeCharacterDefaults(project,factory){
 project.characterDefaults??={};
 for(const type of ['enemy','ally']){
  const original=factory(type,0,0);
  if(!project.characterDefaults[type]){
   project.characterDefaults[type]=Object.fromEntries(sharedKeys(type).filter(key=>original[key]!==undefined).map(key=>[key,clone(original[key])]));
   if(type==='enemy')project.characterDefaults[type].movementSpeed=2;
  }
  const defaults=project.characterDefaults[type];
  for(const key of sharedKeys(type))if(!(key in defaults)&&original[key]!==undefined)defaults[key]=clone(original[key]);
  if(type==='enemy')defaults.movementSpeed??=2;
  for(const object of project.objects.filter(o=>o.type===type)){
   // Legacy settings that differ from the original template become local overrides.
   if(object.characterOverrides===undefined){
    object.characterOverrides=sharedKeys(type).filter(key=>!equal(object[key],original[key]));
    if(type==='enemy'&&object.program.some(block=>block.speed!==2))object.characterOverrides.push('movementSpeed');
   }
  }
 }
 synchronizeCharacterDefaults(project);
}

export function synchronizeCharacterDefaults(project){
 if(!project.characterDefaults)return;
 for(const object of project.objects){
  const keys=sharedKeys(object.type),defaults=project.characterDefaults[object.type];
  if(!keys.length||!defaults)continue;
  const previous=snapshots.get(object);
  const overrides=new Set(object.characterOverrides||[]);
  if(previous)for(const key of keys)if(!equal(object[key],previous[key]))overrides.add(key);
  object.characterOverrides=[...overrides];
  for(const key of keys)if(!overrides.has(key))assign(object,key,defaults[key]);
  if(object.type==='enemy'&&object.enemyScale!==undefined)object.w=object.h=object.d=2*object.enemyScale;
  snapshots.set(object,Object.fromEntries(keys.map(key=>[key,clone(object[key])])));
 }
}

export function inheritNewCharacter(project,object){
 const defaults=project.characterDefaults?.[object.type];
 if(!defaults)return object;
 object.characterOverrides=[];
 for(const key of sharedKeys(object.type))assign(object,key,defaults[key]);
 if(object.enemyScale!==undefined)object.w=object.h=object.d=2*object.enemyScale;
 snapshots.set(object,Object.fromEntries(sharedKeys(object.type).map(key=>[key,clone(object[key])])));
 return object;
}

export function useCharacterDefaults(project,object,keys,inherit){
 const overrides=new Set(object.characterOverrides||[]);
 for(const key of keys){
  if(inherit){overrides.delete(key);assign(object,key,project.characterDefaults[object.type][key]);}
  else overrides.add(key);
 }
 object.characterOverrides=[...overrides];
 if(keys.includes('enemyScale'))object.w=object.h=object.d=2*(object.enemyScale||1);
 snapshots.set(object,Object.fromEntries(sharedKeys(object.type).map(key=>[key,clone(object[key])])));
 synchronizeCharacterDefaults(project);
}
