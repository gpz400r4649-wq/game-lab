import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {fresh3D,part} from '../engine3d.js';
import {rotatePiece,editorPlacementReason} from '../building3d.js';
import {createEditHistory} from '../history3d.js';
const source=readFileSync(new URL('../app3d.js',import.meta.url),'utf8'),code=source.slice(source.indexOf('function canRotateSelectedPart('),source.indexOf('function resetGroupSelection('));
function setup(type='wall'){
 const project=fresh3D();project.worldSize=240;project.spawn.z=80;const piece=part(type,0,type==='wall'?2:0);project.objects=[piece];const history=createEditHistory(project),nodes=new Map(),errors=[];const node=()=>({hidden:true,style:{},setAttribute(name,value){this[name]=value;},addEventListener(){},getBoundingClientRect(){return {left:900,top:420,width:280,height:250};}});const button=node();nodes.set('#rotate-selected3',button);
 const c={project,mode:'edit',multiSelect:false,commonPreview:null,liveRange:false,editedObject:()=>project.objects.find(o=>o.id===c.selected),selected:piece.id,isLiveRangeEditing:()=>c.liveRange,$:id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},window:{innerWidth:1280,innerHeight:720,addEventListener(){}},structuredClone,rotatePiece,editorPlacementReason,resetInput(){},save(){history.record(project);},rebuild(){c.syncSelectedPartActions();},inspector(){},toast:message=>errors.push(message)};vm.createContext(c);vm.runInContext(code,c);return {c,piece,button,history,errors,nodes};
}
test('壁・床・屋根・階段・ドアを選んだ時にだけ回転ボタンを表示する',()=>{
 for(const type of ['wall','floor','roof','ramp','door']){const {c,button}=setup(type);c.syncSelectedPartActions();assert.equal(button.hidden,false);c.selected=null;c.syncSelectedPartActions();assert.equal(button.hidden,true);}
 for(const type of ['enemy','ally','actor','star']){const {c,button}=setup(type);c.syncSelectedPartActions();assert.equal(button.hidden,true);}
 const {c,button}=setup();for(const patch of [{mode:'play'},{multiSelect:true},{commonPreview:{}},{liveRange:true}]){const previous={mode:c.mode,multiSelect:c.multiSelect,commonPreview:c.commonPreview,liveRange:c.liveRange};Object.assign(c,patch);c.syncSelectedPartActions();assert.equal(button.hidden,true);Object.assign(c,previous);}
});
test('ステージ内のボタンから壁を回し、位置をグリッドへそろえて一度のもどすで戻せる',()=>{
 const {c,piece,button,history,errors}=setup(),before=JSON.stringify(c.project);button.onclick();assert.deepEqual([piece.x,piece.z,piece.rotation],[2,0,90]);assert.deepEqual([piece.w,piece.d],[.25,4]);assert.equal(JSON.stringify(history.undo()),before);assert.deepEqual(errors,[]);
});
test('スロープは4方向へ回せて、隣のパーツに重なる回転は取り消す',()=>{
 const {piece,button}=setup('ramp');const before=[piece.x,piece.z,piece.w,piece.d];for(const rotation of [90,180,270,0]){button.onclick();assert.equal(piece.rotation,rotation);}assert.deepEqual([piece.x,piece.z,piece.w,piece.d],before);
 const blocked=setup();blocked.c.project.objects.push(part('box',2,0));const original=JSON.stringify(blocked.c.project);blocked.button.onclick();assert.equal(JSON.stringify(blocked.c.project),original);assert.equal(blocked.errors.length,1);
});

test('位置調整は必要な時だけ開き、右側の設定を押し下げず、画面内に収まる',()=>{
 const {c,nodes}=setup();c.syncSelectedPartActions();const open=nodes.get('#placement-open3'),panel=nodes.get('#placement-panel3');assert.equal(open.hidden,false);assert.equal(panel.hidden,true);open.onclick();assert.equal(panel.hidden,false);assert.equal(open['aria-expanded'],'true');assert.equal(panel.style.left,'608px');assert.equal(panel.style.top,'420px');
 c.window.innerHeight=400;c.positionPlacementPanel();assert.equal(panel.style.top,'138px');nodes.get('#placement-close3').onclick();assert.equal(panel.hidden,true);assert.equal(open['aria-expanded'],'false');
 open.onclick();c.selected=null;c.syncSelectedPartActions();assert.equal(panel.hidden,true);assert.equal(open.hidden,true);
});
