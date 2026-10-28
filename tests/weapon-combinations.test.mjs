import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh3D,create3D,validate3D,WEAPON_PRESETS,part} from '../engine3d.js';
import {makeTool,constructionPart} from '../building3d.js';
import {impactEffects,weaponPresetKey,LIMITS} from '../weapons3d.js';
import {shootVolley,updateCombat} from '../combat3d.js';
function advanceUntil(g,until){for(let i=0;i<150&&!until();i++){g.time+=.01;updateCombat(g,.01);}assert.ok(until());}
test('各簡単設定を選ぶとその設定を識別し、数値を変えると自分の設定になる',()=>{
  for(const [key,preset] of Object.entries(WEAPON_PRESETS)){
    const {name,...stats}=preset,tool={...makeTool(),...stats};assert.equal(weaponPresetKey(tool,WEAPON_PRESETS),key);
    tool.damage+=1;assert.equal(weaponPresetKey(tool,WEAPON_PRESETS),'custom');
    tool.damage-=1;tool.impacts=['explode','bounce'];assert.equal(weaponPresetKey(tool,WEAPON_PRESETS),'custom');
  }
});
test('爆発しながら２回跳ね返り、その次の衝突で弾が消える',()=>{
  const p=fresh3D(),a=constructionPart('wall',0,0),b=constructionPart('wall',0,4),enemy=part('enemy',2,0);a.hp=b.hp=200;enemy.hp=20;p.objects=[a,b,enemy];
  const original=JSON.stringify(p),g=create3D(p),tool={...makeTool(),impacts:['damage','explode','bounce'],damage:3,blastRadius:3};
  shootVolley(g,{x:0,y:1,z:2},{x:0,y:0,z:-1},tool);
  advanceUntil(g,()=>g.bullets[0]?.bounces===1);assert.ok(g.bullets[0].vz>0);assert.equal(g.objects[0].hp,197);assert.equal(g.objects[2].hp,17);assert.equal(g.effects.filter(e=>e.kind==='blast').length,1);
  advanceUntil(g,()=>g.bullets[0]?.bounces===0);assert.ok(g.bullets[0].vz<0);assert.equal(g.objects[1].hp,197);
  advanceUntil(g,()=>g.bullets.length===0);assert.equal(g.objects[0].hp,194);assert.equal(JSON.stringify(p),original);
});
test('効果の組合せを保存読込でき、旧形式の跳ね返りはダメージも引き継ぐ',()=>{
  const p=fresh3D();p.loadout[0].impacts=['explode','bounce'];assert.deepEqual(validate3D(JSON.parse(JSON.stringify(p))).loadout[0].impacts,['explode','bounce']);
  assert.deepEqual(impactEffects({impact:'bounce'}),['damage','bounce']);assert.deepEqual(impactEffects({impact:'explode'}),['explode']);
  for(const impacts of [null,'bounce',['bad'],['bounce','bounce'],['damage','explode','bounce','damage']]){const bad=structuredClone(p);bad.loadout[0].impacts=impacts;assert.throws(()=>validate3D(bad));}
});
test('明示的に跳ね返りだけを選ぶと、ブロックを傷つけず反射する',()=>{
  const p=fresh3D();p.objects=[constructionPart('wall',0,0)];const g=create3D(p);shootVolley(g,{x:0,y:1,z:2},{x:0,y:0,z:-1},{...makeTool(),impacts:['bounce'],damage:30});advanceUntil(g,()=>g.bullets[0]?.bounces===1);assert.equal(g.objects[0].hp,20);
});
test('発射後に銃のチェックを変えても飛んでいる弾の効果は変わらない',()=>{
  const p=fresh3D();p.objects=[constructionPart('wall',0,0)];const g=create3D(p),tool={...makeTool(),impacts:['explode','bounce']};
  shootVolley(g,{x:0,y:1,z:2},{x:0,y:0,z:-1},tool);tool.impacts.length=0;advanceUntil(g,()=>g.bullets[0]?.bounces===1);assert.ok(g.effects.some(e=>e.kind==='blast'));
});
test('組み合わせた最大設定でも弾・演出・反射回数を制限する',()=>{
  const p=fresh3D();p.objects=[constructionPart('wall',0,0),constructionPart('wall',0,4)];p.objects.forEach(o=>o.destructible=false);const g=create3D(p),tool={...makeTool(),impacts:['damage','bounce','explode'],spread:8,size:1.2,speed:60,damage:30,blastRadius:6};
  for(let i=0;i<500;i++){if(i%4===0)shootVolley(g,{x:0,y:1,z:2},{x:0,y:0,z:-1},tool);g.time+=.02;updateCombat(g,.02);assert.ok(g.bullets.length<=LIMITS.bullets);assert.ok(g.effects.length<=LIMITS.effects);assert.ok(g.bullets.every(b=>b.bounces>=0&&b.bounces<=2));}
  for(let i=0;i<200;i++){g.time+=.02;updateCombat(g,.02);}assert.equal(g.bullets.length,0);assert.equal(g.effects.length,0);
});
