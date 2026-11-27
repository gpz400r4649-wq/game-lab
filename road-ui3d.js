import {updateRoadGateWidths} from './race3d.js?v=20261125g';
import {MAX_ROADS,MAX_ROAD_POINTS,MAX_ROAD_HEIGHT,ROAD_HEIGHT_STEP,ROAD_WIDTHS,alignRoadEndpoints,roadPoint,roadGridSites,roadConnection,roadStartConnection,nearestRoad,nearestRoadHandle,removeRoadPoint,reverseOpenRoad,roadArcPlacement,roadDemolitionSection,roadPiecePlacement,roadStrokeAim,roadStrokePlacement,roadPointsFit,roadSegmentAt,splitRoadSection,toggleRoadGuardrail,validRoads} from './road3d.js?v=20261126l';
import {closeLiveRangeEditor,mountLiveRangeEditor} from './range-panel3d.js?v=20261124a';
import {setStageRangePainter} from './stage-range3d.js?v=20261124a';
import {refitTownParts} from './town3d.js?v=20261127c';

export function createRoadEditor({$,getProject,save,rebuild,view,focusRoad,pickRoad,pickPart,erasePart,pickHandle,pointerAtHeight,isOnStage,focusHeight,toast}){
 const bar=$('#city-build3'),demolish=$('#city-demolish3'),presets=$('#road-presets3'),host=$('#road-draft3');
 const categories=[...bar.querySelectorAll('[data-city-panel]')];
 const stage=$('#viewport'),panels=[...bar.querySelectorAll('.city-build-panel')];
 function keepStageControlsVisible(){
  const height=Math.max(...panels.map(panel=>panel.offsetHeight));
  const panelTop=bar.getBoundingClientRect().top-height;
  const overlap=bar.offsetHeight?Math.max(0,stage.getBoundingClientRect().bottom-panelTop):0;
  stage.style.setProperty('--city-panel-overlap',overlap+'px');
 }
 const layout=new ResizeObserver(keepStageControlsVisible);
 [stage,bar,...panels].forEach(panel=>layout.observe(panel));
 window.addEventListener('scroll',keepStageControlsVisible,{passive:true});
 const widthTabs=$('#road-width-tabs3');
 function button(text,onclick,className=''){
  const element=document.createElement('button');element.type='button';element.textContent=text;element.onclick=onclick;element.className=className;
  return element;
 }
 const roadLimit=$('#road-limit3');
 roadLimit.textContent=MAX_ROADS+'本まで道を作ったよ。「えらぶ」で道をおすと、のばせるよ。';
 demolish.onclick=()=>{
  const active=demolish.getAttribute('aria-pressed')==='true';
  if(!host.hidden)closeLiveRangeEditor();
  if(!active){
   $('[data-editor-tool][data-part=select]').click();
   pickSavedRoad('demolish');
  }
 };
 function refreshMenu(){
  const roads=getProject().roads||[];
  for(const control of presets.querySelectorAll('button'))control.disabled=roads.length>=MAX_ROADS;
  roadLimit.hidden=roads.length<MAX_ROADS;
 }
 function roadCard(label,width,variant){
  const style={width,...variant};
  const control=button('',()=>{
   if((getProject().roads||[]).length>=MAX_ROADS)return;
   openEditor({id:crypto.randomUUID(),closed:false,points:[],...style});
  },'road-preset-card');
  const name=label+' '+style.width+'m';
  control.title=name;control.setAttribute('aria-label',name);
  const preview=document.createElement('span');preview.className='road-preset-preview';preview.setAttribute('aria-hidden','true');
  preview.style.setProperty('--road-preview-width',style.width*2.65+'px');
  preview.dataset.lines=style.markings==='street'?(style.width>=8?'street':'edge'):'race';
  if(style.sidewalk)preview.dataset.sidewalk=style.sidewalk;
  if(style.barrier)preview.dataset.barrier=style.barrier;
  control.append(preview);return control;
 }
 const widthLabels=['せまい','ふつう','ひろい','もっとひろい'];
 const widthGroups=ROAD_WIDTHS.map((width,index)=>{
  const tab=button(`${widthLabels[index]} ${width}m`,()=>selectWidth(index));
  const panel=document.createElement('div');
  tab.id=`road-width-tab3-${width}`;panel.id=`road-preset-panel3-${width}`;
  tab.setAttribute('role','tab');tab.setAttribute('aria-controls',panel.id);
  panel.className='city-build-options road-preset-strip';
  panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);
  const choices=[
   ['ふつうの道',{markings:'street'}],
   ['歩道つき',{markings:'street',sidewalk:'both'}],
   ['ガードレールつき',{markings:'street',barrier:'guardrail'}]
  ];
  if(width<=8)choices.push(['コースのさくつき',{barrier:'mini'}]);
  if(width===8)choices.push(['レース用',{}]);
  if(width>=12)choices.push(['高いさくつき',{markings:'street',barrier:'highway'}]);
  panel.append(...choices.map(([label,style])=>roadCard(label,width,style)));
  widthTabs.append(tab);presets.append(panel);return {tab,panel};
 });
 function selectWidth(index,focus=false){
  for(const [i,{tab,panel}] of widthGroups.entries()){
   const active=i===index;
   tab.tabIndex=active?0:-1;
   tab.setAttribute('aria-selected',String(active));
   panel.hidden=!active;
  }
  if(focus)widthGroups[index].tab.focus();
 }
 widthTabs.onkeydown=event=>{
  const index=widthGroups.findIndex(({tab})=>tab===event.target),end=widthGroups.length-1;
  const target={ArrowLeft:(index+end)%(end+1),ArrowRight:(index+1)%(end+1),Home:0,End:end}[event.key];
  if(index<0||target===undefined)return;
  event.preventDefault();selectWidth(target,true);
 };
 selectWidth(ROAD_WIDTHS.indexOf(8));
 function showCategory(id){
  for(const category of categories){
   const active=category.dataset.cityPanel===id;
   category.setAttribute('aria-expanded',String(active));
   $('#'+category.dataset.cityPanel).hidden=!active;
  }
  if(id==='city-roads3')refreshMenu();
 }
 for(const category of categories)category.onclick=()=>{
  const id=category.getAttribute('aria-expanded')==='true'?null:category.dataset.cityPanel;
  if(!host.hidden)closeLiveRangeEditor();
  if(id||category.dataset.cityPanel==='city-town3')$('[data-editor-tool][data-part=select]').click();
  showCategory(id);
 };
 bar.hidden=false;

 function applyRoads(next,objects=getProject().objects){
  const project=getProject();
  next=alignRoadEndpoints(next,project);
  project.objects=refitTownParts(updateRoadGateWidths(objects,project.roads||[],next),next,project);
  project.roads=next;save();rebuild();
  return next;
 }
 function pickSavedRoad(action,returnRoadId){
  showCategory(null);
  const erasing=action==='demolish';
  const panel=document.createElement('section'),heading=document.createElement('div'),title=document.createElement('h2'),hint=document.createElement('p');
  heading.className='range-live-heading';hint.className='road-editor-hint';
  title.textContent=erasing?'🚜 こわす':'ガードレールをつける';
  hint.textContent=erasing?'けしたい道やたてものをおそう。赤くなったところが消えるよ。':
   '道をおすと、えらんだところの両がわにつくよ。もう一度おすとはずせるよ。';
  const finish=mountLiveRangeEditor(panel,()=>{setStageRangePainter(null);view.showSegment(null);demolish.setAttribute('aria-pressed','false');},{host});
  demolish.setAttribute('aria-pressed',String(erasing));
  heading.append(title,button(erasing?'おわる':'道の編集にもどる',()=>{
   finish();
   const road=(getProject().roads||[]).find(item=>item.id===returnRoadId);
   if(road)openEditor(road);
  }));
  panel.append(heading,hint);
  let press=null;
  setStageRangePainter((kind,id,ground,canceled)=>{
   if(press&&press.id!==id)return true;
   const event=ground?.pointerEvent,onStage=event&&isOnStage(event);
   const hit=onStage?pickRoad(event):null,part=erasing&&onStage?pickPart(event):null;
   const target=part&&(!hit||part.distance<hit.distance)?part:hit;
   const project=getProject(),road=target===hit&&hit&&(project.roads||[]).find(item=>item.id===hit.id);
   const picked=road?roadSegmentAt(road,hit.point):null;
   const segment=picked&&erasing?(press?.targetId===target.id?press.segment:{...picked,...roadDemolitionSection(road,picked.index)}):picked;
   view.showSegment(kind==='end'?null:segment,erasing?undefined:0x36bba8);
   if(kind==='start'){
    if(!target)return false;
    press={id,event,targetId:target.id,segment};return true;
   }
   if(kind!=='end'||press?.id!==id)return !!press;
   const from=press;press=null;
   if(canceled||!target||target.id!==from.targetId||segment?.index!==from.segment?.index||!from.event||
    Math.hypot(event.clientX-from.event.clientX,event.clientY-from.event.clientY)>10)return true;
   if(part&&target===part){erasePart(part.id);return true;}
   if(!road)return true;
   if(!erasing){applyRoads(project.roads.map(item=>item===road?toggleRoadGuardrail(road,segment.index):item));return true;}
   const surviving=splitRoadSection(road,segment.index,segment.endIndex);
   const next=project.roads.flatMap(item=>item===road?surviving:[item]);
   if(next.length>MAX_ROADS){toast('道の数が上限です。端の区間からけそう');return true;}
   const objects=project.objects.map(part=>{
    const key=part.townRoadId===road.id?'townRoadId':part.gateRoadId===road.id?'gateRoadId':null;
    if(!key)return part;
    const fit=nearestRoad(surviving,part.townAnchor||part,.8);
    const updated={...part};
    if(fit&&fit.gap<.64)updated[key]=fit.roadId;else delete updated[key];
    return updated;
   });
   applyRoads(next,objects);toast('道を１区間けしたよ');
   return true;
  });
 }
 function openEditor(original,pickedPoint=null){
  showCategory(null);
  let draft=structuredClone(original),selected=pickedPoint?nearestRoadHandle(original.points,pickedPoint,Infinity):-1,pointer=null,mode=original.points.length?'move':'piece';
  let grade=0,startHeight=0,heightChosen=false,fromStart=false,arcSide=1;
  let waiting=false;
  const drawingMode=()=>mode==='piece'||mode==='add';
  const lastIndex=()=>draft.points.length-1;
  const drawingIndex=()=>fromStart?0:lastIndex();
  const tipHeight=()=>draft.points[drawingIndex()]?.y??startHeight;
  const drawingRoad=()=>fromStart?reverseOpenRoad(draft):draft;
  function withDrawnPoints(points,closed=false){
   const road={...drawingRoad(),points};
   return {...(fromStart?reverseOpenRoad(road):road),closed};
  }
  const panel=document.createElement('section'),toolbar=document.createElement('div'),tools=document.createElement('div'),controls=document.createElement('div');
  panel.className='road-drawing-panel';panel.tabIndex=-1;panel.setAttribute('aria-label',original.points.length?'道をなおす':'道をひく');
  toolbar.className='road-tools-top';tools.className='stage-range-tools road-tool-strip';controls.className='stage-range-tools road-tool-strip road-tool-options';
  toolbar.append(tools);panel.append(toolbar,controls);
  function commit(){
   const project=getProject();
   if(!validRoads([draft],project))return;
   const roads=project.roads||[],saved=structuredClone(draft);
   const next=roads.some(road=>road.id===draft.id)?roads.map(road=>road.id===draft.id?saved:road):[...roads,saved];
   if(validRoads(next,project))draft=structuredClone(applyRoads(next).find(road=>road.id===saved.id));
  }
  const loop=button('つないで１しゅう',()=>{
   if(!draft.closed&&!roadPointsFit(draft.points,true)){toast('はじめとおわりをすこしはなして、３かしょいじょうえらぼう');return;}
   draft.closed=!draft.closed;
   if(draft.closed&&(mode==='piece'||mode==='add'))mode='move';
   if(!draft.closed&&draft.segmentBarriers)delete draft.segmentBarriers[draft.points.length-1];
   waiting=false;
   commit();refresh();
  });
  const remove=button('てんをけす',()=>{
   if(selected<0||draft.points.length<3)return;
   const updated=removeRoadPoint(draft,selected);
   if(!roadPointsFit(updated.points,false)){toast('この点をけすと坂がきゅうになるよ');return;}
   draft=updated;selected=-1;
   commit();refresh();
  });
  const modes=[['piece','まっすぐ'],['add','カーブ'],['move','点をうごかす']].map(([key,label])=>[key,button(label,()=>{
   if(pointer)return;
   if(mode==='move'&&selected>=0&&(key==='piece'||key==='add'))fromStart=selected<lastIndex()/2;
   if(!waiting&&(key==='piece'||key==='add'))selected=drawingIndex();
   if(key==='move')waiting=false;
   mode=key;view.showSnap([],null);refresh();
  })]);
  const menu=original.points.length?null:'city-roads3';
  toolbar.append(button('とじる',()=>{finish();showCategory(menu);},'road-drawing-close'));
  const heightTools=document.createElement('div'),heightLabel=document.createElement('span');
  heightTools.className='road-height-tools';heightTools.setAttribute('role','group');heightTools.setAttribute('aria-label','てんのたかさ');
  heightLabel.setAttribute('aria-live','polite');
  const lower=button('− さげる',()=>changeHeight(-ROAD_HEIGHT_STEP));
  const raise=button('＋ あげる',()=>changeHeight(ROAD_HEIGHT_STEP));
  heightTools.append(heightLabel,lower,raise);
  const grades=document.createElement('div'),pieceHeight=document.createElement('span'),startControls=document.createElement('div');
  const ends=document.createElement('div');ends.className='road-height-tools';ends.setAttribute('aria-label','道をのばす側');ends.setAttribute('role','group');
  const endButtons=[[true,'はじめから'],[false,'おわりから']].map(([value,label])=>{
   const control=button(label,()=>{
    if(pointer)return;
    fromStart=value;selected=drawingIndex();view.showSnap([],null);refresh();
   });
   ends.append(control);return [value,control];
  });
  grades.className='road-height-tools';grades.setAttribute('role','group');grades.setAttribute('aria-label','つぎの道');
  const gradeButtons=[[-1,'↘ 下る'],[0,'→ 平ら'],[1,'↗ 上る']].map(([value,label])=>{
   const control=button(label,()=>{if(!pointer){grade=value;refresh();}});
   grades.append(control);return [value,control];
  });
  pieceHeight.setAttribute('aria-live','polite');grades.append(pieceHeight);
  startControls.className='road-height-tools';startControls.setAttribute('role','group');startControls.setAttribute('aria-label','はじめの高さ');
  const shiftStart=delta=>{
   if(pointer)return;
   heightChosen=true;
   startHeight=Math.max(0,Math.min(MAX_ROAD_HEIGHT,startHeight+delta));focusHeight?.(startHeight);refresh();
  };
  const startDown=button('−',()=>shiftStart(-ROAD_HEIGHT_STEP));
  const startUp=button('＋',()=>shiftStart(ROAD_HEIGHT_STEP));
  startDown.setAttribute('aria-label','はじめの高さをさげる');startUp.setAttribute('aria-label','はじめの高さをあげる');
  const startLabel=document.createElement('span');startLabel.textContent='はじめの高さ';
  startControls.append(startLabel);
  startControls.append(startDown,startUp);
  const help=document.createElement('span');help.className='road-editor-hint';help.setAttribute('role','status');
  const flipArc=button('↶ カーブを反対に',()=>{if(!pointer){arcSide=-arcSide;view.showSnap([],null);refresh();}});
  const railSection=button('区間のさく',()=>{if(!pointer)pickSavedRoad('guardrail',draft.id);});
  tools.append(...modes.map(([,control])=>control));
  controls.append(ends,grades,startControls,flipArc,heightTools,remove,loop,railSection,help);
  const finish=mountLiveRangeEditor(panel,()=>{
   setStageRangePainter(null);view.showDraft(null);view.showSnap([],null);
  },{host});
  function changeHeight(delta){
   if(selected<0)return;
   const y=(draft.points[selected].y||0)+delta;
   if(y<0||y>MAX_ROAD_HEIGHT)return;
   const points=draft.points.map((point,index)=>index===selected?{...point,y}:point);
   if(!roadPointsFit(points,draft.closed)){toast('坂がきゅうすぎるよ。てんの間をひろげよう');return;}
   draft.points=points;commit();focusHeight?.(y);view.showSnap([],null);refresh();
  }
  function refresh(){
   loop.setAttribute('aria-pressed',String(draft.closed));
   for(const [key,control] of modes){
    control.setAttribute('aria-pressed',String(key===mode));
    control.disabled=draft.closed&&!waiting&&(key==='piece'||key==='add');
    if(key==='move')control.hidden=draft.points.length<2;
   }
   remove.disabled=selected<0||draft.points.length<3;remove.hidden=mode!=='move'||waiting;
   loop.hidden=draft.points.length<3;
   railSection.hidden=mode!=='move'||draft.points.length<2;
   const height=draft.points[selected]?.y||0;
   const base=tipHeight();
   const next=Math.max(0,Math.min(MAX_ROAD_HEIGHT,base+grade*ROAD_HEIGHT_STEP));
   grades.hidden=mode!=='piece';
   startControls.hidden=!drawingMode()||!!draft.points.length;
   flipArc.hidden=mode!=='add';flipArc.setAttribute('aria-pressed',String(arcSide<0));
   ends.hidden=!draft.points.length||draft.closed||!drawingMode()||waiting;
   for(const [value,control] of endButtons)control.setAttribute('aria-pressed',String(value===fromStart));
   heightTools.hidden=mode!=='move'||waiting;
   startDown.disabled=startHeight<=0;startUp.disabled=startHeight>=MAX_ROAD_HEIGHT;
   for(const [value,control] of gradeButtons){
    control.disabled=value<0&&base<=0||value>0&&base>=MAX_ROAD_HEIGHT;
    control.setAttribute('aria-pressed',String(value===grade));
   }
   pieceHeight.textContent=`高さ ${Number(base.toFixed(1))} → ${Number(next.toFixed(1))}m`;
   heightLabel.textContent=selected<0?'てんをえらぶと高さをかえられるよ':`てん ${selected+1} の高さ ${height}m`;
   lower.disabled=selected<0||height<=0;raise.disabled=selected<0||height>=MAX_ROAD_HEIGHT;
   const text=waiting&&drawingMode()?'次に道を引きたい場所から、指をすべらせよう':
    mode==='piece'?'タップで１つ、なぞると連続でおけるよ':mode==='move'?'点をドラッグでうごかす':'指をすべらせて、半円のおわりをえらぼう';
   if(help.textContent!==text)help.textContent=text;
   view.showDraft(waiting?null:draft,selected,!!pointer?.before);
  }
  function moveHandle(ground){
   if(!ground||pointer.index<0)return;
   const {grab,origin,index}=pointer;
   if(ground.pointerEvent&&origin.y)ground=pointerAtHeight(ground.pointerEvent,origin.y)||ground;
   if(!pointer.dragged&&Math.hypot(ground.x-grab.x,ground.z-grab.z)<.45)return;
   pointer.dragged=true;
   const target={x:origin.x+ground.x-grab.x,z:origin.z+ground.z-grab.z};
   const project=getProject(),join=findConnection(target,origin.y||0),point=join?{x:join.x,y:join.y,z:join.z}:roadPoint(target,project);
   if(point&&!join&&origin.y!==undefined)point.y=origin.y;
   if(point&&origin.corner)point.corner=origin.corner;
   showGuide(target,point,join);
   if(!point)return;
   const from=draft.points[index];if(from.x===point.x&&from.z===point.z&&(from.y||0)===(point.y||0))return;
   const points=draft.points.map((item,i)=>i===index?point:item);
   if(!roadPointsFit(points,draft.closed))return;
   pointer.before??=structuredClone(draft);draft.points=points;refresh();
  }
  function findConnection(target,height){const p=getProject();return roadConnection((p.roads||[]).filter(road=>road.id!==draft.id),target,height,p);}
  function showGuide(target,point,connection){view.showSnap(connection?[connection]:roadGridSites(target,getProject()),connection||point);}
  function drawPointer(kind,id,ground,canceled,nextStroke=null){
   if(pointer&&pointer.id!==id)return kind==='start';
   if(kind==='end'&&!pointer)return false;
   const base=tipHeight();
   const arc=mode==='add';
   const height=pointer?.height??(!arc&&draft.points.length?Math.max(0,Math.min(MAX_ROAD_HEIGHT,base+grade*ROAD_HEIGHT_STEP)):base);
   const event=ground?.pointerEvent;
   const onStage=!event||isOnStage(event);
   let target=onStage?(event&&height?pointerAtHeight(event,height):ground):null;
   const project=getProject();
   const connections=(project.roads||[]).filter(road=>road.id!==draft.id);
   let attachment=nextStroke?.attachment??null;
   if(!pointer&&!draft.points.length&&onStage){
    const hit=event&&!heightChosen?pickRoad(event):null;
    attachment??=roadStartConnection(connections,target,base,project,hit);
   }
   if(attachment&&event&&attachment.y!==height)target=pointerAtHeight(event,attachment.y)||target;
   const anchor=roadPoint(target,project);
   if(kind==='start'){
    if(!target||!anchor&&!attachment)return true;
    const start=draft.points.length?null:(attachment||{...anchor,y:base});
    pointer={id,start,attachment,height:start?.y??height,grab:target,event,nextStroke,dragged:false,lockedSector:null};
   }
   const start=pointer?.start||(!draft.points.length&&(attachment||anchor&&{...anchor,y:base}));
   const grab=pointer?.grab;
   const delta=grab&&target?{x:target.x-grab.x,z:target.z-grab.z}:null;
   let sector=null;
   if(pointer&&delta&&event&&pointer.event){
    pointer.dragged||=Math.hypot(event.clientX-pointer.event.clientX,event.clientY-pointer.event.clientY)>=6&&Math.hypot(delta.x,delta.z)>=.5;
    if(pointer.dragged&&!arc){
     const aim=roadStrokeAim(draft.width,delta,pointer.lockedSector);
     sector=aim.sector;pointer.lockedSector=aim.lockedSector;
    }
   }
   const options={start,height:base,grade,connections};
   const road=drawingRoad();
   let placement=null;
   if(!canceled&&arc&&pointer?.dragged&&delta){
    const origin=road.points.at(-1)||start;
    const aim={x:origin.x+delta.x,z:origin.z+delta.z};
    placement=roadArcPlacement(road,aim,project,{...options,side:arcSide});
   }else if(!canceled&&!arc){
    placement=pointer?.dragged?sector!==null&&roadStrokePlacement(road,delta,sector,project,options):
     !pointer?.nextStroke?.requireSlide&&target&&(anchor||start)&&roadPiecePlacement(road,start||target,project,options);
   }
   if(kind==='end'){
    if(placement){
     draft=withDrawnPoints(placement.points,placement.closed);selected=-1;waiting=true;
     commit();
     if(!arc&&(placement.end.y<=0&&grade<0||placement.end.y>=MAX_ROAD_HEIGHT&&grade>0))grade=0;
    }else if(!canceled&&arc&&pointer.dragged&&anchor){
     toast(draft.points.length>=MAX_ROAD_POINTS-2?'この道はこれ以上のばせないよ':'半円がおけるように、指を動かすきょりや向きを変えよう');
    }else if(!canceled&&anchor&&pointer&&draft.points.length>=MAX_ROAD_POINTS)toast('この道はこれ以上のばせないよ。つぎの道をつくろう。');
    if(!placement)restoreUnplacedStroke(pointer.nextStroke);
    pointer=null;view.showSnap([],null);refresh();return true;
   }
   let preview=placement?withDrawnPoints(placement.points,placement.closed):draft;
   if(arc&&placement&&!placement.closed)preview=alignRoadEndpoints([preview,...connections],project)[0];
   view.showDraft(preview,placement&&fromStart?0:selected,true);
   const snappedStart=pointer?.attachment||attachment;
   const guide=placement?.end||(arc?(road.points.at(-1)||start):null);
   const guides=guide&&guide!==snappedStart?[snappedStart,guide].filter(Boolean):[snappedStart||guide].filter(Boolean);
   view.showSnap(guides,guide||snappedStart);
   return true;
  }
  function restoreUnplacedStroke(stroke){
   if(stroke?.before)({draft,fromStart,startHeight,heightChosen}=stroke.before);
  }
  function beginNextStroke(id,ground,canceled){
   const event=ground?.pointerEvent;
   if(!event||!isOnStage(event))return false;
   const hit=pickRoad(event),point=hit?.point||ground;
   const before={draft,fromStart,startHeight,heightChosen};
   if(!draft.closed&&(!hit||hit.id===draft.id)){
    const [first,last]=[draft.points[0],draft.points.at(-1)].map(end=>
     Math.hypot(end.x-point.x,(end.y||0)-(point.y||0),end.z-point.z));
    if(Math.min(first,last)<=Math.max(3,draft.width*.42)){
     fromStart=first<last;
     const result=drawPointer('start',id,ground,canceled,{before,requireSlide:true});
     if(!pointer)restoreUnplacedStroke({before});
     return result;
    }
   }
   const project=getProject(),roads=project.roads||[];
   if(roads.length>=MAX_ROADS){toast('これ以上あたらしい道をおけないよ。ある道の端からのばそう');return true;}
   const source=hit&&roads.find(road=>road.id===hit.id);
   const attachment=source?nearestRoad([source],hit.point,.3):null;
   const {width,markings,sidewalk,barrier}=draft;
   draft={id:crypto.randomUUID(),width,markings,sidewalk,barrier,closed:false,points:[]};
   fromStart=false;startHeight=0;heightChosen=false;
   const result=drawPointer('start',id,ground,canceled,{before,attachment});
   if(!pointer)restoreUnplacedStroke({before});
   return result;
  }
  setStageRangePainter((kind,id,ground,canceled)=>{
   if(waiting){
    if(!drawingMode())return false;
    if(pointer)return drawPointer(kind,id,ground,canceled);
    return kind==='start'&&beginNextStroke(id,ground,canceled);
   }
   if(drawingMode())return drawPointer(kind,id,ground,canceled);
   if(kind==='start'){
    if(pointer)return true;
    const picked=ground?.pointerEvent?pickHandle(ground.pointerEvent):-1;
    selected=picked>=0?picked:ground?nearestRoadHandle(draft.points,ground):-1;
    if(selected<0){view.showSnap([],null);refresh();return false;}
    const origin=draft.points[selected];
    const grab=origin?.y&&ground?.pointerEvent?pointerAtHeight(ground.pointerEvent,origin.y)||ground:ground;
    pointer={id,index:selected,origin,grab,before:null,dragged:false};
    view.showSnap([],null);refresh();return true;
   }
   if(pointer?.id!==id)return false;
   if(kind!=='end'){moveHandle(ground);return true;}
   if(!canceled)moveHandle(ground);
   if(pointer.before){if(canceled)draft=pointer.before;else commit();}
   pointer=null;view.showSnap([],null);refresh();return true;
  });
  focusRoad();refresh();panel.focus({preventScroll:true});
 }
 return {
  editAt(event,objectDistance=Infinity){
   const hit=pickRoad(event);
   const road=hit&&hit.distance<objectDistance&&(getProject().roads||[]).find(item=>item.id===hit.id);
   if(!road)return false;
   openEditor(road,hit.point);return true;
  },
  refresh(){if(!$('#city-roads3').hidden)refreshMenu();}
 };
}
