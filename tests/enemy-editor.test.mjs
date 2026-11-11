import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh3D,part,validate3D} from '../engine3d.js';
import {initializeCharacterDefaults} from '../character-defaults3d.js';
import {setEnemyRoutineChoice} from '../enemy-behavior-presets3d.js';
import {createWorkshop} from '../workshop3d.js';
import {toolsDOM} from './tools-dom-fixture.mjs';
function setup(t,{idle='patrol',notice='near',lost='return'}={}){
 const previous={document:globalThis.document,window:globalThis.window,Option:globalThis.Option},dom=toolsDOM();
 Object.assign(globalThis,{document:dom.doc,window:Object.assign(new EventTarget(),{scrollX:0,scrollY:0,scrollTo(){}}),Option:dom.Option});t.after(()=>Object.assign(globalThis,previous));
 const p=fresh3D(),enemy=part('enemy',0,0);setEnemyRoutineChoice(enemy,{idle,notice,lost});p.objects.push(enemy);let selected=enemy.id,saves=0;const nodes=new Map();
 const $=id=>{if(!nodes.has(id)){const el=dom.doc.createElement(id==='aside'?'aside':'div');el.id=id.slice(1);dom.doc.body.append(el);nodes.set(id,el);}return nodes.get(id);};
 const field=(parent,label,value,min,max,step,change)=>{const row=dom.doc.createElement('label'),input=dom.doc.createElement('input');row.className='field';input.value=value;input.setAttribute('aria-label',label);input.onchange=()=>{change(Number(input.value));saves++;};row.append(input);parent.append(row);return row;};
 const ui=createWorkshop({$,getProject:()=>p,getSelected:()=>selected,select:id=>selected=id,save:()=>saves++,rebuild(){},field,advancedInspector(){},advancedWeaponFields(){},loadProject(){},setTool(){},toast(){}});
 ui.inspect();$('#enemy-open3').onclick();const dialog=dom.doc.querySelector('.enemy-workspace'),page=key=>dialog.querySelector('#enemy-settings-'+key),tab=key=>dialog.querySelectorAll('[role=tab]').find(b=>b.dataset.page===key).onclick();
 const choose=(key,label,value)=>{tab(key);const control=page(key).querySelector(`[aria-label="${label}"]`);assert.ok(control,label);const button=control.children.find(b=>b.value===value);assert.ok(button,value);button.onclick();};
 return {p,enemy,dialog,page,tab,choose,ui,$,saves:()=>saves};
}
test('敵の動きの流れを6つのタブで見渡せて、設定を変えても同じタブに戻る',t=>{
 const {p,dialog,page,tab,choose}=setup(t);assert.equal(dialog.querySelectorAll('[role=tab]').length,6);assert.equal(dialog.querySelector('.enemy-settings-tabs').parentElement.tagName,'header');assert.equal(dialog.querySelector('.enemy-behavior-flow').parentElement.tagName,'header');
 assert.ok(page('movement').querySelector('[aria-label="ふだんの動き"]'));assert.equal(page('movement').querySelector('[aria-label="見つけたらどうする？"]'),null);
 assert.ok(page('notice').querySelector('[aria-label="見つけたらどうする？"]'));assert.ok(page('notice').querySelector('[data-range="searchRange"]'));assert.ok(page('lost').querySelector('[aria-label="見失ったら"]'));
 choose('notice','見つけたらどうする？','none');assert.equal(page('notice').hidden,false);assert.ok(page('lost').querySelector('.enemy-page-note'));assert.equal(dialog.querySelectorAll('.enemy-settings-tabs').length,1);
 choose('notice','見つけたらどうする？','near');tab('lost');assert.ok(page('lost').querySelector('[aria-label="見失ったら"]'));assert.equal(page('lost').hidden,false);assert.ok(validate3D(p));
});
test('はじめから追いかける時も使わない設定の理由が見え、動きを変えると編集できる',t=>{
 const {page,choose}=setup(t,{idle:'chase'});for(const key of ['notice','lost'])assert.ok(page(key).querySelector('.enemy-page-note'));
 choose('movement','ふだんの動き','wait');choose('notice','見つけたらどうする？','near');assert.ok(page('notice').querySelector('[data-range="searchRange"]'));assert.ok(page('lost').querySelector('[aria-label="見失ったら"]'));
});
test('攻撃・体力・落とすものを保存でき、ぜんたい設定でも同じ6タブが開く',t=>{
 const {enemy,page,tab,ui,dialog,$}=setup(t);tab('combat');const attack=page('combat').querySelector('input');attack.checked=true;attack.onchange();assert.equal(enemy.attackEnabled,true);assert.equal(page('combat').hidden,false);assert.ok(page('combat').querySelector('[data-range="attackRange"]'));
 tab('body');const hp=page('body').querySelector('[aria-label="体力"]');hp.value='500';hp.onchange();assert.equal(enemy.hp,500);
 tab('loot');page('loot').querySelector('.enemy-loot-items').lastElementChild.onclick();assert.equal(enemy.enemyDrops.length,1);assert.equal(page('loot').hidden,false);
 ui.inspect();const header=dialog.querySelector('header');header.children[1].onclick();assert.equal(dialog.querySelectorAll('[role=tab]').length,6);assert.equal(page('movement').hidden,false);assert.equal($('#enemy-open3').disabled,false);
});

test('範囲を見るために閉じても、設定に戻ると同じタブを表示する',t=>{
 const {dialog,page,tab}=setup(t);tab('notice');page('notice').querySelector('[data-range="searchRange"]').onclick();assert.equal(dialog.open,false);
 window.dispatchEvent(new Event('enemy-range-close'));assert.equal(dialog.open,true);assert.equal(page('notice').hidden,false);assert.equal(dialog.querySelector('[aria-selected="true"]').dataset.page,'notice');
});

test('敵の全タブでプルダウンを使わず選択肢を見せ、選んだ状態と値を保存する',t=>{
 const {p,enemy,dialog,page,tab,choose}=setup(t);assert.equal(dialog.querySelectorAll('select').length,0);
 const idle=page('movement').querySelector('[aria-label="ふだんの動き"]');assert.equal(idle.children.length,5);assert.equal(idle.children.filter(b=>b.getAttribute('aria-pressed')==='true').length,1);
 choose('movement','ふだんの動き','path');choose('movement','最後の場所についたら？','reverse');assert.equal(enemy.routeEnd,'reverse');
 choose('body','からだの大きさ','3');assert.equal(enemy.enemyScale,3);assert.equal(enemy.h,6);assert.equal(page('body').querySelector('[aria-label="からだの大きさ"]').children.length,19);assert.equal(page('body').querySelector('[aria-label="からだの大きさ"]').children.find(b=>b.value==='3').getAttribute('aria-pressed'),'true');
 choose('body','いつ出現する？','event');assert.equal(enemy.startsHidden,true);
 tab('combat');const attack=page('combat').querySelector('input');attack.checked=true;attack.onchange();choose('combat','敵に持たせる銃',p.loadout[0].id);assert.equal(enemy.enemyWeaponId,p.loadout[0].id);
 tab('loot');page('loot').querySelector('.enemy-loot-items').lastElementChild.onclick();choose('loot','落とすもの 1','weapon');choose('loot','落とす銃 1','@random');assert.equal(enemy.enemyDrops[0].weaponId,'@random');assert.equal(dialog.querySelectorAll('select').length,0);assert.ok(validate3D(p));
});
test('ぜんたい設定を参照する選択ボタンも、個別設定へ切り替えると選べる',t=>{
 const {p,enemy,dialog,page,choose,ui,tab}=setup(t);initializeCharacterDefaults(p,part);enemy.characterOverrides=[];ui.inspect();dialog.querySelector('header').children[1].onclick();choose('movement','ふだんの動き','wait');choose('notice','見つけたらどうする？','near');
 const close=dialog.querySelector('header').children[3];close.onclick();ui.inspect();tab('movement');
 let group=page('movement').querySelector('[aria-label="ふだんの動き"]');assert.ok(group.children.every(b=>b.disabled));assert.equal(group.children.find(b=>b.value==='wait').getAttribute('aria-pressed'),'true');
 const check=group.closest('.shared-setting').querySelector('.shared-choice input');check.checked=false;check.onchange();group=page('movement').querySelector('[aria-label="ふだんの動き"]');assert.ok(group.children.every(b=>!b.disabled));choose('movement','ふだんの動き','roam');assert.equal(enemy.routine.idle,'roam');assert.ok(validate3D(p));
});
