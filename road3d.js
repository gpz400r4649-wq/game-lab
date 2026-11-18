import {GRID} from './building3d.js?v=20261119d';
import {worldHalf,coordinateLimit} from './world3d.js?v=20261119d';

export const ROAD_WIDTHS=[4,8,12];
export const MAX_ROADS=16;
export const MAX_ROAD_POINTS=64;
const ROAD_GRID_STEP=GRID.cell/2;
const MIN_SPACING=ROAD_GRID_STEP;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});

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
 return points.every((point,index)=>!index||distance(points[index-1],point)>=MIN_SPACING)&&
  (!closed||distance(points[0],points.at(-1))>=MIN_SPACING);
}

export function validRoads(roads,world){
 if(roads===undefined)return true;
 if(!Array.isArray(roads)||roads.length>MAX_ROADS)return false;
 const limit=coordinateLimit(world),ids=new Set();
 for(const road of roads){
  if(!road||typeof road.id!=='string'||!road.id||road.id.length>80||ids.has(road.id)||!ROAD_WIDTHS.includes(road.width)||typeof road.closed!=='boolean'||!Array.isArray(road.points)||road.points.length<2||road.points.length>MAX_ROAD_POINTS)return false;
  if(!road.points.every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.abs(p.x)<=limit&&Math.abs(p.z)<=limit)||!roadPointsFit(road.points,road.closed))return false;
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

function closestOnPath(path,point,maxGap,last=path.length-1){
 let nearest=null,best=maxGap*maxGap;
 for(let index=1;index<=last;index++){
  const a=path[index-1],b=path[index],dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
  if(length<.000001)continue;
  const fraction=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.z-a.z)*dz)/length));
  const x=a.x+dx*fraction,z=a.z+dz*fraction,gap=(x-point.x)**2+(z-point.z)**2;
  if(gap<best){best=gap;nearest={x,z,heading:Math.atan2(-dx,-dz),gap};}
 }
 return nearest;
}

export function nearestRoad(roads,point){
 let nearest=null;
 for(const road of roads||[]){
  const match=closestOnPath(savedRoadPath(road),point,road.width/2+.65);
  if(match&&(!nearest||match.gap<nearest.gap))nearest={...match,width:road.width,roadId:road.id};
 }
 return nearest;
}

export function courseStart(project){
 const road=project.template==='car'&&project.roads?.[0];
 if(!road)return project.spawn;
 const path=savedRoadPath(road);
 const start=closestOnPath(path,road.points[0],Infinity,road.closed?12:1);
 return start?{x:start.x,y:0,z:start.z,heading:start.heading}:project.spawn;
}
