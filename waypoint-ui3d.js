import {mountLiveRangeEditor} from './range-panel3d.js?v=20261111u';
import {setStageRangePainter} from './stage-range3d.js?v=20261111u';
import {worldSize,coordinateLimit} from './world3d.js?v=20261111u';
import {validWaypoints,MAX_WAYPOINTS,placeAtRouteStart} from './patrol-route3d.js?v=20261111u';
import {setReadingText} from './readings3d.js?v=20261111u';
export function openWaypointEditor(o,{getProject,save,rebuild,lookFromAbove,preview,onClose}){
 const panel=document.createElement('section'),heading=document.createElement('div'),title=document.createElement('h2'),close=document.createElement('button'),note=document.createElement('p'),toolbar=document.createElement('div'),list=document.createElement('div'),status=document.createElement('p');panel.className='range-live-panel';panel.setAttribute('role','region');panel.setAttribute('aria-label','コースをつくる');heading.className='range-live-heading';title.tabIndex=-1;setReadingText(title,'コースをつくる');setReadingText(close,'できた・設定にもどる');close.className='primary';heading.append(title,close);setReadingText(note,'通る場所を順番にタップしよう。①→②→③と線にそって歩くよ。最大16か所。壁があると止まるよ。');toolbar.className='stage-range-tools';list.className='stage-range-tools';
 let draft=structuredClone(o.waypoints||[]),selected=-1,camera=false,pointer=null;
 function persist(){if(validWaypoints(draft,coordinateLimit(getProject()))){o.waypoints=structuredClone(draft);placeAtRouteStart(o,o.waypoints);save();rebuild();}}
 function refresh(){setReadingText(status,camera?'カメラを動かして、通る場所を見よう。':selected>=0?`${selected+1}番の新しい場所をタップしよう。`:`次は${draft.length+1}番。２か所以上で保存するよ（${draft.length}/16）。`);list.replaceChildren();draft.forEach((p,i)=>{const b=document.createElement('button');setReadingText(b,`${i+1}：X ${p.x} / Z ${p.z}`);b.setAttribute('aria-pressed',String(selected===i&&!camera));b.onclick=()=>{selected=i;camera=false;refresh();};list.append(b);});add.setAttribute('aria-pressed',String(selected<0&&!camera));cam.setAttribute('aria-pressed',String(camera));preview?.(draft);}
 const add=document.createElement('button'),cam=document.createElement('button'),undo=document.createElement('button'),clear=document.createElement('button'),top=document.createElement('button');
 setReadingText(add,'通る場所を足す');add.onclick=()=>{selected=-1;camera=false;refresh();};setReadingText(cam,'カメラを回す');cam.onclick=()=>{camera=true;refresh();};setReadingText(undo,'最後の１か所をもどす');undo.onclick=()=>{draft.pop();selected=-1;persist();refresh();};setReadingText(clear,'はじめから並べ直す');clear.onclick=()=>{draft=[];selected=-1;camera=false;refresh();};top.className='range-top-action';setReadingText(top,'↑ 上から見る');top.onclick=()=>lookFromAbove?.();toolbar.append(add,cam);panel.append(heading,note,toolbar,status,top,list,undo,clear);
 const finish=mountLiveRangeEditor(panel,()=>{setStageRangePainter(null);preview?.(o.waypoints);onClose?.();});close.onclick=finish;
 setStageRangePainter((kind,id,point)=>{if(kind==='end'){if(pointer!==id)return false;pointer=null;return true;}if(kind!=='start')return pointer===id;if(camera)return false;if(pointer!==null)return true;pointer=id;
 const p=getProject(),limit=coordinateLimit(p);if(!point||Math.abs(point.x)>worldSize(p)/2||Math.abs(point.z)>worldSize(p)/2)return true;
 const place={x:Math.max(-limit,Math.min(limit,Math.round(point.x/4)*4)),z:Math.max(-limit,Math.min(limit,Math.round(point.z/4)*4))},candidate=structuredClone(draft);if(selected>=0)candidate[selected]=place;else candidate.push(place);
 if(candidate.length>MAX_WAYPOINTS){setReadingText(status,'通る場所は16か所まで。番号をえらぶと場所を変えられるよ。');return true;}if(candidate.length>=2&&!validWaypoints(candidate,limit)){setReadingText(status,'前後の番号とは違う場所をえらぼう。');return true;}
 draft=candidate;selected=-1;persist();refresh();return true;
 });lookFromAbove?.();refresh();title.focus({preventScroll:true});
}
