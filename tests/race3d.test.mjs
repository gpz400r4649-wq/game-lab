import test from 'node:test';
import assert from 'node:assert/strict';
import {create3D,fresh3D,part,step3D,validate3D} from '../engine3d.js';
import {moveRaceGate} from '../race3d.js';
import {makeCarModel,updateCarModel} from '../race-model3d.js';
import {Quaternion,Vector3} from '../vendor/three.module.min.js';

function tick(game,project,seconds,input){
 for(let step=0;step<Math.round(seconds/.02);step++)step3D(game,project,input,.02);
}

test('車やゲートのない従来作と、空の車テンプレートの両方を読み込める',()=>{
 const ordinary=fresh3D(),car=fresh3D('car');
 assert.equal(create3D(validate3D(ordinary)).car,undefined);
 const drive=create3D(validate3D(car));
 assert.equal(drive.car.speed,0);assert.equal(drive.car.gates.length,0);
 tick(drive,car,2,{z:-1});assert.equal(drive.state,'playing');
 assert.ok(drive.player.z<car.spawn.z-8);
});

test('車は加速・旋回・ブレーキ・バックができ、壁で止まれる',()=>{
 const p=fresh3D('car'),g=create3D(p);
 tick(g,p,.6,{z:-1});const before=g.player.z;
 tick(g,p,.5,{x:1,z:-1});assert.ok(g.player.x>0);assert.ok(g.player.z<before);
 tick(g,p,.6,{z:-1,brake:true});assert.equal(g.car.speed,0);
 const stop=g.player.z;tick(g,p,.8,{z:1});assert.ok(g.player.z>stop);
 const wall=part('wall',0,0);p.objects=[wall];const stopped=create3D(p);
 tick(stopped,p,3,{z:-1});assert.ok(stopped.player.z>=1);assert.ok(stopped.car.speed<1);
});

test('車は低い側からスロープを登り、続く床を走れる',()=>{
 const p=fresh3D('car');p.objects=[part('ramp',0,0),part('floor',0,-4)];p.objects[1].y=3;
 const g=create3D(p);
 let usedRamp=false,usedFloor=false;
 for(let i=0;i<160;i++){
  step3D(g,p,{z:-1},.02);
  if(g.player.supportId===p.objects[0].id&&g.player.y>1)usedRamp=true;
  if(g.player.supportId===p.objects[1].id&&g.player.y>3)usedFloor=true;
 }
 assert.ok(usedRamp);assert.ok(usedFloor);
});

test('ゲートの順ばんを入れ替えられ、飛ばすとクリアにならない',()=>{
 const p=fresh3D('car'),later=part('raceGate',0,4),first=part('raceGate',0,0);
 p.objects=[later,first];moveRaceGate(p.objects,first,1);
 assert.equal(first.gateOrder,1);assert.equal(later.gateOrder,2);
 const g=create3D(validate3D(p));tick(g,p,1.65,{z:-1});
 assert.equal(g.car.nextGate,1);assert.equal(g.state,'playing');
 Object.assign(g.player,{x:0,y:0,z:3,vy:0,grounded:true});g.car.speed=0;
 tick(g,p,1,{z:1});assert.equal(g.car.nextGate,2);assert.equal(g.state,'won');
});


test('タイヤの転がる角度を変えても車軸の向きは変わらず、前輪だけがハンドルで向きを変える',()=>{
 const model=makeCarModel();
 const axis=wheel=>new Vector3(0,1,0).applyQuaternion(wheel.getWorldQuaternion(new Quaternion()));
 const axles=model.userData.wheels;
 updateCarModel(model,{wheelAngle:0,steering:0});
 const before=axles.map(({wheel})=>axis(wheel));
 updateCarModel(model,{wheelAngle:-1.5,steering:0});
 axles.forEach(({wheel},index)=>{
  assert.ok(before[index].distanceTo(new Vector3(1,0,0))<1e-10);
  assert.ok(axis(wheel).distanceTo(before[index])<1e-10);
 });
 updateCarModel(model,{wheelAngle:-2,steering:.4});
 axles.forEach(({wheel,front},index)=>assert.equal(axis(wheel).distanceTo(before[index])>.1,front));
});
