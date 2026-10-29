import * as T from './vendor/three.module.min.js';
import {gunLayout} from './appearance3d.js?v=20261029g';
// Restore the original FPS body anchor used before editable gun looks.
export const FPS_GUN_POSITION=Object.freeze([.23,-.23,-.52]);
const cube=new T.BoxGeometry(),tube=new T.CylinderGeometry(1,1,1,12,1,true),drum=new T.CylinderGeometry(1,1,1,12),disk=new T.CircleGeometry(1,12),rim=new T.RingGeometry(.68,1,12),materials=new Map();
function material(color){if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.65,side:T.DoubleSide}));return materials.get(color);}
export function makeGunModel(tool){const {parts,muzzle}=gunLayout(tool),group=new T.Group();group.userData.muzzle=muzzle;
 for(const p of parts){const m=new T.Mesh(p.type==='box'?cube:p.type==='drum'?drum:tube,material(p.color));m.userData.role=p.role;m.position.set(p.x,p.y,p.z);if(p.type==='box')m.scale.set(p.w,p.h,p.d);else{m.rotation[p.type==='drum'&&p.axis!=='z'?'z':'x']=Math.PI/2;m.scale.set(p.radius,p.length,p.radius);}group.add(m);
  if(p.type==='tube'){
   const front=p.z-p.length/2,rear=p.z+p.length/2;
   const ring=new T.Mesh(rim,material(p.color));ring.rotation.y=Math.PI;ring.scale.setScalar(p.radius);ring.position.set(p.x,p.y,front);ring.userData.role=p.role+'Muzzle';group.add(ring);
   const opening=new T.Mesh(disk,material('#27334a'));opening.rotation.y=Math.PI;opening.scale.setScalar(p.radius*.67);opening.position.set(p.x,p.y,front+.025);group.add(opening);
   const cap=new T.Mesh(disk,material(p.color));cap.scale.setScalar(p.radius);cap.position.set(p.x,p.y,rear);cap.userData.role=p.role+'Rear';group.add(cap);
  }
 }
 return group;}
