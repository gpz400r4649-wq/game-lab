import {createRoadFootprintQuery,savedRoadPath} from './road3d.js?v=20261127b';
import {editorPlacementBlocker,editorPlacementReason} from './building3d.js?v=20261119p';
import {MAX_PARTS} from './limits3d.js?v=20261119d';
import {TOWN_PARTS,configureTownPart,fitTownPart,townLocal,townPlacementReason} from './town3d.js?v=20261127c';
import {worldHalf} from './world3d.js?v=20261119d';

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
