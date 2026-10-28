import {setReadingText,applyReadings,kanaText} from './readings3d.js?v=20261028e';
import {LIMITS,PROJECTILES,IMPACTS,impactEffects,weaponPresetKey,SHOT_PATTERNS,cadenceHandling} from './weapons3d.js?v=20261028e';
import {makeTool,TOOL_EFFECTS,BUILD_TYPES,equipTool,undoStructure,keepStructures} from './building3d.js?v=20261028e';
import {WEAPON_PRESETS} from './engine3d.js?v=20261028e';
export function createToolsUI(api){
  const {$,getProject,getGame,getMode,field,save,refresh,finishBuilding}=api;
  let editing=0,rotation=0,level=0;
  const dialog=document.createElement('dialog');dialog.className='tools-dialog';dialog.id='tools-dialog3';document.body.append(dialog);
  function selectField(parent,label,values,current,change){const l=document.createElement('label');l.className='field choice-field';const caption=document.createElement('span');setReadingText(caption,label);l.append(caption);const s=document.createElement('select');s.setAttribute('aria-label',label);values.forEach(([k,v])=>s.add(new Option(kanaText(v),k)));s.value=current;s.onchange=()=>change(s.value);l.append(s);parent.append(l);return s;}
  function changed(){save();renderHotbar();}
  function renderEditor(){
    const p=getProject();editing=Math.min(editing,p.loadout.length-1);const tool=p.loadout[editing];dialog.replaceChildren();
    const title=document.createElement('h2');setReadingText(title,'持ちものと銃づくり');const intro=document.createElement('p');setReadingText(intro,'「何を出す銃にする？」を選ぼう。遊んでいるときは画面の持ちもの、または数字キーで持ち替えられるよ。');dialog.append(title,intro);
    const list=document.createElement('div');list.className='tool-editor-list';p.loadout.forEach((t,i)=>{const b=document.createElement('button');setReadingText(b,`${i+1}. ${t.name}`);b.classList.toggle('active',i===editing);b.onclick=()=>{editing=i;renderEditor();};list.append(b);});dialog.append(list);
    const nameLabel=document.createElement('label');nameLabel.className='field choice-field';const nameCaption=document.createElement('span');setReadingText(nameCaption,'銃の名前');nameLabel.append(nameCaption);const name=document.createElement('input');name.type='text';name.setAttribute('aria-label','銃の名前');name.maxLength=32;name.value=tool.name;name.oninput=()=>{if(name.value.trim()){tool.name=name.value;changed();}};name.onchange=()=>{name.value=tool.name;};nameLabel.append(name);dialog.append(nameLabel);
    selectField(dialog,'この銃から出るもの',Object.entries(TOOL_EFFECTS),tool.effect,effect=>{tool.effect=effect;changed();renderEditor();});
    selectField(dialog,'この銃をいつ使える？',[['start','最初から持つ'],['pickup','イベントで拾って使う']],tool.pickupOnly?'pickup':'start',v=>{tool.pickupOnly=v==='pickup';changed();renderEditor();});
    let syncPreset=()=>{};const tuningControls=new Map();
      function performanceField(parent,label,key,min,max,step,choices){
        let sync=()=>{};
        const assign=n=>{const previous=tool[key];tool[key]=step===1?Math.round(n):n;if(key==='interval'&&Math.abs(previous-tool[key])>.000001){Object.assign(tool,cadenceHandling(tool.interval));tuningControls.get('recoil')?.();tuningControls.get('aimJitter')?.();}sync();syncPreset();return tool[key];};
        const old=field(parent,label,tool[key],min,max,step,assign),number=old.querySelector('input'),row=document.createElement('div'),caption=document.createElement('label'),group=document.createElement('div');
        row.className='performance-field';number.id=`tune-${editing}-${key}`;caption.htmlFor=number.id;setReadingText(caption,label);group.className='tuning-options';group.setAttribute('role','radiogroup');group.setAttribute('aria-label',label+'のかんたん調整');
        const radios=[];
        for(const [text,value] of choices){
          const choice=document.createElement('label'),radio=document.createElement('input'),textNode=document.createElement('span');radio.type='radio';radio.name=number.id;radio.value=value;radio.setAttribute('aria-label',text);setReadingText(textNode,text);const amount=document.createElement('small');amount.textContent=value;choice.append(radio,textNode,amount);group.append(choice);radios.push([radio,value]);
          radio.onchange=()=>{if(!radio.checked)return;number.value=value;assign(value);changed();};
        }
        const custom=document.createElement('label'),customRadio=document.createElement('input'),customText=document.createElement('span');customRadio.type='radio';customRadio.name=number.id;customRadio.value='custom';customRadio.setAttribute('aria-label','数値で調整');setReadingText(customText,'こまかく');custom.append(customRadio,customText);group.append(custom);customRadio.onchange=()=>number.focus();
        sync=()=>{let matched=false;for(const [radio,value] of radios){radio.checked=Math.abs(tool[key]-value)<.000001;matched||=radio.checked;}customRadio.checked=!matched;};sync();tuningControls.set(key,()=>{number.value=tool[key];sync();});row.append(caption,group,number);old.replaceWith(row);
      }
    if(tool.effect==='shoot'){
      let presetSelect;
      syncPreset=()=>{if(presetSelect)presetSelect.value=weaponPresetKey(tool,WEAPON_PRESETS);};
      presetSelect=selectField(dialog,'かんたん設定',[['custom','自分で調整中'],...Object.entries(WEAPON_PRESETS).map(([k,v])=>[k,v.name])],weaponPresetKey(tool,WEAPON_PRESETS),key=>{if(key!=='custom'){const {name,...stats}=WEAPON_PRESETS[key];Object.assign(tool,stats);delete tool.impacts;changed();renderEditor();}});
      selectField(dialog,'どんな弾が出る？',Object.entries(PROJECTILES),tool.projectile,v=>{tool.projectile=v;syncPreset();changed();});
      const impacts=document.createElement('fieldset');impacts.className='impact-choices';const legend=document.createElement('legend');setReadingText(legend,'当たったらどうなる？（いくつでも選べる）');impacts.append(legend);
      const selected=impactEffects(tool);
      for(const [value,label] of Object.entries(IMPACTS)){
        const row=document.createElement('label'),check=document.createElement('input'),caption=document.createElement('span');check.type='checkbox';check.value=value;check.checked=selected.includes(value);check.setAttribute('aria-label',label);setReadingText(caption,label);
        check.onchange=()=>{const values=new Set(impactEffects(tool));if(check.checked)values.add(value);else values.delete(value);tool.impacts=[...values];changed();const scroll=dialog.scrollTop;renderEditor();dialog.scrollTop=scroll;};row.append(check,caption);impacts.append(row);
      }
      const help=document.createElement('p');help.className='component-description';setReadingText(help,'跳ね返る＋爆発なら、ぶつかるたびに爆発して弾は跳ね返るよ。２回まで跳ね返り、その次にぶつかると消えるよ。ダメージは同じ命中で二重にはならないよ。');impacts.append(help);
      const d=document.createElement('div');d.className='weapon-settings';
      selectField(d,'弾の出る形',Object.entries(SHOT_PATTERNS),tool.pattern,v=>{tool.pattern=v;syncPreset();changed();});
      performanceField(d,'どこまで届く？（m）','range',2,LIMITS.maxRange,1,[['ちかく',10],['なかくらい',30],['とおく',60]]);
      performanceField(d,'発射の間かく（秒）','interval',LIMITS.minInterval,2,.01,[['ゆっくり',.8],['ふつう',.25],['はやい',.08]]);
      const handlingNote=document.createElement('p');handlingNote.className='handling-note';setReadingText(handlingNote,'連射を速くすると、反動とブレも大きくなるよ。次はこの２つを下げて、自分が使いやすい銃にしよう。速さをもう一度変えると、この２つの数値も変わるよ。');d.append(handlingNote);
      performanceField(d,'銃の反動（角度）','recoil',0,LIMITS.maxRecoil,.1,[['なし',0],['すこし',1],['おおきい',4]]);
      performanceField(d,'照準のブレ（角度）','aimJitter',0,LIMITS.maxJitter,.1,[['なし',0],['すこし',1],['おおきい',5]]);
      const meaning=document.createElement('p');meaning.className='component-description';setReadingText(meaning,'反動は撃つと視点が上がる強さ。ブレは弾がねらいからずれる広さで、照準の丸が広いほど当てにくくなるよ。');d.append(meaning);
      performanceField(d,'弾のつよさ','damage',1,LIMITS.maxDamage,1,[['よわい',1],['ふつう',5],['つよい',20]]);
      performanceField(d,'弾の大きさ（直径）','size',LIMITS.minSize,LIMITS.maxSize,.05,[['ちいさい',.1],['ふつう',.2],['おおきい',1]]);
      performanceField(d,'いちどに出る数','spread',1,LIMITS.pellets,1,[['すくない',1],['ふつう',3],['たくさん',8]]);
      performanceField(d,'弾の速さ','speed',5,LIMITS.maxSpeed,1,[['ゆっくり',5],['ふつう',24],['はやい',60]]);
      performanceField(d,'弾が広がる角度','spreadAngle',0,45,1,[['まっすぐ',0],['すこし',20],['ひろい',45]]);
      if(selected.includes('explode'))performanceField(d,'爆発の広さ','blastRadius',1,LIMITS.maxBlast,.5,[['せまい',1],['ふつう',3],['ひろい',6]]);
      dialog.append(d,impacts);const note=document.createElement('p');note.className='component-description';setReadingText(note,'まるを選ぶと右の数値も変わるよ。数値を直接変えてもOK。「こまかく」は、右の数値で決める設定だよ。弾の出る形と広がる角度は、弾が２個以上のときに変化がわかるよ。届く距離は、跳ね返った道のりも数えるよ。出せる弾は画面内で96発まで。');dialog.append(note);
    }else{const d=document.createElement('div');d.className='weapon-settings';performanceField(d,'出すブロックの体力','structureHp',1,LIMITS.maxBlockHp,1,[['もろい',5],['ふつう',20],['かたい',100]]);dialog.append(d);const note=document.createElement('p');note.className='component-description';setReadingText(note,`狙った場所に${BUILD_TYPES[tool.effect]}を出す建築銃。緑のプレビューなら置けるよ。向きと高さは遊びながら変更できるよ。`);dialog.append(note);}
    const addRow=document.createElement('div');addRow.className='new-tools';
    for(const [effect,label] of [['shoot','＋ 射撃の銃'],['wall','＋ 壁の銃'],['floor','＋ 床の銃'],['roof','＋ 屋根の銃'],['ramp','＋ スロープの銃']]){const b=document.createElement('button');setReadingText(b,label);b.disabled=p.loadout.length>=8;b.onclick=()=>{p.loadout.push(makeTool(effect));editing=p.loadout.length-1;changed();renderEditor();};addRow.append(b);}dialog.append(addRow);
    const del=document.createElement('button');setReadingText(del,'この持ちものをはずす');del.disabled=p.loadout.length===1;del.onclick=()=>{p.loadout.splice(editing,1);editing=Math.max(0,editing-1);changed();renderEditor();};
    const close=document.createElement('button');setReadingText(close,'設定を閉じる');close.className='primary';close.onclick=()=>{dialog.close();renderLauncher();};dialog.append(del,close);
  }
  function open(){renderEditor();dialog.showModal();}
  function renderLauncher(){const el=$('#weapon3');el.replaceChildren();const note=document.createElement('p');note.className='component-description';setReadingText(note,`${getProject().loadout.length}個の持ちもの。射撃の銃も、部品を出す建築銃も追加できるよ。`);const b=document.createElement('button');setReadingText(b,'持ちもの・銃をつくる');b.className='primary';b.onclick=open;el.append(note,b);}
  function renderHotbar(){
    const p=getProject(),g=getGame(),el=$('#hotbar3');el.replaceChildren();p.loadout.forEach((t,i)=>{const b=document.createElement('button');b.className='hot-slot';b.classList.toggle('active',g?.equipped===i);const locked=getMode()==='play'&&g?.inventory&&!g.inventory.includes(t.id);b.disabled=!!locked;setReadingText(b,`${i+1} ${locked?'🔒 拾って使う ':''}${t.effect==='shoot'?'✦':'▧'} ${t.name}`);b.setAttribute('aria-label',`持ちもの ${i+1} ${t.name}`);b.onclick=()=>{if(g)equipTool(g,p,i);renderHotbar();};el.append(b);});
    const tool=p.loadout[g?.equipped??0],building=getMode()==='play'&&!!tool&&tool.effect!=='shoot';$('#buildbar3').hidden=!building;$('#build-status3').hidden=!building;setReadingText($('#fire3'),building?'建てる ▧':tool?'発射 ✦':'銃をひろおう');setReadingText($('#build-level3'),`高さ ${level>=0?'+':''}${level} 段`);
    $('#undo-build3').disabled=!g?.buildings.length;$('#keep-build3').disabled=!g?.buildings.length;
  }
  $('#rotate-build3').onclick=()=>{rotation=(rotation+90)%360;setReadingText($('#rotate-build3'),`向き ↻ ${rotation}°`);};
  $('#lower-build3').onclick=()=>{level=Math.max(-4,level-1);renderHotbar();};$('#raise-build3').onclick=()=>{level=Math.min(4,level+1);renderHotbar();};
  $('#undo-build3').onclick=()=>{const g=getGame();if(g){undoStructure(g);refresh();renderHotbar();}};
  $('#keep-build3').onclick=()=>{const g=getGame();if(!g)return;const count=keepStructures(getProject(),g);save();finishBuilding(count);};
  window.addEventListener('keydown',e=>{if(getMode()!=='play'||e.target.matches('input,select,textarea')||document.querySelector('dialog[open]'))return;
    if(/^[1-8]$/.test(e.key)){equipTool(getGame(),getProject(),Number(e.key)-1);renderHotbar();}
    if(e.key.toLowerCase()==='r')$('#rotate-build3').click();if(e.key==='[')$('#lower-build3').click();if(e.key===']')$('#raise-build3').click();
  });
  const openButton=$('#tools-open3');openButton.onclick=open;
  return {renderLauncher,renderHotbar,getRotation:()=>rotation,getLevel:()=>level,reset(){rotation=0;level=0;setReadingText($('#rotate-build3'),'向き ↻ 0°');renderHotbar();}};
}
