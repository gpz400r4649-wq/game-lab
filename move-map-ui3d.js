import {MOVE_MAX_CELLS,RANGE_MAX,rangeCell,rangeCells,worldMoveRange} from './enemy-range3d.js?v=20261029p';
import {coordinateLimit} from './world3d.js?v=20261029p';
import {setReadingText,kanaText} from './readings3d.js?v=20261029p';
export function openMoveMap(o,{getProject,save,rebuild,onClose}){
 const p=getProject(),limit=Math.floor(coordinateLimit(p)/4),d=document.createElement('dialog');d.className='enemy-range-dialog';d.style.setProperty('--range-color','#91c7ee');
 o.moveRange=o.moveRange?worldMoveRange(o.moveRange,o):{space:'world',cells:[]};save();rebuild();
 const chosen=new Set(o.moveRange.cells.map(c=>c.join(','))),h=document.createElement('h2'),note=document.createElement('p'),controls=document.createElement('div'),grid=document.createElement('div'),count=document.createElement('p'),close=document.createElement('button');
 const initial=o.moveRange.cells,cx=initial.length?Math.round((Math.min(...initial.map(c=>c[0]))+Math.max(...initial.map(c=>c[0])))/2):rangeCell(o.x),cz=initial.length?Math.round((Math.min(...initial.map(c=>c[1]))+Math.max(...initial.map(c=>c[1])))/2):rangeCell(o.z);
 let centerX=cx,centerZ=cz,cross=4,circle=3;
 setReadingText(h,'敵が動けるマス');setReadingText(note,'形をえらび、マスをタップして追加・削除しよう。青い場所はマップに固定。敵を動かしても変わらないよ。🤖は敵、●はスタート。形をえらび直すと、今のはんいを置き換えるよ。');
 controls.className='range-controls';grid.className='enemy-range-grid';grid.setAttribute('role','group');grid.setAttribute('aria-label','動けるはんいのマス');count.setAttribute('aria-live','polite');
 function select(parent,label,values,value,change){const row=document.createElement('label'),text=document.createElement('span'),input=document.createElement('select');setReadingText(text,label);input.setAttribute('aria-label',label);for(const [v,t]of values)input.add(new Option(kanaText(t),v));input.value=value;input.onchange=()=>change(input.value);row.append(text,input);parent.append(row);return input;}
 function preset(){if(shape.value==='custom')return;chosen.clear();for(const [x,z]of rangeCells(shape.value,cross,circle)){if(Math.abs(centerX+x)<=limit&&Math.abs(centerZ+z)<=limit)chosen.add(`${centerX+x},${centerZ+z}`);}changed();}
 const shape=select(controls,'はんいの形',[['custom','自分でマスをえらぶ'],['cross','十字'],['circle','円'],['mixed','十字＋円']],'custom',v=>{if(v==='mixed'&&cross<=circle){circle=Math.min(circle,6);cross=circle+2;}preset();paint();});
 const lengths=Array.from({length:RANGE_MAX},(_,i)=>[String(i+1),`${i+1}マス`]);
 const crossInput=select(controls,'十字の長さ',lengths,String(cross),v=>{cross=Number(v);preset();}),circleInput=select(controls,'円の広さ',lengths,String(circle),v=>{circle=Number(v);preset();});
 const clear=document.createElement('button');setReadingText(clear,'全部のマスをけす');clear.onclick=()=>{chosen.clear();shape.value='custom';changed();};
 const places=document.createElement('details'),title=document.createElement('summary'),area=document.createElement('div');setReadingText(title,'遠くの場所をえらぶ');places.append(title,area);area.className='range-controls';
 const pageCenters=[];for(let n=-limit;n<=limit;n+=17)pageCenters.push(Math.min(limit,n+8));if(!pageCenters.includes(0))pageCenters.push(0);if(!pageCenters.includes(cx))pageCenters.push(cx);if(!pageCenters.includes(cz))pageCenters.push(cz);pageCenters.sort((a,b)=>a-b);
 const areas=pageCenters.map(n=>[String(n),`${Math.max(-limit,n-8)*4}〜${Math.min(limit,n+8)*4}`]);
 select(area,'横 X の場所',areas,String(cx),v=>{centerX=Number(v);shape.value='custom';paint();});select(area,'奥行 Z の場所',areas,String(cz),v=>{centerZ=Number(v);shape.value='custom';paint();});
 const buttons=[];for(let dz=-8;dz<=8;dz++)for(let dx=-8;dx<=8;dx++){
  const b=document.createElement('button');b.type='button';b.onclick=()=>{const key=`${centerX+dx},${centerZ+dz}`;if(chosen.has(key))chosen.delete(key);else if(chosen.size<MOVE_MAX_CELLS)chosen.add(key);shape.value='custom';changed();};buttons.push({b,dx,dz});grid.append(b);
 }
 function paint(){for(const {b,dx,dz}of buttons){const x=centerX+dx,z=centerZ+dz,key=`${x},${z}`,active=chosen.has(key);b.disabled=Math.abs(x)>limit||Math.abs(z)>limit;b.setAttribute('aria-label',`X ${x*4} Z ${z*4} のマス`);b.setAttribute('aria-pressed',String(active));b.classList.toggle('active',active);b.textContent=x===rangeCell(o.x)&&z===rangeCell(o.z)?'🤖':x===rangeCell(p.spawn.x)&&z===rangeCell(p.spawn.z)?'●':'';}
  crossInput.value=String(cross);circleInput.value=String(circle);crossInput.disabled=shape.value==='custom'||shape.value==='circle';circleInput.disabled=shape.value==='custom'||shape.value==='cross';setReadingText(count,`青：${chosen.size} / ${MOVE_MAX_CELLS}マス　表示の中心 X ${centerX*4} / Z ${centerZ*4}`);
 }
 function changed(){o.moveRange={space:'world',cells:[...chosen].map(key=>key.split(',').map(Number))};save();rebuild();paint();}
 const finish=()=>{onClose();d.close();d.remove();};const unlimited=document.createElement('button');setReadingText(unlimited,'移動の制限をなくす');unlimited.onclick=()=>{delete o.moveRange;save();rebuild();finish();};
 setReadingText(close,'できた・ステージで見る');close.className='primary';close.onclick=finish;d.oncancel=e=>{e.preventDefault();finish();};d.append(h,note,controls,clear,grid,count,places,unlimited,close);document.body.append(d);paint();d.showModal();
}
