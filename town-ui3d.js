import {setReadingText} from './readings3d.js?v=20261119d';
import {createChoiceControl} from './choices3d.js?v=20261119d';
import {mountLiveRangeEditor} from './range-panel3d.js?v=20261124a';
import {setStageRangePainter} from './stage-range3d.js?v=20261124a';
import {createRoadNetwork} from './road-network3d.js?v=20261127i';
import {townRoute,raceRoute,reachableTownDestinations,resolveTownTrip} from './town-traffic3d.js?v=20261127i';
import {ARRIVAL_TYPES,AUTO_TOWN_DESTINATION,DEFAULT_RIVAL,MAX_RIVALS,MAX_TOWN_CARS,RIVAL_SPEEDS,RIVAL_CORNERS,TOWN_PARTS,townFleetSettings,townParkingCapacity} from './town3d.js?v=20261127c';

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

export function installTownUI({$,getProject,getSelected,save,view,pickTownPart,field,onClose,toast}){
 const dialog=$('#town-traffic3'),body=$('#town-traffic-body3'),opener=$('#town-traffic-open3');
 const closePreview=$('#town-route-close3');
 let activeRoute=null,editorClose=null,renderMap=null,roadSnapshot,network;
 const places=()=>getProject().objects.filter(part=>part.type==='town'&&townParkingCapacity(part));
 const canStart=part=>part?.type==='town'&&!!TOWN_PARTS[part.townKind]?.capacity;
 const syncSelected=part=>{opener.hidden=!canStart(part);};
 const vehicleCount=()=>places().reduce((sum,part)=>sum+(part.townFleet?.count||0),0);
 function roads(){
  const next=getProject().roads;
  if(!network||next!==roadSnapshot){roadSnapshot=next;network=createRoadNetwork(next);}
  return network;
 }
 function labels(all){
  const counts=new Map();
  return new Map(all.map(part=>{
   const count=(counts.get(part.townKind)||0)+1;counts.set(part.townKind,count);
   return [part.id,TOWN_PARTS[part.townKind].name+' '+count];
  }));
 }
 function update(part,patch){
  part.townFleet={...townFleetSettings(part),...patch};
 }
 function changeDestination(part,targetId){
  if(townFleetSettings(part).targetId===targetId)return;
  const firstCar=targetId&&!part.townFleet&&part.townKind!=='house'&&vehicleCount()<MAX_TOWN_CARS;
  update(part,firstCar?{targetId,count:1}:{targetId});save();
 }
 function resetRoute(){
  activeRoute=null;view.showRoute(null);view.showRoutePlaces(null,null);view.showRouteCandidates([]);closePreview.hidden=true;
 }
 function clear(){if(editorClose)editorClose();else resetRoute();}
 closePreview.onclick=clear;
 function renderDrivingSettings(part){
  const capacity=TOWN_PARTS[part.townKind].capacity,fleet=townFleetSettings(part);
  const all=places(),total=vehicleCount();
  const max=Math.max(0,Math.min(capacity,MAX_TOWN_CARS-total+(part.townFleet?.count||0)));
  const set=patch=>{update(part,patch);save();renderDrivingSettings(part);renderMap?.();};
  body.replaceChildren(elem('p',labels(all).get(part.id)));
  choices(body,'くるまの数',Array.from({length:Math.max(max,fleet.count)+1},(_,i)=>[i,i?i+'だい':'なし']),fleet.count,count=>set({count:Number(count)}));
  const numbers=elem('div',null,'town-numbers');
  field(numbers,'何びょう後に出る？',fleet.delay,0,60,1,value=>{update(part,{delay:value});return value;});
  if(capacity>1)field(numbers,'何びょうごとに出る？',fleet.interval,1,30,1,value=>{update(part,{interval:value});return value;});
  body.append(numbers);
  choices(body,'はしる速さ',[[20,'ゆっくり'],[35,'ふつう'],[50,'はやい']],fleet.speed,speed=>set({speed:Number(speed)}));
  choices(body,'着いたらどうする？',Object.entries(ARRIVAL_TYPES),fleet.arrival,arrival=>set({arrival}));
  const trip=resolveTownTrip(roads(),part,all);
  if(trip&&fleet.arrival==='park'&&fleet.count>townParkingCapacity(trip.target)){
   body.append(elem('p','行き先の空いている台数まで、くるまが出るよ。','town-note'));
  }
  if(total>=MAX_TOWN_CARS)body.append(elem('p',MAX_TOWN_CARS+'だいまで走らせられるよ。','town-note'));
 }
 function openMap(){
  clear();
  const selected=getSelected();
  if(!canStart(selected))return;
  const source=()=>places().find(part=>part.id===selected.id&&canStart(part));
  const panel=elem('section',null,'town-route-editor'),heading=elem('div',null,'range-live-heading');
  const title=elem('h2'),done=elem('button','できた','primary');
  const tools=elem('div',null,'town-route-tools'),hint=elem('p',null,'road-editor-hint');
  hint.setAttribute('role','status');
  const automatic=elem('button','おみせを自動でえらぶ');
  const unset=elem('button','行き先をはずす');
  const settings=elem('button','車のせってい');
  heading.append(title,done);tools.append(automatic,unset,settings);panel.append(heading,tools,hint);
  let tap=null;
  const finish=mountLiveRangeEditor(panel,()=>{
   setStageRangePainter(null);editorClose=null;renderMap=null;
   if(dialog.open)dialog.close();
   opener.setAttribute('aria-expanded','false');resetRoute();onClose();
  },{host:$('#road-draft3')});
  function applyDestination(part,targetId){
   changeDestination(part,targetId);
   finish();showSourceRoute(part);
   toast(targetId?'行き先をかえたよ。':'行き先をはずしたよ。');
  }
  editorClose=finish;done.onclick=finish;opener.setAttribute('aria-expanded','true');
  renderMap=(message=null)=>{
   const all=places(),names=labels(all),part=source();
   const fleet=part&&townFleetSettings(part),trip=part&&resolveTownTrip(roads(),part,all);
   const target=trip?.target;
   const candidates=part?reachableTownDestinations(roads(),part,all).filter(place=>place.id!==target?.id):[];
   view.showRoute(trip?.path);view.showRoutePlaces(part,target);
   view.showRouteCandidates(candidates);
   setReadingText(title,part?(names.get(part.id)+' → '+(names.get(target?.id)||names.get(fleet.targetId)||'行き先なし')+(trip?.auto?'（自動）':'')):'まちの車');
   tools.hidden=!part;
   automatic.hidden=part?.townKind!=='house';
   automatic.setAttribute('aria-pressed',String(fleet?.targetId===AUTO_TOWN_DESTINATION));
   unset.disabled=!fleet?.targetId;
   setReadingText(hint,message||(!part?'車を出すパーツをえらぼう。':candidates.length?'むらさきのしるしをおすと、行き先になるよ。':
    trip?'ほかの建物まで道をつなぐと、行き先をふやせるよ。':'行き先にできる建物まで道をつなごう。'));
  };
  automatic.onclick=()=>{const part=source();if(part)applyDestination(part,AUTO_TOWN_DESTINATION);};
  unset.onclick=()=>{const part=source();if(part)applyDestination(part,'');};
  settings.onclick=()=>{const part=source();if(part){renderDrivingSettings(part);dialog.showModal();}};
  renderMap();
  setStageRangePainter((kind,id,ground,canceled)=>{
   const event=ground?.pointerEvent;
   if(kind==='start'&&!tap&&event)tap={id,x:event.clientX,y:event.clientY};
   if(kind!=='end'||tap?.id!==id)return true;
   const start=tap;tap=null;
   if(canceled||!event||Math.hypot(start.x-event.clientX,start.y-event.clientY)>10)return true;
   const targetId=pickTownPart(event),target=places().find(part=>part.id===targetId);
   const part=source();
   if(!part)return true;
   if(!target||target.id===part.id){renderMap('ほかのいえ・おみせ・がっこうなどをおそう。');return true;}
   if(!townRoute(roads(),part,target)){renderMap('この場所までは道がつながっていないよ。');return true;}
   applyDestination(part,target.id);
   return true;
  });
 }
 opener.onclick=()=>{if(!editorClose)openMap();};
 function refresh(){
  if(renderMap){renderMap();return;}
  if(!activeRoute)return;
  const all=places(),part=all.find(part=>part.id===activeRoute);
  const trip=part&&resolveTownTrip(roads(),part,all);
  if(trip){view.showRoute(trip.path);view.showRoutePlaces(part,trip.target);}else resetRoute();
 }
 function showSourceRoute(part){
  if(!canStart(part)){clear();return;}
  activeRoute=part.id;refresh();closePreview.hidden=!activeRoute;
 }
 return {clear,refresh,syncSelected,showSourceRoute};
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
