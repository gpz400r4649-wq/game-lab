import * as T from './vendor/three.module.min.js';
import {doorUsesGlass,doorDimensions,doorHasPanel,isSlidingDoor,doorFrameParts,slidingDoorPanels,slidingPanelCount} from './doors3d.js?v=20261113m';
const cube=new T.BoxGeometry(1,1,1);
const arrowShape=new T.Shape();arrowShape.moveTo(-.55,-.07);arrowShape.lineTo(.14,-.07);arrowShape.lineTo(.14,-.24);arrowShape.lineTo(.55,0);arrowShape.lineTo(.14,.24);arrowShape.lineTo(.14,.07);arrowShape.lineTo(-.55,.07);arrowShape.closePath();
const arrowGeometry=new T.ExtrudeGeometry(arrowShape,{depth:.02,bevelEnabled:false});arrowGeometry.translate(0,0,-.01);
export function makeDoorModel(o,materials){
 if(doorUsesGlass(o)||!doorDimensions(o).single||!doorHasPanel(o)||isSlidingDoor(o))return makeArchitecturalDoor(o,materials);
 const root=new T.Group(),{depth,opening,openingCenter,base,openingHeight}=doorDimensions(o);
 root.rotation.y=(o.rotation||0)*Math.PI/180;
 const box=(parent,material,x,y,z,w,h,d)=>{const mesh=new T.Mesh(cube,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;};
 for(const p of doorFrameParts(o))box(root,materials.wall||materials.door,p.x,p.y+p.h/2,0,p.w,p.h,depth);
 const hinge=new T.Group();hinge.position.x=openingCenter-opening/2;root.add(hinge);const panel=new T.Group();panel.position.set(opening/2,base+openingHeight/2,0);hinge.add(panel);
 box(panel,materials.door,0,0,0,opening,openingHeight-.04,depth*.6);
 for(const sign of [-1,1])box(panel,o.doorMode==='key'?materials.star:materials.dark,opening*.3,0,sign*(depth*.3+.035),.12,.12,.07);
 root.userData={panel,hinge,arrows:[]};updateDoorModel(root,o);return root;
}
export function updateDoorModel(root,o){if(root.userData.variantLeaves){updateArchitecturalDoor(root,o);return;}const {hinge,panel}=root.userData,amount=o.doorAmount||0,direction=o.doorDirection||1;
 for(const arrow of root.userData.arrows||[])arrow.rotation.z=direction===-1?Math.PI:0;
 if(o.doorStyle)hinge.rotation.y=-direction*amount*Math.PI/2;
 else panel.visible=!o.open;
}

function makeArchitecturalDoor(o,m){
 const root=new T.Group(),{depth,opening,openingCenter,height,base,openingHeight}=doorDimensions(o);
 root.rotation.y=(o.rotation||0)*Math.PI/180;
 const box=(parent,mat,x,y,z,w,h,d)=>{const mesh=new T.Mesh(cube,mat);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;};
 const frame=m.wall||m.door;for(const p of doorFrameParts(o))box(root,frame,p.x,p.y+p.h/2,0,p.w,p.h,depth);
 const leaves=[],arrows=[];root.userData.variantLeaves=leaves;root.userData.arrows=arrows;
 if(!doorHasPanel(o))return root;
 const sliding=isSlidingDoor(o),glass=doorUsesGlass(o),count=sliding?slidingPanelCount(o):o.doorStyle==='doubleSwing'?2:1,leafWidth=opening/count,leafHeight=openingHeight-.04;
 for(let index=0;index<count;index++){const sign=count===1?(o.doorStyle==='swing'?-1:0):index%2===0?-1:1;
  const hinge=new T.Group(),panel=new T.Group(),swing=['swing','doubleSwing'].includes(o.doorStyle);
  hinge.position.set(sliding?openingCenter-opening/2+(index+.5)*leafWidth:openingCenter+(swing?sign*opening/2:sign*opening/4),base+openingHeight/2,sliding?(index%2===0?-1:1)*depth*.25:0);
  panel.position.x=swing?-sign*leafWidth/2:0;hinge.add(panel);root.add(hinge);
  const w=leafWidth-.025;
  if(glass||sliding){
   const rail=.07,insideWidth=w-rail*2,insideHeight=leafHeight-rail*2,wood=glass?(m.door||frame):frame;
   // Inset the infill on all six faces: it never shares an outer face with the wood.
   const infill=box(panel,glass?(m.glass||m.door):(m.white||m.door),0,0,0,insideWidth,insideHeight,depth*.2);infill.name=glass?'door-glass':'fusuma-paper';
   for(const side of [-1,1]){const upright=box(panel,wood,side*(w-rail)/2,0,0,rail,insideHeight,depth*.4);upright.name='leaf-upright';const cross=box(panel,wood,0,side*(leafHeight-rail)/2,0,w,rail,depth*.4);cross.name='leaf-rail';}
   if(!glass){const cross=box(panel,wood,0,0,0,insideWidth,.035,depth*.4);cross.name='leaf-middle-rail';}
  }else box(panel,m.door,0,0,0,w,leafHeight,depth*.55);
  if(o.doorVariant!=='windowGlass')for(const face of [-1,1])box(panel,m.dark,-(sign||1)*leafWidth*.32,0,face*(glass?depth*.1+.025:depth*(sliding?.18:.34)),.1,.16,.05);
  leaves.push({index,hinge,panel,sign,startX:hinge.position.x,leafWidth});
 }
 if(sliding)for(const leaf of leaves)for(const face of [-1,1]){const arrow=new T.Mesh(arrowGeometry,m.dark);arrow.position.set(0,-openingHeight*.27,face*depth*.24);arrow.scale.setScalar(Math.min(.65,leafWidth*.6));arrow.rotation.z=leaf.index%2===0?0:Math.PI;arrow.name='slide-direction';leaf.panel.add(arrow);arrows.push(arrow);}
 updateArchitecturalDoor(root,o);return root;
}
function updateArchitecturalDoor(root,o){const amount=o.doorAmount||0,direction=o.doorDirection||1,panels=isSlidingDoor(o)?slidingDoorPanels(o):[];
 for(const {index,hinge,sign,startX,leafWidth}of root.userData.variantLeaves){hinge.position.x=startX;hinge.rotation.y=0;
  if(['swing','doubleSwing'].includes(o.doorStyle))hinge.rotation.y=sign*direction*amount*Math.PI/2;
  if(isSlidingDoor(o)){const p=panels[index];hinge.position.x=p.baseX+p.delta*p.width*p.amount;}
 }
}
