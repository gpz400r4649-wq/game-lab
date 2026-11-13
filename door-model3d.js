import * as T from './vendor/three.module.min.js';
import {doorDimensions,doorHasPanel,isSlidingDoor} from './doors3d.js?v=20261113c';
const cube=new T.BoxGeometry(1,1,1);
const arrowShape=new T.Shape();arrowShape.moveTo(-.55,-.07);arrowShape.lineTo(.14,-.07);arrowShape.lineTo(.14,-.24);arrowShape.lineTo(.55,0);arrowShape.lineTo(.14,.24);arrowShape.lineTo(.14,.07);arrowShape.lineTo(-.55,.07);arrowShape.closePath();
const arrowGeometry=new T.ExtrudeGeometry(arrowShape,{depth:.02,bevelEnabled:false});arrowGeometry.translate(0,0,-.01);
export function makeDoorModel(o,materials){
 if(o.doorVariant||isSlidingDoor(o))return makeArchitecturalDoor(o,materials);
 const root=new T.Group(),{width,depth,outerWidth,opening,height}=doorDimensions(o),side=(outerWidth-opening)/2;
 root.rotation.y=(o.rotation||0)*Math.PI/180;
 const box=(parent,material,x,y,z,w,h,d)=>{const mesh=new T.Mesh(cube,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;};
 for(const sign of [-1,1])box(root,materials.wall||materials.door,sign*(opening+side)/2,height/2,0,side,height,depth);
 box(root,materials.door,0,height-.05,0,opening,.1,depth);
 const hinge=new T.Group();hinge.position.x=o.doorStyle==='slide'?0:-width/2;root.add(hinge);
 // Keep the leaf's parent unscaled so the handle does not inherit the leaf's dimensions.
 const panel=new T.Group();panel.position.set(o.doorStyle==='slide'?0:width/2,height/2,0);hinge.add(panel);
 box(panel,materials.door,0,0,0,opening,Math.max(.1,height-.2),depth*.6);
 for(const sign of [-1,1])box(panel,o.doorMode==='key'?materials.star:materials.dark,width*.3,0,sign*(depth*.3+.035),.12,.12,.07);
 const arrows=[];
 if(o.doorStyle==='slide')for(const sign of [-1,1]){const arrow=new T.Mesh(arrowGeometry,materials.dark);arrow.position.set(0,height*.2,sign*(depth*.3+.025));const size=Math.min(1,opening/1.5,height/1.4);arrow.scale.set(size,size,1);arrow.name='slide-direction';panel.add(arrow);arrows.push(arrow);}
 root.userData={panel,hinge,doorWidth:width,arrows};updateDoorModel(root,o);return root;
}
export function updateDoorModel(root,o){if(root.userData.variantLeaves){updateArchitecturalDoor(root,o);return;}const {hinge,panel,doorWidth}=root.userData,amount=o.doorAmount||0,direction=o.doorDirection||1;
 for(const arrow of root.userData.arrows||[])arrow.rotation.z=direction===-1?Math.PI:0;
 if(o.doorStyle==='slide')hinge.position.x=direction*amount*doorWidth;
 else if(o.doorStyle)hinge.rotation.y=-direction*amount*Math.PI/2;
 else panel.visible=!o.open;
}

function makeArchitecturalDoor(o,m){
 const root=new T.Group(),{depth,outerWidth,opening,height,base,openingHeight}=doorDimensions(o),side=(outerWidth-opening)/2;
 root.rotation.y=(o.rotation||0)*Math.PI/180;
 const box=(parent,mat,x,y,z,w,h,d)=>{const mesh=new T.Mesh(cube,mat);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;};
 const frame=m.wall||m.door;
 for(const sign of [-1,1])box(root,frame,sign*(opening+side)/2,height/2,0,side,height,depth);
 if(base)box(root,frame,0,base/2,0,opening,base,depth);
 const header=height-base-openingHeight;box(root,frame,0,height-header/2,0,opening,header,depth);
 const leaves=[],arrows=[];root.userData.variantLeaves=leaves;root.userData.arrows=arrows;
 if(!doorHasPanel(o))return root;
 const sliding=isSlidingDoor(o),glass=(o.doorVariant||'').startsWith('window'),double=o.doorVariant!=='windowGlass',leafWidth=opening/(double?2:1),leafHeight=openingHeight-.04;
 for(const sign of double?[-1,1]:[0]){
  const hinge=new T.Group(),panel=new T.Group(),swing=o.doorStyle==='doubleSwing';
  hinge.position.set(swing?sign*opening/2:sign*opening/4,base+openingHeight/2,sliding?sign*depth*.25:0);
  panel.position.x=swing?-sign*leafWidth/2:0;hinge.add(panel);root.add(hinge);
  const w=leafWidth-.025;
  if(glass){box(panel,m.glass||m.door,0,0,0,w-.12,leafHeight-.12,depth*.22);for(const s of [-1,1]){box(panel,m.door,s*(w-.07)/2,0,0,.07,leafHeight,depth*.5);box(panel,m.door,0,s*(leafHeight-.07)/2,0,w,.07,depth*.5);}}
  else {box(panel,sliding?(m.white||m.door):m.door,0,0,0,w,leafHeight,sliding?depth*.35:depth*.55);if(sliding){for(const s of [-1,1]){box(panel,frame,s*(w-.07)/2,0,0,.07,leafHeight,sliding?depth*.4:depth*.65);box(panel,frame,0,s*(leafHeight-.07)/2,0,w,.07,sliding?depth*.4:depth*.65);}box(panel,frame,0,0,0,w,.035,sliding?depth*.4:depth*.65);}}
  if(o.doorVariant!=='windowGlass')for(const face of [-1,1])box(panel,m.dark,-(sign||1)*leafWidth*.32,0,face*depth*(sliding?.18:.34),.1,.16,.05);
  leaves.push({hinge,panel,sign,startX:hinge.position.x,leafWidth});
 }
 if(sliding)for(const face of [-1,1]){const arrow=new T.Mesh(arrowGeometry,m.dark);arrow.position.set(0,-openingHeight*.27,face*depth*.24);arrow.scale.setScalar(Math.min(.65,leafWidth*.6));arrow.name='slide-direction';arrows.push(arrow);}
 updateArchitecturalDoor(root,o);return root;
}
function updateArchitecturalDoor(root,o){const amount=o.doorAmount||0,direction=o.doorDirection||1;
 const moving=root.userData.variantLeaves.find(leaf=>leaf.sign===-direction);if(isSlidingDoor(o)&&moving)for(const arrow of root.userData.arrows){if(arrow.parent!==moving.panel)moving.panel.add(arrow);arrow.rotation.z=direction===-1?Math.PI:0;}
 for(const {hinge,sign,startX,leafWidth}of root.userData.variantLeaves){hinge.position.x=startX;hinge.rotation.y=0;
  if(o.doorStyle==='doubleSwing')hinge.rotation.y=sign*direction*amount*Math.PI/2;
  if(isSlidingDoor(o)&&sign===-direction)hinge.position.x=startX+direction*amount*leafWidth;
 }
}
