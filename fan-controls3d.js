import {makeFacingFan,RANGE_MAX} from './enemy-range3d.js?v=20261110p';
import {setReadingText} from './readings3d.js?v=20261110p';
import {configureNumericInput} from './numeric3d.js?v=20261110p';
export function fanSettings(range,preferred=120){
 if(!range||range.space==='world')return null;
 const stamp=cells=>cells.map(c=>c.join(',')).sort().join(';'),saved=stamp(range.cells);
 for(const angle of [...new Set([range.fanAngle,preferred,45,90,120,180,360].filter(a=>Number.isFinite(a)&&a>=5&&a<=360))])for(let radius=1;radius<=RANGE_MAX;radius++)if(saved===stamp(makeFacingFan(radius,angle).cells))return {angle,radius};
 return null;
}
export function renderFanControls(parent,r,key,changed,editStage){
 const preferred=key==='attackRange'?90:120,initial=fanSettings(r,preferred);let angle=initial?.angle||preferred,radius=initial?.radius||(key==='attackRange'?2:3);
 const box=document.createElement('div'),note=document.createElement('p');box.className='fan-controls';const choices=[],inputs={};
 function apply(){const space=r.space;Object.assign(r,makeFacingFan(radius,angle));if(space===undefined)delete r.space;else r.space=space;changed();}
 function field(label,name,values,min,max){const row=document.createElement('div'),caption=document.createElement('b'),buttons=document.createElement('div'),input=document.createElement('input');row.className='range-control-group';row.dataset.control=name;setReadingText(caption,label);buttons.className='fan-choices';input.setAttribute('aria-label',label+'を数字で設定');
  for(const [n,text]of values){const b=document.createElement('button');setReadingText(b,text);b.onclick=()=>{if(name==='angle')angle=n;else radius=n;apply();};buttons.append(b);choices.push({name,n,b});}
  configureNumericInput(input,{value:name==='angle'?angle:radius,min,max,step:1,onValue:n=>{n=Math.round(n);if(name==='angle')angle=n;else radius=n;apply();return n;},onCommit:()=>{}});inputs[name]=input;
  row.append(caption,buttons);if(name!=='angle'){const entry=document.createElement('label'),unit=document.createElement('span');entry.className='range-distance-entry';setReadingText(unit,'マス');entry.append(input,unit);row.append(entry);}else if(editStage){const edit=document.createElement('button');setReadingText(edit,'自由にマスをぬって決める');edit.onclick=editStage;buttons.append(edit);}box.append(row);
 }
 field(key==='attackRange'?'撃つ方向の広さ':'見える方向の広さ','angle',[[45,'せまい（45°）'],[90,'90°']],5,360);
 field(key==='attackRange'?'敵から何マス先まで撃つ？':'敵から何マス先まで見える？','radius',[[2,'近く（2マス）'],[3,'中くらい（3マス）'],[6,'遠く（6マス）']],1,RANGE_MAX);
 note.className='range-current-summary';note.setAttribute('aria-live','polite');box.append(note);parent.append(box);
 return ()=>{const current=fanSettings(r,preferred);if(current){angle=current.angle;radius=current.radius;}inputs.angle.value=angle;inputs.radius.value=radius;for(const c of choices)c.b.setAttribute('aria-pressed',String(!!current&&current[c.name]===c.n));setReadingText(note,current?`いまの設定　広さ ${current.angle}度・遠さ ${current.radius}マス`:'今はマスで調整した形だよ。広さ・遠さを変えると扇形に置き換わるよ。');};
}
