import {walkPatrol,walkWaypoints,activeRoute} from './patrol-route3d.js?v=20261104h';
import {rangeCell,inGridRange,inEnemyRange,movementCenter} from './enemy-range3d.js?v=20261104h';
const CELL=4,neighbors=[[0,-1],[1,0],[0,1],[-1,0]];
export const CHASE_MODES={always:'はじめから、ずっと追いかける',inside:'探すはんいにいる間だけ追いかける',remember:'見つけたら、ずっと追いかける'};
export function validEnemyMovement(o){return (o.chaseMode===undefined||Object.hasOwn(CHASE_MODES,o.chaseMode))&&(o.routine===undefined||(o.routine&&['wait','patrol','roam','path'].includes(o.routine.idle)&&['none','near','always'].includes(o.routine.notice)&&['resume','continue','return'].includes(o.routine.lost)));}
export function canEnemyEnter(o,point){return o.routeTravel===true||!o.moveRange||inGridRange(o.moveRange,movementCenter(o),point);}
export function detectsPlayer(o,player){return o.searchRange?inEnemyRange(o.searchRange,o,player):Math.hypot(player.x-o.x,player.z-o.z)<18;}
function route(o,target,r){
 const origin=movementCenter(o),ox=rangeCell(origin.x),oz=rangeCell(origin.z),sx=rangeCell(o.x)-ox,sz=rangeCell(o.z)-oz,allowed=new Set(r.cells.map(c=>c.join(','))),start=`${sx},${sz}`;
 if(!allowed.has(start))return [];
 const goal=`${rangeCell(target.x)-ox},${rangeCell(target.z)-oz}`;
 const queue=[[sx,sz]],parents=new Map([[start,null]]);let best=start,dist=Infinity;
 for(let i=0;i<queue.length;i++){
  const [x,z]=queue[i],key=`${x},${z}`,d=(target.x-(ox+x)*CELL)**2+(target.z-(oz+z)*CELL)**2;if(d<dist){dist=d;best=key;}if(key===goal){best=key;break;}
  for(const [dx,dz]of neighbors){const nx=x+dx,nz=z+dz,nkey=`${nx},${nz}`;if(allowed.has(nkey)&&!parents.has(nkey)){parents.set(nkey,key);queue.push([nx,nz]);}}
 }
 const path=[];for(let key=best;key!==null;key=parents.get(key)){const [x,z]=key.split(',').map(Number);path.push({x:(ox+x)*CELL,z:(oz+z)*CELL});}path.reverse();path.shift();return path;
}
export function moveEnemy(o,b,player,dt,time,tryMove){
 o.routeTravel=false;o.debugBlocked='';
 const detected=detectsPlayer(o,player);if(detected)o.foundPlayer=true;
 const mode=o.chaseMode||'always';let chase=mode==='always'||(mode==='inside'?detected:!!o.foundPlayer);
 let returning=false;const routePoints=['patrol','path'].includes(o.routine?.idle)?activeRoute(o):null,returnPoint=routePoints?routePoints[0]:o.origin;
 if(o.routine){
  const r=o.routine;chase=r.notice==='always'||(r.notice==='near'&&(detected||(r.lost==='continue'&&o.foundPlayer)));
  if(chase)o.wasChasing=true;
  returning=!chase&&r.lost==='return'&&o.wasChasing;
  if(returning&&Math.hypot(o.x-returnPoint.x,o.z-returnPoint.z)<.08){o.wasChasing=false;returning=false;o.navigation=null;if(o.routine?.idle==='path'){o.waypointIndex=0;o.waypointFrom=0;o.waypointFinished=false;o.waypointDirection=1;}}
  b={...b,action:chase||returning?'chase':r.idle==='roam'?'search':r.idle==='patrol'?'patrol':r.idle==='path'?'path':'wait'};
  if(b.action==='wait'){o.debugAction='wait';o.navigation=null;return;}
 }
 // Follow the player with the face while navigating between allowed cells.
 // A sideways/backward navigation step must not rotate the vision away and cancel pursuit.
 if(chase&&['chase','search'].includes(b.action)){
  const facePlayer=()=>{if(Math.hypot(player.x-o.x,player.z-o.z)>.001)o.heading=Math.atan2(-(player.x-o.x),-(player.z-o.z));};
  const move=tryMove;tryMove=(x,z)=>{move(x,z);facePlayer();};facePlayer();
 }
 o.debugAction=returning?'return':b.action==='path'?'path':b.action==='patrol'?'patrol':chase?'chase':b.action==='search'?'roam':'wait';
 if(b.action==='path'){o.navigation=null;walkWaypoints(o,b.speed,dt,tryMove);return;}
 if(b.action==='patrol')o.navigation=null;
 if(b.action==='patrol'&&o.patrolRoute){walkPatrol(o,b.speed,dt,tryMove);return;}
 if(b.action==='patrol'){const point={x:o.x+Math.cos(time)*b.speed*dt,z:o.z};if(canEnemyEnter(o,point))tryMove(point.x-o.x,0);return;}
 if(b.action!=='chase'&&b.action!=='search')return;
 if(b.action==='chase'&&!chase&&!returning){o.navigation=null;return;}
 o.routeTravel=returning&&!!routePoints;
 let target=returning?returnPoint:player,r=o.routeTravel?null:o.moveRange;
 if(b.action==='search'&&!chase){
  const origin=movementCenter(o),cx=rangeCell(o.x)-rangeCell(origin.x),cz=rangeCell(o.z)-rangeCell(origin.z);
  if(!o.roamTarget||Math.hypot(o.x-o.roamTarget.x,o.z-o.roamTarget.z)<.12||o.roamStuck){
   const options=neighbors.map(([dx,dz])=>[cx+dx,cz+dz]).filter(([x,z])=>!r||r.cells.some(c=>c[0]===x&&c[1]===z));
   const fresh=options.filter(([x,z])=>`${x},${z}`!==o.previousRoamCell),choices=fresh.length?fresh:options;
   const next=choices[(o.roamStep||0)%choices.length];o.roamStep=(o.roamStep||0)+1;o.previousRoamCell=`${cx},${cz}`;o.roamStuck=false;
   o.roamTarget=next?{x:(rangeCell(origin.x)+next[0])*CELL,z:(rangeCell(origin.z)+next[1])*CELL}:null;
  }target=o.roamTarget;if(!target)return;
 }
 const step=b.speed*dt;
 let point=target;
 if(r){
  if(!inGridRange(r,movementCenter(o),o)){o.debugBlocked='outside';return;}
  const stamp=`${b.action}:${chase}:${returning}:${rangeCell(target.x)},${rangeCell(target.z)}`;
  if(!o.navigation||o.navigation.stamp!==stamp||o.navigation.range!==r)o.navigation={stamp,range:r,path:route(o,target,r)};
  const path=o.navigation.path;while(path.length&&Math.hypot(path[0].x-o.x,path[0].z-o.z)<.08)path.shift();
  if(inGridRange(r,movementCenter(o),target)&&rangeCell(o.x)===rangeCell(target.x)&&rangeCell(o.z)===rangeCell(target.z)){point=target;o.navigation.path=[];}else if(path.length)point=path[0];else{o.debugBlocked=inGridRange(r,movementCenter(o),target)?'disconnected':'edge';return;}
 }
 const dx=point.x-o.x,dz=point.z-o.z,d=Math.hypot(dx,dz);if(d<.001)return;
 const scale=Math.min(step,d)/d,nx=o.x+dx*scale,nz=o.z+dz*scale;
 if(!canEnemyEnter(o,{x:nx,z:nz})){o.debugBlocked='edge';return;}
 const beforeX=o.x,beforeZ=o.z;tryMove(nx-o.x,nz-o.z);
 if(b.action==='search'&&!chase&&Math.hypot(o.x-beforeX,o.z-beforeZ)<step*.1)o.roamStuck=true;
}
