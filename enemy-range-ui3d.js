import {openMoveMap} from './move-map-ui3d.js?v=20261029r';
import {RANGE_MAX,makeAttackRange,rangeCells} from './enemy-range3d.js?v=20261029r';
import {setReadingText,kanaText} from './readings3d.js?v=20261029r';
const RANGE_UI={
 attackRange:{label:'弾を撃つ',title:'敵が弾を撃つマス',note:'色のついたマスに入ったら → 弾を撃つ。',empty:'これまでの近くに来たら撃つ設定',center:'敵のいるマスが中心。敵と一緒に動くよ。',color:'#ef9aae'},
 moveRange:{label:'動ける',title:'敵が動けるマス',note:'色のついたマスの中だけを歩けるよ。つながっていないマスには行けないよ。',empty:'制限なし',center:'敵を置いたマスが中心。ゲーム中もこの場所に固定だよ。',color:'#91c7ee'},
 searchRange:{label:'探す',title:'プレイヤーを見つけるマス',note:'色のついたマスにプレイヤーが入ると → 見つける。追いかけ方は別にえらぼう。',empty:'近くで見つける設定（18m）',center:'敵のいるマスが中心。敵と一緒に動くよ。',color:'#efcf74'}
};
export function renderAttackRange(parent,o,api){renderEnemyRange(parent,o,api,'attackRange');}
export function renderEnemyRange(parent,o,{save,rebuild,showRange,getProject},key){
 const config=RANGE_UI[key],edit=document.createElement('button'),label=document.createElement('span'),summary=document.createElement('small');edit.className='enemy-range-choice';setReadingText(label,`▦ ${config.label}マスをえらぶ`);edit.setAttribute('aria-label',kanaText(`▦ ${config.label}マスをえらぶ`));
 const names={cross:'十字',circle:'円',mixed:'十字＋円',custom:'自分でつくった形'};
 const update=()=>setReadingText(summary,o[key]?`${o[key].space==='world'?'マップ上':names[o[key].shape]}・${o[key].cells.length}マス`:config.empty);update();
 edit.onclick=()=>{showRange?.(key);if(key==='moveRange')openMoveMap(o,{getProject,save,rebuild,onClose:update});else openRangeEditor(o,{key,config,save,rebuild,onClose:update});};edit.append(label,summary);parent.append(edit);
}
function openRangeEditor(o,{key,config,save,rebuild,onClose}){
 if(!o[key]){o[key]=makeAttackRange('circle',4,key==='moveRange'?3:4);save();rebuild();}
 const r=o[key],d=document.createElement('dialog');d.className='enemy-range-dialog';d.style.setProperty('--range-color',config.color);
 const h=document.createElement('h2'),note=document.createElement('p'),controls=document.createElement('div'),grid=document.createElement('div'),count=document.createElement('p'),close=document.createElement('button');
 setReadingText(h,config.title);setReadingText(note,config.note+' マスをタップすると追加・削除できるよ。🤖が中心。'+config.center+' 上はマップの奥、右は横 X の＋。高さに関係なく、地面のマスでたしかめるよ。');
 controls.className='range-controls';grid.className='enemy-range-grid';grid.setAttribute('role','group');grid.setAttribute('aria-label',config.label+'はんいのマス');count.setAttribute('aria-live','polite');
 function choose(label,values,value,change){const l=document.createElement('label'),s=document.createElement('span'),select=document.createElement('select');setReadingText(s,label);select.setAttribute('aria-label',label);for(const [v,text]of values)select.add(new Option(kanaText(text),v));select.value=value;select.onchange=()=>change(select.value);l.append(s,select);controls.append(l);return select;}
 const sizes={};
 const shape=choose('はんいの形',[['cross','十字'],['circle','円'],['mixed','十字＋円'],['custom','自分でマスをえらぶ']],r.shape,v=>{r.shape=v;if(v==='mixed'&&r.cross<=r.circle){r.circle=Math.min(r.circle,6);r.cross=r.circle+2;}if(v!=='custom')r.cells=rangeCells(v,r.cross,r.circle);changed();});
 for(const [key,label]of [['cross','十字の長さ'],['circle','円の広さ']])sizes[key]=choose(label,Array.from({length:RANGE_MAX},(_,i)=>[String(i+1),`${i+1}マス`]),String(r[key]),v=>{r[key]=Number(v);if(r.shape!=='custom')r.cells=rangeCells(r.shape,r.cross,r.circle);changed();});
 const clear=document.createElement('button');setReadingText(clear,'全部のマスをけす');clear.onclick=()=>{r.cells=[];r.shape='custom';changed();};
 const buttons=new Map();for(let z=-RANGE_MAX;z<=RANGE_MAX;z++)for(let x=-RANGE_MAX;x<=RANGE_MAX;x++){
  const b=document.createElement('button'),key=`${x},${z}`;b.type='button';b.setAttribute('aria-label',`横 ${x} 奥行 ${z} のマス`);b.textContent=x===0&&z===0?'🤖':'';
  b.onclick=()=>{const i=r.cells.findIndex(c=>c[0]===x&&c[1]===z);if(i<0)r.cells.push([x,z]);else r.cells.splice(i,1);r.shape='custom';changed();};buttons.set(key,b);grid.append(b);
 }
 function paint(){const active=new Set(r.cells.map(c=>c.join(',')));for(const [key,b]of buttons){const on=active.has(key);b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));}shape.value=r.shape;for(const key of ['cross','circle']){sizes[key].value=String(r[key]);sizes[key].disabled=r.shape==='custom'||(r.shape==='cross'&&key==='circle')||(r.shape==='circle'&&key==='cross');}setReadingText(count,`${config.label}マス：${r.cells.length}個 ／ 中心から、たて・よこ８マスまで。`);}
 function changed(){paint();save();rebuild();}
 const finish=()=>{onClose();d.close();d.remove();};setReadingText(close,'できた・ステージで見る');close.className='primary';close.onclick=finish;d.oncancel=e=>{e.preventDefault();finish();};d.append(h,note,controls,clear,grid,count,close);document.body.append(d);paint();d.showModal();
}
