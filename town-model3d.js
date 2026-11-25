import * as T from './vendor/three.module.min.js';
import {TOWN_PARTS,houseGarage} from './town3d.js?v=20261125d';
import {makeCarModel,updateCarModel} from './race-model3d.js?v=20261125e';

const mat=color=>new T.MeshStandardMaterial({color,roughness:.85});
const chalk=new T.MeshBasicMaterial({color:0xf9f5ed}),asphalt=mat(0x4c5360),wall=mat(0xe2c5a7),
 roof=mat(0xb26054),glass=mat(0x87bdcc),door=mat(0x526374),shade=mat(0x527d9a),steel=mat(0x828893);
const unit=new T.BoxGeometry(),gable=new T.CylinderGeometry(1,1,1,3,1,false,Math.PI/2);
const paints=[0x54a48e,0xe2a144,0xda7970,0x5b99d1].map(mat);
const routePaint=new T.MeshBasicMaterial({color:0x58deca,depthTest:false,side:T.DoubleSide});

export function makeTownModel(part,preview){
 const group=new T.Group(),{w,h,d,townKind:kind}=part,spec=TOWN_PARTS[kind];
 const box=(material,x,y,z,width,height,depth)=>{
  const mesh=new T.Mesh(unit,preview||material);mesh.position.set(x,y,z);mesh.scale.set(width,height,depth);group.add(mesh);
  return mesh;
 };
 group.rotation.order='YXZ';group.rotation.y=part.townHeading;
 if(spec.marking){
  group.rotation.x=Math.atan(part.townGrade||0);
  if(kind==='stopLine')box(chalk,0,.042,0,w,.014,.32);
  else for(let x=-w/2+.25;x<=w/2-.15;x+=.65)box(chalk,x,.042,0,Math.min(.38,w/5),.014,d);
  return group;
 }
 const house=kind==='house'?houseGarage(part):null;
 if(part.townDriveway)box(asphalt,house?.garageX||0,.155,-(d+part.townDriveway)/2,house?house.garageWidth-.18:Math.min(4,w),.065,part.townDriveway+.04);
 if(kind==='parking'||kind==='garage'){
  box(asphalt,0,.055,0,w,.11,d);
  for(let i=0;i<=6;i++)box(chalk,(i-3)*(w-.35)/6,.113,.85,.055,.014,3.6);
  box(chalk,0,.113,2.65,w-.35,.014,.075);
  if(kind==='garage'){
   box(wall,0,h/2,d/2-.115,w,h,.23);
   box(shade,0,h-.15,0,w+.18,.3,d+.16);
   for(const x of [-w/2+.12,w/2-.12])box(wall,x,h/2,0,.24,h,d);
  }
  return group;
 }
 if(kind==='busStop'){
  box(asphalt,0,.055,0,w,.11,d);
  box(shade,0,h-.1,.3,w,.2,1.8);
  box(glass,0,1.22,1.13,w,.12+2.15,.13);
  for(const x of [-w/2+.18,w/2-.18])box(steel,x,1.15,.94,.12,2.3,.12);
  box(shade,1.8,1.75,-.85,.36,.36,.12);box(steel,1.8,1,-.85,.08,2,.08);
  return group;
 }
 const height=kind==='house'?h*.72:h-.22;
 const facadeWidth=house?.houseWidth||w,facadeX=house?.houseX||0;
 box(wall,facadeX,height/2,0,facadeWidth,height,d);
 if(house){
  const {garageWidth,garageX,garageHeight}=house;
  box(asphalt,garageX,.035,0,garageWidth,.07,d);
  box(wall,w/2-.08,garageHeight/2,0,.16,garageHeight,d);
  box(wall,garageX,garageHeight/2,d/2-.08,garageWidth,garageHeight,.16);
  box(shade,garageX,garageHeight-.12,0,garageWidth+.12,.24,d+.1);
  const mesh=new T.Mesh(gable,preview||roof);
  mesh.rotation.set(Math.PI/2,0,0);mesh.scale.set(facadeWidth*.61,d+.23,1.05);
  mesh.position.set(facadeX,height+.35,0);group.add(mesh);
 }else box(shade,0,h-.13,0,w+.24,.26,d+.22);
 box(door,facadeX,1.1,-d/2-.027,house?Math.min(1.06,facadeWidth*.24):1.65,2.2,.07);
 const windows=kind==='school'?[-4,-2,2,4]:[facadeX-facadeWidth*.29,facadeX+facadeWidth*.29];
 for(const x of windows){
  box(glass,x,1.62,-d/2-.03,kind==='house'?1:1.35,1.08,.09);
  if(kind==='school')box(glass,x,3.85,-d/2-.03,1.35,1.14,.09);
 }
 if(kind==='shop')box(roof,0,2.75,-d/2-.37,w-.4,.22,.74);
 return group;
}

export function createTownView(scene){
 const cars=new T.Group(),route=new T.Group();
 const line=new T.Mesh(new T.BufferGeometry(),routePaint);line.renderOrder=20;route.add(line);scene.add(cars,route);route.visible=false;
 const models=[];
 function modelAt(index){
  if(!models[index]){
   const model=makeCarModel();
   model.children[0].material=model.children[3].material=paints[index%paints.length];
   models[index]=model;cars.add(model);
  }
  return models[index];
 }
 return {
  sync(vehicles){
   models.forEach((model,index)=>{model.visible=index<vehicles.length;});
   vehicles.forEach((vehicle,index)=>{
    const model=modelAt(index);
    model.position.set(vehicle.x,vehicle.y,vehicle.z);
    model.rotation.order='YXZ';model.rotation.y=vehicle.heading;model.rotation.x=vehicle.pitch||0;
    updateCarModel(model,vehicle,vehicle.braking);
   });
  },
  showRoute(points){
   route.visible=!!points?.length;
   if(!route.visible)return;
   const vertices=[];
   for(let i=1;i<(points?.length||0);i++){
    const a=points[i-1],b=points[i],length=Math.hypot(b.x-a.x,b.z-a.z);
    if(length<.01)continue;
    const x=(b.x-a.x)/length,z=(b.z-a.z)/length;
    const l=[a.x-z*.17,a.y+.22,a.z+x*.17],r=[a.x+z*.17,a.y+.22,a.z-x*.17];
    const m=[b.x-z*.17,b.y+.22,b.z+x*.17],n=[b.x+z*.17,b.y+.22,b.z-x*.17];
    vertices.push(...l,...r,...m,...r,...n,...m);
    const count=Math.ceil(length/8);
    for(let j=0;j<count;j++){
     const t=(j+.55)/count,cx=a.x+(b.x-a.x)*t,cy=a.y+(b.y-a.y)*t+.225,cz=a.z+(b.z-a.z)*t;
     if(length/count<2)break;
     vertices.push(cx+x*.7,cy,cz+z*.7,cx-x*.58+z*.55,cy,cz-z*.58-x*.55,cx-x*.58-z*.55,cy,cz-z*.58+x*.55);
    }
   }
   line.geometry.dispose();line.geometry=new T.BufferGeometry();
   line.geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));line.geometry.computeBoundingSphere();
  }
 };
}
