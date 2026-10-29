import {GRID} from './building3d.js?v=20261029v';
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
 if(!r||r.space!==undefined||!['cross','circle','mixed','custom'].includes(r.shape)||![r.cross,r.circle].every(n=>Number.isInteger(n)&&n>=1&&n<=RANGE_MAX)||!Array.isArray(r.cells)||r.cells.length>(RANGE_MAX*2+1)**2)return false;
 const seen=new Set();for(const c of r.cells){if(!Array.isArray(c)||c.length!==2||!c.every(n=>Number.isInteger(n)&&Math.abs(n)<=RANGE_MAX)||seen.has(c.join(',')))return false;seen.add(c.join(','));}
 // Preset labels must describe the saved cells accurately.
 return r.shape==='custom'||JSON.stringify([...seen].sort())===JSON.stringify(rangeCells(r.shape,r.cross,r.circle).map(c=>c.join(',')).sort());
}
const caches=new WeakMap();
export function inGridRange(r,center,point){
 let cache=caches.get(r);if(!cache||cache.cells!==r.cells){cache={cells:r.cells,set:new Set(r.cells.map(c=>c.join(',')))};caches.set(r,cache);}
 return cache.set.has(`${rangeCell(point.x)-rangeCell(center.x)},${rangeCell(point.z)-rangeCell(center.z)}`);
}
export function inAttackRange(enemy,player){return enemy.attackRange?inGridRange(enemy.attackRange,enemy,player):Math.hypot(player.x-enemy.x,player.z-enemy.z)<18;}

export const MOVE_MAX_CELLS=1024,WORLD_CELL_MAX=120;
export function validMoveRange(r){
 if(r===undefined)return true;if(r?.space!=='world')return validAttackRange(r);
 if(!Array.isArray(r.cells)||r.cells.length>MOVE_MAX_CELLS)return false;const seen=new Set();
 for(const c of r.cells){if(!Array.isArray(c)||c.length!==2||!c.every(n=>Number.isInteger(n)&&Math.abs(n)<=WORLD_CELL_MAX)||seen.has(c.join(',')))return false;seen.add(c.join(','));}return true;
}
export function worldMoveRange(r,enemy){
 if(r===undefined)return undefined;if(r.space==='world')return structuredClone(r);
 const x=rangeCell(enemy.x),z=rangeCell(enemy.z);return {space:'world',cells:r.cells.map(([dx,dz])=>[x+dx,z+dz]).filter(c=>c.every(n=>Math.abs(n)<=WORLD_CELL_MAX))};
}
export const movementCenter=o=>o.moveRange?.space==='world'?{x:0,z:0}:o.origin||o;
