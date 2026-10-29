import test from 'node:test';import assert from 'node:assert/strict';
import {panMapCenter,createMapStick} from '../map-stick3d.js';
test('スティックは表示場所だけを動かし、時間や斜め入力で速度が暴れない',()=>{
 const position={x:0,z:0},next=panMapCenter(position,{x:1,z:0},.02,960);assert.ok(next.x>0);assert.equal(next.z,0);assert.deepEqual(position,{x:0,z:0});const diagonal=panMapCenter(position,{x:1,z:1},.02,960);assert.ok(Math.hypot(diagonal.x,diagonal.z)<=.560001);assert.ok(Math.abs(panMapCenter(position,{x:1,z:0},100,960).x-1.4)<.000001);
});
test('マップ端を越えず、小さいマップでは全体表示のまま動かない',()=>{
 let pos={x:0,z:0};for(let i=0;i<1000;i++)pos=panMapCenter(pos,{x:1,z:-1},.05,960);assert.equal(pos.x,112);assert.equal(pos.z,-112);assert.deepEqual(panMapCenter({x:0,z:0},{x:1,z:1},.05,60),{x:0,z:0});assert.deepEqual(panMapCenter(pos,{x:0,z:0},.05,960),pos);
});
function setup(){const doc=new EventTarget();doc.defaultView=new EventTarget();const thumb={style:{}},root={ownerDocument:doc,querySelector:()=>thumb,getBoundingClientRect:()=>({left:0,top:0,width:100,height:100}),setPointerCapture:()=>{}},inputs=[],stick=createMapStick(root,input=>inputs.push(input));const event=(id,x=82,y=50)=>({pointerId:id,clientX:x,clientY:y,preventDefault(){}});return {root,thumb,inputs,stick,event,doc};}
test('指を離す・キャンセル・キャプチャ消失・画面切替でスティックが止まる',()=>{
 for(const release of ['onpointerup','onpointercancel','onlostpointercapture']){const s=setup();s.root.onpointerdown(s.event(1));assert.ok(s.inputs.at(-1).x>0);s.root[release](s.event(1));assert.deepEqual(s.inputs.at(-1),{x:0,z:0});assert.equal(s.thumb.style.transform,'');s.stick.destroy();}
 const s=setup();s.root.onpointerdown(s.event(1));s.doc.defaultView.dispatchEvent(new Event('blur'));assert.deepEqual(s.inputs.at(-1),{x:0,z:0});s.stick.destroy();const n=s.inputs.length;s.doc.dispatchEvent(new Event('visibilitychange'));assert.equal(s.inputs.length,n);
});
test('別の指の動作を混ぜず、再開後も新しい指で操作できる',()=>{
 const s=setup();s.root.onpointerdown(s.event(1));const n=s.inputs.length;s.root.onpointermove(s.event(2,0,0));s.root.onpointerup(s.event(2));assert.equal(s.inputs.length,n);s.root.onpointerup(s.event(1));s.root.onpointerdown(s.event(3,50,10));assert.ok(s.inputs.at(-1).z<0);s.stick.destroy();
});
