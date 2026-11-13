import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh3D,validate3D} from '../engine3d.js';
import {createPlayerRulesUI} from '../player-rules-ui3d.js';
import {toolsDOM} from './tools-dom-fixture.mjs';
function setup(t){
 const previous={document:globalThis.document,Option:globalThis.Option},dom=toolsDOM();Object.assign(globalThis,{document:dom.doc,Option:dom.Option});t.after(()=>Object.assign(globalThis,previous));const p=fresh3D(),root=dom.doc.createElement('div'),friendly=dom.doc.createElement('div');friendly.id='friendly';dom.doc.body.append(root,friendly);let saved=0;
 const field=(parent,label,value,min,max,step,change)=>{const row=dom.doc.createElement('label'),input=dom.doc.createElement('input');row.className='field';input.value=value;input.setAttribute('aria-label',label);input.onchange=()=>{input.value=change(Number(input.value));saved++;};row.append(input);parent.append(row);return row;};
 const ui=createPlayerRulesUI({root,getProject:()=>p,field,save:()=>saved++,friendlyFire:friendly});ui.render();const tab=key=>root.querySelectorAll('[role=tab]').find(b=>b.dataset.page===key).onclick(),page=key=>root.querySelector('#player-rules-'+key),pick=(label,value)=>root.querySelector(`[aria-label="${label}"]`).options.find(b=>b.value===value).onclick();return {p,root,ui,friendly,tab,page,pick,saved:()=>saved};
}
test('落下ダメージをタブから開け、開くだけでは保存せず、選択肢と見本を表示する',t=>{
 const {p,root,tab,page}=setup(t),before=JSON.stringify(p);assert.equal(root.querySelectorAll('[role=tab]').length,3);tab('fall');assert.equal(page('fall').hidden,false);assert.equal(page('player').hidden,true);assert.equal(root.querySelectorAll('select').length,0);assert.equal(JSON.stringify(p),before);assert.ok(page('fall').querySelectorAll('input').every(n=>!n.disabled));assert.equal(page('fall').querySelector('[aria-label="落下ダメージを受ける？"]').value,'on');assert.ok(page('fall').querySelector('.fall-damage-examples').textContent.includes('1 へる'));
});
test('高さのボタンと数字入力が保存され、見本がすぐ変わり、オフでも設定値を保つ',t=>{
 const {p,root,ui,tab,page,pick,saved}=setup(t);tab('fall');pick('落下ダメージを受ける？','off');pick('落下ダメージを受ける？','on');assert.equal(p.playerRules.fallDamage.enabled,true);assert.ok(page('fall').querySelectorAll('input').every(n=>!n.disabled));pick('何ブロック以上落ちたら？の見本','2');assert.equal(p.playerRules.fallDamage.minBlocks,2);
 const damage=page('fall').querySelector('[aria-label="減る体力"]');damage.value='5';damage.onchange();assert.equal(p.playerRules.fallDamage.damage,5);assert.ok(page('fall').querySelector('.fall-damage-examples').textContent.includes('10 へる'));assert.equal(page('fall').querySelector('[aria-label="減る体力の見本"]').value,'5');assert.equal(root.querySelector('[aria-selected="true"]').dataset.page,'fall');
 pick('落下ダメージを受ける？','off');assert.equal(p.playerRules.fallDamage.minBlocks,2);assert.equal(p.playerRules.fallDamage.damage,5);assert.ok(page('fall').querySelectorAll('input').every(n=>n.disabled));assert.ok(saved()>0);assert.ok(validate3D(p));ui.render();assert.equal(page('fall').querySelector('[aria-label="落下ダメージを受ける？"]').value,'off');assert.ok(page('fall').querySelectorAll('input').every(n=>n.disabled));
});
test('プレイヤーの性能・最初の持ちもの・味方への当たり方も同じウインドウで使える',t=>{
 const {p,root,ui,friendly,tab,page}=setup(t);const hp=page('player').querySelector('[aria-label="プレイヤーの体力"]');hp.value='30';hp.onchange();assert.equal(p.playerRules.hp,30);tab('items');assert.ok(page('items').contains(friendly));const first=page('items').querySelector('input');first.checked=false;first.onchange();assert.equal(p.loadout[0].pickupOnly,true);ui.render();assert.equal(page('items').hidden,false);assert.ok(page('items').contains(friendly));assert.equal(root.querySelectorAll('#friendly').length,1);assert.ok(validate3D(p));
});
