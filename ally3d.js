import {nearbyObjects} from './spatial3d.js?v=20261113a';
import {shootVolley} from './combat3d.js?v=20261113a';
import {safeShot} from './weapons3d.js?v=20261113a';

export function recruitTarget(g,yaw){
 let best=null,score=0;
 for(const a of g.allies||[]){
  const dx=a.x-g.player.x,dz=a.z-g.player.z,d=Math.hypot(dx,dz);
  if(d>5||Math.abs(a.y-g.player.y)>2)continue;
  const facing=d<.15?1:(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/d;
  if(facing>.65&&facing/(1+d*.06)>score&&!obstructed(g,g.player,a,a.y)){best=a;score=facing/(1+d*.06);}
 }
 return best;
}
export function giftableGun(g, ally, catalog){
 const gun=catalog[g.equipped];
 if(!ally?.recruited||g.blockEquipped||gun?.effect!=='shoot'||gun.id===ally.allyGun)return null;
 return g.inventory.includes(gun.id)&&g.inventoryCounts[gun.id]>0?gun:null;
}
export function giveAllyGun(g,catalog,targetId,yaw){
 if(g.state!=='playing')return false;
 const ally=recruitTarget(g,yaw);
 if(!ally||ally.id!==targetId)return false;
 const gun=giftableGun(g,ally,catalog);
 if(!gun)return false;
 ally.allyGun=gun.id;
 if(--g.inventoryCounts[gun.id]===0){
  g.inventory=g.inventory.filter(id=>id!==gun.id);
  g.equipped=catalog.findIndex(tool=>g.inventory.includes(tool.id));
 }
 g.message=gun.name+'を味方にわたしたよ';g.messageId++;
 return true;
}
function point(o){return {x:o.x,y:o.y,z:o.z};}
function obstructed(g,start,end,y){
 const distance=Math.hypot(end.x-start.x,end.z-start.z);
 const objects=nearbyObjects(g,Math.min(start.x,end.x)-.4,Math.min(start.z,end.z)-.4,Math.max(start.x,end.x)+.4,Math.max(start.z,end.z)+.4);
 const steps=Math.max(1,Math.ceil(distance/.5));
 for(const o of objects){
  if(!['wall','door','box','platform','floor'].includes(o.type)||o.open||o.hidden||o.y>=y+1.7||o.y+o.h<=y+.35)continue;
  for(let i=1;i<=steps;i++){const t=i/steps;if(Math.abs(start.x+(end.x-start.x)*t-o.x)<o.w/2+.35&&Math.abs(start.z+(end.z-start.z)*t-o.z)<o.d/2+.35)return true;}
 }
 return false;
}
export function allyAttackDistance(ally,catalog){
 const gun=catalog.find(t=>t.id===ally.allyGun&&t.effect==='shoot');
 return Math.min((ally.allyRangeCells??5)*4,safeShot(gun||{}).range);
}
export function spreadPosition(player,yaw,rank){
 const row=1+Math.floor(rank/2),side=(rank%2?1:-1)*row*3.2,back=row*2.5;
 return {x:player.x+side*Math.cos(yaw)+back*Math.sin(yaw),z:player.z-side*Math.sin(yaw)+back*Math.cos(yaw)};
}
export function stepAllies(g,p,input,dt,move){
 if(!g.allies?.length)return;
 const anchor=g.formationAnchor??={x:p.spawn.x,z:p.spawn.z};
 const travelX=g.player.x-anchor.x,travelZ=g.player.z-anchor.z;
 if(Math.hypot(travelX,travelZ)>=.08){
  g.formationYaw=Math.atan2(-travelX,-travelZ);
  anchor.x=g.player.x;anchor.z=g.player.z;
 }
 if(input.allyCommand){const a=recruitTarget(g,input.yaw||0);if(a&&a.id===input.allyCommand){a.following=!a.following;a.recruited=true;a.trail=[point(a),point(g.player)];g.message=a.following?'りょうかい！ ついていくよ':'ここでまっているよ';g.messageId++;}}
 let slot=0;
 for(const a of g.allies){
  let dx=0,dz=0;
  if(a.following){
   const rank=slot++,trail=a.trail,last=trail.at(-1);
   if(Math.hypot(last.x-g.player.x,last.z-g.player.z)>.5){trail.push(point(g.player));if(trail.length>256)trail.shift();}
   const offset=spreadPosition(g.player,g.formationYaw||0,rank);
   const spread=g.formation==='spread'&&Math.abs(g.player.y-a.y)<.6&&
    !obstructed(g,g.player,offset,g.player.y)&&!obstructed(g,a,offset,a.y);
   const lag=3+rank*3;
   let dest=trail[0];
   if(spread){
    dest=offset;
    while(trail.length>lag+2)trail.shift();
   }else if(trail.length>lag&&Math.hypot(a.x-dest.x,a.z-dest.z)<.55){trail.shift();dest=trail[0];}
   const x=dest.x-a.x,z=dest.z-a.z,d=Math.hypot(x,z),step=Math.min(1,5.5*dt/(d||1));dx=x*step;dz=z*step;
   if(d>.1)a.heading=Math.atan2(-x,-z);
  }
  move(a,nearbyObjects(g,a.x-2,a.z-2,a.x+2,a.z+2),dx,dz,dt,false,g);
  if(!a.recruited||g.time<(a.nextShot||0))continue;
  const tool=p.loadout.find(t=>t.id===a.allyGun&&t.effect==='shoot');
  const range=allyAttackDistance(a,p.loadout);let target=null,nearest=range;
  for(const e of nearbyObjects(g,a.x-range,a.z-range,a.x+range,a.z+range)){
   if(e.type!=='enemy'||e.hidden||e.hp<=0||(a.allyAttack==='assist'&&(e.id!==g.playerTarget||g.time>g.playerTargetUntil)))continue;
   const d=Math.hypot(e.x-a.x,e.y-a.y,e.z-a.z);if(d<nearest&&!obstructed(g,a,e,a.y)){nearest=d;target=e;}
  }
  if(!target){a.nextShot=g.time+.15;continue;}
  const x=target.x-a.x,z=target.z-a.z;a.heading=Math.atan2(-x,-z);
  shootVolley(g,{x:a.x,y:a.y+1.1,z:a.z},{x,y:target.y-a.y,z},{...(tool||{speed:15,interval:1,damage:1,spread:1}),range},false,Math.random,true);a.nextShot=g.time+(tool?.interval||1);
 }
}
