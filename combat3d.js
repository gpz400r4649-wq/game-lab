import {nearbyObjects} from './spatial3d.js?v=20261030k';
import {worldHalf} from './world3d.js?v=20261030k';
import {fireDestructionEvents} from './events3d.js?v=20261030k';
import {topAt} from './building3d.js?v=20261030k';
import {LIMITS,safeShot,DESTRUCTIBLE_TYPES,impactEffects} from './weapons3d.js?v=20261030k';
const solidType=o=>DESTRUCTIBLE_TYPES.has(o.type)||o.type==='door';
const alive=o=>(o.type!=='enemy'&&!DESTRUCTIBLE_TYPES.has(o.type))||o.hp>0||(DESTRUCTIBLE_TYPES.has(o.type)&&o.destructible===false);
function axes(f){const length=Math.hypot(f.x,f.z),right=length>.00001?{x:-f.z/length,y:0,z:f.x/length}:{x:1,y:0,z:0};return {right,up:{x:right.y*f.z-right.z*f.y,y:right.z*f.x-right.x*f.z,z:right.x*f.y-right.y*f.x}};}
function coneDirection(f,radius,azimuth){const {right:r,up:u}=axes(f),c=Math.cos(radius),s=Math.sin(radius),x=Math.cos(azimuth)*s,y=Math.sin(azimuth)*s;return {x:f.x*c+r.x*x+u.x*y,y:f.y*c+r.y*x+u.y*y,z:f.z*c+r.z*x+u.z*y};}
export function shootVolley(g,origin,direction,tool,enemy=false,random=Math.random){
  const s=safeShot(tool),length=Math.hypot(direction.x,direction.y,direction.z);
  if(!Number.isFinite(length)||length<.0001||!['x','y','z'].every(k=>Number.isFinite(origin[k])))return 0;
  let f={x:direction.x/length,y:direction.y/length,z:direction.z/length};let count=0;
  if(s.jitter>0)f=coneDirection(f,Math.sqrt(random())*s.jitter*Math.PI/180,random()*Math.PI*2);
  const {right}=axes(f);
  for(let i=0;i<s.count&&g.bullets.length<LIMITS.bullets;i++){
    const a=s.count===1?0:(i/(s.count-1)-.5)*s.angle;
    const v=s.pattern==='cone'&&s.count>1?coneDirection(f,Math.sqrt((i+.5)/s.count)*s.angle/2,i*2.399963229728653):{x:f.x*Math.cos(a)+right.x*Math.sin(a),y:f.y*Math.cos(a)+right.y*Math.sin(a),z:f.z*Math.cos(a)+right.z*Math.sin(a)};
    g.bullets.push({...origin,vx:v.x*s.speed,vy:v.y*s.speed,vz:v.z*s.speed,remaining:s.range,life:Math.min(LIMITS.maxLife,s.range/s.speed/(.85*.85)+.1),enemy,damage:s.damage,radius:s.radius,projectile:s.projectile,impact:s.impact,impacts:s.impacts,blastRadius:s.blastRadius,bounces:2,lastHit:null,ignoreUntil:0});count++;
  }return count;
}

function effect(g,point,radius,kind){if(g.effects.length>=LIMITS.effects)g.effects.shift();g.effects.push({x:point.x,y:point.y,z:point.z,radius,kind,life:kind==='blast'?.45:.16,maxLife:kind==='blast'?.45:.16});}
function damageObject(g,o,damage){
  const block=DESTRUCTIBLE_TYPES.has(o.type);
  if(o.hp<=0)return;
  if(block&&o.destructible===false){g.hitInfo={name:'こわれないブロック',hp:o.hp,maxHp:o.maxHp||o.hp,until:g.time+1};return;}
  if(!block&&o.type!=='enemy')return;
  o.maxHp??=o.hp;o.hp=Math.max(0,o.hp-damage);o.hitUntil=g.time+.14;
  g.hitInfo={name:o.type==='enemy'?'敵ロボット':o.type==='ramp'?'スロープ':'ブロック',hp:o.hp,maxHp:o.maxHp,until:g.time+1.2};
  if(o.hp===0){if(o.type==='enemy')g.score+=10;g.message=o.type==='enemy'?'敵をたおした！':'ブロックをこわした！';g.messageId++;}
}
function boxDistance(point,o){const w=o.type==='enemy'?1.3:o.w,d=o.type==='enemy'?1.3:o.d,h=o.type==='enemy'?1.8:o.h;return Math.hypot(Math.max(0,Math.abs(point.x-o.x)-w/2),Math.max(o.y-point.y,point.y-o.y-h,0),Math.max(0,Math.abs(point.z-o.z)-d/2));}
function explode(g,b){effect(g,b,b.blastRadius,'blast');for(const o of g.objects)if(!o.hidden&&alive(o)&&(!b.enemy&&o.type==='enemy'||DESTRUCTIBLE_TYPES.has(o.type))&&boxDistance(b,o)<=b.blastRadius)damageObject(g,o,b.damage);if(b.enemy&&g.player.invincible<=0&&boxDistance(b,{...g.player,type:'player',w:.7,d:.7,h:1.7})<=b.blastRadius){g.player.hp-=b.damage;g.player.invincible=1;}}
function contains(b,o){const r=b.radius||.1;if(o.type==='enemy')return Math.hypot(b.x-o.x,b.z-o.z)<.65+r&&b.y>o.y-r&&b.y<o.y+1.8+r;return Math.abs(b.x-o.x)<o.w/2+r&&Math.abs(b.z-o.z)<o.d/2+r&&b.y>o.y-r&&b.y<topAt(o,b.x,b.z)+r;}
// Stop the firing origin at the first obstruction between the player and muzzle.
// This prevents a long barrel from starting a bullet on the far side of a wall.
export function resolveShotOrigin(g,start,muzzle,radius=.1,ignoreId=null){
 const distance=Math.hypot(muzzle.x-start.x,muzzle.y-start.y,muzzle.z-start.z),steps=Math.max(1,Math.min(96,Math.ceil(distance/.04))),targets=nearbyObjects(g,Math.min(start.x,muzzle.x)-radius,Math.min(start.z,muzzle.z)-radius,Math.max(start.x,muzzle.x)+radius,Math.max(start.z,muzzle.z)+radius).filter(o=>o.id!==ignoreId&&!o.hidden&&alive(o)&&(solidType(o)&&!o.open||o.type==='enemy'));
 for(let i=0;i<=steps;i++){const t=i/steps,p={x:start.x+(muzzle.x-start.x)*t,y:start.y+(muzzle.y-start.y)*t,z:start.z+(muzzle.z-start.z)*t,radius};if(targets.some(o=>contains(p,o)))return {x:p.x,y:p.y,z:p.z};}return {x:muzzle.x,y:muzzle.y,z:muzzle.z};
}
function nearbySweep(b,end,o){const r=b.radius||.1,w=o.type==='enemy'?1.3:o.w,h=o.type==='enemy'?1.8:o.h,d=o.type==='enemy'?1.3:o.d;return Math.min(b.x,end.x)-r<=o.x+w/2&&Math.max(b.x,end.x)+r>=o.x-w/2&&Math.min(b.z,end.z)-r<=o.z+d/2&&Math.max(b.z,end.z)+r>=o.z-d/2&&Math.min(b.y,end.y)-r<=o.y+h&&Math.max(b.y,end.y)+r>=o.y;}
function normalAt(b,o){if(!o)return {x:0,y:1,z:0};const r=b.radius||.1,faces=[{d:Math.abs(b.x-(o.x-o.w/2-r)),x:-1,y:0,z:0},{d:Math.abs(b.x-(o.x+o.w/2+r)),x:1,y:0,z:0},{d:Math.abs(b.z-(o.z-o.d/2-r)),x:0,y:0,z:-1},{d:Math.abs(b.z-(o.z+o.d/2+r)),x:0,y:0,z:1},{d:Math.abs(b.y-(o.y-r)),x:0,y:-1,z:0},{d:Math.abs(b.y-topAt(o,b.x,b.z)-r),x:0,y:1,z:0}];return faces.reduce((a,b)=>a.d<b.d?a:b);}
export function updateCombat(g,dt){
  g.effects=g.effects.filter(e=>(e.life-=dt)>0);if(g.bullets.length>LIMITS.bullets)g.bullets.length=LIMITS.bullets;

  for(const b of g.bullets){
    b.remaining??=60;b.radius??=.1;b.impact??='damage';b.bounces??=2;const impacts=impactEffects(b);
    const end={x:b.x+b.vx*dt,y:b.y+b.vy*dt,z:b.z+b.vz*dt},targets=nearbyObjects(g,Math.min(b.x,end.x)-(b.radius||.1),Math.min(b.z,end.z)-(b.radius||.1),Math.max(b.x,end.x)+(b.radius||.1),Math.max(b.z,end.z)+(b.radius||.1)).filter(o=>(solidType(o)&&!o.open||!b.enemy&&o.type==='enemy')&&!o.hidden&&alive(o)&&nearbySweep(b,end,o));
    const steps=Math.min(24,Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy,b.vz)*dt/.15)));
    for(let i=0;i<steps&&b.life>0;i++){
      const speed=Math.hypot(b.vx,b.vy,b.vz),travel=Math.min(speed*dt/steps,b.remaining);if(travel<=.000001){b.life=0;break;}const fraction=travel/(speed||1);b.x+=b.vx*fraction;b.y+=b.vy*fraction;b.z+=b.vz*fraction;b.remaining-=travel;
      if(Math.abs(b.x)>worldHalf(g)||Math.abs(b.z)>worldHalf(g)||b.y>40){b.life=0;break;}
      const ground=b.y-b.radius<=0,hit=targets.find(o=>alive(o)&&!(o.id===b.lastHit&&g.time<b.ignoreUntil)&&contains(b,o));
      const playerHit=b.enemy&&Math.hypot(b.x-g.player.x,b.z-g.player.z)<.35+b.radius&&b.y>g.player.y-b.radius&&b.y<g.player.y+1.7+b.radius;
      if(playerHit){b.life=0;if(impacts.includes('explode'))explode(g,b);else{if(impacts.includes('damage')&&g.player.invincible<=0){g.player.hp-=b.damage;g.player.invincible=1;}effect(g,b,.35,'hit');}break;}
      if(!ground&&!hit)continue;
      if(impacts.includes('explode'))explode(g,b);
      else {if(hit&&impacts.includes('damage'))damageObject(g,hit,b.damage||1);effect(g,b,.3,'hit');}
      if(impacts.includes('bounce')&&b.bounces>0&&hit?.type!=='enemy'){
        const n=normalAt(b,hit),dot=b.vx*n.x+b.vy*n.y+b.vz*n.z;b.vx=(b.vx-2*dot*n.x)*.85;b.vy=(b.vy-2*dot*n.y)*.85;b.vz=(b.vz-2*dot*n.z)*.85;const push=Math.min(.1,b.remaining);b.x+=n.x*push;b.y+=n.y*push;b.z+=n.z*push;b.remaining-=push;b.bounces--;b.lastHit=hit?.id;b.ignoreUntil=g.time+.08;break;
      }b.life=0;break;
    }b.life-=dt;if(b.remaining<=.000001)b.life=0;
  }
  g.bullets=g.bullets.filter(b=>b.life>0);for(const o of g.objects)if(DESTRUCTIBLE_TYPES.has(o.type)&&o.hp<=0&&o.destructible!==false)fireDestructionEvents(g,o);g.objects=g.objects.filter(alive);const ids=new Set(g.objects.map(o=>o.id));g.buildings=g.buildings.filter(o=>ids.has(o.id));
}
