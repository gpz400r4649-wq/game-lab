export const WORLD={w:2400,h:1600};
export const TYPES={player:{name:'スタート',icon:'🚀',color:'#74dbd1'},enemy:{name:'てきロボット',icon:'🤖',color:'#fc949a'},spawner:{name:'てきがでるばしょ',icon:'◉',color:'#efad80'},wall:{name:'かべ',icon:'▧',color:'#687e9b'},star:{name:'ほし',icon:'★',color:'#f4d37b'},goal:{name:'ゴール',icon:'⚑',color:'#ae9af5'}};
export const ACTIONS={chase:'プレイヤーを追いかける',patrol:'左右に動く',shoot:'近づいたら弾を撃つ',flee:'近づいたら逃げる'};
export const UPGRADES={damage:'たまをつよくする',spread:'たまをふやす',interval:'たまをはやくうつ',speed:'いどうをはやくする',heal:'たいりょくを２かいふく'};
export const SPAWN_ENEMIES={shared:'てき全体のせってい',chaser:'おいかけるてき',shooter:'たまをうつてき',tough:'たいりょくのあるてき'};
export const GOAL_RULES={enemies:'てきをぜんぶたおす',stars:'ほしをあつめる',both:'てきをたおして、ほしもあつめる'};
export const MAX_UPGRADES=8;
const MAX_SPAWNERS=12,MAX_ACTIVE_SPAWNED=48,MAX_BULLETS=512;
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const validNumber=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
const validInteger=(n,min,max)=>Number.isInteger(n)&&validNumber(n,min,max);
export function defaultEnemySettings(){return {hp:3,program:[{action:'chase',value:65}],dropStar:true};}
export function enemySettings(project,enemy){
 const initial=defaultEnemySettings(),base=project.enemyDefaults||initial;
 if(!enemy||enemy.useEnemyDefaults===true)return structuredClone(base);
 const custom=enemy.useEnemyDefaults===false;
 const sameProgram=enemy.program.length===1&&enemy.program[0].action===initial.program[0].action&&enemy.program[0].value===initial.program[0].value;
 return {hp:custom||enemy.hp!==initial.hp?enemy.hp:base.hp,
  program:structuredClone(custom||!sameProgram?enemy.program:base.program),dropStar:enemy.dropStar??base.dropStar};
}
export function enemyUsesDefaults(enemy){
 if(enemy.useEnemyDefaults!==undefined)return enemy.useEnemyDefaults;
 const initial=defaultEnemySettings();
 return enemy.dropStar===undefined&&enemy.hp===initial.hp&&enemy.program.length===1&&enemy.program[0].action===initial.program[0].action&&enemy.program[0].value===initial.program[0].value;
}
export function defaultSpawn(){return {delay:3,count:3,waves:1,interval:8,enemy:'shared'};}
export function makeObject(type,x,y){
 const object={id:globalThis.crypto.randomUUID(),type,x,y,hp:3,program:type==='enemy'?defaultEnemySettings().program:[]};
 if(type==='spawner')object.spawn=defaultSpawn();
 return object;
}
export function freshProject(){return {version:1,title:'はじめての宇宙たんけん',weapon:{speed:500,interval:0.3,damage:1,spread:1},objects:[makeObject('player',440,800)]};}
const validProgram=program=>Array.isArray(program)&&program.length<=8&&program.every(b=>b&&Object.hasOwn(ACTIONS,b.action)&&validNumber(b.value,10,300));
export function validateProject(data){
 if(!data||data.version!==1||typeof data.title!=='string'||data.title.length>40||!Array.isArray(data.objects)||data.objects.length>300)throw Error('作品ファイルの形式がちがいます');
 const w=data.weapon;
 if(!w||!validNumber(w.speed,100,1000)||!validNumber(w.interval,.1,2)||!validInteger(w.damage,1,10)||![1,3,5].includes(w.spread))throw Error('武器の設定が読み込めません');
 if(data.upgrades!==undefined&&(!Array.isArray(data.upgrades)||data.upgrades.length>MAX_UPGRADES||data.upgrades.some(rule=>!rule||!validInteger(rule.stars,1,100)||!Object.hasOwn(UPGRADES,rule.effect))))throw Error('ほしのパワーアップのせっていをたしかめてね');
 const defaults=data.enemyDefaults;
 if(defaults!==undefined&&(!defaults||!validInteger(defaults.hp,1,20)||!validProgram(defaults.program)||typeof defaults.dropStar!=='boolean'))throw Error('てき全体のせっていをたしかめてね');
 const ids=new Set();let spawners=0,players=0;
 for(const o of data.objects){
  if(!o||!Object.hasOwn(TYPES,o.type)||typeof o.id!=='string'||ids.has(o.id)||!validNumber(o.x,24,WORLD.w-24)||!validNumber(o.y,24,WORLD.h-24)||!validInteger(o.hp,1,20)||!Array.isArray(o.program)||o.program.length>8)throw Error('パーツの設定が読み込めません');
  ids.add(o.id);
  if(!validProgram(o.program))throw Error('プログラムが読み込めません');
  if(o.type==='player')players++;
  if(o.type==='enemy'&&((o.dropStar!==undefined&&typeof o.dropStar!=='boolean')||(o.useEnemyDefaults!==undefined&&typeof o.useEnemyDefaults!=='boolean')))throw Error('てきがおとすほしのせっていをたしかめてね');
  if(o.type==='spawner'){
   const rule=o.spawn;spawners++;
   if(spawners>MAX_SPAWNERS||!rule||!validInteger(rule.delay,0,120)||!validInteger(rule.count,1,8)||!validInteger(rule.waves,1,5)||!validInteger(rule.interval,2,60)||typeof rule.enemy!=='string'||(!Object.hasOwn(SPAWN_ENEMIES,rule.enemy)&&!rule.enemy.startsWith('part:'))||(rule.dropStar!==undefined&&typeof rule.dropStar!=='boolean'))throw Error('てきがでるばしょのせっていをたしかめてね');
  }
  if(o.type==='goal'&&o.goal!==undefined&&(!o.goal||!Object.hasOwn(GOAL_RULES,o.goal.rule)||!validInteger(o.goal.stars,1,100)))throw Error('ゴールのせっていをたしかめてね');
 }
 if(players!==1)throw Error('スタートは１つ必要です');
 return JSON.parse(JSON.stringify(data));
}
export function canAddSpawner(objects){return objects.filter(o=>o.type==='spawner').length<MAX_SPAWNERS;}
export function blocked(x,y,r,walls){return walls.some(w=>Math.abs(x-w.x)<32+r&&Math.abs(y-w.y)<32+r);}
export function moveBody(body,dx,dy,walls,r=20){let x=clamp(body.x+dx,r,WORLD.w-r),y=clamp(body.y+dy,r,WORLD.h-r);if(!blocked(x,body.y,r,walls))body.x=x;if(!blocked(body.x,y,r,walls))body.y=y;}
export function createGame(project){
 const objects=structuredClone(project.objects);
 const defaults=enemySettings(project);
 for(const object of objects)if(object.type==='enemy'){
  Object.assign(object,enemySettings(project,object));object.maxHp=object.hp;
 }
 const player={...objects.find(o=>o.type==='player'),hp:5,maxHp:5,speed:230,invincible:0,angle:0};
 const templates=new Map(objects.filter(o=>o.type==='enemy').map(o=>[o.id,{hp:o.hp,program:structuredClone(o.program)}]));
 const spawners=objects.filter(o=>o.type==='spawner').map(o=>{
  const {enemy,delay}=o.spawn;
  return {part:o,nextAt:delay,waves:0,remaining:0,template:enemy==='shared'?defaults:templates.get(enemy.slice(5))};
 });
 return {objects,player,spawners,enemyDefaults:defaults,weapon:{...project.weapon},upgrades:(project.upgrades||[]).map(rule=>({...rule,used:false})),bullets:[],score:0,stars:0,time:0,cooldown:0,state:'playing',message:'',messageId:0};
}
function announce(game,message){game.message=message;game.messageId++;}
function spawnAt(part,walls,player,index){
 for(let attempt=0;attempt<16;attempt++){
  const slot=(index+attempt)%16,radius=slot<8?44:83,angle=(slot%8)*Math.PI/4;
  const x=clamp(part.x+Math.cos(angle)*radius,24,WORLD.w-24),y=clamp(part.y+Math.sin(angle)*radius,24,WORLD.h-24);
  if(!blocked(x,y,20,walls)&&Math.hypot(x-player.x,y-player.y)>=45)return {x,y};
 }
 return null;
}
function stepSpawners(game,walls){
 let active=game.objects.filter(o=>o.spawned&&o.hp>0).length;
 for(const state of game.spawners){
  const {part,template}=state,rule=part.spawn;
  if(!state.remaining){
   if(state.waves>=rule.waves||game.time<state.nextAt)continue;
   state.remaining=rule.count;state.waves++;
  }
  let created=0;
  while(active<MAX_ACTIVE_SPAWNED&&state.remaining){
   const spot=spawnAt(part,walls,game.player,rule.count-state.remaining);
   state.remaining--;
   if(!spot)continue;
   const enemy=makeObject('enemy',spot.x,spot.y);
   if(template){enemy.hp=template.hp;enemy.program=structuredClone(template.program);}
   else if(rule.enemy==='shooter')enemy.program=[{action:'shoot',value:105}];
   else if(rule.enemy==='tough'){enemy.hp=10;enemy.program[0].value=48;}
   enemy.maxHp=enemy.hp;enemy.dropStar=rule.dropStar??game.enemyDefaults.dropStar;enemy.spawned=true;game.objects.push(enemy);created++;active++;
  }
  if(!state.remaining)state.nextAt=game.time+rule.interval;
  if(created)announce(game,'てきがでてきた！');
 }
}
function applyUpgrades(game){
 const done=[];
 for(const rule of game.upgrades){
  if(rule.used||game.stars<rule.stars)continue;
  const {weapon,player}=game;
  if(rule.effect==='damage')weapon.damage=Math.min(20,weapon.damage+1);
  if(rule.effect==='spread')weapon.spread=Math.min(9,weapon.spread+2);
  if(rule.effect==='interval')weapon.interval=Math.max(.1,weapon.interval*.8);
  if(rule.effect==='speed')player.speed=Math.min(440,player.speed+35);
  if(rule.effect==='heal')player.hp=Math.min(player.maxHp,player.hp+2);
  rule.used=true;done.push(UPGRADES[rule.effect]);
 }
 if(done.length)announce(game,done.length===1?`パワーアップ！ ${done[0]}`:`パワーアップ！ ${done.length}こできたよ`);
}
export function goalReady(game,goal){
 const rule=goal.goal?.rule||'enemies';
 if(rule!=='enemies'&&game.stars<goal.goal.stars)return false;
 return rule==='stars'||!game.objects.some(o=>o.type==='enemy'&&o.hp>0)&&!game.spawners.some(s=>s.remaining||s.waves<s.part.spawn.waves);
}
export function stepGame(g,project,input,dt){
 if(g.state!=='playing')return;
 dt=clamp(dt,0,.04);g.time+=dt;g.cooldown-=dt;
 const p=g.player,walls=g.objects.filter(o=>o.type==='wall');
 p.invincible=Math.max(0,p.invincible-dt);
 const mx=input.x||0,my=input.y||0,len=Math.hypot(mx,my),rate=p.speed*dt/Math.max(1,len);
 moveBody(p,mx*rate,my*rate,walls);
 const starsBefore=g.stars;
 for(const star of g.objects){
  if(star.type==='star'&&!star.collected&&Math.hypot(star.x-p.x,star.y-p.y)<35){star.collected=true;g.stars++;g.score+=5;}
 }
 stepSpawners(g,walls);
 if(g.stars!==starsBefore)applyUpgrades(g);
 const enemies=g.objects.filter(o=>o.type==='enemy'&&o.hp>0);
 const target=enemies.reduce((a,e)=>!a||Math.hypot(e.x-p.x,e.y-p.y)<Math.hypot(a.x-p.x,a.y-p.y)?e:a,null);
 if(target)p.angle=Math.atan2(target.y-p.y,target.x-p.x);else if(len)p.angle=Math.atan2(my,mx);
 function bullet(o,angle,speed,enemy=false){
  if(g.bullets.length>=MAX_BULLETS)return;
  g.bullets.push({x:o.x+Math.cos(angle)*26,y:o.y+Math.sin(angle)*26,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,enemy,damage:g.weapon.damage,life:3});
 }
 if(input.fire&&g.cooldown<=0){
  const {spread,speed,interval}=g.weapon;
  for(let i=0;i<spread;i++)bullet(p,p.angle+(i-(spread-1)/2)*.17,speed);
  g.cooldown=interval;
 }
 for(const e of enemies){
  e.cooldown=Math.max(0,(e.cooldown||0)-dt);
  for(const b of e.program){
   const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1;
   if(b.action==='chase')moveBody(e,dx/d*b.value*dt,dy/d*b.value*dt,walls);
   if(b.action==='patrol')moveBody(e,Math.cos(g.time*1.4)*b.value*dt,0,walls);
   if(b.action==='flee'&&d<280)moveBody(e,-dx/d*b.value*dt,-dy/d*b.value*dt,walls);
   if(b.action==='shoot'&&d<480&&e.cooldown<=0){bullet(e,Math.atan2(dy,dx),b.value+80,true);e.cooldown=1.4;}
  }
  if(Math.hypot(e.x-p.x,e.y-p.y)<39&&p.invincible<=0){p.hp--;p.invincible=1.2;}
 }
 for(const b of g.bullets){
  const segments=Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy)*dt/10));
  for(let i=0;i<segments&&b.life>0;i++){
   b.x+=b.vx*dt/segments;b.y+=b.vy*dt/segments;
   if(blocked(b.x,b.y,4,walls)||b.x<0||b.y<0||b.x>WORLD.w||b.y>WORLD.h){b.life=0;break;}
   if(b.enemy){
    if(Math.hypot(b.x-p.x,b.y-p.y)<24){b.life=0;if(p.invincible<=0){p.hp--;p.invincible=1.2;}}
   }else for(const e of enemies){
    if(e.hp<=0||Math.hypot(b.x-e.x,b.y-e.y)>=25)continue;
    e.hp-=b.damage;b.life=0;
    if(e.hp<=0){g.score+=10;if(e.dropStar)g.objects.push(makeObject('star',e.x,e.y));}
    break;
   }
  }
  b.life-=dt;
 }
 g.bullets=g.bullets.filter(b=>b.life>0);
 g.objects=g.objects.filter(o=>o.type!=='enemy'||o.hp>0);
 if(p.hp<=0)g.state='lost';
 else if(g.objects.some(o=>o.type==='goal'&&Math.hypot(o.x-p.x,o.y-p.y)<40&&goalReady(g,o)))g.state='won';
}
