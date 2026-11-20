import {nearestRoad} from './road3d.js?v=20261120o';
import {worldHalf,coordinateLimit} from './world3d.js?v=20261119d';

export const TOWN_PARTS=Object.freeze({
 crosswalk:{name:'おうだんほどう',icon:'▥',w:8,h:.5,d:2.4,marking:true},
 stopLine:{name:'とまる線',icon:'▬',w:8,h:.5,d:.5,marking:true},
 house:{name:'いえ',icon:'⌂',w:6,h:4,d:5,solid:true},
 shop:{name:'おみせ',icon:'▤',w:8,h:4,d:6,solid:true},
 school:{name:'がっこう',icon:'▦',w:12,h:6,d:8,solid:true},
 parking:{name:'ちゅうしゃじょう',icon:'Ⓟ',w:12,h:.5,d:7,capacity:6},
 garage:{name:'ガレージ',icon:'▣',w:12,h:3.6,d:7,capacity:6},
 busStop:{name:'バスてい',icon:'▧',w:5,h:2.5,d:3,capacity:1}
});
export const ARRIVAL_TYPES=Object.freeze({return:'すこしまってもどる',park:'そこでとまる',loop:'くりかえす'});
export const MAX_TOWN_CARS=24;
export const MAX_RIVALS=4;
export const RIVAL_SPEEDS=[.75,.9,1.05];
export const RIVAL_CORNERS=[.75,1,1.25];
export const DEFAULT_RIVAL={speed:.9,corner:1};
export const DEFAULT_FLEET={count:0,targetId:'',interval:4,delay:1,arrival:'return',speed:35};

const textId=value=>typeof value==='string'&&value.length<=80;
const within=(value,min,max)=>Number.isFinite(value)&&value>=min&&value<=max;
const angle=value=>Math.atan2(Math.sin(value),Math.cos(value));
export function validRivals(values){
 return values===undefined||Array.isArray(values)&&values.length<=MAX_RIVALS&&values.every(value=>value&&RIVAL_SPEEDS.includes(value.speed)&&RIVAL_CORNERS.includes(value.corner));
}

export function validTownPart(part){
 const {townKind,townRoadId,townSide,townAnchor,townHeading,townFleet}=part;
 if(!Object.hasOwn(TOWN_PARTS,townKind)||!within(townHeading,-Math.PI,Math.PI))return false;
 if(townRoadId!==undefined&&(!textId(townRoadId)||!townRoadId||![-1,1].includes(townSide)||!townAnchor||
  !['x','y','z'].every(key=>Number.isFinite(townAnchor[key]))))return false;
 if(part.townDriveway!==undefined&&!within(part.townDriveway,0,3))return false;
 if(part.townGrade!==undefined&&!within(part.townGrade,-1,1))return false;
 const capacity=TOWN_PARTS[townKind].capacity;
 return townFleet===undefined||!!capacity&&townFleet&&Number.isInteger(townFleet.count)&&within(townFleet.count,0,capacity)&&
  textId(townFleet.targetId)&&within(townFleet.interval,1,30)&&within(townFleet.delay,0,60)&&within(townFleet.speed,10,65)&&
  Object.hasOwn(ARRIVAL_TYPES,townFleet.arrival);
}

export function configureTownPart(part,kind='house'){
 const {w,h,d}=TOWN_PARTS[kind];
 return Object.assign(part,{townKind:kind,townHeading:0,w,h,d});
}

export function fitTownPart(part,roads,point,sideOverride=null){
 const spec=TOWN_PARTS[part.townKind];
 const fit=nearestRoad(roads,point,1.2,spec.marking?0:12);
 if(!fit){delete part.townRoadId;return part;}
 const right={x:Math.cos(fit.heading),z:-Math.sin(fit.heading)};
 const side=sideOverride||((point.x-fit.x)*right.x+(point.z-fit.z)*right.z<0?-1:1);
 const road=roads.find(road=>road.id===fit.roadId);
 const hasWalk=road.sidewalk==='both'||road.sidewalk===(side<0?'left':'right');
 const setback=fit.width/2+spec.d/2+(hasWalk?2:0)+.65;
 const distance=spec.marking?(part.townKind==='stopLine'?side*fit.width/4:0):side*setback;
 const heading=spec.marking?fit.heading:fit.heading+side*Math.PI/2;
 const width=spec.marking?(part.townKind==='stopLine'?fit.width/2:fit.width-.5):spec.w;
 return Object.assign(part,{x:fit.x+right.x*distance,y:fit.y,z:fit.z+right.z*distance,w:width,h:spec.h,d:spec.d,
  townHeading:angle(heading),townRoadId:fit.roadId,townSide:side,townAnchor:{x:fit.x,y:fit.y,z:fit.z},
  townDriveway:spec.capacity?(hasWalk?2:0)+.65:0,townGrade:spec.marking?Math.max(-1,Math.min(1,fit.grade)):0});
}

export function refitTownParts(objects,roads,world){
 return objects.map(part=>{
  if(part.type!=='town'||!part.townRoadId)return part;
  const linked=roads.filter(road=>road.id===part.townRoadId);
  const next=fitTownPart({...part},linked,part.townAnchor,part.townSide);
  return insideTownMap(next,world)?next:part;
 });
}

export function insideTownMap(part,world){
 const cos=Math.abs(Math.cos(part.townHeading)),sin=Math.abs(Math.sin(part.townHeading)),half=worldHalf(world);
 const xRadius=(part.w*cos+part.d*sin)/2,zRadius=(part.w*sin+part.d*cos)/2;
 return Math.abs(part.x)<=coordinateLimit(world)&&Math.abs(part.z)<=coordinateLimit(world)&&Math.abs(part.x)+xRadius<=half&&Math.abs(part.z)+zRadius<=half;
}

export function townPlacementReason(part,objects,world){
 if(!part.townRoadId)return 'どうろの近くをえらぼう';
 if(!insideTownMap(part,world))return 'マップの中における場所をえらぼう';
 if(TOWN_PARTS[part.townKind].marking)return '';
 const overlaps=objects.some(other=>{
  if(other.id===part.id||other.type!=='town'||TOWN_PARTS[other.townKind].marking||Math.abs(other.y-part.y)>2)return false;
  const dx=other.x-part.x,dz=other.z-part.z;
  for(const angle of [part.townHeading,part.townHeading+Math.PI/2,other.townHeading,other.townHeading+Math.PI/2]){
   const radius=shape=>(Math.abs(Math.cos(angle-shape.townHeading))*shape.w+Math.abs(Math.sin(angle-shape.townHeading))*shape.d)/2;
   if(Math.abs(dx*Math.cos(angle)-dz*Math.sin(angle))>=radius(part)+radius(other)-.02)return false;
  }
  return true;
 });
 return overlaps?'まちのパーツがかさなるよ。どうろぞいの別の場所におこう':'';
}

export function townLocal(part,x,z){
 const cos=Math.cos(part.townHeading),sin=Math.sin(part.townHeading);
 return {x:part.x+x*cos+z*sin,y:part.y,z:part.z-x*sin+z*cos};
}

export function townSolids(part){
 if(!TOWN_PARTS[part.townKind].solid)return [];
 const cells=[];
 // Short sections keep the collision shape close to the outline of an angled building.
 const size=Math.min(2,part.d),count=Math.ceil(part.w/size),depth=Math.ceil(part.d/size);
 const w=part.w/count,d=part.d/depth,cos=Math.abs(Math.cos(part.townHeading)),sin=Math.abs(Math.sin(part.townHeading));
 for(let i=0;i<count;i++)for(let j=0;j<depth;j++){
  cells.push({...part,...townLocal(part,(i+.5)*w-part.w/2,(j+.5)*d-part.d/2),type:'box',w:w*cos+d*sin,d:w*sin+d*cos,sourceBlockId:part.id});
 }
 return cells;
}
