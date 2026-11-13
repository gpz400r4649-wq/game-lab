import {rangeCell} from './enemy-range3d.js?v=20261113e';
import {validate3D} from './engine3d.js?v=20261113e';

export const ENEMY_COPY_GROUPS={
 body:{label:'からだ・体力',keys:['hp','enemyScale','w','h','d']},
 movement:{label:'うごき・気づくはんい',keys:['program','routine','movementSpeed','chaseMode','chaseGraceSeconds','moveRange','searchRange','patrolRoute','waypoints','routeEnd']},
 attack:{label:'こうげき・持つ銃',keys:['attackEnabled','attackSpeed','enemyWeaponId','attackRange']},
 loot:{label:'おとすもの',keys:['dropHeldWeapon','enemyDrops']}
};

export function copyEnemySettings(project,sourceId,targetIds,groups){
 const source=project.objects.find(o=>o.id===sourceId&&o.type==='enemy');
 if(!source)throw Error('見本の敵をえらび直してください');
 const targets=new Set(targetIds);
 const keys=groups.flatMap(group=>ENEMY_COPY_GROUPS[group]?.keys||[]);
 const replacements=new Map();
 for(const target of project.objects){
  if(target.type!=='enemy'||target.id===sourceId||!targets.has(target.id))continue;
  const next=structuredClone(target);
  for(const key of keys){
   if(source[key]===undefined)delete next[key];
   else next[key]=structuredClone(source[key]);
  }
  // Recreate world-space areas and courses around each target's own placement.
  for(const key of ['moveRange','searchRange','attackRange']){
   if(!keys.includes(key)||next[key]?.space!=='world')continue;
   const dx=rangeCell(target.x)-rangeCell(source.x),dz=rangeCell(target.z)-rangeCell(source.z);
   next[key].cells=next[key].cells.map(([x,z])=>[x+dx,z+dz]);
  }
  for(const key of ['patrolRoute','waypoints']){
   if(keys.includes(key)&&next[key])next[key]=next[key].map(point=>({...point,x:point.x+target.x-source.x,z:point.z+target.z-source.z}));
  }
  if(project.characterDefaults)next.characterOverrides=[...new Set([...(next.characterOverrides||[]),...keys.filter(key=>Object.hasOwn(project.characterDefaults.enemy,key)||['enemyScale','movementSpeed','routine','chaseMode','chaseGraceSeconds','enemyWeaponId','dropHeldWeapon','enemyDrops'].includes(key))])];
  replacements.set(target.id,next);
 }
 const candidate={...project,objects:project.objects.map(o=>replacements.get(o.id)||o)};
 validate3D(candidate);
 project.objects=candidate.objects;
 return replacements.size;
}
