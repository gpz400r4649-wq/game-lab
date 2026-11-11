import * as T from './vendor/three.module.min.js';
import {mountLiveRangeEditor} from './range-panel3d.js?v=20261111b';
import {setStageRangePainter} from './stage-range3d.js?v=20261111b';
import {worldSize,coordinateLimit} from './world3d.js?v=20261111b';
import {validPatrolRoute,placeAtRouteStart} from './patrol-route3d.js?v=20261111b';
import {setReadingText} from './readings3d.js?v=20261111b';
export function createPatrolOverlay(scene){
 const group=new T.Group(),material=new T.MeshBasicMaterial({color:0x399cda,depthWrite:false}),lineGeometry=new T.CylinderGeometry(.07,.07,1,8),pointGeometry=new T.SphereGeometry(.3,12,8),direction=new T.Vector3(),up=new T.Vector3(0,1,0),lines=[],points=[],labels=[];group.visible=false;scene.add(group);
 for(let i=0;i<16;i++){const line=new T.Mesh(lineGeometry,material),point=new T.Mesh(pointGeometry,new T.MeshBasicMaterial({color:i===0?0x399cda:0xf0a23a,depthWrite:false}));line.layers.set(2);point.layers.set(2);group.add(line,point);lines.push(line);points.push(point);}
 function label(i){if(labels[i])return labels[i];const canvas=globalThis.document?.createElement('canvas'),ctx=canvas?.getContext?.('2d');if(!ctx)return null;canvas.width=64;canvas.height=64;ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(32,32,28,0,Math.PI*2);ctx.fill();ctx.fillStyle='#3b567e';ctx.font='bold 34px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(i+1),32,34);const sprite=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(canvas),depthTest:false,depthWrite:false}));sprite.layers.set(2);sprite.scale.set(.9,.9,1);group.add(sprite);labels[i]=sprite;return sprite;}
 return {show(route,y=0,loop=false){group.visible=!!route?.length;if(!group.visible)return;points.forEach((mesh,i)=>{mesh.visible=!!route[i];if(route[i]){mesh.position.set(route[i].x,y+.15,route[i].z);const number=label(i);if(number){number.visible=true;number.position.set(route[i].x,y+.85,route[i].z);}}else if(labels[i])labels[i].visible=false;});lines.forEach((line,i)=>{const a=route[i],b=route[i+1]||(loop&&i===route.length-1?route[0]:null);line.visible=!!a&&!!b;if(line.visible){direction.set(b.x-a.x,0,b.z-a.z);line.position.set((a.x+b.x)/2,y+.15,(a.z+b.z)/2);line.scale.set(1,direction.length(),1);line.quaternion.setFromUnitVectors(up,direction.normalize());}});}};
}
export function openPatrolEditor(o,{getProject,save,rebuild,lookFromAbove,preview,onClose}){
 const panel=document.createElement('section'),heading=document.createElement('div'),title=document.createElement('h2'),close=document.createElement('button'),note=document.createElement('p'),toolbar=document.createElement('div'),summary=document.createElement('p');panel.className='range-live-panel';panel.setAttribute('role','region');panel.setAttribute('aria-label','往復ルートをえらぶ');heading.className='range-live-heading';title.tabIndex=-1;setReadingText(title,'往復ルートをえらぶ');setReadingText(close,'できた・設定にもどる');close.className='primary';heading.append(title,close);setReadingText(note,'ステージで２か所をえらぼう。青がはじめ、オレンジがおわり。２か所をまっすぐ往復するよ。壁があると止まるよ。');toolbar.className='stage-range-tools';
 let draft=structuredClone(o.patrolRoute||[]),next=0,camera=false,pointer=null;const buttons=[];
 function refresh(){buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===2?camera:!camera&&next===i)));setReadingText(summary,camera?'スティックやドラッグでカメラを動かそう。':next===0?'青い「はじめ」の場所をタップしよう。':'オレンジの「おわり」をタップすると保存するよ。');preview?.(draft);}
 for(const [i,label]of ['① はじめをえらぶ','② おわりをえらぶ','カメラを回す'].entries()){const b=document.createElement('button');setReadingText(b,label);b.onclick=()=>{camera=i===2;if(!camera)next=i;refresh();};buttons.push(b);toolbar.append(b);}
 const top=document.createElement('button');top.className='range-top-action';setReadingText(top,'↑ 上から見る');top.onclick=()=>lookFromAbove?.();panel.append(heading,note,toolbar,summary,top);
 const finish=mountLiveRangeEditor(panel,()=>{setStageRangePainter(null);preview?.(o.patrolRoute);onClose?.();});close.onclick=finish;
 setStageRangePainter((kind,id,point)=>{
  if(kind==='end'){if(pointer!==id)return false;pointer=null;return true;}
  if(kind!=='start')return pointer===id;if(camera)return false;if(pointer!==null)return true;pointer=id;
  const p=getProject(),limit=coordinateLimit(p);if(!point||Math.abs(point.x)>worldSize(p)/2||Math.abs(point.z)>worldSize(p)/2)return true;
  const selected={x:Math.max(-limit,Math.min(limit,Math.round(point.x/4)*4)),z:Math.max(-limit,Math.min(limit,Math.round(point.z/4)*4))};
  if(next===0){draft=[selected];next=1;refresh();return true;}
  if(!draft[0]){setReadingText(summary,'先に「はじめ」の場所をえらぼう。');return true;}
  const candidate=[draft[0],selected];if(!validPatrolRoute(candidate,limit)){setReadingText(summary,'はじめと違う場所をえらぼう。');return true;}
  draft=candidate;o.patrolRoute=structuredClone(candidate);placeAtRouteStart(o,o.patrolRoute);save();rebuild();next=0;refresh();return true;
 });lookFromAbove?.();refresh();title.focus({preventScroll:true});
}
