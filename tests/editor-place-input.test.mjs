import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {inheritNewCharacter} from '../character-defaults3d.js';
const source=readFileSync(new URL('../app3d.js',import.meta.url),'utf8');
function setup(placementLook=false){
 const surface={setPointerCapture(){},focus(){},addEventListener(){}};
 const c={commonPreview:null,editedObject:()=>null,inheritNewCharacter,surface,mode:'edit',tool:'floor',selected:null,look:null,editorPointer:null,placementLook,GRID_PARTS:new Set(['floor']),editYaw:0,editPitch:.7,project:{objects:[]},stageRangePointer:()=>false,pointOnDragPlane:()=>null,enemyEditHeight:()=>0,isLiveRangeEditing:()=>false,hits:()=>[],objectsGroup:{},visibleHit:()=>true,withinSurface:e=>e.clientX>=0&&e.clientX<=100&&e.clientY>=0&&e.clientY<=100,updateEditorGhost(){c.previews++},previews:0,editorCandidate:e=>({piece:{id:'new',x:e.clientX,z:e.clientY}}),save(){},rebuild(){},objectList(){},inspector(){},toast(){},PARTS:{floor:'床'},finishEditorDrag(){},ghost:{visible:true},clamp:(n,a,b)=>Math.min(b,Math.max(a,n))};
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
