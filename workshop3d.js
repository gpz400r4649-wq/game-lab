import {rotatePiece} from './building3d.js';
import {PARTS,ENEMY_PRESETS,WEAPON_PRESETS,CONDITION_NAMES,recipe3D,clamp} from './engine3d.js';

const ICONS={select:'↖',wall:'▥',floor:'▱',roof:'⌂',box:'▧',platform:'▰',moving:'↔',bounce:'⇧',enemy:'🤖',star:'✦',key:'⚿',door:'▣',heal:'♥',checkpoint:'⚑',hazard:'⚠',goal:'🏁',erase:'⌫'};
const DESCRIPTIONS={wall:'家を囲う壁。向きを変えてつなげよう。',floor:'家の床と天井に使える板。壁の内側にぴったり合うよ。',roof:'壁の上にのせる三角屋根。向きを変えて家を仕上げよう。',
  box:'かべや建物をつくれる、かたいブロック。',platform:'ジャンプで乗れる足場。高さを変えてコースにしよう。',
  moving:'置くだけで行ったり来たり。乗ると一緒に運んでくれるよ。',bounce:'ふれると大ジャンプ！ 飛ぶ強さを変えてみよう。',
  enemy:'行動タイプを選ぶだけで動くよ。速さと体力で難しさを変えよう。',star:'集めると得点アップ。ゴールを開く条件にもできるよ。',
  key:'集めると、カギを条件にしたドアを開けられるよ。カギは使っても減らないよ。',door:'条件を満たすと自動で開くドア。カギや星と組み合わせよう。',
  heal:'体力が減っているときに拾うと回復。１回だけ使えるよ。',checkpoint:'ふれると場所を記録。体力がなくなっても、ここから復活！',
  hazard:'ふれると体力が減る床。ジャンプで飛び越えてみよう。',goal:'ふれるとクリア！ 星集めや敵をたおすことを条件にできるよ。'
};

export function confirmReplace(message){
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog'),title=document.createElement('h2'),text=document.createElement('p'),cancel=document.createElement('button'),accept=document.createElement('button');
    title.textContent='作品を切り替えますか？';text.textContent=message;cancel.textContent='もどる';accept.textContent='置き換える';accept.className='primary';
    const finish=value=>{dialog.close();dialog.remove();resolve(value);};cancel.onclick=()=>finish(false);accept.onclick=()=>finish(true);dialog.oncancel=e=>{e.preventDefault();finish(false);};dialog.append(title,text,cancel,accept);document.body.append(dialog);dialog.showModal();
  });
}

export function createWorkshop(api){
  const {$,getProject,getSelected,select,save,rebuild,field,advancedInspector,advancedWeaponFields,loadProject,setTool}=api;
  function selectField(parent,label,entries,value,onchange){
    const row=document.createElement('label');row.className='field choice-field';const text=document.createElement('span');text.textContent=label;
    const input=document.createElement('select');for(const [key,name] of entries)input.add(new Option(name,key));input.value=value;
    input.onchange=()=>{onchange(input.value);save();rebuild();};row.append(text,input);parent.append(row);return input;
  }
  function details(label,children,open=false){const d=document.createElement('details'),s=document.createElement('summary');s.textContent=label;d.open=open;d.append(s,...children);return d;}
  function inspect(){
    const el=$('#inspector3'),wasOpen=el.querySelector('.advanced-program')?.open;
    advancedInspector();const loop=el.querySelector('.loop');el.replaceChildren();
    const p=getProject(),o=p.objects.find(o=>o.id===getSelected());
    if(!o){const note=document.createElement('p');note.className='empty';note.textContent='まずは上のお手本から選ぶか、使いたい部品を置いてみよう。どの部品も、置くだけで働くよ。';el.append(note);return;}
    const title=document.createElement('h2');title.className='inspector-heading';title.textContent=`${ICONS[o.type]} ${PARTS[o.type]}`;
    const description=document.createElement('p');description.className='component-description';description.textContent=DESCRIPTIONS[o.type];el.append(title,description);
    const s=o.settings;
    if(o.type==='enemy'){
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
    if(['star','heal','hazard','bounce'].includes(o.type)){
      const [label,min,max]=({star:['もらえる得点',1,20],heal:['回復する体力',1,5],hazard:['減る体力',1,5],bounce:['飛ぶ強さ',5,14]})[o.type];
      field(el,label,s.value,min,max,1,n=>s.value=Math.round(n));
    }
    if(o.type==='door'||o.type==='goal'){
      const rules=document.createElement('div');rules.className='recipe-rule';
      const trigger=document.createElement('b');trigger.textContent=o.type==='goal'?'① ゴールにふれたとき':'① 条件をたしかめる';rules.append(trigger);
      selectField(rules,'② 条件',Object.entries(CONDITION_NAMES).map(([k,v])=>[k,k==='touch'?(o.type==='door'?'いつでも開く':'ふれるだけ'):v]),s.condition,v=>{s.condition=v;inspect();});
      if(['stars','keys'].includes(s.condition))field(rules,'必要な数',s.required,1,20,1,n=>{s.required=Math.round(n);updateRuleHint();});
      const effect=document.createElement('b');effect.textContent=o.type==='goal'?'③ ステージクリア！':'③ ドアが開く';rules.append(effect);el.append(rules);
      function updateRuleHint(){if(!['stars','keys'].includes(s.condition))return;const type=s.condition==='stars'?'star':'key',count=p.objects.filter(x=>x.type===type).length;let note=el.querySelector('.recipe-hint');if(!note){note=document.createElement('p');note.className='recipe-hint';el.append(note);}note.hidden=count>=s.required;note.textContent=`いまのステージには${PARTS[type]}が${count}個。あと${Math.max(0,s.required-count)}個置くか、必要な数を減らそう。`;}
      updateRuleHint();
    }
    const label=document.createElement('div');label.className='small-heading';label.textContent='置く場所をちょうせい';el.append(label);
    const nudges=document.createElement('div');nudges.className='nudge-grid';
    for(const [name,key,amount] of [['← 左','x',-1],['奥へ ↑','z',-1],['右 →','x',1],['下げる','y',-.5],['手前 ↓','z',1],['上げる','y',.5]]){
      const button=document.createElement('button');button.textContent=name;button.onclick=()=>{o[key]=clamp(o[key]+amount,key==='y'?0:-28,key==='y'?12:28);save();rebuild();inspect();};nudges.append(button);
    }el.append(nudges);
    const fine=document.createElement('div'),positions=document.createElement('div');positions.className='position-fields';
    for(const [key,name,min,max] of [['x','横 X',-28,28],['y','高さ Y',0,12],['z','奥行 Z',-28,28]])field(positions,name,o[key],min,max,.5,n=>o[key]=n);fine.append(positions);
    if(['box','platform','moving','door','bounce','hazard','wall','floor','roof'].includes(o.type))for(const [key,name] of [['w','はば'],['h','たかさ'],['d','おくゆき']])field(fine,name,o[key],['wall','floor','roof','bounce','hazard'].includes(o.type)?.2:.5,10,.5,n=>o[key]=n);
    el.append(details('位置・大きさを数字でちょうせい',[fine]));
    if(['wall','floor','roof'].includes(o.type)){const rotate=document.createElement('button');rotate.textContent='↻ 90° 回す';rotate.onclick=()=>{rotatePiece(o);save();rebuild();inspect();};el.append(rotate);}
    const actions=document.createElement('div');actions.className='object-actions';
    const copy=document.createElement('button');copy.textContent='＋ 同じ部品をもう１つ';copy.onclick=()=>{if(p.objects.length>=150){api.toast('部品は150個まで置けます');return;}const duplicate=structuredClone(o);duplicate.id=crypto.randomUUID();duplicate.x=clamp(o.x+2,-28,28);p.objects.push(duplicate);select(duplicate.id);save();rebuild();api.objectList();inspect();};
    const del=document.createElement('button');del.textContent='削除';del.className='danger';del.onclick=()=>{p.objects=p.objects.filter(x=>x.id!==o.id);select(null);save();rebuild();api.objectList();inspect();};actions.append(copy,del);el.append(actions);
  }
  function weapons(){if(api.renderLoadout){api.renderLoadout();return;}
    advancedWeaponFields();const el=$('#weapon3'),advanced=[...el.childNodes];el.replaceChildren();const p=getProject();
    const current=Object.keys(WEAPON_PRESETS).find(k=>['speed','interval','damage','spread'].every(field=>WEAPON_PRESETS[k][field]===p.weapon[field]))||'custom';
    selectField(el,'武器のタイプ',[...Object.entries(WEAPON_PRESETS).map(([k,v])=>[k,v.name]),['custom','自分でちょうせい']],current,k=>{if(k!=='custom'){const {name,...weapon}=WEAPON_PRESETS[k];p.weapon=weapon;weapons();}});
    el.append(details('速さ・つよさを工夫する',advanced));
  }
  const groups=[['つくる道具',['select','erase']],['地形・しかけ',['wall','floor','roof','box','platform','moving','bounce','hazard']],['キャラクター・アイテム',['enemy','star','key','heal']],['進みかたをつくる',['checkpoint','door','goal']]];
  const palette=$('#palette3');palette.replaceChildren();
  for(const [label,types] of groups){const heading=document.createElement('div');heading.className='palette-heading';heading.textContent=label;palette.append(heading);for(const type of types){const b=document.createElement('button');b.className='part'+(type==='select'?' active':'');b.dataset.part=type;b.innerHTML=`<span>${ICONS[type]}</span>${PARTS[type]||{select:'えらぶ',erase:'けす'}[type]}`;b.onclick=()=>setTool(type);palette.append(b);}}
  const recipes=$('#recipes3');for(const [kind,icon,name,text] of [['building','⌂','建築ひろば','壁・床・屋根を出す銃で家をつくる'],['athletic','⇧','足場アスレチック','ジャンプ台と動く足場でコースづくり'],['adventure','⚿','宝さがし','星・カギ・ドアを組み合わせる'],['battle','🤖','ロボット対戦','敵と武器を選んでバトルづくり']]){
    const b=document.createElement('button');b.className='recipe-card';const title=document.createElement('b');title.textContent=`${icon} ${name}`;const desc=document.createElement('small');desc.textContent=text;b.append(title,desc);b.onclick=async()=>{if(getProject().objects.length&&!await confirmReplace('今の3D作品をお手本に置き換えます。必要なら先にファイルに保存してください。'))return;loadProject(recipe3D(kind));api.toast('お手本ができたよ！ まずは「あそぶ」を押そう');};recipes.append(b);
  }
  return {inspect,weapons};
}
