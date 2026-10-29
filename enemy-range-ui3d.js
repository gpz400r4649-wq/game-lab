import {RANGE_MAX,makeAttackRange,rangeCells} from './enemy-range3d.js?v=20261029m';
import {setReadingText,kanaText} from './readings3d.js?v=20261029m';
export function renderAttackRange(parent,o,{save,rebuild}){
 const summary=document.createElement('p'),edit=document.createElement('button');summary.className='component-description';
 const names={cross:'十字',circle:'円',mixed:'十字＋円',custom:'自分でつくった形'};
 setReadingText(summary,o.attackRange?`弾を撃つはんい：${names[o.attackRange.shape]}・${o.attackRange.cells.length}マス`:'弾を撃つはんい：これまでの近くに来たら撃つ設定');
 setReadingText(edit,'▦ 弾を撃つマスをえらぶ');edit.onclick=()=>openRangeEditor(o,{save,rebuild,onClose:()=>{setReadingText(summary,`弾を撃つはんい：${names[o.attackRange.shape]}・${o.attackRange.cells.length}マス`);}});parent.append(summary,edit);
}
function openRangeEditor(o,{save,rebuild,onClose}){
 if(!o.attackRange){o.attackRange=makeAttackRange();save();rebuild();}
 const r=o.attackRange,d=document.createElement('dialog');d.className='enemy-range-dialog';
 const h=document.createElement('h2'),note=document.createElement('p'),controls=document.createElement('div'),grid=document.createElement('div'),count=document.createElement('p'),close=document.createElement('button');
 setReadingText(h,'敵が弾を撃つマス');setReadingText(note,'色のついたマスに入ったら → 弾を撃つ。マスをタップすると追加・削除できるよ。🤖が中心。上はマップの奥、右は横 X の＋。高さに関係なく、地面のマスでたしかめるよ。');
 controls.className='range-controls';grid.className='enemy-range-grid';grid.setAttribute('role','group');grid.setAttribute('aria-label','射撃はんいのマス');count.setAttribute('aria-live','polite');
 function choose(label,values,value,change){const l=document.createElement('label'),s=document.createElement('span'),select=document.createElement('select');setReadingText(s,label);select.setAttribute('aria-label',label);for(const [v,text]of values)select.add(new Option(kanaText(text),v));select.value=value;select.onchange=()=>change(select.value);l.append(s,select);controls.append(l);return select;}
 const sizes={};
 const shape=choose('はんいの形',[['cross','十字'],['circle','円'],['mixed','十字＋円'],['custom','自分でマスをえらぶ']],r.shape,v=>{r.shape=v;if(v==='mixed'&&r.cross<=r.circle){r.circle=Math.min(r.circle,6);r.cross=r.circle+2;}if(v!=='custom')r.cells=rangeCells(v,r.cross,r.circle);changed();});
 for(const [key,label]of [['cross','十字の長さ'],['circle','円の広さ']])sizes[key]=choose(label,Array.from({length:RANGE_MAX},(_,i)=>[String(i+1),`${i+1}マス`]),String(r[key]),v=>{r[key]=Number(v);if(r.shape!=='custom')r.cells=rangeCells(r.shape,r.cross,r.circle);changed();});
 const clear=document.createElement('button');setReadingText(clear,'全部のマスをけす');clear.onclick=()=>{r.cells=[];r.shape='custom';changed();};
 const buttons=new Map();for(let z=-RANGE_MAX;z<=RANGE_MAX;z++)for(let x=-RANGE_MAX;x<=RANGE_MAX;x++){
  const b=document.createElement('button'),key=`${x},${z}`;b.type='button';b.setAttribute('aria-label',`横 ${x} 奥行 ${z} のマス`);b.textContent=x===0&&z===0?'🤖':'';
  b.onclick=()=>{const i=r.cells.findIndex(c=>c[0]===x&&c[1]===z);if(i<0)r.cells.push([x,z]);else r.cells.splice(i,1);r.shape='custom';changed();};buttons.set(key,b);grid.append(b);
 }
 function paint(){const active=new Set(r.cells.map(c=>c.join(',')));for(const [key,b]of buttons){const on=active.has(key);b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));}shape.value=r.shape;for(const key of ['cross','circle']){sizes[key].value=String(r[key]);sizes[key].disabled=r.shape==='custom'||(r.shape==='cross'&&key==='circle')||(r.shape==='circle'&&key==='cross');}setReadingText(count,`撃つマス：${r.cells.length}個 ／ 敵のいるマスから、たて・よこ８マスまで。空のマスでは撃たないよ。`);}
 function changed(){paint();save();rebuild();}
 const finish=()=>{onClose();d.close();d.remove();};setReadingText(close,'できた・ステージで見る');close.className='primary';close.onclick=finish;d.oncancel=e=>{e.preventDefault();finish();};d.append(h,note,controls,clear,grid,count,close);document.body.append(d);paint();d.showModal();
}
