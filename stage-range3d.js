import {mountLiveRangeEditor} from './range-panel3d.js?v=20261105a';
import {worldMoveRange,rangeCell,MOVE_MAX_CELLS,convertRangeSpace,fitRoamingEnemy} from './enemy-range3d.js?v=20261105a';
import {worldSize} from './world3d.js?v=20261105a';
import {setReadingText} from './readings3d.js?v=20261105a';
let painter=null;
export function setStageRangePainter(next){painter=next;}
export function stageRangePointer(kind,id,point){return painter?.(kind,id,point)||false;}
export function paintMoveCells(range,from,to,erase,half,accept=()=>true){
 if(!to||Math.abs(to.x)>half||Math.abs(to.z)>half)return false;
 const end=[rangeCell(to.x),rangeCell(to.z)],start=from?[rangeCell(from.x),rangeCell(from.z)]:end,steps=Math.max(Math.abs(end[0]-start[0]),Math.abs(end[1]-start[1]),1),cells=new Set(range.cells.map(c=>c.join(',')));let changed=false;
 for(let i=0;i<=steps;i++){const x=Math.round(start[0]+(end[0]-start[0])*i/steps),z=Math.round(start[1]+(end[1]-start[1])*i/steps),key=`${x},${z}`;if(Math.abs(x)>Math.floor(half/4)||Math.abs(z)>Math.floor(half/4)||!accept(x,z))continue;
  if(erase){if(cells.delete(key))changed=true;}else if(!cells.has(key)&&cells.size<MOVE_MAX_CELLS){cells.add(key);changed=true;}
 }
 if(changed)range.cells=[...cells].map(k=>k.split(',').map(Number));return changed;
}
export function openStageMoveRange(o,{getProject,save,rebuild,lookFromAbove,onClose,key='moveRange'}){
 const movement=key==='moveRange',name=movement?'動ける':key==='searchRange'?'気づく':'攻撃する',color=movement?'青':key==='searchRange'?'黄色':'赤';
 const source=o[key]||{shape:'custom',cross:2,circle:2,cells:[],space:movement?'world':'facing'},space=source.space||'legacy';
 const panel=document.createElement('section');panel.className='range-live-panel';panel.setAttribute('role','region');panel.setAttribute('aria-label',`ステージで${name}マスをぬる`);
 const heading=document.createElement('div'),title=document.createElement('h2'),close=document.createElement('button'),note=document.createElement('p'),toolbar=document.createElement('div'),count=document.createElement('p');heading.className='range-live-heading';title.tabIndex=-1;setReadingText(title,`${name}マスをぬる`);setReadingText(close,'できた・とじる');close.className='primary';heading.append(title,close);
 setReadingText(note,`高さ${o.y||0}mのマスを編集しているよ。上の階は編集中だけ隠すよ。左のステージをなぞって、${color}のマスをぬろう。カメラは左下のスティックで動かせるよ。`+(space!=='world'?'敵からたて・よこ８マスまで。':''));toolbar.className='stage-range-tools';
 let mode='paint',pointer=null,previous=null,dirty=false;const buttons=[];
 const current=movement?worldMoveRange(source,o):convertRangeSpace(source,'world',o);
 const store=()=>{o[key]=movement||space==='world'?structuredClone(current):convertRangeSpace(current,space,o);};
 const accepts=(x,z)=>movement||space==='world'||!!convertRangeSpace({space:'world',cells:[[x,z]]},space,o);
 const refresh=()=>setReadingText(count,`${current.cells.length} / ${MOVE_MAX_CELLS}マス`);
 function commit(){if(dirty){if(movement&&fitRoamingEnemy(o,getProject()))rebuild();save();dirty=false;}pointer=null;previous=null;}
 for(const [value,label]of [['paint','ぬる'],['erase','けす'],['camera','カメラを回す']]){const button=document.createElement('button');setReadingText(button,label);button.onclick=()=>{commit();mode=value;buttons.forEach(([v,b])=>b.setAttribute('aria-pressed',String(v===mode)));};button.setAttribute('aria-pressed',String(value===mode));buttons.push([value,button]);toolbar.append(button);}
 const top=document.createElement('button');setReadingText(top,'↑ 上から見る');top.onclick=()=>lookFromAbove?.();
 const clear=document.createElement('button');setReadingText(clear,'全部のマスをけす');clear.onclick=()=>{commit();current.cells=[];store();save();rebuild();refresh();};
 const unlimited=document.createElement('button');setReadingText(unlimited,'移動の制限をなくす');unlimited.onclick=()=>{commit();delete o[key];save();rebuild();finish();};
 panel.append(heading,note,toolbar,top,count,clear);if(movement)panel.append(unlimited);refresh();
 const finish=mountLiveRangeEditor(panel,()=>{commit();painter=null;onClose?.();});close.onclick=finish;
 painter=(kind,id,point)=>{
  if(kind==='start'){if(mode==='camera')return false;if(pointer!==null)return true;pointer=id;previous=null;}
  else if(pointer!==id)return false;
  if(kind==='end'){commit();return true;}
  const half=worldSize(getProject())/2;
  if(point&&Math.abs(point.x)<=half&&Math.abs(point.z)<=half){if(paintMoveCells(current,previous,point,mode==='erase',half,accepts)){store();dirty=true;rebuild();refresh();}previous={x:point.x,z:point.z};}else previous=null;
  return true;
 };
 lookFromAbove?.();title.focus({preventScroll:true});
}
