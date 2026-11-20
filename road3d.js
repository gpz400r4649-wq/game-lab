import {GRID} from './building3d.js?v=20261119d';
import {worldHalf,coordinateLimit} from './world3d.js?v=20261119d';
import {MAX_BUILD_Y} from './limits3d.js?v=20261119d';

export const ROAD_WIDTHS=[4,8,12,16];
export const MAX_ROADS=16;
export const MAX_ROAD_POINTS=64;
export const ROAD_HEIGHT_STEP=1.5;
export const MAX_ROAD_HEIGHT=MAX_BUILD_Y;
export const ROAD_DECK_DEPTH=.32;
export const ROAD_BARRIERS=Object.freeze({
 mini:{height:.45,thickness:.16,bottom:0},
 highway:{height:1.05,thickness:.38,bottom:0},
 guardrail:{height:.83,thickness:.14,bottom:.54}
});
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

export function traceRoadPoints(road,samples,world){
 if(!samples.length||road.points.length>=MAX_ROAD_POINTS)return road.points;
 // Keep the ends and the bends of a stroke, leaving out small finger movements.
 const ends=new Set([0,samples.length-1]),spans=[[0,samples.length-1]];
 const tolerance=Math.max(1.25,road.width*.16);
 while(spans.length&&ends.size<MAX_ROAD_POINTS-road.points.length){
  const [start,end]=spans.pop(),a=samples[start],b=samples[end];
  const dx=b.x-a.x,dz=b.z-a.z,length2=dx*dx+dz*dz;
  let index=-1,furthest=tolerance;
  for(let i=start+1;i<end;i++){
   const x=samples[i].x-a.x,z=samples[i].z-a.z;
   const t=length2?Math.max(0,Math.min(1,(x*dx+z*dz)/length2)):0;
   const gap=Math.hypot(x-t*dx,z-t*dz);
   if(gap>furthest){index=i;furthest=gap;}
  }
  if(index>=0){ends.add(index);spans.push([start,index],[index,end]);}
 }
 const points=[...road.points],height=points.at(-1)?.y||0;
 for(const index of [...ends].sort((a,b)=>a-b)){
  const point=roadPoint(samples[index],world);
  const limit=index===samples.length-1?MAX_ROAD_POINTS:MAX_ROAD_POINTS-1;
  if(!point||points.length>=limit)continue;
  if(height)point.y=height;
  if(points.length&&distance(points.at(-1),point)<MIN_SPACING)continue;
  points.push(point);
 }
 // A drag almost back to the first point should still allow the loop tool.
 if(points.length>2&&points.length>road.points.length&&distance(points[0],points.at(-1))<MIN_SPACING)points.pop();
 return points.length>road.points.length&&roadPointsFit(points,road.closed)?points:road.points;
}

export function validRoads(roads,world){
 if(roads===undefined)return true;
 if(!Array.isArray(roads)||roads.length>MAX_ROADS)return false;
 const limit=coordinateLimit(world),ids=new Set();
 for(const road of roads){
  if(!road||typeof road.id!=='string'||!road.id||road.id.length>80||ids.has(road.id)||!ROAD_WIDTHS.includes(road.width)||typeof road.closed!=='boolean'||!Array.isArray(road.points)||road.points.length<2||road.points.length>MAX_ROAD_POINTS)return false;
  if(road.barrier!==undefined&&(typeof road.barrier!=='string'||!Object.hasOwn(ROAD_BARRIERS,road.barrier)))return false;
  if(road.markings!==undefined&&road.markings!=='street')return false;
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

export function roadBarrierOffset(road,side){return side*(road.width/2-.12);}

// Keep the portions of a line that are outside other roads at the same level.
export function createRoadOpenings(roads,half){
 if(roads.length<2)return ()=>[[0,1]];
 const cell=16,buckets=new Map(),long=[],triangles=[];
 for(const road of roads){
  const sections=roadSections(savedRoadPath(road),road.closed),radius=road.width/2;
  const sides=sections.map(point=>[roadVertex(point,-radius,half),roadVertex(point,radius,half)]);
  for(let i=1;i<sides.length;i++){
   const [a,b]=sides[i-1],[d,c]=sides[i];
   for(const [p,q,r] of [[a,b,c],[a,c,d]]){
    const ux=q.x-p.x,uz=q.z-p.z,vx=r.x-p.x,vz=r.z-p.z,det=ux*vz-uz*vx;
    if(Math.abs(det)<1e-8)continue;
    const t={id:road.id,p,ux,uz,vx,vz,det,uy:q.y-p.y,vy:r.y-p.y,minX:Math.min(p.x,q.x,r.x),maxX:Math.max(p.x,q.x,r.x),minZ:Math.min(p.z,q.z,r.z),maxZ:Math.max(p.z,q.z,r.z)};
    triangles.push(t);
    const left=Math.floor(t.minX/cell),right=Math.floor(t.maxX/cell),near=Math.floor(t.minZ/cell),far=Math.floor(t.maxZ/cell);
    if((right-left+1)*(far-near+1)>64){long.push(t);continue;}
    for(let x=left;x<=right;x++)for(let z=near;z<=far;z++){
     const key=x+':'+z;
     if(!buckets.has(key))buckets.set(key,[]);
     buckets.get(key).push(t);
    }
   }
  }
 }
 function coordinates(t,point){
  const x=point.x-t.p.x,z=point.z-t.p.z;
  const u=(x*t.vz-z*t.vx)/t.det,v=(t.ux*z-t.uz*x)/t.det;
  const height=point.y-(t.p.y+u*t.uy+v*t.vy);
  return [u,v,1-u-v,.25+height,.25-height];
 }
 return (id,a,b)=>{
  const cuts=[],minX=Math.min(a.x,b.x),maxX=Math.max(a.x,b.x),minZ=Math.min(a.z,b.z),maxZ=Math.max(a.z,b.z);
  const left=Math.floor(minX/cell),right=Math.floor(maxX/cell),near=Math.floor(minZ/cell),far=Math.floor(maxZ/cell);
  let candidates=triangles;
  if((right-left+1)*(far-near+1)<=64){
   candidates=new Set(long);
   for(let x=left;x<=right;x++)for(let z=near;z<=far;z++)for(const t of buckets.get(x+':'+z)||[])candidates.add(t);
  }
  for(const t of candidates){
   if(t.id===id||maxX<t.minX||minX>t.maxX||maxZ<t.minZ||minZ>t.maxZ)continue;
    const first=coordinates(t,a),last=coordinates(t,b);
    let start=0,end=1;
    for(let i=0;i<first.length&&start<end;i++){
     const f=first[i]+1e-8,l=last[i]+1e-8;
     if(f<0&&l<0){end=0;break;}
     if(f<0)start=Math.max(start,f/(f-l));
     if(l<0)end=Math.min(end,f/(f-l));
    }
    if(end-start>1e-7)cuts.push([start,end]);
  }
  const runs=[];let cursor=0;
  for(const [start,end] of cuts.sort((a,b)=>a[0]-b[0])){
   if(start-cursor>1e-7)runs.push([cursor,start]);
   cursor=Math.max(cursor,end);
  }
  if(1-cursor>1e-7)runs.push([cursor,1]);
  return runs;
 };
}

export function createRoadBarrierQuery(roads=[],world){
 const fenced=roads.filter(road=>Object.hasOwn(ROAD_BARRIERS,road.barrier));
 if(!fenced.length)return ()=>false;
 const barriers=[],half=worldHalf(world);
 const openings=createRoadOpenings(roads,half);
 for(const road of fenced){
  const profile=ROAD_BARRIERS[road.barrier];
  const sections=roadSections(savedRoadPath(road),road.closed);
  for(const side of [-1,1]){
   const offset=roadBarrierOffset(road,side);
   const points=sections.map(section=>roadVertex(section,offset,half));
   for(let i=1;i<points.length;i++){
    const from=points[i-1],to=points[i];
    for(const [start,end] of openings(road.id,from,to)){
     const a=lerp(from,to,start),b=lerp(from,to,end),length=distance(a,b);
     if(length<.0001)continue;
     const along={x:(b.x-a.x)/length,z:(b.z-a.z)/length};
     const normal={x:-along.z,z:along.x};
     barriers.push({a,b,length,along,normal,profile,minX:Math.min(a.x,b.x),maxX:Math.max(a.x,b.x),minZ:Math.min(a.z,b.z),maxZ:Math.max(a.z,b.z)});
    }
   }
  }
 }
 const dot=(a,b)=>a.x*b.x+a.z*b.z;
 // The rendered car is longer than it is wide. Sweep its full outline, including the nose and rear.
 const halfWidth=.87,halfLength=1.27,carHeight=1.4;
 return (before,after,heading)=>{
  if(!barriers.length)return false;
  const right={x:Math.cos(heading),z:-Math.sin(heading)},forward={x:-right.z,z:right.x};
  const move={x:after.x-before.x,z:after.z-before.z},stationary=!move.x&&!move.z;
  const left=Math.min(before.x,after.x)-1.8,rightEdge=Math.max(before.x,after.x)+1.8;
  const near=Math.min(before.z,after.z)-1.8,far=Math.max(before.z,after.z)+1.8;
  for(const edge of barriers){
   if(rightEdge<edge.minX||left>edge.maxX||far<edge.minZ||near>edge.maxZ)continue;
   const {a,b,length,along,normal,profile}=edge;
   const start={x:before.x-(a.x+b.x)/2,z:before.z-(a.z+b.z)/2};
   let enter=0,exit=1,initiallyOverlaps=true;
   for(const axis of [right,forward,along,normal]){
    const reach=halfWidth*Math.abs(dot(right,axis))+halfLength*Math.abs(dot(forward,axis))+
      (length/2+.01)*Math.abs(dot(along,axis))+profile.thickness/2*Math.abs(dot(normal,axis));
    const position=dot(start,axis),speed=dot(move,axis);
    initiallyOverlaps&&=Math.abs(position)<reach;
    if(Math.abs(speed)<1e-8){if(Math.abs(position)>=reach)exit=-1;}
    else{
     const first=(-reach-position)/speed,last=(reach-position)/speed;
     enter=Math.max(enter,Math.min(first,last));exit=Math.min(exit,Math.max(first,last));
    }
    if(exit<=enter)break;
   }
   if(exit<=enter)continue;
   const alongStart=dot(start,along)+length/2,alongSpeed=dot(move,along);
   const deckAt=t=>(a.y||0)+((b.y||0)-(a.y||0))*Math.max(0,Math.min(1,(alongStart+t*alongSpeed)/length));
   const clearance=t=>before.y+(after.y-before.y)*t-deckAt(t)-.025;
   const samples=[clearance(enter),clearance(exit)];
   if(alongSpeed)for(const boundary of [0,length]){
    const t=(boundary-alongStart)/alongSpeed;
    if(t>enter&&t<exit)samples.push(clearance(t));
   }
   if(Math.min(...samples)>=profile.height||Math.max(...samples)<=-carHeight)continue;
   const startHeight=clearance(0);
   if(initiallyOverlaps&&!stationary&&startHeight<profile.height&&startHeight>-carHeight){
    // Let a car already touching a fence back away on its own side.
    const side=dot(start,normal),across=dot(move,normal);
    if(!across||side*across>=0)continue;
   }
   return true;
  }
  return false;
 };
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
