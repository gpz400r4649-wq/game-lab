import {rangeCell,inGridRange,movementCenter} from './enemy-range3d.js?v=20261030i';
const CELL=4,neighbors=[[0,-1],[1,0],[0,1],[-1,0]];
export const CHASE_MODES={always:'はじめから、ずっと追いかける',inside:'探すはんいにいる間だけ追いかける',remember:'見つけたら、ずっと追いかける'};
export function validEnemyMovement(o){return (o.chaseMode===undefined||Object.hasOwn(CHASE_MODES,o.chaseMode));}
export function canEnemyEnter(o,point){return !o.moveRange||inGridRange(o.moveRange,movementCenter(o),point);}
export function detectsPlayer(o,player){return o.searchRange?inGridRange(o.searchRange,o,player):Math.hypot(player.x-o.x,player.z-o.z)<18;}
function route(o,target,r){
 const origin=movementCenter(o),ox=rangeCell(origin.x),oz=rangeCell(origin.z),sx=rangeCell(o.x)-ox,sz=rangeCell(o.z)-oz,allowed=new Set(r.cells.map(c=>c.join(','))),start=`${sx},${sz}`;
 if(!allowed.has(start))return [];
 const queue=[[sx,sz]],parents=new Map([[start,null]]);let best=start,dist=Infinity;
 for(let i=0;i<queue.length;i++){
  const [x,z]=queue[i],key=`${x},${z}`,d=(target.x-(ox+x)*CELL)**2+(target.z-(oz+z)*CELL)**2;if(d<dist){dist=d;best=key;}
  for(const [dx,dz]of neighbors){const nx=x+dx,nz=z+dz,nkey=`${nx},${nz}`;if(allowed.has(nkey)&&!parents.has(nkey)){parents.set(nkey,key);queue.push([nx,nz]);}}
 }
 const path=[];for(let key=best;key!==null;key=parents.get(key)){const [x,z]=key.split(',').map(Number);path.push({x:(ox+x)*CELL,z:(oz+z)*CELL});}return path.reverse();
}
export function moveEnemy(o,b,player,dt,time,tryMove){
 const detected=detectsPlayer(o,player);if(detected)o.foundPlayer=true;
 const mode=o.chaseMode||'always',chase=mode==='always'||(mode==='inside'?detected:!!o.foundPlayer);
 if(b.action==='patrol'){const point={x:o.x+Math.cos(time)*b.speed*dt,z:o.z};if(canEnemyEnter(o,point))tryMove(point.x-o.x,0);return;}
 if(b.action!=='chase'&&b.action!=='search')return;
 if(b.action==='chase'&&!chase){o.navigation=null;return;}
 let target=player,r=o.moveRange;
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
  const stamp=`${b.action}:${chase}:${rangeCell(target.x)},${rangeCell(target.z)}`;
  if(!o.navigation||o.navigation.stamp!==stamp||o.navigation.range!==r)o.navigation={stamp,range:r,path:route(o,target,r)};
  const path=o.navigation.path;while(path.length&&Math.hypot(path[0].x-o.x,path[0].z-o.z)<.08)path.shift();
  if(path.length)point=path[0];else if(inGridRange(r,movementCenter(o),target)&&rangeCell(o.x)===rangeCell(target.x)&&rangeCell(o.z)===rangeCell(target.z))point=target;else return;
 }
 const dx=point.x-o.x,dz=point.z-o.z,d=Math.hypot(dx,dz);if(d<.001)return;
 const scale=Math.min(step,d)/d,nx=o.x+dx*scale,nz=o.z+dz*scale;
 if(!canEnemyEnter(o,{x:nx,z:nz}))return;
 const beforeX=o.x,beforeZ=o.z;tryMove(nx-o.x,nz-o.z);
 if(b.action==='search'&&!chase&&Math.hypot(o.x-beforeX,o.z-beforeZ)<step*.1)o.roamStuck=true;
}
