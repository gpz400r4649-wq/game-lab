import {prepareEnemyDropWeapon} from '../enemy-loot3d.js';
import {DOOR_PRESETS} from '../doors3d.js';
import {fencePresetKey,FLOOR_PRESETS,FENCE_PRESETS,RAMP_PRESETS,ROOF_PRESETS} from '../architecture3d.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {inheritNewCharacter} from '../character-defaults3d.js';
const source=readFileSync(new URL('../app3d.js',import.meta.url),'utf8');
function setup(placementLook=false){
 const surface={setPointerCapture(){},focus(){},addEventListener(){}};
 const c={fencePresetKey,FLOOR_PRESETS,DOOR_PRESETS,FENCE_PRESETS,RAMP_PRESETS,ROOF_PRESETS,multiSelect:false,groupMoving:false,groupIds:new Set(),tapped:[],showTappedCharacterRange:e=>c.tapped.push([e.clientX,e.clientY]),yaw:0,pitch:0,commonPreview:null,prepareEnemyDropWeapon,editedObject:()=>null,inheritNewCharacter,surface,mode:'edit',tool:'floor',selected:null,look:null,editorPointer:null,placementLook,GRID_PARTS:new Set(['floor']),editYaw:0,editPitch:.7,project:{objects:[]},stageRangePointer:()=>false,pointOnDragPlane:()=>null,enemyEditHeight:()=>0,isLiveRangeEditing:()=>false,hits:()=>[],objectsGroup:{},objectId:object=>object.id,groupUpdates:0,updateSelection(){c.groupUpdates++},updateEditorDrag(e,drag){c.groupDrag=drag;},visibleHit:()=>true,withinSurface:e=>e.clientX>=0&&e.clientX<=100&&e.clientY>=0&&e.clientY<=100,updateEditorGhost(){c.previews++},previews:0,editorCandidate:e=>({piece:{id:'new',x:e.clientX,z:e.clientY}}),save(){},rebuild(){},objectList(){},inspector(){},toast(){},PARTS:{floor:'床'},finishEditorDrag(){},ghost:{visible:true},clamp:(n,a,b)=>Math.min(b,Math.max(a,n))};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('surface.onpointerdown='),source.indexOf("document.querySelectorAll('[data-orbit]')")),c);
 const event=(x,y,id=1)=>({clientX:x,clientY:y,pointerId:id,preventDefault(){}});return {c,surface,event};
}
test('押している間はプレビューだけ動き、離すと最後の位置に１個置く',()=>{
 const {c,surface,event}=setup();surface.onpointerdown(event(10,10));surface.onpointermove(event(70,40));assert.equal(c.project.objects.length,0);assert.equal(c.editYaw,0);assert.equal(c.editPitch,.7);assert.equal(c.previews,1);surface.onpointerup(event(70,40));assert.equal(c.project.objects.length,1);assert.equal(c.project.objects[0].x,70);
});
test('見わたすではカメラが回り、タップしても置かない',()=>{
 const {c,surface,event}=setup(true);surface.onpointerdown(event(10,10));surface.onpointermove(event(70,40));surface.onpointerup(event(70,40));assert.notEqual(c.editYaw,0);assert.equal(c.project.objects.length,0);surface.onpointerdown(event(10,10));surface.onpointerup(event(10,10));assert.equal(c.project.objects.length,0);
});
test('画面外・キャンセル・別の指では部品を確定しない',()=>{
 for(const cancel of ['outside','cancel']){const {c,surface,event}=setup();surface.onpointerdown(event(10,10));if(cancel==='outside')surface.onpointerup(event(110,40));else{surface.onpointercancel(event(10,10));surface.onpointerup(event(10,10));}assert.equal(c.project.objects.length,0);}
 const {c,surface,event}=setup();surface.onpointerdown(event(10,10));surface.onpointermove(event(70,40,2));surface.onpointerup(event(70,40,2));assert.equal(c.project.objects.length,0);assert.equal(c.editorPointer.clientX,10);surface.onpointerup(event(10,10));assert.equal(c.project.objects.length,1);
});

test('たしかめるでは短いタップだけが範囲表示になり、ドラッグやキャンセルでは選ばない',()=>{
 const {c,surface,event}=setup();c.mode='play';surface.onpointerdown(event(10,10));surface.onpointerup(event(10,10));assert.deepEqual(c.tapped,[[10,10]]);
 surface.onpointerdown(event(10,10));surface.onpointermove(event(60,30));surface.onpointerup(event(60,30));assert.equal(c.tapped.length,1);assert.notEqual(c.yaw,0);
 surface.onpointerdown(event(10,10));surface.onpointerup(event(30,30));assert.equal(c.tapped.length,1);
 surface.onpointerdown(event(10,10));surface.onpointercancel(event(10,10));surface.onpointerup(event(10,10));assert.equal(c.tapped.length,1);
 surface.onpointerdown(event(10,10));surface.onpointerup(event(10,10,2));assert.equal(c.tapped.length,1);surface.onpointerup(event(10,10));assert.equal(c.tapped.length,2);
 assert.equal(c.project.objects.length,0);
});

test('まとめてえらぶではタップで追加・解除し、ドラッグで視点を動かしても選択は変わらない',()=>{
 const {c,surface,event}=setup();c.multiSelect=true;c.tool='select';c.hits=()=>[{object:{id:'one'}}];
 surface.onpointerdown(event(10,10));surface.onpointerup(event(10,10));assert.deepEqual([...c.groupIds],['one']);
 c.hits=()=>[{object:{id:'two'}}];surface.onpointerdown(event(10,10));surface.onpointerup(event(10,10));assert.deepEqual([...c.groupIds],['one','two']);
 surface.onpointerdown(event(10,10));surface.onpointermove(event(50,50));surface.onpointerup(event(50,50));assert.equal(c.groupIds.size,2);
 surface.onpointerdown(event(10,10));surface.onpointerup(event(10,10));assert.deepEqual([...c.groupIds],['one']);assert.equal(c.selected,null);
});
test('まとめてうごかすでは選んだパーツをつかみ、グループ全体をドラッグへ渡す',()=>{
 const {c,surface,event}=setup();c.multiSelect=true;c.groupMoving=true;c.tool='select';c.groupIds.add('one');c.groupIds.add('two');c.hits=()=>[{object:{id:'one'},point:{x:0,y:3,z:0}}];
 surface.onpointerdown(event(10,10));surface.onpointermove(event(50,50));assert.deepEqual([...c.groupDrag.group],['one','two']);assert.equal(c.groupDrag.height,3);assert.equal(c.groupIds.size,2);
 surface.onpointerup(event(50,50));assert.equal(c.groupIds.size,2);
});
