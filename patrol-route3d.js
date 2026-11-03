export function validPatrolRoute(route,limit=480){return route===undefined||(Array.isArray(route)&&route.length===2&&route.every(p=>p&&['x','z'].every(k=>Number.isFinite(p[k])&&Math.abs(p[k])<=limit))&&Math.hypot(route[0].x-route[1].x,route[0].z-route[1].z)>=.5);}
export function defaultPatrolRoute(o){return [{x:o.x,z:o.z},{x:o.x+(o.x>0?-4:4),z:o.z}];}
export function usesPatrolRoute(o){return !!o.patrolRoute&&(o.routine?o.routine.idle==='patrol'&&o.routine.notice!=='always':o.program?.some(b=>b.action==='patrol'));}
export function nearestPatrolPoint(o){const [a,b]=o.patrolRoute,dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((o.x-a.x)*dx+(o.z-a.z)*dz)/(dx*dx+dz*dz)));return {x:a.x+dx*t,z:a.z+dz*t};}
export function walkPatrol(o,speed,dt,tryMove){
 o.routeTravel=true;let target=nearestPatrolPoint(o);
 if(Math.hypot(target.x-o.x,target.z-o.z)>.08)o.debugAction='return';
 else{const i=o.patrolNext||0;if(Math.hypot(o.patrolRoute[i].x-o.x,o.patrolRoute[i].z-o.z)<.08)o.patrolNext=1-i;target=o.patrolRoute[o.patrolNext||0];}
 const dx=target.x-o.x,dz=target.z-o.z,d=Math.hypot(dx,dz);if(d<.001)return;
 const scale=Math.min(speed*dt,d)/d;tryMove(dx*scale,dz*scale);
}

export const MAX_WAYPOINTS=16;
export function validWaypoints(route,limit=480){return route===undefined||(Array.isArray(route)&&route.length>=2&&route.length<=MAX_WAYPOINTS&&route.every((p,i)=>p&&['x','z'].every(k=>Number.isFinite(p[k])&&Math.abs(p[k])<=limit)&&(i===0||Math.hypot(p.x-route[i-1].x,p.z-route[i-1].z)>=.5)));}
export function activeRoute(o){return o.routine?.idle==='path'?o.waypoints:o.patrolRoute;}
export function usesWaypoints(o){return o.routine?.idle==='path'&&o.routine.notice!=='always'&&!!o.waypoints;}
export function walkWaypoints(o,speed,dt,tryMove){
 o.routeTravel=true;const points=o.waypoints;if(!points?.length){o.debugAction='wait';return;}
 let index=o.waypointIndex||0,from=o.waypointFrom||0;const end=points[index];
 if(Math.hypot(end.x-o.x,end.z-o.z)<.08){
  if(o.waypointFinished){o.debugAction='wait';return;}
  const mode=o.routeEnd||'loop';let direction=o.waypointDirection||1;from=index;
  if(index===points.length-1&&direction===1){if(mode==='stop'){o.waypointFinished=true;o.debugAction='wait';return;}if(mode==='reverse')direction=-1;}
  else if(index===0&&direction===-1)direction=1;
  index=mode==='loop'?(index+1)%points.length:index+direction;
  o.waypointIndex=index;o.waypointFrom=from;o.waypointDirection=direction;
 }
 const a=points[from],b=points[index],dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz,t=length?Math.max(0,Math.min(1,((o.x-a.x)*dx+(o.z-a.z)*dz)/length)):0,near={x:a.x+t*dx,z:a.z+t*dz};
 const target=Math.hypot(near.x-o.x,near.z-o.z)>.08?near:b;if(target===near)o.debugAction='return';
 const mx=target.x-o.x,mz=target.z-o.z,d=Math.hypot(mx,mz);if(d<.001)return;const scale=Math.min(speed*dt,d)/d;tryMove(mx*scale,mz*scale);
}
