import * as T from './vendor/three.module.min.js';
import {TOWN_PARTS,houseGarage,townLocal,visitorParking} from './town3d.js?v=20261127c';
import {makeCarModel,updateCarModel} from './race-model3d.js?v=20261125g';

const mat=color=>new T.MeshStandardMaterial({color,roughness:.85});
const chalk=new T.MeshBasicMaterial({color:0xf9f5ed}),asphalt=mat(0x4c5360),wall=mat(0xe2c5a7),
 roof=mat(0xb26054),glass=mat(0x87bdcc),door=mat(0x526374),shade=mat(0x527d9a),steel=mat(0x828893);
const unit=new T.BoxGeometry();
const gableProfile=new T.Shape();
gableProfile.moveTo(-.5,0);gableProfile.lineTo(.5,0);gableProfile.lineTo(0,1);gableProfile.closePath();
const gable=new T.ExtrudeGeometry(gableProfile,{depth:1,bevelEnabled:false}).translate(0,0,-.5);
const paints=[0x54a48e,0xe2a144,0xda7970,0x5b99d1].map(mat);
const routePaint=new T.MeshBasicMaterial({color:0x58deca,depthTest:false,side:T.DoubleSide});
const grass=mat(0x76a86a),leaves=mat(0x547e4b),wood=mat(0x88694b),pathStone=mat(0xc7b699);

export function makeTownModel(part,preview){
 const group=new T.Group(),{w,h,d,townKind:kind}=part,spec=TOWN_PARTS[kind];
 const box=(material,x,y,z,width,height,depth)=>{
  const mesh=new T.Mesh(unit,preview||material);mesh.position.set(x,y,z);mesh.scale.set(width,height,depth);group.add(mesh);
  return mesh;
 };
 function garageShell(x,width,top,attached){
  const side=attached ? .16 : .24,back=attached ? .16 : .23;
  const roofThickness=attached ? .24 : .3,floor=attached ? .07 : .11;
  const wallTop=top-roofThickness+.025,wallHeight=wallTop-floor,wallY=floor+wallHeight/2;
  const sides=attached?[1]:[-1,1];
  for(const edge of sides)box(wall,x+edge*(width-side)/2,wallY,0,side,wallHeight,d);
  box(wall,x-(attached?side/2:0),wallY,d/2-back/2,width-side*sides.length,wallHeight,back);
  box(shade,x,top-roofThickness/2,0,width+(attached ? .12 : .18),roofThickness,d+(attached ? .1 : .16));
 }
 function parkingLines(x,width,slots,front,back){
  const ink=.075,depth=back-ink/2-front;
  if(depth>0)for(let i=0;i<=slots;i++){
   box(chalk,x+(i/slots-.5)*width,.113,front+depth/2,.055,.014,depth);
  }
  box(chalk,x,.113,back,width,.014,ink);
 }
 group.rotation.order='YXZ';group.rotation.y=part.townHeading;
 if(spec.marking){
  group.rotation.x=Math.atan(part.townGrade||0);
  if(kind==='stopLine')box(chalk,0,.042,0,w,.014,.32);
  else for(let x=-w/2+.25;x<=w/2-.15;x+=.65)box(chalk,x,.042,0,Math.min(.38,w/5),.014,d);
  return group;
 }
 const house=kind==='house'?houseGarage(part):null,visitors=visitorParking(part);
 if(part.townDriveway)box(asphalt,house?.garageX??visitors?.x??0,.155,-(d+part.townDriveway)/2,house?house.garageWidth-.18:visitors?.width??Math.min(4,w),.065,part.townDriveway+.04);
 if(visitors){
  const {x,width,slots}=visitors;
  box(asphalt,x,.055,0,width,.11,d);
  parkingLines(x,width-.18,slots,.1-Math.min(3.5,d)/2,Math.min(1.85,d*.48));
 }
 if(kind==='parking'||kind==='garage'){
  box(asphalt,0,.055,0,w,.11,d);
  parkingLines(0,w-.35,6,-.95,2.65);
  if(kind==='garage')garageShell(0,w,h,false);
  return group;
 }
 if(kind==='busStop'){
  box(asphalt,0,.055,0,w,.11,d);
  box(shade,0,h-.1,.3,w,.2,1.8);
  box(glass,0,1.22,1.13,w-.16,.12+2.15,.13);
  const post=(x,z,width,top)=>box(steel,x,(top+.11)/2,z,width,top-.11,width);
  for(const x of [-w/2+.18,w/2-.18])post(x,.94,.12,2.3);
  box(shade,1.8,1.75,-.85,.36,.36,.12);post(1.8,-.85,.08,2);
  return group;
 }
 if(kind==='park'){
  box(grass,0,.08,0,w,.16,d);
  box(pathStone,0,.17,0,1.1,.04,d);
  for(const x of [-w*.34,w*.34]){
   box(wood,x,.76,d*.24,.3,1.2,.3);
   box(leaves,x,1.9,d*.24,1.7,1.7,1.7);
   box(wood,x,.61,-d*.2,2,.15,.6);
   box(wood,x,.83,-d*.2+.26,2,.43,.14);
   for(const side of [-1,1])box(steel,x+side*.73,.35,-d*.2,.12,.45,.4);
  }
  return group;
 }
 const height=kind==='house'?h*.72:h-.22;
 const facadeWidth=house?.houseWidth??visitors?.buildingWidth??w,facadeX=house?.houseX??-(visitors?.width??0)/2;
 box(wall,facadeX,height/2,0,facadeWidth,height,d);
 if(house){
  const {garageWidth,garageX,garageHeight}=house;
  box(asphalt,garageX,.035,0,garageWidth,.07,d);
  garageShell(garageX,garageWidth,garageHeight,true);
  const mesh=new T.Mesh(gable,preview||roof);
  const overhang=Math.min(.16,facadeWidth*.04,d*.04);
  mesh.scale.set(facadeWidth+2*overhang,h-height+.02,d+2*overhang);
  mesh.position.set(facadeX,height-.02,0);group.add(mesh);
 }else box(shade,facadeX,h-.13,0,facadeWidth+.24,.26,d+.22);
 box(door,facadeX,1.115,-d/2-.027,house?Math.min(1.06,facadeWidth*.24):1.65,2.17,.07);
 const windows=(kind==='school'?[-.37,-.19,.19,.37]:[-.29,.29]).map(offset=>facadeX+offset*facadeWidth);
 const windowWidth=kind==='house'?Math.min(1,facadeWidth*.22):Math.min(1.35,facadeWidth*(kind==='school' ? .17 : .31));
 for(const x of windows){
  box(glass,x,1.62,-d/2-.03,windowWidth,1.08,.09);
  if(kind==='school')box(glass,x,3.85,-d/2-.03,windowWidth,1.14,.09);
 }
 if(kind==='shop')box(roof,facadeX,2.75,-d/2-.37,Math.max(.1,facadeWidth-.4),.22,.74);
 return group;
}

export function createTownView(scene){
 const cars=new T.Group(),route=new T.Group();
 const line=new T.Mesh(new T.BufferGeometry(),routePaint);line.renderOrder=20;route.add(line);scene.add(cars,route);route.visible=false;
 const markerShape=new T.CylinderGeometry(.67,.67,.15,24);
 const markers=[0x58deca,0xffb65c].map(color=>{
  const marker=new T.Mesh(markerShape,new T.MeshBasicMaterial({color,depthTest:false}));
  marker.renderOrder=21;route.add(marker);return marker;
 });
 const routePlaces=[0x4cdcc4,0xffb65c].map(color=>{
  const marker=new T.LineLoop(new T.BufferGeometry(),new T.LineBasicMaterial({color,depthTest:false}));
  marker.visible=false;marker.renderOrder=22;scene.add(marker);return marker;
 });
 const lots=new T.Mesh(new T.BufferGeometry(),new T.MeshBasicMaterial({color:0x49ad8d,transparent:true,opacity:.23,side:T.DoubleSide,depthWrite:false}));
 const outlines=new T.LineSegments(new T.BufferGeometry(),new T.LineBasicMaterial({color:0x29765f}));
 const previews=new T.Group();lots.visible=outlines.visible=false;scene.add(lots,outlines,previews);
 const lotPaint=new T.MeshBasicMaterial({color:0x3abb9a,transparent:true,opacity:.65,depthWrite:false});
 const ghostIds=new Set();
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
  lotSurface:lots,
  showLots(parts,kind){
   const shop=kind==='shop';
   lots.material.color.setHex(shop?0xd29944:0x49ad8d);
   outlines.material.color.setHex(shop?0x875621:0x29765f);
   lotPaint.color.setHex(shop?0xe0ae57:0x3abb9a);
   const fill=[],edge=[];
   for(const part of parts){
    const points=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>townLocal(part,x*part.w/2,z*part.d/2));
    const write=(buffer,order)=>{for(const i of order){const {x,y,z}=points[i];buffer.push(x,y+.05,z);}};
    write(fill,[0,1,2,0,2,3]);write(edge,[0,1,1,2,2,3,3,0]);
   }
   for(const [mesh,vertices] of [[lots,fill],[outlines,edge]]){
    mesh.geometry.dispose();mesh.geometry=new T.BufferGeometry();
    mesh.geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));mesh.visible=parts.length>0;
   }
  },
  showLotPreviews(parts){
   if(!parts.size){previews.clear();ghostIds.clear();}
   for(const [id,part] of parts){
    if(ghostIds.has(id))continue;
    const model=makeTownModel(part,lotPaint);model.position.set(part.x,part.y,part.z);previews.add(model);ghostIds.add(id);
   }
  },
  sync(vehicles){
   models.forEach((model,index)=>{model.visible=index<vehicles.length;});
   vehicles.forEach((vehicle,index)=>{
    const model=modelAt(index);
    model.position.set(vehicle.x,vehicle.y,vehicle.z);
    model.rotation.order='YXZ';model.rotation.y=vehicle.heading;model.rotation.x=vehicle.pitch||0;
    updateCarModel(model,vehicle,vehicle.braking);
   });
  },
  showRoutePlaces(source,target){
   for(const [i,part] of [source,target].entries()){
    const marker=routePlaces[i];marker.visible=!!part;
    if(!part)continue;
    const points=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>{
     const point=townLocal(part,x*(part.w/2+.28),z*(part.d/2+.28));
     return new T.Vector3(point.x,point.y+.25,point.z);
    });
    marker.geometry.dispose();marker.geometry=new T.BufferGeometry().setFromPoints(points);
   }
  },
  showRoute(points){
   route.visible=!!points?.length;
   if(!route.visible)return;
   for(const [index,point] of [points[0],points.at(-1)].entries())markers[index].position.set(point.x,point.y+.26,point.z);
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
