// Cache static structures; update only parts whose bounds actually moved.
const CELL=8;
function bounds(o){return [Math.floor((o.x-o.w/2)/CELL),Math.floor((o.x+o.w/2)/CELL),Math.floor((o.z-o.d/2)/CELL),Math.floor((o.z+o.d/2)/CELL)];}
function add(index,o,box){for(let x=box[0];x<=box[1];x++)for(let z=box[2];z<=box[3];z++){const key=x+':'+z;let list=index.cells.get(key);if(!list)index.cells.set(key,list=new Set());list.add(o);}}
function remove(index,o,box){for(let x=box[0];x<=box[1];x++)for(let z=box[2];z<=box[3];z++){const key=x+':'+z,list=index.cells.get(key);list?.delete(o);if(!list?.size)index.cells.delete(key);}}
function snapshot(o){return {x:o.x,z:o.z,w:o.w,d:o.d,box:bounds(o)};}
export function nearbyObjects(g,minX,minZ,maxX=minX,maxZ=minZ){
 let index=g._spatial;
 if(!index||index.objects!==g.objects||index.count!==g.objects.length){
  index=g._spatial={time:g.time,objects:g.objects,count:g.objects.length,cells:new Map(),positions:new Map()};for(const o of g.objects){const state=snapshot(o);index.positions.set(o,state);add(index,o,state.box);}
 }else if(index.time!==g.time){
  for(const o of g.objects){const previous=index.positions.get(o);if(!previous){g._spatial=null;return nearbyObjects(g,minX,minZ,maxX,maxZ);}if(previous.x!==o.x||previous.z!==o.z||previous.w!==o.w||previous.d!==o.d){if(previous)remove(index,o,previous.box);const state=snapshot(o);index.positions.set(o,state);add(index,o,state.box);}}index.time=g.time;
 }
 const result=new Set();for(let x=Math.floor(minX/CELL);x<=Math.floor(maxX/CELL);x++)for(let z=Math.floor(minZ/CELL);z<=Math.floor(maxZ/CELL);z++)for(const o of index.cells.get(x+':'+z)||[])result.add(o);return [...result];
}
