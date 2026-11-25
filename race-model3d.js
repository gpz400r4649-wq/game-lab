import * as T from './vendor/three.module.min.js';
import {CAR_WHEELBASE,raceGateWidth,raceGateHeading,trafficSignalPhase} from './race3d.js?v=20261125g';

const material=(color)=>new T.MeshStandardMaterial({color,roughness:.8});
const body=material(0x7563db),trim=material(0x443b7d),glass=material(0x86d7de),tire=material(0x27364a),hub=material(0xaabbd2),lamp=material(0xffeeaa),tail=material(0x6c2638);
const brakeLamp=new T.MeshBasicMaterial({color:0xff3344,toneMapped:false});
const gateFrame=material(0x7e83ad),gateReady=material(0x50d5bd),gatePassed=material(0x557978),gateAccent=material(0xf2f4fc);
const unit=new T.BoxGeometry(),wheelShape=new T.CylinderGeometry(.36,.36,.2,16),hubShape=new T.CylinderGeometry(.16,.16,.025,12);
function box(parent,mat,x,y,z,w,h,d){
 const mesh=new T.Mesh(unit,mat);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;
}

const signalPole=material(0x7c8b92),signalCase=material(0x273138),signalLens=new T.SphereGeometry(1,12,8);
const signalLamps=[0xef4138,0xffc337,0x42ecb2].map(color=>({
 on:new T.MeshBasicMaterial({color}),off:new T.MeshBasicMaterial({color:new T.Color(color).multiplyScalar(.14)})
}));

export function makeTrafficSignal(part,previewMaterial){
 const model=new T.Group(),frame=previewMaterial||signalPole,housing=previewMaterial||signalCase;
 box(model,frame,0,.07,0,.55,.14,.55);
 box(model,frame,0,1.47,0,.14,2.8,.14);
 box(model,housing,0,2.88,-.085,.39,1,.28);
 model.userData.signalLamps=signalLamps.map(({on},index)=>{
  const lens=new T.Mesh(signalLens,previewMaterial||on);
  lens.scale.set(.12,.12,.04);lens.position.set(0,3.18-index*.3,-.223);model.add(lens);return lens;
 });
 model.rotation.y=(part.rotation||0)*Math.PI/180;
 return model;
}

export function updateTrafficSignal(model,rotation,time,phaseOffset){
 // Perpendicular signals have opposite phases, with one second of all red in between.
 const active=trafficSignalPhase(rotation,time,phaseOffset);
 if(model.userData.activeLamp===active)return;
 model.userData.activeLamp=active;
 model.userData.signalLamps.forEach((lens,index)=>{lens.material=signalLamps[index][index===active?'on':'off'];});
}

export function makeCarModel(){
 const model=new T.Group(),wheels=[],brakeLights=[];
 box(model,body,0,.58,0,1.66,.58,2.45);
 box(model,trim,0,.37,0,1.7,.15,2.44);
 box(model,glass,0,.99,.17,1.36,.59,1.24);
 box(model,body,0,1.31,.23,1.4,.14,1.09);
 box(model,trim,0,.79,-.82,1.5,.12,.54);
 for(const side of [-1,1]){
  box(model,lamp,side*.52,.58,-1.23,.36,.19,.045);
  brakeLights.push(box(model,tail,side*.55,.6,1.23,.26,.16,.05));
  for(const end of [-1,1]){
   const steering=new T.Group(),axle=new T.Group(),wheel=new T.Group();
   steering.position.set(side*.83,.36,end*CAR_WHEELBASE/2);
   // The cylinder rolls on its local Y axis, which the axle points along the car’s X axis.
   axle.rotation.z=-Math.PI/2;
   const tread=new T.Mesh(wheelShape,tire),cap=new T.Mesh(hubShape,hub);cap.position.y=side*.113;
   wheel.add(tread,cap);axle.add(wheel);steering.add(axle);model.add(steering);wheels.push({steering,wheel,front:end<0});
  }
 }
 model.userData.wheels=wheels;
 model.userData.brakeLights=brakeLights;
 return model;
}

export function updateCarModel(model,car,braking=false){
 for(const {wheel,steering,front} of model.userData.wheels){
  steering.rotation.y=front?-car.steering:0;
  wheel.rotation.y=car.wheelAngle;
 }
 for(const light of model.userData.brakeLights)light.material=braking?brakeLamp:tail;
}

export function makeRaceGateModel(part){
 const model=new T.Group(),lights=[],width=raceGateWidth(part);
 for(const side of [-1,1]){
  const x=side*width/2;
  box(model,gateFrame,x,1.44,0,.22,2.88,.24);
  lights.push(box(model,gateReady,x,1.53,0,.26,1.8,.28));
 }
 box(model,gateFrame,0,2.89,0,width+.22,.22,.26);
 for(let x=-width/2+.25;x<=width/2-.25;x+=.5)box(model,gateAccent,x,2.9,-.142,.225,.11,.02);
 model.rotation.y=raceGateHeading(part);
 model.userData.lights=lights;
 return model;
}

export function updateRaceGateModel(model,active,passed){
 for(const light of model.userData.lights)light.material=passed?gatePassed:active?gateReady:gateFrame;
}

const gateNumbers=new Map();
export function updateRaceGateNumber(model,number){
 if(!model)return;
 let texture=gateNumbers.get(number);
 if(!texture){
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#334160';ctx.beginPath();ctx.roundRect(6,5,116,54,18);ctx.fill();
  ctx.fillStyle='#fff';ctx.font='bold 42px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(number),64,34);
  texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;gateNumbers.set(number,texture);
 }
 if(model.userData.number){model.userData.number.material.map=texture;return;}
 const sign=new T.Sprite(new T.SpriteMaterial({map:texture,depthWrite:false}));sign.position.y=3.31;sign.scale.set(1.48,.74,1);
 model.add(sign);model.userData.number=sign;
}

export function createLapGateView(scene){
 const group=new T.Group();
 group.name='automatic-lap-gates';
 scene.add(group);
 let previousLap=null,startGate=null,markerGates=[];
 return function sync(laps,racing){
  const run=laps??null;
  if(run!==previousLap){
   for(const gate of group.children)gate.userData.number.material.dispose();
   group.clear();
   previousLap=run;
   function addGate(marker,number){
    const gate=makeRaceGateModel(marker);
    gate.position.set(marker.x,marker.y,marker.z);
    updateRaceGateNumber(gate,number);
    group.add(gate);
    return gate;
   }
   startGate=laps?.autoStart?addGate(laps.autoStart,1):null;
   markerGates=laps?.markers.map((marker,index)=>addGate(marker,index+2))??[];
  }
  if(!laps)return;
  const started=laps.startedAt!==null;
  if(startGate)updateRaceGateModel(startGate,racing&&(!started||laps.nextMarker===markerGates.length),!racing);
  markerGates.forEach((gate,index)=>
   updateRaceGateModel(gate,racing&&started&&index===laps.nextMarker,started&&index<laps.nextMarker));
 };
}
