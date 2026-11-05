import {fitRoamingEnemy} from './enemy-range3d.js?v=20261105g';
import {ENEMY_BEHAVIOR_EXAMPLES,enemyBehaviorExampleKey,applyEnemyBehaviorExample,enemyBehaviorFlow} from './enemy-behavior-presets3d.js?v=20261105g';
import {setReadingText} from './readings3d.js?v=20261105g';
export function renderBehaviorExamples(parent,o,{save,rebuild,inspect,getProject}){
 const box=document.createElement('div'),button=document.createElement('button'),summary=document.createElement('p');box.className='enemy-behavior-launcher';button.className='enemy-behavior-open';setReadingText(button,`▦ 動きの見本をえらぶ（${Object.keys(ENEMY_BEHAVIOR_EXAMPLES).length}種類）`);summary.className='enemy-behavior-summary';summary.setAttribute('aria-live','polite');box.append(button,summary);parent.append(box);
 const sync=()=>{const key=enemyBehaviorExampleKey(o),name=key==='custom'?'自分でちょうせいした動き':ENEMY_BEHAVIOR_EXAMPLES[key].name;setReadingText(summary,'今の動き：'+name);};sync();
 button.onclick=()=>{
  const dialog=document.createElement('dialog'),title=document.createElement('h2'),note=document.createElement('p'),grid=document.createElement('div'),hint=document.createElement('p'),close=document.createElement('button');dialog.className='enemy-behavior-dialog';title.tabIndex=-1;title.setAttribute('autofocus','');setReadingText(title,'どんな動きにする？');setReadingText(note,'ふだんの動き・気づいた後の動き・速さをまとめてえらぶよ。マスと攻撃の設定はそのまま。えらんだ後も、それぞれ変えられるよ。');grid.className='enemy-behavior-examples';
  const current=enemyBehaviorExampleKey(o);for(const [key,example]of Object.entries(ENEMY_BEHAVIOR_EXAMPLES)){
   const card=document.createElement('button'),name=document.createElement('b'),flow=document.createElement('span'),speed=document.createElement('small');card.className='enemy-behavior-example';card.setAttribute('aria-pressed',String(current===key));setReadingText(name,example.icon+' '+example.name);setReadingText(flow,example.flow);setReadingText(speed,example.program.length?'動きの速さ：'+example.program[0].speed:'移動しない');card.append(name,flow,speed);
   card.onclick=()=>{applyEnemyBehaviorExample(o,key);fitRoamingEnemy(o,getProject?.());dialog.close();dialog.remove();save();rebuild();inspect();};grid.append(card);
  }
  setReadingText(hint,'「行ったり来たり」は２か所の往復ルートを歩くよ。歩き回る・追いかける動きは「動けるマス」の中で動くよ。「気づくマス」で気づく場所を変えよう。攻撃してくるか・どんな銃を持つかは、攻撃の設定でえらべるよ。');hint.className='component-description';setReadingText(close,'えらばずにもどる');close.onclick=()=>{dialog.close();dialog.remove();};dialog.oncancel=e=>{e.preventDefault();close.onclick();};dialog.append(title,note,grid,hint,close);document.body.append(dialog);dialog.showModal();
 };
 return sync;
}
