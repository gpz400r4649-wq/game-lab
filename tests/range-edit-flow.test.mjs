import test from 'node:test';import assert from 'node:assert/strict';
import {renderEnemyRange} from '../enemy-range-ui3d.js';
import {makeAttackRange,validAttackRange,validMoveRange} from '../enemy-range3d.js';

// Small DOM stand-in for testing button flows and project writes without a GPU.
class Element {
 constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.dataset={};this.attributes={};this.style={setProperty(){}};this.className='';this.value='';this.classList={toggle:()=>{}};}
 append(...nodes){for(const n of nodes){n.parentElement=this;this.children.push(n);}}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 get firstChild(){return this.children[0];}
 set textContent(value){this.replaceChildren(this.ownerDocument.createTextNode(value));}
 get textContent(){return this.children.map(n=>n.textContent).join('');}
 set innerHTML(value){this.children=[];if(value.includes('map-stick-thumb')){const thumb=this.ownerDocument.createElement('span');thumb.className='map-stick-thumb';this.append(thumb);}}
 setAttribute(k,v){this.attributes[k]=String(v);}getAttribute(k){return this.attributes[k]??null;}removeAttribute(k){delete this.attributes[k];}
 closest(query){return query.split(',').some(t=>t.trim()===this.tagName)?this:this.parentElement?.closest(query)||null;}
 querySelector(query){return all(this).find(n=>query.startsWith('.')?n.className.split(' ').includes(query.slice(1)):n.tagName===query);}
 get options(){return this.children;}add(option){this.append(option);}
 showModal(){this.open=true;}close(){this.open=false;}remove(){this.parentElement.children=this.parentElement.children.filter(n=>n!==this);}
}
function all(root){return root.children.flatMap(n=>[n,...all(n)]);}
function setup(t,key,range){
 const old={document:globalThis.document,Option:globalThis.Option,cancelAnimationFrame:globalThis.cancelAnimationFrame};
 const doc=new EventTarget();doc.defaultView=new EventTarget();doc.createElement=tag=>new Element(tag,doc);doc.createTextNode=value=>({textContent:String(value),children:[]});doc.body=doc.createElement('body');
 globalThis.document=doc;globalThis.Option=function(text,value){const o=doc.createElement('option');o.textContent=text;o.value=value;return o;};globalThis.cancelAnimationFrame=()=>{};
 t.after(()=>Object.assign(globalThis,old));
 const o={type:'enemy',x:8,z:8,...(range?{[key]:structuredClone(range)}:{})},before=structuredClone(o),calls={save:0,rebuild:0,view:[]},parent=doc.createElement('div');
 renderEnemyRange(parent,o,{save:()=>calls.save++,rebuild:()=>calls.rebuild++,showRange:k=>calls.view.push(k),getRangeView:()=>key,getProject:()=>({worldSize:60,spawn:{x:0,z:0}})},key);
 const row=parent.children[0],preview=row.children[0],edit=row.children[1];
 const open=()=>{edit.onclick();return doc.body.children.find(n=>n.tagName==='dialog');};
 return {o,before,calls,doc,preview,open};
}
for(const key of ['moveRange','searchRange','attackRange']){
 test(`${key}: ステージ表示は編集画面を開かず、設定も保存しない`,t=>{
  const s=setup(t,key);s.preview.onclick();assert.deepEqual(s.calls.view,[key]);assert.equal(s.doc.body.children.length,0);assert.deepEqual(s.o,s.before);assert.equal(s.calls.save,0);
 });
 for(const configured of [false,true])test(`${key}: ${configured?'設定済み':'未設定'}の範囲を開いて閉じても設定が変わらず、最初のフォーカスは見出し`,t=>{
  const range=key==='moveRange'?{space:'world',cells:[[1,1],[2,1]]}:makeAttackRange('cross',3,2),s=setup(t,key,configured?range:null),dialog=s.open();
  assert.ok(dialog.open);const shape=all(dialog).find(n=>n.getAttribute?.('aria-label')==='はんいの形');assert.equal(shape.value,configured&&key!=='moveRange'?'cross':'custom');assert.equal(shape.options.length,4);assert.ok(shape.options.every(option=>option.value!==''));const heading=dialog.children[0];assert.equal(heading.tagName,'h2');assert.equal(heading.getAttribute('autofocus'),'');assert.equal(heading.getAttribute('tabindex'),'-1');assert.ok(!all(dialog).some(n=>n.tagName==='select'&&n.getAttribute('autofocus')!==null));assert.deepEqual(s.o,s.before);assert.equal(s.calls.save,0);assert.equal(s.calls.rebuild,0);
  dialog.oncancel({preventDefault(){}});assert.deepEqual(s.o,s.before);assert.equal(s.calls.save,0);
 });
 test(`${key}: マスを押した時だけ設定が作られ、再編集でも保たれる`,t=>{
  const s=setup(t,key),dialog=s.open(),cell=all(dialog).find(n=>n.tagName==='button'&&n.getAttribute('aria-pressed')==='false');cell.onclick();assert.equal(s.calls.save,1);assert.equal(s.o[key].cells.length,1);assert.ok(key==='moveRange'?validMoveRange(s.o[key]):validAttackRange(s.o[key]));
  dialog.oncancel({preventDefault(){}});const edited=structuredClone(s.o);s.open();assert.deepEqual(s.o,edited);assert.equal(s.calls.save,1);
 });
 test(`${key}: 形を明示的に選んだ時にだけマスを置き換える`,t=>{
  const s=setup(t,key),dialog=s.open(),shape=all(dialog).find(n=>n.getAttribute?.('aria-label')==='はんいの形');shape.value='cross';shape.onchange();assert.equal(s.calls.save,1);assert.ok(s.o[key].cells.length>1);assert.ok(key==='moveRange'?validMoveRange(s.o[key]):validAttackRange(s.o[key]));
 });
}
