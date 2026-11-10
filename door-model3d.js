import * as T from './vendor/three.module.min.js';
import {doorDimensions} from './doors3d.js?v=20261111a';
const cube=new T.BoxGeometry(1,1,1);
const arrowShape=new T.Shape();arrowShape.moveTo(-.55,-.07);arrowShape.lineTo(.14,-.07);arrowShape.lineTo(.14,-.24);arrowShape.lineTo(.55,0);arrowShape.lineTo(.14,.24);arrowShape.lineTo(.14,.07);arrowShape.lineTo(-.55,.07);arrowShape.closePath();
const arrowGeometry=new T.ExtrudeGeometry(arrowShape,{depth:.02,bevelEnabled:false});arrowGeometry.translate(0,0,-.01);
export function makeDoorModel(o,materials){
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
export function updateDoorModel(root,o){const {hinge,panel,doorWidth}=root.userData,amount=o.doorAmount||0,direction=o.doorDirection||1;
 for(const arrow of root.userData.arrows||[])arrow.rotation.z=direction===-1?Math.PI:0;
 if(o.doorStyle==='slide')hinge.position.x=direction*amount*doorWidth;
 else if(o.doorStyle)hinge.rotation.y=-direction*amount*Math.PI/2;
 else panel.visible=!o.open;
}
