import {WORLD,TYPES,ACTIONS,UPGRADES,SPAWN_ENEMIES,GOAL_RULES,MAX_UPGRADES,canAddSpawner,goalReady,enemySettings,enemyUsesDefaults,clamp,makeObject,freshProject,validateProject,createGame,stepGame} from './engine.js?v=20261118-2d-enemies-labels';
import {createEditHistory} from './history3d.js?v=20261118h';
import {createChoiceControl} from './choices3d.js?v=20261118h';
import {configureNumericInput} from './numeric3d.js?v=20261118h';
import {installGameTouchGuard,createGamePageMode,bindHeldButton,bindGameAction} from './input3d.js?v=20261118h';

const $=selector=>document.querySelector(selector);
const canvas=$('#stage'),ctx=canvas.getContext('2d'),overview=$('#overview'),mapContext=overview.getContext('2d');
const settingsDialog=$('#settings-dialog'),mapDialog=$('#map-dialog'),KEY='tsukuru-lab-v1';
const keys=new Set(),setGamePageMode=createGamePageMode(document);
let project=freshProject(),selected=null,tool='select',mode='edit',game=null;
let stick={x:0,y:0},firing=false,gesture=null,preview=null,last=0,saveTimer,toastTimer;
let settingsTarget=null,stickPointer=null,lastMessageId=0;

function toast(message){
 const notice=$('#toast');notice.textContent=message;notice.classList.add('show');clearTimeout(toastTimer);
 toastTimer=setTimeout(()=>notice.classList.remove('show'),3000);
}
try{
 const saved=localStorage.getItem(KEY);if(saved)project=validateProject(JSON.parse(saved));
}catch{toast('ほぞんしたさくひんがひらけませんでした。ファイルからよみこめます。');}
const start=()=>project.objects.find(o=>o.type==='player');
let camera={x:start().x,y:start().y},history=createEditHistory(project);
$('#title').value=project.title;

function syncHistory(){
 $('#undo').disabled=mode!=='edit'||!history.canUndo;
 $('#redo').disabled=mode!=='edit'||!history.canRedo;
}
function save({record=true}={}){
 if(record)history.record(project);
 syncHistory();clearTimeout(saveTimer);
 $('#save-state').textContent='ほぞん中…';
 saveTimer=setTimeout(()=>{
  try{localStorage.setItem(KEY,JSON.stringify(project));$('#save-state').textContent='このブラウザにほぞんしました';}
  catch{$('#save-state').textContent='ファイルにほぞんしてください';}
 },300);
}
function renderSelection(){
 const part=project.objects.find(o=>o.id===selected),button=$('#part-open');
 button.hidden=!part;$('#selected-hint').hidden=!!part;
 if(part)button.textContent=({player:'スタートのせってい',enemy:'このてきのせってい',spawner:'てきがでるばしょのせってい',wall:'このかべのせってい',star:'このほしのせってい',goal:'このゴールのせってい'})[part.type];
}
function applyProject(next,{reset=false}={}){
 finishGesture(false);project=next;
 if(reset){history=createEditHistory(next);selected=null;camera={x:start().x,y:start().y};updateTool('select');}
 else if(!project.objects.some(o=>o.id===selected))selected=null;
 $('#title').value=project.title;renderSelection();save({record:false});
}
for(const [id,direction] of [['#undo','undo'],['#redo','redo']])$(id).onclick=()=>{
 if(mode!=='edit')return;
 finishGesture(false);const next=history[direction]();if(next)applyProject(next);
};

function field(label,value,min,max,step,onChange){
 const row=document.createElement('label'),text=document.createElement('span'),input=document.createElement('input');
 row.className='field';text.textContent=label;row.append(text,input);
 configureNumericInput(input,{value,min,max,step,onValue:n=>{
  const next=clamp(Number((Math.round(n/step)*step).toFixed(1)),min,max);
  onChange(next);return next;
 },onCommit:()=>save()});
 return row;
}
function choice(label,choices,value,onChange){
 const group=createChoiceControl();group.setAttribute('aria-label',label);
 for(const [key,text] of choices)group.add(new Option(text,key));
 group.value=value;
 group.onchange=()=>{onChange(group.value);save();};
 return group;
}
function note(text){const p=document.createElement('p');p.textContent=text;return p;}
const actionLabels={chase:'おいかける',patrol:'さゆうにうごく',shoot:'ちかづいたらたまをうつ',flee:'ちかづいたらにげる'};
const partNotes={wall:'かべは、プレイヤーやてきのとおりみちをさえぎるよ。',star:'ほしをひろうと、てんすうがふえるよ。'};
function checkbox(label,checked,onChange){
 const row=document.createElement('label'),input=document.createElement('input');
 row.className='checkbox-setting';input.type='checkbox';input.checked=checked;
 input.onchange=()=>{onChange(input.checked);save();};row.append(input,label);return row;
}
function labeledChoice(label,choices,value,onChange){
 const section=document.createElement('section');section.className='rule-choices';
 const title=document.createElement('h3');title.textContent=label;
 section.append(title,choice(label,choices,value,onChange));return section;
}
function renderUpgrades(panel){
 $('#settings-title').textContent='ほしでパワーアップ';
 const rules=project.upgrades||[];
 panel.append(note('ほしはぜんぶで何こひろったかをかぞえるよ。きめたかずになると、パワーアップが１かいおこるよ。'));
 for(const [index,rule] of rules.entries()){
  const card=document.createElement('section');card.className='program-block';
  const remove=document.createElement('button');remove.textContent='このルールをけす';
  remove.onclick=()=>{rules.splice(index,1);save();renderSettings();};
  card.append(field('ほしを何こひろったら？',rule.stars,1,100,1,n=>rule.stars=n),
   labeledChoice('どうなる？',Object.entries(UPGRADES),rule.effect,value=>rule.effect=value),remove);
  panel.append(card);
 }
 const add=document.createElement('button');add.className='primary';add.textContent='＋ パワーアップをたす';add.disabled=rules.length>=MAX_UPGRADES;
 add.onclick=()=>{(project.upgrades??=[]).push({stars:Math.min(100,(rules.at(-1)?.stars||0)+3),effect:'spread'});save();renderSettings();};
 panel.append(add);
}
function renderSpawner(panel,part){
 const rule=part.spawn,enemies=project.objects.filter(o=>o.type==='enemy');
 const options=[...Object.entries(SPAWN_ENEMIES),...enemies.map((enemy,index)=>['part:'+enemy.id,`おいたてき ${index+1}`])];
 if(!options.some(([id])=>id===rule.enemy))options.push([rule.enemy,'けされたてき（おいかけるてきがでる）']);
 panel.append(field('はじまってから何びょう？',rule.delay,0,120,1,n=>rule.delay=n),
  field('いちどに何体でる？',rule.count,1,8,1,n=>rule.count=n),
  field('なんかいでる？',rule.waves,1,5,1,n=>{rule.waves=n;interval.hidden=n===1;}));
 const interval=field('つぎまで何びょうまつ？',rule.interval,2,60,1,n=>rule.interval=n);interval.hidden=rule.waves===1;
 panel.append(interval,labeledChoice('どのてきがでる？',options,rule.enemy,value=>rule.enemy=value),
  labeledChoice('たおれたら、ほしをおとす？',
   [['shared','ぜんたいのせってい'],['yes','おとす'],['no','おとさない']],
   rule.dropStar===undefined?'shared':rule.dropStar?'yes':'no',value=>{
    if(value==='shared')delete rule.dropStar;else rule.dropStar=value==='yes';
   }));
 if(enemies.length)panel.append(note('「おいたてき」をえらぶと、ステージにおいたてきのうごきとたいりょくをつかうよ。'));
}
function renderGoal(panel,part){
 const rule=part.goal||{rule:'enemies',stars:5};
 const count=field('ほしを何こあつめたら？',rule.stars,1,100,1,n=>{rule.stars=n;part.goal=rule;});
 count.hidden=rule.rule==='enemies';
 panel.append(labeledChoice('どうしたらゴールがひらく？',Object.entries(GOAL_RULES),rule.rule,value=>{
  rule.rule=value;part.goal=rule;count.hidden=value==='enemies';
 }),count);
}
function renderSettings(){
 const panel=$('#inspector');panel.replaceChildren();
 if(settingsTarget==='upgrades'){renderUpgrades(panel);return;}
 if(settingsTarget==='enemies'){renderEnemySettings(panel);return;}
 const part=project.objects.find(o=>o.id===settingsTarget);
 if(settingsTarget==='player'){
  const weapon=project.weapon;$('#settings-title').textContent='プレイヤー・たまのせってい';
  panel.append(field('たまのはやさ',weapon.speed,100,1000,50,n=>weapon.speed=n),
   field('たまをうつまでのまちじかん（びょう）',weapon.interval,.1,2,.1,n=>weapon.interval=n),
   field('たまのつよさ',weapon.damage,1,10,1,n=>weapon.damage=n),
   note('いちどに出るたまのかず'),choice('いちどに出るたまのかず',[[1,'1こ'],[3,'3こ'],[5,'5こ']],weapon.spread,n=>weapon.spread=Number(n)));
  return;
 }
 if(!part)return;
 $('#settings-title').textContent=$('#part-open').textContent;
 if(part.type==='player'){
  panel.append(note('スタートをドラッグすると、ゲームをはじめるばしょをかえられるよ。'));
  const playerButton=document.createElement('button');playerButton.textContent='プレイヤー・たまのせってい';
  playerButton.onclick=()=>{settingsTarget='player';renderSettings();};panel.append(playerButton);return;
 }
 if(part.type==='spawner'){renderSpawner(panel,part);return;}
 if(part.type==='goal'){renderGoal(panel,part);return;}
 if(part.type!=='enemy'){panel.append(note(partNotes[part.type]));return;}
 renderEnemySettings(panel,part);
}
function renderEnemySettings(panel,part){
 const settings=enemySettings(project,part);
 if(!part){
  $('#settings-title').textContent='てきぜんたいのせってい';
  panel.append(note('ぜんたいのせっていをつかうてきに、ここでえらんだうごきやたいりょくをつかうよ。'));
 }else{
  const shared=enemyUsesDefaults(part);
  panel.append(checkbox('このてきだけ、せっていをかえる',!shared,individual=>{
   part.useEnemyDefaults=!individual;
   if(individual)Object.assign(part,settings);
   renderSettings();
  }));
  if(shared){
   panel.append(note(`ぜんたいのせっていをつかっているよ。たいりょく ${settings.hp}、ほしは${settings.dropStar?'おとす':'おとさない'}。`));
   const button=document.createElement('button');button.textContent='てきぜんたいのせっていをみる';
   button.onclick=()=>{settingsTarget='enemies';renderSettings();};panel.append(button);
   return;
  }
 }
 function writeSettings(){
  if(part)Object.assign(part,settings,{useEnemyDefaults:false});
  else project.enemyDefaults=settings;
 }
 panel.append(field('たいりょく',settings.hp,1,20,1,n=>{settings.hp=n;writeSettings();}),
  checkbox('たおれたら、ほしをおとす',settings.dropStar,value=>{settings.dropStar=value;writeSettings();}),
  note('ゲームがはじまったら、うえからじゅんにうごきをくりかえすよ。'));
 const changeProgram=action=>{action();writeSettings();save();renderSettings();};
 settings.program.forEach((entry,i)=>{
  const block=document.createElement('section'),title=document.createElement('h3'),actions=document.createElement('div');
  block.className='program-block';actions.className='program-actions';title.textContent=`うごき ${i+1}`;
  const move=offset=>{[settings.program[i],settings.program[i+offset]]=[settings.program[i+offset],settings.program[i]];};
  for(const [label,disabled,action] of [['↑ うえへ',i===0,()=>move(-1)],['↓ したへ',i===settings.program.length-1,()=>move(1)],['けす',false,()=>settings.program.splice(i,1)]]){
   const button=document.createElement('button');button.textContent=label;button.disabled=disabled;
   button.onclick=()=>changeProgram(action);actions.append(button);
  }
  block.append(title,choice(`うごき ${i+1}`,Object.entries(ACTIONS).map(([key])=>[key,actionLabels[key]]),entry.action,v=>{entry.action=v;writeSettings();}),
   field('はやさ',entry.value,10,300,1,n=>{entry.value=n;writeSettings();}),actions);panel.append(block);
 });
 const add=document.createElement('button');add.textContent='＋ うごきをたす';add.disabled=settings.program.length>=8;
 add.onclick=()=>changeProgram(()=>settings.program.push({action:'patrol',value:60}));panel.append(add);
}
function openSettings(target){settingsTarget=target;renderSettings();settingsDialog.showModal();}
$('#part-open').onclick=()=>{if(selected)openSettings(selected);};
$('#player-open').onclick=()=>openSettings('player');
$('#upgrades-open').onclick=()=>openSettings('upgrades');
$('#enemy-settings-open').onclick=()=>openSettings('enemies');

const partTools=[['enemy','🤖','てき'],['spawner','◉','てきがでるばしょ'],['wall','▧','かべ'],['star','★','ほし'],['goal','⚑','ゴール']];
const editTools=[['select','↖','えらぶ'],['erase','⌫','けす']];
let toolButtons=[];
function updateTool(next){
 finishGesture(false);tool=next;preview=null;
 for(const button of toolButtons){const active=button.dataset.tool===tool;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}
 if(mode==='play')return;
 const label=partTools.find(([key])=>key===tool)?.[2];
 $('#hint').textContent=tool==='select'?'パーツをタップしてえらぼう。ドラッグでうごかせるよ':tool==='erase'?'けしたいパーツをタップしよう':`${label}をおくばしょをタップしよう`;
}
for(const [selector,entries] of [['#tools',partTools],['#edit-tools',editTools]]){
 for(const [id,icon,label] of entries){
  const button=document.createElement('button'),symbol=document.createElement('span');button.className='tool';button.dataset.tool=id;
  symbol.className='tool-icon';symbol.setAttribute('aria-hidden','true');symbol.textContent=icon;
  button.append(symbol,label);button.onclick=()=>updateTool(id);$(selector).append(button);toolButtons.push(button);
 }
}
updateTool(tool);

function setMode(next){
 finishGesture(false);preview=null;clearInput();
 if(next==='edit'&&mode==='play')centerOn(game.player);
 mode=next;const playing=mode==='play';setGamePageMode(playing);
 $('#editor-layout').classList.toggle('is-playing',playing);
 for(const id of ['#edit','#play']){const current=(id==='#play')===playing;$(id).classList.toggle('active',current);$(id).setAttribute('aria-pressed',String(current));}
 for(const id of ['#tools','#edit-toolbar','#mode-tag','#world-label','#pan-controls'])$(id).hidden=playing;
 for(const id of ['#hud','#touch-controls','#restart'])$(id).hidden=!playing;
 $('#result').hidden=true;$('#workshop').inert=playing;$('#title').disabled=playing;
 if(playing){lastMessageId=0;game=createGame(project);centerOn(game.player);$('#hint').textContent='ひだりでいどう・みぎでたまをうつ　PC: WASD・スペース';}
 else{updateTool(tool);renderSelection();}
 syncHistory();canvas.focus({preventScroll:true});
}
function centerOn(point){camera.x=clamp(point.x,0,WORLD.w);camera.y=clamp(point.y,0,WORLD.h);}
$('#play').onclick=()=>setMode('play');$('#edit').onclick=()=>setMode('edit');$('#restart').onclick=()=>setMode('play');
bindGameAction($('#retry'),()=>setMode('play'));bindGameAction($('#back'),()=>setMode('edit'));
$('#home').onclick=()=>centerOn(mode==='play'?game.player:start());
$('#title').oninput=()=>{project.title=$('#title').value;save({record:false});};
$('#title').onchange=()=>save();
for(const button of document.querySelectorAll('[data-pan]'))button.onclick=()=>{
 const [x,y]=button.dataset.pan.split(',').map(Number);centerOn({x:camera.x+x*240,y:camera.y+y*240});preview=null;
};

function view(){
 const box=canvas.getBoundingClientRect(),scale=Math.max(.4,Math.min(box.width/940,box.height/650));
 return {w:box.width,h:box.height,scale};
}
function point(event){
 const rect=canvas.getBoundingClientRect(),{w,h,scale}=view();
 return {x:(event.clientX-rect.left-w/2)/scale+camera.x,y:(event.clientY-rect.top-h/2)/scale+camera.y};
}
function hit(point){
 for(let index=project.objects.length-1;index>=0;index--){
  const part=project.objects[index],radius=part.type==='wall'?34:26;
  if(Math.abs(part.x-point.x)<radius&&Math.abs(part.y-point.y)<radius)return part;
 }
}
function insideStage(event){
 const rect=canvas.getBoundingClientRect();return event.clientX>=rect.left&&event.clientX<=rect.right&&event.clientY>=rect.top&&event.clientY<=rect.bottom;
}
function placement(point){
 const {x,y}=point;if(x<24||y<24||x>WORLD.w-24||y>WORLD.h-24)return null;
 const snapped={type:tool,x:clamp(Math.round(x/32)*32,32,WORLD.w-32),y:clamp(Math.round(y/32)*32,32,WORLD.h-32)};
 const blocked=tool==='wall'&&project.objects.some(o=>Math.abs(o.x-snapped.x)<55&&Math.abs(o.y-snapped.y)<55);
 const full=tool==='spawner'&&!canAddSpawner(project.objects);
 return {...snapped,reason:project.objects.length>=300?'パーツは300こまでおけます':full?'てきがでるばしょは12こまで':blocked?'すこしはなれたばしょにおこう':''};
}
canvas.onpointerdown=event=>{
 if(mode!=='edit'||gesture)return;
 event.preventDefault();canvas.setPointerCapture(event.pointerId);
 const location=point(event),part=hit(location);
 gesture={pointer:event.pointerId,tool,part,startX:event.clientX,startY:event.clientY,camera:{...camera},moved:false};
 if(tool==='select'&&part){gesture.from={x:part.x,y:part.y};gesture.grab=location;selected=part.id;renderSelection();}
 if(tool!=='select'&&tool!=='erase')preview=placement(location);
};
canvas.onpointermove=event=>{
 if(mode!=='edit')return;
 if(!gesture){if(event.pointerType!=='touch'&&tool!=='select'&&tool!=='erase')preview=placement(point(event));return;}
 if(event.pointerId!==gesture.pointer)return;
 const dx=event.clientX-gesture.startX,dy=event.clientY-gesture.startY;
 if(Math.hypot(dx,dy)>5)gesture.moved=true;
 if(gesture.tool==='select'&&gesture.moved){
  if(gesture.part){
   const {from,grab,part}=gesture,now=point(event);
   part.x=clamp(Math.round((from.x+now.x-grab.x)/16)*16,32,WORLD.w-32);
   part.y=clamp(Math.round((from.y+now.y-grab.y)/16)*16,32,WORLD.h-32);
  }else{const {scale}=view();centerOn({x:gesture.camera.x-dx/scale,y:gesture.camera.y-dy/scale});}
 }else if(gesture.tool!=='select'&&gesture.tool!=='erase')preview=insideStage(event)?placement(point(event)):null;
};
function finishGesture(commit,event){
 if(!gesture||event&&gesture.pointer!==event.pointerId)return;
 const action=gesture;gesture=null;
 const candidate=commit&&insideStage(event)&&action.tool!=='select'&&action.tool!=='erase'?placement(point(event)):null;
 preview=null;
 if(action.tool==='select'){
  if(action.from){if(commit){if(action.moved)save();}else Object.assign(action.part,action.from);}
  else if(commit&&!action.moved){selected=null;renderSelection();}
  return;
 }
 if(!commit||!insideStage(event))return;
 if(action.tool==='erase'){
  const part=action.part;if(action.moved||!part||part.type==='player')return;
  project.objects=project.objects.filter(o=>o.id!==part.id);if(selected===part.id)selected=null;
 }else{
  if(!candidate)return;
  if(candidate.reason){toast(candidate.reason);return;}
  const added=makeObject(candidate.type,candidate.x,candidate.y);project.objects.push(added);selected=added.id;
 }
 save();renderSelection();
}
canvas.onpointerup=event=>finishGesture(true,event);
canvas.onpointercancel=canvas.onlostpointercapture=event=>finishGesture(false,event);
canvas.onpointerleave=()=>{if(!gesture)preview=null;};

window.addEventListener('keydown',event=>{
 if(event.target.matches('input,textarea,button')||document.querySelector('dialog[open]'))return;
 if(mode==='play'&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(event.key))event.preventDefault();
 keys.add(event.key.toLowerCase());
});
window.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
const joy=$('#joystick'),resetHeld=bindHeldButton($('#fire'),()=>{firing=true;},()=>{firing=false;});
const resetTouch=installGameTouchGuard($('.canvas-wrap'),()=>mode==='play');
function clearInput(){keys.clear();resetHeld();resetTouch();stickPointer=null;stick={x:0,y:0};joy.firstElementChild.style.transform='';}
window.addEventListener('blur',()=>{clearInput();finishGesture(false);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();finishGesture(false);}});
function updateStick(event){
 const rect=joy.getBoundingClientRect(),radius=rect.width*.34;
 let x=(event.clientX-rect.left-rect.width/2)/radius,y=(event.clientY-rect.top-rect.height/2)/radius;
 const distance=Math.max(1,Math.hypot(x,y));x/=distance;y/=distance;
 stick={x,y};joy.firstElementChild.style.transform=`translate(${x*25}px,${y*25}px)`;
}
joy.onpointerdown=event=>{if(stickPointer!==null)return;event.preventDefault();stickPointer=event.pointerId;joy.setPointerCapture(event.pointerId);updateStick(event);};
joy.onpointermove=event=>{if(event.pointerId===stickPointer)updateStick(event);};
joy.onpointerup=joy.onpointercancel=joy.onlostpointercapture=event=>{if(event.pointerId===stickPointer){stickPointer=null;stick={x:0,y:0};joy.firstElementChild.style.transform='';}};

for(const [button,dialog] of [['#help','#help-dialog'],['#files','#files-dialog']])$(button).onclick=()=>{
 if(mode==='play')setMode('edit');$(dialog).showModal();
};
for(const button of document.querySelectorAll('dialog .close'))button.onclick=()=>button.closest('dialog').close();
$('#map-open').onclick=()=>{finishGesture(false);preview=null;clearInput();$('#map-hint').hidden=mode==='play';mapDialog.showModal();drawOverview();};
overview.onclick=event=>{
 if(mode!=='edit')return;
 const bounds=overview.getBoundingClientRect();centerOn({x:(event.clientX-bounds.left)*WORLD.w/bounds.width,y:(event.clientY-bounds.top)*WORLD.h/bounds.height});
 mapDialog.close();canvas.focus({preventScroll:true});
};
$('#export').onclick=()=>{
 const blob=new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download=(project.title.replace(/[<>:"/\\|?*]/g,'_')||'わたしのゲーム')+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
 toast('さくひんファイルをほぞんしました');
};
$('#import').onchange=async event=>{
 const file=event.target.files[0];if(!file)return;
 try{
  if(file.size>500000)throw Error('ファイルが大きすぎます');
  const next=validateProject(JSON.parse(await file.text()));
  if(!confirm('いまのさくひんを、よみこんださくひんにいれかえますか？'))return;
  applyProject(next,{reset:true});$('#files-dialog').close();setMode('edit');toast('さくひんをよみこみました');
 }catch(error){toast(error instanceof SyntaxError?'さくひんファイルをよみこめませんでした':error.message);}
 finally{event.target.value='';}
};
$('#new').onclick=()=>{
 if(!confirm('いまのさくひんを、からのステージにいれかえますか？'))return;
 applyProject(freshProject(),{reset:true});setMode('edit');
};

function rounded(x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function star(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,rr=i%2?r*.45:r;const px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fill();}
function drawObject(o,selectedFlag=false){const {x,y}=o;ctx.save();if(selectedFlag){ctx.strokeStyle='#b7a1ff';ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.strokeRect(x-38,y-38,76,76);ctx.setLineDash([]);}if(o.type==='wall'){rounded(x-32,y-32,64,64,8,'#405773');rounded(x-27,y-27,54,49,6,'#526b87');ctx.strokeStyle='#6c849e';ctx.strokeRect(x-20,y-20,40,36);}if(o.type==='star'&&!o.collected){ctx.shadowColor='#f9d47a';ctx.shadowBlur=18;star(x,y,16,'#ffda80');}if(o.type==='spawner'){ctx.fillStyle='#773e46';ctx.strokeStyle='#ffb891';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,22,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.stroke();}if(o.type==='goal'){const locked=mode==='play'&&!goalReady(game,o);ctx.strokeStyle=locked?'#6c6495':'#b6a0fc';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x,y+18,30,13,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(x-8,y+12);ctx.lineTo(x-8,y-25);ctx.lineTo(x+19,y-15);ctx.lineTo(x-8,y-5);ctx.stroke();if(locked){ctx.font='10px system-ui';ctx.fillStyle='#a5a3b5';ctx.textAlign='center';ctx.fillText(o.goal?.rule==='stars'?'ほしをあつめよう':o.goal?.rule==='both'?'てきとほしをたしかめよう':'てきをたおそう',x,y+45);}}
if(o.type==='enemy'){ctx.shadowColor='#ff8d9b66';ctx.shadowBlur=15;rounded(x-23,y-22,46,44,14,'#dd7189');ctx.shadowBlur=0;rounded(x-17,y-17,34,29,9,'#ff9ead');rounded(x-14,y-9,28,13,5,'#493750');ctx.fillStyle='#fff1c8';ctx.fillRect(x-9,y-5,5,5);ctx.fillRect(x+4,y-5,5,5);ctx.strokeStyle='#fc9aaa';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y-22);ctx.lineTo(x,y-30);ctx.stroke();ctx.beginPath();ctx.arc(x,y-31,3,0,Math.PI*2);ctx.fill();if(mode==='play'){rounded(x-20,y+29,40,4,2,'#51384e');rounded(x-20,y+29,40*clamp(o.hp/(o.maxHp||project.objects.find(p=>p.id===o.id)?.hp||3),0,1),4,2,'#f8a5b5');}}
if(o.type==='player'){if(mode==='play'&&o.invincible>0&&Math.floor(o.invincible*12)%2)ctx.globalAlpha=.4;ctx.translate(x,y);ctx.rotate((o.angle||0)+Math.PI/2);ctx.shadowColor='#69efdc80';ctx.shadowBlur=22;ctx.fillStyle='#80e6d7';ctx.beginPath();ctx.moveTo(0,-28);ctx.lineTo(21,20);ctx.lineTo(0,12);ctx.lineTo(-21,20);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#e7fff7';ctx.beginPath();ctx.moveTo(0,-17);ctx.lineTo(7,4);ctx.lineTo(-7,4);ctx.closePath();ctx.fill();ctx.fillStyle='#d6b6ff';ctx.beginPath();ctx.moveTo(-6,19);ctx.lineTo(0,31+Math.sin(performance.now()/80)*4);ctx.lineTo(6,19);ctx.fill();}ctx.restore();}
function drawOverview(){
 const bounds=overview.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2);
 const w=Math.round(bounds.width*ratio),h=Math.round(bounds.height*ratio);
 if(overview.width!==w||overview.height!==h){overview.width=w;overview.height=h;}
 const map=mapContext;
 map.fillStyle='#1b2941';map.fillRect(0,0,w,h);
 map.strokeStyle='#35455e';map.lineWidth=ratio;
 for(let x=0;x<WORLD.w;x+=240){map.beginPath();map.moveTo(x/WORLD.w*w,0);map.lineTo(x/WORLD.w*w,h);map.stroke();}
 for(let y=0;y<WORLD.h;y+=160){map.beginPath();map.moveTo(0,y/WORLD.h*h);map.lineTo(w,y/WORLD.h*h);map.stroke();}
 const objects=mode==='play'?[...game.objects.filter(o=>o.type!=='player'&&!o.collected),game.player]:project.objects;
 for(const part of objects){
  const size=(part.type==='player'?8:5)*ratio;map.fillStyle=TYPES[part.type].color;
  map.fillRect(part.x/WORLD.w*w-size/2,part.y/WORLD.h*h-size/2,size,size);
 }
 const {w:stageWidth,h:stageHeight,scale}=view();
 const width=stageWidth/scale/WORLD.w*w,height=stageHeight/scale/WORLD.h*h;
 map.strokeStyle='#cabbff';map.strokeRect(camera.x/WORLD.w*w-width/2,camera.y/WORLD.h*h-height/2,width,height);
}
function draw(){
 const v=view(),dpr=Math.min(devicePixelRatio||1,2),w=Math.round(v.w*dpr),h=Math.round(v.h*dpr);
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#141f36';ctx.fillRect(0,0,v.w,v.h);
 ctx.translate(v.w/2,v.h/2);ctx.scale(v.scale,v.scale);ctx.translate(-camera.x,-camera.y);
 ctx.fillStyle='#1b2941';ctx.fillRect(0,0,WORLD.w,WORLD.h);
 const left=Math.max(0,camera.x-v.w/v.scale/2),top=Math.max(0,camera.y-v.h/v.scale/2);
 const right=Math.min(WORLD.w,camera.x+v.w/v.scale/2),bottom=Math.min(WORLD.h,camera.y+v.h/v.scale/2);
 const cell=32;
 ctx.fillStyle='#40526e';
 for(let x=Math.ceil(left/cell)*cell;x<right;x+=cell)for(let y=Math.ceil(top/cell)*cell;y<bottom;y+=cell){ctx.beginPath();ctx.arc(x,y,1,0,Math.PI*2);ctx.fill();}
 ctx.strokeStyle='#51617d';ctx.lineWidth=3;ctx.strokeRect(0,0,WORLD.w,WORLD.h);
 const objects=mode==='play'?game.objects:project.objects;
 const showEnemyNumbers=mode==='edit'&&objects.some(part=>part.id===selected&&part.type==='spawner');
 let enemyNumber=0;
 for(const part of objects){
  if(part.type==='player')continue;
  drawObject(part,mode==='edit'&&part.id===selected);
  if(showEnemyNumbers&&part.type==='enemy'){
   ctx.save();ctx.font='bold 14px system-ui';ctx.textAlign='center';ctx.fillStyle='#fff';
   ctx.fillText(String(++enemyNumber),part.x,part.y-41);ctx.restore();
  }
 }
 const player=mode==='play'?game.player:start();drawObject(player,mode==='edit'&&selected===player.id);
 if(mode==='edit'&&preview){
  ctx.save();ctx.globalAlpha=.55;drawObject(preview);ctx.globalAlpha=1;
  ctx.strokeStyle=preview.reason?'#ff9d9e':'#90f0d2';ctx.lineWidth=3;ctx.strokeRect(preview.x-32,preview.y-32,64,64);ctx.restore();
 }
 if(mode==='play'){
  for(const bullet of game.bullets){
   ctx.fillStyle=bullet.enemy?'#ff9ba9':'#b4ffeb';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=10;
   ctx.beginPath();ctx.arc(bullet.x,bullet.y,bullet.enemy?5:4,0,Math.PI*2);ctx.fill();
  }
  ctx.shadowBlur=0;
 }
}
function frame(time){
 const dt=last?Math.min((time-last)/1000,.04):0;last=time;
 if(mode==='play'&&!mapDialog.open){
  stepGame(game,project,{
   x:stick.x+Number(keys.has('arrowright')||keys.has('d'))-Number(keys.has('arrowleft')||keys.has('a')),
   y:stick.y+Number(keys.has('arrowdown')||keys.has('s'))-Number(keys.has('arrowup')||keys.has('w')),
   fire:firing||keys.has(' '),
  },dt);
  camera.x+=(game.player.x-camera.x)*Math.min(1,dt*10);camera.y+=(game.player.y-camera.y)*Math.min(1,dt*10);
  const hp=Math.max(0,game.player.hp);$('#health').textContent='♥'.repeat(hp)+'♡'.repeat(5-hp);
  $('#score').textContent=`★ ${game.stars}　${game.score}てん　🤖 ${game.objects.filter(o=>o.type==='enemy').length}`;
  if(lastMessageId!==game.messageId){lastMessageId=game.messageId;toast(game.message);}
  if(game.state!=='playing'&&$('#result').hidden){
   const won=game.state==='won';$('#result').hidden=false;
   $('#result-title').textContent=won?'ステージクリア！':'もういちどチャレンジ！';
   $('#result-text').textContent=won?`${game.score}てん！`:'たまのかずや、てきのはやさをかえてみよう。';
  }
 }
 draw();if(mapDialog.open)drawOverview();requestAnimationFrame(frame);
}
renderSelection();syncHistory();requestAnimationFrame(frame);
