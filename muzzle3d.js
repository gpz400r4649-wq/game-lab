import {gunLayout} from './appearance3d.js?v=20261111d';
export const TPS_GUN_MOUNT=Object.freeze({x:.45,y:1,z:-.25,scale:.6});
export const ROBOT_BARREL=Object.freeze({x:.45,y:1,z:-.34,width:.15,height:.17,length:.65});
function worldPoint(body,x,y,z,yaw){
 const size=body.enemyScale||1,cos=Math.cos(yaw),sin=Math.sin(yaw);
 return {x:body.x+(x*cos+z*sin)*size,y:body.y+y*size,z:body.z+(-x*sin+z*cos)*size};
}
export function playerGunMuzzle(body,tool,yaw=0){
 const m=gunLayout(tool).muzzle,mount=TPS_GUN_MOUNT;
 return worldPoint(body,mount.x+m.x*mount.scale,mount.y+m.y*mount.scale,mount.z+m.z*mount.scale,yaw);
}
export function enemyGunMuzzle(body,tool,yaw){
 if(tool)return playerGunMuzzle(body,tool,yaw);
 const barrel=ROBOT_BARREL;
 return worldPoint(body,barrel.x,barrel.y,barrel.z-barrel.length/2,yaw);
}
export const finitePoint=p=>!!p&&['x','y','z'].every(k=>Number.isFinite(p[k]));
