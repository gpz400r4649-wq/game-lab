import {validEvents,actionsFor,fireEvents} from './events3d.js';
import {upgradeTool,safeShot,DESTRUCTIBLE_TYPES,LIMITS} from './weapons3d.js';
import {shootVolley,updateCombat} from './combat3d.js';
import {BUILD_TYPES,constructionPart,topAt,defaultLoadout,validTool,placeStructure} from './building3d.js';
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const PARTS={ramp:'スロープ',wall:'壁',floor:'床',roof:'屋根',box:'ブロック',platform:'足場',moving:'動く足場',bounce:'ジャンプ台',enemy:'敵ロボット',star:'星',key:'カギ',door:'ドア',heal:'回復',checkpoint:'中間地点',hazard:'ダメージ床',goal:'ゴール'};
export const BEHAVIORS={chase:'プレイヤーを追いかける',patrol:'左右に動く',shoot:'近づいたら弾を撃つ'};
export const ENEMY_PRESETS={chase:{name:'追いかける敵',program:[{action:'chase',speed:2}]},patrol:{name:'見はりの敵',program:[{action:'patrol',speed:2}]},guard:{name:'弾を撃つ敵',program:[{action:'shoot',speed:3}]},still:{name:'動かない的',program:[]}};
export const WEAPON_PRESETS={standard:{name:'ふつうのブラスター',speed:24,interval:.25,damage:1,spread:1,projectile:'ball',impact:'damage',size:.2,spreadAngle:20,blastRadius:3},rapid:{name:'マシンガンのヒント',speed:40,interval:.08,damage:2,spread:1,projectile:'ball',impact:'damage',size:.15,spreadAngle:10,blastRadius:3},spread:{name:'ひろがる弾のヒント',speed:22,interval:.5,damage:2,spread:5,projectile:'ball',impact:'damage',size:.2,spreadAngle:35,blastRadius:3},power:{name:'パワーブラスター',speed:18,interval:.8,damage:10,spread:1,projectile:'ball',impact:'damage',size:.5,spreadAngle:20,blastRadius:3},rocket:{name:'ロケットランチャーのヒント',speed:18,interval:.8,damage:20,spread:1,projectile:'rocket',impact:'explode',size:.5,spreadAngle:0,blastRadius:4}};
export const CONDITION_NAMES={unset:'クリア条件をえらぶ',touch:'そのまま',stars:'星を集めたら',keys:'カギを集めたら',enemies:'敵を全員たおしたら'};
const solidTypes=new Set(['box','platform','moving','door','wall','floor','roof','ramp']);
export function settingsFor(type){return {axis:'x',distance:3,speed:2,value:type==='bounce'?11:type==='star'?5:1,condition:type==='goal'?'unset':type==='door'?'keys':'touch',required:1};}
export function part(type,x=0,z=-5){if(Object.hasOwn(BUILD_TYPES,type))return constructionPart(type,x,z);return {id:crypto.randomUUID(),type,x,y:['platform','moving'].includes(type)?1:0,z,w:['box','platform','moving'].includes(type)?4:type==='door'?3:2,h:type==='box'?3:['platform','moving'].includes(type)?.5:['bounce','hazard'].includes(type)?.2:type==='door'?3:2,d:type==='door'?.6:['box','platform','moving'].includes(type)?4:2,hp:DESTRUCTIBLE_TYPES.has(type)?20:3,...(DESTRUCTIBLE_TYPES.has(type)?{destructible:true}:{}),program:[],settings:settingsFor(type)};}
export function fresh3D(){const weapon={speed:24,interval:.25,damage:1,spread:1};return {version:1,kind:'game-lab-3d',title:'わたしの3Dワールド',spawn:{x:0,y:0,z:8},weapon,loadout:defaultLoadout(weapon),objects:[]};}
export function validate3D(data){
  const p=structuredClone(data),number=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b;
  if(!p||p.kind!=='game-lab-3d'||p.version!==1||typeof p.title!=='string'||p.title.length>40||!p.spawn||!['x','z'].every(k=>number(p.spawn[k],-28,28))||p.spawn.y!==0||!Array.isArray(p.objects)||p.objects.length>150)throw Error('3D作品の形式がちがいます');
  if(!p.weapon||!number(p.weapon.speed,5,60)||!number(p.weapon.interval,.1,2)||!Number.isInteger(p.weapon.damage)||!number(p.weapon.damage,1,10)||![1,3,5].includes(p.weapon.spread))throw Error('武器の設定を確認してください');
  if(p.loadout===undefined)p.loadout=defaultLoadout(p.weapon);
  if(Array.isArray(p.loadout))p.loadout.forEach(upgradeTool);
  if(!Array.isArray(p.loadout)||!p.loadout.length||p.loadout.length>8||!p.loadout.every(validTool)||new Set(p.loadout.map(t=>t.id)).size!==p.loadout.length)throw Error('持ちものの設定を確認してください');
  const ids=new Set();for(const o of p.objects){
    if(!validEvents(o))throw Error('イベントの設定を確認してください');
    const sizes=['w','h','d'].every(k=>number(o[k],['wall','floor','roof','ramp','bounce','hazard'].includes(o.type)?.2:.5,10));
    if(o.rotation!==undefined&&!(o.type==='ramp'?[0,90,180,270]:[0,90]).includes(o.rotation))throw Error('部品の向きを確認してください');
    if(!Object.hasOwn(PARTS,o.type)||typeof o.id!=='string'||ids.has(o.id)||!['x','z'].every(k=>number(o[k],-28,28))||!number(o.y,0,12)||!sizes||!Number.isInteger(o.hp)||!number(o.hp,1,DESTRUCTIBLE_TYPES.has(o.type)?200:20)||!Array.isArray(o.program)||o.program.length>8)throw Error('パーツの設定を確認してください');ids.add(o.id);if(DESTRUCTIBLE_TYPES.has(o.type)){if(o.destructible===undefined)o.destructible=true;if(typeof o.destructible!=='boolean')throw Error('ブロックの体力設定を確認してください');}
    for(const b of o.program)if(!Object.hasOwn(BEHAVIORS,b.action)||!number(b.speed,.5,8))throw Error('うごきの設定を確認してください');
    if(o.settings===undefined)o.settings=settingsFor(o.type);
    const s=o.settings;if(!s||!['x','y','z'].includes(s.axis)||!number(s.distance,.5,8)||!number(s.speed,.5,5)||!Number.isInteger(s.value)||!number(s.value,1,20)||!Object.hasOwn(CONDITION_NAMES,s.condition)||!Number.isInteger(s.required)||!number(s.required,1,20))throw Error('しかけの設定を確認してください');
  }return p;
}
export const solids=objects=>objects.filter(o=>solidTypes.has(o.type)&&!o.open);
function overlaps(p,o){return Math.abs(p.x-o.x)<o.w/2+.35&&Math.abs(p.z-o.z)<o.d/2+.35&&p.y<topAt(o,p.x,p.z)-.001&&p.y+1.7>o.y+.001;}
export function movePlayer(p,objects,dx,dz,dt,jump){
  const support=p.grounded?objects.find(o=>o.id===p.supportId):null,onSlope=!!support&&['roof','ramp'].includes(support.type);let steppedOntoOther=false;const walls=solids(objects);p.x=clamp(p.x+dx,-29,29);for(const o of walls)if(overlaps(p,o)&&dx){const top=topAt(o,p.x,p.z);if((['roof','ramp'].includes(o.type)||onSlope||['wall','floor'].includes(support?.type))&&p.grounded&&top-p.y<.4){p.y=top;if(!['roof','ramp'].includes(o.type))steppedOntoOther=true;}else p.x=dx>0?o.x-o.w/2-.35:o.x+o.w/2+.35;}
  p.z=clamp(p.z+dz,-29,29);for(const o of walls)if(overlaps(p,o)&&dz){const top=topAt(o,p.x,p.z);if((['roof','ramp'].includes(o.type)||onSlope||['wall','floor'].includes(support?.type))&&p.grounded&&top-p.y<.4){p.y=top;if(!['roof','ramp'].includes(o.type))steppedOntoOther=true;}else p.z=dz>0?o.z-o.d/2-.35:o.z+o.d/2+.35;}
  if(!steppedOntoOther&&onSlope&&Math.abs(p.x-support.x)<=support.w/2&&Math.abs(p.z-support.z)<=support.d/2){const top=topAt(support,p.x,p.z);if(Math.abs(top-p.y)<.4)p.y=top;}
  if(jump&&p.grounded){p.vy=7;p.grounded=false;}const before=p.y;p.vy-=19*dt;p.y+=p.vy*dt;p.grounded=false;p.supportId=null;
  for(const o of walls){if(Math.abs(p.x-o.x)>=o.w/2+.35||Math.abs(p.z-o.z)>=o.d/2+.35)continue;
    const top=topAt(o,p.x,p.z);if(p.vy<=0&&before>=top-.02&&p.y<=top){p.y=top;p.vy=0;p.grounded=true;p.supportId=o.id;}
    else if(p.vy>0&&before+1.7<=o.y+.02&&p.y+1.7>=o.y){p.y=o.y-1.7;p.vy=0;}}
  if(p.y<=0){p.y=0;p.vy=0;p.grounded=true;p.supportId=null;}
}
export function create3D(p){const inventory=(p.loadout||[]).filter(t=>!t.pickupOnly).map(t=>t.id);return {inventory,player:{...p.spawn,vy:0,grounded:true,hp:5,invincible:0},objects:structuredClone(p.objects).map(o=>({...o,maxHp:o.hp,settings:o.settings||settingsFor(o.type),origin:{x:o.x,y:o.y,z:o.z},hidden:o.type==='enemy'&&o.startsHidden===true})),bullets:[],effects:[],hitInfo:null,buildings:[],equipped:p.loadout?p.loadout.findIndex(t=>inventory.includes(t.id)):0,time:0,cooldown:0,score:0,stars:0,keys:0,checkpoint:null,message:'',messageId:0,state:'playing'};}
export function conditionMet(o,g){const s=o.settings||settingsFor(o.type);return s.condition==='touch'||(s.condition==='stars'&&g.stars>=s.required)||(s.condition==='keys'&&g.keys>=s.required)||(s.condition==='enemies'&&!g.objects.some(x=>x.type==='enemy'&&x.hp>0));}
export function conditionHint(o,g){const s=o.settings||settingsFor(o.type);if(s.condition==='unset')return 'クリア条件が未設定';if(s.condition==='touch')return o.type==='door'?'いつでも':'ふれるだけ';if(s.condition==='enemies')return `のこりの敵 ${g.objects.filter(x=>x.type==='enemy'&&x.hp>0).length} 体`;return `${s.condition==='stars'?'星':'カギ'} ${s.condition==='stars'?g.stars:g.keys} / ${s.required}`;}
function inside(b,o,r=0){return Math.abs(b.x-o.x)<o.w/2+r&&Math.abs(b.z-o.z)<o.d/2+r&&b.y>o.y-r&&b.y<topAt(o,b.x,b.z)+r;}
export function step3D(g,p,input,dt){
  if(g.state!=='playing')return;dt=clamp(dt,0,.033);g.time+=dt;g.cooldown-=dt;const player=g.player,tell=s=>{g.message=s;g.messageId++;};player.invincible=Math.max(0,player.invincible-dt);
  for(const o of g.objects){if(o.type==='moving'){
    const s=o.settings,before={x:o.x,y:o.y,z:o.z},axis=s.axis;o[axis]=clamp(o.origin[axis]+Math.sin(g.time*s.speed/s.distance)*s.distance,axis==='y'?0:-28,axis==='y'?12:28);
    if(player.grounded&&player.supportId===o.id){player.x+=o.x-before.x;player.y+=o.y-before.y;player.z+=o.z-before.z;}}}
  let x=input.x||0,z=input.z||0,len=Math.hypot(x,z);if(len>1){x/=len;z/=len;}const yaw=input.yaw||0;movePlayer(player,g.objects,(x*Math.cos(yaw)+z*Math.sin(yaw))*5*dt,(-x*Math.sin(yaw)+z*Math.cos(yaw))*5*dt,dt,input.jump);
  const tool=p.loadout?p.loadout[g.equipped]:p.weapon;
  if(tool&&input.fire&&g.cooldown<=0){
    if(tool.effect&&tool.effect!=='shoot'){placeStructure(g,p,input);g.cooldown=.35;}
    else {shootVolley(g,{x:player.x,y:player.y+1.35,z:player.z},input.aim||{x:-Math.sin(yaw),y:0,z:-Math.cos(yaw)},tool);g.cooldown=safeShot(tool).interval;}
  }
  const walls=solids(g.objects);for(const o of g.objects)if(o.type==='enemy'&&!o.hidden){
    o.cooldown=Math.max(0,(o.cooldown||0)-dt);for(const b of o.program){const dx=player.x-o.x,dz=player.z-o.z,d=Math.hypot(dx,dz)||1;let mx=0,mz=0;
      if(b.action==='chase'){mx=dx/d*b.speed*dt;mz=dz/d*b.speed*dt;}if(b.action==='patrol')mx=Math.cos(g.time)*b.speed*dt;
      if(mx||mz){const body={x:o.x+mx,y:o.y,z:o.z};if(!walls.some(w=>inside({...body,y:o.y+.9},w,.55)))o.x=clamp(body.x,-28,28);body.x=o.x;body.z+=mz;if(!walls.some(w=>inside({...body,y:o.y+.9},w,.55)))o.z=clamp(body.z,-28,28);}
      if(b.action==='shoot'&&d<18&&o.cooldown<=0){shootVolley(g,{x:o.x,y:o.y+1.1,z:o.z},{x:dx,y:player.y+.9-(o.y+1.1),z:dz},{speed:b.speed+5,damage:1,spread:1},true);o.cooldown=1.4;}}
    if(Math.hypot(o.x-player.x,o.z-player.z)<1&&Math.abs(o.y-player.y)<1.7&&player.invincible<=0){player.hp--;player.invincible=1;}}
  updateCombat(g,dt);
  // Collect before evaluating goals, independent of editor placement order.
  const nearby=o=>(['bounce','hazard'].includes(o.type)?Math.abs(o.x-player.x)<o.w/2+.25&&Math.abs(o.z-player.z)<o.d/2+.25:Math.hypot(o.x-player.x,o.z-player.z)<1.15)&&player.y<o.y+1.8&&player.y+1.7>o.y;
  for(const o of g.objects)if(!o.collected&&nearby(o)){
    if(['star','key','heal'].includes(o.type)){
      const actions=actionsFor(o);
      if(o.type==='heal'&&player.hp>=5&&actions.length&&actions.every(a=>a.type==='heal'))continue;
      o.collected=true;fireEvents(g,p,o,tell);
    }
    if(o.type==='bounce'&&player.vy<=0&&player.y>=o.y-.1&&player.y<=o.y+o.h+.2){player.y=o.y+o.h+.02;player.vy=o.settings.value;player.grounded=false;player.supportId=null;}
    if(o.type==='hazard'&&player.y<=o.y+o.h+.1&&player.invincible<=0){player.hp-=o.settings.value;player.invincible=1;}}
  // Items are collected before testing conditions. Each source fires once per test play.
  for(const o of g.objects)if(!o.triggered&&((o.type==='door'&&conditionMet(o,g))||(o.type==='checkpoint'&&nearby(o))||(o.type==='goal'&&nearby(o)&&conditionMet(o,g)&&player.hp>0)))fireEvents(g,p,o,tell);
  if(player.hp<=0){if(g.checkpoint){Object.assign(player,{x:g.checkpoint.x,y:g.checkpoint.y,z:g.checkpoint.z,vy:0,hp:5,invincible:2,grounded:false,supportId:null});g.bullets=[];tell('中間地点からもう一度！');}else g.state='lost';}
}
