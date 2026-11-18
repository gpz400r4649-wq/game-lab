import test from 'node:test';
import assert from 'node:assert/strict';
import {create3D,fresh3D,part,solids,step3D,validate3D} from '../engine3d.js';
import {configureDoor} from '../doors3d.js';
import {configureBuildingPart} from '../architecture3d.js';
import {assemblyCandidate,assemblyCopies,saveAssembly,temporarySpawn} from '../assembly3d.js';
import {defaultSupplyFlight} from '../supply3d.js';

test('窓とハーフ壁の組み合わせを保存・読み込みし、回転しても接する辺と内部の参照がそろう',()=>{
 const project=fresh3D(),half=configureBuildingPart(part('wall',-1,2),'halfVertical');
 const window=configureDoor(part('door',2,2),'windowSwing');
 window.events=[{type:'openDoor',target:window.id}];
 const asset=saveAssembly(project,[half,window],'窓のある壁');
 const loaded=validate3D(JSON.parse(JSON.stringify(project)));
 const {parts,reason}=assemblyCandidate(loaded,loaded.assemblies[0],{x:8,y:0,z:8},1);
 assert.equal(reason,'');
 assert.equal(parts[0].x,parts[1].x);
 assert.equal(parts[0].z-parts[0].d/2,parts[1].z+parts[1].d/2);
 const copies=assemblyCopies(parts);
 assert.notEqual(copies[1].id,asset.parts[1].id);
 assert.equal(copies[1].events[0].target,copies[1].id);
 loaded.objects=copies;assert.ok(validate3D(loaded));
 assert.ok(assemblyCandidate(loaded,asset,{x:8,y:0,z:8},1).reason);
});

test('ここから試すは床の高さで始まり、作品のスタートを変えない',()=>{
 const p=fresh3D(),floor=part('floor',8,0);floor.y=3;p.objects=[floor];
 const start=temporarySpawn({x:8,y:3.25,z:0},solids(p.objects),p);
 assert.deepEqual(start,{x:8,y:3.25,z:0});
 const game=create3D(p,{testSpawn:start});step3D(game,p,{},.02);
 assert.equal(game.player.y,3.25);assert.equal(game.player.x,8);
 assert.equal(temporarySpawn({x:8,y:1,z:0},solids(p.objects),p),null);
 assert.equal(create3D(p).player.z,8);
});

test('補給便は指定時刻に飛び、箱が屋根に着地してから近づくと中身を出す',()=>{
 const p=fresh3D(),roof=part('floor',0,0);roof.y=6;
 p.objects=[roof];p.supplyFlight={...defaultSupplyFlight(p),startTime:1,reward:'weapon',route:[{x:-14,z:0},{x:14,z:0}]};
 const g=create3D(validate3D(p));
 const tick=(count)=>{for(let i=0;i<count;i++)step3D(g,p,{},.025);};
 tick(30);assert.equal(g.supply.plane,null);tick(20);assert.ok(g.supply.plane);assert.equal(g.supply.crate,null);
 tick(20);assert.equal(g.supply.crate,null);assert.ok(g.supply.plane.x<0);
 tick(12);assert.equal(g.supply.crate.x,0);assert.equal(g.supply.crate.landed,false);assert.equal(g.drops.length,0);
 tick(400);assert.equal(g.supply.crate.landed,true);assert.equal(g.supply.crate.y,6.25);assert.equal(g.drops.length,0);
 Object.assign(g.player,{x:1.5,y:6.25,z:0,vy:0});tick(1);
 assert.equal(g.supply.crate,null);assert.equal(g.drops[0].weaponId,'@random');tick(1);assert.equal(g.drops.length,1);
 assert.equal(create3D({...p,supplyFlight:{...p.supplyFlight,enabled:false}}).supply,null);
 assert.throws(()=>validate3D({...p,supplyFlight:{...p.supplyFlight,startTime:-1}}));
});
