import test from 'node:test';
import assert from 'node:assert/strict';
import {enemyMessageState,createMessageTracker,createEnemyMessages} from '../enemy-messages3d.js';
import {part,fresh3D,create3D,step3D} from '../engine3d.js';
import {setEnemyRoutine} from '../enemy-behavior-presets3d.js';
import {PerspectiveCamera} from '../vendor/three.module.min.js';
const tick=(g,p,n)=>{for(let i=0;i<n;i++)step3D(g,p,{},.02);};
function setup(){const p=fresh3D(),e=part('enemy',0,0);e.attackEnabled=false;setEnemyRoutine(e,{idle:'wait',notice:'near',lost:'return'});e.searchRange={space:'world',cells:[[1,0]]};p.objects=[e];p.spawn={x:20,y:0,z:0};return {p,g:create3D(p)};}
test('頭上の行動は実際の待機・追跡・帰還に合わせて変わる',()=>{const {p,g}=setup(),e=g.objects[0];tick(g,p,2);assert.equal(enemyMessageState(e,g.player).action,'wait');g.player.x=4;tick(g,p,40);assert.equal(enemyMessageState(e,g.player).action,'chase');g.player.x=20;tick(g,p,2);assert.equal(enemyMessageState(e,g.player).action,'return');tick(g,p,100);assert.equal(enemyMessageState(e,g.player).action,'wait');});
test('気づいた・見失ったは変化時だけ表示し、同じ状態で延長しない',()=>{const {g}=setup(),e=g.objects[0],t=createMessageTracker();assert.equal(t.read(e,g.player,0).event,'');g.player.x=4;assert.equal(t.read(e,g.player,100).event,'！ きづいた');assert.equal(t.read(e,g.player,1800).event,'');g.player.x=20;assert.equal(t.read(e,g.player,1900).event,'？ みうしなった');assert.equal(t.read(e,g.player,3600).event,'');});
test('最初から追う敵や追わない敵には気づいたメッセージを出さない',()=>{for(const notice of ['always','none']){const {g}=setup(),e=g.objects[0];e.routine.notice=notice;g.player.x=4;assert.equal(createMessageTracker().read(e,g.player,0).event,'');}});
test('敵を切り替えたりやり直した時は前の吹き出しを持ち越さない',()=>{const {g}=setup(),e=g.objects[0],t=createMessageTracker();g.player.x=4;t.read(e,g.player,0);g.player.x=20;assert.equal(t.read({...e,id:'other'},g.player,100).event,'');t.reset();assert.equal(t.read(e,g.player,200).event,'');});
test('頭上表示はオンオフ・編集・死亡・出現待ち・カメラ後方で隠れる',()=>{
 const old=globalThis.document,state={},bubble={},toggle={checked:true},root={style:{},querySelector:q=>q.includes('state')?state:bubble},viewport={clientWidth:800,clientHeight:600};globalThis.document={querySelector:q=>q==='#enemy-message3'?root:q==='#viewport'?viewport:toggle};
 try{const ui=createEnemyMessages(),{g}=setup(),e=g.objects[0],camera=new PerspectiveCamera(60,4/3,.1,100);camera.position.set(0,3,10);camera.lookAt(0,2,0);ui.update(g,true,e.id,camera,0);assert.equal(root.hidden,false);assert.equal(state.textContent,'まっている');assert.ok(root.style.left.endsWith('px'));toggle.checked=false;ui.update(g,true,e.id,camera,10);assert.equal(root.hidden,true);toggle.checked=true;
 for(const patch of [{hp:0},{hidden:true}]){Object.assign(e,patch);ui.update(g,true,e.id,camera,20);assert.equal(root.hidden,true);e.hp=3;e.hidden=false;}ui.update(g,false,e.id,camera,30);assert.equal(root.hidden,true);camera.lookAt(0,3,20);ui.update(g,true,e.id,camera,40);assert.equal(root.hidden,true);
 }finally{globalThis.document=old;}
});
