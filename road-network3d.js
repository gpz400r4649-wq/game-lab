import {savedRoadPath} from './road3d.js?v=20261125d';

const LEVEL_TOLERANCE=.28,CELL=16;
const clamp=value=>Math.max(0,Math.min(1,value));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z,a.y-b.y);
const at=(segment,t)=>({x:segment.a.x+segment.dx*t,y:segment.a.y+segment.dy*t,z:segment.a.z+segment.dz*t});
const project=(segment,point)=>clamp(((point.x-segment.a.x)*segment.dx+(point.z-segment.a.z)*segment.dz)/segment.length2);
const coordinate=point=>({x:point.x,y:point.y||0,z:point.z});

function heapPush(heap,item){
 let i=heap.length;heap.push(item);
 while(i>0){
  const parent=(i-1)>>1;if(heap[parent].cost<=item.cost)break;
  heap[i]=heap[parent];i=parent;
 }
 heap[i]=item;
}
function heapPop(heap){
 const first=heap[0],last=heap.pop();
 if(!heap.length)return first;
 let i=0;
 while(i*2+1<heap.length){
  let child=i*2+1;
  if(child+1<heap.length&&heap[child+1].cost<heap[child].cost)child++;
  if(last.cost<=heap[child].cost)break;
  heap[i]=heap[child];i=child;
 }
 heap[i]=last;return first;
}

export function createRoadNetwork(roads=[]){
 const nodes=[],segments=[],links=[],ends=[],buckets=new Map(),long=[];
 function node(point){const next={...coordinate(point),edges:[]};nodes.push(next);return next;}
 function edge(a,b){
  if(a===b)return;
  const distance=Math.max(.00001,dist(a,b));
  a.edges.push({to:b,distance});b.edges.push({to:a,distance});
 }
 function cut(segment,t){
  const old=segment.cuts.find(item=>Math.abs(item.t-t)<.00001);
  if(old)return old.node;
  const item={t,node:node(at(segment,t))};segment.cuts.push(item);return item.node;
 }
 function connect(a,t,b,u,maximumGap){
  const p=at(a,t),q=at(b,u);
  if(Math.abs(p.y-q.y)>LEVEL_TOLERANCE||Math.hypot(p.x-q.x,p.z-q.z)>maximumGap)return;
  links.push([cut(a,t),cut(b,u)]);
 }
 function cross(a,b){
  if(a.road===b.road)return;
  const det=a.dx*b.dz-a.dz*b.dx;
  if(Math.abs(det)<1e-8)return;
  const x=b.a.x-a.a.x,z=b.a.z-a.a.z,t=(x*b.dz-z*b.dx)/det,u=(x*a.dz-z*a.dx)/det;
  if(t>=-.00001&&t<=1.00001&&u>=-.00001&&u<=1.00001)connect(a,clamp(t),b,clamp(u),.01);
 }
 function cells(minX,maxX,minZ,maxZ){
  const left=Math.floor(minX/CELL),right=Math.floor(maxX/CELL),near=Math.floor(minZ/CELL),far=Math.floor(maxZ/CELL);
  if((right-left+1)*(far-near+1)>96)return null;
  const keys=[];
  for(let x=left;x<=right;x++)for(let z=near;z<=far;z++)keys.push(x+':'+z);
  return keys;
 }
 function query(keys){return keys?new Set([...long,...keys.flatMap(key=>buckets.get(key)||[])]):segments;}
 for(const road of roads){
  const path=savedRoadPath(road);
  if(path.length<2)continue;
  let a=node(path[0]),first=a,startSegment=null,endSegment=null;
  for(let i=1;i<path.length;i++){
   const p=coordinate(path[i]),dx=p.x-a.x,dz=p.z-a.z,length2=dx*dx+dz*dz;
   if(length2<1e-8)continue;
   const b=road.closed&&i===path.length-1?first:node(p);
   const s={a,b,dx,dz,dy:b.y-a.y,length2,road,cuts:[{t:0,node:a},{t:1,node:b}]};
   const keys=cells(Math.min(a.x,b.x),Math.max(a.x,b.x),Math.min(a.z,b.z),Math.max(a.z,b.z));
   for(const before of query(keys))cross(s,before);
   if(keys)for(const key of keys){if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(s);}
   else long.push(s);
   segments.push(s);a=b;startSegment??=s;endSegment=s;
  }
  if(!road.closed&&startSegment)ends.push([startSegment,0],[endSegment,1]);
 }
 for(const [s,t] of ends){
  const p=at(s,t),nearby=new Map();
  for(const neighbor of query(cells(p.x-9,p.x+9,p.z-9,p.z+9))){
   if(neighbor.road===s.road)continue;
   const cosine=Math.abs(s.dx*neighbor.dx+s.dz*neighbor.dz)/Math.sqrt(s.length2*neighbor.length2);
   const u=project(neighbor,p),hit=at(neighbor,u),gap=Math.hypot(hit.x-p.x,hit.z-p.z);
   if(Math.abs(hit.y-p.y)>LEVEL_TOLERANCE||gap>(cosine>.92?.32:neighbor.road.width/2+.04)||gap>=(nearby.get(neighbor.road)?.gap??Infinity))continue;
   nearby.set(neighbor.road,{neighbor,u,gap});
  }
  for(const {neighbor,u,gap} of nearby.values())connect(s,t,neighbor,u,gap+.00001);
 }
 for(const s of segments){
  s.cuts.sort((a,b)=>a.t-b.t);
  for(let i=1;i<s.cuts.length;i++)edge(s.cuts[i-1].node,s.cuts[i].node);
 }
 for(const [a,b] of links)edge(a,b);

 function anchor(point,roadId,range){
  if(!point)return null;
  const p=coordinate(point);let best=null,score=Infinity;
  for(const s of query(cells(p.x-range,p.x+range,p.z-range,p.z+range))){
   if(roadId&&s.road.id!==roadId)continue;
   const t=project(s,p),hit=at(s,t),gap=dist(p,hit);
   if(gap<score&&gap<=range&&Math.abs(hit.y-p.y)<=.75){best={s,t,point:hit};score=gap;}
  }
  return best;
 }
 function neighbors({s,t,point}){
  const i=s.cuts.findIndex(cut=>cut.t>=t);
  return s.cuts.slice(Math.max(0,i-1),i+1).map(({node})=>({node,cost:dist(point,node)}));
 }
 return {
  route(from,to,{fromRoad,toRoad,range=10}={}){
   const start=anchor(from,fromRoad,range),end=anchor(to,toRoad,range);
   if(!start||!end)return null;
   if(start.s===end.s)return [start.point,end.point];
   const queue=[],costs=new Map(),previous=new Map(),targets=new Map(neighbors(end).map(({node,cost})=>[node,cost]));
   for(const entry of neighbors(start)){heapPush(queue,entry);costs.set(entry.node,entry.cost);}
   let best=null,bestCost=Infinity;
   while(queue.length){
    const {node,cost}=heapPop(queue);
    if(cost>=bestCost)break;
    if(cost!==costs.get(node))continue;
    if(targets.has(node)&&cost+targets.get(node)<bestCost){best=node;bestCost=cost+targets.get(node);}
    for(const {to,distance} of node.edges){
     const next=cost+distance;
     if(next>=(costs.get(to)??Infinity))continue;
     costs.set(to,next);previous.set(to,node);heapPush(queue,{node:to,cost:next});
    }
   }
   if(!best)return null;
   const route=[end.point];
   for(let cursor=best;cursor;cursor=previous.get(cursor))route.push(coordinate(cursor));
   route.push(start.point);route.reverse();
   return route.filter((p,i)=>!i||dist(p,route[i-1])>.00001);
  }
 };
}
