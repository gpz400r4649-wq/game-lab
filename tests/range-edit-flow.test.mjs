import test from 'node:test';import assert from 'node:assert/strict';
import {renderEnemyRange,closeLiveRangeEditor,isLiveRangeEditing} from '../enemy-range-ui3d.js';
import {makeAttackRange,validAttackRange,validMoveRange,defaultEnemyRanges} from '../enemy-range3d.js';

// Small DOM stand-in for testing button flows and project writes without a GPU.
class Element {
 constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.dataset={};this.attributes={};this.style={setProperty(){}};this.className='';this.value='';this.classList={toggle:(name,on)=>{const set=new Set(this.className.split(' ').filter(Boolean));if(on)set.add(name);else set.delete(name);this.className=[...set].join(' ');},add:name=>this.classList.toggle(name,true),remove:name=>this.classList.toggle(name,false),contains:name=>this.className.split(' ').includes(name)};}
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
 get isConnected(){return this===this.ownerDocument.body||!!this.parentElement?.isConnected;}
 getBoundingClientRect(){return {left:0,top:0,width:100,height:100};}setPointerCapture(){}
 focus(){this.ownerDocument.activeElement=this;}
 showModal(){this.open=true;}close(){this.open=false;}remove(){this.parentElement.children=this.parentElement.children.filter(n=>n!==this);}
}
function finish(root){if(root.tagName==='dialog')root.oncancel({preventDefault(){}});else all(root).find(n=>n.classList?.contains('primary')).onclick();}
function all(root){return root.children.flatMap(n=>[n,...all(n)]);}
function setup(t,key,range,worldSize=60){
 const old={document:globalThis.document,Option:globalThis.Option,cancelAnimationFrame:globalThis.cancelAnimationFrame,requestAnimationFrame:globalThis.requestAnimationFrame};
 const frames=new Map();let frameId=0;const doc=new EventTarget();doc.defaultView=new EventTarget();doc.createElement=tag=>new Element(tag,doc);doc.createTextNode=value=>({textContent:String(value),children:[]});doc.body=doc.createElement('body');doc.querySelector=query=>doc.body.querySelector(query);const main=doc.createElement('main'),aside=doc.createElement('aside');aside.scrollTop=140;main.append(aside);doc.body.append(main);
 globalThis.document=doc;globalThis.Option=function(text,value){const o=doc.createElement('option');o.textContent=text;o.value=value;return o;};globalThis.cancelAnimationFrame=id=>frames.delete(id);globalThis.requestAnimationFrame=fn=>{frames.set(++frameId,fn);return frameId;};
 t.after(()=>{closeLiveRangeEditor();Object.assign(globalThis,old);});
 const o={type:'enemy',x:8,z:8,...(range?{[key]:structuredClone(range)}:{})},before=structuredClone(o),calls={save:0,rebuild:0,view:[]},parent=doc.createElement('div');
 renderEnemyRange(parent,o,{save:()=>calls.save++,rebuild:()=>calls.rebuild++,showRange:k=>calls.view.push(k),getRangeView:()=>key,getProject:()=>({worldSize,spawn:{x:0,z:0}})},key);
 const row=parent.children[0],preview=row.children[0],edit=row.children[1];
 const open=()=>{edit.onclick();return all(doc.body).find(n=>n.tagName==='dialog'||n.classList?.contains('range-live-panel'));};
 return {o,before,calls,doc,aside,main,preview,open,frames};
}
for(const key of ['moveRange','searchRange','attackRange']){
 test(`${key}: ステージ表示は編集画面を開かず、設定も保存しない`,t=>{
  const s=setup(t,key);s.preview.onclick();assert.deepEqual(s.calls.view,[key]);assert.ok(!all(s.doc.body).some(n=>n.tagName==='dialog'||n.classList?.contains('range-live-panel')));assert.deepEqual(s.o,s.before);assert.equal(s.calls.save,0);
 });
 for(const configured of [false,true])test(`${key}: ${configured?'設定済み':'未設定'}の範囲を開いて閉じても設定が変わらず、最初のフォーカスは見出し`,t=>{
  const range=key==='moveRange'?{space:'world',cells:[[1,1],[2,1]]}:makeAttackRange('cross',3,2),s=setup(t,key,configured?range:null),dialog=s.open();
  assert.ok(isLiveRangeEditing());const shape=all(dialog).find(n=>n.getAttribute?.('aria-label')==='はんいの形');assert.equal(shape.value,configured&&key!=='moveRange'?'cross':'custom');assert.equal(shape.options.length,4);assert.equal(shape.closest('details'),null);assert.ok(shape.options.every(option=>option.value!==''));const heading=all(dialog).find(n=>n.tagName==='h2');assert.equal(heading.tagName,'h2');assert.equal(heading.getAttribute('autofocus'),'');assert.equal(heading.getAttribute('tabindex'),'-1');assert.ok(!all(dialog).some(n=>n.tagName==='select'&&n.getAttribute('autofocus')!==null));assert.deepEqual(s.o,s.before);assert.equal(s.calls.save,0);assert.equal(s.calls.rebuild,0);
  finish(dialog);assert.deepEqual(s.o,s.before);assert.equal(s.calls.save,0);
 });
 test(`${key}: マスを押した時だけ設定が作られ、再編集でも保たれる`,t=>{
  const s=setup(t,key),dialog=s.open(),cell=all(dialog).find(n=>n.tagName==='button'&&n.getAttribute('aria-pressed')==='false');cell.onclick();assert.equal(s.calls.save,1);assert.equal(s.o[key].cells.length,1);assert.ok(key==='moveRange'?validMoveRange(s.o[key]):validAttackRange(s.o[key]));
  finish(dialog);const edited=structuredClone(s.o);s.open();assert.deepEqual(s.o,edited);assert.equal(s.calls.save,1);
 });
 test(`${key}: 形を明示的に選んだ時にだけマスを置き換える`,t=>{
  const s=setup(t,key),dialog=s.open(),shape=all(dialog).find(n=>n.getAttribute?.('aria-label')==='はんいの形');shape.value='cross';shape.onchange();assert.equal(s.calls.save,1);assert.ok(s.o[key].cells.length>1);assert.ok(key==='moveRange'?validMoveRange(s.o[key]):validAttackRange(s.o[key]));
 });
}

for(const key of ['moveRange','searchRange','attackRange'])test(`${key}: ステージを遮らないサイドパネルで即時反映し、視点を変えても開いたままになる`,t=>{
 const s=setup(t,key),panel=s.open();assert.equal(panel.parentElement,s.aside);assert.equal(panel.getAttribute('role'),'region');assert.equal(all(s.doc.body).some(n=>n.tagName==='dialog'),false);assert.ok(s.main.classList.contains('range-editing'));assert.equal(s.aside.scrollTop,0);assert.equal(s.doc.activeElement.tagName,'h2');
 const view=panel.children.find(n=>n.tagName==='button');view.onclick();assert.ok(isLiveRangeEditing());const cell=all(panel).find(n=>n.tagName==='button'&&n.getAttribute('aria-pressed')==='false');cell.onclick();assert.equal(s.calls.rebuild,1);assert.equal(s.o[key].cells.length,1);closeLiveRangeEditor();assert.equal(isLiveRangeEditing(),false);assert.ok(!s.main.classList.contains('range-editing'));assert.ok(!s.aside.classList.contains('is-range-editing'));assert.equal(s.aside.scrollTop,140);closeLiveRangeEditor();assert.equal(s.calls.save,1);
});

test('広いマップの移動スティックはサイドパネル内でも動き、閉じるとアニメーションを止める',t=>{
 const s=setup(t,'moveRange',null,960),panel=s.open(),stick=all(panel).find(n=>n.getAttribute?.('aria-label')==='マップ移動スティック'),grid=all(panel).find(n=>n.classList?.contains('move-world-grid')),first=grid.children[0].getAttribute('aria-label');
 stick.onpointerdown({pointerId:1,clientX:82,clientY:50,preventDefault(){}});for(const time of [100,132,164]){const [id,callback]=s.frames.entries().next().value;s.frames.delete(id);callback(time);}assert.notEqual(grid.children[0].getAttribute('aria-label'),first);assert.deepEqual(s.o,s.before);assert.equal(s.calls.save,0);assert.ok(s.frames.size>0);closeLiveRangeEditor();assert.equal(s.frames.size,0);assert.equal(isLiveRangeEditing(),false);
});

for(const key of ['searchRange','attackRange']){
 test(`${key}: エリア指定と向き指定を切り替え、編集パネルと現在のマスを維持する`,t=>{
  const range={shape:'custom',cross:4,circle:4,cells:[[0,-1],[1,-1]]},s=setup(t,key,range);s.open();let panel=s.doc.querySelector('.range-live-panel'),mode=all(panel).find(n=>n.getAttribute?.('aria-label')==='はんいの決め方');mode.value='world';mode.onchange();assert.equal(s.o[key].space,'world');assert.deepEqual(s.o[key].cells,[[2,1],[3,1]]);panel=s.doc.querySelector('.range-live-panel');assert.ok(all(panel).some(n=>n.classList?.contains('move-world-grid')));assert.equal(all(s.doc.body).filter(n=>n.classList?.contains('range-live-panel')).length,1);
  mode=all(panel).find(n=>n.getAttribute?.('aria-label')==='はんいの決め方');mode.value='facing';mode.onchange();assert.equal(s.o[key].space,'facing');assert.deepEqual(s.o[key].cells,range.cells);panel=s.doc.querySelector('.range-live-panel');const rotate=all(panel).find(n=>n.tagName==='button'&&n.textContent.startsWith('↻'));const before=structuredClone(s.o[key]);rotate.onclick();assert.equal(s.o.facing,90);assert.deepEqual(s.o[key],before);assert.equal(s.calls.save,3);assert.ok(isLiveRangeEditing());finish(panel);assert.equal(isLiveRangeEditing(),false);
 });
 test(`${key}: 遠いエリアを向き指定へ変えるとき、範囲外のマスを削除しない`,t=>{
  const range={space:'world',cells:[[30,30]]},s=setup(t,key,range,960),panel=s.open(),mode=all(panel).find(n=>n.getAttribute?.('aria-label')==='はんいの決め方');mode.value='facing';mode.onchange();assert.equal(mode.value,'world');assert.deepEqual(s.o[key],range);assert.equal(s.calls.save,0);assert.equal(s.doc.querySelector('.range-live-panel'),panel);assert.ok(all(panel).some(n=>n.tagName==='p'&&!n.hidden&&n.textContent.includes('していないよ')));
 });
}

test('移動の円２マスを初期表示し、広さを変えても敵を置いた中心を維持する',t=>{
 const range=defaultEnemyRanges({x:8,z:8}).moveRange,s=setup(t,'moveRange',range),panel=s.open(),shape=all(panel).find(n=>n.getAttribute?.('aria-label')==='はんいの形'),circle=all(panel).find(n=>n.getAttribute?.('aria-label')==='円の広さ');assert.equal(shape.value,'circle');assert.equal(circle.value,'2');assert.equal(circle.disabled,false);assert.deepEqual(s.o.moveRange,range);assert.equal(s.calls.save,0);circle.value='3';circle.onchange();const cells=s.o.moveRange.cells;assert.equal(cells.length,29);assert.equal((Math.min(...cells.map(c=>c[0]))+Math.max(...cells.map(c=>c[0])))/2,2);assert.equal((Math.min(...cells.map(c=>c[1]))+Math.max(...cells.map(c=>c[1])))/2,2);
});
