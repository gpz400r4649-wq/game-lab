import test from 'node:test';import assert from 'node:assert/strict';
import {fresh3D,part,create3D,step3D,validate3D} from '../engine3d.js';
import {worldMoveRange,makeAttackRange,inGridRange,rangeCell} from '../enemy-range3d.js';
function setup(action='chase',mode='inside'){const p=fresh3D(),e=part('enemy',0,0);p.spawn={x:8,y:0,z:0};e.attackEnabled=false;e.program=[{action,speed:2}];e.chaseMode=mode;e.searchRange=makeAttackRange('circle',1,1);p.objects=[e];return {p,g:create3D(p)};}
const tick=(g,p,n=1)=>{for(let i=0;i<n;i++)step3D(g,p,{},.02);};
test('範囲内だけ追う設定は外で止まり、見つけたらずっと追う設定は追跡を続ける',()=>{
 for(const mode of ['inside','remember']){const {p,g}=setup('chase',mode),e=g.objects[0];tick(g,p,20);assert.equal(e.x,0);g.player.x=4;tick(g,p);assert.ok(e.x>0);g.player.x=20;const before=e.x;tick(g,p,10);assert.equal(e.x>before,mode==='remember');}
 const {p,g}=setup('chase','always');tick(g,p);assert.ok(g.objects[0].x>0);
});
test('探すはんいは動く敵が中心で、高さでは変わらない',()=>{
 const {p,g}=setup('chase','inside'),e=g.objects[0];e.x=12;g.player.x=16;g.player.y=8;tick(g,p);assert.ok(e.x>12);g.player.x=0;const before=e.x;tick(g,p);assert.equal(e.x,before);
});
test('移動範囲は置いた場所に固定され、長時間追っても外へ出ない',()=>{
 const {p}=setup('chase','always');p.objects[0].moveRange=makeAttackRange('cross',1,1);const g=create3D(p),e=g.objects[0];g.player.x=24;
 for(let i=0;i<1200;i++){tick(g,p);assert.ok(inGridRange(e.moveRange,e.origin,e));}assert.ok(e.x>3.8&&e.x<6);assert.deepEqual(e.origin,{x:0,y:0,z:0});
});
test('L字の移動範囲では穴を横切らずに角を曲がり、離れたマスへ飛ばない',()=>{
 const {p}=setup('chase','always');p.spawn={x:8,y:0,z:8};p.objects[0].moveRange={shape:'custom',cross:2,circle:2,cells:[[0,0],[1,0],[2,0],[2,1],[2,2],[-2,-2]]};const before=JSON.stringify(p),g=create3D(p),e=g.objects[0];
 for(let i=0;i<1000;i++){tick(g,p);assert.ok(inGridRange(e.moveRange,e.origin,e));}assert.ok(Math.hypot(e.x-8,e.z-8)<.15);assert.equal(JSON.stringify(p),before);
 g.player.x=-8;g.player.z=-8;for(let i=0;i<1000;i++){tick(g,p);assert.ok(inGridRange(e.moveRange,e.origin,e));}assert.notEqual(rangeCell(e.x),-2);
});
test('歩き回って探し、発見すると追い、見失うと探し直す',()=>{
 const {p}=setup('search','inside');p.objects[0].moveRange=makeAttackRange('circle',2,2);p.spawn={x:24,y:0,z:24};const g=create3D(p),e=g.objects[0],visited=new Set();
 for(let i=0;i<800;i++){tick(g,p);visited.add(`${rangeCell(e.x)},${rangeCell(e.z)}`);assert.ok(inGridRange(e.moveRange,e.origin,e));}assert.ok(visited.size>=3);assert.equal(e.foundPlayer,false);
 g.player.x=e.x+3;g.player.z=e.z;tick(g,p);assert.ok(e.foundPlayer);g.player.x=24;g.player.z=24;const start={x:e.x,z:e.z};tick(g,p,150);assert.ok(Math.hypot(e.x-start.x,e.z-start.z)>.5);
});
test('空の移動範囲では動けず、壁もすり抜けない',()=>{
 const {p}=setup('chase','always');p.objects[0].moveRange={shape:'custom',cross:1,circle:1,cells:[]};let g=create3D(p);tick(g,p,100);assert.equal(g.objects[0].x,0);
 p.objects[0].moveRange=makeAttackRange('circle',2,2);const wall=part('box',3,0);wall.w=1;wall.h=3;wall.d=8;p.objects.push(wall);g=create3D(p);tick(g,p,200);assert.ok(g.objects[0].x<2);
});
test('新しい設定を保存でき、不正な範囲や追跡方法を拒否する',()=>{
 const {p}=setup('search','remember');p.objects[0].moveRange=worldMoveRange(makeAttackRange('mixed',4,2),p.objects[0]);assert.deepEqual(validate3D(JSON.parse(JSON.stringify(p))),p);
 for(const key of ['moveRange','searchRange']){const bad=structuredClone(p);bad.objects[0][key].cells=[[key==='moveRange'?121:9,0]];assert.throws(()=>validate3D(bad));}
 const bad=structuredClone(p);bad.objects[0].chaseMode='bad';assert.throws(()=>validate3D(bad));
});
test('以前の左右移動と追跡は保存後も動き、発見の記憶はプレイごとに消える',()=>{
 for(const action of ['patrol','chase']){const {p}=setup(action);delete p.objects[0].chaseMode;delete p.objects[0].searchRange;const q=validate3D(p),g=create3D(q);tick(g,q);assert.ok(g.objects[0].x>0);assert.equal(p.objects[0].chaseMode,undefined);}
 const {p}=setup('chase','remember');p.objects[0].foundPlayer=true;p.objects[0].navigation={path:'bad'};const g=create3D(p);tick(g,p);assert.equal(g.objects[0].x,0);assert.equal(g.objects[0].foundPlayer,false);
});
