import {MAX_ROADS,MAX_ROAD_POINTS,ROAD_WIDTHS,roadPoint,roadGridSites,nearestRoadHandle,roadPointsFit,validRoads} from './road3d.js?v=20261119a';
import {mountLiveRangeEditor} from './range-panel3d.js?v=20261119a';
import {setStageRangePainter} from './stage-range3d.js?v=20261119a';

export function createRoadEditor({$,getProject,save,rebuild,view,focusRoad,toast}){
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
   const remove=button('けす',()=>{getProject().roads=roads.filter(item=>item.id!==road.id);save();rebuild();renderList();toast('どうろをけしたよ。もどすでもとにもどせるよ');});
   remove.setAttribute('aria-label',`${label}をけす`);row.append(edit,remove);list.append(row);
  });
 }
 $('#road-open3').onclick=()=>{renderList();dialog.showModal();};
 add.onclick=()=>openEditor({id:crypto.randomUUID(),width:8,closed:false,points:[]});

 function openEditor(original){
  dialog.close();
  let draft=structuredClone(original),selected=-1,pointer=null,mode=original.points.length?'move':'add',returnToList=false,cameraRestore=null;
  const history=[];
  const panel=document.createElement('section'),heading=document.createElement('div'),title=document.createElement('h2'),controls=document.createElement('div');
  panel.className='range-live-panel';heading.className='range-live-heading';controls.className='stage-range-tools road-editor-tools';
  title.textContent=original.points.length?'どうろをなおす':'どうろをひく';heading.append(title);panel.append(heading,controls);
  const widthChoices=document.createElement('div');widthChoices.className='road-width-choices';widthChoices.setAttribute('role','group');widthChoices.setAttribute('aria-label','みちのはば');
  const widths=ROAD_WIDTHS.map((width,index)=>{
   const control=button(['せまい','ふつう','ひろい'][index],()=>{
    if(draft.width!==width){remember();draft.width=width;refresh();}
   });widthChoices.append(control);return control;
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
  const modes=[['add','てんをたす'],['move','てんをうごかす'],['camera','カメラをうごかす']].map(([key,label])=>[key,button(label,()=>{
   mode=key;view.showSnap([],null);refresh();
  })]);
  const done=button('できた',()=>{
   if(!validRoads([draft],getProject()))return;
   const project=getProject(),roads=project.roads||[];
   const next=roads.some(road=>road.id===draft.id)?roads.map(road=>road.id===draft.id?draft:road):[...roads,draft];
   if(!validRoads(next,project))return;
   project.roads=next;save();rebuild();returnToList=true;finish();
  },'primary');
  const cancel=button('やめる',()=>{returnToList=true;finish();});
  const help=document.createElement('span');help.className='road-editor-hint';help.setAttribute('role','status');
  controls.append(widthChoices,...modes.map(([,control])=>control),loop,undo,remove,done,cancel,help);
  const finish=mountLiveRangeEditor(panel,()=>{
   setStageRangePainter(null);view.showDraft(null);view.showSnap([],null);cameraRestore?.();
   if(returnToList){renderList();dialog.showModal();}
  },{showDetails:false});
  function remember(snapshot=draft){history.push(structuredClone(snapshot));if(history.length>40)history.shift();}
  function refresh(){
   widths.forEach((control,index)=>control.setAttribute('aria-pressed',String(draft.width===ROAD_WIDTHS[index])));
   loop.setAttribute('aria-pressed',String(draft.closed));
   for(const [key,control] of modes)control.setAttribute('aria-pressed',String(key===mode));
   loop.disabled=draft.points.length<3;undo.disabled=!history.length;remove.disabled=selected<0;
   done.disabled=!validRoads([draft],getProject());
   const text=mode==='camera'?'ドラッグでカメラをうごかそう':mode==='move'?'うごかしたいてんをドラッグしよう':'１マスの９つのてんからえらぼう';
   if(help.textContent!==text)help.textContent=text;
   view.showDraft(draft,selected);
  }
  function moveHandle(ground){
   if(!ground||pointer.index<0)return;
   const {grab,origin,index}=pointer;
   if(!pointer.dragged&&Math.hypot(ground.x-grab.x,ground.z-grab.z)<.45)return;
   pointer.dragged=true;
   const target={x:origin.x+ground.x-grab.x,z:origin.z+ground.z-grab.z};
   const project=getProject(),point=roadPoint(target,project);
   view.showSnap(roadGridSites(target,project),point);
   if(!point)return;
   const from=draft.points[index];if(from.x===point.x&&from.z===point.z)return;
   const points=draft.points.map((item,i)=>i===index?point:item);
   if(!roadPointsFit(points,draft.closed))return;
   pointer.before??=structuredClone(draft);draft.points=points;refresh();
  }
  setStageRangePainter((kind,id,ground,canceled)=>{
   if(kind==='end'){
    if(pointer?.id!==id)return false;
    if(!canceled)moveHandle(ground);
    if(pointer.before){if(canceled)draft=pointer.before;else remember(pointer.before);refresh();}
    pointer=null;return true;
   }
   if(mode==='camera')return false;
   if(kind==='move'&&pointer){if(pointer.id!==id)return false;moveHandle(ground);return true;}
   if(kind==='start'){
    if(pointer)return true;
    pointer={id,index:-1,grab:ground,before:null,dragged:false};
   }
   const project=getProject(),point=roadPoint(ground,project);
   if(mode==='add')view.showSnap(roadGridSites(ground,project),point);
   if(!point||kind!=='start')return !!pointer;
   selected=mode==='move'?nearestRoadHandle(draft.points,ground):draft.points.findIndex(existing=>existing.x===point.x&&existing.z===point.z);
   if(selected<0&&mode==='add')selected=nearestRoadHandle(draft.points,ground,1);
   if(selected>=0){pointer.index=selected;pointer.origin=draft.points[selected];refresh();return true;}
   if(mode==='move'){refresh();return true;}
   if(draft.points.length>=MAX_ROAD_POINTS){toast('てんは64こまでおけるよ');return true;}
   const points=[...draft.points,point];
   if(!roadPointsFit(points,draft.closed)){toast('てんをすこしはなしておこう');return true;}
   remember();draft.points=points;refresh();return true;
  });
  cameraRestore=focusRoad(draft.points);refresh();
 }
}
