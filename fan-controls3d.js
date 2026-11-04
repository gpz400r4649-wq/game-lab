import {makeFacingFan,RANGE_MAX} from './enemy-range3d.js?v=20261104i';
import {setReadingText} from './readings3d.js?v=20261104i';
import {configureNumericInput} from './numeric3d.js?v=20261104i';
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
 function field(label,name,values,min,max){const row=document.createElement('div'),caption=document.createElement('b'),buttons=document.createElement('div'),input=document.createElement('input');setReadingText(caption,label);buttons.className='fan-choices';input.setAttribute('aria-label',label+'を数字で設定');
  for(const [n,text]of values){const b=document.createElement('button');setReadingText(b,text);b.onclick=()=>{if(name==='angle')angle=n;else radius=n;apply();};buttons.append(b);choices.push({name,n,b});}
  configureNumericInput(input,{value:name==='angle'?angle:radius,min,max,step:1,onValue:n=>{n=Math.round(n);if(name==='angle')angle=n;else radius=n;apply();return n;},onCommit:()=>{}});inputs[name]=input;
  row.append(caption,buttons);if(name!=='angle')row.append(input);else if(editStage){const edit=document.createElement('button');setReadingText(edit,'ステージで直接編集');edit.onclick=editStage;buttons.append(edit);}box.append(row);
 }
 field(key==='attackRange'?'撃つ向きの広さ（度）':'視野の広さ（度）','angle',[[45,'せまい（45°）'],[90,'90°']],5,360);
 field(key==='attackRange'?'何マス先から撃つ？':'何マス先まで気づく？','radius',[[2,'近い：2'],[3,'ふつう：3'],[6,'遠い：6']],1,RANGE_MAX);
 box.append(note);parent.append(box);
 return ()=>{const current=fanSettings(r,preferred);if(current){angle=current.angle;radius=current.radius;}inputs.angle.value=angle;inputs.radius.value=radius;for(const c of choices)c.b.setAttribute('aria-pressed',String(!!current&&current[c.name]===c.n));setReadingText(note,current?`今の広さ：${current.angle}度。もっと自由に変えるときは、ステージで直接編集しよう。`:'今はマスで調整した形だよ。広さ・遠さを変えると扇形に置き換わるよ。');};
}
