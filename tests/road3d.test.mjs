import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene} from '../vendor/three.module.min.js';
import {createRoadView} from '../road-model3d.js';
import {makeTrafficSignal,updateTrafficSignal} from '../race-model3d.js';
import {ROAD_BARRIERS,MAX_ROADS,MAX_ROAD_POINTS,createRoadBarrierQuery,createRoadOpenings,createRoadSectionQuery,createRoadSurfaceQuery,removeRoadPoint,roadBarrierOffset,roadPoint,roadGridSites,roadSections,roadVertex,sampleRoad,splitRoadAt,toggleRoadGuardrail,traceRoadPoints,validRoads} from '../road3d.js';
import {create3D,fresh3D,part,step3D,validate3D} from '../engine3d.js';
import {fitRaceGate,updateRaceGates,updateRoadGateWidths} from '../race3d.js';
import {resizeReason} from '../world3d.js';

const turn=()=>({id:'first',width:8,closed:false,points:[{x:-20,z:0},{x:0,z:0},{x:0,z:-20}]});

test('歩道つき道路と細い斜めの道路は同じ断面でつながり、手前で幅と歩道を絞る',()=>{
 const wide={id:'wide',width:8,closed:false,sidewalk:'both',points:[{x:-24,y:4,z:0},{x:0,y:4,z:0}]};
 const narrow={id:'narrow',width:4,closed:false,points:[{x:0,y:4,z:0},{x:12,y:4,z:12}]};
 const sections=createRoadSectionQuery([wide,narrow]),wideEnd=sections(wide).at(-1),narrowStart=sections(narrow)[0];
 assert.equal(sections(wide).length,3);
 assert.equal(sections(wide)[0].widthScale,1);
 assert.equal(wideEnd.widthScale,.5);
 assert.equal(wideEnd.leftWalk,0);
 assert.equal(wideEnd.rightWalk,0);
 for(const sign of [-1,1])assert.deepEqual(roadVertex(wideEnd,sign*4,120),roadVertex(narrowStart,sign*2,120));
 const ground=createRoadSurfaceQuery([wide,narrow],240);
 assert.ok(ground(0,0).some(surface=>surface.y===4));
 assert.equal(ground(-1,3.95).length,0);
});

test('16本を超える道路も保存して再読込できる',()=>{
 const project=fresh3D('car');
 project.roads=Array.from({length:MAX_ROADS},(_,i)=>({
  id:'road-'+i,width:4,closed:false,points:[{x:-5,z:i-32},{x:5,z:i-32}]
 }));
 assert.equal(validate3D(JSON.parse(JSON.stringify(project))).roads.length,64);
 assert.equal(validRoads([...project.roads,{...project.roads[0],id:'too-many'}],project),false);
});

test('区間のガードレールは保存され、その区間だけ表示と衝突に使われる',()=>{
 const project=fresh3D('car');
 const base={id:'street',width:8,closed:false,points:[{x:-30,z:0},{x:-10,z:0},{x:10,z:0},{x:30,z:0}]};
 project.roads=[toggleRoadGuardrail(base,1)];
 const loaded=validate3D(JSON.parse(JSON.stringify(project)));
 const collide=createRoadBarrierQuery(loaded.roads,loaded);
 const cross=(x)=>collide({x,y:0,z:0},{x,y:0,z:8},0);
 assert.ok(cross(0));assert.equal(cross(-20),null);assert.equal(cross(20),null);
 const scene=new Scene(),view=createRoadView(scene);
 view.sync(loaded.roads,60);
 const rail=scene.children[0].children[0].children.find(mesh=>mesh.userData.roadBarrier);
 rail.geometry.computeBoundingBox();
 assert.equal(rail.geometry.boundingBox.min.x,-10);assert.equal(rail.geometry.boundingBox.max.x,10);
 assert.deepEqual(toggleRoadGuardrail(loaded.roads[0],1).segmentBarriers,{});
 assert.deepEqual(toggleRoadGuardrail({...base,barrier:'guardrail'},1).segmentBarriers,{1:'none'});
});

test('道路を分割してもガードレールは残った区間についていく',()=>{
 const road={id:'street',width:8,closed:false,points:[{x:-30,z:0},{x:-10,z:0},{x:10,z:0},{x:30,z:0}],
  segmentBarriers:{0:'guardrail',2:'guardrail'}};
 const pieces=splitRoadAt(road,{x:0,z:0});
 assert.deepEqual(pieces.map(piece=>piece.segmentBarriers),[{0:'guardrail'},{0:'guardrail'}]);
 assert.deepEqual(removeRoadPoint(road,0).segmentBarriers,{1:'guardrail'});
 const loop={...road,closed:true,points:[{x:-10,z:-10},{x:-10,z:10},{x:10,z:10},{x:10,z:-10}]};
 const [opened]=splitRoadAt(loop,{x:-10,z:0});
 assert.deepEqual(opened.segmentBarriers,{1:'guardrail'});
 assert.equal(validRoads(pieces,240),true);
 assert.equal(validRoads([opened],240),true);
});

test('なぞった道路は小さなぶれを省き、曲がり角と終点をグリッドにそろえる',()=>{
 const road={id:'trace',width:8,closed:false,points:[]};
 const straight=Array.from({length:41},(_,i)=>({x:-20+i,z:i%2?.7:0}));
 assert.deepEqual(traceRoadPoints(road,straight,60),[{x:-20,z:0},{x:20,z:0}]);
 const curve=[...straight.slice(0,21),...Array.from({length:15},(_,i)=>({x:0,z:i+1}))];
 const points=traceRoadPoints(road,curve,60);
 assert.deepEqual(points,[{x:-20,z:0},{x:0,z:0},{x:0,z:16}]);
 assert.equal(validRoads([{...road,points}],60),true);
 assert.deepEqual(road.points,[]);
});

test('なぞって道路をのばすと、元の点と高さを保って上限内で終点まで届く',()=>{
 const points=Array.from({length:MAX_ROAD_POINTS-1},(_,i)=>({x:-100+i*2,y:6,z:0}));
 const road={id:'raised',width:8,closed:false,points};
 const next=traceRoadPoints(road,[points.at(-1),{x:28,z:8},{x:50,z:2}],240);
 assert.equal(next.length,MAX_ROAD_POINTS);
 assert.deepEqual(next.slice(0,-1),points);
 assert.deepEqual(next.at(-1),{x:50,y:6,z:2});
 assert.equal(validRoads([{...road,points:next}],240),true);
 assert.equal(traceRoadPoints(road,[points.at(-1)],240),points);
});

test('曲がり角は滑らかにつながり、一周の道路は最初につながる',()=>{
 const road=turn(),path=sampleRoad(road);
 assert.deepEqual(path[0],road.points[0]);assert.deepEqual(path.at(-1),road.points.at(-1));
 assert.ok(path.some(point=>point.x<0&&point.z<0));
 assert.ok(path.every(point=>point.x>=-20&&point.x<=0&&point.z>=-20&&point.z<=0));
 const loop=sampleRoad({...road,closed:true});assert.deepEqual(loop[0],loop.at(-1));
});

test('車の作品は道路を保存でき、道幅・近すぎる点・マップ外の点を検証する',()=>{
 const project=fresh3D('car');project.roads=[turn()];
 assert.deepEqual(validate3D(JSON.parse(JSON.stringify(project))).roads,project.roads);
 const invalid=structuredClone(project);invalid.roads[0].points[2]={x:0,z:-.5};
 assert.equal(validRoads(invalid.roads,invalid),false);assert.throws(()=>validate3D(invalid));
 invalid.roads[0].width=5;assert.throws(()=>validate3D(invalid));
 assert.deepEqual(roadPoint({x:30,z:-29.6},60),{x:28,z:-28});
 assert.equal(roadPoint({x:31,z:0},60),null);
 project.worldSize=240;project.roads[0].points[0].x=-110;assert.match(resizeReason(project,60),/どうろ/);
});

test('道幅がマップ端に達しても舗装が外へ出ず、編集中だけ元の道路を隠す',()=>{
 const scene=new Scene(),view=createRoadView(scene);
 const road={id:'edge',width:12,closed:false,points:[{x:28,z:24},{x:28,z:-24}]};
 view.sync([road],30);
 const [saved,draft]=scene.children,model=saved.children[0];
 assert.equal(model.children.length,3);
 for(const mesh of model.children){
  const vertices=mesh.geometry.getAttribute('position');
  for(let i=0;i<vertices.count;i++){assert.ok(Math.abs(vertices.getX(i))<=30);assert.ok(Math.abs(vertices.getZ(i))<=30);}
 }
 view.showDraft(road,1);assert.equal(saved.children[0].visible,false);assert.equal(draft.children.length,3);
 view.showDraft(null);assert.equal(saved.children[0].visible,true);assert.equal(draft.children.length,0);
});


test('１マスの四隅・辺のまんなか・中心の９点に道路が吸い付く',()=>{
 const sites=roadGridSites({x:0,z:0},60);
 assert.deepEqual(sites,[-2,0,2].flatMap(z=>[-2,0,2].map(x=>({x,z}))));
 for(const site of sites)assert.deepEqual(roadPoint({x:site.x+.3,z:site.z-.2},60),site);
 assert.deepEqual(roadPoint({x:5.9,z:1.2},60),{x:6,z:2});
 const next=roadGridSites({x:3.5,z:0},60);
 assert.deepEqual(next.filter(site=>site.x===2),sites.filter(site=>site.x===2));
 assert.equal(roadGridSites({x:120,z:0},240).length,9);
 assert.ok(roadGridSites({x:120,z:0},240).every(site=>site.x<=118));
});

test('以前に保存した道路のグリッドに合わない点は読み込み時に動かない',()=>{
 const p=fresh3D('car');p.roads=[{id:'legacy',width:8,closed:false,points:[{x:3,z:7},{x:19,z:11}]}];
 assert.deepEqual(validate3D(p).roads,p.roads);
});

const bridge=()=>({id:'upper',width:8,closed:false,points:[
 {x:0,y:0,z:36},{x:0,y:6,z:16},{x:0,y:6,z:-16},{x:0,y:0,z:-36}
]});
const underpass=()=>({id:'lower',width:8,closed:false,points:[{x:-36,z:0},{x:36,z:0}]});

test('立体交差の道路は高さを保存し、通る道に合わせて坂を上り下りできる',()=>{
 const p=fresh3D('car');p.roads=[bridge(),underpass()];
 assert.deepEqual(validate3D(JSON.parse(JSON.stringify(p))).roads,p.roads);
 const invalid={...bridge(),points:[{x:0,z:0,y:0},{x:0,z:2,y:6}]};
 assert.equal(validRoads([invalid],p),false);
 const query=createRoadSurfaceQuery(p.roads,p);
 assert.ok(query(0,0).some(point=>Math.abs(point.y-6)<1e-8));
 assert.ok(query(0,28).some(point=>point.y>0&&point.y<6));
 assert.equal(query(9,0).length,0);
 const upper=create3D(p),lower=create3D(p,{testSpawn:{x:-14,y:0,z:0,heading:-Math.PI/2}});
 let crossedAbove=false,crossedBelow=false;
 for(let i=0;i<400;i++){
  step3D(upper,p,{z:-1},.02);step3D(lower,p,{z:-1},.02);
  if(Math.abs(upper.player.z)<1){
   assert.ok(Math.abs(upper.player.y-6)<.01);crossedAbove=true;
  }
  if(Math.abs(lower.player.x)<1){
   assert.equal(lower.player.y,0);crossedBelow=true;
  }
 }
 assert.ok(crossedAbove&&crossedBelow);
 assert.equal(upper.player.y,0);
 assert.ok(upper.player.z<-36&&lower.player.x>6);
});

test('立体交差のゲートは選んだ道の高さに合い、下から通っても上のゲートは反応しない',()=>{
 const p=fresh3D('car');p.roads=[bridge(),underpass()];
 const high=fitRaceGate(part('raceGate'),p.roads,{x:0,y:6.025,z:0});
 const low=fitRaceGate(part('raceGate'),p.roads,{x:0,y:.025,z:0});
 assert.deepEqual([high.gateRoadId,high.y,low.gateRoadId,low.y],['upper',6,'lower',0]);
 p.objects=[high];
 const g=create3D(validate3D(p));
 Object.assign(g.player,{x:0,y:0,z:0});
 updateRaceGates(g,{x:0,y:0,z:1},()=>{});
 assert.equal(g.state,'playing');
 Object.assign(g.player,{x:0,y:6,z:0});
 updateRaceGates(g,{x:0,y:6,z:1},()=>{});
 assert.equal(g.state,'won');
 const raised=p.roads.map(road=>road.id==='upper'?{...road,width:16,points:road.points.map(point=>({...point,y:point.y+1.5}))}:road);
 const [changed]=updateRoadGateWidths(p.objects,p.roads,raised);
 assert.equal(changed.y,7.5);
 assert.equal(changed.gateWidth,16);
});

test('保存した立体道路の見た目と編集ハンドルも道路の高さを使う',()=>{
 const scene=new Scene(),view=createRoadView(scene),road=bridge();
 view.sync([road],120);
 const [mesh]=view.surfaces();
 mesh.geometry.computeBoundingBox();
 assert.ok(mesh.geometry.boundingBox.max.y>6);
 view.showDraft(road,1);
 assert.equal(view.handles()[1].position.y,6.34);
});

test('道路ごとの柵と白い中央線を保存し、坂に沿って描く',()=>{
 const p=fresh3D('car'),scene=new Scene(),view=createRoadView(scene);
 for(const [barrier,profile] of Object.entries(ROAD_BARRIERS)){
  const road={...bridge(),barrier,markings:'street'};
  p.roads=[road,underpass()];
  assert.deepEqual(validate3D(JSON.parse(JSON.stringify(p))).roads,p.roads);
  view.sync(p.roads,120);
  const [upper,lower]=scene.children[0].children;
  const fence=upper.children.find(mesh=>mesh.userData.roadBarrier);
  fence.geometry.computeBoundingBox();
  const {min,max}=fence.geometry.boundingBox;
  assert.ok(Math.abs(max.y-6-.025-profile.height)<.001);
  assert.ok(min.y<.03&&min.x<-3.8&&max.x>3.8);
  assert.equal(upper.children[2].material.color.getHex(),0xe2e6ef);
  assert.equal(lower.children[2].material.color.getHex(),0xf3d88b);
  assert.ok(!lower.children.some(mesh=>mesh.userData.roadBarrier));
 }
 assert.equal(validRoads([{...bridge(),barrier:'unknown'}],p),false);
 assert.equal(validRoads([{...bridge(),markings:'unknown'}],p),false);
});

test('走っている車は柵を通り抜けず、立体交差の下の道は走れる',()=>{
 const p=fresh3D('car'),road={id:'flat',width:8,closed:false,points:[{x:0,z:-36},{x:0,z:36}]};
 const start={x:0,y:0,z:0,heading:-Math.PI/2};
 for(const barrier of [...Object.keys(ROAD_BARRIERS),undefined]){
  p.roads=[{...road,barrier}];
  const g=create3D(p,{testSpawn:start});
  for(let i=0;i<100;i++)step3D(g,p,{z:-1},.02);
  assert.ok(barrier?g.player.x>2&&g.player.x<3.1:g.player.x>8);
 }
 p.roads=[{...bridge(),barrier:'guardrail'},underpass()];
 const query=createRoadBarrierQuery(p.roads,p);
 assert.ok(query({x:2.3,y:6,z:0},{x:3.2,y:6,z:0},-Math.PI/2));
 assert.ok(!query({x:2.3,y:0,z:0},{x:3.2,y:0,z:0},-Math.PI/2));
 const lower=create3D(p,{testSpawn:{...start,x:-14}});
 for(let i=0;i<200;i++)step3D(lower,p,{z:-1},.02);
 assert.ok(lower.player.x>8&&lower.player.y===0);
});

test('車の先端と後ろが接触し、一度の移動で柵の向こうに飛び越せない',()=>{
 const p=fresh3D('car'),road={id:'straight',width:8,closed:false,points:[{x:0,z:-36},{x:0,z:36}]};
 for(const barrier of Object.keys(ROAD_BARRIERS)){
  p.roads=[{...road,barrier}];
  const query=createRoadBarrierQuery(p.roads,p),at=x=>({x,y:0,z:0});
  assert.ok(query(at(2.1),at(2.61),Math.PI/2));
  assert.ok(query(at(2.1),at(2.61),-Math.PI/2));
  assert.ok(query(at(0),at(8),-Math.PI/2));
  assert.ok(query(at(2.7),at(2.7),Math.PI/2));
  assert.ok(!query(at(2.7),at(2.7),0));
  assert.ok(!query(at(2.7),at(2.3),-Math.PI/2));
  const car=create3D(p,{testSpawn:{...at(0),heading:-Math.PI/2}});
  car.car.speed=100;
  step3D(car,p,{z:-1},.033);
  assert.ok(car.player.x>1.5&&car.player.x+1.27<=3.88-ROAD_BARRIERS[barrier].thickness/2);
 }
});

test('坂のあるカーブの途中でも柵に当たる',()=>{
 const p=fresh3D('car'),road={...turn(),barrier:'mini',points:[{x:-20,y:0,z:0},{x:0,y:4,z:0},{x:0,y:6,z:-20}]};
 p.roads=[road];
 const query=createRoadBarrierQuery(p.roads,p),sections=roadSections(sampleRoad(road),false);
 const offset=roadBarrierOffset(road,1),a=roadVertex(sections[6],offset,120),b=roadVertex(sections[7],offset,120);
 const length=Math.hypot(b.x-a.x,b.z-a.z),nx=(b.z-a.z)/length,nz=(a.x-b.x)/length;
 const middle={x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:(a.z+b.z)/2};
 const side=(distance,y=middle.y)=>({x:middle.x+distance*nx,y,z:middle.z+distance*nz});
 assert.ok(query(side(2),side(-2),Math.atan2(nx,nz)));
 assert.ok(!query(side(2,0),side(-2,0),Math.atan2(nx,nz)));
});

test('十字路と丁字路では白線と柵が切れ、分かれ道に入れる',()=>{
 const p=fresh3D('car'),main={...underpass(),barrier:'highway',markings:'street'};
 const branch={id:'branch',width:8,closed:false,barrier:'guardrail',markings:'street',points:[{x:0,z:0},{x:0,z:36}]};
 const scene=new Scene(),view=createRoadView(scene);
 for(const crossing of [branch,{...branch,points:[{x:0,z:-36},branch.points[1]]}]){
  p.roads=[main,crossing];
  const runs=createRoadOpenings(p.roads,120)(main.id,{x:-36,y:0,z:3.88},{x:36,y:0,z:3.88});
  assert.equal(runs.length,2);
  assert.ok(Math.abs(runs[0][1]-32/72)<1e-6&&Math.abs(runs[1][0]-40/72)<1e-6);
  const query=createRoadBarrierQuery(p.roads,p);
  const blocked=(x,z)=>!!query({x,y:0,z:z*2.3},{x,y:0,z:z*3.2},0);
  assert.equal(blocked(0,1),false);
  assert.equal(blocked(0,-1),crossing===branch);
  assert.equal(blocked(10,1),true);
  const g=create3D(p,{testSpawn:{x:0,y:0,z:0,heading:Math.PI}});
  for(let i=0;i<120;i++)step3D(g,p,{z:-1},.02);
  assert.ok(g.player.z>8);
  view.sync(p.roads,120);
  for(const mesh of scene.children[0].children[0].children.slice(1)){
   const vertices=mesh.geometry.getAttribute('position');
   for(let i=0;i<vertices.count;i++)if(crossing!==branch||vertices.getZ(i)>0)assert.ok(Math.abs(vertices.getX(i))>3.999);
  }
 }
 view.sync([main],120);view.showDraft(branch);
 const draftOpening=scene.children[0].children[0].children.find(mesh=>mesh.userData.roadBarrier);
 const vertices=draftOpening.geometry.getAttribute('position');
 for(let i=0;i<vertices.count;i++)if(vertices.getZ(i)>0)assert.ok(Math.abs(vertices.getX(i))>3.999);
 view.sync([main],120);view.showDraft(null);
 const savedModel=scene.children[0].children[0];
 view.showDraft(branch,-1,true);
 assert.equal(scene.children[0].children[0],savedModel);
 view.showDraft({...branch,points:[branch.points[0],{x:0,z:26}]},-1,true);
 assert.equal(scene.children[0].children[0],savedModel);
});

test('旧作品の手置き信号を取り除き、信号は交互に青になる',()=>{
 const p=fresh3D('car'),signal=part('trafficSignal'),side={...part('trafficSignal'),rotation:90};
 p.objects=[signal,side];
 assert.deepEqual(validate3D(p).objects,[]);
 const front=makeTrafficSignal(signal),cross=makeTrafficSignal(side);
 assert.equal(cross.rotation.y,Math.PI/2);
 for(const [second,expected] of [[0,[2,0]],[8,[1,0]],[10,[0,0]],[11,[0,2]],[19,[0,1]],[21,[0,0]],[22,[2,0]]]){
  updateTrafficSignal(front,signal.rotation,second);updateTrafficSignal(cross,side.rotation,second);
  assert.deepEqual([front.userData.activeLamp,cross.userData.activeLamp],expected);
 }
});
