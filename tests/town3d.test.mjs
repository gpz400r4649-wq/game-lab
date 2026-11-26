import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene} from '../vendor/three.module.min.js';
import {create3D,fresh3D,part,step3D,validate3D} from '../engine3d.js';
import {createRoadNetwork} from '../road-network3d.js';
import {createRoadView} from '../road-model3d.js';
import {reverseOpenRoad,roadArcPlacement,roadConnection,roadStartConnection,roadDemolitionSection,roadPiecePlacement,roadStrokeAim,roadStrokePlacement,sampleRoad,splitRoadAt,splitRoadSection,traceRoadPoints,validRoads} from '../road3d.js';
import {fitRaceGate} from '../race3d.js';
import {DEFAULT_FLEET,configureTownPart,fitTownPart,houseGarage,refitTownParts,townLocal,townSolids,visitorParking} from '../town3d.js';
import {townRaceRank,townRoute} from '../town-traffic3d.js';

const road=(id,x,z,a,b,y=0)=>({id,width:8,closed:false,points:[{x,z,y},{x:a,z:b,y}]});
const main=road('east',-40,0,40,0),branch=road('south',0,0,0,40);
const advance=(g,p,seconds,input={coast:true})=>{
 for(let i=0;i<Math.round(seconds/.025);i++)step3D(g,p,input,.025);
};
const places=(roads,kind,x,z,roadId)=>fitTownPart(configureTownPart(part('town'),kind),roads.filter(r=>r.id===roadId),{x,y:0,z});

test('押した道路の１区間を取り除き、残りの道を保つ',()=>{
 const points=[-12,-4,4,12].map(x=>({x,y:0,z:0}));
 const road={id:'street',width:8,closed:false,sidewalk:'both',points};
 const pieces=splitRoadAt(road,{x:0,y:0,z:0});
 assert.deepEqual(pieces.map(piece=>piece.points),[points.slice(0,2),points.slice(2)]);
 assert.equal(pieces[0].id,road.id);
 assert.equal(pieces[1].sidewalk,'both');
 assert.equal(validRoads(pieces,240),true);
 const square=points.map((point,i)=>({x:i<2?0:8,y:0,z:i===0||i===3?0:8}));
 const [opened]=splitRoadAt({...road,points:square,closed:true},{x:4,y:0,z:8});
 assert.deepEqual(opened.points,[square[2],square[3],square[0],square[1]]);
 assert.equal(opened.closed,false);
});

test('道路を１区間ずつ置き、選んだ向きに上り・下りをつなげる',()=>{
 const road={id:'pieces',width:8,closed:false,points:[]};
 const first=roadPiecePlacement(road,{x:0,z:0},240,{grade:1});
 assert.deepEqual(first.points,[{x:0,y:0,z:0},{x:0,y:1.5,z:-8}]);
 const second=roadPiecePlacement({...road,points:first.points},{x:9,z:-7.9},240,{grade:1});
 assert.deepEqual(second.end,{x:8,y:3,z:-8});
 const third=roadPiecePlacement({...road,points:second.points},{x:18,z:-16},240,{grade:-1});
 assert.deepEqual(third.end,{x:16,y:1.5,z:-16});
 assert.equal(validRoads([{...road,points:third.points}],240),true);
 assert.equal(roadPiecePlacement({...road,points:first.points},{x:0,z:0},240,{grade:-1}),null);
});

test('区間配置は開始の高さと既存道路への接続を使い、マップ外には置かない',()=>{
 const road={id:'pieces',width:8,closed:false,points:[]};
 const raised=roadPiecePlacement(road,{x:0,z:0},240,{height:6});
 assert.equal(raised.points[0].y,6);assert.equal(raised.end.y,6);
 const existing=roadPiecePlacement(road,{x:0,z:0},240,{connections:[{...main,points:[{x:-40,z:-7},{x:40,z:-7}]}]});
 assert.deepEqual(existing.end,{x:0,y:0,z:-7});
 assert.equal(roadPiecePlacement(road,{x:0,z:-28},60),null);
});

test('短い区間でも、押した既存道路へつなげられる',()=>{
 const from=road('from',0,12,0,4);
 const placement=roadPiecePlacement(from,{x:0,z:.5},240,{connections:[main]});
 assert.deepEqual(placement.end,{x:0,y:0,z:0});
 assert.equal(createRoadNetwork([main,{...from,points:placement.points}]).signals.length,3);
});

test('直線をなぞると、最初の向きに同じ区間を並べ、マップの端で止まる',()=>{
 const draft={id:'drag',width:8,closed:false,points:[]},start={x:0,y:0,z:0};
 const stroke=roadStrokePlacement(draft,{x:70,z:12},0,60,{start,grade:1});
 assert.deepEqual(stroke.points,[
  start,{x:8,y:1.5,z:0},{x:16,y:3,z:0},{x:24,y:4.5,z:0}
 ]);
 assert.equal(roadStrokePlacement(draft,{x:-16,z:2},0,60,{start}),null);
 const existing=road('straight',-16,0,-8,0);
 const extension=roadStrokePlacement(existing,{x:24,z:4},0,240,{});
 assert.deepEqual(extension.points.map(({x,z})=>[x,z]),[[-16,0],[-8,0],[0,0],[8,0],[16,0]]);
});

test('直線の引き始めは向きを何度でも変えられ、引き直しで固定を解除できる',()=>{
 const aims=[{x:7,z:0},{x:0,z:-7},{x:-8,z:0},{x:0,z:8}];
 let lock=null;
 for(const [i,displacement] of aims.entries()){
  const {sector,lockedSector}=roadStrokeAim(8,displacement,lock);
  assert.equal(Math.round(Math.cos(sector*Math.PI/4)),[1,0,-1,0][i]);
  assert.equal(Math.round(Math.sin(sector*Math.PI/4)),[0,-1,0,1][i]);
  assert.equal(lockedSector,null);lock=lockedSector;
 }
 assert.deepEqual(roadStrokeAim(8,{x:16,z:0}),{sector:0,lockedSector:0});
 assert.deepEqual(roadStrokeAim(8,{x:19,z:10},0),{sector:0,lockedSector:0});
 assert.deepEqual(roadStrokeAim(8,{x:0,z:-8},0),{sector:-2,lockedSector:null});
 assert.deepEqual(roadStrokeAim(8,{x:.1,z:.1},0),{sector:null,lockedSector:null});
});

test('半円の向きと大きさは両端で決まり、逆向きに重ねずつなぐと同じ半径の円になる',()=>{
 const draft={id:'arc',width:8,closed:false,points:[]},start={x:0,y:3,z:0};
 const first=roadArcPlacement(draft,{x:24,z:0},240,{start});
 assert.deepEqual(first.end,{x:24,y:3,z:0});
 assert.equal(first.closed,false);
 assert.ok(first.points.slice(1,-1).every(p=>p.z>0));
 const second=roadArcPlacement({...draft,points:first.points},{x:1,z:.5},240);
 assert.equal(second.closed,true);
 assert.ok(second.points.slice(first.points.length).every(p=>p.z<0));
 assert.ok(second.points.every(p=>p.y===3&&Math.abs(Math.hypot(p.x-12,p.z)-12)<.00001));
 assert.equal(validRoads([{...draft,...second}],240),true);
 const mirrored=roadArcPlacement(draft,{x:24,z:0},240,{start,side:-1});
 assert.ok(mirrored.points.slice(1,-1).every(p=>p.z<0));
 assert.equal(roadArcPlacement(draft,{x:24,z:26},60,{start:{x:0,y:0,z:26}}),null);
});

test('保存済みのカーブを直線１区間分だけ壊し、両側の道とガードレールを保つ',()=>{
 const straight=road('arc',-8,0,0,0);
 const arc=roadArcPlacement(straight,{x:24,z:0},240);
 const saved={...straight,points:[...arc.points,{x:32,z:0}],
  segmentBarriers:{0:'guardrail',[arc.points.length-1]:'guardrail'}};
 const loaded=JSON.parse(JSON.stringify(saved));
 const section=roadDemolitionSection(loaded,5);
 assert.deepEqual(section,{index:4,endIndex:6});
 const removedLength=loaded.points.slice(section.index,section.endIndex+1).reduce((length,p,index)=>{
  const next=loaded.points[section.index+index+1];
  return length+Math.hypot(next.x-p.x,next.z-p.z);
 },0);
 assert.ok(Math.abs(removedLength-8)<1.2);
 const rest=splitRoadSection(loaded,section.index,section.endIndex);
 assert.equal(rest[0].points[0].x,-8);
 assert.equal(rest[1].points.at(-1).x,32);
 assert.ok(rest.every(r=>r.points.length>2));
 assert.deepEqual(rest.map(r=>r.segmentBarriers),[{0:'guardrail'},{[rest[1].points.length-2]:'guardrail'}]);
 assert.deepEqual(roadDemolitionSection(loaded,0),{index:0,endIndex:0});
});

test('円を１区間ずつ壊せて、切ったあともカーブを続けて壊せる',()=>{
 const draft={id:'circle',width:8,closed:false,points:[]};
 const half=roadArcPlacement(draft,{x:24,z:0},240,{start:{x:0,z:0}});
 const loop={...draft,...roadArcPlacement({...draft,...half},{x:0,z:0},240)};
 for(const picked of [1,loop.points.length-2]){
  const section=roadDemolitionSection(loop,picked);
  const [remaining]=splitRoadSection(loop,section.index,section.endIndex);
  assert.equal(remaining.closed,false);
  assert.equal(remaining.points.length,loop.points.length-2);
  assert.ok(remaining.points.some(p=>p.z>10)&&remaining.points.some(p=>p.z<-10));
  const next=roadDemolitionSection(remaining,1);
  assert.equal(next.endIndex-next.index+1,3);
 }
});

test('道をはじめから延ばしても、元の歩道側とガードレールの区間を保つ',()=>{
 const original={...main,sidewalk:'left',segmentBarriers:{0:'guardrail'}};
 const drawing=reverseOpenRoad(original);
 const extension=roadPiecePlacement(drawing,{x:-48,z:0},240);
 const result=reverseOpenRoad({...drawing,points:extension.points});
 assert.deepEqual(result.points.slice(1),original.points);
 assert.equal(result.points[0].x,-48);
 assert.equal(result.sidewalk,'left');
 assert.deepEqual(result.segmentBarriers,{1:'guardrail'});
 assert.equal(validRoads([result],240),true);
});

test('道路の端と途中に吸い付き、高さの違う道路は接続先にしない',()=>{
 assert.deepEqual(roadConnection([main],{x:-39,z:1},0,240),{x:-40,y:0,z:0});
 const join=roadConnection([main],{x:4.5,z:1},0,240);
 assert.deepEqual([join.x,join.y,join.z],[4.5,0,0]);
 assert.equal(roadConnection([main],{x:4.5,z:1},6,240),null);
 const draft={id:'draft',width:8,closed:false,points:[]};
 const points=traceRoadPoints(draft,[{x:4.5,z:1},{x:16,z:6},{x:4.9,z:22}],120,{straight:true,first:join});
 assert.deepEqual(points,[{x:4.5,y:0,z:0,corner:'straight'},{x:4,z:22,corner:'straight'}]);
 assert.deepEqual(sampleRoad({...draft,points:[{x:-8,z:0},...points]}),[{x:-8,z:0},...points]);
});

test('道を引き始める時は付近の端に吸い付き、押した高架の端の高さも引き継ぐ',()=>{
 const ramp={...road('ramp',-40,0,-20,0),points:[{x:-40,y:6,z:0},{x:-20,y:10,z:0}]};
 const roads=[main,ramp];
 assert.deepEqual(roadStartConnection(roads,{x:-42,z:2.5},0,240),{x:-40,y:0,z:0});
 const ground=roadStartConnection(roads,{x:-20,z:2},0,240);
 assert.deepEqual([ground.x,ground.y,ground.z],[-20,0,0]);
 const start=roadStartConnection(roads,{x:-19,z:2},0,240,{id:ramp.id,point:{x:-22,y:9.625,z:2}});
 assert.deepEqual(start,{x:-20,y:10,z:0});
 const next=roadPiecePlacement({id:'extension',width:8,closed:false,points:[]},start,240,{start});
 assert.deepEqual(next.points,[start,{x:-20,y:10,z:-8}]);
});

test('歩道を道路に沿って表示し、道幅に合わせて横断歩道を広げて家の入口を向ける',()=>{
 const street={...main,sidewalk:'both'},p=fresh3D('car');
 p.roads=[street,branch];
 const crossing=places(p.roads,'crosswalk',-13,0,'east'),house=places(p.roads,'house',-25,7,'east');
 p.objects=[crossing,house];
 assert.deepEqual(validate3D(p).objects.map(o=>o.townKind),['crosswalk','house']);
 assert.equal(house.townHeading,0);assert.ok(house.z>8);
 const [resized,resizedHouse]=refitTownParts(p.objects,[{...street,width:16},branch],p);
 assert.equal(resized.w,15.5);assert.equal(resizedHouse.z,house.z+4);
 const scene=new Scene(),view=createRoadView(scene);view.sync(p.roads,120);
 const pavement=scene.children[0].children[0].children.at(-1);
 pavement.geometry.computeBoundingBox();
 assert.ok(pavement.geometry.boundingBox.max.z>=6);
});

test('丁字路を自動で曲がれ、高さの違う交差や離れた道路をつなげない',()=>{
 const over=road('upper',0,-30,0,30,6),away=road('away',30,30,50,30);
 const net=createRoadNetwork([main,branch,over,away]);
 const path=net.route({x:-20,y:0,z:0},{x:0,y:0,z:20},{fromRoad:'east',toRoad:'south'});
 assert.ok(path.some(p=>p.x===0&&p.z===0));assert.ok(path.every(p=>p.y===0));
 assert.equal(net.route({x:-20,y:0,z:0},{x:0,y:6,z:20},{fromRoad:'east',toRoad:'upper'}),null);
 assert.equal(net.route({x:-20,y:0,z:0},{x:48,y:0,z:30},{fromRoad:'east',toRoad:'away'}),null);
});

test('同じ高さの丁字路と十字路でだけ信号を表示し、道路を取り除くと消える',()=>{
 const crossing=road('crossing',0,-35,0,35);
 const over=road('over',0,-35,0,35,6),extension=road('extension',40,0,60,0);
 assert.equal(createRoadNetwork([main,over,extension]).signals.length,0);
 assert.equal(createRoadNetwork([main,branch,over]).signals.length,3);
 const selfCrossing={id:'figure-eight',width:8,closed:false,points:[
  {x:-20,z:-20},{x:20,z:20},{x:20,z:-20},{x:-20,z:20}
 ]};
 assert.equal(createRoadNetwork([selfCrossing]).signals.length,4);
 const scene=new Scene(),view=createRoadView(scene);
 view.sync([main,crossing],120);
 const models=scene.getObjectByName('automatic-traffic-signals');
 assert.equal(models.children.length,4);
 assert.deepEqual(models.children.map(model=>model.userData.activeLamp).sort(),[0,0,2,2]);
 view.updateSignals(10.5);
 assert.ok(models.children.every(model=>model.userData.activeLamp===0));
 view.sync([main],120);
 assert.equal(models.children.length,0);
});

test('まちの車は赤信号で待ち、青で進み、行き先で待って元の駐車場へ帰る',()=>{
 const p=fresh3D('car');p.roads=[main,branch];
 const from=places(p.roads,'garage',-25,9,'east'),to=places(p.roads,'parking',9,24,'south');
 from.townFleet={...DEFAULT_FLEET,count:3,targetId:to.id,delay:9};
 p.objects=[from,to];
 const route=townRoute(createRoadNetwork(p.roads),from,to);
 assert.ok(route.length>6);
 const game=create3D(validate3D(p),{testSpawn:{x:-85,y:0,z:-80,heading:0}}),[first,second]=game.town.cars;
 const start={x:first.x,z:first.z};
 assert.equal(first.outStops.length,1);
 advance(game,p,10);assert.equal(first.phase,'out');assert.equal(second.phase,'queued');
 advance(game,p,8);const stopped=first.distance;
 advance(game,p,2);assert.equal(first.distance,stopped);assert.equal(first.speed,0);
 advance(game,p,4);assert.ok(first.distance>stopped+5);
 advance(game,p,60);assert.ok(game.town.cars.every(car=>car.phase==='parked'));
 assert.ok(Math.hypot(first.x-start.x,first.z-start.z)<.2);
});

test('レースのあいてがゲート間を走り、先着するとプレイヤーの順位に反映する',()=>{
 const p=fresh3D('car');p.roads=[main];
 p.objects=[fitRaceGate(part('raceGate'),p.roads,{x:-30,y:0,z:0}),fitRaceGate(part('raceGate'),p.roads,{x:15,y:0,z:0})];
 p.objects[1].gateOrder=2;p.rivals=[{speed:.9,corner:1}];
 const game=create3D(validate3D(p));
 advance(game,p,1,{z:-.25,coast:true});
 assert.equal(game.town.rivals[0].distance,0);
 advance(game,p,30,{z:-.25,coast:true});
 assert.equal(game.state,'won');assert.ok(game.town.rivals[0].finishedAt>0);
 assert.deepEqual(townRaceRank(game),{rank:2,total:2});
});

test('家に付いたガレージから車が出て、駐車場で待って家に帰る',()=>{
 const p=fresh3D('car');p.roads=[{...main,sidewalk:'both'}];
 const house=places(p.roads,'house',-24,9,'east'),parking=places(p.roads,'parking',24,-9,'east');
 house.townFleet={...DEFAULT_FLEET,count:1,targetId:parking.id};
 p.objects=[house,parking];
 const garage=houseGarage(house),inside=townLocal(house,garage.garageX,0);
 assert.equal(house.townDriveway,2.65);
 assert.ok(townSolids(house).every(box=>Math.abs(box.x-inside.x)>=box.w/2+.9||Math.abs(box.z-inside.z)>=box.d/2+.9));
 const game=create3D(validate3D(p),{testSpawn:{x:-85,y:0,z:-80,heading:0}}),[car]=game.town.cars;
 assert.ok(Math.abs(car.x-inside.x)<.01);
 advance(game,p,3);assert.equal(car.phase,'out');assert.ok(car.z<inside.z-1);
 advance(game,p,36);assert.equal(car.phase,'parked');assert.ok(Math.hypot(car.x-inside.x,car.z-inside.z)<.8);
});

test('家の車はお店と学校を行き先にでき、建物に入らず駐車して帰る',()=>{
 for(const kind of ['shop','school']){
  const p=fresh3D('car');p.roads=[{...main,sidewalk:'both'}];
  const house=places(p.roads,'house',-24,9,'east'),destination=places(p.roads,kind,24,-9,'east');
  destination.townDriveway=0;
  house.townFleet={...DEFAULT_FLEET,count:1,targetId:destination.id};
  p.objects=[house,destination];
  const loaded=validate3D(p),target=loaded.objects[1],parking=visitorParking(target);
  assert.equal(target.townDriveway,2.65);
  const game=create3D(loaded,{testSpawn:{x:-85,y:0,z:-80,heading:0}}),[car]=game.town.cars;
  const end=car.out.points.at(-1);
  assert.ok(Math.hypot(end.x-target.x,end.z-target.z)<target.w/2);
  assert.ok(townSolids(target).every(box=>Math.abs(box.x-end.x)>=box.w/2+.8||Math.abs(box.z-end.z)>=box.d/2+.8));
  assert.equal(parking.slots,kind==='school'?2:1);
  advance(game,loaded,48);assert.equal(car.phase,'parked');
  assert.ok(Math.hypot(car.x-house.x,car.z-house.z)<house.w/2);
 }
});

test('保存済みの家にも車の出入口が付き、道路を直しても家のはばが変わらない',()=>{
 const p=fresh3D('car');p.roads=[{...main,sidewalk:'both'}];
 const previousHouse={...places(p.roads,'house',-24,9,'east'),w:6,townDriveway:0};
 p.objects=[previousHouse];
 const [house]=validate3D(p).objects;
 assert.equal(house.w,6);assert.equal(house.townDriveway,2.65);
 const [refitted]=refitTownParts([house],[{...main,width:12}],p);
 assert.equal(refitted.w,6);assert.equal(refitted.townDriveway,.65);
});
