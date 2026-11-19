import * as T from './vendor/three.module.min.js';
import {raceGateWidth,raceGateHeading} from './race3d.js?v=20261119d';

const material=(color)=>new T.MeshStandardMaterial({color,roughness:.8});
const body=material(0x7563db),trim=material(0x443b7d),glass=material(0x86d7de),tire=material(0x27364a),hub=material(0xaabbd2),lamp=material(0xffeeaa),tail=material(0xe77b91);
const gateFrame=material(0x7e83ad),gateReady=material(0x50d5bd),gatePassed=material(0x557978),gateAccent=material(0xf2f4fc);
const unit=new T.BoxGeometry(),wheelShape=new T.CylinderGeometry(.36,.36,.2,16),hubShape=new T.CylinderGeometry(.16,.16,.025,12);
function box(parent,mat,x,y,z,w,h,d){
 const mesh=new T.Mesh(unit,mat);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;
}

export function makeCarModel(){
 const model=new T.Group(),wheels=[];
 box(model,body,0,.58,0,1.66,.58,2.45);
 box(model,trim,0,.37,0,1.7,.15,2.44);
 box(model,glass,0,.99,.17,1.36,.59,1.24);
 box(model,body,0,1.31,.23,1.4,.14,1.09);
 box(model,trim,0,.79,-.82,1.5,.12,.54);
 for(const side of [-1,1]){
  box(model,lamp,side*.52,.58,-1.23,.36,.19,.045);
  box(model,tail,side*.55,.6,1.23,.26,.16,.05);
  for(const end of [-1,1]){
   const steering=new T.Group(),axle=new T.Group(),wheel=new T.Group();
   steering.position.set(side*.83,.36,end*.82);
   // The cylinder rolls on its local Y axis, which the axle points along the car’s X axis.
   axle.rotation.z=-Math.PI/2;
   const tread=new T.Mesh(wheelShape,tire),cap=new T.Mesh(hubShape,hub);cap.position.y=side*.113;
   wheel.add(tread,cap);axle.add(wheel);steering.add(axle);model.add(steering);wheels.push({steering,wheel,front:end<0});
  }
 }
 model.userData.wheels=wheels;
 return model;
}

export function updateCarModel(model,car){
 for(const {wheel,steering,front} of model.userData.wheels){
  steering.rotation.y=front?-car.steering:0;
  wheel.rotation.y=car.wheelAngle;
 }
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
