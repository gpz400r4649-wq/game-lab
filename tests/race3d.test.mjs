import test from 'node:test';
import assert from 'node:assert/strict';
import {create3D,fresh3D,part,step3D,validate3D} from '../engine3d.js';
import {DEFAULT_CAR_TUNING,F1_TOP_SPEED_KMH,fitRaceGate,moveRaceGate,raceGateHeading,raceGateWidth,updateRaceGates,updateRoadGateWidths} from '../race3d.js';
import {createLapGateView,makeCarModel,makeRaceGateModel,updateCarModel} from '../race-model3d.js';
import {Quaternion,Scene,Vector3} from '../vendor/three.module.min.js';

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
 tick(g,p,1.2,{z:-1,brake:true});assert.equal(g.car.speed,0);
 assert.equal(g.car.actualSpeed,0);assert.ok(g.car.peakSpeed>3);assert.equal(create3D(p).car.peakSpeed,0);
 const stop=g.player.z;tick(g,p,.8,{z:1});assert.ok(g.player.z>stop);
 const wall=part('wall',0,0);p.objects=[wall];const stopped=create3D(p);
 tick(stopped,p,3,{z:-1});assert.ok(stopped.player.z>=1);assert.ok(stopped.car.speed<1);
});

test('アクセルを離した車は惰性で走り、ブレーキはそれより強く止める',()=>{
 const p=fresh3D('car'),rolling=create3D(p),braking=create3D(p);
 rolling.car.speed=braking.car.speed=8;
 tick(rolling,p,.3,{coast:true});
 tick(braking,p,.3,{coast:true,brake:true});
 assert.ok(rolling.car.speed>7&&rolling.car.speed<8);
 assert.ok(braking.car.speed>4&&braking.car.speed<rolling.car.speed);
 tick(braking,p,1,{brake:true});assert.equal(braking.car.speed,0);
});

test('車は壁と道路の柵に斜めから当たっても横に沿って走れる',()=>{
 const start={x:0,y:0,z:15,heading:-.37};
 for(const kind of ['wall','mini','highway','guardrail']){
  const p=fresh3D('car');
  if(kind==='wall')p.objects=Array.from({length:16},(_,i)=>({...part('wall',4,32-i*4),w:.25,d:4,rotation:90}));
  else p.roads=[{id:'road',width:8,barrier:kind,closed:false,points:[{x:0,z:-36},{x:0,z:36}]}];
  const game=create3D(p,{testSpawn:start});
  tick(game,p,2,{z:-1,coast:true});
  const before=game.player.z;
  assert.ok(game.player.x>2.3&&game.player.x<3.2,kind);
  tick(game,p,1,{z:-1,coast:true});
  assert.ok(game.player.x<3.2&&game.player.z<before-5,kind);
  assert.ok(game.car.actualSpeed>5,kind);
 }
});

test('坂でブレーキを離すと前向きでも後ろ向きでも下り、踏むと止まる',()=>{
 const p=fresh3D('car');
 p.roads=[{id:'hill',width:8,closed:false,points:[{x:0,y:0,z:24},{x:0,y:8,z:-16}]}];
 const start={x:0,y:4,z:4};
 for(const heading of [0,Math.PI]){
  const game=create3D(p,{testSpawn:{...start,heading}});
  tick(game,p,.5,{brake:1,coast:true});
  assert.equal(game.player.z,start.z);
  tick(game,p,1.5,{coast:true});
  assert.ok(game.player.z>start.z+.9&&game.player.y<start.y);
  assert.equal(Math.sign(game.car.speed),heading===0?-1:1);
  tick(game,p,1.5,{brake:1,coast:true});
  const stopped=game.player.z;
  tick(game,p,1,{brake:1,coast:true});
  assert.equal(game.car.speed,0);
  assert.equal(game.player.z,stopped);
 }
 const level=create3D(fresh3D('car'),{testSpawn:{...start,y:0,heading:0}});
 tick(level,fresh3D('car'),1,{coast:true});
 assert.equal(level.player.z,start.z);
});

test('道路をひかずに置いたスロープでも車は下りに転がる',()=>{
 const p=fresh3D('car');p.objects=[part('ramp',0,0)];
 const game=create3D(p,{testSpawn:{x:0,y:p.objects[0].h/2,z:0,heading:0}});
 tick(game,p,1,{coast:true});
 assert.ok(game.player.z>.5&&game.player.y<p.objects[0].h/2);
});

test('ペダルを軽く踏むと加速や減速を控えめにできる',()=>{
 const p=fresh3D('car'),half=create3D(p),full=create3D(p);
 tick(half,p,.6,{z:-.5,coast:true});
 tick(full,p,.6,{z:-1,coast:true});
 assert.ok(half.car.speed>0&&half.car.speed<full.car.speed);
 tick(half,p,3,{z:-.5,coast:true});
 assert.equal(half.car.speed,6.25);
 const strongBefore=full.car.speed=half.car.speed;
 tick(half,p,.25,{brake:.25});tick(full,p,.25,{brake:1});
 assert.ok(half.car.speed<strongBefore&&half.car.speed>full.car.speed);
});

test('ハンドルを大きく切るほどスピードが落ち、短いブレーキで急停止しない',()=>{
 const p=fresh3D('car');
 const [straight,smallTurn,fullTurn,lightBrake]=Array.from({length:4},()=>create3D(p));
 for(const run of [straight,smallTurn,fullTurn,lightBrake])run.car.speed=12.5;
 tick(straight,p,.5,{z:-1,coast:true});
 tick(smallTurn,p,.5,{x:.3,z:-1,coast:true});
 tick(fullTurn,p,.5,{x:1,z:-1,coast:true});
 assert.ok(straight.car.speed>smallTurn.car.speed&&smallTurn.car.speed>fullTurn.car.speed);
 assert.ok(fullTurn.car.speed>0);
 tick(lightBrake,p,.08,{brake:true,coast:true});
 assert.ok(lightBrake.car.speed>11.8);
 tick(lightBrake,p,.5,{brake:true,coast:true});
 assert.ok(lightBrake.car.speed<8);
});

test('ハンドルをいっぱいに切っても高速ではゆるく曲がり、低速では小回りがきく',()=>{
 const p=fresh3D('car');p.carTuning={...DEFAULT_CAR_TUNING,maxSpeed:120/3.6};
 const slow=create3D(p),fast=create3D(p),dt=.02;
 slow.car.speed=3;fast.car.speed=20;
 for(const game of [slow,fast]){
  game.car.steering=.42;
  step3D(game,p,{x:1,z:-1},dt);
 }
 const slowYaw=Math.abs(slow.car.heading)/dt,fastYaw=Math.abs(fast.car.heading)/dt;
 assert.ok(slowYaw>.4&&slowYaw<1);
 assert.ok(fastYaw>0&&fastYaw<slowYaw);
 const corneringAcceleration=fastYaw*fast.car.speed;
 assert.ok(corneringAcceleration>10.5&&corneringAcceleration<12.5);
});

test('発進直後やバックでは車体がその場で回らず、進んだ距離に合わせて曲がる',()=>{
 const p=fresh3D('car');
 const headings=[];
 for(const direction of [-1,1]){
  const game=create3D(p);const start={...game.player};
  tick(game,p,.5,{x:1,brake:1,coast:true});
  assert.equal(game.car.heading,0);
  tick(game,p,.6,{x:1,z:direction*.25,coast:true});
  const turned=game.car.heading,travel=Math.hypot(game.player.x-start.x,game.player.z-start.z);
  assert.ok(travel>.15&&Math.abs(turned)>.02);
  assert.ok(Math.abs(turned)/travel<.28);
  headings.push(turned);
 }
 assert.ok(headings[0]<0&&headings[1]>0);
});

test('車のせっていは保存でき、速さ・加速・ハンドル・ブレーキに反映される',()=>{
 const base=fresh3D('car');
 const tuning={maxSpeed:65/3.6,acceleration:10,steering:5,braking:32};
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

test('これまでのよくまがると同じ効き方を、新しい標準とする',()=>{
 const base=fresh3D('car');
 const saved=steering=>validate3D({...base,carTuning:{...DEFAULT_CAR_TUNING,acceleration:4,steering}});
 assert.equal(create3D(base).car.tuning.steering,4);
 assert.equal(saved(3.2).carTuning.steering,4);
 assert.equal(saved(2.4).carTuning.steering,4);
 assert.equal(saved(2.4).carTuning.acceleration,4);
 assert.equal(saved(1.6).carTuning.steering,1.6);
 assert.equal(saved(4).carTuning.steering,4);
 assert.equal(saved(5).carTuning.steering,5);
});

test('重い車は坂でゆっくり加速し、グリップの強い車はカーブで速度を保ちやすい',()=>{
 const base=fresh3D('car');
 const slope={...base,roads:[{id:'hill',width:12,closed:false,points:[{x:0,z:40},{x:0,y:15,z:-10}]}]};
 const light=validate3D({...slope,carTuning:{...DEFAULT_CAR_TUNING,mass:.75}});
 const heavy=validate3D({...slope,carTuning:{...DEFAULT_CAR_TUNING,mass:1.35}});
 const lighter=create3D(light),heavier=create3D(heavy);
 tick(lighter,light,1,{z:-1});tick(heavier,heavy,1,{z:-1});
 assert.ok(lighter.player.y>heavier.player.y&&heavier.player.y>0);
 assert.ok(lighter.car.speed>heavier.car.speed);

 const weak=create3D({...base,carTuning:{...DEFAULT_CAR_TUNING,grip:.72}});
 const strong=create3D({...base,carTuning:{...DEFAULT_CAR_TUNING,grip:1.24}});
 weak.car.speed=strong.car.speed=12.5;
 tick(weak,base,.5,{z:-1,x:1});tick(strong,base,.5,{z:-1,x:1});
 assert.ok(strong.car.speed>weak.car.speed);
 assert.ok(Math.abs(strong.car.heading)>Math.abs(weak.car.heading));
 tick(strong,base,.06,{z:-1});
 assert.ok(strong.car.steering>0&&strong.car.steering<.42);
 tick(strong,base,.2,{z:-1});
 assert.equal(strong.car.steering,0);
 assert.throws(()=>validate3D({...base,carTuning:{...DEFAULT_CAR_TUNING,grip:0}}),/くるまのせってい/);
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


test('ブレーキを踏むと停車中でも後ろのランプが点灯し、離すと戻る',()=>{
 const model=makeCarModel(),other=makeCarModel(),car={speed:0,wheelAngle:0,steering:0};
 const lights=model.userData.brakeLights;
 assert.equal(lights.length,2);
 const off=lights[0].material;
 updateCarModel(model,car,true);
 assert.ok(lights.every(light=>light.material.isMeshBasicMaterial&&light.material!==off));
 assert.equal(other.userData.brakeLights[0].material,off);
 updateCarModel(model,car,false);
 assert.ok(lights.every(light=>light.material===off));
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

test('周回レースはスタートで計り始め、ゲートの順番を守った周だけ数える',()=>{
 const p=fresh3D('car');
 p.raceLaps=2;
 const road={id:'straight',width:8,closed:false,points:[{x:0,z:0},{x:0,z:-30}]};
 p.roads=[road];
 p.objects=[0,-10,-20].map((z,index)=>({...fitRaceGate(part('raceGate'),[road],{x:0,y:0,z}),gateOrder:index+1}));
 const game=create3D(validate3D(JSON.parse(JSON.stringify(p))));
 const cross=(z,time,{reverse=false,x=0,y=0}={})=>{
  const side=reverse?-2:2;
  Object.assign(game.player,{x,y,z:z-side});
  updateRaceGates(game,{x,y,z:z+side},()=>{},time);
 };
 assert.equal(game.car.laps.startedAt,null);
 cross(0,1,{reverse:true});
 assert.equal(game.car.laps.startedAt,null);
 cross(0,2);
 assert.equal(game.car.laps.startedAt,2);
 cross(-20,3);
 cross(0,4);
 assert.equal(game.car.laps.completed,0);
 assert.equal(game.car.nextGate,1);
 cross(-10,5,{y:4});
 cross(-10,6,{x:5});
 assert.equal(game.car.nextGate,1);
 cross(-10,7);
 cross(-20,8);
 cross(0,12);
 assert.equal(game.car.laps.completed,1);
 assert.equal(game.car.laps.best,10);
 assert.equal(game.state,'playing');
 cross(-10,13);
 cross(-20,15);
 cross(0,20);
 assert.equal(game.car.laps.best,8);
 assert.equal(game.car.laps.finishedAt-game.car.laps.startedAt,18);
 assert.equal(game.state,'won');
 assert.throws(()=>validate3D({...p,raceLaps:99}),/しゅうかい/);
});

test('周回の最初のゲート上から走り出すと計測を開始し、ゲートのないコースは自由に走れる',()=>{
 const p=fresh3D('car');
 p.raceLaps=1;
 p.roads=[{id:'straight',width:8,closed:false,points:[{x:0,z:0},{x:0,z:-20}]}];
 p.objects=[0,-10].map((z,index)=>({...fitRaceGate(part('raceGate'),p.roads,{x:0,y:0,z}),gateOrder:index+1}));
 const game=create3D(p);
 tick(game,p,.5,{z:-1});
 assert.notEqual(game.car.laps.startedAt,null);
 assert.equal(game.car.nextGate,1);
 const incomplete={...p,objects:[],roads:[]},run=create3D(incomplete);
 tick(run,incomplete,.5,{z:-1});
 assert.equal(run.car.laps.startedAt,null);
 assert.equal(run.state,'playing');
});

test('周回レースは手動のゲートがなければ、車の初期位置に同じ幅と向きのゲートを出す',()=>{
 const p=fresh3D('car');
 p.raceLaps=3;
 p.roads=[{id:'loop',width:16,closed:true,points:[{x:-30,z:30},{x:-30,z:-30},{x:30,z:-30},{x:30,z:30}]}];
 const before=JSON.stringify(p),run=create3D(p),gate=run.car.laps.autoStart;
 assert.ok(gate);
 assert.equal(run.car.gates[0],gate);
 assert.deepEqual([gate.x,gate.y,gate.z],[run.player.x,run.player.y,run.player.z]);
 assert.equal(raceGateWidth(gate),16);
 assert.equal(raceGateHeading(gate),run.car.heading);
 assert.equal(run.car.laps.markers.length,3);
 tick(run,p,.5,{z:-1});
 assert.notEqual(run.car.laps.startedAt,null);
 assert.equal(run.car.laps.completed,0);
 assert.equal(JSON.stringify(p),before);
 const elsewhere=create3D(p,{testSpawn:{x:0,y:0,z:0}});
 assert.deepEqual(elsewhere.car.laps.autoStart,gate);
 assert.equal(elsewhere.car.startsInFirst,false);
 const manual=part('raceGate',0,0);
 const custom=create3D({...p,objects:[manual]});
 assert.equal(custom.car.laps.autoStart,null);
 assert.equal(custom.car.gates[0].id,manual.id);
});

test('閉じた道路では１つのゲートでスタートとゴールを兼ね、コースをひと回りしたときだけ数える',()=>{
 const p=fresh3D('car');
 p.raceLaps=2;
 p.roads=[{id:'loop',width:8,closed:true,points:[{x:-24,z:24},{x:-24,z:-24},{x:24,z:-24},{x:24,z:24}]}];
 p.objects=[fitRaceGate(part('raceGate'),p.roads,{x:-24,y:0,z:1})];
 const run=create3D(validate3D(p)),gate=run.car.gates[0];
 const cross=(marker,time,sign=1)=>{
  const x=Math.sin(marker.gateYaw)*sign,z=Math.cos(marker.gateYaw)*sign;
  Object.assign(run.player,{x:marker.x-x,y:0,z:marker.z-z});
  updateRaceGates(run,{x:marker.x+x,y:0,z:marker.z+z},()=>{},time);
 };
 cross(gate,1);
 assert.equal(run.car.laps.startedAt,1);
 cross(gate,2,-1);
 cross(gate,3);
 assert.equal(run.car.laps.completed,0);
 const markers=run.car.laps.markers;
 assert.equal(markers.length,3);
 markers.forEach((marker,i)=>cross(marker,5+i));
 cross(gate,9);
 assert.equal(run.car.laps.completed,1);
 assert.equal(run.car.laps.best,8);
 markers.forEach((marker,i)=>cross(marker,11+i));
 cross(gate,15);
 assert.equal(run.state,'won');
 assert.equal(run.car.laps.best,6);
});

test('道路に結びつけない１つのゲートでも、進行方向に戻れば１周になる',()=>{
 const p=fresh3D('car');p.raceLaps=1;p.objects=[part('raceGate',0,0)];
 const game=create3D(p);
 const cross=(before,after,time)=>{
  game.player.z=after;
  updateRaceGates(game,{x:0,y:0,z:before},()=>{},time);
 };
 cross(2,-2,1);
 cross(-2,2,2);
 assert.equal(game.car.laps.completed,0);
 cross(2,-2,10);
 assert.equal(game.state,'won');
});

test('自動の通過地点を判定と同じ場所と幅のゲートにし、次のゲートを光らせる',()=>{
 const labels=[],context={beginPath(){},roundRect(){},fill(){},fillText(label){labels.push(label);}};
 const oldDocument=globalThis.document;
 globalThis.document={createElement:()=>({getContext:()=>context})};
 try{
  const scene=new Scene(),sync=createLapGateView(scene);
  const markers=[{x:20,y:0,z:-8,gateYaw:Math.PI/2,gateWidth:16},{x:0,y:0,z:-20,gateYaw:0,gateWidth:12}];
  const autoStart={x:0,y:0,z:0,gateYaw:0,gateWidth:16};
  const laps={autoStart,markers,startedAt:0,nextMarker:0};
  sync(laps,true);
  const [group]=scene.children,[start,first,second]=group.children;
  assert.deepEqual(labels,['1','2','3']);
  assert.deepEqual(first.position.toArray(),[20,0,-8]);
  assert.equal(first.rotation.y,Math.PI/2);
  assert.deepEqual(first.userData.lights.map(light=>light.position.x),[-8,8]);
  const light=gate=>gate.userData.lights[0].material;
  const active=light(first);
  assert.notEqual(light(second),active);
  laps.nextMarker=1;sync(laps,true);
  assert.equal(light(second),active);
  assert.notEqual(light(first),active);
  laps.nextMarker=2;sync(laps,true);
  assert.equal(light(start),active);
  sync(null,false);
  assert.equal(group.children.length,0);
 }finally{
  if(oldDocument===undefined)delete globalThis.document;
  else globalThis.document=oldDocument;
 }
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
