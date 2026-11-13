import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh3D,validate3D} from '../engine3d.js';
import {cadenceHandling} from '../weapons3d.js';
import {createToolsUI} from '../tools3d.js';
import {toolsDOM} from './tools-dom-fixture.mjs';
function setup(t){
 const previous={document:globalThis.document,window:globalThis.window,Option:globalThis.Option},dom=toolsDOM();Object.assign(globalThis,{document:dom.doc,window:new EventTarget(),Option:dom.Option});t.after(()=>Object.assign(globalThis,previous));
 const p=fresh3D(),nodes=new Map();let saved=0,openedBlockSettings=0;const $=id=>{if(!nodes.has(id)){const el=dom.doc.createElement('button');el.id=id.slice(1);dom.doc.body.append(el);nodes.set(id,el);}return nodes.get(id);};
 const field=(parent,label,value,min,max,step,change)=>{const row=dom.doc.createElement('label'),input=dom.doc.createElement('input');row.className='field';input.value=value;input.setAttribute('data-numeric','');input.setAttribute('aria-label',label);input.onchange=()=>{input.value=change(Number(input.value));saved++;};row.append(input);parent.append(row);return row;};
 const ui=createToolsUI({openBlockSettings:()=>openedBlockSettings++,$,getProject:()=>p,getGame:()=>null,getMode:()=> 'edit',field,save:()=>saved++,refresh(){},finishBuilding(){}});$('#tools-open3').onclick();const dialog=dom.doc.querySelector('#tools-dialog3'),tab=key=>dialog.querySelectorAll('[role=tab]').find(n=>n.dataset.page===key).onclick(),page=key=>dialog.querySelector('#gun-page-'+key);
 return {p,dialog,tab,page,dom,$,ui,openedBlockSettings:()=>openedBlockSettings,saved:()=>saved};
}
test('銃づくりの主な項目を6タブへ分け、管理操作や長い説明はページに積み重ねない',t=>{
 const {dialog,page,tab}=setup(t);assert.equal(dialog.querySelectorAll('[role=tab]').length,6);assert.equal(dialog.querySelectorAll('select').length,0);assert.equal(dialog.querySelector('.gun-catalog-field'),null);assert.equal(dialog.querySelector('.gun-catalog-list').children.length,1);assert.equal(dialog.querySelector('.gun-catalog-list').children[0].getAttribute('aria-pressed'),'true');assert.equal(page('basic').querySelectorAll('.field').length,4);assert.equal(page('basic').querySelector('.new-tools'),null);
 assert.equal(page('power').querySelectorAll('.performance-field').length,4);assert.equal(page('handling').querySelectorAll('.performance-field').length,3);assert.equal(page('pattern').querySelectorAll('.performance-field').length,2);
 const look=page('look').querySelector('.gun-appearance');assert.equal(look.tagName,'section');assert.ok(look.querySelector('.gun-preview'));assert.ok(look.querySelector('.gun-look-controls .performance-field'));
 for(const help of dialog.querySelectorAll('details[data-gun-help]'))assert.equal(help.open,false);const note=page('handling').querySelector('.handling-note');assert.ok(note.closest('.gun-help'));
 tab('power');assert.equal(page('power').hidden,false);assert.equal(page('basic').hidden,true);
});
test('ラジオと数値入力を残し、連射の変更に反動・ブレが連動して保存される',t=>{
 const {p,page,tab,saved}=setup(t);tab('handling');const interval=page('handling').querySelector('[data-tuning-key="interval"]'),fast=interval.querySelectorAll('input').find(n=>Number(n.value)===.08);fast.checked=true;fast.onchange();assert.equal(p.loadout[0].interval,.08);assert.equal(p.loadout[0].recoil,cadenceHandling(.08).recoil);
 const recoil=page('handling').querySelector('[data-tuning-key="recoil"] input[data-numeric]');recoil.value='0';recoil.onchange();assert.equal(p.loadout[0].recoil,0);assert.ok(saved()>0);assert.ok(validate3D(p));
});
test('爆発と跳ね返りを組み合わせても、設定を保ち、爆発の広さと開いた説明が残る',t=>{
 const {p,page,tab,dialog}=setup(t);tab('impact');const explode=page('impact').querySelectorAll('input').find(n=>n.value==='explode');explode.checked=true;explode.onchange();assert.ok(page('impact').querySelector('[data-tuning-key="blastRadius"]'));
 page('impact').querySelector('.gun-help').open=true;const bounce=page('impact').querySelectorAll('input').find(n=>n.value==='bounce');bounce.checked=true;bounce.onchange();assert.deepEqual(p.loadout[0].impacts,['damage','explode','bounce']);assert.equal(page('impact').querySelector('.gun-help').open,true);assert.equal(dialog.querySelector('[aria-selected="true"]').dataset.page,'impact');assert.ok(validate3D(p));
});
test('上部から銃を追加・切り替え・削除でき、見た目と銃の名前も編集できる',t=>{
 const {p,page,tab,dialog}=setup(t);dialog.querySelector('.new-tools').children[0].onclick();assert.equal(p.loadout.length,2);assert.equal(dialog.querySelector('.gun-catalog-list').children[1].getAttribute('aria-pressed'),'true');
 const name=page('basic').querySelector('input');name.value='わたしの銃';name.oninput();assert.equal(p.loadout[1].name,'わたしの銃');assert.ok(dialog.querySelector('.gun-catalog-list').children[1].textContent.includes('わたしの'));assert.equal(page('basic').querySelector('input').value,'わたしの銃');
 tab('look');const preview=page('look').querySelector('.gun-preview'),before=preview.innerHTML,shape=page('look').querySelector('[aria-label="銃の形"]');shape.options.find(b=>b.value==='launcher').onclick();assert.equal(p.loadout[1].appearance.shape,'launcher');assert.notEqual(preview.innerHTML,before);
 dialog.querySelector('.gun-catalog-list').children[0].onclick();assert.equal(dialog.querySelector('[aria-selected="true"]').dataset.page,'look');assert.equal(dialog.querySelector('.gun-catalog-list').children[0].getAttribute('aria-pressed'),'true');dialog.querySelector('.gun-catalog-actions').children[1].onclick();assert.equal(p.loadout.length,1);assert.ok(validate3D(p));
});
test('建築銃の切替は残し、体力は全体設定へ一本化してその画面を開ける',t=>{
 const {p,page,tab,dialog,openedBlockSettings}=setup(t);const effect=page('basic').querySelector('[aria-label="この銃から出るもの"]');effect.value='wall';effect.onchange();assert.equal(dialog.querySelectorAll('[role=tab]').length,3);tab('build');const choices=page('build').querySelectorAll('input').filter(n=>n.type==='checkbox');assert.equal(choices.length,6);choices[1].checked=true;choices[1].onchange();assert.deepEqual(p.loadout[0].buildChoices,['wall','floor']);
 assert.equal(page('build').querySelector('input[data-numeric]'),null);assert.ok(page('build').querySelector('.build-global-settings'));page('build').querySelector('.build-global-settings button').onclick();assert.equal(openedBlockSettings(),1);assert.equal(dialog.open,false);assert.equal(page('build').querySelector('.gun-help').open,false);assert.ok(validate3D(p));
});

test('8本の銃を常に一覧で表示し、タブを切り替えても選択を保ち、追加上限を守る',t=>{
 const {p,dialog,tab}=setup(t);for(let i=1;i<8;i++)dialog.querySelector('.new-tools').children[0].onclick();
 const checkCatalog=selected=>{const list=dialog.querySelector('.gun-catalog-list');assert.equal(list.children.length,8);assert.equal(list.parentElement.className,'gun-editor-header');for(const [i,button] of list.children.entries()){assert.equal(button.hidden,false);assert.equal(button.getAttribute('aria-pressed'),String(i===selected));assert.equal(button.classList.contains('active'),i===selected);}};
 checkCatalog(7);assert.ok(dialog.querySelector('.new-tools').children.every(button=>button.disabled));
 for(const key of ['power','pattern','handling','look','impact','basic']){tab(key);checkCatalog(7);}
 dialog.querySelector('.gun-catalog-list').children[0].onclick();checkCatalog(0);assert.ok(validate3D(p));
});
