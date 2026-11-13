import {createChoiceControl} from './choices3d.js?v=20261113j';
import {setReadingText,kanaText} from './readings3d.js?v=20261113j';
import {FALL_DEFAULTS,FALL_BLOCK_HEIGHT,fallDamageForDistance} from './fall-damage3d.js?v=20261113j';
const PLAYER_DEFAULTS={hp:5,speed:5,jumpHeight:49/38};
export function createPlayerRulesUI({root,getProject,field,save,friendlyFire}){
 let activePage='player';
 function render(){
  const p=getProject(),rules=p.playerRules||PLAYER_DEFAULTS,ensure=()=>p.playerRules??={...PLAYER_DEFAULTS},fall=()=>({...FALL_DEFAULTS,...p.playerRules?.fallDamage}),setFall=(key,value)=>{ensure().fallDamage={...fall(),[key]:value};};
  root.replaceChildren();root.className='player-rules-workspace';const tabs=document.createElement('div'),pages=new Map();tabs.className='player-rule-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','作品のルールの切り替え');root.append(tabs);
  const show=key=>{activePage=key;for(const [name,page]of pages)page.hidden=name!==key;for(const button of tabs.children){button.classList.toggle('active',button.dataset.page===key);button.setAttribute('aria-selected',String(button.dataset.page===key));}};
  for(const [key,name]of [['player','プレイヤー'],['fall','落下ダメージ'],['items','持ちもの・弾の当たり方']]){const button=document.createElement('button'),page=document.createElement('section');button.type='button';button.dataset.page=key;button.setAttribute('role','tab');button.setAttribute('aria-controls','player-rules-'+key);setReadingText(button,name);page.id='player-rules-'+key;page.setAttribute('role','tabpanel');page.setAttribute('aria-label',name);pages.set(key,page);button.onclick=()=>show(key);tabs.append(button);root.append(page);}
  for(const [key,label,min,max,step]of [['hp','プレイヤーの体力',1,100,1],['speed','歩く速さ',1,12,.5],['jumpHeight','ジャンプの高さ（m）',.5,8,.1]])field(pages.get('player'),label,rules[key],min,max,step,n=>ensure()[key]=n);
  const pane=pages.get('fall'),toggle=createChoiceControl(),title=document.createElement('h3'),note=document.createElement('p'),cards=document.createElement('div'),examples=document.createElement('div'),controls=[];
  setReadingText(title,'高いところから落ちたら？');toggle.setAttribute('aria-label','落下ダメージを受ける？');for(const [value,label]of [['off','なし'],['on','あり']])toggle.add(new Option(kanaText(label),value));toggle.value=fall().enabled?'on':'off';cards.className='fall-rule-cards';examples.className='fall-damage-examples';examples.setAttribute('aria-live','polite');note.className='fall-rule-note';
  function tuning(label,key,min,max,options){const card=document.createElement('div');card.className='fall-rule-card';const row=field(card,label,fall()[key],min,max,1,n=>{setFall(key,Math.round(n));sync();return Math.round(n);}),choices=createChoiceControl();choices.setAttribute('aria-label',label+'の見本');for(const [value,text]of options)choices.add(new Option(kanaText(text),String(value)));choices.onchange=()=>{setFall(key,Number(choices.value));save();sync();};controls.push({card,input:row.querySelector('input'),choices,key});card.append(choices);cards.append(card);}
  tuning('何ブロック以上落ちたら？','minBlocks',1,20,[[2,'２ブロック（6m）'],[3,'３ブロック（9m）'],[5,'５ブロック（15m）']]);
  tuning('減る体力','damage',1,10,[[1,'すこし：１'],[2,'ふつう：２'],[5,'大きい：５']]);
  function sync(){const r=fall();for(const {input,choices,key}of controls){input.value=r[key];input.disabled=!r.enabled;choices.disabled=!r.enabled;choices.value=String(r[key]);}examples.replaceChildren();const heading=document.createElement('h4');setReadingText(heading,r.enabled?'いまの設定の見本':'いまは落下ダメージなし');examples.append(heading);for(const n of [Math.max(0,r.minBlocks-1),r.minBlocks,r.minBlocks+1]){const row=document.createElement('p');setReadingText(row,`${n}ブロック（${n*FALL_BLOCK_HEIGHT}m）落ちる → 体力 ${fallDamageForDistance(n*FALL_BLOCK_HEIGHT,r)} へる`);examples.append(row);}setReadingText(note,'１ブロックの高さ＝3m。決めた高さ以上でダメージを受け、さらに１ブロック高いごとに、同じ数ずつダメージが増えるよ。ジャンプ台に着地したときはダメージなし。');}
  toggle.onchange=()=>{setFall('enabled',toggle.value==='on');save();sync();};pane.append(title,toggle,cards,examples,note);sync();
  const inventory=pages.get('items'),label=document.createElement('h3'),guns=document.createElement('div');setReadingText(label,'最初に持つ銃');guns.className='player-starting-guns';inventory.append(label,guns);
  for(const gun of p.loadout){const row=document.createElement('label'),input=document.createElement('input'),caption=document.createElement('span');row.className='enemy-attack-toggle';input.type='checkbox';input.checked=!gun.pickupOnly;setReadingText(caption,gun.name);input.onchange=()=>{gun.pickupOnly=!input.checked;save();};row.append(input,caption);guns.append(row);}
  if(friendlyFire)inventory.append(friendlyFire);show(activePage);
 }
 return {render};
}
