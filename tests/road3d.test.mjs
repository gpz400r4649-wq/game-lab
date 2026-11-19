import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene} from '../vendor/three.module.min.js';
import {createRoadView} from '../road-model3d.js';
import {createRoadSurfaceQuery,roadPoint,roadGridSites,sampleRoad,validRoads} from '../road3d.js';
import {create3D,fresh3D,part,step3D,validate3D} from '../engine3d.js';
import {fitRaceGate,updateRaceGates,updateRoadGateWidths} from '../race3d.js';
import {resizeReason} from '../world3d.js';

const turn=()=>({id:'first',width:8,closed:false,points:[{x:-20,z:0},{x:0,z:0},{x:0,z:-20}]});

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
 view.showDraft(road,1);assert.equal(model.visible,false);assert.equal(draft.children.length,3);
 view.showDraft(null);assert.equal(model.visible,true);assert.equal(draft.children.length,0);
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
