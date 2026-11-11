import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../app3d.js',import.meta.url),'utf8'),code=source.slice(source.indexOf('function showTappedCharacterRange('),source.indexOf('surface.onpointerdown='));
function setup(){
 const objects=[{id:'enemy',type:'enemy',hp:3},{id:'ally',type:'ally',hp:3},{id:'wall',type:'wall',hp:20},{id:'actor',type:'actor',hp:3}],calls=[];
 const c={mode:'play',game:{objects},positionCamera(){},objectsGroup:{},visibleHit:hit=>hit.visible!==false,objectId:object=>object.id,hits:()=>[{object:{id:'enemy'}}],playRanges:{showTarget:id=>{calls.push(id);return true;}},allyRangeTarget:{value:''},allyRangePanel:{open:true},allyRangeEnabled:{checked:false,onchange(){calls.push('ally-toggle');}}};vm.createContext(c);vm.runInContext(code,c);return {c,calls,objects};
}
test('敵をタップすると範囲の対象を切り替え、作品やキャラの設定を変えない',()=>{const {c,calls,objects}=setup(),before=JSON.stringify(objects);assert.equal(c.showTappedCharacterRange({}),true);assert.deepEqual(calls,['enemy']);assert.equal(JSON.stringify(objects),before);});
test('味方をタップすると自動選択からその味方の固定表示へ切り替える',()=>{const {c,calls}=setup();c.hits=()=>[{object:{id:'ally'}}];assert.equal(c.showTappedCharacterRange({}),true);assert.equal(c.allyRangeTarget.value,'ally');assert.equal(c.allyRangeEnabled.checked,true);assert.equal(c.allyRangePanel.open,false);assert.deepEqual(calls,['ally-toggle']);});
test('手前の壁越し、役者、空白、倒された敵や出現待ちでは表示を切り替えない',()=>{
 for(const id of ['wall','actor','missing']){const {c,calls}=setup();c.hits=()=>[{object:{id}},{object:{id:'enemy'}}];assert.equal(c.showTappedCharacterRange({}),false);assert.deepEqual(calls,[]);}
 for(const patch of [{hp:0},{hidden:true}]){const {c,calls,objects}=setup();Object.assign(objects[0],patch);assert.equal(c.showTappedCharacterRange({}),false);assert.deepEqual(calls,[]);}
 const {c,calls}=setup();c.hits=()=>[];assert.equal(c.showTappedCharacterRange({}),false);c.mode='edit';assert.equal(c.showTappedCharacterRange({}),false);assert.deepEqual(calls,[]);
});
test('見えないパーツの判定を除いてから、画面上のキャラクターを選ぶ',()=>{const {c,calls}=setup();c.hits=()=>[{object:{id:'wall'},visible:false},{object:{id:'enemy'}}];assert.equal(c.showTappedCharacterRange({}),true);assert.deepEqual(calls,['enemy']);});

test('同じ味方を続けてタップするとオン・オフ・オンになり、別の味方ではオンに切り替える',()=>{
 const {c,objects}=setup();c.hits=()=>[{object:{id:'ally'}}];
 c.showTappedCharacterRange({});assert.equal(c.allyRangeEnabled.checked,true);
 c.showTappedCharacterRange({});assert.equal(c.allyRangeEnabled.checked,false);
 c.showTappedCharacterRange({});assert.equal(c.allyRangeEnabled.checked,true);
 objects.push({id:'ally2',type:'ally',hp:3});c.hits=()=>[{object:{id:'ally2'}}];c.showTappedCharacterRange({});assert.equal(c.allyRangeEnabled.checked,true);assert.equal(c.allyRangeTarget.value,'ally2');
 c.allyRangeEnabled.checked=false;c.showTappedCharacterRange({});assert.equal(c.allyRangeEnabled.checked,true);
});
