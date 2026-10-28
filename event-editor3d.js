import {setReadingText,applyReadings,kanaText} from './readings3d.js?v=20261028f';
import {EVENT_TYPES,EVENT_LIMIT,ACTION_NAMES,AMOUNT_ACTIONS,TARGET_ACTIONS,actionsFor,newAction} from './events3d.js?v=20261028f';

export function renderEventEditor(parent,o,p,{selectField,field,save,rebuild,inspect,partNames}){
  if(!EVENT_TYPES.has(o.type))return;
  const panel=document.createElement('section');panel.className='event-rules';
  const heading=document.createElement('h3');setReadingText(heading,'イベントをつくる');panel.append(heading);
  const trigger=document.createElement('p');trigger.className='event-trigger';
  setReadingText(trigger,['star','key','heal'].includes(o.type)?'① このアイテムを取ったとき':o.type==='door'?'① 設定した条件を満たしたとき':o.type==='goal'?'① 条件を満たして、ここにふれたとき':'① ここにふれたとき');panel.append(trigger);
  const note=document.createElement('p');note.className='component-description';setReadingText(note,'② 起きることをえらぼう。いくつか組み合わせてもOK。遊ぶたびに、それぞれ１回だけ起きるよ。');panel.append(note);
  const actions=actionsFor(o),commit=()=>{o.events=actions;save();rebuild();};
  actions.forEach((a,i)=>{
    const card=document.createElement('div');card.className='event-action';
    selectField(card,`${i+1}番目に起きること`,Object.entries(ACTION_NAMES),a.type,type=>{actions[i]=newAction(type,o);commit();inspect();});
    if(AMOUNT_ACTIONS.has(a.type))field(card,a.type==='heal'?'回復する体力':'ふやす得点',a.amount,1,a.type==='heal'?5:20,1,n=>{a.amount=Math.round(n);commit();});
    if(TARGET_ACTIONS.has(a.type)){
      const candidates=a.type==='giveTool'?p.loadout.map(t=>[t.id,t.name+(t.pickupOnly?'（拾って使う）':'（最初から持つ）')]):p.objects.flatMap((x,index)=>x.type===(a.type==='openDoor'?'door':'enemy')?[[x.id,`${index+1}. ${partNames[x.type]}${x.id===o.id?'（このドア）':''}${x.type==='enemy'?(x.startsHidden?'（出現を待つ）':'（最初からいる）'):''}`]]:[]);
      const missing=!!a.target&&!candidates.some(([id])=>id===a.target);
      selectField(card,a.type==='giveTool'?'ひろう銃':a.type==='spawnEnemy'?'出現する敵':'あけるドア',[['','対象をえらぼう'],...(missing?[[a.target,'対象が削除されています']]:[]),...candidates],a.target,v=>{a.target=v;commit();inspect();});
      const target=p.objects.find(x=>x.id===a.target);
      let hint='';
      if(missing)hint='対象が削除されています。もう一度えらぼう。';
      else if(!a.target)hint=a.type==='giveTool'?'先に「持ちもの・銃をつくる」で銃を用意して、ここでえらぼう。':a.type==='spawnEnemy'?'先に出現させたい場所に敵を置いて、ここでえらぼう。':'先にドアを置いて、ここでえらぼう。';
      else if(a.type==='spawnEnemy'&&!target?.startsHidden)hint='この敵は最初からいます。「イベントで出現を待つ」にすると、このイベントで現れるよ。';
      else if(a.type==='giveTool'&&!p.loadout.find(t=>t.id===a.target)?.pickupOnly)hint='この銃は最初から持っています。銃の設定を「拾って使う」に変えると、拾うまで使えなくなるよ。';
      if(hint){const text=document.createElement('p');text.className='recipe-hint';setReadingText(text,hint);card.append(text);}
      if(a.type==='spawnEnemy'&&target&&!target.startsHidden){const prepare=document.createElement('button');setReadingText(prepare,'この敵を「イベントで出現を待つ」にする');prepare.onclick=()=>{target.startsHidden=true;commit();inspect();};card.append(prepare);}
    }
    const remove=document.createElement('button');setReadingText(remove,'このイベントをはずす');remove.setAttribute('aria-label',`${i+1}番目のイベントをはずす`);remove.onclick=()=>{actions.splice(i,1);commit();inspect();};card.append(remove);panel.append(card);
  });
  if(!actions.length){const empty=document.createElement('p');empty.className='component-description';setReadingText(empty,['star','key','heal'].includes(o.type)?'今は何も起きません。アイテムは取ると消えます。':'今は何も起きません。起きることを追加しよう。');panel.append(empty);}
  const add=document.createElement('button');setReadingText(add,'＋ 起きることを追加');add.disabled=actions.length>=EVENT_LIMIT;add.onclick=()=>{actions.push(newAction('addScore',o));commit();inspect();};panel.append(add);
  if(o.events!==undefined){const reset=document.createElement('button');setReadingText(reset,'この部品の元の役割にもどす');reset.onclick=()=>{delete o.events;save();rebuild();inspect();};panel.append(reset);}
  parent.append(panel);
}
