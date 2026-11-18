import {validPatrolRoute} from './patrol-route3d.js?v=20261118f';
import {coordinateLimit} from './world3d.js?v=20261118f';
import {MAX_BUILD_Y} from './limits3d.js?v=20261118f';
import {topAt} from './building3d.js?v=20261118f';
import {dropPickup,LOOT_LIMIT} from './loot3d.js?v=20261118f';

export const SUPPLY_REWARDS={heal:'かいふく',star:'ほし',weapon:'ランダムなじゅう'};
export const SUPPLY_ALTITUDE=MAX_BUILD_Y+12;
const flightSpeed=14, descentSpeed=7;

export function validSupplyFlight(flight,world){
 return flight===undefined||!!flight&&typeof flight.enabled==='boolean'&&
  Number.isInteger(flight.startTime)&&flight.startTime>=0&&flight.startTime<=600&&
  Object.hasOwn(SUPPLY_REWARDS,flight.reward)&&Array.isArray(flight.route)&&validPatrolRoute(flight.route,coordinateLimit(world));
}

export function defaultSupplyFlight(world){
 const edge=coordinateLimit(world);
 return {enabled:true,startTime:10,reward:'heal',route:[{x:-edge,z:0},{x:edge,z:0}]};
}

export function createSupplyFlight(project){
 if(!project.supplyFlight?.enabled)return null;
 const settings=structuredClone(project.supplyFlight),[start,end]=settings.route;
 return {settings,plane:null,crate:null,announced:false,dropped:false,duration:Math.hypot(end.x-start.x,end.z-start.z)/flightSpeed};
}

export function updateSupplyFlight(game,dt,surfacesAt){
 const state=game.supply;if(!state)return;
 const {settings,duration}=state;
 const elapsed=game.time-settings.startTime;
 if(elapsed<0)return;
 if(!state.announced){
  state.announced=true;
  game.message='きいろいひこうきがきたよ！ そらをみてみよう';
  game.messageId++;
 }
 const [start,end]=settings.route;
 const at=t=>({x:start.x+(end.x-start.x)*t,z:start.z+(end.z-start.z)*t});
 state.plane=elapsed<duration?{...at(elapsed/duration),y:SUPPLY_ALTITUDE,yaw:Math.atan2(start.x-end.x,start.z-end.z)}:null;
 if(!state.dropped&&elapsed>=duration/2){
  state.dropped=true;
  state.crate={...at(.5),y:SUPPLY_ALTITUDE-1,landingY:0,landed:false};
  game.message=duration/2<3?'きいろいひこうきが、アイテムのはこをおとしたよ！':'アイテムのはこをおとしたよ！';
  game.messageId++;
 }
 const crate=state.crate;if(!crate)return;
 if(!crate.landed){
  crate.landingY=0;
  for(const surface of surfacesAt(crate.x,crate.z)){
   if(Math.abs(crate.x-surface.x)>surface.w/2||Math.abs(crate.z-surface.z)>surface.d/2)continue;
   const top=topAt(surface,crate.x,crate.z);
   if(top<=crate.y+.02)crate.landingY=Math.max(crate.landingY,top);
  }
  crate.y=Math.max(crate.landingY,crate.y-descentSpeed*dt);
  crate.landed=crate.y===crate.landingY;
 }
 const player=game.player;
 if(crate.landed&&Math.hypot(crate.x-player.x,crate.z-player.z)<1.8&&Math.abs(crate.y-player.y)<1.5){
  if(game.drops.length>=LOOT_LIMIT&&game.drops.filter(drop=>!drop.collected).length>=LOOT_LIMIT)return;
  const item=dropPickup(game,settings.reward,{...crate,h:1},settings.reward==='weapon'?{weaponId:'@random'}:{});
  if(item){state.crate=null;game.message='アイテムのはこがひらいたよ！';game.messageId++;}
 }
}
