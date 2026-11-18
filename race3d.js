const MAX_SPEED=12;
const REVERSE_SPEED=4;
const TURN_SPEED=2.4;

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

export function createCarRun(objects){
 return {speed:0,heading:0,wheelAngle:0,steering:0,gates:orderedRaceGates(objects),nextGate:0};
}

export function carMotion(car,input,grounded,dt){
 const throttle=Math.max(-1,Math.min(1,-(input.z||0)));
 const steer=Math.max(-1,Math.min(1,input.x||0));
 const target=input.brake?0:throttle*(throttle<0?REVERSE_SPEED:MAX_SPEED);
 const slowing=input.brake||Math.sign(car.speed)!==Math.sign(target);
 car.speed=approach(car.speed,target,dt*(input.brake?22:slowing?12:7));
 if(grounded){
  const turnFactor=Math.min(1,Math.abs(car.speed)/2)*(1-.45*Math.min(1,Math.abs(car.speed)/MAX_SPEED));
  car.heading-=steer*turnFactor*TURN_SPEED*Math.sign(car.speed)*dt;
 }
 car.steering=approach(car.steering,steer*.42,dt*3);
 const distance=car.speed*dt;
 car.wheelAngle-=distance/.36;
 return {x:-Math.sin(car.heading)*distance,z:-Math.cos(car.heading)*distance};
}

function inGate(player,gate){
 const turned=gate.rotation===90;
 return Math.abs(player.x-gate.x)<gate.w/2+(turned?.4:0)&&Math.abs(player.z-gate.z)<gate.d/2+(turned?0:.4)&&player.y>=gate.y-.15&&player.y<gate.y+gate.h-.8;
}

export function updateRaceGates(game,before,notify){
 const car=game.car;
 if(!car.gates.length||car.nextGate>=car.gates.length)return;
 const gate=car.gates[car.nextGate];
 if(inGate(game.player,gate)&&!inGate(before,gate)){
  car.nextGate++;
  if(car.nextGate===car.gates.length)game.state='won';
  else notify(`ゲート ${car.nextGate} をとおったよ！`);
 }
}
