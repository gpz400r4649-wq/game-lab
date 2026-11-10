import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_BUILD_Y} from '../limits3d.js';
import {editorViewFromPlay,moveEditorCamera,createEditorNavigation} from '../editor-camera3d.js';
test('編集カメラは見ている方向を基準に前後左右へ動く',()=>{for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){const p={x:0,y:0,z:0};moveEditorCamera(p,{z:-1},yaw,20,.02,60);assert.ok(Math.abs(p.x+Math.sin(yaw)*.22)<.00001);assert.ok(Math.abs(p.z+Math.cos(yaw)*.22)<.00001);moveEditorCamera(p,{x:1},yaw,20,.02,60);assert.ok(Math.abs(p.x-(-Math.sin(yaw)+Math.cos(yaw))*.22)<.00001);}});
test('斜め移動で速くなりすぎず、高さを上下でき、地面の下へカメラが潜らない',()=>{const p={x:0,y:0,z:0},distance=20,pitch=.7;moveEditorCamera(p,{x:1,z:1},0,distance,.02,60,pitch);assert.ok(Math.abs(Math.hypot(p.x,p.z)-.22)<.00001);moveEditorCamera(p,{y:-1},0,distance,.02,60,pitch);assert.ok(p.y<0);for(let i=0;i<300;i++)moveEditorCamera(p,{y:-1},0,distance,.05,60,pitch);assert.ok(Math.abs(p.y+Math.sin(pitch)*distance-.5)<.00001);for(let i=0;i<300;i++)moveEditorCamera(p,{y:1},0,distance,.05,60,pitch);assert.equal(p.y,MAX_BUILD_Y+10);});
test('マップの境界で止まり、高速移動と停止が働き、部品データを変えない',()=>{const project={worldSize:960,objects:[{x:5,y:3,z:4}]},before=JSON.stringify(project),normal={x:0,y:0,z:0},fast={...normal};moveEditorCamera(normal,{x:1},0,30,.02,project);moveEditorCamera(fast,{x:1,fast:true},0,30,.02,project);assert.equal(fast.x,normal.x*2.5);const previous={...fast};assert.equal(moveEditorCamera(fast,{},0,30,.02,project),false);assert.deepEqual(fast,previous);fast.x=479.99;moveEditorCamera(fast,{x:1,fast:true},0,30,100,project);assert.equal(fast.x,480);assert.equal(JSON.stringify(project),before);});
class Node extends EventTarget{style={};setPointerCapture(){}getBoundingClientRect(){return {left:0,top:0,width:112,height:112};}querySelector(){return this.thumb;}}
function emit(target,type,properties){const event=new Event(type,{cancelable:true});for(const[k,v]of Object.entries(properties))Object.defineProperty(event,k,{value:v});target.dispatchEvent(event);}
test('編集スティックは入力欄からフォーカスを戻し、別の指の終了では止まらず、自分の指を離すと止まる',()=>{const stick=new Node();stick.thumb=new Node();const up=new Node(),down=new Node(),root={querySelector:s=>({'#edit-stick3':stick,'#edit-rise3':up,'#edit-lower3':down})[s]};let focused=0;const nav=createEditorNavigation(root,()=>focused++);emit(stick,'pointerdown',{pointerId:1,clientX:56,clientY:0});assert.equal(focused,1);assert.equal(nav.read().z,-1);emit(stick,'pointerup',{pointerId:2});assert.equal(nav.read().z,-1);emit(stick,'pointerup',{pointerId:1});assert.equal(nav.read().z,0);emit(up,'pointerdown',{pointerId:3});assert.equal(nav.read().y,1);nav.reset();assert.deepEqual(nav.read(),{x:0,z:0,y:0});assert.equal(stick.thumb.style.transform,'');});

test('たしかめていた場所と階の高さ、見る向きを編集へ引き継ぎ、作品を変えない',()=>{
 const project={worldSize:480,spawn:{x:0,y:0,z:8},objects:[]},player={x:180,y:6,z:-100},before=JSON.stringify({project,player});
 for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){const view=editorViewFromPlay(player,yaw,-.6,project);assert.deepEqual(view.target,{x:180,y:7,z:-100});assert.equal(view.yaw,yaw);assert.equal(view.pitch,.6);assert.ok(view.distance<30);}
 assert.equal(JSON.stringify({project,player}),before);
});
test('上を見ていた場合も周囲を見下ろせる高さになり、落下後やマップ端でも安全に戻る',()=>{
 const view=editorViewFromPlay({x:1000,y:-100,z:-1000},2,1.2,60);assert.deepEqual(view.target,{x:30,y:1,z:-30});assert.ok(view.pitch>0);assert.equal(editorViewFromPlay(null,0,0,60),null);assert.equal(editorViewFromPlay({x:NaN,y:0,z:0},0,0,60),null);
});
test('編集へ戻る時だけカメラを移し、再読み込みや編集ボタンの押し直しでは移さない',async()=>{
 const {readFileSync}=await import('node:fs'),vm=await import('node:vm');const source=readFileSync(new URL('../app3d.js',import.meta.url),'utf8');const code=source.slice(source.indexOf('function setMode('),source.indexOf('function syncHistoryButtons('));
 function setup(mode='play'){
  const noop=()=>{},nodes=new Map(),project={worldSize:480,spawn:{x:0,y:0,z:8},objects:[]};
  const context={mode,project,game:{player:{x:160,y:9,z:-120}},yaw:1.7,pitch:-.5,editorViewFromPlay,editTarget:{x:0,y:0,z:8,set(x,y,z){Object.assign(this,{x,y,z});}},editYaw:.55,editPitch:.7,editDistance:30,closeLiveRangeEditor:noop,$:id=>{if(!nodes.has(id))nodes.set(id,{classList:{toggle:noop}});return nodes.get(id);},giftButton:{},allyButton:{},formationButton:{},syncHistoryButtons:noop,setGamePageMode:noop,resetInput:noop,setReadingText:noop,toolsUI:{renderHotbar:noop},syncPlacementUI:noop,rebuild:noop,renderer:{domElement:{focus:noop}}};vm.createContext(context);vm.runInContext(code,context);return context;
 }
 const c=setup(),before=JSON.stringify(c.project);c.setMode('edit');assert.deepEqual([c.editTarget.x,c.editTarget.y,c.editTarget.z],[160,10,-120]);assert.equal(c.editYaw,1.7);assert.equal(JSON.stringify(c.project),before);
 c.editTarget.x=200;c.setMode('edit');assert.equal(c.editTarget.x,200);
 const loaded=setup();loaded.setMode('edit',{resumeHere:false});assert.equal(loaded.editTarget.x,0);assert.equal(loaded.editDistance,30);
});
