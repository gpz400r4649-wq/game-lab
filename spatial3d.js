// Rebuilt once per simulation step; moving and newly built parts join immediately.
const CELL=8;
export function nearbyObjects(g,minX,minZ,maxX=minX,maxZ=minZ){
 let index=g._spatial;
 if(!index||index.time!==g.time||index.objects!==g.objects||index.count!==g.objects.length){
  const cells=new Map();for(const o of g.objects){for(let x=Math.floor((o.x-o.w/2)/CELL);x<=Math.floor((o.x+o.w/2)/CELL);x++)for(let z=Math.floor((o.z-o.d/2)/CELL);z<=Math.floor((o.z+o.d/2)/CELL);z++){const key=x+':'+z;let list=cells.get(key);if(!list)cells.set(key,list=[]);list.push(o);}}
  index=g._spatial={time:g.time,objects:g.objects,count:g.objects.length,cells};
 }
 const result=new Set();for(let x=Math.floor(minX/CELL);x<=Math.floor(maxX/CELL);x++)for(let z=Math.floor(minZ/CELL);z<=Math.floor(maxZ/CELL);z++)for(const o of index.cells.get(x+':'+z)||[])result.add(o);return [...result];
}
