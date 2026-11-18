import * as T from './vendor/three.module.min.js';
import {defaultSupplyFlight,SUPPLY_REWARDS} from './supply3d.js?v=20261118k';
import {coordinateLimit} from './world3d.js?v=20261118k';
import {setReadingText} from './readings3d.js?v=20261118k';
import {configureNumericInput} from './numeric3d.js?v=20261118k';
import {createPatrolOverlay} from './patrol-ui3d.js?v=20261118k';
import {mountLiveRangeEditor} from './range-panel3d.js?v=20261118k';
import {setStageRangePainter} from './stage-range3d.js?v=20261118k';

export function createSupplyUI({$,getProject,save,scene,focusRoute,toast}){
 const dialog=$('#supply-dialog3'),routeOverlay=createPatrolOverlay(scene,{throughParts:true});
 const enabled=$('#supply-enable3'),delay=$('#supply-delay3'),rewardList=$('#supply-rewards3');
 let draft=null;
 const rewards=Object.entries(SUPPLY_REWARDS).map(([key,label])=>{
  const button=document.createElement('button');setReadingText(button,label);
  button.onclick=()=>{draft.reward=key;refreshRewards();};rewardList.append(button);
  return [key,button];
 });
 function refreshRewards(){for(const [key,button] of rewards){button.classList.toggle('active',key===draft.reward);button.setAttribute('aria-pressed',String(key===draft.reward));}}
 function open(){
  enabled.checked=draft.enabled;
  configureNumericInput(delay,{value:draft.startTime,min:0,max:600,step:1,onValue:value=>draft.startTime=Math.round(value),onCommit:()=>{}});
  refreshRewards();dialog.showModal();
 }
 $('#supply-open3').onclick=()=>{const project=getProject();draft=structuredClone(project.supplyFlight||defaultSupplyFlight(project));open();};
 enabled.onchange=()=>{draft.enabled=enabled.checked;};
 $('#supply-save3').onclick=()=>{getProject().supplyFlight=structuredClone(draft);save();dialog.close();};
 $('#supply-route3').onclick=()=>{
  dialog.close();
  const panel=document.createElement('section'),heading=document.createElement('div'),title=document.createElement('h2'),controls=document.createElement('div');
  panel.className='range-live-panel';heading.className='range-live-heading';controls.className='stage-range-tools supply-route-steps';
  setReadingText(title,'ひこうきのとぶみち');heading.append(title);panel.append(heading,controls);
  let step=0,pointer=null,returnToDialog=false,cameraMode=false;
  function makeButton(text,action){
   const button=document.createElement('button');setReadingText(button,text);button.onclick=action;controls.append(button);return button;
  }
  const points=['はじめのばしょ','おわりのばしょ'].map((text,index)=>makeButton(text,()=>{
   step=index;cameraMode=false;focusRoute(draft.route,index);refresh();
  }));
  const done=makeButton('できた',()=>{returnToDialog=true;finish();});
  const camera=makeButton('カメラをうごかす',()=>{cameraMode=!cameraMode;refresh();});
  function refresh(){
   points.forEach((button,index)=>{
    if(!cameraMode&&step===index)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
   });
   if(step===2)done.setAttribute('aria-current','step');else done.removeAttribute('aria-current');
   camera.hidden=step===2;
   camera.setAttribute('aria-pressed',String(cameraMode));
   routeOverlay.show(draft.route);
  }
  const finish=mountLiveRangeEditor(panel,()=>{setStageRangePainter(null);routeOverlay.show(null);if(returnToDialog)open();},{showDetails:false});
  setStageRangePainter((kind,id,point)=>{
   if(kind==='end'){if(pointer!==id)return false;pointer=null;return true;}
   if(kind!=='start')return pointer===id;
   if(cameraMode||step===2)return false;
   if(pointer!==null)return true;pointer=id;
   const limit=coordinateLimit(getProject());
   if(!point||Math.abs(point.x)>limit+2||Math.abs(point.z)>limit+2)return true;
   const snap=value=>Math.max(-limit,Math.min(limit,Math.round(value/4)*4));
   const selected={x:snap(point.x),z:snap(point.z)},other=draft.route[1-step];
   if(selected.x===other.x&&selected.z===other.z){toast('はじめとおわりは、ちがうばしょをえらぼう');return true;}
   draft.route[step]=selected;
   step++;
   if(step===1&&Math.hypot(selected.x-other.x,selected.z-other.z)>60)focusRoute(draft.route,1);
   refresh();return true;
  });
  focusRoute(draft.route);refresh();
 };
}

export function createSupplyView(scene){
 const plane=new T.Group(),crate=new T.Group(),material=color=>new T.MeshStandardMaterial({color});
 function box(parent,color,x,y,z,w,h,d){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material(color));mesh.position.set(x,y,z);parent.add(mesh);}
 box(plane,0xf4b446,0,0,0,1.7,1.2,7);box(plane,0xe6eef1,0,0,-.4,9,.24,2);box(plane,0x5c83a1,0,.8,-1.7,1.4,.5,1.55);box(plane,0xf4b446,0,.8,2.7,.24,1.8,1.45);box(plane,0xe6eef1,0,.2,2.8,3.6,.2,1.3);
 box(crate,0x3399ba,0,.7,0,1.65,1.4,1.65);box(crate,0xf8c651,0,1.46,0,1.8,.16,1.8);box(crate,0xf8c651,0,.7,-.84,.48,.35,.08);
 const parachute=new T.Group(),canopy=new T.Mesh(new T.SphereGeometry(2.35,16,8,0,Math.PI*2,0,Math.PI/2),new T.MeshStandardMaterial({color:0xffbe55,side:T.DoubleSide}));
 canopy.scale.y=.54;canopy.position.y=4;parachute.add(canopy);
 const ropes=[];for(const [x,z] of [[1,1],[1,-1],[-1,1],[-1,-1]])ropes.push(x*.65,1.45,z*.65,x*1.65,4,z*1.65);
 const ropeGeometry=new T.BufferGeometry();ropeGeometry.setAttribute('position',new T.Float32BufferAttribute(ropes,3));parachute.add(new T.LineSegments(ropeGeometry,new T.LineBasicMaterial({color:0x52452c})));crate.add(parachute);
 const marker=new T.Mesh(new T.RingGeometry(1.15,1.65,32),new T.MeshBasicMaterial({color:0xfdd85a,side:T.DoubleSide,depthWrite:false}));marker.rotation.x=-Math.PI/2;
 scene.add(plane,crate,marker);plane.visible=crate.visible=marker.visible=false;
 return state=>{
  plane.visible=!!state?.plane;if(plane.visible){const p=state.plane;plane.position.set(p.x,p.y,p.z);plane.rotation.y=p.yaw;}
  crate.visible=marker.visible=!!state?.crate;
  if(crate.visible){const c=state.crate;crate.position.set(c.x,c.y,c.z);parachute.visible=!c.landed;marker.position.set(c.x,c.landingY+.06,c.z);}
 };
}
