import {GRID} from './building3d.js?v=20261029l';
export const RANGE_MAX=8;
export const rangeCell=value=>Math.floor((value+GRID.cell/2)/GRID.cell);
export function rangeCells(shape,cross=4,circle=2){
 const cells=[];
 for(let z=-RANGE_MAX;z<=RANGE_MAX;z++)for(let x=-RANGE_MAX;x<=RANGE_MAX;x++){
  const inCross=(x===0&&Math.abs(z)<=cross)||(z===0&&Math.abs(x)<=cross),inCircle=x*x+z*z<=circle*circle;
  if(shape==='cross'?inCross:shape==='circle'?inCircle:shape==='mixed'&&(inCross||inCircle))cells.push([x,z]);
 }return cells;
}
export function makeAttackRange(shape='circle',cross=4,circle=4){return {shape,cross,circle,cells:rangeCells(shape,cross,circle)};}
export function validAttackRange(r){
 if(r===undefined)return true;
 if(!r||!['cross','circle','mixed','custom'].includes(r.shape)||![r.cross,r.circle].every(n=>Number.isInteger(n)&&n>=1&&n<=RANGE_MAX)||!Array.isArray(r.cells)||r.cells.length>(RANGE_MAX*2+1)**2)return false;
 const seen=new Set();for(const c of r.cells){if(!Array.isArray(c)||c.length!==2||!c.every(n=>Number.isInteger(n)&&Math.abs(n)<=RANGE_MAX)||seen.has(c.join(',')))return false;seen.add(c.join(','));}
 // Preset labels must describe the saved cells accurately.
 return r.shape==='custom'||JSON.stringify([...seen].sort())===JSON.stringify(rangeCells(r.shape,r.cross,r.circle).map(c=>c.join(',')).sort());
}
const caches=new WeakMap();
export function inAttackRange(enemy,player){
 const r=enemy.attackRange;
 if(!r)return Math.hypot(player.x-enemy.x,player.z-enemy.z)<18;
 let cache=caches.get(r);if(!cache||cache.cells!==r.cells){cache={cells:r.cells,set:new Set(r.cells.map(c=>c.join(',')))};caches.set(r,cache);}
 return cache.set.has(`${rangeCell(player.x)-rangeCell(enemy.x)},${rangeCell(player.z)-rangeCell(enemy.z)}`);
}
