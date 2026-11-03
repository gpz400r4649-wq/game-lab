import test from 'node:test';
import assert from 'node:assert/strict';
import {playRangeCells} from '../play-ranges3d.js';
const enemy=()=>({hp:3,x:8,y:0,z:0,origin:{x:0,z:0},heading:Math.PI/2,moveRange:{space:'world',cells:[[0,0],[1,0]]},searchRange:{space:'facing',cells:[[0,-1]]},attackRange:{cells:[[0,-1]]}});
test('たしかめる：移動エリアは敵が歩いてもマップに固定する',()=>{const e=enemy();assert.deepEqual(playRangeCells(e,'moveRange'),[[0,0],[1,0]]);e.x=16;assert.deepEqual(playRangeCells(e,'moveRange'),[[0,0],[1,0]]);});
test('たしかめる：向きに合わせる範囲は移動・回転に追従する',()=>{const e=enemy();assert.deepEqual(playRangeCells(e,'searchRange'),[[1,0]]);e.heading=0;assert.deepEqual(playRangeCells(e,'searchRange'),[[2,-1]]);e.x=12;assert.deepEqual(playRangeCells(e,'searchRange'),[[3,-1]]);});
test('たしかめる：回転しない旧範囲と、旧移動範囲の起点を保つ',()=>{const e=enemy();assert.deepEqual(playRangeCells(e,'attackRange'),[[2,-1]]);e.moveRange={cells:[[1,0]]};assert.deepEqual(playRangeCells(e,'moveRange'),[[1,0]]);});
test('たしかめる：未配置・倒した敵・出現待ち・未設定はマスを表示しない',()=>{assert.deepEqual(playRangeCells(null,'moveRange'),[]);for(const patch of [{hp:0},{hidden:true},{moveRange:undefined}])assert.deepEqual(playRangeCells({...enemy(),...patch},'moveRange'),[]);});
test('たしかめる：表示しても保存データを変えない',()=>{const e=enemy(),before=structuredClone(e);for(const key of ['moveRange','searchRange','attackRange'])playRangeCells(e,key);assert.deepEqual(e,before);});

test('オン・オフと編集モードで表示を切り替え、倒れたら消す',async()=>{
 const {createPlayRanges}=await import('../play-ranges3d.js');
 const {Scene}=await import('../vendor/three.module.min.js');
 const previous=globalThis.document,checks=[{checked:true},{checked:false},{checked:true}],select={},note={closest:()=>null,replaceChildren(){},append(){}};
 const panel={querySelector:q=>q==='select'?select:note,querySelectorAll:()=>checks};
 globalThis.document={querySelector:()=>panel,createElement:()=>({append(){},setAttribute(){}}),createTextNode:s=>s};
 note.ownerDocument=globalThis.document;
 try{const scene=new Scene(),ui=createPlayRanges(scene),e={...enemy(),id:'e'},game={objects:[e],worldSize:60};
 // Set the target through the same selection callback as the menu.
 select.value='e';select.onchange();ui.update(game,true,100);assert.deepEqual(scene.children.map(m=>m.visible),[true,false,true]);assert.equal(panel.hidden,false);
 checks[0].checked=false;checks[0].onchange();ui.update(game,true,160);assert.deepEqual(scene.children.map(m=>m.visible),[false,false,true]);
 ui.update(game,false,170);assert.ok(scene.children.every(m=>!m.visible));assert.equal(panel.hidden,true);
 e.hp=0;ui.update(game,true,230);assert.ok(scene.children.every(m=>!m.visible));
 }finally{globalThis.document=previous;}
});
