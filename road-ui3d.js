import {updateRoadGateWidths} from './race3d.js?v=20261119x';
import {MAX_ROADS,MAX_ROAD_POINTS,MAX_ROAD_HEIGHT,ROAD_HEIGHT_STEP,ROAD_WIDTHS,roadPoint,roadGridSites,nearestRoadHandle,roadPointsFit,traceRoadPoints,validRoads} from './road3d.js?v=20261120c';
import {mountLiveRangeEditor} from './range-panel3d.js?v=20261119d';
import {setStageRangePainter} from './stage-range3d.js?v=20261119d';

export function createRoadEditor({$,getProject,save,rebuild,view,focusRoad,pickHandle,pointerAtHeight,focusHeight,toast}){
 const dialog=$('#road-dialog3'),list=$('#road-list3'),add=$('#road-add3');
 function button(text,onclick,className=''){
  const element=document.createElement('button');element.type='button';element.textContent=text;element.onclick=onclick;element.className=className;
  return element;
 }
 function renderList(){
  const roads=getProject().roads||[];list.replaceChildren();add.disabled=roads.length>=MAX_ROADS;
  if(!roads.length){const message=document.createElement('p');message.textContent='まだどうろがないよ。みちをひいてみよう。';list.append(message);}
  roads.forEach((road,index)=>{
   const row=document.createElement('div');row.className='road-list-row';
   const label=`どうろ ${index+1}`;
   const edit=button(`${label}をなおす`,()=>openEditor(road));
   const remove=button('けす',()=>{applyRoads(roads.filter(item=>item.id!==road.id));renderList();toast('どうろをけしたよ。もどすでもとにもどせるよ');});
   remove.setAttribute('aria-label',`${label}をけす`);row.append(edit,remove);list.append(row);
  });
 }
 $('#road-open3').onclick=()=>{renderList();dialog.showModal();};
 add.onclick=()=>openEditor({id:crypto.randomUUID(),width:8,closed:false,points:[]});

 function applyRoads(next){
  const project=getProject();
  project.objects=updateRoadGateWidths(project.objects,project.roads||[],next);
  project.roads=next;save();rebuild();
 }
 function openEditor(original){
  dialog.close();
  let draft=structuredClone(original),selected=-1,pointer=null,mode=original.points.length?'move':'add',returnToList=false,cameraRestore=null;
  let traceFrame=null;
  const history=[];
  const panel=document.createElement('section'),heading=document.createElement('div'),title=document.createElement('h2'),controls=document.createElement('div');
  panel.className='range-live-panel';heading.className='range-live-heading';controls.className='stage-range-tools road-editor-tools';
  title.textContent=original.points.length?'どうろをなおす':'どうろをひく';heading.append(title);panel.append(heading,controls);
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
  const modes=[['add','ひく・てんをたす'],['move','てんをうごかす'],['camera','カメラをうごかす']].map(([key,label])=>[key,button(label,()=>{
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
  const heightTools=document.createElement('div'),heightLabel=document.createElement('span');
  heightTools.className='road-height-tools';heightTools.setAttribute('role','group');heightTools.setAttribute('aria-label','てんのたかさ');
  heightLabel.setAttribute('aria-live','polite');
  const lower=button('− さげる',()=>changeHeight(-ROAD_HEIGHT_STEP));
  const raise=button('＋ あげる',()=>changeHeight(ROAD_HEIGHT_STEP));
  heightTools.append(heightLabel,lower,raise);
  const help=document.createElement('span');help.className='road-editor-hint';help.setAttribute('role','status');
  controls.append(widthChoices,...modes.map(([,control])=>control),loop,undo,remove,done,cancel,heightTools,barrier.box,markings.box,help);
  const finish=mountLiveRangeEditor(panel,()=>{
   setStageRangePainter(null);stopTracePreview();view.showDraft(null);view.showSnap([],null);cameraRestore?.();
   if(returnToList){renderList();dialog.showModal();}
  },{showDetails:false});
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
   barrier.sync();markings.sync();
   loop.setAttribute('aria-pressed',String(draft.closed));
   for(const [key,control] of modes)control.setAttribute('aria-pressed',String(key===mode));
   loop.disabled=draft.points.length<3;undo.disabled=!history.length;remove.disabled=selected<0;
   done.disabled=!validRoads([draft],getProject());
   const height=draft.points[selected]?.y||0;
   heightLabel.textContent=selected<0?'てんをえらぶと高さをかえられるよ':`てん ${selected+1} の高さ ${height}m`;
   lower.disabled=selected<0||height<=0;raise.disabled=selected<0||height>=MAX_ROAD_HEIGHT;
   const text=mode==='camera'?'ドラッグでカメラをうごかそう':mode==='move'?'うごかしたいてんをドラッグしよう':'ステージをなぞってどうろをひこう。タップでてんをおけるよ。';
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
   const project=getProject(),point=roadPoint(target,project);
   if(point&&origin.y!==undefined)point.y=origin.y;
   view.showSnap(roadGridSites(target,project),point);
   if(!point)return;
   const from=draft.points[index];if(from.x===point.x&&from.z===point.z)return;
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
  function tracePoints(){
   const {samples,tip}=pointer.trace;
   return traceRoadPoints(draft,[...samples,tip],getProject());
  }
  function extendTrace(ground){
   const target=traceGround(ground),project=getProject();
   if(!roadPoint(target,project))return;
   const trace=pointer.trace,last=trace.samples.at(-1);
   trace.tip={x:target.x,z:target.z};
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
    view.showSnap([],null);
    view.showDraft({...draft,points:tracePoints()},-1);
   });
  }
  function finishTrace(ground,canceled){
   if(!canceled)extendTrace(ground);
   stopTracePreview();
   if(!canceled&&(pointer.dragged||pointer.index<0)){
    const points=pointer.dragged?tracePoints():traceRoadPoints(draft,pointer.trace.samples,getProject());
    if(points!==draft.points){remember();draft.points=points;selected=points.length-1;}
   }
   view.showSnap([],null);refresh();
  }
  setStageRangePainter((kind,id,ground,canceled)=>{
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
   if(point&&lastHeight)point.y=lastHeight;
   if(mode==='add')view.showSnap(roadGridSites(target,project),point);
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
   pointer.index=selected;pointer.trace={samples:[{x:start.x,z:start.z}],tip:{x:start.x,z:start.z}};
   refresh();return true;
  });
  cameraRestore=focusRoad(draft.points);refresh();
 }
}
