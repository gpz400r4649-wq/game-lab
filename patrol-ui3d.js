import * as T from './vendor/three.module.min.js';
import {mountLiveRangeEditor} from './range-panel3d.js?v=20261104a';
import {setStageRangePainter} from './stage-range3d.js?v=20261104a';
import {worldSize,coordinateLimit} from './world3d.js?v=20261104a';
import {validPatrolRoute} from './patrol-route3d.js?v=20261104a';
import {setReadingText} from './readings3d.js?v=20261104a';
export function createPatrolOverlay(scene){
 const group=new T.Group(),material=new T.MeshBasicMaterial({color:0x399cda,depthWrite:false}),line=new T.Mesh(new T.CylinderGeometry(.07,.07,1,8),material),points=[0x399cda,0xf0a23a].map(color=>new T.Mesh(new T.SphereGeometry(.3,12,8),new T.MeshBasicMaterial({color,depthWrite:false}))),direction=new T.Vector3();group.add(line,...points);group.traverse(o=>o.layers.set(2));group.visible=false;scene.add(group);
 return {show(route,y=0){group.visible=!!route?.length;if(!group.visible)return;points.forEach((mesh,i)=>{mesh.visible=!!route[i];if(route[i])mesh.position.set(route[i].x,y+.15,route[i].z);});line.visible=route.length===2;if(line.visible){const [a,b]=route;direction.set(b.x-a.x,0,b.z-a.z);line.position.set((a.x+b.x)/2,y+.15,(a.z+b.z)/2);line.scale.set(1,direction.length(),1);line.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());}}};
}
export function openPatrolEditor(o,{getProject,save,rebuild,lookFromAbove,preview,onClose}){
 const panel=document.createElement('section'),heading=document.createElement('div'),title=document.createElement('h2'),close=document.createElement('button'),note=document.createElement('p'),toolbar=document.createElement('div'),summary=document.createElement('p');panel.className='range-live-panel';panel.setAttribute('role','region');panel.setAttribute('aria-label','往復ルートをえらぶ');heading.className='range-live-heading';title.tabIndex=-1;setReadingText(title,'往復ルートをえらぶ');setReadingText(close,'できた・とじる');close.className='primary';heading.append(title,close);setReadingText(note,'ステージで２か所をえらぼう。青がはじめ、オレンジがおわり。２か所をまっすぐ往復するよ。壁があると止まるよ。');toolbar.className='stage-range-tools';
 let draft=structuredClone(o.patrolRoute||[]),next=0,camera=false,pointer=null;const buttons=[];
 function refresh(){buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===2?camera:!camera&&next===i)));setReadingText(summary,camera?'スティックやドラッグでカメラを動かそう。':next===0?'青い「はじめ」の場所をタップしよう。':'オレンジの「おわり」をタップすると保存するよ。');preview?.(draft);}
 for(const [i,label]of ['① はじめをえらぶ','② おわりをえらぶ','カメラを回す'].entries()){const b=document.createElement('button');setReadingText(b,label);b.onclick=()=>{camera=i===2;if(!camera)next=i;refresh();};buttons.push(b);toolbar.append(b);}
 const top=document.createElement('button');setReadingText(top,'↑ 上から見る');top.onclick=()=>lookFromAbove?.();panel.append(heading,note,toolbar,summary,top);
 const finish=mountLiveRangeEditor(panel,()=>{setStageRangePainter(null);preview?.(o.patrolRoute);onClose?.();});close.onclick=finish;
 setStageRangePainter((kind,id,point)=>{
  if(kind==='end'){if(pointer!==id)return false;pointer=null;return true;}
  if(kind!=='start')return pointer===id;if(camera)return false;if(pointer!==null)return true;pointer=id;
  const p=getProject(),limit=coordinateLimit(p);if(!point||Math.abs(point.x)>worldSize(p)/2||Math.abs(point.z)>worldSize(p)/2)return true;
  const selected={x:Math.max(-limit,Math.min(limit,Math.round(point.x/4)*4)),z:Math.max(-limit,Math.min(limit,Math.round(point.z/4)*4))};
  if(next===0){draft=[selected];next=1;refresh();return true;}
  if(!draft[0]){setReadingText(summary,'先に「はじめ」の場所をえらぼう。');return true;}
  const candidate=[draft[0],selected];if(!validPatrolRoute(candidate,limit)){setReadingText(summary,'はじめと違う場所をえらぼう。');return true;}
  draft=candidate;o.patrolRoute=structuredClone(candidate);save();rebuild();next=0;refresh();return true;
 });lookFromAbove?.();refresh();title.focus({preventScroll:true});
}
