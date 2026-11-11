import test from 'node:test';
import assert from 'node:assert/strict';
import {createChoiceControl,enhanceChoiceControl} from '../choices3d.js';
import {toolsDOM} from './tools-dom-fixture.mjs';
test('見える選択ボタンは押した時だけ変更し、数値更新・無効化・選択の復元を保つ',t=>{
 const previous=globalThis.document,{doc}=toolsDOM();globalThis.document=doc;t.after(()=>globalThis.document=previous);
 const group=createChoiceControl();for(const [value,name]of [['','なし'],['a','その場で待つ'],['b','追いかける']])group.add({value,textContent:name,dataset:{}});group.value='a';let changes=0;group.onchange=()=>changes++;
 group.options[2].onclick();assert.equal(group.value,'b');assert.equal(changes,1);assert.equal(group.options[2].getAttribute('aria-pressed'),'true');assert.equal(group.options[1].getAttribute('aria-pressed'),'false');group.options[2].onclick();assert.equal(changes,1);
 group.value='a';assert.equal(changes,1);group.disabled=true;group.options[2].onclick();assert.equal(group.value,'a');assert.ok(group.options.every(b=>b.disabled));group.disabled=false;group.options[0].onclick();assert.equal(group.value,'');assert.equal(changes,2);
});
test('ページにあるルールのボタンも、プルダウンを生成せず選択状態を同期する',t=>{
 const previous=globalThis.document,{doc}=toolsDOM();globalThis.document=doc;t.after(()=>globalThis.document=previous);
 const group=doc.createElement('div');for(const value of ['off','on']){const button=doc.createElement('button');button.value=value;group.append(button);}enhanceChoiceControl(group);group.value='on';assert.equal(group.options[1].getAttribute('aria-pressed'),'true');assert.equal(group.querySelector('select'),null);
});
