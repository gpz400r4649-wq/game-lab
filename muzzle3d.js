import {gunLayout} from './appearance3d.js?v=20261030f';
export const TPS_GUN_MOUNT=Object.freeze({x:.45,y:1,z:-.25,scale:.6});
export function playerGunMuzzle(player,tool,yaw=0){const m=gunLayout(tool).muzzle,mount=TPS_GUN_MOUNT,x=mount.x+m.x*mount.scale,z=mount.z+m.z*mount.scale;return {x:player.x+x*Math.cos(yaw)+z*Math.sin(yaw),y:player.y+mount.y+m.y*mount.scale,z:player.z-x*Math.sin(yaw)+z*Math.cos(yaw)};}
export const finitePoint=p=>!!p&&['x','y','z'].every(k=>Number.isFinite(p[k]));
