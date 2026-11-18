import {nearestRoad,ROAD_WIDTHS} from './road3d.js?v=20261119d';

// Pierre Gasly, 2026 Mexico City GP, FIA race speed trap (km/h).
export const F1_TOP_SPEED_KMH=361.6;
export const CAR_TUNING=Object.freeze({
 maxSpeed:Object.freeze([8,12,18,120/3.6,240/3.6,F1_TOP_SPEED_KMH/3.6]),
 acceleration:Object.freeze([4,7,10]),
 steering:Object.freeze([1.6,2.4,3.2]),
 braking:Object.freeze([12,22,32])
});
export const DEFAULT_CAR_TUNING=Object.freeze(Object.fromEntries(
 Object.entries(CAR_TUNING).map(([key,levels])=>[key,levels[1]])
));
const REVERSE_SPEED=4;

export function validCarTuning(tuning){
 return !!tuning&&Object.entries(CAR_TUNING).every(([key,levels])=>levels.includes(tuning[key]));
}

function approach(value,target,step){
 return value+Math.sign(target-value)*Math.min(Math.abs(target-value),step);
}

export function orderedRaceGates(objects){
 return objects.filter(part=>part.type==='raceGate').sort((a,b)=>(a.gateOrder||1)-(b.gateOrder||1));
}

export function moveRaceGate(objects,gate,position){
 const ordered=orderedRaceGates(objects).filter(part=>part.id!==gate.id);
 const index=Math.min(ordered.length,Math.max(0,Math.round(position)-1));
 ordered.splice(index,0,gate);
 ordered.forEach((part,index)=>{part.gateOrder=index+1;});
 return index+1;
}

export function createCarRun(objects,heading=0,spawn,tuning=DEFAULT_CAR_TUNING){
 const gates=orderedRaceGates(objects);
 return {tuning:{...tuning},speed:0,actualSpeed:0,peakSpeed:0,heading,wheelAngle:0,steering:0,gates,nextGate:0,startsInFirst:!!(spawn&&gates[0]&&inGate(spawn,gates[0]))};
}

export function carMotion(car,input,grounded,dt){
 const throttle=Math.max(-1,Math.min(1,-(input.z||0)));
 const steer=Math.max(-1,Math.min(1,input.x||0));
 const {maxSpeed,acceleration,steering,braking}=car.tuning;
 const target=input.brake?0:throttle*(throttle<0?REVERSE_SPEED:maxSpeed);
 const slowing=input.brake||Math.sign(car.speed)!==Math.sign(target);
 car.speed=approach(car.speed,target,dt*(input.brake?braking:slowing?12:acceleration));
 if(grounded){
  const turnFactor=Math.min(1,Math.abs(car.speed)/2)*(1-.45*Math.min(1,Math.abs(car.speed)/maxSpeed));
  car.heading-=steer*turnFactor*steering*Math.sign(car.speed)*dt;
 }
 car.steering=approach(car.steering,steer*.42,dt*3);
 const distance=car.speed*dt;
 car.wheelAngle-=distance/.36;
 return {x:-Math.sin(car.heading)*distance,z:-Math.cos(car.heading)*distance};
}

const GATE_DEPTH=.6;
export const raceGateWidth=gate=>gate.gateWidth??(gate.rotation===90?gate.d:gate.w);
export const raceGateHeading=gate=>gate.gateYaw??(gate.rotation||0)*Math.PI/180;

function orientWideGate(gate,width,heading){
 const cosine=Math.abs(Math.cos(heading)),sine=Math.abs(Math.sin(heading));
 return Object.assign(gate,{gateWidth:width,gateYaw:heading,rotation:0,w:width*cosine+GATE_DEPTH*sine,d:width*sine+GATE_DEPTH*cosine});
}
export function validGateFit(gate){
 if(gate.gateRoadId!==undefined&&(typeof gate.gateRoadId!=='string'||!gate.gateRoadId||gate.gateRoadId.length>80||gate.gateWidth===undefined))return false;
 if(gate.gateWidth===undefined&&gate.gateYaw===undefined)return true;
 if(!ROAD_WIDTHS.includes(gate.gateWidth)||!Number.isFinite(gate.gateYaw)||Math.abs(gate.gateYaw)>Math.PI)return false;
 const expected=orientWideGate({},gate.gateWidth,gate.gateYaw);
 return Math.abs(gate.w-expected.w)<.001&&Math.abs(gate.d-expected.d)<.001;
}
export function fitRaceGate(gate,roads,point){
 if(gate.type!=='raceGate')return gate;
 const fit=Math.abs(point.y??gate.y)<=.35&&nearestRoad(roads,point);
 if(!fit){delete gate.gateRoadId;return gate;}
 Object.assign(gate,{x:fit.x,y:0,z:fit.z,gateRoadId:fit.roadId});
 return orientWideGate(gate,fit.width,fit.heading);
}
export function updateRoadGateWidths(objects,previousRoads,nextRoads){
 const next=new Map(nextRoads.map(road=>[road.id,road]));
 return objects.map(gate=>{
  if(gate.type!=='raceGate'||gate.gateWidth===undefined||Math.abs(gate.y)>.35)return gate;
  const linked=gate.gateRoadId&&previousRoads.find(road=>road.id===gate.gateRoadId);
  // Older gates did not store a road ID. A fitted gate at an old centreline
  // with the old road width still identifies which road it was placed on.
  const nearby=linked?nearestRoad([linked],gate):null;
  const legacy=!nearby&&nearestRoad(previousRoads.filter(road=>road.width===gate.gateWidth),gate);
  const roadId=nearby?.roadId||(legacy&&legacy.gap<.05?legacy.roadId:null);
  if(!roadId)return gate;
  const road=next.get(roadId);
  if(!road){const detached={...gate};delete detached.gateRoadId;return detached;}
  if(road.width===gate.gateWidth)return gate;
  return orientWideGate({...gate,gateRoadId:road.id},road.width,gate.gateYaw);
 });
}
export function turnRaceGate(gate){
 if(gate.gateYaw!==undefined){
  const angle=gate.gateYaw+Math.PI/2;
  return orientWideGate(gate,gate.gateWidth,angle>Math.PI?angle-Math.PI*2:angle);
 }
 gate.rotation=gate.rotation===90?0:90;[gate.w,gate.d]=[gate.d,gate.w];return gate;
}
function inGate(player,gate){
 const angle=raceGateHeading(gate),dx=player.x-gate.x,dz=player.z-gate.z;
 const x=dx*Math.cos(angle)-dz*Math.sin(angle),z=dx*Math.sin(angle)+dz*Math.cos(angle);
 return Math.abs(x)<raceGateWidth(gate)/2&&Math.abs(z)<GATE_DEPTH/2+.4&&player.y>=gate.y-.15&&player.y<gate.y+gate.h-.8;
}

export function updateRaceGates(game,before,notify){
 const car=game.car;
 if(!car.gates.length||car.nextGate>=car.gates.length)return;
 const gate=car.gates[car.nextGate];
 const wasIn=inGate(before,gate),isIn=inGate(game.player,gate);
 if(isIn&&!wasIn||!isIn&&wasIn&&car.nextGate===0&&car.startsInFirst){
  car.nextGate++;
  if(car.nextGate===car.gates.length)game.state='won';
  else notify(`ゲート ${car.nextGate} をとおったよ！`);
 }
}
