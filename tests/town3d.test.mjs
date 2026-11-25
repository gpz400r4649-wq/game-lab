import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene} from '../vendor/three.module.min.js';
import {create3D,fresh3D,part,step3D,validate3D} from '../engine3d.js';
import {createRoadNetwork} from '../road-network3d.js';
import {createRoadView} from '../road-model3d.js';
import {roadConnection,roadPiecePlacement,sampleRoad,splitRoadAt,traceRoadPoints,validRoads} from '../road3d.js';
import {fitRaceGate} from '../race3d.js';
import {DEFAULT_FLEET,configureTownPart,fitTownPart,houseGarage,refitTownParts,townLocal,townSolids} from '../town3d.js';
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

test('まちの車は赤信号で待ち、青で進み、行き先で待って元の駐車場へ帰る',()=>{
 const p=fresh3D('car');p.roads=[main,branch];
 const from=places(p.roads,'garage',-25,9,'east'),to=places(p.roads,'parking',9,24,'south');
 from.townFleet={...DEFAULT_FLEET,count:3,targetId:to.id};
 p.objects=[from,to,{...part('trafficSignal',-10,2),rotation:90}];
 const route=townRoute(createRoadNetwork(p.roads),from,to);
 assert.ok(route.length>6);
 const game=create3D(validate3D(p),{testSpawn:{x:-85,y:0,z:-80,heading:0}}),[first,second]=game.town.cars;
 const start={x:first.x,z:first.z};
 advance(game,p,2);assert.equal(first.phase,'out');assert.equal(second.phase,'queued');
 advance(game,p,6);const stopped=first.distance;
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

test('保存済みの家にも車の出入口が付き、道路を直しても家のはばが変わらない',()=>{
 const p=fresh3D('car');p.roads=[{...main,sidewalk:'both'}];
 const previousHouse={...places(p.roads,'house',-24,9,'east'),w:6,townDriveway:0};
 p.objects=[previousHouse];
 const [house]=validate3D(p).objects;
 assert.equal(house.w,6);assert.equal(house.townDriveway,2.65);
 const [refitted]=refitTownParts([house],[{...main,width:12}],p);
 assert.equal(refitted.w,6);assert.equal(refitted.townDriveway,.65);
});
