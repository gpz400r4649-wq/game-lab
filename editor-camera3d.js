import {MAX_BUILD_Y} from './limits3d.js?v=20261119d';
import {worldHalf} from './world3d.js?v=20261119d';
import {bindHeldButton} from './input3d.js?v=20261119d';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const CITY_TOP_PITCH=Math.PI/2-.02;
export const CITY_ANGLE_PITCH=.82;
export const DEFAULT_PLAY_PITCH=-.05;
export const cityZoomLimit=world=>Math.max(65,worldHalf(world)*3);

export function recenterCarCamera(yaw,pitch,dt){
 const fraction=-Math.expm1(-3.8*dt);
 const ease=(offset,speed)=>{
  const next=offset-Math.sign(offset)*Math.min(Math.abs(offset)*fraction,speed*dt);
  return Math.abs(next)<.006?0:next;
 };
 const nextYaw=ease(Math.atan2(Math.sin(yaw),Math.cos(yaw)),2.1);
 const nextPitch=ease(pitch-DEFAULT_PLAY_PITCH,1.2);
 return {yaw:nextYaw,pitch:DEFAULT_PLAY_PITCH+nextPitch,returning:nextYaw!==0||nextPitch!==0};
}

export function cityRouteView(path,aspect,fov,world){
 const bounds={x:[Infinity,-Infinity],y:[Infinity,-Infinity],z:[Infinity,-Infinity]};
 for(const point of path)for(const axis of ['x','y','z']){
  const value=point[axis]||0;
  const [low,high]=bounds[axis];
  bounds[axis]=[Math.min(low,value),Math.max(high,value)];
 }
 const center=axis=>(bounds[axis][0]+bounds[axis][1])/2;
 const radius=axis=>(bounds[axis][1]-bounds[axis][0])/2;
 const vertical=Math.tan(fov*Math.PI/360);
 const distance=Math.max(radius('z')/vertical,radius('x')/(vertical*Math.max(.35,aspect)))*1.28+radius('y')+6;
 return {x:center('x'),y:center('y'),z:center('z'),distance:clamp(distance,32,cityZoomLimit(world))};
}
// Resume editing near the player's floor, with the same horizontal direction.
export function editorViewFromPlay(player,yaw,pitch,world){
 if(!player||!['x','y','z'].every(key=>Number.isFinite(player[key])))return null;
 const half=worldHalf(world);
 return {target:{x:clamp(player.x,-half,half),y:clamp(player.y+1,1,MAX_BUILD_Y+10),z:clamp(player.z,-half,half)},yaw:Number.isFinite(yaw)?yaw:0,pitch:clamp(Number.isFinite(pitch)?-pitch:.35,.35,1.1),distance:12};
}
// Move the camera and its orbit target together in camera-relative directions.
export function moveEditorCamera(target,input,yaw,distance,dt,world,pitch=.7){
 let x=input.x||0,z=input.z||0,y=input.y||0;const length=Math.hypot(x,z,y);if(!length||!Number.isFinite(length))return false;if(length>1){x/=length;z/=length;y/=length;}
 const wideView=world?.template==='car'&&distance>65;
 const speed=(wideView?Math.max(28,distance*.42):clamp(distance*.55,6,28))*(input.fast?2.5:1),step=speed*clamp(dt,0,.05),half=worldHalf(world);
 target.x=clamp(target.x+(x*Math.cos(yaw)+z*Math.sin(yaw))*step,-half,half);
 target.z=clamp(target.z+(-x*Math.sin(yaw)+z*Math.cos(yaw))*step,-half,half);
 target.y=clamp(target.y+y*step,.5-Math.sin(pitch)*distance,MAX_BUILD_Y+10);return true;
}
export function createEditorNavigation(root,focus=()=>{}){
 const stick=root.querySelector('#edit-stick3'),thumb=stick.querySelector('.edit-stick-thumb');let pointer=null,position={x:0,z:0},up=false,down=false;
 function move(e){const r=stick.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/(r.width*.32),z=(e.clientY-r.top-r.height/2)/(r.height*.32),length=Math.max(1,Math.hypot(x,z));position={x:x/length,z:z/length};thumb.style.transform=`translate(${position.x*24}px,${position.z*24}px)`;}
 stick.addEventListener('pointerdown',e=>{e.preventDefault();if(pointer!==null)return;focus();pointer=e.pointerId;stick.setPointerCapture(pointer);move(e);});
 stick.addEventListener('pointermove',e=>{if(pointer===e.pointerId)move(e);});
 function release(e){if(pointer!==e.pointerId)return;pointer=null;position={x:0,z:0};thumb.style.transform='';}
 for(const type of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(type,release);
 const stopUp=bindHeldButton(root.querySelector('#edit-rise3'),()=>{focus();up=true;},()=>up=false),stopDown=bindHeldButton(root.querySelector('#edit-lower3'),()=>{focus();down=true;},()=>down=false);
 return {read:()=>({...position,y:Number(up)-Number(down)}),reset(){pointer=null;position={x:0,z:0};up=down=false;thumb.style.transform='';stopUp();stopDown();}};
}
