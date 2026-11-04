import test from 'node:test';
import assert from 'node:assert/strict';
import {moveEnemy} from '../enemy-ai3d.js';
import {part,fresh3D,validate3D,create3D} from '../engine3d.js';
function setup(seconds,lost='resume',idle='wait'){
 const e=part('enemy',0,0);delete e.moveRange;e.origin={x:0,y:0,z:0};e.routine={idle,notice:'near',lost};e.searchRange={space:'world',cells:[[1,0]]};if(seconds!==undefined)e.chaseGraceSeconds=seconds;
 const tick=(x,n=1)=>{for(let i=0;i<n;i++)moveEnemy(e,{action:'search',speed:2},{x,z:0},.1,0,(dx,dz)=>{e.x+=dx;e.z+=dz;});};return {e,tick};
}
for(const seconds of [0,3,5,1.5])test(`見失った後だけ${seconds}秒追い、期限で停止する`,()=>{
 const {e,tick}=setup(seconds);tick(20,60);assert.equal(e.x,0);tick(4,60);assert.equal(e.debugAction,'chase');tick(20,Math.max(1,Math.round(seconds*10)-1));assert.equal(e.debugAction,seconds?'chase':'wait');tick(20,2);assert.equal(e.debugAction,'wait');
});
test('未設定は3秒、再発見で時間が戻り、見えている間は期限切れにならない',()=>{
 const {e,tick}=setup();tick(4,100);assert.equal(e.chaseGraceRemaining,3);tick(20,20);assert.equal(e.debugAction,'chase');tick(4);tick(20,20);assert.equal(e.debugAction,'chase');tick(20,11);assert.equal(e.debugAction,'wait');
});
test('追い続ける設定には期限がなく、追わない設定には影響しない',()=>{
 const {e,tick}=setup(3,'continue');tick(4);tick(20,100);assert.equal(e.debugAction,'chase');e.routine.notice='none';tick(4);assert.equal(e.debugAction,'wait');
});
test('待つ・巡回・歩き回る・コースは猶予後にふだんの動きへ戻る',()=>{
 for(const [idle,expected]of [['wait','wait'],['patrol','patrol'],['roam','roam'],['path','return']]){const {e,tick}=setup(3,'resume',idle);e.waypoints=[{x:0,z:0},{x:0,z:8}];tick(4);tick(20,20);assert.equal(e.debugAction,'chase');tick(20,11);assert.equal(e.debugAction,expected);}
 const {e,tick}=setup(3,'return');tick(4,10);tick(20,20);assert.equal(e.debugAction,'chase');tick(20,11);assert.equal(e.debugAction,'return');
});
test('猶予中も移動範囲の外へは出ない',()=>{
 const {e,tick}=setup();e.moveRange={space:'world',cells:[[0,0]]};tick(4);tick(20,20);assert.ok(e.x<2);assert.equal(e.debugAction,'chase');
});
test('秒数の保存・検証と、再プレイ時の残り時間リセット',()=>{
 const p=fresh3D(),e=part('enemy');p.objects=[e];for(const n of [0,3,5,30,1.5]){e.chaseGraceSeconds=n;assert.equal(validate3D(p).objects[0].chaseGraceSeconds,n);}for(const n of [-1,31,NaN,Infinity,'3',null]){e.chaseGraceSeconds=n;assert.throws(()=>validate3D(p));}e.chaseGraceSeconds=3;e.chaseGraceRemaining=99;assert.equal(create3D(p).objects[0].chaseGraceRemaining,0);
});

test('以前の追跡設定でも見失った後の秒数が働く',()=>{const {e,tick}=setup(3);delete e.routine;e.chaseMode='inside';tick(4);tick(20,20);assert.equal(e.debugAction,'chase');tick(20,11);assert.equal(e.debugAction,'roam');});
