import {updateRoadGateWidths} from './race3d.js?v=20261125a';
import {MAX_ROADS,MAX_ROAD_POINTS,MAX_ROAD_HEIGHT,ROAD_HEIGHT_STEP,ROAD_WIDTHS,roadPoint,roadGridSites,roadConnection,nearestRoadHandle,roadPiecePlacement,roadPointsFit,traceRoadPoints,validRoads} from './road3d.js?v=20261125a';
import {mountLiveRangeEditor} from './range-panel3d.js?v=20261124a';
import {setStageRangePainter} from './stage-range3d.js?v=20261124a';
import {refitTownParts} from './town3d.js?v=20261125a';

export function createRoadEditor({$,getProject,save,rebuild,view,focusRoad,pickHandle,pointerAtHeight,isOnStage,focusHeight,setRoadView,toast}){
 const bar=$('#city-build3'),list=$('#road-list3'),presets=$('#road-presets3'),host=$('#road-draft3');
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
 let listedRoads;
 const roadTools=[
  ['ふつうの道',{width:8,markings:'street'}],
  ['歩道つき',{width:8,markings:'street',sidewalk:'both'}],
  ['広い道',{width:12,markings:'street'}],
  ['せまい道',{width:4,markings:'street'}],
  ['レース用',{width:8}]
 ];
 function button(text,onclick,className=''){
  const element=document.createElement('button');element.type='button';element.textContent=text;element.onclick=onclick;element.className=className;
  return element;
 }
 function renderList(){
  const current=getProject().roads;
  if(current===listedRoads&&list.childElementCount)return;
  listedRoads=current;
  const roads=current||[];list.replaceChildren();list.hidden=!roads.length;
  for(const control of presets.children)control.disabled=roads.length>=MAX_ROADS;
  roads.forEach((road,index)=>{
   list.append(button(`道 ${index+1} をなおす`,()=>openEditor(road)));
  });
 }
 for(const [label,style] of roadTools)presets.append(button(label,()=>{
  if((getProject().roads||[]).length>=MAX_ROADS)return;
  openEditor({id:crypto.randomUUID(),closed:false,points:[],...style});
 }));
 function showCategory(id){
  for(const category of categories){
   const active=category.dataset.cityPanel===id;
   category.setAttribute('aria-expanded',String(active));
   $('#'+category.dataset.cityPanel).hidden=!active;
  }
  if(id==='city-roads3')renderList();
 }
 for(const category of categories)category.onclick=()=>{
  if(!host.hidden)return;
  const id=category.getAttribute('aria-expanded')==='true'?null:category.dataset.cityPanel;
  if(id)$('[data-editor-tool][data-part=select]').click();
  showCategory(id);
 };
 bar.hidden=false;

 function applyRoads(next){
  const project=getProject();
  project.objects=refitTownParts(updateRoadGateWidths(project.objects,project.roads||[],next),next,project);
  project.roads=next;save();rebuild();
 }
 function openEditor(original){
  showCategory(null);
  for(const category of categories)category.disabled=true;
  let draft=structuredClone(original),selected=-1,pointer=null,mode=original.points.length?'move':'piece',returnToList=false,cameraRestore=null;
  let traceFrame=null,straight=false,grade=0,startHeight=0,angled=false;
  const history=[];
  const panel=document.createElement('section'),heading=document.createElement('div'),title=document.createElement('h2'),controls=document.createElement('div');
  panel.className='range-live-panel';heading.className='range-live-heading';controls.className='stage-range-tools road-editor-tools';
  title.textContent=original.points.length?'どうろをなおす':'どうろをひく';title.tabIndex=-1;heading.append(title);panel.append(heading,controls);
  const widthChoices=document.createElement('div');widthChoices.className='road-width-choices';widthChoices.setAttribute('role','group');widthChoices.setAttribute('aria-label','みちのはば');
  const widths=ROAD_WIDTHS.map((width,index)=>{
   const label=['せまい','ふつう','ひろい','もっとひろい'][index];
   const control=button(`${label} ${width}m`,()=>{
    if(draft.width!==width){remember();draft.width=width;refresh();}
   });widthChoices.append(control);return control;
  });
  function styleChoices(key,caption,choices){
   const box=document.createElement('div'),label=document.createElement('span');
   box.className='road-style-choices';box.setAttribute('role','group');box.setAttribute('aria-label',caption);
   label.textContent=caption;box.append(label);
   const buttons=choices.map(([value,text])=>{
    const control=button(text,()=>{
     if(draft[key]===value)return;
     remember();
     if(value===undefined)delete draft[key];else draft[key]=value;
     refresh();
    });
    box.append(control);return [value,control];
   });
   return {box,sync(){for(const [value,control] of buttons)control.setAttribute('aria-pressed',String(draft[key]===value));}};
  }
  const barrier=styleChoices('barrier','さく',[[undefined,'なし'],['mini','ミニよんく'],['highway','こうそくどうろ'],['guardrail','ガードレール']]);
  const markings=styleChoices('markings','どうろの線',[[undefined,'レース'],['street','ふつうのどうろ']]);
  const sidewalk=styleChoices('sidewalk','ほどう',[[undefined,'なし'],['left','ひだり'],['right','みぎ'],['both','りょうがわ']]);
  const drawing=document.createElement('div');drawing.className='road-style-choices';drawing.setAttribute('role','group');drawing.setAttribute('aria-label','道のひきかた');
  const drawingButtons=[[false,'カーブ'],[true,'まっすぐ']].map(([value,label])=>{
   const control=button(label,()=>{if(pointer)return;straight=value;mode='add';refresh();});drawing.append(control);return [value,control];
  });
  const loop=button('つないで１しゅう',()=>{
   if(!draft.closed&&!roadPointsFit(draft.points,true)){toast('はじめとおわりをすこしはなして、３かしょいじょうえらぼう');return;}
   remember();draft.closed=!draft.closed;refresh();
  });
  const undo=button('↶ もどす',()=>{draft=history.pop();selected=-1;refresh();});
  const remove=button('てんをけす',()=>{
   if(selected<0)return;
   remember();draft.points.splice(selected,1);selected=-1;
   if(!roadPointsFit(draft.points,draft.closed))draft.closed=false;
   refresh();
  });
  const modes=[['piece','つないでおく'],['add','なぞる'],['move','てんをうごかす'],['camera','カメラをうごかす']].map(([key,label])=>[key,button(label,()=>{
   if(pointer)return;
   mode=key;view.showSnap([],null);refresh();
  })]);
  const done=button('できた',()=>{
   if(!validRoads([draft],getProject()))return;
   const project=getProject(),roads=project.roads||[];
   const next=roads.some(road=>road.id===draft.id)?roads.map(road=>road.id===draft.id?draft:road):[...roads,draft];
   if(!validRoads(next,project))return;
   applyRoads(next);returnToList=true;finish();
  },'primary');
  const cancel=button('やめる',()=>{returnToList=true;finish();});
  const deleteRoad=button('この道をけす',()=>{
   const project=getProject();
   applyRoads((project.roads||[]).filter(road=>road.id!==original.id));
   returnToList=true;finish();toast('どうろをけしたよ。もどすでもとにもどせるよ');
  });
  deleteRoad.hidden=!original.points.length;
  const heightTools=document.createElement('div'),heightLabel=document.createElement('span');
  heightTools.className='road-height-tools';heightTools.setAttribute('role','group');heightTools.setAttribute('aria-label','てんのたかさ');
  heightLabel.setAttribute('aria-live','polite');
  const lower=button('− さげる',()=>changeHeight(-ROAD_HEIGHT_STEP));
  const raise=button('＋ あげる',()=>changeHeight(ROAD_HEIGHT_STEP));
  heightTools.append(heightLabel,lower,raise);
  const grades=document.createElement('div'),pieceHeight=document.createElement('span'),startControls=document.createElement('div');
  grades.className='road-height-tools';grades.setAttribute('role','group');grades.setAttribute('aria-label','つぎの道');
  const gradeButtons=[[-1,'下る −1.5m'],[0,'平ら'],[1,'上る ＋1.5m']].map(([value,label])=>{
   const control=button(label,()=>{if(!pointer){grade=value;refresh();}});
   grades.append(control);return [value,control];
  });
  pieceHeight.setAttribute('aria-live','polite');grades.append(pieceHeight);
  startControls.className='road-height-tools';startControls.setAttribute('role','group');startControls.setAttribute('aria-label','はじめの高さ');
  const shiftStart=delta=>{
   if(pointer)return;
   startHeight=Math.max(0,Math.min(MAX_ROAD_HEIGHT,startHeight+delta));focusHeight?.(startHeight);refresh();
  };
  const startDown=button('はじめを −',()=>shiftStart(-ROAD_HEIGHT_STEP));
  const startUp=button('はじめを ＋',()=>shiftStart(ROAD_HEIGHT_STEP));
  startControls.append(startDown,startUp);
  const angle=button('ななめから見る',()=>{
   angled=!angled;setRoadView?.(angled);refresh();
  });
  const help=document.createElement('span');help.className='road-editor-hint';help.setAttribute('role','status');
  const details=document.createElement('details'),summary=document.createElement('summary'),settings=document.createElement('div');
  summary.textContent='こまかいせってい';settings.className='stage-range-tools';
  settings.append(widthChoices,heightTools,barrier.box,markings.box,sidewalk.box,deleteRoad);
  details.append(summary,settings);
  controls.append(...modes.map(([,control])=>control),drawing,grades,startControls,angle,loop,undo,remove,done,cancel);
  panel.append(details,help);
  const finish=mountLiveRangeEditor(panel,()=>{
   setStageRangePainter(null);stopTracePreview();view.showDraft(null);view.showSnap([],null);cameraRestore?.();
   for(const category of categories)category.disabled=false;
   if(returnToList)showCategory('city-roads3');
  },{host});
  function remember(snapshot=draft){history.push(structuredClone(snapshot));if(history.length>40)history.shift();}
  function changeHeight(delta){
   if(selected<0)return;
   const y=(draft.points[selected].y||0)+delta;
   if(y<0||y>MAX_ROAD_HEIGHT)return;
   const points=draft.points.map((point,index)=>index===selected?{...point,y}:point);
   if(!roadPointsFit(points,draft.closed)){toast('坂がきゅうすぎるよ。てんの間をひろげよう');return;}
   remember();draft.points=points;focusHeight?.(y);view.showSnap([],null);refresh();
  }
  function refresh(){
   widths.forEach((control,index)=>control.setAttribute('aria-pressed',String(draft.width===ROAD_WIDTHS[index])));
   barrier.sync();markings.sync();sidewalk.sync();
   for(const [value,control] of drawingButtons)control.setAttribute('aria-pressed',String(mode==='add'&&straight===value));
   loop.setAttribute('aria-pressed',String(draft.closed));
   for(const [key,control] of modes)control.setAttribute('aria-pressed',String(key===mode));
   loop.disabled=draft.points.length<3;undo.disabled=!history.length;remove.disabled=selected<0;
   done.disabled=!validRoads([draft],getProject());
   const height=draft.points[selected]?.y||0;
   const base=draft.points.at(-1)?.y??startHeight;
   const next=Math.max(0,Math.min(MAX_ROAD_HEIGHT,base+grade*ROAD_HEIGHT_STEP));
   drawing.hidden=mode!=='add';grades.hidden=mode!=='piece';startControls.hidden=mode!=='piece'||!!draft.points.length;
   startDown.disabled=startHeight<=0;startUp.disabled=startHeight>=MAX_ROAD_HEIGHT;
   for(const [value,control] of gradeButtons){
    control.disabled=value<0&&base<=0||value>0&&base>=MAX_ROAD_HEIGHT;
    control.setAttribute('aria-pressed',String(value===grade));
   }
   pieceHeight.textContent=`高さ ${Number(base.toFixed(1))} → ${Number(next.toFixed(1))}m`;
   angle.textContent=angled?'上から見る':'ななめから見る';
   heightLabel.textContent=selected<0?'てんをえらぶと高さをかえられるよ':`てん ${selected+1} の高さ ${height}m`;
   lower.disabled=selected<0||height<=0;raise.disabled=selected<0||height>=MAX_ROAD_HEIGHT;
   const text=mode==='piece'?(draft.closed?'１しゅうを外すと、道をつづけておけるよ。':draft.points.length?'つぎにのばす方をおして、はなそう。':'はじめの場所をおそう。指をずらすと向きをえらべるよ。'):mode==='camera'?'ドラッグでカメラをうごかそう':mode==='move'?'うごかしたいてんをドラッグしよう':'ステージをなぞってどうろをひこう。タップでてんをおけるよ。';
   if(help.textContent!==text)help.textContent=text;
   view.showDraft(draft,selected);
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
  function traceGround(ground){
   const height=draft.points.at(-1)?.y||0;
   return height&&ground?.pointerEvent?pointerAtHeight(ground.pointerEvent,height):ground;
  }
  function stopTracePreview(){
   if(traceFrame!==null)cancelAnimationFrame(traceFrame);
   traceFrame=null;
  }
  function findConnection(target,height){const p=getProject();return roadConnection((p.roads||[]).filter(road=>road.id!==draft.id),target,height,p);}
  function showGuide(target,point,connection){view.showSnap(connection?[connection]:roadGridSites(target,getProject()),connection||point);}
  function tracePoints(){
   const {samples,tip,first,last}=pointer.trace;
   return traceRoadPoints(draft,[...samples,tip],getProject(),{straight,first,last});
  }
  function extendTrace(ground){
   const target=traceGround(ground),project=getProject();
   if(!roadPoint(target,project))return;
   const trace=pointer.trace,last=trace.samples.at(-1);
   trace.tip={x:target.x,z:target.z};
   trace.last=findConnection(target,draft.points.at(-1)?.y||trace.first?.y||0);
   const start=trace.samples[0];
   const from=pointer.grab?.pointerEvent,to=ground?.pointerEvent;
   const movedOnScreen=!from||!to||Math.hypot(from.clientX-to.clientX,from.clientY-to.clientY)>=5;
   pointer.dragged||=movedOnScreen&&Math.hypot(start.x-target.x,start.z-target.z)>=1;
   if(!pointer.dragged)return;
   if(Math.hypot(last.x-target.x,last.z-target.z)>=1){
    // Bound the cost of long strokes without losing the start or the live end.
    if(trace.samples.length>=512)trace.samples=trace.samples.filter((_,i)=>i%2===0);
    trace.samples.push(trace.tip);
   }
   if(traceFrame===null)traceFrame=requestAnimationFrame(()=>{
    traceFrame=null;
    view.showSnap(trace.last?[trace.last]:[],trace.last);
    view.showDraft({...draft,points:tracePoints()},-1);
   });
  }
  function finishTrace(ground,canceled){
   if(!canceled)extendTrace(ground);
   stopTracePreview();
   if(!canceled&&(pointer.dragged||pointer.index<0)){
    const points=pointer.dragged?tracePoints():traceRoadPoints(draft,pointer.trace.samples,getProject(),{straight,first:pointer.trace.first});
    if(points!==draft.points){remember();draft.points=points;selected=points.length-1;}
   }
   view.showSnap([],null);refresh();
  }
  function piecePointer(kind,id,ground,canceled){
   if(pointer&&pointer.id!==id)return kind==='start';
   if(kind==='end'&&!pointer)return false;
   const base=draft.points.at(-1)?.y??startHeight;
   const height=draft.points.length?Math.max(0,Math.min(MAX_ROAD_HEIGHT,base+grade*ROAD_HEIGHT_STEP)):base;
   const event=ground?.pointerEvent;
   const target=event&&!isOnStage(event)?null:event&&height?pointerAtHeight(event,height):ground;
   const project=getProject();
   const anchor=roadPoint(target,project);
   if(kind==='start'){
    if(!anchor)return true;
    const start=draft.points.length?null:{...(findConnection(target,base)||anchor)};
    pointer={id,start,grab:target};
   }
   const start=pointer?.start||(!draft.points.length&&anchor&&(findConnection(target,base)||anchor));
   const grab=pointer?.grab;
   const aim=start&&target?{x:start.x+(grab?target.x-grab.x:0),z:start.z+(grab?target.z-grab.z:0)}:target;
   const placement=!canceled&&anchor&&roadPiecePlacement(draft,aim,project,{start,height:base,grade,
    connections:(project.roads||[]).filter(road=>road.id!==draft.id)});
   if(kind==='end'){
    if(placement){
     remember();draft.points=placement.points;selected=draft.points.length-1;
     if(placement.end.y<=0&&grade<0||placement.end.y>=MAX_ROAD_HEIGHT&&grade>0)grade=0;
     focusHeight?.(placement.end.y);
    }
    pointer=null;view.showSnap([],null);refresh();return true;
   }
   view.showDraft(placement?{...draft,points:placement.points}:draft,selected);
   view.showSnap(placement?[placement.end]:[],placement?.end);
   return true;
  }
  setStageRangePainter((kind,id,ground,canceled)=>{
   if(mode==='piece')return piecePointer(kind,id,ground,canceled);
   if(kind==='end'){
    if(pointer?.id!==id)return false;
    if(pointer.trace)finishTrace(ground,canceled);
    else{
     if(!canceled)moveHandle(ground);
     if(pointer.before){if(canceled)draft=pointer.before;else remember(pointer.before);refresh();}
    }
    pointer=null;return true;
   }
   if(mode==='camera')return false;
   if(kind==='move'&&pointer){if(pointer.id!==id)return false;if(pointer.trace)extendTrace(ground);else moveHandle(ground);return true;}
   if(kind==='start'){
    if(pointer)return true;
    pointer={id,index:-1,grab:ground,before:null,dragged:false};
   }
   const project=getProject(),target=mode==='add'?traceGround(ground):ground,point=roadPoint(target,project);
   const lastHeight=draft.points.at(-1)?.y||0;
   const join=mode==='add'?findConnection(target,lastHeight):null;
   if(point&&lastHeight)point.y=lastHeight;
   if(mode==='add')showGuide(target,point,join);
   if(!point||kind!=='start')return !!pointer;
   const picked=ground?.pointerEvent?pickHandle(ground.pointerEvent):-1;
   selected=picked>=0?picked:mode==='move'?nearestRoadHandle(draft.points,ground):draft.points.findIndex(existing=>existing.x===point.x&&existing.z===point.z);
   if(selected<0&&mode==='add')selected=nearestRoadHandle(draft.points,ground,1);
   const lastPoint=draft.points.length-1;
   if(selected>=0&&(mode==='move'||selected!==lastPoint||draft.closed)){
    pointer.index=selected;pointer.origin=draft.points[selected];
    if(ground.pointerEvent&&pointer.origin.y)pointer.grab=pointerAtHeight(ground.pointerEvent,pointer.origin.y)||ground;
    view.showSnap([],null);refresh();return true;
   }
   if(mode==='move'){refresh();return true;}
   if(draft.points.length>=MAX_ROAD_POINTS){toast('てんは64こまでおけるよ');refresh();return true;}
   const start=selected>=0?draft.points[selected]:target;
   pointer.index=selected;pointer.trace={samples:[{x:start.x,z:start.z}],tip:{x:start.x,z:start.z},first:selected<0?join:null,last:null};
   refresh();return true;
  });
  cameraRestore=focusRoad(draft.points);refresh();title.focus({preventScroll:true});
 }
 return {refresh(){if(!$('#city-roads3').hidden)renderList();}};
}
