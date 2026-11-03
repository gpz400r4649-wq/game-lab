import test from 'node:test';
import assert from 'node:assert/strict';
import {part,fresh3D,create3D,step3D,validate3D} from '../engine3d.js';
import {enemyRoutine,setEnemyRoutine,applyEnemyBehaviorExample} from '../enemy-behavior-presets3d.js';
const tick=(g,p,n)=>{for(let i=0;i<n;i++)step3D(g,p,{},.02);};
function setup(r){const p=fresh3D(),e=part('enemy',0,0);e.attackEnabled=false;setEnemyRoutine(e,r);e.searchRange={space:'world',cells:[[1,0],[0,0]]};p.objects=[e];p.spawn={x:20,y:0,z:0};return {p,g:create3D(p)};}
test('旧作品を表示するだけではデータを変更しない',()=>{for(const key of ['still','patrol','chaseInside','searchRemember','chaseAlways']){const e=part('enemy');applyEnemyBehaviorExample(e,key);const before=structuredClone(e);assert.ok(enemyRoutine(e));assert.deepEqual(e,before);}});
test('全27通りの動きの組み合わせが保存でき、範囲・銃を保つ',()=>{for(const idle of ['wait','patrol','roam'])for(const notice of ['none','near','always'])for(const lost of ['resume','continue','return']){const e=part('enemy');e.enemyWeaponId='abc';const before=structuredClone(e);setEnemyRoutine(e,{idle,notice,lost});const p=fresh3D();p.objects=[e];assert.deepEqual(validate3D(p).objects[0].routine,{idle,notice,lost});for(const key of ['moveRange','searchRange','attackRange','enemyWeaponId','hp'])assert.deepEqual(e[key],before[key]);}});
test('不正な動きの選択は読み込まない',()=>{const {p}=setup({idle:'wait',notice:'near',lost:'return'});p.objects[0].routine.lost='invalid';assert.throws(()=>validate3D(p));});
test('待つ・巡回・歩き回るは追いかけない時にも独立して動く',()=>{for(const idle of ['wait','patrol','roam']){const {p,g}=setup({idle,notice:'none',lost:'resume'});g.player.x=4;tick(g,p,40);assert.equal(Math.hypot(g.objects[0].x,g.objects[0].z)>.1,idle!=='wait');}});
for(const lost of ['resume','continue','return'])test('待つ→気づく→追う→見失う：'+lost,()=>{const {p,g}=setup({idle:'wait',notice:'near',lost});const e=g.objects[0];tick(g,p,20);assert.equal(e.x,0);g.player.x=4;tick(g,p,40);assert.ok(e.x>1);const before=e.x;g.player.x=20;tick(g,p,200);if(lost==='return')assert.ok(Math.hypot(e.x,e.z)<.1);if(lost==='resume')assert.equal(e.x,before);if(lost==='continue')assert.ok(e.x>before);});
test('戻る途中でも再び気づいたら追いかける',()=>{const {p,g}=setup({idle:'wait',notice:'near',lost:'return'});g.player.x=4;tick(g,p,60);g.player.x=20;tick(g,p,10);const e=g.objects[0],before=e.x;g.player.x=4;tick(g,p,100);assert.ok(e.x>before);});
test('見本を選び直すと新しい組み合わせからも正しく切り替わる',()=>{const {p}=setup({idle:'roam',notice:'near',lost:'return'}),e=p.objects[0];applyEnemyBehaviorExample(e,'still');assert.equal(e.routine,undefined);assert.deepEqual(e.program,[]);});
