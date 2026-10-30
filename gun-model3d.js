import * as T from './vendor/three.module.min.js';
import {gunLayout} from './appearance3d.js?v=20261030k';
// Keep the established lower-right position and size. Calibration rotation
// affects the anchor calculation only; the displayed barrel faces camera-forward.
export const FPS_FRAMING=Object.freeze({muzzle:Object.freeze({x:.56,y:.57,depth:.64}),grip:Object.freeze({x:.85,y:1.06,depth:.36})});
export function applyFPSGunPose(group,tool,aspect,fov=65){
 const {parts,muzzle}=gunLayout(tool),grip=parts.find(p=>p.role==='grip'),tan=Math.tan(fov*Math.PI/360);
 const at=p=>new T.Vector3((p.x*2-1)*p.depth*tan*aspect,(1-p.y*2)*p.depth*tan,-p.depth),a=at(FPS_FRAMING.muzzle),b=at(FPS_FRAMING.grip),sourceA=new T.Vector3(muzzle.x,muzzle.y,muzzle.z),sourceB=new T.Vector3(grip.x,grip.y,grip.z),source=sourceA.clone().sub(sourceB),target=a.clone().sub(b),scale=target.length()/source.length();
 const calibration=new T.Quaternion().setFromUnitVectors(source.normalize(),target.normalize());group.scale.setScalar(scale);group.position.copy(b).sub(sourceB.multiplyScalar(scale).applyQuaternion(calibration));group.quaternion.identity();group.updateMatrix();
}
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

export function worldGunMuzzle(model){const muzzle=model?.userData.muzzle;if(!muzzle)return null;model.updateWorldMatrix(true,false);return new T.Vector3(muzzle.x,muzzle.y,muzzle.z).applyMatrix4(model.matrixWorld);}
