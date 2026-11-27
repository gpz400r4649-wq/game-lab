import {createRoadNetwork} from './road-network3d.js?v=20261127i';
import {courseStart,savedRoadPath} from './road3d.js?v=20261127g';
import {orderedRaceGates,trafficSignalPhase} from './race3d.js?v=20261127g';
import {AUTO_TOWN_DESTINATION,MAX_TOWN_CARS,TOWN_PARTS,houseGarage,townFleetSettings,townLocal,townParkingCapacity,visitorParking} from './town3d.js?v=20261127c';

const gap=(a,b)=>Math.hypot(b.x-a.x,b.z-a.z);
const near=(a,b)=>gap(a,b)<.01&&Math.abs(a.y-b.y)<.04;
const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:(a.y||0)+((b.y||0)-(a.y||0))*t,z:a.z+(b.z-a.z)*t});
const stepTowards=(from,to,step)=>from+Math.sign(to-from)*Math.min(Math.abs(to-from),step);
const direction=(a,b)=>Math.atan2(a.x-b.x,a.z-b.z);
const angle=value=>Math.atan2(Math.sin(value),Math.cos(value));

function shapePath(points){
 const unique=points.filter((point,i)=>!i||!near(point,points[i-1]));
 const result=[unique[0]];
 for(let i=1;i<unique.length-1;i++){
  const a=unique[i-1],b=unique[i],c=unique[i+1],before=gap(a,b),after=gap(b,c);
  const bend=Math.abs(angle(direction(a,b)-direction(b,c)));
  if(bend<.18||before<1.8||after<1.8){result.push(b);continue;}
  const corner=Math.min(2,before*.34,after*.34),entry=mix(b,a,corner/before),exit=mix(b,c,corner/after);
  for(let j=0;j<=5;j++){const t=j/5;result.push(mix(mix(entry,b,t),mix(b,exit,t),t));}
 }
 if(unique.length>1)result.push(unique.at(-1));
 return result;
}

function setLane(points,amount){
 return points.map((point,i)=>{
  const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],yaw=direction(a,b);
  return {...point,x:point.x-Math.cos(yaw)*amount,z:point.z+Math.sin(yaw)*amount};
 });
}

function parkingEntrance(part){
 return part.townKind==='house'?houseGarage(part).garageX:visitorParking(part)?.x??0;
}

function parkingPath(part,slot){
 const visitors=visitorParking(part),capacity=townParkingCapacity(part);
 const entrance=parkingEntrance(part),width=visitors?.width??part.w-.35;
 const lane=entrance+(slot%capacity-(capacity-1)/2)*width/capacity;
 return [townLocal(part,lane,.7),townLocal(part,lane,-part.d/2+.75),
  townLocal(part,visitors?lane:entrance,-part.d/2-(part.townDriveway||0))];
}

const MIN_TOWN_TRIP=.05;
function townRoadAnchor(part){
 const entrance=townLocal(part,parkingEntrance(part),0);
 const {x,y,z}=part.townAnchor;
 return {x:x+entrance.x-part.x,y,z:z+entrance.z-part.z};
}

export function reachableTownDestinations(network,source,places){
 if(!source?.townRoadId)return [];
 const reachable=network.reachableFrom(townRoadAnchor(source),{fromRoad:source.townRoadId,minGap:MIN_TOWN_TRIP});
 return places.filter(part=>part.id!==source.id&&part.townRoadId&&townParkingCapacity(part)&&reachable(townRoadAnchor(part),part.townRoadId));
}

export function townRoute(network,source,target,slot=0){
 if(!source?.townRoadId||!target?.townRoadId||source.id===target.id)return null;
 const road=network.route(townRoadAnchor(source),townRoadAnchor(target),{fromRoad:source.townRoadId,toRoad:target.townRoadId});
 if(!road||road.length<2||gap(road[0],road.at(-1))<MIN_TOWN_TRIP&&road.length===2)return null;
 return shapePath([...parkingPath(source,slot),...setLane(road,.95),...parkingPath(target,slot).reverse()]);
}

export function resolveTownTrip(network,source,places){
 const {targetId}=townFleetSettings(source);
 const auto=targetId===AUTO_TOWN_DESTINATION;
 const targets=auto?places.filter(part=>part.townKind==='shop'&&part.townRoadId).sort((a,b)=>gap(source,a)-gap(source,b)):
  places.filter(part=>part.id===targetId);
 for(const target of targets){
  const path=townRoute(network,source,target);
  if(path)return {target,path,auto};
 }
 return null;
}

export function raceRoute(project,network=createRoadNetwork(project.roads)){
 const roads=project.roads||[],gates=orderedRaceGates(project.objects);
 if(project.raceLaps&&gates.length<2){
  const loop=gates[0]?roads.find(road=>road.id===gates[0].gateRoadId&&road.closed):roads[0]?.closed&&roads[0];
  if(!loop)return null;
  const start=gates[0]||courseStart(project),points=savedRoadPath(loop).slice(0,-1);
  const i=points.reduce((best,point,i)=>gap(point,start)<gap(points[best],start)?i:best,0);
  const ordered=[...points.slice(i+1),...points.slice(0,i+1)].map(point=>({...point,y:point.y||0}));
  return [start,...ordered,start].filter((point,i,path)=>!i||!near(point,path[i-1]));
 }
 if(gates.length<2)return null;
 const path=[],stops=project.raceLaps?[...gates,gates[0]]:gates;
 for(let i=1;i<stops.length;i++){
  const from=stops[i-1],to=stops[i],segment=network.route(from,to,{fromRoad:from.gateRoadId,toRoad:to.gateRoadId});
  if(!segment?.length)return null;
  path.push(...(i===1?segment:segment.slice(1)));
 }
 return shapePath(path);
}

function pathInfo(points){
 if(!points?.[1])return null;
 const cumulative=[0];
 for(let i=1;i<points.length;i++)cumulative.push(cumulative[i-1]+Math.max(.00001,gap(points[i-1],points[i])));
 return {points,cumulative,length:cumulative.at(-1)};
}

function sample(path,distance){
 const {points,cumulative}=path;
 let low=1,high=points.length-1;
 while(low<high){const mid=(low+high)>>1;if(cumulative[mid]<distance)low=mid+1;else high=mid;}
 const a=points[low-1],b=points[low],span=cumulative[low]-cumulative[low-1];
 const t=Math.max(0,Math.min(1,(distance-cumulative[low-1])/span));
 return {...mix(a,b,t),heading:direction(a,b),pitch:Math.atan2((b.y||0)-(a.y||0),span)};
}

function signalStops(path,signals){
 const stops=[];
 for(const signal of signals){
  const stop=signal.stop;
  const rotation=(signal.rotation||0)*Math.PI/180;let best=null;
  for(let i=1;i<path.points.length;i++){
   const a=path.points[i-1],b=path.points[i],span=gap(a,b);
   if(span<.1||Math.cos(direction(a,b)-rotation)>-.64)continue;
   const along=((stop.x-a.x)*(b.x-a.x)+(stop.z-a.z)*(b.z-a.z))/span;
   if(along<-.35||along>span+.35)continue;
   const t=Math.max(0,Math.min(1,along/span));
   const point=mix(a,b,t),laneGap=gap(point,stop);
   if(laneGap>2.1||Math.abs(point.y-stop.y)>.65||laneGap>=(best?.score??Infinity))continue;
   best={at:Math.max(0,path.cumulative[i-1]+span*t-1.4),rotation:signal.rotation,phaseOffset:signal.phaseOffset,score:laneGap};
  }
  if(best)stops.push(best);
 }
 return stops;
}

function vehicle(path,fields){
 return {...sample(path,0),path,distance:0,speed:0,wheelAngle:0,steering:0,braking:false,...fields};
}

export function createTownTraffic(project){
 const cars=[],rivals=[],roads=project.roads||[],places=project.objects.filter(part=>part.type==='town'&&townParkingCapacity(part));
 const sources=places.filter(part=>TOWN_PARTS[part.townKind].capacity&&townFleetSettings(part).count&&part.townRoadId);
 if(!project.rivals?.length&&!sources.length)return {cars,rivals};
 const network=createRoadNetwork(roads);
 const signals=network.signals;
 const targetSlots=new Map(),autoDepartures=new Map();
 const autoSource=source=>townFleetSettings(source).targetId===AUTO_TOWN_DESTINATION;
 for(const source of [...sources.filter(source=>!autoSource(source)),...sources.filter(autoSource)]){
  if(cars.length>=MAX_TOWN_CARS)break;
  const fleet=townFleetSettings(source),trip=resolveTownTrip(network,source,places);
  if(!trip)continue;
  const {target,auto}=trip;
  const taken=targetSlots.get(target.id)||0;
  for(let i=0;i<fleet.count&&cars.length<MAX_TOWN_CARS;i++){
   const points=taken+i?townRoute(network,source,target,taken+i):trip.path,out=pathInfo(points);
   if(!out)continue;
   const back=pathInfo(townRoute(network,target,source,taken+i));
   const wait=taken+i>=townParkingCapacity(target)&&fleet.arrival==='park';
   const startAt=fleet.delay+i*fleet.interval+(auto?(autoDepartures.get(target.id)||0)*6:0);
   cars.push(vehicle(out,{sourceId:source.id,out,back,outStops:signalStops(out,signals),backStops:back?signalStops(back,signals):[],
    phase:wait?'parked':'queued',startAt,limit:fleet.speed/3.6,arrival:fleet.arrival,parkedAtSource:true}));
   if(auto)autoDepartures.set(target.id,(autoDepartures.get(target.id)||0)+1);
  }
  if(fleet.arrival==='park')targetSlots.set(target.id,taken+fleet.count);
 }
 const race=project.rivals?.length&&raceRoute(project,network);
 if(race?.length>1)for(const [index,rival] of (project.rivals||[]).entries()){
  const lane=(index%2?1:-1)*(1+Math.floor(index/2)*.24),path=pathInfo(setLane(race,lane));
  rivals.push(vehicle(path,{speedFactor:rival.speed,corner:rival.corner,rival:true,startAt:.18+index*.7,laps:0,finishedAt:null}));
 }
 return {cars,rivals};
}

function setLeg(car,phase,path,waitUntil){
 car.phase=phase;car.path=path;car.distance=0;car.speed=0;car.waitUntil=waitUntil;
}

function drive(car,limit,stop,dt){
 const room=Math.max(0,stop-car.distance);
 const target=Math.min(limit,Math.sqrt(12*room));
 car.braking=target+.1<car.speed;
 car.speed=stepTowards(car.speed,target,(car.braking?7:4)*dt);
 const delta=Math.min(car.speed*dt,room);
 car.distance+=delta;car.wheelAngle-=delta/.36;
 const position=sample(car.path,car.distance),turn=angle(position.heading-car.heading);
 car.steering=Math.max(-.42,Math.min(.42,-turn));
 car.heading+=Math.max(-dt*3.5,Math.min(dt*3.5,turn));
 Object.assign(car,{x:position.x,y:position.y,z:position.z,pitch:position.pitch});
 if(room<=.03||delta>=room)car.speed=0;
}

function townStops(car,cars,player,time){
 let stop=car.path.length;
 const look=sample(car.path,Math.min(stop,car.distance+1)),fx=-Math.sin(look.heading),fz=-Math.cos(look.heading);
 for(const other of [...cars,player]){
  if(other===car||Math.abs(other.y-car.y)>.9||other.rival)continue;
  if(other!==player&&(!['out','back'].includes(other.phase)||Math.cos(other.heading-look.heading)<.45))continue;
  const dx=other.x-car.x,dz=other.z-car.z,ahead=dx*fx+dz*fz,cross=Math.abs(dx*fz-dz*fx);
  if(ahead>0&&ahead<12&&cross<1.5)stop=Math.min(stop,car.distance+Math.max(0,ahead-3.3));
 }
 for(const signal of car.phase==='back'?car.backStops:car.outStops){
  if(signal.at>=car.distance-.1&&trafficSignalPhase(signal.rotation,time,signal.phaseOffset)!==2)stop=Math.min(stop,signal.at);
 }
 return stop;
}

export function stepTownTraffic(game,dt){
 const {town,car,player,time}=game;
 if(!town)return;
 for(const vehicle of town.cars){
  if(vehicle.phase==='parked')continue;
  if(vehicle.phase==='queued'){
   if(time<vehicle.startAt)continue;
   vehicle.phase='out';vehicle.parkedAtSource=false;
  }
  if(vehicle.phase==='waiting'){
   if(time<vehicle.waitUntil||!vehicle.back)continue;
   setLeg(vehicle,'back',vehicle.back,0);
  }
  drive(vehicle,vehicle.limit,townStops(vehicle,town.cars,player,time),dt);
  if(vehicle.distance<vehicle.path.length-.035)continue;
  vehicle.braking=false;
  if(vehicle.phase==='out')vehicle.phase=vehicle.arrival==='park'||!vehicle.back?'parked':'waiting';
  else if(vehicle.arrival==='loop')setLeg(vehicle,'queued',vehicle.out,0);
  else vehicle.phase='parked';
  if(vehicle.phase==='waiting')vehicle.waitUntil=time+4;
  if(vehicle.phase==='queued')vehicle.startAt=time+4;
 }
 if(!town.rivals.length)return;
 if(car.laps){town.raceStart??=car.laps.startedAt;}
 else if(town.raceStart==null&&car.nextGate>0)town.raceStart=time;
 if(town.raceStart==null)return;
 for(const rival of town.rivals){
  if(time<town.raceStart+rival.startAt||rival.finishedAt!==null)continue;
  const now=sample(rival.path,rival.distance),ahead=sample(rival.path,Math.min(rival.path.length,rival.distance+5));
  const bend=Math.abs(angle(ahead.heading-now.heading));
  const limit=car.tuning.maxSpeed*rival.speedFactor/(1+2*bend/rival.corner);
  drive(rival,limit,rival.path.length,dt);
  if(rival.distance<rival.path.length-.035)continue;
  rival.laps++;
  if(rival.laps<(car.laps?.count||1)){rival.distance=0;}
  else{rival.finishedAt=time;rival.braking=false;}
 }
}

export function townRaceRank(game){
 const rivals=game.town?.rivals||[];
 return rivals.length?{rank:1+rivals.filter(rival=>rival.finishedAt!==null).length,total:rivals.length+1}:null;
}
