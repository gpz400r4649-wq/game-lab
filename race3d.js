import {courseStart,lapRoadMarkers,nearestRoad,ROAD_WIDTHS} from './road3d.js?v=20261125d';

export const F1_TOP_SPEED_KMH=360;
export const CAR_WHEELBASE=1.64;
export const CAR_TUNING=Object.freeze({
 maxSpeed:Object.freeze([30,45,65,120,240,F1_TOP_SPEED_KMH].map(kmh=>kmh/3.6)),
 acceleration:Object.freeze([4,7,10]),
 steering:Object.freeze([1.6,5,6]),
 braking:Object.freeze([12,22,32]),
 mass:Object.freeze([.75,1,1.35]),
 grip:Object.freeze([.72,1,1.24])
});
export const DEFAULT_CAR_TUNING=Object.freeze(Object.fromEntries(
 Object.entries(CAR_TUNING).map(([key,levels])=>[key,levels[1]])
));
export const RACE_LAP_OPTIONS=Object.freeze([0,1,2,3,5]);
const REVERSE_SPEED=4;
const STEERING_LIMIT=.42;
const CORNERING_ACCELERATION=12.5;
const OLD_CAR_TOP_SPEEDS=new Map([[8,30/3.6],[12,45/3.6],[18,65/3.6],[361.6/3.6,F1_TOP_SPEED_KMH/3.6]]);
const OLD_CAR_STEERING_DEFAULTS=[2.4,3.2,4];

export function trafficSignalPhase(rotation,time){
 const phase=(time+(rotation%180===90?11:0))%22;
 return phase<8?2:phase<10?1:0;
}

export function upgradeCarTuning(tuning){
 return {...tuning,
  maxSpeed:OLD_CAR_TOP_SPEEDS.get(tuning.maxSpeed)??tuning.maxSpeed,
  steering:OLD_CAR_STEERING_DEFAULTS.includes(tuning.steering)?DEFAULT_CAR_TUNING.steering:tuning.steering};
}

export function validCarTuning(tuning){
 if(!tuning)return false;
 const settings={mass:DEFAULT_CAR_TUNING.mass,grip:DEFAULT_CAR_TUNING.grip,...tuning};
 return Object.entries(CAR_TUNING).every(([key,levels])=>levels.includes(settings[key]));
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

export function createCarRun(objects,heading=0,spawn,tuning=DEFAULT_CAR_TUNING,lapCount=0,roads=[]){
 const gates=orderedRaceGates(objects);
 let autoStart=null;
 if(lapCount&&!gates.length&&roads.length){
  const road=roads[0],start=courseStart({template:'car',roads});
  autoStart=orientWideGate({x:start.x,y:start.y,z:start.z,h:3,gateRoadId:road.id},road.width,start.heading);
  gates.push(autoStart);
 }
 const first=gates[0],road=lapCount&&gates.length===1&&roads.find(item=>item.closed&&item.id===first.gateRoadId);
 const markers=road?lapRoadMarkers(road,first,raceGateHeading(first)).map(point=>
  ({x:point.x,y:point.y||0,z:point.z,h:first.h,gateWidth:road.width,gateYaw:point.heading})):[];
 return {tuning:{...DEFAULT_CAR_TUNING,...tuning},speed:0,actualSpeed:0,peakSpeed:0,heading,wheelAngle:0,steering:0,brakePressure:0,gates,nextGate:0,startsInFirst:!!(spawn&&gates[0]&&inGate(spawn,gates[0])),
  laps:lapCount?{count:lapCount,completed:0,startedAt:null,lapStartedAt:null,finishedAt:null,best:null,last:null,autoStart,markers,nextMarker:0,direction:0}:null};
}

export function carMotion(car,input,grounded,dt,roadSurface=null){
 const throttle=Math.max(-1,Math.min(1,-(input.z||0)));
 const pedal=Math.abs(throttle),brake=Math.max(0,Math.min(1,Number(input.brake)||0));
 const steer=Math.max(-1,Math.min(1,input.x||0));
 const {maxSpeed,acceleration,steering,braking,mass,grip}=car.tuning;
 car.steering=approach(car.steering,steer*STEERING_LIMIT,dt*(steer?2.1:2.7));
 const wheel=car.steering/STEERING_LIMIT;
 const turning=grounded?wheel**2:0;
 const target=brake?0:throttle*(throttle<0?REVERSE_SPEED:maxSpeed)*(1-.36*turning/grip);
 const speed=Math.abs(car.speed);
 car.brakePressure=brake?approach(car.brakePressure,brake,dt/.28):0;
 const incline=grounded&&roadSurface?
  -(roadSurface.slopeX*Math.sin(car.heading)+roadSurface.slopeZ*Math.cos(car.heading)):0;
 const grade=incline*Math.sign(throttle||car.speed);
 const gravity=-8*incline/Math.hypot(1,incline);
 const approachFactor=.45+.55*Math.min(1,Math.abs(target-car.speed)/4);
 let rate=Math.max(.35,acceleration/mass*(.2+.8*pedal)-6*grade)*approachFactor;
 if(brake){
  const highSpeed=Math.max(0,Math.min(1,(speed-18)/65));
  const pressure=speed<.05?brake:.33*brake+.67*car.brakePressure;
  rate=braking*(.52+.48*highSpeed)*pressure;
  car.speed=approach(car.speed+gravity*dt,0,dt*rate);
 }else if(!throttle&&(input.coast||gravity)){
  const resistance=Math.min(2+3*turning,.1+speed*.45)+Math.max(0,speed-maxSpeed)*2;
  car.speed=approach(car.speed+gravity*dt,0,dt*resistance);
 }else{
  if(car.speed!==0&&Math.sign(car.speed)!==Math.sign(target))rate=12;
  else if(speed>Math.abs(target))rate=Math.max(.35,2+(2+speed*.05)*turning+6*grade);
  car.speed=approach(car.speed,target,dt*rate);
 }
 if(grounded&&car.speed!==0){
  const movingSpeed=Math.abs(car.speed);
  const turnFactor=Math.min(1,movingSpeed/2)*(1-.45*Math.min(1,movingSpeed/maxSpeed));
  const requested=turnFactor*steering;
  const gripYawRate=Math.abs(wheel)*requested/Math.hypot(1,requested*movingSpeed/(CORNERING_ACCELERATION*grip));
  const rollingYawRate=movingSpeed*Math.abs(Math.tan(car.steering))/CAR_WHEELBASE;
  car.heading-=Math.sign(wheel*car.speed)*Math.min(gripYawRate,rollingYawRate)*dt;
 }
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
 const fit=nearestRoad(roads,{...point,y:point.y??gate.y},1.25);
 if(!fit){delete gate.gateRoadId;return gate;}
 Object.assign(gate,{x:fit.x,y:fit.y,z:fit.z,gateRoadId:fit.roadId});
 return orientWideGate(gate,fit.width,fit.heading);
}
export function updateRoadGateWidths(objects,previousRoads,nextRoads){
 const next=new Map(nextRoads.map(road=>[road.id,road]));
 return objects.map(gate=>{
  if(gate.type!=='raceGate'||gate.gateWidth===undefined)return gate;
  const linked=gate.gateRoadId&&previousRoads.find(road=>road.id===gate.gateRoadId);
  // Older gates did not store a road ID. A fitted gate at an old centreline
  // with the old road width still identifies which road it was placed on.
  const nearby=linked?nearestRoad([linked],gate,1.25):null;
  const legacy=!nearby&&nearestRoad(previousRoads.filter(road=>road.width===gate.gateWidth),gate,1.25);
  const roadId=nearby?.roadId||(legacy&&legacy.gap<.05?legacy.roadId:null);
  if(!roadId)return gate;
  const road=next.get(roadId);
  if(!road){const detached={...gate};delete detached.gateRoadId;return detached;}
  const fit=nearestRoad([road],gate)??nearestRoad([road],{x:gate.x,z:gate.z});
  const y=fit?.y??gate.y;
  if(road.width===gate.gateWidth&&Math.abs(y-gate.y)<.0001)return gate;
  return orientWideGate({...gate,y,gateRoadId:road.id},road.width,gate.gateYaw);
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
 const height=player.y-gate.y;
 return Math.abs(x)<raceGateWidth(gate)/2&&Math.abs(z)<GATE_DEPTH/2+.4&&
  (gate.gateYaw!==undefined?Math.abs(height)<.7:height>=-.15&&height<gate.h-.8);
}

function crossedLapGate(before,after,gate,launch=false,direction=0){
 const angle=raceGateHeading(gate),sin=Math.sin(angle),cos=Math.cos(angle);
 const depth=point=>(point.x-gate.x)*sin+(point.z-gate.z)*cos;
 const a=depth(before),b=depth(after),sign=Math.sign(b-a);
 if(!sign||(gate.gateYaw!==undefined?sign!==-1:direction&&sign!==direction))return 0;
 const t=a/(a-b);
 if(t>=0&&t<1)return inGate({
  x:before.x+(after.x-before.x)*t,y:before.y+(after.y-before.y)*t,z:before.z+(after.z-before.z)*t
 },gate)?sign:0;
 return launch&&inGate(before,gate)&&Math.abs(b)>=GATE_DEPTH/2+.4?sign:0;
}

function updateLaps(game,before,notify,time){
 const {car}=game,laps=car.laps;
 if(!car.gates.length)return;
 const marker=laps.markers[laps.nextMarker];
 if(laps.startedAt!==null&&marker){
  if(crossedLapGate(before,game.player,marker))laps.nextMarker++;
  return;
 }
 const gate=car.gates[car.nextGate];
 const launching=laps.startedAt===null;
 const direction=crossedLapGate(before,game.player,gate,launching&&car.startsInFirst,car.nextGate===0?laps.direction:0);
 if(!direction)return;
 if(launching){
  laps.startedAt=laps.lapStartedAt=time;
  laps.direction=direction;
  car.nextGate=car.gates.length>1?1:0;
  return;
 }
 if(car.nextGate>0){
  car.nextGate=(car.nextGate+1)%car.gates.length;
  return;
 }
 laps.last=time-laps.lapStartedAt;
 laps.best=laps.best===null?laps.last:Math.min(laps.best,laps.last);
 laps.completed++;
 if(laps.completed===laps.count){
  laps.finishedAt=time;
  game.state='won';
 }else{
  laps.lapStartedAt=time;
  car.nextGate=car.gates.length>1?1:0;
  laps.nextMarker=0;
  notify(`${laps.completed}しゅう めを はしったよ！`);
 }
}

export function updateRaceGates(game,before,notify,time=game.time){
 const car=game.car;
 if(car.laps){updateLaps(game,before,notify,time);return;}
 if(!car.gates.length||car.nextGate>=car.gates.length)return;
 const gate=car.gates[car.nextGate];
 const wasIn=inGate(before,gate),isIn=inGate(game.player,gate);
 if(isIn&&!wasIn||!isIn&&wasIn&&car.nextGate===0&&car.startsInFirst){
  car.nextGate++;
  if(car.nextGate===car.gates.length)game.state='won';
  else notify(`ゲート ${car.nextGate} をとおったよ！`);
 }
}
