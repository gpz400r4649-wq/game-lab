import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh3D,part,create3D,step3D,validate3D} from '../engine3d.js';
import {nearbyActor,trade} from '../actor3d.js';
function scene(...objects){
 const p=fresh3D();p.spawn={x:0,y:0,z:0};p.objects=objects;
 const g=create3D(validate3D(p));return {p,g,tick:()=>step3D(g,p,{},.02)};
}
test('話すだけでは星を使わず、交換時だけ星と武器の個数が変わる',()=>{
 const actor=part('actor',0,-2),{p,g}=scene(actor);
 const shop=nearbyActor(g,0);assert.equal(shop.id,actor.id);
 const offer={gun:p.loadout[0].id,price:3};shop.offers=[offer];
 g.stars=2;assert.equal(trade(g,p,shop,offer),false);assert.equal(g.stars,2);
 g.stars=3;assert.ok(trade(g,p,shop,offer));assert.equal(g.stars,0);assert.equal(g.inventoryCounts[offer.gun],2);
 g.stars=3;g.inventoryCounts[offer.gun]=99;assert.equal(trade(g,p,shop,offer),false);assert.equal(g.stars,3);
});
test('ゴールに仲間がそろってからクリアする',()=>{
 const goal=part('goal',0,0);goal.settings.condition='allies';goal.settings.required=1;
 const {g,tick}=scene(goal,part('ally',8,0));tick();assert.equal(g.state,'playing');
 g.allies[0].recruited=true;tick();assert.equal(g.state,'playing');g.allies[0].x=2;tick();assert.equal(g.state,'won');
});
test('仲間用の回復を仲間が拾い、自分には使わない',()=>{
 const heal=part('heal',0,0);heal.who='ally';const {g,tick}=scene(heal,part('ally',6,0));
 g.player.hp=2;g.allies[0].recruited=true;g.allies[0].hp=1;tick();assert.equal(g.player.hp,2);
 g.allies[0].x=0;tick();assert.equal(g.allies[0].hp,2);assert.ok(g.objects[0].collected);
});
test('仲間用スイッチは仲間が離れるとドアを閉める',()=>{
 const door=part('door',8,0),plate=part('plate',0,0);plate.who='ally';plate.doorId=door.id;
 const {g,tick}=scene(door,plate,part('ally',5,0));tick();assert.ok(!g.objects[0].open);
 g.allies[0].recruited=true;g.allies[0].x=0;tick();assert.equal(g.objects[0].open,true);
 g.allies[0].x=5;tick();assert.equal(g.objects[0].open,false);
});
