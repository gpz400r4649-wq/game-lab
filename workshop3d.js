import {prepareEnemyDropWeapon} from './enemy-loot3d.js?v=20261114c';
import {fencePresetKey,FLOOR_PRESETS,RAMP_PRESETS,FENCE_PRESETS,ROOF_PRESETS,architectureIcon} from './architecture3d.js?v=20261114c';
import {renderAllyRangePreview} from './ally-range-preview3d.js?v=20261114c';
import {createChoiceControl} from './choices3d.js?v=20261114c';
import {sharedDefaultsType,applyBlockDefaults,sharedKeys,synchronizeCharacterDefaults,useCharacterDefaults,inheritNewCharacter,writeCharacterDefaults} from './character-defaults3d.js?v=20261114c';
import {copyEnemySettings,ENEMY_COPY_GROUPS} from './enemy-batch3d.js?v=20261114c';
import {ACTOR_HATS} from './actor3d.js?v=20261114c';
import {makeTool} from './building3d.js?v=20261114c';
import {chaseGraceSeconds} from './enemy-ai3d.js?v=20261114c';
import {openWaypointEditor} from './waypoint-ui3d.js?v=20261114c';
import {openPatrolEditor} from './patrol-ui3d.js?v=20261114c';
import {enemyRoutineChoices,setEnemyRoutineChoice,lostChoiceLabels,routineFlow} from './enemy-behavior-presets3d.js?v=20261114c';
import {renderBehaviorExamples} from './enemy-behavior-ui3d.js?v=20261114c';
import {inGridRange,fitRoamingEnemy} from './enemy-range3d.js?v=20261114c';
import {closeLiveRangeEditor,renderEnemyRange as renderEnemyRangeBase} from './enemy-range-ui3d.js?v=20261114c';
import {gunPreviewSVG} from './appearance3d.js?v=20261114c';
import {DOOR_PRESETS,doorUsesGlass,doorCanOpen,isSlidingDoor,doorDimensions} from './doors3d.js?v=20261114c';
import {MAX_PARTS,MAX_BUILD_Y} from './limits3d.js?v=20261114c';
import {coordinateLimit} from './world3d.js?v=20261114c';
import {setReadingText,applyReadings,kanaText} from './readings3d.js?v=20261114c';
import {actionsFor} from './events3d.js?v=20261114c';
import {renderEventEditor} from './event-editor3d.js?v=20261114c';
import {DESTRUCTIBLE_TYPES,LIMITS} from './weapons3d.js?v=20261114c';
import {alignPiece,gridStep,GRID_PARTS,editorPlacementReason} from './building3d.js?v=20261114c';
import {part,ENEMY_SCALES,PARTS,WEAPON_PRESETS,CONDITION_NAMES,clamp} from './engine3d.js?v=20261114c';

const ICONS={actor:'💬',plate:'▣',ally:'🛡',weapon:'🔫',select:'↖',ramp:'◩',wall:'▥',floor:'▱',roof:'⌂',box:'▧',platform:'▰',moving:'↔',bounce:'⇧',enemy:'🤖',star:'✦',key:'⚿',door:'▣',heal:'♥',checkpoint:'⚑',hazard:'⚠',goal:'🏁',erase:'⌫'};
const DESCRIPTIONS={actor:'名前とせりふを書こう。交換する品を置くとお店になるよ。',plate:'踏んでいる間、えらんだドアが開くよ。',ally:'近くで「ついてきて」と呼ぶと、一緒に戦うよ。',weapon:'地面に置いて、ふれると拾える銃。持ちもの・銃づくりで用意した銃をえらぼう。',ramp:'低いほうから歩くと、そのまま登れるスロープ。回して好きな向きにつなげよう。',wall:'家を囲う壁。向きを変えてつなげよう。',floor:'家の床と天井に使える板。壁の内側にぴったり合うよ。',roof:'壁の上にのせる三角屋根。向きを変えて家を仕上げよう。',
  box:'かべや建物をつくれる、かたいブロック。',platform:'ジャンプで乗れる足場。高さを変えてコースにしよう。',
  moving:'置くだけで行ったり来たり。乗ると一緒に運んでくれるよ。',bounce:'ふれると大ジャンプ！ 飛ぶ強さを変えてみよう。',
  enemy:'動きかたと、攻撃してくるかを別々にえらべるよ。攻撃するマスも工夫してみよう。',star:'ふれると拾える星。得点をもらうほか、銃を拾うなどの役割にも変えられるよ。',
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
  const {$,getProject:getActualProject,getSelected:getActualSelected,select,save:saveActual,rebuild,field:baseField,advancedInspector,advancedWeaponFields,loadProject,setTool}=api;
  let commonObject=null,returnToIndividual=false;
  const getProject=()=>commonObject?{...getActualProject(),objects:[commonObject]}:getActualProject();
  const getSelected=()=>commonObject?.id||getActualSelected();
  function save(){if(commonObject)writeCharacterDefaults(getActualProject(),commonObject);saveActual();}
  function finishBasic(){
    if(!commonObject)return;
    closeLiveRangeEditor();save();commonObject=null;rangeReturn=false;
    enemyDialog.close();partDialog.close();api.setCommonPreview?.(null);inspect();
    if(returnToIndividual){const object=getActualProject().objects.find(o=>o.id===getActualSelected());if(object?.type==='enemy')enemyDialog.showModal();else if(object&&['ally',...DESTRUCTIBLE_TYPES].includes(object.type))partDialog.showModal();}
    returnToIndividual=false;
  }
  let sharedObject=null;
  const sharedFields={
    'ブロックの体力':['hp'],'弾が当たったら':['destructible'],'体力':['hp'],'味方の体力':['hp'],'からだの大きさ':['enemyScale'],
    'ふだんの動き':['routine','program','chaseMode'],'見つけたらどうする？':['routine','program','chaseMode'],'見失ったら':['routine','program','chaseMode'],
    '動きの速さ':['movementSpeed'],'見失っても追いかける時間（秒）':['chaseGraceSeconds'],
    '敵に持たせる銃':['enemyWeaponId'],'味方に持たせる銃':['allyGun'],'射程（マス）':['allyRangeCells'],'いつ撃つ？':['allyAttack']
  };
  function decorateShared(row,keys){
    const object=sharedObject,project=getProject();
    if(commonObject||!object||!project.characterDefaults?.[sharedDefaultsType(object.type)]||!keys?.every(key=>sharedKeys(object.type).includes(key)))return;
    const inherited=!keys.some(key=>object.characterOverrides?.includes(key));
    const wrapper=document.createElement('div'),label=document.createElement('label'),check=document.createElement('input'),caption=document.createElement('span');
    wrapper.className='shared-setting';if(row.classList.contains('enemy-size-field'))wrapper.classList.toggle('enemy-size-field',true);label.className='shared-choice';check.type='checkbox';check.checked=inherited;
    setReadingText(caption,inherited?'ぜんたい設定を使う':'このキャラだけの設定');
    for(const control of row.querySelectorAll('input,select,button'))control.disabled=inherited;
    row.replaceWith(wrapper);wrapper.append(row,label);label.append(check,caption);
    check.onchange=()=>{useCharacterDefaults(project,object,keys,check.checked);save();rebuild();inspect();};
  }
  function field(parent,label,...args){const change=args.pop();const row=baseField(parent,label,...args,value=>{const result=change(value);if(commonObject)writeCharacterDefaults(getActualProject(),commonObject);return result;});decorateShared(row,sharedFields[label]);return row;}
  function renderEnemyRange(parent,object,rangeApi,key){
    renderEnemyRangeBase(parent,object,rangeApi,key);
    const row=parent.lastElementChild;
    if(!commonObject&&sharedKeys(object.type).includes(key)){
      decorateShared(row,[key]);
      row.querySelector('.enemy-range-choice').disabled=false;
    }
  }
  function selectField(parent,label,entries,value,onchange){
    const row=document.createElement('div'),caption=document.createElement('span'),choices=createChoiceControl();row.className='field choice-field';setReadingText(caption,label);choices.setAttribute('aria-label',label);
    if(sharedObject?.type==='enemy'){row.classList.toggle('enemy-choice-field',true);choices.classList.toggle('enemy-choice-grid',true);}
    if(label==='からだの大きさ'){row.classList.toggle('enemy-size-field',true);choices.classList.toggle('enemy-size-choices',true);}
    for(const [key,name]of entries)choices.add(new Option(kanaText(name),key));choices.value=value;choices.onchange=()=>{onchange(choices.value);save();rebuild();};
    row.append(caption,choices);parent.append(row);decorateShared(row,sharedFields[label]);return choices;
  }
  function details(label,children,open=false){const d=document.createElement('details'),s=document.createElement('summary');setReadingText(s,label);d.open=open;d.append(s,...children);return d;}
  const duplicateButton=$('#duplicate3');let duplicateSelected=null;
  duplicateButton.onclick=()=>duplicateSelected?.();
  function openEnemyBatch(){
    const project=getProject(),source=project.objects.find(o=>o.id===getSelected());if(source?.type!=='enemy')return;
    const dialog=document.createElement('dialog');dialog.className='enemy-batch-dialog';
    const title=document.createElement('h2'),note=document.createElement('p'),groups=document.createElement('fieldset'),targets=document.createElement('fieldset'),apply=document.createElement('button'),cancel=document.createElement('button'),error=document.createElement('p');
    setReadingText(title,'ほかの敵にも、この設定を使う');setReadingText(note,'マップの位置や向きは、その敵のまま。はんいやコースは、それぞれの敵のまわりに作るよ。');
    const options=[],checks=[];
    const makeCheck=(parent,text,checked)=>{const row=document.createElement('label'),input=document.createElement('input'),caption=document.createElement('span');row.className='enemy-attack-toggle';input.type='checkbox';input.checked=checked;setReadingText(caption,text);row.append(input,caption);parent.append(row);return input;};
    const groupTitle=document.createElement('legend');setReadingText(groupTitle,'コピーする設定');groups.append(groupTitle);
    for(const [key,group]of Object.entries(ENEMY_COPY_GROUPS))options.push([key,makeCheck(groups,group.label,true)]);
    const targetTitle=document.createElement('legend');setReadingText(targetTitle,'どの敵に使う？');targets.append(targetTitle);
    const all=document.createElement('button');setReadingText(all,'全部の敵をえらぶ');all.onclick=()=>{checks.forEach(([,check])=>check.checked=true);sync();};targets.append(all);
    for(const [index,enemy]of project.objects.filter(o=>o.type==='enemy').entries())if(enemy.id!==source.id)checks.push([enemy.id,makeCheck(targets,'敵 '+(index+1)+'（X '+enemy.x+'・Z '+enemy.z+'・高さ '+enemy.y+'）',false)]);
    const sync=()=>{const count=checks.filter(([,check])=>check.checked).length;setReadingText(apply,count+'体に設定をコピー');apply.disabled=!count||!options.some(([,check])=>check.checked);};
    for(const [,check]of [...options,...checks])check.onchange=sync;sync();apply.className='primary';
    apply.onclick=()=>{try{const count=copyEnemySettings(project,source.id,checks.filter(([,check])=>check.checked).map(([id])=>id),options.filter(([,check])=>check.checked).map(([key])=>key));save();rebuild();api.objectList();inspect();dialog.close();dialog.remove();api.toast(count+'体に設定をコピーしたよ');}catch{setReadingText(error,'マップの外にはみ出すはんいやコースがあります。コピーする設定か、敵をえらび直そう。');}};
    setReadingText(cancel,'やめる');cancel.onclick=()=>{dialog.close();dialog.remove();};dialog.oncancel=()=>dialog.remove();dialog.append(title,note,groups,targets,error,apply,cancel);document.body.append(dialog);dialog.showModal();
  }
  function openBasic(type){
    if(commonObject)return;
    returnToIndividual=enemyDialog.open||partDialog.open;
    enemyDialog.close();partDialog.close();
    commonObject=inheritNewCharacter(getActualProject(),part(type,0,0));prepareEnemyDropWeapon(getActualProject(),commonObject);
    commonObject.id='@basic-'+type;
    commonObject.characterOverrides=[...sharedKeys(type)];
    api.setCommonPreview?.(commonObject);inspect();
    if(type==='enemy')enemyDialog.showModal();else partDialog.showModal();
  }
  const enemyDialog=document.createElement('dialog');enemyDialog.className='enemy-editor-dialog enemy-workspace';
  const enemyHeader=document.createElement('header'),enemyTitle=document.createElement('h2'),enemyClose=document.createElement('button'),enemyContent=document.createElement('div');
  setReadingText(enemyTitle,'敵のせってい');setReadingText(enemyClose,'とじる');enemyClose.onclick=()=>{if(commonObject)finishBasic();else enemyDialog.close();};
  const batchButton=document.createElement('button');setReadingText(batchButton,'まとめて設定');batchButton.onclick=openEnemyBatch;const enemyBasic=document.createElement('button');setReadingText(enemyBasic,'敵のぜんたい設定へ');enemyBasic.onclick=()=>openBasic('enemy');enemyHeader.append(enemyTitle,enemyBasic,batchButton,enemyClose);enemyContent.className='enemy-dialog-content';enemyDialog.append(enemyHeader,enemyContent);document.body.append(enemyDialog);
  let rangeReturn=false;
  const pauseEnemyDialog=()=>{if(enemyDialog.open){rangeReturn=true;enemyDialog.close();}};
  window.addEventListener('enemy-range-open',pauseEnemyDialog);
  window.addEventListener('enemy-range-close',()=>{if(rangeReturn&&getSelected()===enemyPageOwner){rangeReturn=false;enemyDialog.showModal();}});
  const enemyOpen=$('#enemy-open3');
  enemyOpen.onclick=()=>{
    const selected=getProject().objects.find(o=>o.id===getSelected());
    if(selected?.type!=='enemy'){openBasic('enemy');return;}
    rangeReturn=false;enemyDialog.showModal();enemyContent.scrollTop=0;
  };
  enemyDialog.addEventListener('cancel',event=>{if(commonObject){event.preventDefault();finishBasic();}});
  function presentEnemyEditor(){
    setReadingText(enemyTitle,commonObject?'敵のぜんたい設定':'この敵のせってい');enemyBasic.hidden=batchButton.hidden=!!commonObject;
    enemyOpen.disabled=false;setReadingText(enemyOpen,getProject().objects.find(o=>o.id===getSelected())?.type==='enemy'?'この敵のせっていをひらく':'敵のぜんたい設定をひらく');
    const tabs=$('#inspector3').querySelector('.enemy-settings-tabs');
    if(!tabs)return;
    enemyHeader.querySelector('.enemy-settings-tabs')?.remove();enemyHeader.querySelector('.enemy-behavior-flow')?.remove();
    enemyHeader.append(tabs,$('#inspector3').querySelector('.enemy-behavior-flow'));
    enemyContent.replaceChildren(...$('#inspector3').querySelectorAll('[role="tabpanel"]'));

  }
  const goalDialog=document.createElement('dialog');goalDialog.className='enemy-editor-dialog';
  const goalHeader=document.createElement('header'),goalTitle=document.createElement('h2'),goalClose=document.createElement('button'),goalContent=document.createElement('div');
  setReadingText(goalTitle,'ゴールのせってい');setReadingText(goalClose,'とじる');goalClose.onclick=()=>goalDialog.close();
  goalHeader.append(goalTitle,goalClose);goalContent.className='enemy-dialog-content';goalDialog.append(goalHeader,goalContent);document.body.append(goalDialog);
  const goalOpen=$('#goal-open3');let goalOwner=null;
  goalOpen.onclick=()=>{if(getProject().objects.find(o=>o.id===getSelected())?.type!=='goal')return;goalDialog.showModal();goalContent.scrollTop=0;};
  function presentGoalEditor(){
    const selected=getProject().objects.find(o=>o.id===getSelected());
    goalOpen.disabled=selected?.type!=='goal';
    if(goalOpen.disabled)return;
    goalOwner=selected.id;
    const el=$('#inspector3');
    goalContent.replaceChildren(...[...el.children].filter(node=>!node.classList.contains('inspector-back')&&!node.classList.contains('inspector-heading')&&!node.classList.contains('component-description')&&!node.classList.contains('placement-controls')));
  }
  const partDialog=document.createElement('dialog');partDialog.className='enemy-editor-dialog';
  const partHeader=document.createElement('header'),partTitle=document.createElement('h2'),partClose=document.createElement('button'),partContent=document.createElement('div');
  setReadingText(partClose,'とじる');partClose.onclick=()=>{if(commonObject)finishBasic();else partDialog.close();};
  partHeader.append(partTitle,partClose);partContent.className='enemy-dialog-content';partDialog.append(partHeader,partContent);document.body.append(partDialog);
  const allyOpen=$('#ally-open3');allyOpen.onclick=()=>{const object=getProject().objects.find(o=>o.id===getSelected());if(object?.type==='ally'){partDialog.showModal();partContent.scrollTop=0;}else openBasic('ally');};
  partDialog.addEventListener('cancel',event=>{if(commonObject){event.preventDefault();finishBasic();}});
  const blockOpen=$('#block-open3');blockOpen.onclick=()=>openBasic('box');
  const partOpen=$('#part-open3');let partOwner=null;
  const isOtherPart=o=>!!o&&!['enemy','goal'].includes(o.type);
  partOpen.onclick=()=>{if(!isOtherPart(getProject().objects.find(o=>o.id===getSelected())))return;partDialog.showModal();partContent.scrollTop=0;};
  function presentPartEditor(){
    setReadingText(allyOpen,getProject().objects.find(o=>o.id===getSelected())?.type==='ally'?'この味方のせっていをひらく':'味方のぜんたい設定をひらく');
    const selected=getProject().objects.find(o=>o.id===getSelected());
    partDialog.classList.toggle('ally-workspace',selected?.type==='ally');
    partOpen.disabled=!isOtherPart(selected)||selected.type==='ally';
    setReadingText(partOpen,'えらんだパーツのせってい');
    if(!isOtherPart(selected))return;
    partOwner=selected.id;setReadingText(partTitle,commonObject?(selected.type==='ally'?'味方のぜんたい設定':'ブロックのぜんたい設定'):(DOOR_PRESETS[selected.doorVariant]?.name||FLOOR_PRESETS[selected.floorHalf?'floorHalf':'']||ROOF_PRESETS[selected.wallGable]||ROOF_PRESETS[selected.roofStyle==='slope'?'roofSlope':'']||FENCE_PRESETS[fencePresetKey(selected)]||RAMP_PRESETS[selected.rampStyle]||PARTS[selected.type])+'のせってい');
    const el=$('#inspector3');
    partContent.replaceChildren(...[...el.children].filter(node=>!node.classList.contains('inspector-back')&&!node.classList.contains('inspector-heading')&&!node.classList.contains('placement-controls')&&!(selected.type==='ally'&&node.classList.contains('component-description'))));
  }
  let enemyPage='movement',enemyPageOwner=null;
  function inspect(){
    synchronizeCharacterDefaults(getProject());
    const aside=$('aside'),el=$('#inspector3'),top=aside.scrollTop,pageX=window.scrollX,pageY=window.scrollY,min=el.style.minHeight,active=document.activeElement,focusLabel=el.contains(active)?active.getAttribute('aria-label'):null;
    if(enemyPageOwner&&enemyPageOwner!==getSelected()){enemyDialog.close();rangeReturn=false;}
    if(goalOwner&&goalOwner!==getSelected())goalDialog.close();
    if(partOwner&&partOwner!==getSelected())partDialog.close();
    if(partContent.children.length)el.append(...partContent.children);
    if(goalContent.children.length)el.append(...goalContent.children);
    if(enemyContent.children.length)el.append(...enemyContent.children);
    el.style.minHeight=el.getBoundingClientRect().height+'px';
    try{inspectContent();presentEnemyEditor();presentGoalEditor();presentPartEditor();}finally{el.style.minHeight=min;aside.scrollTop=top;window.scrollTo(pageX,pageY);if(focusLabel){const replacement=[...el.querySelectorAll('[aria-label]')].find(n=>n.getAttribute('aria-label')===focusLabel);replacement?.focus({preventScroll:true});}aside.scrollTop=top;
    }
  }
  function inspectContent(){
    const el=$('#inspector3'),wasOpen=el.querySelector('.advanced-program')?.open;
    duplicateSelected=null;duplicateButton.disabled=true;
    if(!commonObject)advancedInspector();const loop=el.querySelector('.loop');el.replaceChildren();
    const p=getProject(),o=p.objects.find(o=>o.id===getSelected());
    if(!o){sharedObject=null;return;}
    const title=document.createElement('h2');title.className='inspector-heading';setReadingText(title,`${ICONS[o.type]} ${DOOR_PRESETS[o.doorVariant]?.name||FLOOR_PRESETS[o.floorHalf?'floorHalf':'']||ROOF_PRESETS[o.wallGable]||ROOF_PRESETS[o.roofStyle==='slope'?'roofSlope':'']||FENCE_PRESETS[fencePresetKey(o)]||RAMP_PRESETS[o.rampStyle]||PARTS[o.type]}`);
    const description=document.createElement('p');description.className='component-description';setReadingText(description,o.doorVariant==='frame'?'ドアの枠だけのパーツ。中央をそのまま通れるよ。':o.doorVariant==='windowFrame'?'窓の枠だけのパーツ。窓のあいた部分にはガラスがないよ。':o.doorVariant==='windowGlass'?'ガラスの入った窓。開け閉めしない窓だよ。':o.doorVariant==='windowSwing'?'左右に開く窓。近づいて「あける」を押そう。':doorUsesGlass(o)?'木のわくに大きなガラスを入れた戸。向こうの部屋が見えるよ。近づいて「あける」を押そう。':isSlidingDoor(o)?'近くの扉が、隣の扉に重なって開くよ。半マス分が通り道になるよ。１枚ずつ開け閉めできるよ。':o.type==='door'&&doorDimensions(o).single?'扉は半マスの幅。残りの半分は壁だよ。扉を左右どちらに置くかもえらべるよ。':o.floorHalf?'半マスの床。２枚を並べると１マスになるよ。90度回して向きを変えられるよ。':o.roofStyle==='slope'?'左右のななめ屋根を頂点で合わせよう。斜面の端を押すと、隣につながるよ。下は空いているので部屋に使えるよ。':o.wallGable?'ななめ屋根の端をふさぐ三角のかべ。左がひくい形と右がひくい形を合わせよう。':o.rampStyle?'角に合わせて回すスロープ。低いほうから登れるよ。':o.wallHalf==='halfVertical'&&o.wallStyle?'はばが半分のさく。２枚で１マスになり、90度回してL字にもつなげられるよ。':o.wallHalf==='halfVertical'?'幅が半分の壁。２枚を横に並べると壁１枚分になるよ。':o.wallHalf==='halfHorizontal'?'高さが半分の壁。２枚を上下に積むと壁１枚分になるよ。':o.wallStyle==='diagonal'?'１マスの角から反対の角へつながる、ななめの壁。90度回すと逆向きになるよ。':o.wallStyle?'柵のパーツ。半分の高さと、壁と同じ高さを選べるよ。':DESCRIPTIONS[o.type]);el.append(title,description);
    sharedObject=sharedKeys(o.type).length?o:null;
    const s=o.settings;
    if(o.type==='weapon'){
      const missing=o.weaponId&&o.weaponId!=='@random'&&!p.loadout.some(t=>t.id===o.weaponId);
      selectField(el,'ひろう銃',[['','銃をえらぼう'],['@random','ランダムでひとつ'],...(missing?[[o.weaponId,'銃が削除されています']]:[]),...p.loadout.map(t=>[t.id,t.name+(t.pickupOnly?'（拾って使う）':'（最初から持つ）')])],o.weaponId||'',v=>{o.weaponId=v;inspect();});
      const gun=p.loadout.find(t=>t.id===o.weaponId),note=document.createElement('p');note.className='component-description';setReadingText(note,o.weaponId==='@random'?'持っている銃もふくめ、作品の銃からひとつ拾うよ。':!gun?'まだ銃が決まっていません。先に銃をつくり、ここでえらぼう。':gun.pickupOnly?'この銃は拾うまで使えないよ。':'この銃は最初から持っています。同じ銃を拾うと、同じ枠の個数がふえるよ。');el.append(note);
      if(gun&&!gun.pickupOnly){const prepare=document.createElement('button');setReadingText(prepare,'この銃を「拾って使う」にする');prepare.onclick=()=>{gun.pickupOnly=true;save();inspect();};el.append(prepare);}
    }
    if(DESTRUCTIBLE_TYPES.has(o.type)){
      const note=document.createElement('p');note.className='component-description';
      if(commonObject){setReadingText(note,'壁・床・屋根・スロープ・四角いブロック・足場・動く足場に共通の設定だよ。つくる画面で置くブロックも、建築銃から出すブロックも、この設定を使うよ。');el.append(note);}else{const basic=document.createElement('button');setReadingText(basic,'ブロックのぜんたい設定へ');basic.onclick=()=>openBasic('box');el.append(basic);}
      field(el,'ブロックの体力',o.hp,1,LIMITS.maxBlockHp,1,n=>o.hp=Math.round(n));selectField(el,'弾が当たったら',[['yes','体力がなくなると壊れる'],['no','こわれない']],o.destructible===false?'no':'yes',v=>o.destructible=v==='yes');
      if(commonObject){const apply=document.createElement('button'),hint=document.createElement('p');apply.className='primary block-defaults-apply';setReadingText(apply,'置いてあるブロックもそろえる');setReadingText(hint,'個別の体力や、建築銃で作ったブロックも、いまのぜんたい設定にそろえるよ。壊れたときのイベントと、置いた場所はそのままだよ。');hint.className='component-description';apply.onclick=()=>{save();const count=applyBlockDefaults(getActualProject());save();rebuild();api.toast(count+'このブロックをそろえたよ');};el.append(apply,hint);}
    }
    const whoOptions=[['player','自分'],['ally','仲間'],['both','どちらも']];
    if(o.type==='heal')selectField(el,'だれが拾える？',whoOptions,o.who||'player',v=>o.who=v);
    if(o.type==='plate'){
      selectField(el,'だれが踏める？',whoOptions,o.who||'both',v=>o.who=v);
      const doors=p.objects.filter(obj=>obj.type==='door');
      selectField(el,'開くドア',[['','ドアをえらぼう'],...doors.map((door,i)=>[door.id,'ドア '+(i+1)+'（'+door.x+', '+door.z+'）'])],o.doorId||'',v=>o.doorId=v);
    }
    if(o.type==='actor'){
      selectField(el,'ぼうし',Object.entries(ACTOR_HATS),o.hat??'yellow',v=>o.hat=v);
      for(const [key,label,limit]of [['actorName','名前',32],['speech','せりふ',240]]){
        const row=document.createElement('label'),input=document.createElement(key==='speech'?'textarea':'input');
        if(key==='speech'){
          const picker=createChoiceControl();
          picker.setAttribute('aria-label','せりふの見本をえらぶ');
          const heading=document.createElement('p');setReadingText(heading,'せりふの見本');el.append(heading);
          for(const line of ['いらっしゃい！','こんにちは！','ほしと こうかんしよう！','このさきに なかまがいるよ。','きをつけてね！']){
            picker.add(new Option(line,line));
          }
          picker.onchange=()=>{
            if(!picker.value)return;
            input.value=picker.value;
            o.speech=picker.value;
            picker.value='';
            save();
          };
          el.append(picker);
        }
        setReadingText(row,label);input.maxLength=limit;input.value=o[key]||'';input.onchange=()=>{o[key]=input.value;save();};row.append(input);el.append(row);
      }
      for(const [i,offer]of (o.offers||[]).entries()){
        selectField(el,'品もの '+(i+1),[['','銃をえらぼう'],...p.loadout.map(t=>[t.id,t.name])],offer.gun,v=>offer.gun=v);
        field(el,'交換にいる星',offer.price,1,99,1,n=>offer.price=Math.round(n));
        const remove=document.createElement('button');setReadingText(remove,'このしなものを おみせから けす');remove.onclick=()=>{o.offers.splice(i,1);save();inspect();};el.append(remove);
      }
      const add=document.createElement('button');setReadingText(add,'＋ 交換する品を追加');add.disabled=(o.offers?.length||0)>=6;
      add.onclick=()=>{o.offers??=[];o.offers.push({gun:'',price:3});save();inspect();};el.append(add);
    }
    if(o.type==='ally'){
      const layout=document.createElement('div'),controls=document.createElement('div');layout.className='ally-settings-layout';controls.className='ally-settings-controls';renderAllyRangePreview(layout,o,p.loadout);layout.append(controls);el.append(layout);
      const basic=document.createElement('button');setReadingText(basic,'味方のぜんたい設定へ');basic.onclick=()=>openBasic('ally');if(!commonObject)controls.append(basic);
      const mark=(row,name)=>(row.closest('.shared-setting')||row).classList.toggle(name,true);
      mark(field(controls,'味方の体力',o.hp,1,20,1,n=>o.hp=Math.round(n)),'ally-health-setting');
      mark(selectField(controls,'射程（マス）',Array.from({length:15},(_,i)=>[String(i+1),(i+1)+'マス']),String(o.allyRangeCells??5),v=>{o.allyRangeCells=Number(v);inspect();}).closest('.field'),'ally-distance-setting');
      mark(selectField(controls,'味方に持たせる銃',[['','ロボットブラスター'],...p.loadout.filter(t=>t.effect==='shoot').map(t=>[t.id,t.name])],o.allyGun||'',v=>{o.allyGun=v;inspect();}).closest('.field'),'ally-gun-setting');
      mark(selectField(controls,'いつ撃つ？',[['auto','敵を見つけたら'],['assist','自分が弾を当てた敵をねらう']],o.allyAttack||'auto',v=>{o.allyAttack=v;inspect();}).closest('.field'),'ally-attack-setting');
    }
    if(o.type==='enemy'){
      if(enemyPageOwner!==o.id){enemyPageOwner=o.id;enemyPage='movement';}
      const tabs=document.createElement('div');tabs.className='enemy-settings-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','敵の設定を切り替える');
      const pages=new Map();
      el.append(tabs);
      for(const [key,label]of [['movement','① ふだんの動き'],['notice','② 見つけたら'],['lost','③ 見失ったら'],['combat','こうげき'],['body','からだ'],['loot','おとすもの']]){
        const panel=document.createElement('section');panel.id='enemy-settings-'+key;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-label',label);pages.set(key,panel);el.append(panel);
        const button=document.createElement('button');button.type='button';button.dataset.page=key;button.setAttribute('role','tab');button.setAttribute('aria-controls',panel.id);setReadingText(button,label);
        button.onclick=()=>{enemyPage=key;syncEnemyPages();enemyContent.scrollTop=0;};tabs.append(button);
      }
      function syncEnemyPages(){
        for(const [key,panel]of pages)panel.hidden=key!==enemyPage;
        for(const button of tabs.children){const active=button.dataset.page===enemyPage;button.setAttribute('aria-selected',String(active));button.classList.toggle('active',active);}
      }
      syncEnemyPages();
      const body=pages.get('body');
      selectField(body,'いつ出現する？',[['start','最初からいる'],['event','イベントで出現を待つ']],o.startsHidden?'event':'start',v=>{o.startsHidden=v==='event';inspect();});
      field(body,'体力',o.hp,1,500,1,n=>o.hp=Math.round(n));
      selectField(body,'からだの大きさ',ENEMY_SCALES.map(n=>[String(n),n+'倍']),String(o.enemyScale||1),v=>{
        o.enemyScale=Number(v);o.w=o.h=o.d=2*o.enemyScale;
      });
      const movement=document.createElement('section');movement.className='enemy-settings-group';movement.setAttribute('aria-label','動きかた');pages.get('movement').append(movement);
      if(o.program.length&&!o.patrolRoute&&!o.waypoints&&o.moveRange?.space==='world'&&!inGridRange(o.moveRange,{x:0,z:0},o)){const note=document.createElement('p');note.className='recipe-hint';setReadingText(note,'この敵は移動できるマスの外にいます。青いマスの中に置こう。');movement.append(note);}
      const syncBehavior=renderBehaviorExamples(movement,o,{save,rebuild,inspect,getProject});
      const rangeApi={directMove:true,getProject,lookFromAbove:api.lookFromAbove,save,rebuild:api.refreshRange||rebuild,getRangeView:api.getRangeView,showRange:key=>{pauseEnemyDialog();api.showRange?.(key);for(const button of el.querySelectorAll('.enemy-range-choice'))button.setAttribute('aria-pressed',String(button.dataset.range===key));}};
      const routine=enemyRoutineChoices(o),flow=document.createElement('p');flow.className='enemy-behavior-flow';flow.setAttribute('aria-live','polite');setReadingText(flow,routineFlow(o));movement.prepend(flow);
      const change=patch=>{setEnemyRoutineChoice(o,patch);fitRoamingEnemy(o,p);inspect();};
      if(routine){
        const stage=(key,label)=>{const section=document.createElement('section');section.className='enemy-routine-step';const h=document.createElement('h4');setReadingText(h,label);section.append(h);pages.get(key).append(section);return section;};
        const idle=stage('movement','① ふだんは何をする？');
        selectField(idle,'ふだんの動き',[['wait','その場で待つ'],['patrol','行ったり来たり'],['path','コースにそってあるく'],['roam','歩き回る'],['chase','はじめから追いかける']],routine.idle,v=>change({idle:v}));
        if(routine.idle!=='wait'||routine.notice!=='none'){
          field(idle,'動きの速さ',o.movementSpeed??o.program[0]?.speed??2,.5,8,.5,n=>{o.movementSpeed=n;syncBehavior();});
          if(routine.idle==='patrol'){
            const preview=document.createElement('button'),edit=document.createElement('button');setReadingText(preview,'↔ 往復ルートを見る');preview.onclick=()=>{pauseEnemyDialog();api.showRange?.('patrolRoute');};setReadingText(edit,'２か所をえらぶ');edit.onclick=()=>{api.showRange?.('patrolRoute');openPatrolEditor(o,{getProject,save,rebuild:api.refreshRange||rebuild,lookFromAbove:api.lookFromAbove,preview:api.previewPatrol,onClose:inspect});};idle.append(preview,edit);
            if(!o.patrolRoute){const legacy=document.createElement('p');legacy.className='component-description';setReadingText(legacy,'今は以前のよこ移動だよ。２か所をえらぶと往復ルートに切り替わるよ。');idle.append(legacy);}
          }else if(routine.idle==='path'){
            const preview=document.createElement('button'),edit=document.createElement('button');setReadingText(preview,'コースを見る');preview.onclick=()=>{pauseEnemyDialog();api.showRange?.('waypoints');};setReadingText(edit,'通る場所を順番にえらぶ');edit.onclick=()=>{api.showRange?.('waypoints');openWaypointEditor(o,{getProject,save,rebuild:api.refreshRange||rebuild,lookFromAbove:api.lookFromAbove,preview:api.previewPatrol,onClose:inspect});};idle.append(preview,edit);
            selectField(idle,'最後の場所についたら？',[['loop','最初へ進んで、くり返す'],['reverse','来た道をもどる'],['stop','最後の場所で止まる']],o.routeEnd||'loop',v=>{o.routeEnd=v;inspect();});
          }else renderEnemyRange(idle,o,rangeApi,'moveRange');
          const limitNote=document.createElement('p');limitNote.className='component-description';setReadingText(limitNote,['patrol','path'].includes(routine.idle)?'ふだんは決めたルートを歩くよ。追いかける場所は別に決められるよ。':'追うときも、もどるときも、動けるマスの外には出ないよ。');idle.append(limitNote);
        }
        if(routine.idle!=='chase'){
        const notice=stage('notice','② プレイヤーに気づいたら？');
        selectField(notice,'見つけたらどうする？',[['none','ふだんの動きを続ける'],['near','追いかける']],routine.notice,v=>change({notice:v}));
        if(routine.notice==='near'){
          if(['patrol','path'].includes(routine.idle)){renderEnemyRange(notice,o,rangeApi,'moveRange');setReadingText(notice.querySelector('[data-range="moveRange"] span'),'▦ 追いかけてよい場所');}
          renderEnemyRange(notice,o,rangeApi,'searchRange');
          const noticeHint=document.createElement('p');noticeHint.className='component-description';setReadingText(noticeHint,'気づくマスに入ると見つけ、外に出ると見失うよ。壁にかくれても、マスの中なら気づくよ。');notice.append(noticeHint);
          const lost=stage('lost','③ 見失ったらどうする？');
          if(routine.lost!=='continue'){
            const quick=document.createElement('div');quick.className='stage-range-tools';const buttons=[];
            const sync=()=>{for(const [button,n]of buttons)button.setAttribute('aria-pressed',String(chaseGraceSeconds(o)===n));setReadingText(flow,routineFlow(o));};
            field(lost,'見失っても追いかける時間（秒）',chaseGraceSeconds(o),0,30,.5,n=>{o.chaseGraceSeconds=n;sync();});
            for(const [n,label]of [[0,'すぐやめる：0秒'],[3,'すこしねばる：3秒'],[5,'しつこくおう：5秒']]){const button=document.createElement('button');setReadingText(button,label);button.onclick=()=>{o.chaseGraceSeconds=n;save();inspect();};buttons.push([button,n]);quick.append(button);}sync();lost.append(quick);
            const note=document.createElement('p');note.className='component-description';setReadingText(note,'もう一度見つけたら、時間を数え直すよ。追いかけてよい場所の外には出ないよ。');lost.append(note);
          }
          selectField(lost,'見失ったら',lostChoiceLabels(routine.idle,!!o.patrolRoute),routine.lost,v=>change({lost:v}));
        }
        }
      }else{
        const hint=document.createElement('p');setReadingText(hint,'組み合わせた動きは、そのまま残してあるよ。「さらに工夫する」で編集するか、見本から新しい動きをえらぼう。');movement.append(hint);
        for(const key of ['moveRange','searchRange'])renderEnemyRange(movement,o,rangeApi,key);
      }
      for(const key of ['notice','lost'])if(!pages.get(key).children.length){
        const hint=document.createElement('p');hint.className='enemy-page-note';
        setReadingText(hint,!routine?'今は組み合わせた動きだよ。「ふだんの動き」の見本からえらぶと、見つけた後の動きもここで変えられるよ。':routine.idle==='chase'?'はじめから追いかけるので、見つける・見失う設定は使わないよ。「ふだんの動き」で待つ・歩く動きに変えると、ここで設定できるよ。':'今は、見つけてもふだんの動きを続けるよ。「見つけたら」で追いかけるようにすると、ここで見失った後の動きを決められるよ。');pages.get(key).append(hint);
      }
      const combat=document.createElement('section');combat.className='enemy-settings-group';combat.setAttribute('aria-label','攻撃');pages.get('combat').append(combat);
      const attackLabel=document.createElement('label'),attack=document.createElement('input'),attackText=document.createElement('span');attackLabel.className='enemy-attack-toggle';attack.type='checkbox';attack.checked=o.attackEnabled;attack.setAttribute('aria-label','攻撃してくる');setReadingText(attackText,'攻撃してくる');attack.onchange=()=>{o.attackEnabled=attack.checked;save();rebuild();inspect();};attackLabel.append(attack,attackText);combat.append(attackLabel);decorateShared(attackLabel,['attackEnabled']);
      if(o.attackEnabled){
      const guns=p.loadout.filter(t=>t.effect==='shoot'),missing=o.enemyWeaponId&&!guns.some(t=>t.id===o.enemyWeaponId);
      selectField(combat,'敵に持たせる銃',[['','ロボットブラスター（これまでの銃）'],...(missing?[[o.enemyWeaponId,'この銃は使えません']]:[]),...guns.map(t=>[t.id,t.name])],o.enemyWeaponId||'',id=>{if(id)o.enemyWeaponId=id;else delete o.enemyWeaponId;inspect();});
      renderEnemyRange(combat,o,rangeApi,'attackRange');
      if(missing){const note=document.createElement('p');note.className='recipe-hint';setReadingText(note,'選んだ銃は削除されたか、建築銃に変わっています。別の銃をえらぶまでは、これまでの銃で攻撃するよ。');combat.append(note);}
      const gunHint=document.createElement('p');gunHint.className='component-description';setReadingText(gunHint,'追いかけるかどうかとは別に、攻撃するマスに入ったら撃つよ。銃づくりで弾の届く距離も変えられるよ。');combat.append(gunHint);
      }
      if(!o.attackEnabled){const note=document.createElement('p');note.className='component-description';setReadingText(note,'チェックがオフのあいだは、はんいに入っても攻撃しないよ。設定したはんいは残るよ。');combat.append(note);}
      const directionView=document.createElement('button');setReadingText(directionView,'↑ 上から向きを見る');directionView.onclick=()=>{pauseEnemyDialog();api.lookFromAbove?.();};pages.get('movement').append(directionView);
      const loot=document.createElement('section');loot.className='enemy-settings-group';const lootTitle=document.createElement('h3');setReadingText(lootTitle,'たおされたら何を落とす？');loot.append(lootTitle);pages.get('loot').append(loot);
      const heldLabel=document.createElement('label'),held=document.createElement('input'),heldText=document.createElement('span');heldLabel.className='enemy-attack-toggle';held.type='checkbox';held.checked=!!o.dropHeldWeapon;setReadingText(heldText,'持っている銃を落とす');heldLabel.append(held,heldText);loot.append(heldLabel);decorateShared(heldLabel,['dropHeldWeapon']);
      held.onchange=()=>{if(held.checked&&!p.loadout.some(t=>t.id===o.enemyWeaponId&&t.effect==='shoot')){if(p.loadout.length>=8){held.checked=false;api.toast('先に「敵に持たせる銃」をえらぼう。銃は８種類までです');return;}const gun=makeTool('shoot','ロボットブラスター');Object.assign(gun,{pickupOnly:true,speed:o.attackSpeed+5,interval:1.4,appearance:{shape:'robot',color:'#7d62dd',accent:'#ee91a5',barrel:1}});p.loadout.push(gun);o.enemyWeaponId=gun.id;}o.dropHeldWeapon=held.checked;save();rebuild();inspect();};
      const lootNote=document.createElement('p');lootNote.className='component-description';setReadingText(lootNote,'それとは別に落とすものを追加できるよ。');loot.append(lootNote);
      const lootItems=document.createElement('div');lootItems.className='enemy-loot-items';loot.append(lootItems);
      for(const [i,drop]of (o.enemyDrops||[]).entries()){const row=document.createElement('div');selectField(row,'落とすもの '+(i+1),[['key','カギ'],['star','星'],['heal','回復'],['weapon','銃']],drop.type,v=>{drop.type=v;if(v==='weapon')drop.weaponId='';else delete drop.weaponId;inspect();});if(drop.type==='weapon')selectField(row,'落とす銃 '+(i+1),[['','銃をえらぼう'],['@random','ランダムでひとつ'],...p.loadout.map(t=>[t.id,t.name])],drop.weaponId||'',v=>drop.weaponId=v);const remove=document.createElement('button');setReadingText(remove,'この落とすものを外す');remove.onclick=()=>{o.enemyDrops.splice(i,1);save();inspect();};row.append(remove);lootItems.append(row);}
      const addDrop=document.createElement('button');setReadingText(addDrop,'＋ 落とすものを追加');addDrop.disabled=(o.enemyDrops?.length||0)>=6;addDrop.onclick=()=>{o.enemyDrops??=[];o.enemyDrops.push({type:'star'});save();inspect();};lootItems.append(addDrop);decorateShared(lootItems,['enemyDrops']);
      if(loop&&!o.routine){const d=details('さらに工夫する：うごきを組む',[loop],wasOpen);d.className='advanced-program';movement.append(d);}
    }
    if(o.type==='moving'){
      selectField(el,'動く方向',[['x','左右'],['z','前後'],['y','上下']],s.axis,v=>s.axis=v);
      field(el,'動くはんい',s.distance,.5,8,.5,n=>s.distance=n);field(el,'動く速さ',s.speed,.5,5,.5,n=>s.speed=n);
    }
    if(['hazard','bounce'].includes(o.type)){
      const [label,min,max]=({star:['もらえる得点',1,20],heal:['回復する体力',1,5],hazard:['減る体力',1,5],bounce:['飛ぶ強さ',5,14]})[o.type];
      field(el,label,s.value,min,max,1,n=>s.value=Math.round(n));
    }
    if(o.type==='door'&&doorCanOpen(o)){
      if(doorDimensions(o).single)selectField(el,'ドアを置く側',[['-1','左の半分'],['1','右の半分']],String(o.doorSide||-1),v=>{o.doorSide=Number(v);inspect();});
      if(!o.doorVariant)selectField(el,'ドアの開き方',[['swing','回してひらく'],['slide','ふすま・片側にスライド']],o.doorStyle||'swing',v=>{o.doorStyle=v;inspect();});
      if(!isSlidingDoor(o))selectField(el,'開く向き',[['1','ふつう'],['-1','反対にひらく']],String(o.doorDirection||1),v=>o.doorDirection=Number(v));
      selectField(el,'ドアの使い方',[['auto','これまでの自動ドア'],['free','ふつうに開け閉めする'],['key','カギで開け閉めする']],o.doorMode||'auto',v=>{if(v==='auto')delete o.doorMode;else{o.doorMode=v;o.doorStyle??='swing';s.condition=v==='key'?'keys':'touch';}inspect();});

    }
    if(o.type==='door'&&doorCanOpen(o)||o.type==='goal'){
      const rules=document.createElement('div');rules.className='recipe-rule';
      const trigger=document.createElement('b');setReadingText(trigger,o.type==='goal'?'① ゴールにふれたとき':'① 条件をたしかめる');rules.append(trigger);
      selectField(rules,'② 条件',Object.entries(CONDITION_NAMES).filter(([key])=>key!=='allies'||o.type==='goal').map(([k,v])=>[k,k==='touch'?(o.type==='door'?'いつでも':'ふれるだけ'):k==='unset'?'条件をえらぶ（まだ動かない）':v]),s.condition,v=>{s.condition=v;inspect();});
      if(['stars','keys','allies'].includes(s.condition))field(rules,'必要な数',s.required,1,20,1,n=>{s.required=Math.round(n);updateRuleHint();});
      el.append(rules);
      function updateRuleHint(){if(!['stars','keys'].includes(s.condition))return;const type=s.condition==='stars'?'star':'key',count=p.objects.reduce((n,x)=>n+[...actionsFor(x),...(x.destroyEvents||[])].filter(a=>a.type===(type==='star'?'addStar':'addKey')||(a.type==='dropItem'&&a.target===type)).length,0);let note=el.querySelector('.recipe-hint');if(!note){note=document.createElement('p');note.className='recipe-hint';el.append(note);}note.hidden=count>=s.required;setReadingText(note,`いまのイベントで増やせる${PARTS[type]}は${count}個。あと${Math.max(0,s.required-count)}個ぶんの効果を足すか、必要な数を減らそう。`);}
      updateRuleHint();
    }
    if((!commonObject||!DESTRUCTIBLE_TYPES.has(o.type))&&!(o.type==='door'&&!doorCanOpen(o)))renderEventEditor(el,o,p,{selectField,field,save,rebuild,inspect,partNames:PARTS});
    const label=document.createElement('div');label.className='small-heading placement-controls';setReadingText(label,'置く場所をちょうせい');if(!commonObject)el.append(label);
    const nudges=document.createElement('div');nudges.className='nudge-grid placement-controls';
    for(const [name,key,amount] of [['← 左','x',-1],['奥へ ↑','z',-1],['右 →','x',1],['下げる','y',-.5],['手前 ↓','z',1],['上げる','y',.5]]){
      const button=document.createElement('button');setReadingText(button,name);button.onclick=()=>{const before={x:o.x,y:o.y,z:o.z};o[key]=clamp(o[key]+Math.sign(amount)*gridStep(o,key),key==='y'?0:-coordinateLimit(p),key==='y'?MAX_BUILD_Y:coordinateLimit(p));alignPiece(o,p);const reason=editorPlacementReason(o,p.objects.filter(x=>x.id!==o.id),p.spawn,p);if(reason){Object.assign(o,before);api.toast(reason);return;}save();rebuild();inspect();};nudges.append(button);
    }if(!commonObject)el.append(nudges);
    const fine=document.createElement('div'),positions=document.createElement('div');positions.className='position-fields';
    for(const [key,name,min,max] of [['x','横 X',-coordinateLimit(p),coordinateLimit(p)],['y','高さ Y',0,MAX_BUILD_Y],['z','奥行 Z',-coordinateLimit(p),coordinateLimit(p)]])field(positions,name,o[key],min,max,gridStep(o,key),n=>{o[key]=n;alignPiece(o,p);return o[key];});fine.append(positions);
    if(['box','platform','moving','door','bounce','hazard','wall','floor','roof','ramp'].includes(o.type))for(const [key,name] of [['w','はば'],['h','たかさ'],['d','おくゆき']])field(fine,name,o[key],['wall','floor','roof','bounce','hazard'].includes(o.type)?.2:.5,10,.5,n=>o[key]=n);
    const positionDetails=details('位置・大きさを数字でちょうせい',[fine]);positionDetails.className='placement-controls';if(!commonObject)el.append(positionDetails);
    const copy=document.createElement('button');setReadingText(copy,'＋ 同じパーツをもう１つ');copy.onclick=()=>{if(p.objects.length>=MAX_PARTS){api.toast('パーツは2000個まで置けます');return;}const duplicate=structuredClone(o);duplicate.id=crypto.randomUUID();for(const a of duplicate.events||[])if(a.target===o.id)a.target=duplicate.id;let found=false;for(const [dx,dz] of [[Math.max(4,Math.ceil(o.w/4)*4),0],[0,Math.max(4,Math.ceil(o.d/4)*4)],[-Math.max(4,Math.ceil(o.w/4)*4),0],[0,-Math.max(4,Math.ceil(o.d/4)*4)]]){duplicate.x=o.x+dx;duplicate.z=o.z+dz;if(!GRID_PARTS.has(o.type)){duplicate.x=clamp(o.x+2,-coordinateLimit(p),coordinateLimit(p));duplicate.z=o.z;found=true;break;}alignPiece(duplicate,p);if(!editorPlacementReason(duplicate,p.objects,p.spawn)){found=true;break;}}if(!found){api.toast('隣のマスが空いていません');return;}p.objects.push(duplicate);select(duplicate.id);save();rebuild();api.objectList();inspect();};
    if(!commonObject){duplicateSelected=copy.onclick;duplicateButton.disabled=p.objects.length>=MAX_PARTS;}
  }
  function weapons(){if(api.renderLoadout){api.renderLoadout();return;}
    advancedWeaponFields();const el=$('#weapon3'),advanced=[...el.childNodes];el.replaceChildren();const p=getProject();
    const current=Object.keys(WEAPON_PRESETS).find(k=>['speed','interval','damage','spread'].every(field=>WEAPON_PRESETS[k][field]===p.weapon[field]))||'custom';
    selectField(el,'武器のタイプ',[...Object.entries(WEAPON_PRESETS).map(([k,v])=>[k,v.name]),['custom','自分でちょうせい']],current,k=>{if(k!=='custom'){const {name,...weapon}=WEAPON_PRESETS[k];p.weapon=weapon;weapons();}});
    el.append(details('速さ・つよさを工夫する',advanced));
  }
  function chooseWeapon(){const d=document.createElement('dialog'),h=document.createElement('h2');setReadingText(h,'どの銃をアイテムにする？');d.append(h);const random=document.createElement('button');setReadingText(random,'ランダムでひとつ');random.onclick=()=>{setTool('weapon','@random');d.close();d.remove();};d.append(random);for(const tool of getProject().loadout){const b=document.createElement('button'),icon=document.createElement('span'),caption=document.createElement('span');b.className='door-choice';icon.className='hot-gun-icon';icon.innerHTML=gunPreviewSVG(tool);setReadingText(caption,tool.name);b.append(icon,caption);b.onclick=()=>{setTool('weapon',tool.id);d.close();d.remove();};d.append(b);}const cancel=document.createElement('button');setReadingText(cancel,'もどる');cancel.onclick=()=>{d.close();d.remove();};d.oncancel=()=>d.remove();d.append(cancel);document.body.append(d);d.showModal();}
  function chooseBuildingPalette(kind){
    const dialog=document.createElement('dialog'),heading=document.createElement('h2'),note=document.createElement('p'),grid=document.createElement('div'),cancel=document.createElement('button');dialog.className='architecture-picker';grid.className='architecture-choices';
    const entries=kind==='floor'?Object.entries(FLOOR_PRESETS).map(([key,name])=>['floor',key,name]):kind==='door'?Object.entries(DOOR_PRESETS).filter(([key,p])=>!p.window&&key!=='slide').map(([key,p])=>['door',key,p.name]):kind==='roof'?Object.entries(ROOF_PRESETS).map(([key,name])=>[key.startsWith('gable')?'wall':'roof',key,name]):kind==='ramp'?Object.entries(RAMP_PRESETS).map(([key,name])=>['ramp',key,name]):[...Object.entries(FENCE_PRESETS).map(([key,name])=>['wall',key,name]),...Object.entries(DOOR_PRESETS).filter(([,p])=>p.window).map(([key,p])=>['door',key,p.name])];
    setReadingText(heading,kind==='floor'?'どの床を置く？':kind==='door'?'どのドアを置く？':kind==='roof'?'三角屋根のパーツをえらぶ':kind==='ramp'?'どのスロープを置く？':'かべ・まど・さくをえらぶ');
    setReadingText(note,kind==='floor'?'ハーフの床は半マスの広さ。２枚で１マスになるよ。90度回すと向きが変わるよ。':kind==='door'?'普通のドアは半マスの幅で、残りは壁だよ。ふすまは半マス幅の扉が２枚・４枚。近くの１枚が動くよ。近づいて「あける」で開け閉めできるよ。':kind==='roof'?'ななめ屋根の高い端を押すと、反対向きの屋根がつながるよ。三角のかべは屋根の端を押すと、向きと高さがそろうよ。90°ずつ回して使えるよ。':kind==='ramp'?'角のスロープは90°ずつ回して、２つの方向につながる角に合わせよう。':'かべと同じ１マスのはばだよ。開くまどは、たしかめる画面で近づいて「あける」を押そう。');
    for(const [type,key,name]of entries){const button=document.createElement('button'),icon=document.createElement('span'),caption=document.createElement('span');button.type='button';button.dataset.preset=key;icon.className='architecture-icon';icon.innerHTML=architectureIcon(key);setReadingText(caption,name);button.append(icon,caption);button.onclick=()=>{setTool(type,key);dialog.close();dialog.remove();};grid.append(button);}
    setReadingText(cancel,'もどる');cancel.onclick=()=>{dialog.close();dialog.remove();};dialog.oncancel=()=>dialog.remove();dialog.append(heading,note,grid,cancel);document.body.append(dialog);dialog.showModal();
  }
  function chooseDoor(){chooseBuildingPalette('door');}
  function renderPalette(){
    const selected=api.getToolSelection?.()||{type:'select'},paletteType=['gableLeft','gableRight'].includes(selected.preset)?'roof':selected.type==='door'&&DOOR_PRESETS[selected.preset]?.window?'wall':selected.type;
    const rows=[['#palette3',['wall','floor','roof','ramp','box','platform','moving','bounce','hazard','door']],['#palette-extra3',['enemy','ally','actor','weapon','star','key','heal','checkpoint','plate','goal']]];
    const shortNames={wall:'かべ・まど',floor:'ゆか',roof:'やね',ramp:'スロープ',box:'ブロック',moving:'うごく',platform:'あしば',bounce:'ジャンプ',hazard:'ダメージ',enemy:'てき',ally:'みかた',actor:'やくしゃ',weapon:'じゅう',star:'ほし',key:'カギ',heal:'かいふく',checkpoint:'セーブ',plate:'スイッチ',goal:'ゴール'};
    for(const [selector,types]of rows){
      const palette=$(selector);palette.replaceChildren();
      for(const type of types){
        const button=document.createElement('button'),icon=document.createElement('span'),name=document.createElement('span');
        button.className='part'+(paletteType===type?' active':'');button.dataset.part=type;button.setAttribute('aria-label',type==='wall'?'かべ・まど・さく':PARTS[type]);button.setAttribute('aria-pressed',String(paletteType===type));button.title=PARTS[type];
        icon.className='part-icon';icon.textContent=ICONS[type];icon.setAttribute('aria-hidden','true');name.className='part-caption';setReadingText(name,shortNames[type]||PARTS[type]);button.append(icon,name);
        button.onclick=()=>type==='door'?chooseDoor():type==='weapon'?chooseWeapon():['wall','floor','ramp','roof'].includes(type)?chooseBuildingPalette(type):setTool(type,'');palette.append(button);
      }
    }
  }
  document.querySelectorAll('[data-editor-tool]').forEach(button=>{button.onclick=()=>setTool(button.dataset.part,'');});
  renderPalette();
  return {inspect,weapons,palette:renderPalette,finishBasic,resumeBasic:()=>{if(commonObject)(commonObject.type==='enemy'?enemyDialog:partDialog).showModal();}};
}
