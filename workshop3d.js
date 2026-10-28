import {setReadingText,applyReadings,kanaText} from './readings3d.js?v=20261028h';
import {actionsFor} from './events3d.js?v=20261028h';
import {renderEventEditor} from './event-editor3d.js?v=20261028h';
import {DESTRUCTIBLE_TYPES,LIMITS} from './weapons3d.js?v=20261028h';
import {rotatePiece,alignPiece,gridStep,GRID_PARTS,editorPlacementReason} from './building3d.js?v=20261028h';
import {PARTS,ENEMY_PRESETS,WEAPON_PRESETS,CONDITION_NAMES,clamp} from './engine3d.js?v=20261028h';

const ICONS={weapon:'🔫',select:'↖',ramp:'◩',wall:'▥',floor:'▱',roof:'⌂',box:'▧',platform:'▰',moving:'↔',bounce:'⇧',enemy:'🤖',star:'✦',key:'⚿',door:'▣',heal:'♥',checkpoint:'⚑',hazard:'⚠',goal:'🏁',erase:'⌫'};
const DESCRIPTIONS={weapon:'地面に置いて、ふれると拾える銃。持ちもの・銃づくりで用意した銃をえらぼう。',ramp:'低いほうから歩くと、そのまま登れるスロープ。回して好きな向きにつなげよう。',wall:'家を囲う壁。向きを変えてつなげよう。',floor:'家の床と天井に使える板。壁の内側にぴったり合うよ。',roof:'壁の上にのせる三角屋根。向きを変えて家を仕上げよう。',
  box:'かべや建物をつくれる、かたいブロック。',platform:'ジャンプで乗れる足場。高さを変えてコースにしよう。',
  moving:'置くだけで行ったり来たり。乗ると一緒に運んでくれるよ。',bounce:'ふれると大ジャンプ！ 飛ぶ強さを変えてみよう。',
  enemy:'行動タイプを選ぶだけで動くよ。速さと体力で難しさを変えよう。',star:'ふれると拾える星。得点をもらうほか、銃を拾うなどの役割にも変えられるよ。',
  key:'ふれると拾えるアイテム。取ったときに何が起きるか、イベントで変えられるよ。',door:'カギや星などの条件でイベントが起きるよ。開ける以外の役割も作れるよ。',
  heal:'回復だけなら体力が減ったときに拾えるよ。ほかのイベントを加えると、体力が満タンでも拾えるよ。',checkpoint:'ふれたときのイベントを作ろう。元の役割は、ここから復活できる場所の記録だよ。',
  hazard:'ふれると体力が減る床。ジャンプで飛び越えてみよう。',goal:'置いただけではクリアできないよ。どんな条件でクリアにするか、自分でえらぼう。'
};

export function confirmReplace(message){
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog'),title=document.createElement('h2'),text=document.createElement('p'),cancel=document.createElement('button'),accept=document.createElement('button');
    setReadingText(title,'作品を切り替えますか？');setReadingText(text,message);setReadingText(cancel,'もどる');setReadingText(accept,'置き換える');accept.className='primary';
    const finish=value=>{dialog.close();dialog.remove();resolve(value);};cancel.onclick=()=>finish(false);accept.onclick=()=>finish(true);dialog.oncancel=e=>{e.preventDefault();finish(false);};dialog.append(title,text,cancel,accept);document.body.append(dialog);dialog.showModal();
  });
}

export function createWorkshop(api){
  const {$,getProject,getSelected,select,save,rebuild,field,advancedInspector,advancedWeaponFields,loadProject,setTool}=api;
  function selectField(parent,label,entries,value,onchange){
    const row=document.createElement('label');row.className='field choice-field';const text=document.createElement('span');setReadingText(text,label);
    const input=document.createElement('select');input.setAttribute('aria-label',label);for(const [key,name] of entries)input.add(new Option(kanaText(name),key));input.value=value;
    input.onchange=()=>{onchange(input.value);save();rebuild();};row.append(text,input);parent.append(row);return input;
  }
  function details(label,children,open=false){const d=document.createElement('details'),s=document.createElement('summary');setReadingText(s,label);d.open=open;d.append(s,...children);return d;}
  function inspect(){
    const el=$('#inspector3'),wasOpen=el.querySelector('.advanced-program')?.open;
    advancedInspector();const loop=el.querySelector('.loop');el.replaceChildren();
    const p=getProject(),o=p.objects.find(o=>o.id===getSelected());
    if(!o){const note=document.createElement('p');note.className='empty';setReadingText(note,'空のステージに、使いたい部品を置こう。敵の動きやクリア条件は、自分でえらんで作れるよ。');el.append(note);return;}
    const title=document.createElement('h2');title.className='inspector-heading';setReadingText(title,`${ICONS[o.type]} ${PARTS[o.type]}`);
    const description=document.createElement('p');description.className='component-description';setReadingText(description,DESCRIPTIONS[o.type]);el.append(title,description);
    const s=o.settings;
    if(o.type==='weapon'){
      const missing=o.weaponId&&!p.loadout.some(t=>t.id===o.weaponId);
      selectField(el,'ひろう銃',[['','銃をえらぼう'],...(missing?[[o.weaponId,'銃が削除されています']]:[]),...p.loadout.map(t=>[t.id,t.name+(t.pickupOnly?'（拾って使う）':'（最初から持つ）')])],o.weaponId||'',v=>{o.weaponId=v;inspect();});
      const gun=p.loadout.find(t=>t.id===o.weaponId),note=document.createElement('p');note.className='component-description';setReadingText(note,!gun?'まだ銃が決まっていません。先に銃をつくり、ここでえらぼう。':gun.pickupOnly?'この銃は拾うまで使えないよ。':'この銃は最初から持っています。拾って使う設定にすると、拾うまで使えなくなるよ。');el.append(note);
      if(gun&&!gun.pickupOnly){const prepare=document.createElement('button');setReadingText(prepare,'この銃を「拾って使う」にする');prepare.onclick=()=>{gun.pickupOnly=true;save();inspect();};el.append(prepare);}
    }
    if(DESTRUCTIBLE_TYPES.has(o.type)){field(el,'ブロックの体力',o.hp,1,LIMITS.maxBlockHp,1,n=>o.hp=Math.round(n));selectField(el,'弾が当たったら',[['yes','体力がなくなると壊れる'],['no','こわれない']],o.destructible===false?'no':'yes',v=>o.destructible=v==='yes');}
    if(o.type==='enemy'){
      selectField(el,'いつ出現する？',[['start','最初からいる'],['event','イベントで出現を待つ']],o.startsHidden?'event':'start',v=>{o.startsHidden=v==='event';inspect();});
      const preset=Object.keys(ENEMY_PRESETS).find(k=>JSON.stringify(ENEMY_PRESETS[k].program)===JSON.stringify(o.program))||'custom';
      selectField(el,'行動タイプ',[...Object.entries(ENEMY_PRESETS).map(([k,v])=>[k,v.name]),['custom','自分で工夫した動き']],preset,k=>{if(k!=='custom')o.program=structuredClone(ENEMY_PRESETS[k].program);inspect();});
      field(el,'体力',o.hp,1,20,1,n=>o.hp=Math.round(n));
      if(o.program.length)field(el,'動きの速さ',o.program[0].speed,.5,8,.5,n=>{o.program.forEach(b=>b.speed=n);});
      if(loop){const d=details('さらに工夫する：うごきを組む',[loop],wasOpen);d.className='advanced-program';el.append(d);}
    }
    if(o.type==='moving'){
      selectField(el,'動く方向',[['x','左右'],['z','前後'],['y','上下']],s.axis,v=>s.axis=v);
      field(el,'動くはんい',s.distance,.5,8,.5,n=>s.distance=n);field(el,'動く速さ',s.speed,.5,5,.5,n=>s.speed=n);
    }
    if(['hazard','bounce'].includes(o.type)){
      const [label,min,max]=({star:['もらえる得点',1,20],heal:['回復する体力',1,5],hazard:['減る体力',1,5],bounce:['飛ぶ強さ',5,14]})[o.type];
      field(el,label,s.value,min,max,1,n=>s.value=Math.round(n));
    }
    if(o.type==='door'||o.type==='goal'){
      const rules=document.createElement('div');rules.className='recipe-rule';
      const trigger=document.createElement('b');setReadingText(trigger,o.type==='goal'?'① ゴールにふれたとき':'① 条件をたしかめる');rules.append(trigger);
      selectField(rules,'② 条件',Object.entries(CONDITION_NAMES).map(([k,v])=>[k,k==='touch'?(o.type==='door'?'いつでも':'ふれるだけ'):k==='unset'?'条件をえらぶ（まだ動かない）':v]),s.condition,v=>{s.condition=v;inspect();});
      if(['stars','keys'].includes(s.condition))field(rules,'必要な数',s.required,1,20,1,n=>{s.required=Math.round(n);updateRuleHint();});
      el.append(rules);
      function updateRuleHint(){if(!['stars','keys'].includes(s.condition))return;const type=s.condition==='stars'?'star':'key',count=p.objects.reduce((n,x)=>n+[...actionsFor(x),...(x.destroyEvents||[])].filter(a=>a.type===(type==='star'?'addStar':'addKey')||(a.type==='dropItem'&&a.target===type)).length,0);let note=el.querySelector('.recipe-hint');if(!note){note=document.createElement('p');note.className='recipe-hint';el.append(note);}note.hidden=count>=s.required;setReadingText(note,`いまのイベントで増やせる${PARTS[type]}は${count}個。あと${Math.max(0,s.required-count)}個ぶんの効果を足すか、必要な数を減らそう。`);}
      updateRuleHint();
    }
    renderEventEditor(el,o,p,{selectField,field,save,rebuild,inspect,partNames:PARTS});
    const label=document.createElement('div');label.className='small-heading';setReadingText(label,'置く場所をちょうせい');el.append(label);
    const nudges=document.createElement('div');nudges.className='nudge-grid';
    for(const [name,key,amount] of [['← 左','x',-1],['奥へ ↑','z',-1],['右 →','x',1],['下げる','y',-.5],['手前 ↓','z',1],['上げる','y',.5]]){
      const button=document.createElement('button');setReadingText(button,name);button.onclick=()=>{const before={x:o.x,y:o.y,z:o.z};o[key]=clamp(o[key]+Math.sign(amount)*gridStep(o,key),key==='y'?0:-28,key==='y'?12:28);alignPiece(o);const reason=editorPlacementReason(o,p.objects.filter(x=>x.id!==o.id),p.spawn);if(reason){Object.assign(o,before);api.toast(reason);return;}save();rebuild();inspect();};nudges.append(button);
    }el.append(nudges);
    const fine=document.createElement('div'),positions=document.createElement('div');positions.className='position-fields';
    for(const [key,name,min,max] of [['x','横 X',-28,28],['y','高さ Y',0,12],['z','奥行 Z',-28,28]])field(positions,name,o[key],min,max,gridStep(o,key),n=>{o[key]=n;alignPiece(o);return o[key];});fine.append(positions);
    if(['box','platform','moving','door','bounce','hazard','wall','floor','roof','ramp'].includes(o.type))for(const [key,name] of [['w','はば'],['h','たかさ'],['d','おくゆき']])field(fine,name,o[key],['wall','floor','roof','bounce','hazard'].includes(o.type)?.2:.5,10,.5,n=>o[key]=n);
    el.append(details('位置・大きさを数字でちょうせい',[fine]));
    if(['wall','floor','roof','ramp'].includes(o.type)){const rotate=document.createElement('button');setReadingText(rotate,'↻ 90° 回す');rotate.onclick=()=>{rotatePiece(o);save();rebuild();inspect();};el.append(rotate);}
    const actions=document.createElement('div');actions.className='object-actions';
    const copy=document.createElement('button');setReadingText(copy,'＋ 同じ部品をもう１つ');copy.onclick=()=>{if(p.objects.length>=150){api.toast('部品は150個まで置けます');return;}const duplicate=structuredClone(o);duplicate.id=crypto.randomUUID();for(const a of duplicate.events||[])if(a.target===o.id)a.target=duplicate.id;let found=false;for(const [dx,dz] of [[Math.max(4,Math.ceil(o.w/4)*4),0],[0,Math.max(4,Math.ceil(o.d/4)*4)],[-Math.max(4,Math.ceil(o.w/4)*4),0],[0,-Math.max(4,Math.ceil(o.d/4)*4)]]){duplicate.x=o.x+dx;duplicate.z=o.z+dz;if(!GRID_PARTS.has(o.type)){duplicate.x=clamp(o.x+2,-28,28);duplicate.z=o.z;found=true;break;}alignPiece(duplicate);if(!editorPlacementReason(duplicate,p.objects,p.spawn)){found=true;break;}}if(!found){api.toast('隣のマスが空いていません');return;}p.objects.push(duplicate);select(duplicate.id);save();rebuild();api.objectList();inspect();};
    const del=document.createElement('button');setReadingText(del,'削除');del.className='danger';del.onclick=()=>{p.objects=p.objects.filter(x=>x.id!==o.id);select(null);save();rebuild();api.objectList();inspect();};actions.append(copy,del);el.append(actions);
  }
  function weapons(){if(api.renderLoadout){api.renderLoadout();return;}
    advancedWeaponFields();const el=$('#weapon3'),advanced=[...el.childNodes];el.replaceChildren();const p=getProject();
    const current=Object.keys(WEAPON_PRESETS).find(k=>['speed','interval','damage','spread'].every(field=>WEAPON_PRESETS[k][field]===p.weapon[field]))||'custom';
    selectField(el,'武器のタイプ',[...Object.entries(WEAPON_PRESETS).map(([k,v])=>[k,v.name]),['custom','自分でちょうせい']],current,k=>{if(k!=='custom'){const {name,...weapon}=WEAPON_PRESETS[k];p.weapon=weapon;weapons();}});
    el.append(details('速さ・つよさを工夫する',advanced));
  }
  const groups=[['つくる道具',['select','erase']],['地形・しかけ',['wall','floor','roof','ramp','box','platform','moving','bounce','hazard']],['キャラクター・アイテム',['enemy','weapon','star','key','heal']],['進みかたをつくる',['checkpoint','door','goal']]];
  const palette=$('#palette3');palette.replaceChildren();
  for(const [label,types] of groups){const heading=document.createElement('div');heading.className='palette-heading';setReadingText(heading,label);palette.append(heading);for(const type of types){const b=document.createElement('button');b.className='part'+(type==='select'?' active':'');b.dataset.part=type;b.innerHTML=`<span>${ICONS[type]}</span>${PARTS[type]||{select:'えらぶ',erase:'けす'}[type]}`;b.onclick=()=>setTool(type);applyReadings(b);palette.append(b);}}
  return {inspect,weapons};
}
