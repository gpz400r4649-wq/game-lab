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
