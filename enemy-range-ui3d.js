import {closeLiveRangeEditor,mountLiveRangeEditor} from './range-panel3d.js?v=20261030j';
export {closeLiveRangeEditor,isLiveRangeEditing} from './range-panel3d.js?v=20261030j';
import {directionFrame,markRobotCell} from './range-direction3d.js?v=20261030j';
import {openMoveMap} from './move-map-ui3d.js?v=20261030j';
import {RANGE_MAX,rangeCells,convertRangeSpace} from './enemy-range3d.js?v=20261030j';
import {setReadingText,kanaText} from './readings3d.js?v=20261030j';
const RANGE_UI={
 attackRange:{label:'弾を撃つ',title:'敵が弾を撃つマス',note:'色のついたマスに入ったら → 弾を撃つ。',empty:'これまでの近くに来たら撃つ設定',center:'敵のいるマスが中心。敵と一緒に動くよ。',color:'#ef9aae'},
 moveRange:{label:'動ける',title:'敵が動けるマス',note:'色のついたマスの中だけを歩けるよ。つながっていないマスには行けないよ。',empty:'制限なし',center:'敵を置いたマスが中心。ゲーム中もこの場所に固定だよ。',color:'#91c7ee'},
 searchRange:{label:'探す',title:'プレイヤーを見つけるマス',note:'色のついたマスにプレイヤーが入ると → 見つける。追いかけ方は別にえらぼう。',empty:'近くで見つける設定（18m）',center:'敵のいるマスが中心。敵と一緒に動くよ。',color:'#efcf74'}
};
export function renderAttackRange(parent,o,api){renderEnemyRange(parent,o,api,'attackRange');}
export function renderEnemyRange(parent,o,{save,rebuild,showRange,getRangeView,getProject,lookFromAbove},key){
 const config=RANGE_UI[key],row=document.createElement('div'),edit=document.createElement('button'),open=document.createElement('button'),label=document.createElement('span'),summary=document.createElement('small');edit.className='enemy-range-choice';edit.dataset.range=key;edit.setAttribute('aria-pressed',String((getRangeView?.()||'attackRange')===key));edit.style.setProperty('--range-color',config.color);setReadingText(label,`▦ ${config.label}マス`);edit.setAttribute('aria-label',kanaText(`▦ ${config.label}マスをステージに表示`));
 const names={cross:'十字',circle:'円',mixed:'十字＋円',custom:'自分でつくった形'};
 const update=()=>setReadingText(summary,o[key]?`${o[key].space==='world'?'マップ上':(o[key].space==='facing'?'敵の向き・':'')+names[o[key].shape]}・${o[key].cells.length}マス`:config.empty);update();
 row.className='enemy-range-row';setReadingText(open,'へんしゅう');open.className='enemy-range-edit';open.setAttribute('aria-label',kanaText(`${config.label}マスをへんしゅう`));edit.onclick=()=>showRange?.(key);
 open.onclick=()=>{closeLiveRangeEditor();showRange?.(key);if(key==='moveRange')openMoveMap(o,{getProject,save,rebuild,lookFromAbove,onClose:update});else openConfiguredRange(o,{key,config,getProject,save,rebuild,lookFromAbove,onClose:update});};edit.append(label,summary);row.append(edit,open);parent.append(row);
}
function openConfiguredRange(o,api){
 const {key,config}=api,renderMode=parent=>renderRangeMode(parent,o,api);
 if(o[key]?.space==='world')openMoveMap(o,{...api,renderMode});else openRangeEditor(o,{...api,renderMode});
}
function renderRangeMode(parent,o,api){
 const {key,save,rebuild}=api,row=document.createElement('label'),caption=document.createElement('span'),select=document.createElement('select'),notice=document.createElement('p');row.className='field choice-field';notice.hidden=true;setReadingText(caption,'はんいの決め方');select.setAttribute('aria-label','はんいの決め方');
 for(const [value,label]of [['world','マップのエリアを指定'],['facing','敵の向きに合わせる（90°ごと）'],['legacy','敵と移動する・回転しない']])select.add(new Option(kanaText(label),value));select.value=o[key]?.space||'legacy';row.append(caption,select);parent.append(row,notice);
 select.onchange=()=>{const next=convertRangeSpace(o[key],select.value,o);if(!next){select.value=o[key]?.space||'legacy';notice.hidden=false;setReadingText(notice,'切り替えるには、敵の中心からたて・よこ８マス以内に収めてね。今のマスは変更していないよ。');return;}closeLiveRangeEditor();o[key]=next;save();rebuild();openConfiguredRange(o,api);};
 if(o[key]?.space==='facing'){
  const rotate=document.createElement('button');const label=()=>setReadingText(rotate,`↻ 敵を90°回す（今：${{0:'マップの奥',90:'マップの左',180:'マップの手前',270:'マップの右'}[o.facing||0]}）`);label();rotate.onclick=()=>{o.facing=((o.facing||0)+90)%360;label();save();rebuild();};parent.append(rotate);
 }
}
function openRangeEditor(o,{key,config,save,rebuild,lookFromAbove,onClose,renderMode}){
 const r=o[key]?structuredClone(o[key]):{shape:'custom',cross:4,circle:4,cells:[]},d=document.createElement('section');d.className='enemy-range-dialog range-live-panel';d.setAttribute('role','region');d.setAttribute('aria-label',config.title);d.style.setProperty('--range-color',config.color);
 const h=document.createElement('h2'),note=document.createElement('p'),controls=document.createElement('div'),grid=document.createElement('div'),count=document.createElement('p'),close=document.createElement('button');
 h.setAttribute('tabindex','-1');h.setAttribute('autofocus','');setReadingText(h,config.title);setReadingText(note,config.note+' マスをタップすると、ステージにもすぐ反映されるよ。');
 controls.className='range-controls';grid.className='enemy-range-grid';grid.setAttribute('role','group');grid.setAttribute('aria-label',config.label+'はんいのマス');count.setAttribute('aria-live','polite');
 function choose(label,values,value,change){const l=document.createElement('label'),s=document.createElement('span'),select=document.createElement('select');setReadingText(s,label);select.setAttribute('aria-label',label);for(const [v,text]of values)select.add(new Option(kanaText(text),v));select.value=value;select.onchange=()=>change(select.value);l.append(s,select);controls.append(l);return select;}
 const sizes={};
 const shape=choose('はんいの形',[['cross','十字'],['circle','円'],['mixed','十字＋円'],['custom','自分でマスをえらぶ']],r.shape,v=>{r.shape=v;if(v==='mixed'&&r.cross<=r.circle){r.circle=Math.min(r.circle,6);r.cross=r.circle+2;}if(v!=='custom')r.cells=rangeCells(v,r.cross,r.circle);changed();});
 for(const [key,label]of [['cross','十字の長さ'],['circle','円の広さ']])sizes[key]=choose(label,Array.from({length:RANGE_MAX},(_,i)=>[String(i+1),`${i+1}マス`]),String(r[key]),v=>{r[key]=Number(v);if(r.shape!=='custom')r.cells=rangeCells(r.shape,r.cross,r.circle);changed();});
 const clear=document.createElement('button');setReadingText(clear,'全部のマスをけす');clear.onclick=()=>{r.cells=[];r.shape='custom';shape.value='custom';changed();};
 const buttons=new Map();for(let z=-RANGE_MAX;z<=RANGE_MAX;z++)for(let x=-RANGE_MAX;x<=RANGE_MAX;x++){
  const b=document.createElement('button'),key=`${x},${z}`;b.type='button';b.setAttribute('aria-label',`横 ${x} 奥行 ${z} のマス`);b.textContent=x===0&&z===0?'🤖':'';markRobotCell(b,x===0&&z===0);
  b.onclick=()=>{const i=r.cells.findIndex(c=>c[0]===x&&c[1]===z);if(i<0)r.cells.push([x,z]);else r.cells.splice(i,1);r.shape='custom';shape.value='custom';changed();};buttons.set(key,b);grid.append(b);
 }
 function paint(){const active=new Set(r.cells.map(c=>c.join(',')));for(const [key,b]of buttons){const on=active.has(key);b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));}for(const key of ['cross','circle']){sizes[key].value=String(r[key]);sizes[key].disabled=!['cross','circle','mixed'].includes(shape.value)||(shape.value==='cross'&&key==='circle')||(shape.value==='circle'&&key==='cross');}setReadingText(count,`${config.label}マス：${r.cells.length}個 ／ 中心から、たて・よこ８マスまで。`+(r.space==='facing'?'顔の向きに合わせて、マスが90°ごとに回るよ。':'敵と一緒に移動するよ。顔が向きを変えても、マスは回らないよ。'));}
 function changed(){o[key]=structuredClone(r);paint();save();rebuild();}
 setReadingText(close,'できた・とじる');close.className='primary';
 const view=document.createElement('button');setReadingText(view,'↑ マスと同じ向きで上から見る');view.onclick=()=>lookFromAbove?.({facing:r.space==='facing'});
 const presets=document.createElement('div');presets.className='range-preset-controls';presets.append(controls,clear);
 const heading=document.createElement('div');heading.className='range-live-heading';heading.append(h,close);
 const modeControls=document.createElement('div');modeControls.className='range-mode-controls';renderMode?.(modeControls);d.append(heading,modeControls,note,presets,view,directionFrame(grid,{facing:r.space==='facing'}),count);paint();close.onclick=mountLiveRangeEditor(d,onClose);h.focus({preventScroll:true});
}
