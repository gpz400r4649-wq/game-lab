import {MAX_ROADS,MAX_ROAD_POINTS,ROAD_WIDTHS,roadPoint,roadPointsFit,validRoads} from './road3d.js?v=20261118m';
import {mountLiveRangeEditor} from './range-panel3d.js?v=20261118m';
import {setStageRangePainter} from './stage-range3d.js?v=20261118m';

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
  let draft=structuredClone(original),selected=-1,pointer=null,cameraMode=false,returnToList=false,cameraRestore=null;
  const history=[];
  const panel=document.createElement('section'),heading=document.createElement('div'),title=document.createElement('h2'),controls=document.createElement('div');
  panel.className='range-live-panel';heading.className='range-live-heading';controls.className='stage-range-tools road-editor-tools';
  title.textContent='どうろをひく';heading.append(title);panel.append(heading,controls);
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
  const camera=button('カメラをうごかす',()=>{cameraMode=!cameraMode;refresh();});
  const done=button('できた',()=>{
   if(!validRoads([draft],getProject()))return;
   const project=getProject(),roads=project.roads||[];
   const next=roads.some(road=>road.id===draft.id)?roads.map(road=>road.id===draft.id?draft:road):[...roads,draft];
   if(!validRoads(next,project))return;
   project.roads=next;save();rebuild();returnToList=true;finish();
  },'primary');
  const cancel=button('やめる',()=>{returnToList=true;finish();});
  const help=document.createElement('span');help.className='road-editor-hint';help.setAttribute('role','status');
  controls.append(widthChoices,loop,undo,remove,camera,done,cancel,help);
  const finish=mountLiveRangeEditor(panel,()=>{
   setStageRangePainter(null);view.showDraft(null);cameraRestore?.();
   if(returnToList){renderList();dialog.showModal();}
  },{showDetails:false});
  function remember(snapshot=draft){history.push(structuredClone(snapshot));if(history.length>40)history.shift();}
  function refresh(){
   widths.forEach((control,index)=>control.setAttribute('aria-pressed',String(draft.width===ROAD_WIDTHS[index])));
   loop.setAttribute('aria-pressed',String(draft.closed));camera.setAttribute('aria-pressed',String(cameraMode));
   loop.disabled=draft.points.length<3;undo.disabled=!history.length;remove.disabled=selected<0;
   done.disabled=!validRoads([draft],getProject());
   const text=cameraMode?'ドラッグやスティックでカメラをうごかそう':selected>=0?'えらんだてんはドラッグでうごかせるよ':'みちがとおるばしょをタップしよう';
   if(help.textContent!==text)help.textContent=text;
   view.showDraft(draft,selected);
  }
  setStageRangePainter((kind,id,ground)=>{
   if(kind==='end'){
    if(pointer?.id!==id)return false;
    if(pointer.before){remember(pointer.before);refresh();}pointer=null;return true;
   }
   if(kind==='move'&&pointer?.id!==id)return false;
   if(kind==='start'){
    if(cameraMode)return false;
    if(pointer)return true;
    pointer={id,index:-1,before:null};
   }
   const point=roadPoint(ground,getProject());if(!point)return true;
   if(kind==='start'){
    selected=draft.points.findIndex(existing=>Math.hypot(existing.x-point.x,existing.z-point.z)<1.8);
    pointer.index=selected;
    if(selected>=0){refresh();return true;}
    if(draft.points.length>=MAX_ROAD_POINTS){toast('てんは64こまでおけるよ');return true;}
    const points=[...draft.points,point];
    if(!roadPointsFit(points,draft.closed)){toast('てんをすこしはなしておこう');return true;}
    remember();draft.points=points;refresh();
   }else if(pointer.index>=0){
    const from=draft.points[pointer.index];if(from.x===point.x&&from.z===point.z)return true;
    const points=draft.points.map((item,index)=>index===pointer.index?point:item);
    if(roadPointsFit(points,draft.closed)){
     pointer.before??=structuredClone(draft);draft.points=points;refresh();
    }
   }
   return true;
  });
  cameraRestore=focusRoad(draft.points);refresh();
 }
}
