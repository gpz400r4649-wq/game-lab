import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene} from '../vendor/three.module.min.js';
import {createRoadView} from '../road-model3d.js';
import {roadPoint,roadGridSites,sampleRoad,validRoads} from '../road3d.js';
import {fresh3D,validate3D} from '../engine3d.js';
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
