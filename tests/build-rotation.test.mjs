import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh3D,create3D,step3D,validate3D} from '../engine3d.js';
import {facingBuildRotation,makeTool,placement,topAt,giveBlock,blockTemplate,constructionPart,blockPlacement} from '../building3d.js';
import {bindGameAction,installGameTouchGuard} from '../input3d.js';

test('同じマスを狙い、４方向を選んで四辺を壁で囲める',()=>{
 const p=fresh3D();p.loadout=[makeTool('wall')];const g=create3D(p),point={x:0,y:0,z:0};
 for(const [rotation,x,z,w,d] of [[0,0,2,4,.25],[90,2,0,.25,4],[180,0,-2,4,.25],[270,-2,0,.25,4]]){
  const before=g.objects.length;step3D(g,p,{fire:true,buildPoint:point,buildRotation:rotation},.02);assert.equal(g.objects.length,before+1,g.message);const o=g.objects.at(-1);assert.deepEqual([o.x,o.z,o.w,o.d],[x,z,w,d]);g.cooldown=0;
 }
 p.objects=structuredClone(g.objects).map(({maxHp,origin,built,...o})=>o);assert.equal(validate3D(p).objects.length,4);
});
test('スロープ銃と拾ったスロープの４方向が、プレビュー・配置・坂の高さに反映される',()=>{
 for(const rotation of [0,90,180,270]){
  const p=fresh3D();p.loadout=[makeTool('ramp')];const g=create3D(p),point={x:0,y:0,z:0},preview=placement(g,p.loadout[0],point,rotation);
  assert.equal(preview.piece.rotation,rotation);step3D(g,p,{fire:true,buildPoint:point,buildRotation:rotation},.02);const o=g.objects[0];assert.equal(o.rotation,rotation);
  const a=rotation*Math.PI/180;assert.ok(topAt(o,-Math.sin(a)*1.9,-Math.cos(a)*1.9)>2.9);assert.ok(topAt(o,Math.sin(a)*1.9,Math.cos(a)*1.9)<.1);
  const collected=create3D(p);giveBlock(collected,blockTemplate(constructionPart('ramp')));assert.equal(blockPlacement(collected,point,rotation).piece.rotation,rotation);
 }
});
class Button extends EventTarget{disabled=false;setAttribute(){}setPointerCapture(){}contains(t){return t===this||t?.inside===this;}click(){emit(this,'click',{detail:0});}}
function emit(target,type,properties){const e=new Event(type,{cancelable:true});for(const[k,v]of Object.entries(properties))Object.defineProperty(e,k,{value:v});target.dispatchEvent(e);return e;}
test('回転ボタンはタッチから１回だけ動作し、互換クリックとキャンセルを重複実行しない',()=>{
 const b=new Button();let count=0;bindGameAction(b,()=>count++);
 emit(b,'pointerdown',{pointerId:1,clientX:10,clientY:10});emit(b,'pointerup',{pointerId:1,clientX:12,clientY:12});assert.equal(count,1);b.click();assert.equal(count,1);
 emit(b,'pointerdown',{pointerId:2,clientX:10,clientY:10});emit(b,'pointercancel',{pointerId:2});emit(b,'pointerup',{pointerId:2,clientX:10,clientY:10});assert.equal(count,1);
 emit(b,'pointerdown',{pointerId:3,clientX:10,clientY:10});emit(b,'pointerup',{pointerId:3,clientX:60,clientY:10});assert.equal(count,1);
});
test('スティック操作中も回転し、ズーム防止処理が回転を二重実行しない',()=>{
 const doc=new Button(),view=new Button(),b=new Button();view.ownerDocument=doc;b.inside=view;b.closest=q=>q.includes('[data-game-action]')?b:q==='button'?b:null;let count=0;bindGameAction(b,()=>count++);installGameTouchGuard(view,()=>true);
 const finger={identifier:2,target:b,clientX:10,clientY:10};emit(doc,'touchstart',{target:b,changedTouches:[finger]});emit(b,'pointerdown',{pointerId:2,clientX:10,clientY:10});emit(b,'pointerup',{pointerId:2,clientX:10,clientY:10});const end=emit(doc,'touchend',{target:b,changedTouches:[finger],touches:[{identifier:1}]});assert.ok(end.defaultPrevented);assert.equal(count,1);
});

test('見る方向に壁の面とスロープの登る方向がそろう',()=>{
 for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2,Math.PI*4])for(const effect of ['wall','ramp']){
  const rotation=facingBuildRotation(yaw),fx=-Math.sin(yaw),fz=-Math.cos(yaw),p=fresh3D();p.spawn={x:-fx*8,y:0,z:-fz*8};p.loadout=[makeTool(effect)];const g=create3D(p),point={x:0,y:0,z:0},preview=placement(g,p.loadout[0],point,rotation);
  assert.ok(preview.valid,preview.reason);step3D(g,p,{fire:true,yaw,buildPoint:point,buildRotation:rotation},.02);const o=g.objects[0];assert.ok(o);assert.equal(o.rotation,preview.piece.rotation);
  if(effect==='wall'){assert.ok(Math.abs((o.x-p.spawn.x)*fx+(o.z-p.spawn.z)*fz-6)<.001);assert.ok(Math.abs(fx)*o.w+Math.abs(fz)*o.d<.26);}
  else{assert.ok(topAt(o,fx*1.9,fz*1.9)>2.9);assert.ok(topAt(o,-fx*1.9,-fz*1.9)<.1);}
 }
});
test('視線を変えても追加の90度回転を反映し、４回で自動の向きに戻る',()=>{
 for(const yaw of [0,.3,Math.PI/2,-Math.PI/2,Math.PI,Math.PI*100+.2]){const base=facingBuildRotation(yaw);for(const offset of [0,90,180,270,360])assert.equal(facingBuildRotation(yaw,offset),(base+offset)%360);}
 assert.equal(facingBuildRotation(Math.PI/6),0);assert.equal(facingBuildRotation(Math.PI/3),90);assert.equal(facingBuildRotation(-Math.PI/3),270);
});
test('拾ったブロックも視線に合わせた向きで置ける',()=>{for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){const p=fresh3D(),g=create3D(p);giveBlock(g,blockTemplate(constructionPart('ramp')));const result=blockPlacement(g,{x:0,y:0,z:0},facingBuildRotation(yaw));assert.ok(result.valid,result.reason);assert.equal(result.piece.rotation,facingBuildRotation(yaw));}});
