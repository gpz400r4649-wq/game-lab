import test from 'node:test';
import assert from 'node:assert/strict';
import {part,fresh3D,create3D,step3D,validate3D} from '../engine3d.js';
import {topAt} from '../building3d.js';
import {fallDamageForDistance,FALL_DEFAULTS} from '../fall-damage3d.js';
function stage(fall={enabled:true,minBlocks:3,damage:1}){const p=fresh3D();p.playerRules={hp:100,speed:5,jumpHeight:49/38,fallDamage:{...fall}};return p;}
function drop(p,height){const g=create3D(p);g.player.y=height;g.player.grounded=false;for(let i=0;i<500&&!g.player.grounded&&g.state==='playing';i++)step3D(g,p,{},.02);return g;}
test('未設定の作品では初めから落下ダメージがあり、作品データを書き換えない',()=>{for(const p of [fresh3D(),stage()]){if(p.playerRules)delete p.playerRules.fallDamage;const before=JSON.stringify(p),g=drop(p,9);assert.equal(g.player.hp,g.player.maxHp-1);assert.equal(g.state,'playing');assert.equal(JSON.stringify(p),before);}assert.equal(FALL_DEFAULTS.enabled,true);assert.equal(fallDamageForDistance(9),1);});
test('自分でなしを保存した作品は、読み直しても落下ダメージなしを保つ',()=>{const p=validate3D(JSON.parse(JSON.stringify(stage({...FALL_DEFAULTS,enabled:false})))),before=JSON.stringify(p),g=drop(p,60);assert.equal(g.player.hp,g.player.maxHp);assert.equal(g.state,'playing');assert.equal(JSON.stringify(p),before);});
test('未設定でもジャンプ台への着地は落下ダメージを受けない',()=>{const p=fresh3D();p.objects=[part('bounce',0,0)];p.spawn.z=0;const g=drop(p,30);assert.equal(g.player.hp,g.player.maxHp);assert.equal(g.state,'playing');});
test('高さの境界を正確に判定し、高さと設定値に応じたダメージを着地時に１回だけ与える',()=>{
 for(const [height,damage]of [[8.99,0],[9,1],[11.99,1],[12,2],[18,4]]){const p=stage(),before=JSON.stringify(p),g=drop(p,height);assert.equal(g.player.hp,100-damage);for(let i=0;i<100;i++)step3D(g,p,{},.02);assert.equal(g.player.hp,100-damage);assert.equal(JSON.stringify(p),before);}
 const p=stage({enabled:true,minBlocks:2,damage:2}),g=drop(p,9);assert.equal(g.player.hp,96);assert.equal(fallDamageForDistance(1000,{enabled:true,minBlocks:1,damage:10}),100);
});
test('地面ではなく途中の足場までの高さで数える',()=>{
 const p=stage(),platform=part('platform',0,0);platform.y=6;platform.h=.25;p.objects=[platform];p.spawn.z=0;const g=drop(p,18);assert.equal(g.player.y,6.25);assert.equal(g.player.hp,99);
});
test('普通のジャンプとスロープの下りでは落下ダメージが出ない',()=>{
 const p=stage({enabled:true,minBlocks:1,damage:1}),g=create3D(p);step3D(g,p,{jump:true},.02);for(let i=0;i<100;i++)step3D(g,p,{},.02);assert.equal(g.player.hp,100);
 const ramp=part('ramp',0,0);ramp.h=6;p.objects=[ramp];const walk=create3D(p);Object.assign(walk.player,{x:0,z:-1.9,y:topAt(ramp,0,-1.9),grounded:true,supportId:ramp.id});for(let i=0;i<70;i++)step3D(walk,p,{z:1},.02);assert.equal(walk.player.hp,100);assert.equal(walk.player.y,0);
});
test('上下に動く足場に乗っている間は落ちた扱いにしない',()=>{
 const p=stage({enabled:true,minBlocks:1,damage:1}),moving=part('moving',0,0);moving.y=3;moving.settings={...moving.settings,axis:'y',distance:3,speed:2};p.objects=[moving];const g=create3D(p);Object.assign(g.player,{x:0,z:0,y:3.5,grounded:true,supportId:moving.id});for(let i=0;i<500;i++)step3D(g,p,{},.02);assert.equal(g.player.hp,100);
});
test('ジャンプ台への着地はダメージなしで、その後も前の落下の高さを持ち越さない',()=>{
 const p=stage({enabled:true,minBlocks:1,damage:5});p.objects=[part('bounce',0,0)];p.spawn.z=0;const g=create3D(p);g.player.y=30;g.player.grounded=false;for(let i=0;i<500;i++)step3D(g,p,{},.02);assert.equal(g.player.hp,100);assert.equal(g.state,'playing');
});
test('致命的な落下で失敗し、セーブポイントがあれば復活後にダメージを繰り返さない',()=>{
 const p=stage({enabled:true,minBlocks:1,damage:10});p.playerRules.hp=5;assert.equal(drop(p,12).state,'lost');const base=part('box',0,0);p.objects=[base];p.spawn.z=0;const g=create3D(p);g.player.y=18;g.player.grounded=false;g.checkpoint={x:0,y:3,z:0};for(let i=0;i<300;i++)step3D(g,p,{},.02);assert.equal(g.state,'playing');assert.equal(g.player.hp,5);assert.equal(g.player.y,3);assert.equal(g.player.fallPeakY,3);
});
test('落下の設定を保存でき、不正な値を読み込まない',()=>{
 const p=stage();assert.deepEqual(validate3D(JSON.parse(JSON.stringify(p))).playerRules.fallDamage,p.playerRules.fallDamage);
 for(const patch of [{enabled:'yes'},{minBlocks:0},{minBlocks:21},{minBlocks:1.5},{damage:0},{damage:11},{damage:1.2}]){const bad=stage({...FALL_DEFAULTS,...patch});assert.throws(()=>validate3D(bad));}
 const old=stage();delete old.playerRules.fallDamage;assert.ok(validate3D(old));
});

test('ジャンプ台の外に着地した場合は、近くに台があっても通常の落下ダメージになる',()=>{
 const p=stage({enabled:true,minBlocks:1,damage:1});p.objects=[part('bounce',0,0)];p.spawn.x=1.4;p.spawn.z=0;const g=drop(p,12);assert.equal(g.player.hp,96);assert.equal(g.player.grounded,true);
});
