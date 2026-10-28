import {worldSize,coordinateLimit,WORLD_SIZES,resizeReason,spawnReason} from './world3d.js?v=20261028l';
import {setReadingText} from './readings3d.js?v=20261028l';
export function createWorldUI(api){
 const dialog=document.createElement('dialog');dialog.id='world-dialog3';
 const title=document.createElement('h2'),label=document.createElement('label'),sizes=document.createElement('select'),note=document.createElement('p'),canvas=document.createElement('canvas'),status=document.createElement('p'),actions=document.createElement('div');
 setReadingText(title,'マップ');setReadingText(label,'ひろさ ');sizes.setAttribute('aria-label','マップのひろさ');WORLD_SIZES.forEach(n=>sizes.add(new Option(`${n}m × ${n}m`,n)));label.append(sizes);
 setReadingText(note,'マップをタップして、つくる場所をえらぼう。部品は150こまで。ひろげても部品はふえません。');
 canvas.width=512;canvas.height=512;canvas.style.cssText='width:min(100%,44vh,360px);height:auto;display:block;margin:0 auto;touch-action:none;border:1px solid #acbdcd;border-radius:12px';canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','マップ。タップまたは矢印キーで場所をえらぶ');
 let point={x:0,z:0};
 function draw(){const p=api.getProject(),size=worldSize(p),half=size/2,ctx=canvas.getContext('2d'),at=v=>(v+half)/size*512;ctx.fillStyle='#e2e8ed';ctx.fillRect(0,0,512,512);ctx.strokeStyle='#c7d2dc';const step=size<=60?4:size/12;for(let n=-half;n<=half;n+=step){ctx.beginPath();ctx.moveTo(at(n),0);ctx.lineTo(at(n),512);ctx.moveTo(0,at(n));ctx.lineTo(512,at(n));ctx.stroke();}for(const o of p.objects){ctx.fillStyle=o.type==='enemy'?'#ce6870':'#758aab';ctx.fillRect(at(o.x-o.w/2),at(o.z-o.d/2),Math.max(3,o.w/size*512),Math.max(3,o.d/size*512));}ctx.fillStyle='#198b6e';ctx.beginPath();ctx.arc(at(p.spawn.x),at(p.spawn.z),6,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#e46c22';ctx.lineWidth=2;ctx.beginPath();ctx.arc(at(point.x),at(point.z),9,0,Math.PI*2);ctx.moveTo(at(point.x)-13,at(point.z));ctx.lineTo(at(point.x)+13,at(point.z));ctx.moveTo(at(point.x),at(point.z)-13);ctx.lineTo(at(point.x),at(point.z)+13);ctx.stroke();ctx.lineWidth=1;setReadingText(status,`えらんだ場所 X ${point.x} / Z ${point.z}　みどり：スタート`);}
 function choose(x,z){const limit=Math.floor(coordinateLimit(api.getProject())/4)*4;point={x:Math.max(-limit,Math.min(limit,Math.round(x/4)*4)),z:Math.max(-limit,Math.min(limit,Math.round(z/4)*4))};draw();}
 canvas.onpointerdown=e=>{e.preventDefault();const r=canvas.getBoundingClientRect(),size=worldSize(api.getProject());choose((e.clientX-r.left)/r.width*size-size/2,(e.clientY-r.top)/r.height*size-size/2);};
 canvas.onkeydown=e=>{const d={ArrowLeft:[-4,0],ArrowRight:[4,0],ArrowUp:[0,-4],ArrowDown:[0,4]}[e.key];if(d){e.preventDefault();choose(point.x+d[0],point.z+d[1]);}};
 sizes.onchange=()=>{const p=api.getProject(),size=Number(sizes.value),reason=resizeReason(p,size);if(reason){sizes.value=worldSize(p);setReadingText(status,reason);return;}api.resize(size);choose(point.x,point.z);};
 function button(text,action){const b=document.createElement('button');setReadingText(b,text);b.onclick=action;actions.append(b);return b;}
 button('この場所を見る',()=>{api.focus(point);dialog.close();}).className='primary';
 button('ここをスタートにする',()=>{const reason=spawnReason(api.getProject(),point.x,point.z);if(reason){setReadingText(status,reason);return;}api.spawn(point);draw();});button('とじる',()=>dialog.close());actions.className='map-actions';
 dialog.append(title,label,note,canvas,status,actions);document.body.append(dialog);
 document.querySelector('#map3').onclick=()=>{api.beforeOpen();sizes.value=worldSize(api.getProject());const current=api.center();choose(current.x,current.z);dialog.showModal();};
}
