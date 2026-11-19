import {GRID} from './building3d.js?v=20261119d';
import {worldHalf,coordinateLimit} from './world3d.js?v=20261119d';
import {MAX_BUILD_Y} from './limits3d.js?v=20261119d';

export const ROAD_WIDTHS=[4,8,12,16];
export const MAX_ROADS=16;
export const MAX_ROAD_POINTS=64;
export const ROAD_HEIGHT_STEP=1.5;
export const MAX_ROAD_HEIGHT=MAX_BUILD_Y;
export const ROAD_DECK_DEPTH=.32;
const ROAD_GRID_STEP=GRID.cell/2;
const MIN_SPACING=ROAD_GRID_STEP;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,
 ...(a.y||b.y?{y:(a.y||0)+((b.y||0)-(a.y||0))*t}:{})});

export function roadPoint(ground,world){
 if(!ground||!Number.isFinite(ground.x)||!Number.isFinite(ground.z))return null;
 const half=worldHalf(world);
 if(Math.abs(ground.x)>half||Math.abs(ground.z)>half)return null;
 const limit=coordinateLimit(world),snap=value=>Math.max(-limit,Math.min(limit,Math.round(value/ROAD_GRID_STEP)*ROAD_GRID_STEP))+0;
 return {x:snap(ground.x),z:snap(ground.z)};
}

export function roadGridSites(ground,world){
 if(!roadPoint(ground,world))return [];
 const limit=coordinateLimit(world);
 // The visible cell edges are at 4n + 2, with one point on each half-cell.
 const edge=value=>Math.max(-limit,Math.min(limit-GRID.cell,Math.floor((value+ROAD_GRID_STEP)/GRID.cell)*GRID.cell-ROAD_GRID_STEP));
 const x=edge(ground.x),z=edge(ground.z);
 const offsets=[0,ROAD_GRID_STEP,GRID.cell];
 return offsets.flatMap(dz=>offsets.map(dx=>({x:x+dx,z:z+dz})));
}

export function nearestRoadHandle(points,ground,radius=2.5){
 let nearest=-1,distanceToHandle=radius;
 for(const [index,point] of points.entries()){
  const gap=distance(point,ground);
  if(gap<distanceToHandle){nearest=index;distanceToHandle=gap;}
 }
 return nearest;
}

export function roadPointsFit(points,closed){
 if(closed&&points.length<3)return false;
 const fits=(a,b)=>{
  const span=distance(a,b);
  return span>=MIN_SPACING&&Math.abs((a.y||0)-(b.y||0))<=span;
 };
 return points.every((point,index)=>!index||fits(points[index-1],point))&&(!closed||fits(points[0],points.at(-1)));
}

export function validRoads(roads,world){
 if(roads===undefined)return true;
 if(!Array.isArray(roads)||roads.length>MAX_ROADS)return false;
 const limit=coordinateLimit(world),ids=new Set();
 for(const road of roads){
  if(!road||typeof road.id!=='string'||!road.id||road.id.length>80||ids.has(road.id)||!ROAD_WIDTHS.includes(road.width)||typeof road.closed!=='boolean'||!Array.isArray(road.points)||road.points.length<2||road.points.length>MAX_ROAD_POINTS)return false;
  if(!road.points.every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.abs(p.x)<=limit&&Math.abs(p.z)<=limit&&
   (p.y===undefined||Number.isFinite(p.y)&&p.y>=0&&p.y<=MAX_ROAD_HEIGHT))||!roadPointsFit(road.points,road.closed))return false;
  ids.add(road.id);
 }
 return true;
}

// Cut a little off the two sides of each corner. The curve is tangent to both
// straight sections, and all its points stay inside the corner’s triangle.
export function sampleRoad(road){
 const {points,width,closed}=road;
 if(points.length<3)return points.map(point=>({...point}));
 const path=[];
 for(const [index,point] of points.entries()){
  if(!closed&&(index===0||index===points.length-1)){path.push({...point});continue;}
  const previous=points[(index+points.length-1)%points.length],next=points[(index+1)%points.length];
  const from=distance(previous,point),to=distance(next,point);
  if(from<.001||to<.001){path.push({...point});continue;}
  const cut=Math.min(from*.4,to*.4,width*1.4);
  const entry=lerp(point,previous,cut/from),exit=lerp(point,next,cut/to);
  for(let step=0;step<=12;step++){
   const t=step/12;path.push(lerp(lerp(entry,point,t),lerp(point,exit,t),t));
  }
 }
 if(closed)path.push({...path[0]});
 return path;
}

const roadPaths=new WeakMap();
export function savedRoadPath(road){
 let path=roadPaths.get(road);
 if(!path){path=sampleRoad(road);roadPaths.set(road,path);}
 return path;
}

function bearing(a,b){
 const x=b.x-a.x,z=b.z-a.z,length=Math.hypot(x,z);
 return length<.0001?null:{x:-z/length,z:x/length};
}
export function roadSections(path,closed){
 return path.map((point,i)=>{
  const previous=i?path[i-1]:closed?path.at(-2):null;
  const next=path[i+1]||(closed?path[1]:null);
  const left=previous&&bearing(previous,point),right=next&&bearing(point,next);
  const normal=left||right||{x:1,z:0};
  if(!left||!right)return {...point,nx:normal.x,nz:normal.z};
  const x=left.x+right.x,z=left.z+right.z,length=Math.hypot(x,z);
  if(length<.05)return {...point,nx:right.x,nz:right.z};
  const scale=Math.min(1.5,1/Math.max(.1,(x*right.x+z*right.z)/length))/length;
  return {...point,nx:x*scale,nz:z*scale};
 });
}
export function roadVertex(point,offset,half){
 const clip=value=>Math.max(-half,Math.min(half,value));
 return {x:clip(point.x+point.nx*offset),y:point.y||0,z:clip(point.z+point.nz*offset)};
}

export function createRoadSurfaceQuery(roads=[],world){
 const half=worldHalf(world),cell=16,buckets=new Map(),long=[];
 for(const road of roads){
  if(!road.points.some(point=>point.y>0))continue;
  const path=roadSections(savedRoadPath(road),road.closed),radius=road.width/2;
  for(let i=1;i<path.length;i++){
   const a=path[i-1],b=path[i];
   const p=roadVertex(a,-radius,half),q=roadVertex(a,radius,half),r=roadVertex(b,radius,half),s=roadVertex(b,-radius,half);
   for(const [first,second,third] of [[p,q,r],[p,r,s]]){
    const ux=second.x-first.x,uz=second.z-first.z,vx=third.x-first.x,vz=third.z-first.z,det=ux*vz-uz*vx;
    if(Math.abs(det)<1e-7)continue;
    const minX=Math.min(first.x,second.x,third.x),maxX=Math.max(first.x,second.x,third.x);
    const minZ=Math.min(first.z,second.z,third.z),maxZ=Math.max(first.z,second.z,third.z);
    const uy=second.y-first.y,vy=third.y-first.y;
    const triangle={first,ux,uz,vx,vz,det,minX,maxX,minZ,maxZ,
     slopeX:(uy*vz-vy*uz)/det,slopeZ:(ux*vy-vx*uy)/det};
    const left=Math.floor(minX/cell),right=Math.floor(maxX/cell),near=Math.floor(minZ/cell),far=Math.floor(maxZ/cell);
    if((right-left+1)*(far-near+1)>64){long.push(triangle);continue;}
    for(let x=left;x<=right;x++)for(let z=near;z<=far;z++){
     const key=x+':'+z;
     if(!buckets.has(key))buckets.set(key,[]);
     buckets.get(key).push(triangle);
    }
   }
  }
 }
 return (x,z)=>{
  const matches=[],local=buckets.get(Math.floor(x/cell)+':'+Math.floor(z/cell))||[];
  for(const triangles of [local,long])for(const t of triangles){
   if(x<t.minX||x>t.maxX||z<t.minZ||z>t.maxZ)continue;
   const dx=x-t.first.x,dz=z-t.first.z,u=(dx*t.vz-dz*t.vx)/t.det,v=(t.ux*dz-t.uz*dx)/t.det;
   if(u<-.000001||v<-.000001||u+v>1.000001)continue;
   matches.push({y:t.first.y+t.slopeX*dx+t.slopeZ*dz,slopeX:t.slopeX,slopeZ:t.slopeZ});
  }
  return matches;
 };
}

function closestOnPath(path,point,maxGap,last=path.length-1,maxHeightGap=Infinity){
 let nearest=null,best=maxGap*maxGap;
 for(let index=1;index<=last;index++){
  const a=path[index-1],b=path[index],dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
  if(length<.000001)continue;
  const fraction=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.z-a.z)*dz)/length));
  const x=a.x+dx*fraction,z=a.z+dz*fraction,y=(a.y||0)+((b.y||0)-(a.y||0))*fraction;
  const vertical=Number.isFinite(point.y)?Math.abs(y-point.y):0;
  const gap=(x-point.x)**2+(z-point.z)**2,score=gap+vertical**2;
  if(vertical<=maxHeightGap&&score<best){best=score;nearest={x,y,z,heading:Math.atan2(-dx,-dz),gap,score,index,fraction};}
 }
 return nearest;
}

export function nearestRoad(roads,point,maxHeightGap=Infinity){
 let nearest=null;
 for(const road of roads||[]){
  const match=closestOnPath(savedRoadPath(road),point,road.width/2+.65,undefined,maxHeightGap);
  if(match&&(!nearest||match.score<nearest.score)){
   const {x,y,z,heading,gap,score}=match;
   nearest={x,y,z,heading,gap,score,width:road.width,roadId:road.id};
  }
 }
 return nearest;
}

export function lapRoadMarkers(road,point,heading){
 const path=savedRoadPath(road),start=closestOnPath(path,point,road.width/2+.65);
 if(!start)return [];
 const lengths=[0];
 for(let i=1;i<path.length;i++)lengths.push(lengths[i-1]+distance(path[i-1],path[i]));
 const length=lengths.at(-1);
 const offset=lengths[start.index-1]+start.fraction*(lengths[start.index]-lengths[start.index-1]);
 const direction=Math.cos(heading-start.heading)>=0?1:-1;
 return [.25,.5,.75].map(portion=>{
  const at=((offset+direction*length*portion)%length+length)%length;
  const index=lengths.findIndex(value=>value>at);
  const a=path[index-1],b=path[index];
  const position=lerp(a,b,(at-lengths[index-1])/(lengths[index]-lengths[index-1]));
  return {...position,heading:Math.atan2(direction*(a.x-b.x),direction*(a.z-b.z))};
 });
}

export function courseStart(project){
 const road=project.template==='car'&&project.roads?.[0];
 if(!road)return project.spawn;
 const path=savedRoadPath(road);
 const {x,z}=road.points[0];
 const start=closestOnPath(path,{x,z},Infinity,road.closed?12:1);
 return start?{x:start.x,y:start.y,z:start.z,heading:start.heading}:project.spawn;
}
