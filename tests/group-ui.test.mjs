import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as T from '../vendor/three.module.min.js';
import {fresh3D,part} from '../engine3d.js';
import {groupSteps,groupCandidate,commitGroup,copyGroupNearby} from '../group-edit3d.js';
import {createEditHistory} from '../history3d.js';
const source=readFileSync(new URL('../app3d.js',import.meta.url),'utf8'),code=source.slice(source.indexOf('function resetGroupSelection('),source.indexOf('function updateGroupDrag('));
function setup(){
 const project=fresh3D();project.worldSize=240;project.spawn.z=80;project.objects=[part('floor',0,0),part('wall',0,2)];const history=createEditHistory(project),nodes=new Map(),nudge={dataset:{groupAxis:'x',groupSign:'1'}},errors=[];
 const node=()=>{const classes=new Set();return {classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name);},contains:name=>classes.has(name)},setAttribute(){}};};
 const c={T,project,history,multiSelect:false,groupMoving:false,groupIds:new Set(),groupOutline:new T.LineSegments(new T.BufferGeometry(),new T.LineBasicMaterial()),mode:'edit',commonPreview:null,look:null,meshes:new Map(),selected:'old',tool:'floor',placementLook:false,groupSteps,groupCandidate,commitGroup,copyGroupNearby,isLiveRangeEditing:()=>false,$:id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},setReadingText:(el,text)=>el.textContent=text,document:{querySelectorAll:q=>q==='[data-group-axis]'?[nudge]:[]},resetInput(){},syncPlacementUI(){},objectList(){},inspector(){},toast:error=>errors.push(error),save(){history.record(project);},rebuild(){c.meshes.clear();for(const o of project.objects){const mesh=new T.Mesh(new T.BoxGeometry(o.w,o.h,o.d));mesh.position.set(o.x,o.y+o.h/2,o.z);c.meshes.set(o.id,mesh);}c.updateGroupSelection();},updateSelection(){c.updateGroupSelection();}};vm.createContext(c);vm.runInContext(code,c);c.rebuild();return {c,nudge,nodes,errors};
}
test('まとめてえらぶ→移動→コピー→削除→できたが一つの編集フローとして動く',()=>{
 const {c,nudge,nodes,errors}=setup();nodes.get('#multi-select3').onclick();assert.equal(c.multiSelect,true);assert.equal(nodes.get('main').classList.contains('group-editing'),true);assert.equal(c.selected,null);assert.equal(c.tool,'select');
 c.project.objects.forEach(o=>c.groupIds.add(o.id));c.updateGroupSelection();assert.equal(c.groupOutline.visible,true);assert.equal(nodes.get('#group-count3').textContent,'2こ えらんだ');
 nodes.get('#group-move3').onclick();assert.equal(c.groupMoving,true);nodes.get('#group-nudge3').open=true;nodes.get('#group-pick3').onclick();assert.equal(nodes.get('#group-nudge3').open,false);nodes.get('#group-move3').onclick();nudge.onclick();assert.equal(c.project.objects[0].x,4);assert.equal(c.groupIds.size,2);
 nodes.get('#group-copy3').onclick();assert.equal(c.project.objects.length,4);const copied=[...c.groupIds];assert.equal(copied.length,2);assert.ok(copied.every(id=>!c.project.objects.slice(0,2).some(o=>o.id===id)));
 nodes.get('#group-delete3').onclick();assert.equal(c.project.objects.length,2);assert.equal(c.groupIds.size,0);assert.equal(c.history.undo().objects.length,4);
 nodes.get('#group-done3').onclick();assert.equal(c.multiSelect,false);assert.equal(nodes.get('main').classList.contains('group-editing'),false);assert.equal(nodes.get('#group-tools3').hidden,true);assert.equal(c.groupOutline.visible,false);assert.deepEqual(errors,[]);
});
test('選びなおす、通常ツールへの切替、もどすで消えたIDが選択から外れる',()=>{
 const {c,nodes}=setup();c.setMultiSelect(true);c.groupIds.add(c.project.objects[0].id);c.updateGroupSelection();nodes.get('#group-clear3').onclick();assert.equal(c.groupIds.size,0);assert.equal(nodes.get('#group-move3').disabled,true);
 c.groupIds.add('removed-id');c.updateGroupSelection();assert.equal(c.groupIds.size,0);c.groupIds.add(c.project.objects[0].id);c.updateGroupSelection();c.resetGroupSelection();assert.equal(c.groupOutline.visible,false);assert.equal(nodes.get('#group-tools3').hidden,true);
});

test('ドラッグ中に別の操作を押すと未確定の移動を取り消してから操作する',()=>{
 const {c,nodes}=setup();c.setMultiSelect(true);c.project.objects.forEach(o=>c.groupIds.add(o.id));c.updateGroupSelection();let cancelled=0;c.look={drag:{group:[...c.groupIds]}};c.finishEditorDrag=commit=>{assert.equal(commit,false);cancelled++;c.look.drag=null;};nodes.get('#group-copy3').onclick();assert.equal(cancelled,1);assert.equal(c.look,null);assert.equal(c.project.objects[0].x,0);assert.equal(c.project.objects.length,4);
});
