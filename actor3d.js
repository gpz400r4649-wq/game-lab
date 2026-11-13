import {doorwayOccupied} from './doors3d.js?v=20261113f';
import {runActions} from './events3d.js?v=20261113f';

export function nearbyActor(g,yaw){
 let best=null,distance=4;
 for(const actor of g.actors||[]){
  const dx=actor.x-g.player.x,dz=actor.z-g.player.z,d=Math.hypot(dx,dz);
  if(d<distance&&Math.abs(actor.y-g.player.y)<2&&(d<.5||(-dx*Math.sin(yaw)-dz*Math.cos(yaw))>d*.55)){best=actor;distance=d;}
 }
 return best;
}
export function trade(g,p,actor,offer){
 if(g.state!=='playing'||!g.actors.includes(actor)||!actor.offers?.includes(offer)||Math.hypot(actor.x-g.player.x,actor.z-g.player.z)>4)return false;
 if(!p.loadout.some(t=>t.id===offer.gun)||g.stars<offer.price||(g.inventoryCounts[offer.gun]||0)>=99)return false;
 g.stars-=offer.price;
 runActions(g,p,actor,[{type:'giveTool',target:offer.gun}],message=>{g.message=message;g.messageId++;});return true;
}
export function companionsAt(goal,g){
 return (g.allies||[]).filter(a=>a.recruited&&a.hp>0&&Math.abs(a.y-goal.y)<2&&Math.hypot(a.x-goal.x,a.z-goal.z)<=4).length;
}
export function updatePlates(g){
 if(!g.plates?.length)return;
 const held=new Set();
 for(const plate of g.plates){
  const on=body=>body.hp>0&&Math.abs(body.y-plate.y)<.45&&Math.abs(body.x-plate.x)<plate.w/2+.2&&Math.abs(body.z-plate.z)<plate.d/2+.2;
  plate.pressed=(plate.who!=='ally'&&on(g.player))||(plate.who!=='player'&&g.allies.some(a=>a.recruited&&on(a)));
  if(plate.pressed)held.add(plate.doorId);
 }
 for(const door of g.plateDoors)door.open=held.has(door.id)||(door.open&&(doorwayOccupied(door,g.player)||g.allies.some(a=>doorwayOccupied(door,a))));
}
export const ACTOR_HATS={yellow:'きいろのぼうし',straw:'むぎわらぼうし',none:'ぼうしなし',cap:'キャップ',chef:'コックぼう',witch:'とんがりぼうし'};
export function validCharacterSettings(o){
 if(o.type==='actor')return (o.hat===undefined||Object.hasOwn(ACTOR_HATS,o.hat))&&(o.actorName===undefined||typeof o.actorName==='string'&&o.actorName.length<=32)&&(o.speech===undefined||typeof o.speech==='string'&&o.speech.length<=240)&&(o.offers===undefined||Array.isArray(o.offers)&&o.offers.length<=6&&o.offers.every(a=>a&&typeof a.gun==='string'&&a.gun.length<=100&&Number.isInteger(a.price)&&a.price>=1&&a.price<=99));
 if(o.type==='plate')return (o.doorId===undefined||typeof o.doorId==='string')&&(o.who===undefined||['both','player','ally'].includes(o.who));
 return o.type!=='heal'||o.who===undefined||['both','player','ally'].includes(o.who);
}
