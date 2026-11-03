import test from 'node:test';import assert from 'node:assert/strict';
import {part,fresh3D,create3D,step3D,validate3D} from '../engine3d.js';
import {setEnemyRoutineChoice} from '../enemy-behavior-presets3d.js';
import {resizeReason} from '../world3d.js';
function setup(route=[{x:0,z:0},{x:16,z:0}]){const p=fresh3D(),e=part('enemy',0,0);e.attackEnabled=false;setEnemyRoutineChoice(e,{idle:'patrol'});e.patrolRoute=route;p.objects=[e];p.spawn={x:20,y:0,z:20};return {p,g:create3D(p)};}
const tick=(g,p,n)=>{for(let i=0;i<n;i++)step3D(g,p,{},.02);};
test('２地点間を往復し、ふだんのルートは追跡用のマスに制限されない',()=>{const {p,g}=setup(),e=g.objects[0];tick(g,p,380);assert.ok(e.x>14);tick(g,p,400);assert.ok(e.x<2);assert.equal(e.z,0);assert.ok(e.x>=0&&e.x<=16);assert.deepEqual(validate3D(p).objects[0].patrolRoute,p.objects[0].patrolRoute);});
test('縦・斜めのルートでも２地点の線上を歩き、飛び越さずに折り返す',()=>{for(const end of [{x:0,z:8},{x:8,z:8}]){const {p,g}=setup([{x:0,z:0},end]),e=g.objects[0];let max=0;for(let i=0;i<700;i++){const before={x:e.x,z:e.z};tick(g,p,1);assert.ok(Math.hypot(e.x-before.x,e.z-before.z)<=.041);if(end.x===0)assert.equal(e.x,0);else assert.ok(Math.abs(e.x-e.z)<.001);max=Math.max(max,e.z);assert.ok(e.z>=-.01&&e.z<=8.01);}assert.ok(max>7.9);}});
test('ルート上の壁はすり抜けず、その手前で止まる',()=>{const {p}=setup(),wall=part('box',8,0);p.objects.push(wall);const g=create3D(p);tick(g,p,500);assert.ok(g.objects[0].x<6);assert.ok(g.objects[0].x>4);});
for(const lost of ['resume','return'])test('追跡から離れた後に往復ルートへ戻る：'+lost,()=>{const {p}=setup([{x:0,z:0},{x:8,z:0}]),e=p.objects[0];setEnemyRoutineChoice(e,{notice:'near',lost});e.searchRange={space:'world',cells:[[1,1]]};const g=create3D(p),robot=g.objects[0];tick(g,p,80);g.player.x=4;g.player.z=4;tick(g,p,100);assert.ok(robot.z>1);g.player.x=20;g.player.z=20;let returned=false;for(let i=0;i<400;i++){tick(g,p,1);if(lost==='return'&&Math.hypot(robot.x,robot.z)<.1)returned=true;}assert.ok(Math.abs(robot.z)<.1);assert.ok(robot.x>=0&&robot.x<=8);if(lost==='return')assert.ok(returned);});
test('追跡中は往復ルートの特例を使わず追跡範囲にとどまる',()=>{const {p}=setup();setEnemyRoutineChoice(p.objects[0],{notice:'always'});const g=create3D(p);g.player.x=20;g.player.z=0;tick(g,p,500);assert.ok(g.objects[0].x<10);assert.equal(g.objects[0].routeTravel,false);});
test('不正なルートとマップ縮小による範囲外を防ぎ、旧作品はそのまま',()=>{const {p}=setup();for(const route of [[],[{x:0,z:0},{x:0,z:0}],[{x:0,z:0},{x:40,z:0}],[{x:NaN,z:0},{x:2,z:0}]]){p.objects[0].patrolRoute=route;assert.throws(()=>validate3D(p));}p.worldSize=240;p.objects[0].patrolRoute=[{x:0,z:0},{x:40,z:0}];assert.ok(resizeReason(p,60));delete p.objects[0].patrolRoute;const copy=validate3D(p);assert.equal(copy.objects[0].patrolRoute,undefined);});

for(const lost of ['resume','return'])for(let quarter=0;quarter<4;quarter++)test(`往復から向き連動の扇形で気づくと回転ループせず追跡する：${lost}・${quarter}`,()=>{
 const rotate=({x,z})=>{for(let i=0;i<quarter;i++)[x,z]=[z,-x];return {x,z};};
 const {p}=setup([{x:0,z:0},rotate({x:8,z:0})]),e=p.objects[0];setEnemyRoutineChoice(e,{notice:'near',lost});const g=create3D(p),robot=g.objects[0];tick(g,p,40);
 const target=rotate({x:4,z:-4});Object.assign(g.player,target);let turns=0,heading=robot.heading;
 for(let i=0;i<300;i++){tick(g,p,1);const difference=Math.atan2(Math.sin(robot.heading-heading),Math.cos(robot.heading-heading));if(Math.abs(difference)>1)turns++;heading=robot.heading;}
 assert.ok(Math.hypot(robot.x-target.x,robot.z-target.z)<.15);assert.ok(turns<10,`急な方向転換：${turns}`);assert.equal(robot.debugAction,'chase');assert.equal(robot.routeTravel,false);
 Object.assign(g.player,rotate({x:20,z:-20}));tick(g,p,400);const local=rotate({x:1,z:0});assert.ok(Math.abs(robot.x*local.z-robot.z*local.x)<.1);assert.ok(robot.debugAction==='patrol'||robot.debugAction==='return');
});
