import {setReadingText,applyReadings,kanaText} from './readings3d.js?v=20261028c';
import {LIMITS,PROJECTILES,IMPACTS} from './weapons3d.js';
import {makeTool,TOOL_EFFECTS,BUILD_TYPES,equipTool,undoStructure,keepStructures} from './building3d.js';
import {WEAPON_PRESETS} from './engine3d.js';
export function createToolsUI(api){
  const {$,getProject,getGame,getMode,field,save,refresh,finishBuilding}=api;
  let editing=0,rotation=0,level=0;
  const dialog=document.createElement('dialog');dialog.className='tools-dialog';dialog.id='tools-dialog3';document.body.append(dialog);
  function selectField(parent,label,values,current,change){const l=document.createElement('label');l.className='field choice-field';const caption=document.createElement('span');setReadingText(caption,label);l.append(caption);const s=document.createElement('select');s.setAttribute('aria-label',label);values.forEach(([k,v])=>s.add(new Option(kanaText(v),k)));s.value=current;s.onchange=()=>change(s.value);l.append(s);parent.append(l);}
  function changed(){save();renderHotbar();}
  function renderEditor(){
    const p=getProject();editing=Math.min(editing,p.loadout.length-1);const tool=p.loadout[editing];dialog.replaceChildren();
    const title=document.createElement('h2');setReadingText(title,'持ちものと銃づくり');const intro=document.createElement('p');setReadingText(intro,'「何を出す銃にする？」を選ぼう。遊んでいるときは画面の持ちもの、または数字キーで持ち替えられるよ。');dialog.append(title,intro);
    const list=document.createElement('div');list.className='tool-editor-list';p.loadout.forEach((t,i)=>{const b=document.createElement('button');setReadingText(b,`${i+1}. ${t.name}`);b.classList.toggle('active',i===editing);b.onclick=()=>{editing=i;renderEditor();};list.append(b);});dialog.append(list);
    const nameLabel=document.createElement('label');nameLabel.className='field choice-field';const nameCaption=document.createElement('span');setReadingText(nameCaption,'銃の名前');nameLabel.append(nameCaption);const name=document.createElement('input');name.type='text';name.setAttribute('aria-label','銃の名前');name.maxLength=32;name.value=tool.name;name.oninput=()=>{if(name.value.trim()){tool.name=name.value;changed();}};name.onchange=()=>{name.value=tool.name;};nameLabel.append(name);dialog.append(nameLabel);
    selectField(dialog,'この銃から出るもの',Object.entries(TOOL_EFFECTS),tool.effect,effect=>{tool.effect=effect;changed();renderEditor();});
    selectField(dialog,'この銃をいつ使える？',[['start','最初から持つ'],['pickup','イベントで拾って使う']],tool.pickupOnly?'pickup':'start',v=>{tool.pickupOnly=v==='pickup';changed();renderEditor();});
    if(tool.effect==='shoot'){
      selectField(dialog,'かんたん設定',[['custom','いまの設定'],...Object.entries(WEAPON_PRESETS).map(([k,v])=>[k,v.name])],'custom',key=>{if(key!=='custom'){const {name,...stats}=WEAPON_PRESETS[key];Object.assign(tool,stats);changed();renderEditor();}});
      selectField(dialog,'どんな弾が出る？',Object.entries(PROJECTILES),tool.projectile,v=>{tool.projectile=v;changed();renderEditor();});
      selectField(dialog,'当たったらどうなる？',Object.entries(IMPACTS),tool.impact,v=>{tool.impact=v;changed();renderEditor();});
      const d=document.createElement('div');d.className='weapon-settings';
      field(d,'発射の間かく（秒）',tool.interval,LIMITS.minInterval,2,.01,n=>tool.interval=n);
      field(d,'弾のつよさ',tool.damage,1,LIMITS.maxDamage,1,n=>tool.damage=Math.round(n));
      field(d,'弾の大きさ（直径）',tool.size,LIMITS.minSize,LIMITS.maxSize,.05,n=>tool.size=n);
      field(d,'いちどに出る数',tool.spread,1,LIMITS.pellets,1,n=>tool.spread=Math.round(n));
      field(d,'弾の速さ',tool.speed,5,LIMITS.maxSpeed,1,n=>tool.speed=n);
      field(d,'弾が広がる角度',tool.spreadAngle,0,45,1,n=>tool.spreadAngle=n);
      if(tool.impact==='explode')field(d,'爆発の広さ',tool.blastRadius,1,LIMITS.maxBlast,.5,n=>tool.blastRadius=n);
      dialog.append(d);const note=document.createElement('p');note.className='component-description';setReadingText(note,'数を変えて、どう変わるか確かめよう。出せる弾は画面内で96発まで。いっぱいになったら少し待つと、また撃てるよ。');dialog.append(note);
    }else{field(dialog,'出すブロックの体力',tool.structureHp,1,LIMITS.maxBlockHp,1,n=>tool.structureHp=Math.round(n));const note=document.createElement('p');note.className='component-description';setReadingText(note,`狙った場所に${BUILD_TYPES[tool.effect]}を出す建築銃。緑のプレビューなら置けるよ。向きと高さは遊びながら変更できるよ。`);dialog.append(note);}
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
