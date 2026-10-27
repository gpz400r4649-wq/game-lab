import test from 'node:test';
import assert from 'node:assert/strict';
import {installGameTouchGuard,bindHeldButton} from '../input3d.js';

class Surface extends EventTarget{
  setPointerCapture(){}
  contains(target){return target===this||target?.inside===this;}
}
function emit(surface,type,props={}){
  const e=new Event(type,{cancelable:true});for(const [key,value] of Object.entries(props))Object.defineProperty(e,key,{value});surface.dispatchEvent(e);return e.defaultPrevented;
}
function setup(){
  const doc=new Surface(),view=new Surface();view.ownerDocument=doc;let playing=true;
  const reset=installGameTouchGuard(view,()=>playing);
  const control={inside:view,closest:()=>true},button={inside:view,closest:()=>false};
  return {doc,view,control,button,reset,edit:()=>playing=false};
}
test('移動と連射の２本指操作でSafariのタッチ・ズーム動作を取り消す',()=>{
  const {doc,view,control}=setup();
  assert.ok(emit(view,'touchstart',{target:control,changedTouches:[{identifier:1}],touches:[{}]}));
  assert.ok(emit(view,'touchstart',{target:control,changedTouches:[{identifier:2}],touches:[{},{}]}));
  assert.ok(emit(view,'touchmove',{target:control,touches:[{},{}]}));
  for(const type of ['gesturestart','gesturechange','gestureend'])assert.ok(emit(doc,type));
  assert.ok(emit(view,'touchend',{target:control,touches:[{}]}));
});
test('連打・長押しもゲーム画面内ではブラウザの操作にならない',()=>{
  const {view,control}=setup();for(let i=0;i<20;i++){
    assert.ok(emit(view,'touchstart',{target:control,touches:[{}]}));
    assert.ok(emit(view,'touchend',{target:control,touches:[]}));
  }
  assert.ok(emit(view,'dblclick'));assert.ok(emit(view,'contextmenu'));
});
test('持ち替え・やりなおすボタンの１本指タップと横スクロールは妨げない',()=>{
  const {view,button}=setup();for(const type of ['touchstart','touchmove','touchend'])assert.equal(emit(view,type,{target:button,touches:[{}]}),false);
  assert.ok(emit(view,'touchmove',{target:button,touches:[{},{}]}));
});
test('編集画面やゲーム画面外のジェスチャーを止めない',()=>{
  const {view,doc,control,edit}=setup();assert.equal(emit(doc,'gesturestart'),false);
  edit();assert.equal(emit(view,'touchstart',{target:control,touches:[{},{}]}),false);
  assert.equal(emit(doc,'gesturechange',{target:control}),false);assert.equal(emit(view,'dblclick'),false);
});
test('指を離す・操作をリセットすると画面外のズームを再び許可する',()=>{
  const {view,doc,control,reset}=setup();emit(view,'touchstart',{target:control,changedTouches:[{identifier:3}],touches:[{}]});
  assert.ok(emit(doc,'gesturechange'));emit(doc,'touchend',{changedTouches:[{identifier:3}]});assert.equal(emit(doc,'gesturechange'),false);
  emit(view,'touchstart',{target:control,changedTouches:[{identifier:4}],touches:[{}]});reset();assert.equal(emit(doc,'gesturechange'),false);
});
test('別の指の終了イベントでは連射中の指を解除しない',()=>{
  const fire=new Surface();let firing=false,count=0;bindHeldButton(fire,()=>{firing=true;count++;},()=>firing=false);
  emit(fire,'pointerdown',{pointerId:2});assert.ok(firing);
  for(const type of ['pointerup','pointercancel','lostpointercapture'])emit(fire,type,{pointerId:1});
  assert.ok(firing);assert.equal(count,1);emit(fire,'pointerup',{pointerId:2});assert.equal(firing,false);
});
test('発射ボタンに２本触れた場合も最後の指まで連射を維持する',()=>{
  const fire=new Surface();let firing=false;const reset=bindHeldButton(fire,()=>firing=true,()=>firing=false);
  emit(fire,'pointerdown',{pointerId:1});emit(fire,'pointerdown',{pointerId:2});emit(fire,'pointerup',{pointerId:1});assert.ok(firing);
  emit(fire,'lostpointercapture',{pointerId:1});assert.ok(firing);emit(fire,'pointercancel',{pointerId:2});assert.equal(firing,false);
  emit(fire,'pointerdown',{pointerId:5});reset();assert.equal(firing,false);emit(fire,'pointerup',{pointerId:5});assert.equal(firing,false);
});
