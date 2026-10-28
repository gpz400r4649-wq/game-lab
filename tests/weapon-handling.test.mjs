import test from 'node:test';
import assert from 'node:assert/strict';
import {cadenceHandling,safeShot,LIMITS} from '../weapons3d.js';
import {fresh3D,create3D,step3D,validate3D,WEAPON_PRESETS} from '../engine3d.js';
import {makeTool,constructionPart} from '../building3d.js';
import {shootVolley,updateCombat} from '../combat3d.js';
const origin={x:0,y:10,z:0},forward={x:0,y:0,z:1};
test('連射のレベルを上げるほど反動とブレの初期値も大きくなる',()=>{
  assert.deepEqual(cadenceHandling(.8),{recoil:.2,aimJitter:.3});assert.deepEqual(cadenceHandling(.25),{recoil:1,aimJitter:1});assert.deepEqual(cadenceHandling(.08),{recoil:4,aimJitter:5});
  let previous={recoil:-1,aimJitter:-1};for(const interval of [2,.8,.6,.4,.25,.2,.15,.08]){const next=cadenceHandling(interval);assert.ok(next.recoil>=previous.recoil);assert.ok(next.aimJitter>=previous.aimJitter);previous=next;}
});
test('弾の速さに関係なく設定した距離で消える',()=>{
  for(const speed of [5,24,60]){const p=fresh3D(),g=create3D(p);shootVolley(g,origin,forward,{...makeTool(),speed,range:20});const bullet=g.bullets[0];for(let i=0;i<1000&&g.bullets.length;i++){g.time+=.01;updateCombat(g,.01);}assert.equal(g.bullets.length,0);assert.ok(Math.abs(bullet.z-20)<.00001);assert.ok(bullet.remaining<.00001);}
});
test('跳ね返った後も残りの射程を使い、元の射程に戻らない',()=>{
  const p=fresh3D();p.objects=[constructionPart('wall',0,2),constructionPart('wall',0,-2)];p.objects.forEach(o=>o.destructible=false);const g=create3D(p);
  shootVolley(g,{x:0,y:1,z:0},forward,{...makeTool(),range:6,impacts:['bounce']});const b=g.bullets[0];let before=b.remaining;
  for(let i=0;i<200&&g.bullets.length;i++){g.time+=.01;updateCombat(g,.01);assert.ok(b.remaining<=before+.00001);before=b.remaining;}
  assert.equal(g.bullets.length,0);assert.equal(b.bounces,0);assert.ok(b.remaining<.00001);
});
test('横に広がる弾は同じ高さ、丸く広がる弾は上下にも広がる',()=>{
  for(const pattern of ['fan','cone']){const g=create3D(fresh3D());shootVolley(g,origin,forward,{...makeTool(),spread:8,spreadAngle:40,pattern});assert.ok(g.bullets.every(b=>Math.abs(Math.hypot(b.vx,b.vy,b.vz)-24)<.000001));if(pattern==='fan')assert.ok(g.bullets.every(b=>b.vy===0));else assert.ok(g.bullets.some(b=>Math.abs(b.vy)>1));}
});
test('ブレなしでは正面に飛び、ブレありでも指定角度の範囲から出ない',()=>{
  const g=create3D(fresh3D());shootVolley(g,origin,forward,{...makeTool(),aimJitter:0});assert.equal(g.bullets[0].vx,0);assert.equal(g.bullets[0].vy,0);
  for(let i=0;i<20;i++){const next=create3D(fresh3D());let calls=0;shootVolley(next,origin,forward,{...makeTool(),aimJitter:5},false,()=>calls++%2===0?.9:i/20);const b=next.bullets[0],angle=Math.acos(b.vz/Math.hypot(b.vx,b.vy,b.vz))*180/Math.PI;assert.ok(angle>0&&angle<=5);}
});
test('反動は実際に発射したときに発生し、上限があり、撃ちやめると戻る',()=>{
  const p=fresh3D();Object.assign(p.loadout[0],{interval:.08,recoil:6,aimJitter:0});const before=JSON.stringify(p),g=create3D(p);
  for(let i=0;i<100;i++){step3D(g,p,{fire:true},.02);assert.ok(g.recoilPitch<=12*Math.PI/180+.00001);}assert.ok(g.recoilPitch>.05);
  for(let i=0;i<100;i++)step3D(g,p,{},.02);assert.equal(g.recoilPitch,0);assert.equal(JSON.stringify(p),before);
});
test('弾が満杯のときや建築銃では反動が起きない',()=>{
  const p=fresh3D();p.loadout[0].recoil=6;const g=create3D(p);for(let i=0;i<12;i++)shootVolley(g,origin,forward,{...makeTool(),spread:8});assert.equal(g.bullets.length,LIMITS.bullets);step3D(g,p,{fire:true},.01);assert.equal(g.recoilPitch,0);
  const builder=fresh3D();builder.loadout=[{...makeTool('wall'),recoil:6}];const next=create3D(builder);step3D(next,builder,{fire:true,buildPoint:{x:0,y:0,z:0}},.02);assert.equal(next.recoilPitch,0);
});
test('子どもが下げた反動とブレをプレイ中に勝手に元へ戻さない',()=>{
  const p=fresh3D();Object.assign(p.loadout[0],WEAPON_PRESETS.rapid,{recoil:0,aimJitter:0});const before=JSON.stringify(p),g=create3D(p);for(let i=0;i<100;i++)step3D(g,p,{fire:true},.02);assert.equal(g.recoilPitch,0);assert.equal(JSON.stringify(p),before);
});
test('古い作品の反動とブレはゼロで引き継ぎ、新しい項目も保存読込できる',()=>{
  const p=fresh3D();for(const k of ['range','recoil','aimJitter','pattern'])delete p.loadout[0][k];const next=validate3D(p);assert.equal(next.loadout[0].recoil,0);assert.equal(next.loadout[0].aimJitter,0);assert.equal(next.loadout[0].range,60);
  Object.assign(next.loadout[0],{range:15,recoil:2,aimJitter:3,pattern:'cone'});assert.deepEqual(validate3D(JSON.parse(JSON.stringify(next))),next);
  for(const [key,value] of [['range',61],['range',1],['recoil',7],['recoil',-1],['aimJitter',13],['aimJitter',NaN],['pattern','bad']]){const invalid=structuredClone(next);invalid.loadout[0][key]=value;assert.throws(()=>validate3D(invalid));}
  const safe=safeShot({range:Infinity,recoil:999,aimJitter:999});assert.ok(safe.range<=60&&safe.recoil<=6&&safe.jitter<=12);
});
