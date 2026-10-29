import {MOVE_MAX_CELLS,rangeCell,worldMoveRange} from './enemy-range3d.js?v=20261029o';
import {coordinateLimit} from './world3d.js?v=20261029o';
import {setReadingText} from './readings3d.js?v=20261029o';
export function openMoveMap(o,{getProject,save,rebuild,onClose}){
 const p=getProject(),limit=Math.floor(coordinateLimit(p)/4),d=document.createElement('dialog');d.className='move-map-dialog';
 o.moveRange=o.moveRange?worldMoveRange(o.moveRange,o):{space:'world',cells:[]};save();rebuild();
 const chosen=new Set(o.moveRange.cells.map(c=>c.join(','))),h=document.createElement('h2'),note=document.createElement('p'),canvas=document.createElement('canvas'),overview=document.createElement('canvas'),status=document.createElement('p'),toolbar=document.createElement('div'),close=document.createElement('button');
 setReadingText(h,'マップに動けるマスをぬる');setReadingText(note,'青いマスが移動できる場所。敵を動かしても、青い場所は動かないよ。赤は敵、みどりはスタート。敵も青いマスの中に置こう。小さいマップをタップすると別の場所を見られるよ。');
 canvas.width=544;canvas.height=544;canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','移動範囲のマップ。マスをタップしてぬる');overview.width=128;overview.height=128;overview.setAttribute('role','img');overview.setAttribute('aria-label','移動範囲の全体マップ。タップで表示場所を移動');
 let cx=rangeCell(o.x),cz=rangeCell(o.z),span=Math.min(17,limit*2+1),paint=true,stroke=null,last=null;
 const ctx=canvas.getContext('2d'),mini=overview.getContext('2d');
 function bounds(){const count=limit*2+1;span=Math.min(span,count);const minX=Math.max(-limit,Math.min(limit-span+1,cx-Math.floor(span/2))),minZ=Math.max(-limit,Math.min(limit-span+1,cz-Math.floor(span/2)));return {minX,minZ};}
 function draw(){const {minX,minZ}=bounds(),unit=544/span;ctx.fillStyle='#edf2f7';ctx.fillRect(0,0,544,544);
  for(const key of chosen){const [x,z]=key.split(',').map(Number);ctx.fillStyle='#91c7ee';ctx.fillRect((x-minX)*unit,(z-minZ)*unit,unit,unit);}
  for(const obj of p.objects){ctx.fillStyle=obj.type==='enemy'?'#c94862':'#718399';ctx.fillRect((obj.x/4-minX+.5)*unit-obj.w/8*unit,(obj.z/4-minZ+.5)*unit-obj.d/8*unit,Math.max(3,obj.w/4*unit),Math.max(3,obj.d/4*unit));}
  ctx.fillStyle='#159475';ctx.beginPath();ctx.arc((p.spawn.x/4-minX+.5)*unit,(p.spawn.z/4-minZ+.5)*unit,Math.max(4,unit*.16),0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#b8c6d4';ctx.lineWidth=1;for(let i=0;i<=span;i++){ctx.beginPath();ctx.moveTo(i*unit,0);ctx.lineTo(i*unit,544);ctx.moveTo(0,i*unit);ctx.lineTo(544,i*unit);ctx.stroke();}
  const mx=(rangeCell(o.x)-minX+.5)*unit,mz=(rangeCell(o.z)-minZ+.5)*unit;ctx.strokeStyle='#b2324f';ctx.lineWidth=3;ctx.strokeRect(mx-unit*.35,mz-unit*.35,unit*.7,unit*.7);
  const count=limit*2+1,u=128/count;mini.fillStyle='#edf2f7';mini.fillRect(0,0,128,128);mini.fillStyle='#4798d6';for(const key of chosen){const [x,z]=key.split(',').map(Number);mini.fillRect((x+limit)*u,(z+limit)*u,Math.max(1,u),Math.max(1,u));}mini.strokeStyle='#7152c4';mini.lineWidth=2;mini.strokeRect((minX+limit)*u,(minZ+limit)*u,span*u,span*u);
  setReadingText(status,`青：${chosen.size} / ${MOVE_MAX_CELLS}マス　表示 X ${minX*4}〜${(minX+span-1)*4} / Z ${minZ*4}〜${(minZ+span-1)*4}`);
 }
 function changed(){o.moveRange={space:'world',cells:[...chosen].map(key=>key.split(',').map(Number))};save();rebuild();draw();}
 function at(e){const rect=canvas.getBoundingClientRect(),{minX,minZ}=bounds();return [Math.max(-limit,Math.min(limit,minX+Math.max(0,Math.min(span-1,Math.floor((e.clientX-rect.left)/rect.width*span))))),Math.max(-limit,Math.min(limit,minZ+Math.max(0,Math.min(span-1,Math.floor((e.clientY-rect.top)/rect.height*span)))))];}
 function mark(x,z){const key=`${x},${z}`;if(paint){if(chosen.size<MOVE_MAX_CELLS||chosen.has(key))chosen.add(key);}else chosen.delete(key);}
 function paintTo(cell){if(last&&last[0]===cell[0]&&last[1]===cell[1])return;if(last){const dx=cell[0]-last[0],dz=cell[1]-last[1],n=Math.max(Math.abs(dx),Math.abs(dz));for(let i=0;i<=n;i++)mark(last[0]+Math.round(dx*(n?i/n:0)),last[1]+Math.round(dz*(n?i/n:0)));}else mark(...cell);last=cell;changed();}
 canvas.onpointerdown=e=>{e.preventDefault();if(stroke!==null)return;stroke=e.pointerId;canvas.setPointerCapture(e.pointerId);last=null;paintTo(at(e));};canvas.onpointermove=e=>{if(stroke===e.pointerId)paintTo(at(e));};canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=()=>{stroke=null;last=null;};
 overview.onpointerdown=e=>{e.preventDefault();const r=overview.getBoundingClientRect();cx=Math.floor((e.clientX-r.left)/r.width*(limit*2+1))-limit;cz=Math.floor((e.clientY-r.top)/r.height*(limit*2+1))-limit;draw();};
 function button(text,fn){const b=document.createElement('button');setReadingText(b,text);b.onclick=fn;toolbar.append(b);return b;}
 const add=button('ぬる',()=>{paint=true;add.setAttribute('aria-pressed','true');erase.setAttribute('aria-pressed','false');}),erase=button('けす',()=>{paint=false;add.setAttribute('aria-pressed','false');erase.setAttribute('aria-pressed','true');});add.setAttribute('aria-pressed','true');erase.setAttribute('aria-pressed','false');
 for(const [name,dx,dz]of [['←',-1,0],['↑',0,-1],['↓',0,1],['→',1,0]])button(name,()=>{cx=Math.max(-limit,Math.min(limit,cx+dx*Math.max(1,Math.floor(span/2))));cz=Math.max(-limit,Math.min(limit,cz+dz*Math.max(1,Math.floor(span/2))));draw();});
 button('＋ 大きく',()=>{span=Math.max(7,Math.floor(span/2));draw();});button('− 広く',()=>{span=Math.min(limit*2+1,span*2);draw();});button('全部けす',()=>{chosen.clear();changed();});
 canvas.onkeydown=e=>{const v={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(v){e.preventDefault();cx+=v[0];cz+=v[1];draw();}};
 const finish=()=>{onClose();d.close();d.remove();};setReadingText(close,'できた・ステージで見る');close.className='primary';close.onclick=finish;d.oncancel=e=>{e.preventDefault();finish();};toolbar.className='move-map-toolbar';const maps=document.createElement('div');maps.className='move-map-canvases';maps.append(canvas,overview);d.append(h,note,toolbar,maps,status,close);document.body.append(d);draw();d.showModal();
}
