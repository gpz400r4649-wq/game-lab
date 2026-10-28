import {topAt} from './building3d.js?v=20261028d';
import {LIMITS,safeShot,DESTRUCTIBLE_TYPES,impactEffects} from './weapons3d.js?v=20261028d';
const solidType=o=>DESTRUCTIBLE_TYPES.has(o.type)||o.type==='door';
const alive=o=>(o.type!=='enemy'&&!DESTRUCTIBLE_TYPES.has(o.type))||o.hp>0||(DESTRUCTIBLE_TYPES.has(o.type)&&o.destructible===false);
export function shootVolley(g,origin,direction,tool,enemy=false){
  const s=safeShot(tool),length=Math.hypot(direction.x,direction.y,direction.z);
  if(!Number.isFinite(length)||length<.0001||!['x','y','z'].every(k=>Number.isFinite(origin[k])))return 0;
  const f={x:direction.x/length,y:direction.y/length,z:direction.z/length};let count=0;
  for(let i=0;i<s.count&&g.bullets.length<LIMITS.bullets;i++){
    const a=s.count===1?0:(i/(s.count-1)-.5)*s.angle;
    g.bullets.push({...origin,vx:(f.x*Math.cos(a)+f.z*Math.sin(a))*s.speed,vy:f.y*s.speed,vz:(-f.x*Math.sin(a)+f.z*Math.cos(a))*s.speed,life:3,enemy,damage:s.damage,radius:s.radius,projectile:s.projectile,impact:s.impact,impacts:s.impacts,blastRadius:s.blastRadius,bounces:2,lastHit:null,ignoreUntil:0});count++;
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
function explode(g,b){effect(g,b,b.blastRadius,'blast');for(const o of g.objects)if(!o.hidden&&alive(o)&&(o.type==='enemy'||DESTRUCTIBLE_TYPES.has(o.type))&&boxDistance(b,o)<=b.blastRadius)damageObject(g,o,b.damage);}
function contains(b,o){const r=b.radius||.1;if(o.type==='enemy')return Math.hypot(b.x-o.x,b.z-o.z)<.65+r&&b.y>o.y-r&&b.y<o.y+1.8+r;return Math.abs(b.x-o.x)<o.w/2+r&&Math.abs(b.z-o.z)<o.d/2+r&&b.y>o.y-r&&b.y<topAt(o,b.x,b.z)+r;}
function nearbySweep(b,end,o){const r=b.radius||.1,w=o.type==='enemy'?1.3:o.w,h=o.type==='enemy'?1.8:o.h,d=o.type==='enemy'?1.3:o.d;return Math.min(b.x,end.x)-r<=o.x+w/2&&Math.max(b.x,end.x)+r>=o.x-w/2&&Math.min(b.z,end.z)-r<=o.z+d/2&&Math.max(b.z,end.z)+r>=o.z-d/2&&Math.min(b.y,end.y)-r<=o.y+h&&Math.max(b.y,end.y)+r>=o.y;}
function normalAt(b,o){if(!o)return {x:0,y:1,z:0};const r=b.radius||.1,faces=[{d:Math.abs(b.x-(o.x-o.w/2-r)),x:-1,y:0,z:0},{d:Math.abs(b.x-(o.x+o.w/2+r)),x:1,y:0,z:0},{d:Math.abs(b.z-(o.z-o.d/2-r)),x:0,y:0,z:-1},{d:Math.abs(b.z-(o.z+o.d/2+r)),x:0,y:0,z:1},{d:Math.abs(b.y-(o.y-r)),x:0,y:-1,z:0},{d:Math.abs(b.y-topAt(o,b.x,b.z)-r),x:0,y:1,z:0}];return faces.reduce((a,b)=>a.d<b.d?a:b);}
export function updateCombat(g,dt){
  g.effects=g.effects.filter(e=>(e.life-=dt)>0);if(g.bullets.length>LIMITS.bullets)g.bullets.length=LIMITS.bullets;
  const solid=g.objects.filter(o=>solidType(o)&&!o.open),enemies=g.objects.filter(o=>o.type==='enemy');
  for(const b of g.bullets){
    b.radius??=.1;b.impact??='damage';b.bounces??=2;const impacts=impactEffects(b);
    const end={x:b.x+b.vx*dt,y:b.y+b.vy*dt,z:b.z+b.vz*dt},targets=[...solid,...(!b.enemy?enemies:[])].filter(o=>!o.hidden&&alive(o)&&nearbySweep(b,end,o));
    const steps=Math.min(24,Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy,b.vz)*dt/.15)));
    for(let i=0;i<steps&&b.life>0;i++){
      b.x+=b.vx*dt/steps;b.y+=b.vy*dt/steps;b.z+=b.vz*dt/steps;
      if(Math.abs(b.x)>30||Math.abs(b.z)>30||b.y>40){b.life=0;break;}
      const ground=b.y-b.radius<=0,hit=targets.find(o=>alive(o)&&!(o.id===b.lastHit&&g.time<b.ignoreUntil)&&contains(b,o));
      const playerHit=b.enemy&&Math.hypot(b.x-g.player.x,b.z-g.player.z)<.35+b.radius&&b.y>g.player.y-b.radius&&b.y<g.player.y+1.7+b.radius;
      if(playerHit){b.life=0;if(g.player.invincible<=0){g.player.hp-=b.damage;g.player.invincible=1;}effect(g,b,.35,'hit');break;}
      if(!ground&&!hit)continue;
      if(impacts.includes('explode'))explode(g,b);
      else {if(hit&&impacts.includes('damage'))damageObject(g,hit,b.damage||1);effect(g,b,.3,'hit');}
      if(impacts.includes('bounce')&&b.bounces>0&&hit?.type!=='enemy'){
        const n=normalAt(b,hit),dot=b.vx*n.x+b.vy*n.y+b.vz*n.z;b.vx=(b.vx-2*dot*n.x)*.85;b.vy=(b.vy-2*dot*n.y)*.85;b.vz=(b.vz-2*dot*n.z)*.85;b.x+=n.x*.1;b.y+=n.y*.1;b.z+=n.z*.1;b.bounces--;b.lastHit=hit?.id;b.ignoreUntil=g.time+.08;break;
      }b.life=0;break;
    }b.life-=dt;
  }
  g.bullets=g.bullets.filter(b=>b.life>0);g.objects=g.objects.filter(alive);const ids=new Set(g.objects.map(o=>o.id));g.buildings=g.buildings.filter(o=>ids.has(o.id));
}
