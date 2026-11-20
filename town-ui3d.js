import {setReadingText} from './readings3d.js?v=20261119d';
import {createChoiceControl} from './choices3d.js?v=20261119d';
import {createRoadNetwork} from './road-network3d.js?v=20261120o';
import {townRoute,raceRoute} from './town-traffic3d.js?v=20261120p';
import {ARRIVAL_TYPES,DEFAULT_FLEET,DEFAULT_RIVAL,MAX_RIVALS,MAX_TOWN_CARS,RIVAL_SPEEDS,RIVAL_CORNERS,TOWN_PARTS} from './town3d.js?v=20261120p';

function elem(tag,text,className){
 const el=document.createElement(tag);
 if(text)setReadingText(el,text);
 if(className)el.className=className;
 return el;
}
function choices(parent,label,options,value,change){
 const row=elem('div',null,'town-choice'),caption=elem('span',label),control=createChoiceControl();
 control.setAttribute('aria-label',label);
 for(const [id,name] of options)control.add(new Option(name,id));
 control.value=value;control.onchange=()=>change(control.value);
 row.append(caption,control);parent.append(row);return control;
}

export function installTownUI({$,getProject,getSelected,save,view,showRoute,field}){
 const dialog=$('#town-traffic3'),body=$('#town-traffic-body3'),opener=$('#town-traffic-open3');
 let current=null,activeRoute=null;
 function render(){
  const p=getProject(),places=p.objects.filter(part=>part.type==='town'&&TOWN_PARTS[part.townKind]?.capacity);
  const labels=places.map((part,i)=>[part.id,TOWN_PARTS[part.townKind].name+' '+(i+1)]);
  if(!places.some(part=>part.id===current))current=(places.find(part=>part.townKind==='house')||places[0])?.id;
  body.replaceChildren();
  if(!places.length){body.append(elem('p','まちのパーツから、出発するいえと行き先のちゅうしゃじょうをおこう。'));return;}
  const total=places.reduce((sum,part)=>sum+(part.townFleet?.count||0),0);
  const source=places.find(part=>part.id===current);
  const capacity=TOWN_PARTS[source.townKind].capacity;
  const max=Math.max(0,Math.min(capacity,MAX_TOWN_CARS-total+(source.townFleet?.count||0)));
  const fleet={...DEFAULT_FLEET,count:source.townKind==='house'?Math.min(1,max):0,...source.townFleet};
  const update=patch=>{source.townFleet={...fleet,...source.townFleet,...patch};};
  const change=patch=>{update(patch);save();render();};
  choices(body,'しゅっぱつする場所',labels,current,id=>{current=id;render();});
  choices(body,'くるまの数',Array.from({length:max+1},(_,i)=>[i,i?i+'だい':'なし']),fleet.count,count=>change({count:Number(count)}));
  choices(body,'行き先',[['','まだえらばない'],...labels.filter(([id])=>id!==current)],fleet.targetId,id=>change({targetId:id}));
  const numbers=elem('div',null,'town-numbers');
  field(numbers,'何びょう後に出る？',fleet.delay,0,60,1,value=>{update({delay:value});return value;});
  if(capacity>1)field(numbers,'何びょうごとに出る？',fleet.interval,1,30,1,value=>{update({interval:value});return value;});
  body.append(numbers);
  choices(body,'はしる速さ',[[20,'ゆっくり'],[35,'ふつう'],[50,'はやい']],fleet.speed,speed=>change({speed:Number(speed)}));
  choices(body,'着いたらどうする？',Object.entries(ARRIVAL_TYPES),fleet.arrival,arrival=>change({arrival}));
  const target=places.find(part=>part.id===fleet.targetId),path=target&&townRoute(createRoadNetwork(p.roads),source,target);
  if(fleet.targetId&&!path)body.append(elem('p','この行き先にはまだ行けないよ。どうろのつながりをたしかめよう。','town-note'));
  if(target&&fleet.arrival==='park'&&fleet.count>TOWN_PARTS[target.townKind].capacity)body.append(elem('p','行き先の空いている台数まで、くるまが出るよ。','town-note'));
  if(total>=MAX_TOWN_CARS)body.append(elem('p',MAX_TOWN_CARS+'だいまで走らせられるよ。','town-note'));
  const buttons=elem('div',null,'town-actions'),preview=elem('button','走るみちを見る','primary');
  preview.disabled=!path;
  preview.onclick=()=>{activeRoute=source.id;dialog.close();view.showRoute(path);showRoute(path);$('#town-route-close3').hidden=false;};
  buttons.append(preview);body.append(buttons);
 }
 $('#town-route-close3').onclick=clear;
 function clear(){activeRoute=null;view.showRoute(null);$('#town-route-close3').hidden=true;}
 opener.onclick=()=>{
  clear();
  const selected=getSelected(),hasHomes=getProject().objects.some(part=>part.type==='town'&&part.townKind==='house');
  if(selected?.townKind==='house'||!hasHomes)current=selected?.id||current;
  render();dialog.showModal();
 };
 opener.hidden=false;
 return {clear,refresh(){
  if(!activeRoute)return;
  const p=getProject(),source=p.objects.find(part=>part.id===activeRoute);
  const target=p.objects.find(part=>part.id===source?.townFleet?.targetId);
  const route=source&&target?townRoute(createRoadNetwork(p.roads),source,target):null;
  if(route)view.showRoute(route);else clear();
 }};
}

export function renderRivalSettings(parent,project,save,refresh){
 parent.replaceChildren();
 const rivals=project.rivals||[];
 choices(parent,'あいての台数',Array.from({length:MAX_RIVALS+1},(_,i)=>[i,i?i+'だい':'なし']),rivals.length,n=>{
  project.rivals=Array.from({length:Number(n)},(_,i)=>rivals[i]||{...DEFAULT_RIVAL});
  save();refresh();
 });
 if(!rivals.length)return;
 const route=raceRoute(project);
 if(!route?.length)parent.append(elem('p','あいてが走れるように、つながった道にゲートをおこう。１つの道を１しゅうするレースでも走れるよ。','town-note'));
 for(const [i,rival] of rivals.entries()){
  const card=elem('section',null,'town-rival'),heading=elem('strong','あいて '+(i+1));card.append(heading);
  choices(card,'速さ',RIVAL_SPEEDS.map((speed,i)=>[speed,['ゆっくり','ふつう','はやい'][i]]),rival.speed,n=>{rival.speed=Number(n);save();});
  choices(card,'カーブ',RIVAL_CORNERS.map((turn,i)=>[turn,['ゆっくり','ふつう','とくい'][i]]),rival.corner,n=>{rival.corner=Number(n);save();});
  parent.append(card);
 }
}
