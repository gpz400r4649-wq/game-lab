import test from 'node:test';
import assert from 'node:assert/strict';
import {halfWidthNumber,parseDecimal,configureNumericInput} from '../numeric3d.js';
function setup(options={}){
 const attrs={},values=[],input={dataset:{},selectionStart:0,selectionEnd:0,setAttribute:(k,v)=>attrs[k]=String(v),setSelectionRange(){},focus(){},blur(){}};let text='';Object.defineProperty(input,'value',{get:()=>text,set:v=>text=String(v)});
 const toggle=configureNumericInput(input,{value:1,min:0,max:20,step:.1,onValue:n=>{values.push(n);return n;},onCommit:()=>{},...options});return {input,attrs,values,toggle};
}
test('全角の数字・小数点・プラスマイナスを半角にそろえる',()=>{
 assert.equal(halfWidthNumber('１２．５'),'12.5');assert.equal(halfWidthNumber('－３'),'-3');assert.equal(halfWidthNumber('−３'),'-3');assert.equal(halfWidthNumber('＋０．０８'),'+0.08');
 assert.equal(parseDecimal('１２．５'),12.5);assert.equal(parseDecimal('－．５'),-.5);
});
test('空欄・途中の符号・文字・指数表記を数値として保存しない',()=>{
 for(const value of ['', '−', '.', '-.', 'abc', 'Infinity', '1e3', '0x10', '1,000'])assert.equal(parseDecimal(value),null);
});
test('小数はdecimal、整数はnumericのキーボードを指定する',()=>{
 assert.equal(setup().input.inputMode,'decimal');assert.equal(setup({step:1}).input.inputMode,'numeric');assert.equal(setup().input.enterKeyHint,'done');assert.equal(setup().attrs.role,'spinbutton');
});
test('入力と貼り付けの値を半角表示し、保存には数値を渡す',()=>{
 const {input,values}=setup();input.value='１２．５';input.oninput({});assert.equal(input.value,'12.5');assert.deepEqual(values,[12.5]);input.onchange();assert.equal(input.value,'12.5');
});
test('日本語入力の変換途中は保存せず、確定時に半角へ変換する',()=>{
 const {input,values}=setup();input.oncompositionstart();input.value='１２';input.oninput({isComposing:true});assert.equal(values.length,0);input.oncompositionend();assert.equal(input.value,'12');assert.deepEqual(values,[12]);
});
test('安全な範囲を超えた入力は確定時に上限・下限へそろえる',()=>{
 const {input,values,attrs}=setup({min:.08,max:2,value:.25});input.value='９９９';input.oninput({});assert.equal(values.length,0);input.onchange();assert.equal(input.value,'2');assert.equal(attrs['aria-valuenow'],'2');input.value='－５';input.onchange();assert.equal(input.value,'0.08');
});
test('空欄や不正な値で確定しても直前の値を失わない',()=>{
 const {input}=setup({value:4});input.value='';input.onchange();assert.equal(input.value,'4');input.value='不明';input.onchange();assert.equal(input.value,'4');
});
test('マイナスの位置設定とプラスマイナスの切替を維持する',()=>{
 const {input,toggle}=setup({value:12,min:-28,max:28,step:1});toggle();assert.equal(input.value,'-12');toggle();assert.equal(input.value,'12');input.value='－２８';input.oninput({});assert.equal(input.value,'-28');
});
test('矢印キーでも段階的に調整でき、上限を超えない',()=>{
 const {input}=setup({value:.08,min:.08,max:.1,step:.01});const up={key:'ArrowUp',preventDefault(){}};input.onkeydown(up);assert.equal(input.value,'0.09');input.onkeydown(up);input.onkeydown(up);assert.equal(input.value,'0.1');
});
