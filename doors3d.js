export const DOOR_PRESETS={key:{name:'カギであけるドア・半マス',mode:'key',style:'swing',width:4},swing:{name:'ふつうのドア・半マス',mode:'free',style:'swing',width:4},slide:{name:'ふすまドア・１マス',mode:'free',style:'slide',width:4},keyslide:{name:'カギつきふすま・１マス',mode:'key',style:'slide',width:4},double:{name:'中央でひらくドア・観音びらき',mode:'free',style:'doubleSwing',width:4},doubleSlide:{name:'ふすま２枚・１マスのはば',mode:'free',style:'doubleSlide',width:4},fusuma:{name:'ふすま４枚・２マスのはば',mode:'free',style:'fusuma',width:8},frame:{name:'ドアのわくだけ',mode:null,width:4},windowFrame:{name:'まどのわくだけ',mode:null,width:4,window:true},windowGlass:{name:'ガラスまど',mode:null,width:4,window:true},windowSwing:{name:'観音びらきのまど',mode:'free',style:'doubleSwing',width:4,window:true}};
export const isSlidingDoor=o=>['slide','doubleSlide','fusuma'].includes(o.doorStyle);
export const doorHasPanel=o=>!['frame','windowFrame'].includes(o.doorVariant);
export const doorCanOpen=o=>doorHasPanel(o)&&o.doorVariant!=='windowGlass';
export function configureDoor(o,preset){const p=DOOR_PRESETS[preset];if(!p)return o;delete o.doorVariant;delete o.doorStyle;delete o.doorMode;delete o.doorAmount;delete o.doorPanelOpen;delete o.doorPanelAmounts;o.open=!p.mode&&preset!=='windowGlass';
 if(p.width){o.doorVariant=preset;o.rotation=0;o.w=p.width;o.d=.3;o.h=3;}
 if(p.mode)o.doorMode=p.mode;if(p.style)o.doorStyle=p.style;o.settings.condition=p.mode==='key'?'keys':'touch';return o;}
export function validDoor(o){return (o.doorVariant===undefined||o.type==='door'&&Object.hasOwn(DOOR_PRESETS,o.doorVariant)&&!!DOOR_PRESETS[o.doorVariant].width)&&(o.doorSide===undefined||o.type==='door'&&[1,-1].includes(o.doorSide))&&(o.doorDirection===undefined||o.type==='door'&&[1,-1].includes(o.doorDirection))&&(o.doorMode===undefined||o.type==='door'&&['free','key'].includes(o.doorMode))&&(o.doorStyle===undefined||o.type==='door'&&['swing','slide','doubleSwing','doubleSlide','fusuma'].includes(o.doorStyle));}
export function nearbyDoor(g,yaw=0){const p=g.player;let closest=null,distance=3;for(const o of g.objects){if(o.type!=='door'||!doorCanOpen(o)||o.plateControlled||!o.doorMode||Math.abs(o.y-p.y)>2.5)continue;const dx=o.x-p.x,dz=o.z-p.z,d=o.doorVariant==='fusuma'?Math.hypot(o.rotation===90?dx:Math.max(0,Math.abs(dx)-o.w/2),o.rotation===90?Math.max(0,Math.abs(dz)-o.d/2):dz):Math.hypot(dx,dz);if(d<distance&&(d<.5||(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/d>-.15)){closest=o;distance=d;}}return closest;}
export function doorLocalX(o,p){return o.rotation===90?-(p.z-o.z):p.x-o.x;}
export function slidingPanelCount(o){return (o.rotation===90?o.d:o.w)>=6?4:2;}
export function slidingDoorPanels(o){
 const {opening,openingCenter}=doorDimensions(o),count=slidingPanelCount(o),width=opening/count,direction=o.doorDirection||1;
 return Array.from({length:count},(_,index)=>{const delta=index%2===0?1:-1,defaultMoving=delta===direction,baseX=openingCenter-opening/2+(index+.5)*width;
  return {index,width,baseX,delta,open:Array.isArray(o.doorPanelOpen)?!!o.doorPanelOpen[index]:!!o.open&&defaultMoving,amount:Array.isArray(o.doorPanelAmounts)?o.doorPanelAmounts[index]||0:defaultMoving?o.doorAmount||0:0};});
}
export function doorInteraction(o,p){
 if(!isSlidingDoor(o))return {index:null,open:!!o.open};const panels=slidingDoorPanels(o),x=doorLocalX(o,p);let nearest=panels.reduce((a,b)=>Math.abs(a.baseX-x)<=Math.abs(b.baseX-x)?a:b),pair=Math.floor(nearest.index/2)*2;
 const opened=panels.slice(pair,pair+2).find(panel=>panel.open);if(opened)nearest=opened;return {index:nearest.index,open:nearest.open};
}
export function prepareDoorPanels(o){if(!isSlidingDoor(o))return;const panels=slidingDoorPanels(o);if(!Array.isArray(o.doorPanelOpen)||o.doorPanelOpen.length!==panels.length)o.doorPanelOpen=panels.map(p=>p.open);if(!Array.isArray(o.doorPanelAmounts)||o.doorPanelAmounts.length!==panels.length)o.doorPanelAmounts=panels.map(p=>p.amount);}
export function setDoorPanelOpen(o,index,open){
 if(!isSlidingDoor(o)){o.open=open;return;}prepareDoorPanels(o);if(!Number.isInteger(index)||index<0||index>=o.doorPanelOpen.length)return;
 if(open){const pair=Math.floor(index/2)*2;o.doorPanelOpen[pair]=false;o.doorPanelOpen[pair+1]=false;}o.doorPanelOpen[index]=open;o.open=o.doorPanelOpen.some(Boolean);
}
export function doorwayOccupied(o,p,index=null){const {opening,openingCenter,depth}=doorDimensions(o),panel=isSlidingDoor(o)&&index!==null?slidingDoorPanels(o)[index]:null,x=doorLocalX(o,p),z=o.rotation===90?p.x-o.x:p.z-o.z;return Math.abs(x-(panel?.baseX??openingCenter))<(panel?.width??opening)/2+.35&&Math.abs(z)<depth/2+.35&&p.y<o.y+o.h&&p.y+1.7>o.y;}
export function animateDoors(g,dt){for(const o of g.objects)if(o.type==='door'&&o.doorStyle){
 if(isSlidingDoor(o)){prepareDoorPanels(o);if(!!o.open!==o.doorPanelOpen.some(Boolean)){const direction=o.doorDirection||1;for(let i=0;i<o.doorPanelOpen.length;i++)o.doorPanelOpen[i]=!!o.open&&(i%2===0?1:-1)===direction;}
  for(let i=0;i<o.doorPanelAmounts.length;i++){const target=o.doorPanelOpen[i]?1:0,current=o.doorPanelAmounts[i];o.doorPanelAmounts[i]=Math.max(0,Math.min(1,current+Math.sign(target-current)*Math.min(Math.abs(target-current),dt*4)));}o.doorAmount=Math.max(...o.doorPanelAmounts);
 }else{const target=o.open?1:0,current=o.doorAmount||0;o.doorAmount=Math.max(0,Math.min(1,current+Math.sign(target-current)*Math.min(Math.abs(target-current),dt*4)));}
}}

export function doorDimensions(o){
 const turned=o.rotation===90,width=turned?o.d:o.w,depth=turned?o.w:o.d,window=!!DOOR_PRESETS[o.doorVariant]?.window,outerWidth=o.doorVariant?width:Math.max(4,width+.18),single=!window&&!isSlidingDoor(o)&&o.doorStyle!=='doubleSwing'&&o.doorVariant!=='double';
 const opening=Math.max(.2,single?outerWidth/2-.2:width-(window?.8:o.doorVariant?.3:.2));
 return {width,depth,outerWidth,opening,single,openingCenter:single?(o.doorSide||-1)*outerWidth/4:0,height:o.h,base:window?o.h*.8/3:0,openingHeight:window?o.h*.6:Math.max(.1,o.h-.15)};
}
export function doorFrameParts(o){
 const {outerWidth,opening,openingCenter:cx,height,base,openingHeight}=doorDimensions(o),left=cx-opening/2,right=cx+opening/2;
 const parts=[{x:(-outerWidth/2+left)/2,y:0,w:left+outerWidth/2,h:height,tag:'frame:-1'},{x:(right+outerWidth/2)/2,y:0,w:outerWidth/2-right,h:height,tag:'frame:1'}];
 if(base)parts.push({x:cx,y:0,w:opening,h:base,tag:'sill'});const top=base+openingHeight;parts.push({x:cx,y:top,w:opening,h:Math.max(.1,height-top),tag:'header'});return parts;
}
function localSolid(o,x,y,w,h,tag){const turned=o.rotation===90,{depth}=doorDimensions(o);return {...o,id:o.id+':'+tag,sourceDoorId:o.id,type:'box',open:false,x:o.x+(turned?0:x),z:o.z+(turned?-x:0),y:o.y+y,w:turned?depth:w,d:turned?w:depth,h};}
export function doorFrameSolids(o){return doorFrameParts(o).map(p=>localSolid(o,p.x,p.y,p.w,p.h,p.tag));}
export function doorSolids(o){const frames=doorFrameSolids(o);if(!doorHasPanel(o))return frames;const {opening,openingCenter,base,openingHeight}=doorDimensions(o);
 if(isSlidingDoor(o)){for(const panel of slidingDoorPanels(o))if(!panel.open)frames.push(localSolid(o,panel.baseX,base,panel.width,openingHeight,'panel:'+panel.index));return frames;}
 if(!o.open||o.doorVariant==='windowGlass')return [...frames,{...localSolid(o,openingCenter,base,opening,openingHeight,'panel'),type:'door'}];return frames;}
