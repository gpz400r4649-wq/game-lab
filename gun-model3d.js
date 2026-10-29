import * as T from './vendor/three.module.min.js';
import {appearanceFor} from './appearance3d.js?v=20261029d';
const cube=new T.BoxGeometry(),tube=new T.CylinderGeometry(1,1,1,10),materials=new Map();
function material(color){if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.65}));return materials.get(color);}
export function makeGunModel(tool){const a=appearanceFor(tool),group=new T.Group();function box(color,x,y,z,w,h,d){const m=new T.Mesh(cube,material(color));m.position.set(x,y,z);m.scale.set(w,h,d);group.add(m);return m;}
 box(a.color,0,0,0,.3,.24,a.shape==='rifle'?.85:.55);box(a.accent,0,-.24,.12,.16,.3,.2);
 if(a.shape==='launcher'){const barrel=new T.Mesh(tube,material(a.accent));barrel.rotation.x=Math.PI/2;barrel.scale.set(.23,.7*a.barrel,.23);barrel.position.set(0,.03,-.4);group.add(barrel);box(a.color,0,.22,-.15,.15,.12,.25);}
 else{box(a.accent,0,.015,-.3-.28*a.barrel,.13,.14,.55*a.barrel);if(a.shape==='rifle'){box(a.accent,0,0,.55,.2,.22,.3);box(a.accent,0,.2,-.08,.13,.12,.35);}}
 return group;}
