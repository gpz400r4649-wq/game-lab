import {validLibrary} from './assets3d.js?v=20261029p';
import {moveEnemy,canEnemyEnter,validEnemyMovement} from './enemy-ai3d.js?v=20261029p';
import {worldMoveRange,validMoveRange,makeAttackRange,validAttackRange,inAttackRange} from './enemy-range3d.js?v=20261029p';
import {playerGunMuzzle,finitePoint} from './muzzle3d.js?v=20261029p';
import {validDoor,nearbyDoor,doorwayOccupied,animateDoors} from './doors3d.js?v=20261029p';
import {nearbyObjects} from './spatial3d.js?v=20261029p';
import {MAX_PARTS} from './limits3d.js?v=20261029p';
import {worldSize,worldHalf,coordinateLimit,WORLD_SIZES} from './world3d.js?v=20261029p';
import {settleLoot} from './loot3d.js?v=20261029p';
import {validEvents,actionsFor,fireEvents} from './events3d.js?v=20261029p';
import {upgradeTool,safeShot,DESTRUCTIBLE_TYPES,LIMITS} from './weapons3d.js?v=20261029p';
import {shootVolley,updateCombat,resolveShotOrigin} from './combat3d.js?v=20261029p';
import {BUILD_TYPES,constructionPart,topAt,defaultLoadout,validTool,placeStructure,giveBlock,placeBlock} from './building3d.js?v=20261029p';
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const PARTS={weapon:'銃アイテム',ramp:'スロープ',wall:'壁',floor:'床',roof:'屋根',box:'ブロック',platform:'足場',moving:'動く足場',bounce:'ジャンプ台',enemy:'敵ロボット',star:'星',key:'カギ',door:'ドア',heal:'回復',checkpoint:'セーブポイント',hazard:'ダメージ床',goal:'ゴール'};
export const BEHAVIORS={chase:'プレイヤーを追いかける',patrol:'左右に動く',search:'歩き回って探す'};
export const ENEMY_PRESETS={chase:{name:'追いかける敵',program:[{action:'chase',speed:2}]},patrol:{name:'左右に歩く',program:[{action:'patrol',speed:2}]},search:{name:'歩き回って探す',program:[{action:'search',speed:2}]},still:{name:'動かない',program:[]}};
export const WEAPON_PRESETS={standard:{name:'ふつうのブラスター',speed:24,interval:.25,damage:1,spread:1,projectile:'ball',impact:'damage',size:.2,spreadAngle:20,blastRadius:3,range:60,recoil:0,aimJitter:0,pattern:'fan'},rapid:{name:'マシンガンのヒント',speed:40,interval:.08,damage:2,spread:1,projectile:'ball',impact:'damage',size:.15,spreadAngle:10,blastRadius:3,range:30,recoil:4,aimJitter:5,pattern:'fan'},spread:{name:'ひろがる弾のヒント',speed:22,interval:.5,damage:2,spread:5,projectile:'ball',impact:'damage',size:.2,spreadAngle:35,blastRadius:3,range:15,recoil:.6,aimJitter:.7,pattern:'cone'},power:{name:'パワーブラスター',speed:18,interval:.8,damage:10,spread:1,projectile:'ball',impact:'damage',size:.5,spreadAngle:20,blastRadius:3,range:40,recoil:.2,aimJitter:.3,pattern:'fan'},rocket:{name:'ロケットランチャーのヒント',speed:18,interval:.8,damage:20,spread:1,projectile:'rocket',impact:'explode',size:.5,spreadAngle:0,blastRadius:4,range:45,recoil:.2,aimJitter:.3,pattern:'fan'}};
export const CONDITION_NAMES={unset:'クリア条件をえらぶ',touch:'そのまま',stars:'星を集めたら',keys:'カギを集めたら',enemies:'敵を全員たおしたら'};
const solidTypes=new Set(['box','platform','moving','door','wall','floor','roof','ramp']);
export function settingsFor(type){return {axis:'x',distance:3,speed:2,value:type==='bounce'?11:type==='star'?5:1,condition:type==='goal'?'unset':type==='door'?'keys':'touch',required:1};}
export function part(type,x=0,z=-5){if(Object.hasOwn(BUILD_TYPES,type))return constructionPart(type,x,z);return {id:crypto.randomUUID(),type,x,y:['platform','moving'].includes(type)?1:0,z,w:['box','platform','moving'].includes(type)?4:type==='door'?3:2,h:type==='box'?3:['platform','moving'].includes(type)?.5:['bounce','hazard'].includes(type)?.2:type==='door'?3:2,d:type==='door'?.6:['box','platform','moving'].includes(type)?4:2,hp:DESTRUCTIBLE_TYPES.has(type)?20:3,...(DESTRUCTIBLE_TYPES.has(type)?{destructible:true}:{}),program:[],settings:settingsFor(type),...(type==='weapon'?{weaponId:''}:{}),...(type==='enemy'?{attackEnabled:true,attackSpeed:3,attackRange:makeAttackRange()}:{})};}
export function fresh3D(){const weapon={speed:24,interval:.25,damage:1,spread:1};return {version:1,kind:'game-lab-3d',worldSize:60,title:'わたしの3Dワールド',spawn:{x:0,y:0,z:8},weapon,loadout:defaultLoadout(weapon),objects:[]};}
export function validate3D(data){
  const p=structuredClone(data),number=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b;
  if(p?.worldSize!==undefined&&!WORLD_SIZES.includes(p.worldSize))throw Error('マップのひろさを確認してください');
  const limit=coordinateLimit(p);if(p)p.worldSize=worldSize(p);
  if(!p||p.kind!=='game-lab-3d'||p.version!==1||typeof p.title!=='string'||p.title.length>40||!p.spawn||!['x','z'].every(k=>number(p.spawn[k],-limit,limit))||p.spawn.y!==0||!Array.isArray(p.objects)||p.objects.length>MAX_PARTS)throw Error('3D作品の形式がちがいます');
  if(!p.weapon||!number(p.weapon.speed,5,60)||!number(p.weapon.interval,.1,2)||!Number.isInteger(p.weapon.damage)||!number(p.weapon.damage,1,10)||![1,3,5].includes(p.weapon.spread))throw Error('武器の設定を確認してください');
  if(p.loadout===undefined)p.loadout=defaultLoadout(p.weapon);
  if(Array.isArray(p.loadout))p.loadout.forEach(upgradeTool);
  if(!Array.isArray(p.loadout)||!p.loadout.length||p.loadout.length>8||!p.loadout.every(validTool)||new Set(p.loadout.map(t=>t.id)).size!==p.loadout.length)throw Error('持ちものの設定を確認してください');
  if(!validLibrary(p.library))throw Error('作品の素材を確認してください');
  const ids=new Set();for(const o of p.objects){
    if(!validEnemyMovement(o)||!validMoveRange(o.moveRange)||!validAttackRange(o.searchRange))throw Error('敵の移動・探すはんいを確認してください');
    if(o.attackRange!==undefined&&(o.type!=='enemy'||!validAttackRange(o.attackRange)))throw Error('敵の射撃はんいを確認してください');
    if(!validDoor(o))throw Error('ドアの設定を確認してください');
    if(!validEvents(o))throw Error('イベントの設定を確認してください');
    const sizes=['w','h','d'].every(k=>number(o[k],['wall','floor','roof','ramp','bounce','hazard'].includes(o.type)?.2:.5,10));
    if(o.rotation!==undefined&&!(o.type==='ramp'?[0,90,180,270]:[0,90]).includes(o.rotation))throw Error('部品の向きを確認してください');
    if(!Object.hasOwn(PARTS,o.type)||typeof o.id!=='string'||ids.has(o.id)||!['x','z'].every(k=>number(o[k],-limit,limit))||!number(o.y,0,12)||!sizes||!Number.isInteger(o.hp)||!number(o.hp,1,DESTRUCTIBLE_TYPES.has(o.type)?200:20)||!Array.isArray(o.program)||o.program.length>8)throw Error('パーツの設定を確認してください');ids.add(o.id);if(DESTRUCTIBLE_TYPES.has(o.type)){if(o.destructible===undefined)o.destructible=true;if(typeof o.destructible!=='boolean')throw Error('ブロックの体力設定を確認してください');}
    for(const b of o.program)if((!Object.hasOwn(BEHAVIORS,b.action)&&b.action!=='shoot')||!number(b.speed,.5,8))throw Error('うごきの設定を確認してください');
    if(o.type==='enemy'){if(o.attackEnabled!==undefined&&typeof o.attackEnabled!=='boolean'||o.attackSpeed!==undefined&&!number(o.attackSpeed,.5,8))throw Error('敵の攻撃設定を確認してください');upgradeEnemy(o);}
    if(o.settings===undefined)o.settings=settingsFor(o.type);
    const s=o.settings;if(!s||!['x','y','z'].includes(s.axis)||!number(s.distance,.5,8)||!number(s.speed,.5,5)||!Number.isInteger(s.value)||!number(s.value,1,20)||!Object.hasOwn(CONDITION_NAMES,s.condition)||!Number.isInteger(s.required)||!number(s.required,1,20))throw Error('しかけの設定を確認してください');
  }return p;
}
export const solids=objects=>objects.filter(o=>solidTypes.has(o.type)&&!o.open);
function overlaps(p,o){return Math.abs(p.x-o.x)<o.w/2+.35-.00001&&Math.abs(p.z-o.z)<o.d/2+.35-.00001&&p.y<topAt(o,p.x,p.z)-.001&&p.y+1.7>o.y+.001;}
export function movePlayer(p,objects,dx,dz,dt,jump,world=60){
 const support=p.grounded?objects.find(o=>o.id===p.supportId):null,onSlope=!!support&&['roof','ramp'].includes(support.type),walls=solids(objects);let steppedOntoOther=false;
 const canStep=(o,top)=>{
  const landing=onSlope&&o.type==='floor'&&o.h<=.4&&Math.abs(o.y-support.y-support.h)<=.3&&topAt(support,p.x,p.z)>support.y+support.h-.8;
  // Include the capsule radius on a slope, and legacy floor-thickness offsets.
  const height=landing ? .95 : .4;
  return (['floor','roof','ramp'].includes(o.type)||onSlope||['wall','floor'].includes(support?.type))&&p.grounded&&top-p.y<height&&!walls.some(ceiling=>ceiling!==o&&ceiling.y>=p.y+1.7-.02&&overlaps({...p,y:top},ceiling));
 };
 function moveAxis(axis,amount){
  if(!amount)return;const start=p[axis];p[axis]=clamp(start+amount,-worldHalf(world)+1,worldHalf(world)-1);
  for(const o of walls){if(!overlaps(p,o))continue;const top=topAt(o,p.x,p.z);
   if(canStep(o,top)){p.y=top;if(!['roof','ramp'].includes(o.type))steppedOntoOther=true;continue;}
   const extent=(axis==='x'?o.w:o.d)/2+.35,lo=o[axis]-extent,hi=o[axis]+extent;
   // Resolve only the crossed face. A corner overlap must never send the
   // player to the opposite end of a long wall.
   if(amount>0&&start<=lo+.00001)p[axis]=Math.min(p[axis],lo);
   else if(amount<0&&start>=hi-.00001)p[axis]=Math.max(p[axis],hi);
   else {const exiting=amount>0?hi-start<start-lo:start-lo<hi-start;if(!exiting)p[axis]=start;}
  }
 }
 moveAxis('x',dx);moveAxis('z',dz);
 if(!steppedOntoOther&&onSlope&&Math.abs(p.x-support.x)<=support.w/2&&Math.abs(p.z-support.z)<=support.d/2){const top=topAt(support,p.x,p.z);if(Math.abs(top-p.y)<.4)p.y=top;}
 if(jump&&p.grounded){p.vy=7;p.grounded=false;}const before=p.y;p.vy-=19*dt;p.y+=p.vy*dt;p.grounded=false;p.supportId=null;
 let landing=null;
 for(const o of walls){if(Math.abs(p.x-o.x)>=o.w/2+.35||Math.abs(p.z-o.z)>=o.d/2+.35)continue;
  const top=topAt(o,p.x,p.z);
  if(p.vy<=0&&before>=top-.02&&p.y<=top&&(!landing||top>landing.top))landing={o,top};
  else if(p.vy>0&&before+1.7<=o.y+.02&&p.y+1.7>=o.y){p.y=o.y-1.7;p.vy=0;}
 }
 if(landing){p.y=landing.top;p.vy=0;p.grounded=true;p.supportId=landing.o.id;}
 if(p.y<=0){p.y=0;p.vy=0;p.grounded=true;p.supportId=null;}
}

// Convert the former shooting behavior without changing saved movement or range.
export function upgradeEnemy(o){if(o.type!=='enemy')return o;if(o.moveRange)o.moveRange=worldMoveRange(o.moveRange,o);const shot=o.program.find(b=>b.action==='shoot');o.attackEnabled??=!!shot;o.attackSpeed??=shot?.speed??3;o.program=o.program.filter(b=>b.action!=='shoot');return o;}
export function create3D(p){const inventory=(p.loadout||[]).filter(t=>!t.pickupOnly).map(t=>t.id);return {inventoryCounts:Object.fromEntries(inventory.map(id=>[id,1])),buildSelection:{},worldSize:worldSize(p),inventory,toolCatalog:structuredClone(p.loadout||[]),drops:[],blockInventory:[],blockEquipped:null,player:{...p.spawn,vy:0,grounded:true,hp:5,invincible:0},objects:structuredClone(p.objects).map(upgradeEnemy).map(o=>({...o,foundPlayer:false,navigation:null,roamTarget:null,previousRoamCell:null,roamStep:0,maxHp:o.hp,settings:o.settings||settingsFor(o.type),origin:{x:o.x,y:o.y,z:o.z},hidden:o.type==='enemy'&&o.startsHidden===true})),bullets:[],effects:[],hitInfo:null,buildings:[],recoilPitch:0,equipped:p.loadout?p.loadout.findIndex(t=>inventory.includes(t.id)):0,time:0,cooldown:0,score:0,stars:0,keys:0,checkpoint:null,message:'',messageId:0,state:'playing'};}
export function conditionMet(o,g){const s=o.settings||settingsFor(o.type);return s.condition==='touch'||(s.condition==='stars'&&g.stars>=s.required)||(s.condition==='keys'&&g.keys>=s.required)||(s.condition==='enemies'&&!g.objects.some(x=>x.type==='enemy'&&x.hp>0));}
export function conditionHint(o,g){const s=o.settings||settingsFor(o.type);if(s.condition==='unset')return 'クリア条件が未設定';if(s.condition==='touch')return o.type==='door'?'いつでも':'ふれるだけ';if(s.condition==='enemies')return `のこりの敵 ${g.objects.filter(x=>x.type==='enemy'&&x.hp>0).length} 体`;return `${s.condition==='stars'?'星':'カギ'} ${s.condition==='stars'?g.stars:g.keys} / ${s.required}`;}
function inside(b,o,r=0){return Math.abs(b.x-o.x)<o.w/2+r&&Math.abs(b.z-o.z)<o.d/2+r&&b.y>o.y-r&&b.y<topAt(o,b.x,b.z)+r;}
export function step3D(g,p,input,dt){
  if(g.state!=='playing')return;const limit=coordinateLimit(g);dt=clamp(dt,0,.033);g.time+=dt;g.cooldown-=dt;g.recoilPitch=Math.max(0,(g.recoilPitch||0)-8*Math.PI/180*dt);const player=g.player,tell=s=>{g.message=s;g.messageId++;};player.invincible=Math.max(0,player.invincible-dt);
  for(const o of g.objects){if(o.type==='moving'){
    const s=o.settings,before={x:o.x,y:o.y,z:o.z},axis=s.axis;o[axis]=clamp(o.origin[axis]+Math.sin(g.time*s.speed/s.distance)*s.distance,axis==='y'?0:-limit,axis==='y'?12:limit);
    if(player.grounded&&player.supportId===o.id){player.x+=o.x-before.x;player.y+=o.y-before.y;player.z+=o.z-before.z;}}}
  let x=input.x||0,z=input.z||0,len=Math.hypot(x,z);if(len>1){x/=len;z/=len;}const yaw=input.yaw||0;movePlayer(player,nearbyObjects(g,player.x-1,player.z-1,player.x+1,player.z+1),(x*Math.cos(yaw)+z*Math.sin(yaw))*5*dt,(-x*Math.sin(yaw)+z*Math.cos(yaw))*5*dt,dt,input.jump,g);
  if(input.useDoor){const door=nearbyDoor(g,input.yaw||0);if(door){if(door.open){if(doorwayOccupied(door,player))tell('ドアから少しはなれよう');else{door.open=false;tell('ドアをしめた');}}else if(!conditionMet(door,g))tell('まだあけられません。'+conditionHint(door,g));else if(!door.triggered)fireEvents(g,p,door,tell);else if(actionsFor(door).some(a=>a.type==='openDoor'&&a.target===door.id)){door.open=true;tell('ドアをあけた');}}}
  const tool=p.loadout?p.loadout[g.equipped]:p.weapon;
  if((tool||g.blockEquipped)&&input.fire&&g.cooldown<=0){
    if(g.blockEquipped){placeBlock(g,input);g.cooldown=.35;}
    else
    if(tool.effect&&tool.effect!=='shoot'){placeStructure(g,p,input);g.cooldown=.35;}
    else {const shot=safeShot(tool),eye={x:player.x,y:player.y+1.35,z:player.z},candidate=typeof input.getShotOrigin==='function'?input.getShotOrigin(player):null,muzzle=finitePoint(candidate)&&Math.hypot(candidate.x-eye.x,candidate.y-eye.y,candidate.z-eye.z)<=3?candidate:playerGunMuzzle(player,tool,yaw),origin=resolveShotOrigin(g,eye,muzzle,shot.radius),direction=finitePoint(input.aimTarget)?{x:input.aimTarget.x-origin.x,y:input.aimTarget.y-origin.y,z:input.aimTarget.z-origin.z}:input.aim||{x:-Math.sin(yaw)*Math.cos(g.recoilPitch),y:Math.sin(g.recoilPitch),z:-Math.cos(yaw)*Math.cos(g.recoilPitch)},count=shootVolley(g,origin,direction,tool);if(count)g.recoilPitch=Math.min(12*Math.PI/180,g.recoilPitch+shot.recoil*Math.PI/180);g.cooldown=shot.interval;}
  }
  for(const o of g.objects)if(o.type==='enemy'&&!o.hidden){const walls=solids(nearbyObjects(g,o.x-1,o.z-1,o.x+1,o.z+1));
    o.cooldown=Math.max(0,(o.cooldown||0)-dt);
    const tryMove=(mx,mz)=>{const body={x:o.x+mx,y:o.y,z:o.z};if(canEnemyEnter(o,body)&&!walls.some(w=>inside({...body,y:o.y+.9},w,.55)))o.x=clamp(body.x,-limit,limit);body.x=o.x;body.z+=mz;if(canEnemyEnter(o,body)&&!walls.some(w=>inside({...body,y:o.y+.9},w,.55)))o.z=clamp(body.z,-limit,limit);};
    for(const b of o.program)moveEnemy(o,b,player,dt,g.time,tryMove);
    if(o.attackEnabled&&inAttackRange(o,player)){
      if(o.cooldown<=0){shootVolley(g,{x:o.x,y:o.y+1.1,z:o.z},{x:player.x-o.x,y:player.y+.9-(o.y+1.1),z:player.z-o.z},{speed:o.attackSpeed+5,damage:1,spread:1},true);o.cooldown=1.4;}
      if(Math.hypot(o.x-player.x,o.z-player.z)<1&&Math.abs(o.y-player.y)<1.7&&player.invincible<=0){player.hp--;player.invincible=1;}
    }}
  updateCombat(g,dt);settleLoot(g,dt);
  // Collect before evaluating goals, independent of editor placement order.
  const nearby=o=>(['bounce','hazard'].includes(o.type)?Math.abs(o.x-player.x)<o.w/2+.25&&Math.abs(o.z-player.z)<o.d/2+.25:Math.hypot(o.x-player.x,o.z-player.z)<1.15)&&player.y<o.y+1.8&&player.y+1.7>o.y;
  for(const o of [...g.objects,...g.drops])if(!o.collected&&nearby(o)&&g.time>=(o.pickupAt||0)){
    if(o.type==='blockItem'){if(giveBlock(g,o.blockTemplate)){o.collected=true;tell('ブロックを拾った！ 持ちものから置けるよ');}else if(g.time>(g.fullLootMessageAt||0)){tell('ブロックは８種類・それぞれ99個まで持てます');g.fullLootMessageAt=g.time+2;}continue;}
    if(['weapon','star','key','heal'].includes(o.type)){
      if(o.type==='weapon'&&!p.loadout.some(t=>t.id===o.weaponId))continue;
      const actions=actionsFor(o);
      if(o.type==='heal'&&player.hp>=5&&actions.length&&actions.every(a=>a.type==='heal'))continue;
      if(o.type==='weapon'&&actions.length>0&&actions.every(a=>a.type==='giveTool'&&(g.inventoryCounts?.[a.target]||0)>=99)){tell('同じ銃は99こまで持てます');continue;}
      o.collected=true;fireEvents(g,p,o,tell);
    }
    if(o.type==='bounce'&&player.vy<=0&&player.y>=o.y-.1&&player.y<=o.y+o.h+.2){player.y=o.y+o.h+.02;player.vy=o.settings.value;player.grounded=false;player.supportId=null;}
    if(o.type==='hazard'&&player.y<=o.y+o.h+.1&&player.invincible<=0){player.hp-=o.settings.value;player.invincible=1;}}
  g.drops=g.drops.filter(o=>!o.collected);
  // Items are collected before testing conditions. Each source fires once per test play.
  for(const o of g.objects)if(!o.triggered&&((o.type==='door'&&!o.doorMode&&conditionMet(o,g))||(o.type==='checkpoint'&&nearby(o))||(o.type==='goal'&&nearby(o)&&conditionMet(o,g)&&player.hp>0)))fireEvents(g,p,o,tell);
  animateDoors(g,dt);
  if(player.hp<=0){if(g.checkpoint){Object.assign(player,{x:g.checkpoint.x,y:g.checkpoint.y,z:g.checkpoint.z,vy:0,hp:5,invincible:2,grounded:false,supportId:null});g.bullets=[];tell('セーブポイントからもう一度！');}else g.state='lost';}
}
