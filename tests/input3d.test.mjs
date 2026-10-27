import test from 'node:test';
import assert from 'node:assert/strict';
import {installGameTouchGuard,bindHeldButton,createGamePageMode} from '../input3d.js';
class Surface extends EventTarget{setPointerCapture(){}contains(t){return t===this||t?.inside===this;}}
function emit(surface,type,props={}){const e=new Event(type,{cancelable:true});for(const [key,value] of Object.entries(props))Object.defineProperty(e,key,{value});surface.dispatchEvent(e);return e.defaultPrevented;}
const finger=(identifier,target,x=100,y=100)=>({identifier,target,clientX:x,clientY:y});
function setup(){
 const doc=new Surface(),view=new Surface();view.ownerDocument=doc;let playing=true,clicks=0;
 const reset=installGameTouchGuard(view,()=>playing),control={inside:view,closest:q=>q.startsWith('canvas')?control:null};
 const bar={scrollLeft:0},button={inside:view,disabled:false,click:()=>clicks++,closest:q=>q==='button'?button:q==='#hotbar3'?bar:null};
 const touch=(type,target,changed,touches=changed)=>emit(doc,type,{target,changedTouches:changed,touches});
 return {doc,view,control,button,bar,touch,reset,clicks:()=>clicks,edit:()=>playing=false};
}
test('スティックに指を残したまま二回タップしても、残る指の数にかかわらず終了を抑止する',()=>{
 const {doc,control,touch}=setup(),stick=finger(1,control);assert.ok(touch('touchstart',control,[stick]));
 for(let i=0;i<2;i++){const tap=finger(2,control,300,200);assert.ok(touch('touchstart',control,[tap],[stick,tap]));assert.ok(touch('touchend',control,[tap],[stick]));}
 assert.ok(emit(doc,'gesturestart'));assert.ok(emit(doc,'gesturechange'));assert.ok(touch('touchend',control,[stick],[]));assert.equal(emit(doc,'gesturechange'),false);
});
test('ゲーム画面の余白への二回タップも抑止する',()=>{const {view,control,touch}=setup(),stick=finger(1,control),tap=finger(2,view);touch('touchstart',control,[stick]);for(let i=0;i<2;i++){assert.ok(touch('touchstart',view,[tap],[stick,tap]));assert.ok(touch('touchend',view,[tap],[stick]));}});
test('持ち替えボタンは１本指でも２本指でも１タップにつき１回動く',()=>{
 const s=setup(),tap=finger(2,s.button),stick=finger(1,s.control);assert.ok(s.touch('touchstart',s.button,[tap]));assert.ok(s.touch('touchend',s.button,[tap],[]));assert.equal(s.clicks(),1);
 s.touch('touchstart',s.control,[stick]);s.touch('touchstart',s.button,[tap],[stick,tap]);s.touch('touchend',s.button,[tap],[stick]);assert.equal(s.clicks(),2);
});
test('持ちもの欄の横ドラッグはスクロールし、誤タップにならない',()=>{const s=setup();s.touch('touchstart',s.button,[finger(1,s.button,200)]);s.touch('touchmove',s.button,[finger(1,s.button,150)]);s.touch('touchend',s.button,[finger(1,s.button,150)],[]);assert.equal(s.bar.scrollLeft,50);assert.equal(s.clicks(),0);});
test('無効なボタンやキャンセルではボタン操作を実行しない',()=>{const s=setup(),tap=finger(1,s.button);s.button.disabled=true;s.touch('touchstart',s.button,[tap]);s.touch('touchend',s.button,[tap],[]);assert.equal(s.clicks(),0);s.button.disabled=false;s.touch('touchstart',s.button,[tap]);s.touch('touchcancel',s.button,[tap],[]);assert.equal(s.clicks(),0);assert.equal(emit(s.doc,'gesturechange'),false);});
test('長押しとダブルクリックはゲーム画面内だけで抑止する',()=>{const {doc,view}=setup();assert.ok(emit(doc,'dblclick',{target:view}));assert.ok(emit(doc,'contextmenu',{target:view}));assert.equal(emit(doc,'dblclick'),false);});
test('編集画面やゲーム画面外のジェスチャーを止めない',()=>{const {view,doc,control,touch,edit}=setup();assert.equal(emit(doc,'gesturestart'),false);edit();assert.equal(touch('touchstart',control,[finger(1,control)]),false);assert.equal(emit(doc,'gesturechange',{target:control}),false);assert.equal(emit(doc,'dblclick',{target:view}),false);});
test('リセット後は画面外のズームを再び許可する',()=>{const {doc,control,touch,reset}=setup();touch('touchstart',control,[finger(1,control)]);assert.ok(emit(doc,'gesturechange'));reset();assert.equal(emit(doc,'gesturechange'),false);});
test('プレイ中だけページ拡大設定を制限し、編集では元の値へ戻す',()=>{
 const original='width=device-width, initial-scale=1, viewport-fit=cover',classes=new Set();let content=original;
 const doc={querySelector:()=>({getAttribute:()=>content,setAttribute:(_,v)=>content=v}),documentElement:{classList:{toggle:(n,on)=>on?classes.add(n):classes.delete(n)}}};
 const setMode=createGamePageMode(doc);setMode(true);assert.ok(classes.has('playing3d'));assert.match(content,/maximum-scale=1/);assert.match(content,/user-scalable=no/);setMode(true);assert.equal((content.match(/maximum-scale/g)||[]).length,1);setMode(false);assert.equal(content,original);assert.ok(!classes.has('playing3d'));
});
test('別の指の終了イベントで連射を解除しない',()=>{const fire=new Surface();let firing=false,count=0;bindHeldButton(fire,()=>{firing=true;count++;},()=>firing=false);emit(fire,'pointerdown',{pointerId:2});for(const type of ['pointerup','pointercancel','lostpointercapture'])emit(fire,type,{pointerId:1});assert.ok(firing);assert.equal(count,1);emit(fire,'pointerup',{pointerId:2});assert.equal(firing,false);});
test('発射に２本触れた場合も最後の指まで連射する',()=>{const fire=new Surface();let firing=false;const reset=bindHeldButton(fire,()=>firing=true,()=>firing=false);emit(fire,'pointerdown',{pointerId:1});emit(fire,'pointerdown',{pointerId:2});emit(fire,'pointerup',{pointerId:1});assert.ok(firing);emit(fire,'lostpointercapture',{pointerId:1});assert.ok(firing);emit(fire,'pointercancel',{pointerId:2});assert.equal(firing,false);emit(fire,'pointerdown',{pointerId:5});reset();assert.equal(firing,false);});
