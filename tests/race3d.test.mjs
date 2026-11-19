import test from 'node:test';
import assert from 'node:assert/strict';
import {create3D,fresh3D,part,step3D,validate3D} from '../engine3d.js';
import {DEFAULT_CAR_TUNING,F1_TOP_SPEED_KMH,fitRaceGate,moveRaceGate,raceGateHeading,raceGateWidth,updateRoadGateWidths} from '../race3d.js';
import {makeCarModel,makeRaceGateModel,updateCarModel} from '../race-model3d.js';
import {Quaternion,Vector3} from '../vendor/three.module.min.js';

function tick(game,project,seconds,input){
 for(let step=0;step<Math.round(seconds/.02);step++)step3D(game,project,input,.02);
}

test('車やゲートのない従来作と、空の車テンプレートの両方を読み込める',()=>{
 const ordinary=fresh3D(),car=fresh3D('car');
 assert.equal(ordinary.worldSize,60);assert.equal(car.worldSize,240);
 assert.equal(validate3D({...car,worldSize:60}).worldSize,60);
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
 assert.equal(g.car.actualSpeed,0);assert.ok(g.car.peakSpeed>3);assert.equal(create3D(p).car.peakSpeed,0);
 const stop=g.player.z;tick(g,p,.8,{z:1});assert.ok(g.player.z>stop);
 const wall=part('wall',0,0);p.objects=[wall];const stopped=create3D(p);
 tick(stopped,p,3,{z:-1});assert.ok(stopped.player.z>=1);assert.ok(stopped.car.speed<1);
});

test('車のせっていは保存でき、速さ・加速・ハンドル・ブレーキに反映される',()=>{
 const base=fresh3D('car');
 const tuning={maxSpeed:65/3.6,acceleration:10,steering:3.2,braking:32};
 const tuned=validate3D(JSON.parse(JSON.stringify({...base,carTuning:tuning})));
 assert.deepEqual(tuned.carTuning,tuning);
 for(const [oldSpeed,kmh] of [[8,30],[12,45],[18,65]]){
  assert.deepEqual(validate3D({...base,carTuning:{...tuning,maxSpeed:oldSpeed}}).carTuning,{...tuning,maxSpeed:kmh/3.6});
 }
 assert.throws(()=>validate3D({...base,carTuning:{...tuning,maxSpeed:101}}),/くるまのせってい/);
 assert.throws(()=>validate3D({...fresh3D(),carTuning:tuning}),/くるまのせってい/);
 const normal=create3D(base),fast=create3D(tuned);
 tick(normal,base,.5,{z:-1});tick(fast,tuned,.5,{z:-1});
 assert.ok(fast.car.speed>normal.car.speed);
 tick(normal,base,2,{z:-1});tick(fast,tuned,2,{z:-1});
 assert.ok(Math.abs(normal.car.actualSpeed*3.6-45)<1e-9);
 assert.ok(Math.abs(fast.car.actualSpeed*3.6-65)<1e-9);
 normal.car.speed=fast.car.speed=8;
 tick(normal,base,.1,{x:1,z:-1});tick(fast,tuned,.1,{x:1,z:-1});
 assert.ok(Math.abs(fast.car.heading)>Math.abs(normal.car.heading));
 normal.car.speed=fast.car.speed=8;
 tick(normal,base,.1,{brake:true});tick(fast,tuned,.1,{brake:true});
 assert.ok(fast.car.speed<normal.car.speed);
});

test('F1の最高速に届き、１フレームでゲートや壁を通りすぎない',()=>{
 const maxSpeed=F1_TOP_SPEED_KMH/3.6;
 const carTuning={...DEFAULT_CAR_TUNING,maxSpeed,acceleration:10};
 const project=validate3D({...fresh3D('car'),worldSize:960,spawn:{x:0,y:0,z:465},carTuning});
 const oldProject={...project,carTuning:{...carTuning,maxSpeed:361.6/3.6}};
 assert.deepEqual(validate3D(oldProject).carTuning,carTuning);
 const fast=create3D(project);
 tick(fast,project,11,{z:-1});
 assert.ok(Math.abs(fast.car.actualSpeed*3.6-F1_TOP_SPEED_KMH)<1e-8);

 const gate=part('raceGate',0,0),wall=part('wall',0,0);
 for(const piece of [gate,wall]){
  const course={...project,objects:[piece],spawn:{x:0,y:0,z:2}};
  const run=create3D(course);
  run.car.speed=maxSpeed;
  step3D(run,course,{z:-1},.033);
  if(piece===gate)assert.equal(run.state,'won');
  else assert.ok(run.player.z>=wall.d/2+.9-1e-8);
 }
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


test('最初の道路のはじめを向いて走り出し、ここからためすは選んだ場所を使う',()=>{
 const p=fresh3D('car');
 p.roads=[{id:'first',width:8,closed:false,points:[{x:12,z:20},{x:32,z:20}]},
  {id:'second',width:8,closed:false,points:[{x:-30,z:-25},{x:-20,z:-25}]}];
 const g=create3D(validate3D(p));
 assert.equal(g.player.x,12);assert.equal(g.player.z,20);assert.equal(g.car.heading,-Math.PI/2);
 tick(g,p,1,{z:-1});assert.ok(g.player.x>14);assert.equal(g.player.z,20);
 const test=create3D(p,{testSpawn:{x:5,y:0,z:12}});assert.equal(test.player.x,5);assert.equal(test.player.z,12);
});

test('斜めの道に幅12mのゲートをそろえ、道の端近くでも通過できる',()=>{
 const p=fresh3D('car');
 p.roads=[{id:'diagonal',width:12,closed:false,points:[{x:0,z:0},{x:20,z:-20}]}];
 const gate=fitRaceGate(part('raceGate'),p.roads,{x:9,z:-11,y:0});p.objects=[gate];
 assert.equal(gate.x,10);assert.equal(gate.z,-10);assert.equal(raceGateWidth(gate),12);assert.equal(raceGateHeading(gate),-Math.PI/4);
 const model=makeRaceGateModel(gate);assert.equal(model.rotation.y,-Math.PI/4);
 assert.deepEqual(model.userData.lights.map(light=>light.position.x),[-6,6]);
 const g=create3D(validate3D(p),{testSpawn:{x:6,y:0,z:-14,heading:-Math.PI/4}});
 Object.assign(g.player,{x:10+4/Math.sqrt(2)-3/Math.sqrt(2),z:-10+4/Math.sqrt(2)+3/Math.sqrt(2)});
 tick(g,p,1.4,{z:-1});assert.equal(g.state,'won');
});

test('スタートに置いた最初のゲートは、そのまま走り抜けて通過できる',()=>{
 const p=fresh3D('car');p.roads=[{id:'straight',width:8,closed:false,points:[{x:0,z:0},{x:0,z:-20}]}];
 p.objects=[fitRaceGate(part('raceGate'),p.roads,{x:0,y:0,z:0})];
 const g=create3D(p);tick(g,p,.8,{z:-1});assert.equal(g.state,'won');
});


test('道幅の変更は、その道路に合わせた新旧のゲートだけに伝わる',()=>{
 const road={id:'main',width:8,closed:false,points:[{x:0,z:0},{x:32,z:-32}]};
 const other={id:'other',width:8,closed:false,points:[{x:20,z:0},{x:52,z:-32}]};
 const onRoad=fitRaceGate(part('raceGate'),[road,other],{x:15,y:0,z:-17});
 const legacy=fitRaceGate(part('raceGate'),[road,other],{x:10,y:0,z:-10});delete legacy.gateRoadId;
 const unrelated=fitRaceGate(part('raceGate'),[road,other],{x:30,y:0,z:-10});
 const detached={...onRoad,id:crypto.randomUUID(),x:-20};const plain=part('raceGate',1,-1);
 const wider={...road,width:16};
 const next=updateRoadGateWidths([onRoad,legacy,unrelated,detached,plain],[road,other],[wider,other]);
 for(const [index,gate] of next.slice(0,2).entries()){
  const previous=[onRoad,legacy][index];
  assert.equal(raceGateWidth(gate),16);assert.equal(gate.x,previous.x);assert.equal(gate.z,previous.z);
  assert.equal(gate.gateYaw,previous.gateYaw);assert.equal(gate.gateRoadId,road.id);
  assert.deepEqual(makeRaceGateModel(gate).userData.lights.map(light=>light.position.x),[-8,8]);
 }
 assert.deepEqual(next.slice(2),[unrelated,detached,plain]);
 const narrowed=updateRoadGateWidths(next,[wider,other],[{...road,width:4},other]);
 assert.deepEqual(narrowed.slice(0,2).map(raceGateWidth),[4,4]);
 const project=fresh3D('car');project.objects=next;project.roads=[wider,other];
 assert.deepEqual(validate3D(JSON.parse(JSON.stringify(project))).objects,next);
 const straight={...wider,points:[{x:0,z:0},{x:0,z:-32}]};
 const edgeGate=fitRaceGate(part('raceGate'),[straight],{x:7.5,y:0,z:-16});
 const course=validate3D({...fresh3D('car'),roads:[straight],objects:[edgeGate]});
 const run=create3D(course,{testSpawn:{x:7.5,y:0,z:-12,heading:0}});
 tick(run,course,1.4,{z:-1});
 assert.equal(run.state,'won');
});
