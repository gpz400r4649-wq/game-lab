import {moveGridWindow} from './world3d.js?v=20261030h';
export function panMapCenter(position,input,dt,world){
 const x=input.x||0,z=input.z||0,length=Math.hypot(x,z);if(!Number.isFinite(length)||length<.15)return {...position};
 const {limit,count}=moveGridWindow(world),half=Math.floor(count/2),lo=-limit+half,hi=limit-half,scale=28*Math.max(0,Math.min(.05,dt))/Math.max(1,length);
 return {x:Math.max(lo,Math.min(hi,position.x+x*scale)),z:Math.max(lo,Math.min(hi,position.z+z*scale))};
}
export function createMapStick(root,onInput){
 const thumb=root.querySelector('.map-stick-thumb');let pointer=null;
 const reset=()=>{pointer=null;thumb.style.transform='';onInput({x:0,z:0});};
 function move(e){const r=root.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/(r.width*.32),z=(e.clientY-r.top-r.height/2)/(r.height*.32),length=Math.max(1,Math.hypot(x,z));thumb.style.transform=`translate(${x/length*22}px,${z/length*22}px)`;onInput({x:x/length,z:z/length});}
 root.onpointerdown=e=>{e.preventDefault();if(pointer!==null)return;pointer=e.pointerId;root.setPointerCapture(pointer);move(e);};root.onpointermove=e=>{if(pointer===e.pointerId)move(e);};
 root.onpointerup=root.onpointercancel=root.onlostpointercapture=e=>{if(pointer===e.pointerId)reset();};
 const key=e=>{const input={ArrowLeft:{x:-1,z:0},ArrowRight:{x:1,z:0},ArrowUp:{x:0,z:-1},ArrowDown:{x:0,z:1}}[e.key];if(input){e.preventDefault();onInput(input);}};
 root.onkeydown=key;root.onkeyup=reset;root.onblur=reset;const blur=()=>reset();root.ownerDocument.defaultView.addEventListener('blur',blur);root.ownerDocument.addEventListener('visibilitychange',blur);
 return {destroy(){reset();root.ownerDocument.defaultView.removeEventListener('blur',blur);root.ownerDocument.removeEventListener('visibilitychange',blur);}};
}
