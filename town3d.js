import {createRoadFootprintQuery,nearestRoad,savedRoadPath} from './road3d.js?v=20261127b';
import {editorPlacementBlocker,editorPlacementReason} from './building3d.js?v=20261119p';
import {MAX_PARTS} from './limits3d.js?v=20261119d';
import {worldHalf,coordinateLimit} from './world3d.js?v=20261119d';

export const TOWN_PARTS=Object.freeze({
 crosswalk:{name:'おうだんほどう',icon:'▥',w:8,h:.5,d:2.4,marking:true},
 stopLine:{name:'とまる線',icon:'▬',w:8,h:.5,d:.5,marking:true},
 house:{name:'いえ',icon:'⌂',w:9,h:4,d:5,solid:true,capacity:1},
 shop:{name:'おみせ',icon:'▤',w:8,h:4,d:6,solid:true,visitorSlots:1},
 school:{name:'がっこう',icon:'▦',w:12,h:6,d:8,solid:true,visitorSlots:2},
 park:{name:'こうえん',icon:'♧',w:10,h:2.8,d:7},
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
export const AUTO_TOWN_DESTINATION='@auto';
export function townFleetSettings(part){
 const home=part.townKind==='house';
 return {...DEFAULT_FLEET,...(home?{count:1,targetId:AUTO_TOWN_DESTINATION}:{}),...part.townFleet};
}

const textId=value=>typeof value==='string'&&value.length<=80;
const within=(value,min,max)=>Number.isFinite(value)&&value>=min&&value<=max;
const angle=value=>Math.atan2(Math.sin(value),Math.cos(value));
const hasSidewalk=(road,side)=>road?.sidewalk==='both'||road?.sidewalk===(side<0?'left':'right');
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

export function upgradeTownDriveway(part,roads=[]){
 if(!townParkingCapacity(part)||part.townDriveway||!part.townRoadId)return;
 const road=roads.find(road=>road.id===part.townRoadId);
 if(road)part.townDriveway=hasSidewalk(road,part.townSide)?2.65:.65;
}

export function houseGarage(part){
 const garageWidth=part.w*.4,houseWidth=part.w-garageWidth;
 return {houseWidth,houseX:-garageWidth/2,garageWidth,garageX:houseWidth/2,garageHeight:part.h*.64};
}

export function townParkingCapacity(part){
 const spec=TOWN_PARTS[part.townKind];
 return spec?.capacity||spec?.visitorSlots||0;
}

export function visitorParking(part){
 const slots=TOWN_PARTS[part.townKind].visitorSlots;
 if(!slots)return null;
 const width=Math.min(slots*2.5,part.w*.45),buildingWidth=part.w-width;
 return {slots,width,buildingWidth,x:buildingWidth/2};
}

export function fitTownPart(part,roads,point,sideOverride=null){
 const spec=TOWN_PARTS[part.townKind];
 const fit=nearestRoad(roads,point,1.2,spec.marking?0:12);
 if(!fit){delete part.townRoadId;return part;}
 const right={x:Math.cos(fit.heading),z:-Math.sin(fit.heading)};
 const side=sideOverride||((point.x-fit.x)*right.x+(point.z-fit.z)*right.z<0?-1:1);
 const road=roads.find(road=>road.id===fit.roadId);
 const hasWalk=hasSidewalk(road,side),size=part.townKind==='house'?part:spec;
 const setback=fit.width/2+size.d/2+(hasWalk?2:0)+.65;
 const distance=spec.marking?(part.townKind==='stopLine'?side*fit.width/4:0):side*setback;
 const heading=spec.marking?fit.heading:fit.heading+side*Math.PI/2;
 const width=spec.marking?(part.townKind==='stopLine'?fit.width/2:fit.width-.5):size.w;
 return Object.assign(part,{x:fit.x+right.x*distance,y:fit.y,z:fit.z+right.z*distance,w:width,h:size.h,d:size.d,
  townHeading:angle(heading),townRoadId:fit.roadId,townSide:side,townAnchor:{x:fit.x,y:fit.y,z:fit.z},
  townDriveway:townParkingCapacity(part)?(hasWalk?2:0)+.65:0,townGrade:spec.marking?Math.max(-1,Math.min(1,fit.grade)):0});
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
 const cos=Math.abs(Math.cos(part.townHeading)),sin=Math.abs(Math.sin(part.townHeading));
 function addArea(x,z,width,depth,h){
  const cols=Math.ceil(width/2),rows=Math.ceil(depth/2),w=width/cols,d=depth/rows;
  for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){
   const position=townLocal(part,x+(i+.5)*w-width/2,z+(j+.5)*d-depth/2);
   cells.push({...part,...position,type:'box',w:w*cos+d*sin,d:w*sin+d*cos,h,sourceBlockId:part.id});
  }
 }
 if(part.townKind==='house'){
  const {houseWidth,houseX,garageWidth,garageX,garageHeight}=houseGarage(part);
  addArea(houseX,0,houseWidth,part.d,part.h);
  addArea(part.w/2-.08,0,.16,part.d,garageHeight);
  addArea(garageX,part.d/2-.08,garageWidth,.16,garageHeight);
 }else{
  const parking=visitorParking(part);
  addArea(parking?-parking.width/2:0,0,parking?.buildingWidth??part.w,part.d,part.h);
 }
 return cells;
}

export const isTownLotKind=kind=>kind==='house'||kind==='shop';
const distance=(a,b)=>Math.hypot(b.x-a.x,b.z-a.z);

export function townLots(project,kind){
 const roads=project.roads||[],slots=[],half=worldHalf(project),pavement=createRoadFootprintQuery(roads,half);
 const spacing=TOWN_PARTS[kind].w+.7;
 const buildings=project.objects.filter(part=>part.type==='town');
 const obstacles=project.objects.filter(part=>['wall','floor','roof','box','platform','moving','door','ramp'].includes(part.type));
 if(project.objects.length>=MAX_PARTS)return slots;
 for(const road of roads){
  const path=savedRoadPath(road),spans=path.slice(1).map((point,i)=>distance(path[i],point));
  const length=spans.reduce((sum,span)=>sum+span,0),count=Math.max(1,Math.floor(length/spacing));
  let index=0,along=0;
  for(let n=0;n<count;n++){
   const at=(length-(count-1)*spacing)/2+n*spacing;
   while(index<spans.length-1&&along+spans[index]<at)along+=spans[index++];
   if(!spans[index])continue;
   const a=path[index],b=path[index+1],t=(at-along)/spans[index];
   const anchor={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,y:(a.y||0)+((b.y||0)-(a.y||0))*t};
   for(const side of [-1,1]){
    const id=road.id+':'+side+':'+n,lot=fitTownPart(configureTownPart({type:'town',id},kind),[road],anchor,side);
    if(townPlacementReason(lot,buildings,project)||editorPlacementReason(lot,[],project.spawn,project))continue;
    const cos=Math.abs(Math.cos(lot.townHeading)),sin=Math.abs(Math.sin(lot.townHeading));
    if(editorPlacementBlocker({...lot,w:cos*lot.w+sin*lot.d,d:sin*lot.w+cos*lot.d},obstacles))continue;
    const front=-lot.d/2,edge=lot.w/2;
    const samples=[[-edge,front],[0,front],[edge,front],[-edge,0],[0,0],[edge,0],[-edge,-front],[0,-front],[edge,-front]];
    if(samples.some(([x,z])=>{const p=townLocal(lot,x,z);return pavement(p.x,p.z).some(deck=>Math.abs(deck.y-lot.y)<1.25);}))continue;
    slots.push(lot);
   }
  }
 }
 return slots;
}

export function townLotAt(lots,point){
 let best=null,score=Infinity;
 for(const lot of lots){
  const dx=point.x-lot.x,dz=point.z-lot.z,cos=Math.cos(lot.townHeading),sin=Math.sin(lot.townHeading);
  if(Math.abs(dx*cos-dz*sin)>lot.w/2+.3||Math.abs(dx*sin+dz*cos)>lot.d/2+.65||Math.abs((point.y||0)-lot.y)>2)continue;
  const gap=Math.hypot(dx,dz,(point.y||0)-lot.y);
  if(gap<score){best=lot;score=gap;}
 }
 return best;
}

export function addTownStroke(lots,selected,from,to,project){
 const count=Math.max(1,Math.ceil(distance(from,to)/1.5));
 for(let i=0;i<=count&&project.objects.length+selected.size<MAX_PARTS;i++){
  const t=i/count,point={x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t,z:from.z+(to.z-from.z)*t};
  const lot=townLotAt(lots,point);
  if(lot&&!selected.has(lot.id)&&!townPlacementReason(lot,[...selected.values()],project))selected.set(lot.id,lot);
 }
}
