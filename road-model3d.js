import * as T from './vendor/three.module.min.js';
import {ROAD_BARRIERS,ROAD_DECK_DEPTH,ROAD_SIDEWALK_WIDTH,createRoadFootprintQuery,createRoadOpenings,createRoadSectionQuery,roadBarrierOffset,roadRunBarrier,roadVertex} from './road3d.js?v=20261127b';
import {createRoadNetwork} from './road-network3d.js?v=20261126r';
import {makeJunctionSignal,updateTrafficSignal} from './race-model3d.js?v=20261126s';

const asphalt=new T.MeshStandardMaterial({color:0x333c4e,roughness:.98,side:T.DoubleSide});
const edges=new T.MeshBasicMaterial({color:0xe2e6ef,side:T.DoubleSide});
const centre=new T.MeshBasicMaterial({color:0xf3d88b,side:T.DoubleSide});
const paving=new T.MeshStandardMaterial({color:0xb6b3ad,roughness:.95,side:T.DoubleSide});
const barrierMaterials={mini:0xd26755,highway:0xb3b9bf,guardrail:0x94a6b8};
for(const [kind,color] of Object.entries(barrierMaterials))barrierMaterials[kind]=new T.MeshStandardMaterial({color,roughness:.8,side:T.DoubleSide});
const draftSurface=new T.MeshStandardMaterial({color:0x404c6f,roughness:.95,side:T.DoubleSide});
const pegShape=new T.SphereGeometry(.65,12,8),pegMaterial=new T.MeshBasicMaterial({color:0xa88bff,depthTest:false}),pickedMaterial=new T.MeshBasicMaterial({color:0xffde88,depthTest:false});

function signalSupportSite({center,signals},half,footprint){
 const top=Math.max(...signals.map(signal=>signal.y))+5.2;
 const clear=(x,z)=>{
  if(Math.abs(x)>half-.5||Math.abs(z)>half-.5)return false;
  for(const dx of [-.5,0,.5])for(const dz of [-.5,0,.5]){
   if(footprint(x+dx,z+dz).some(surface=>surface.y<=top+.15))return false;
  }
  return true;
 };
 // Try the road corners first, then look around the intersection for a free verge.
 for(let extra=0;extra<=6;extra++)for(const point of signals){
  const dx=point.x-center.x,dz=point.z-center.z,length=Math.hypot(dx,dz);
  if(!length)continue;
  const x=point.x+dx*extra/length,z=point.z+dz*extra/length;
  if(clear(x,z))return {x,z};
 }
 for(let radius=4;radius<=40;radius+=2)for(let i=0;i<24;i++){
  const angle=i*Math.PI/12,x=center.x+Math.cos(angle)*radius,z=center.z+Math.sin(angle)*radius;
  if(clear(x,z))return {x,z};
 }
 return null;
}

function roadMesh(road,half,preview,openings,path,ownOpenings=openings){
 const group=new T.Group();
 const pavement=[],borders=[],line=[],barriers={mini:[],highway:[],guardrail:[]},walk=[];
 const street=road.markings==='street';
 const at=(point,offset,height)=>{
  if(point.from){
   const {from,to,t}=point;
   const a=at(from,typeof offset==='function'?offset(from):offset,height);
   const b=at(to,typeof offset==='function'?offset(to):offset,height);
   return a.map((value,i)=>value+(b[i]-value)*t);
  }
  const {x,y,z}=roadVertex(point,typeof offset==='function'?offset(point):offset,half);
  return [x,y+height,z];
 };
 const height=preview ? .051 : .025;
 function strip(buffer,a,b,min,max,level){
  const p=at(a,min,level),q=at(a,max,level),r=at(b,max,level),s=at(b,min,level);
  buffer.push(...p,...q,...r,...p,...r,...s);
 }
 function rail(buffer,a,b,offset,base,top,thickness){
  const left=offset-thickness/2,right=offset+thickness/2;
  strip(buffer,a,b,left,right,height+top);
  for(const side of [left,right]){
   const p=at(a,side,height+base),q=at(b,side,height+base),r=at(b,side,height+top),s=at(a,side,height+top);
   buffer.push(...p,...q,...r,...p,...r,...s);
  }
 }
 const blend=(from,to,t)=>t===0?from:t===1?to:{from,to,t};
 function visibleRuns(a,b,offset,span){
  const vertex=point=>roadVertex(point,typeof offset==='function'?offset(point):offset,half);
  const from=vertex(a),to=vertex(b);
  const runs=openings(road.id,from,to,span);
  if(span===undefined||ownOpenings===openings)return runs;
  const ownRuns=ownOpenings(road.id,from,to,span);
  return runs.flatMap(([start,end])=>ownRuns.map(([left,right])=>[Math.max(start,left),Math.min(end,right)]).filter(([l,r])=>r>l));
 }
 function sidewalkTop(a,b,inner,outer){
  const point=(section,offset)=>{const [x,y,z]=at(section,offset,0);return {x,y,z};};
  const p=point(a,inner),q=point(b,inner),r=point(b,outer),s=point(a,outer);
  for(const triangle of [[p,q,r],[p,r,s]])for(const piece of ownOpenings.outsideOwnPavement(road.id,triangle)){
   for(let i=2;i<piece.length;i++)for(const {x,y=0,z} of [piece[0],piece[i-1],piece[i]])walk.push(x,y+height+.13,z);
  }
 }
 let travelled=0;
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],length=Math.hypot(a.x-b.x,a.z-b.z),radius=road.width/2;
  if(length<.0001)continue;
  const kind=roadRunBarrier(road,b),profile=ROAD_BARRIERS[kind];
  strip(pavement,a,b,-radius,radius,height);
  if(a.y>0||b.y>0){
   for(const offset of [-radius,radius]){
    for(const [start,end] of visibleRuns(a,b,offset,i)){
     const l=blend(a,b,start),r=blend(a,b,end);
     const p=at(l,offset,height),q=at(r,offset,height),s=at(l,offset,height-ROAD_DECK_DEPTH),t=at(r,offset,height-ROAD_DECK_DEPTH);
     pavement.push(...p,...q,...t,...p,...t,...s);
    }
   }
   strip(pavement,b,a,-radius,radius,height-ROAD_DECK_DEPTH);
  }
  const edgeInset=profile?.thickness ? profile.thickness/2+.19 : .16;
  for(const [side,sideName] of [[-1,'left'],[1,'right']])if(road.sidewalk==='both'||road.sidewalk===sideName){
   const factor=point=>point[sideName+'Walk']??1;
   const inner=side*radius,outer=point=>side*(radius+ROAD_SIDEWALK_WIDTH*factor(point));
   const center=point=>(inner+outer(point))/2;
   for(const [start,end] of visibleRuns(a,b,center))sidewalkTop(blend(a,b,start),blend(a,b,end),inner,outer);
   for(const offset of [inner,outer]){
    for(const [start,end] of visibleRuns(a,b,offset,i)){
     const l=blend(a,b,start),r=blend(a,b,end);
     const p=at(l,offset,height),q=at(r,offset,height),s=at(l,offset,height+.13),t=at(r,offset,height+.13);
     walk.push(...p,...q,...t,...p,...t,...s);
    }
   }
  }
  for(const edge of [-radius+edgeInset+.055,radius-edgeInset-.055]){
   for(const [start,end] of visibleRuns(a,b,edge,i))strip(borders,blend(a,b,start),blend(a,b,end),edge-.055,edge+.055,height+.008);
  }
  if(!street||road.width>=8)for(const [from,to] of visibleRuns(a,b,0)){
   for(let mark=Math.floor((travelled+from*length)/5)*5;mark<travelled+to*length;mark+=5){
    const start=Math.max(from,(mark-travelled)/length),end=Math.min(to,(mark+2.4-travelled)/length);
    if(end>start)strip(line,blend(a,b,start),blend(a,b,end),-.065,.065,height+.009);
   }
  }
  if(profile)for(const side of [-1,1]){
   const offset=roadBarrierOffset(road,side);
   for(const [from,to] of visibleRuns(a,b,offset,i)){
    rail(barriers[kind],blend(a,b,from),blend(a,b,to),offset,profile.bottom,profile.height,profile.thickness);
    if(kind==='guardrail'){
     for(let post=Math.floor((travelled+from*length)/4)*4;post<travelled+to*length;post+=4){
      const start=Math.max(from,(post-travelled)/length),end=Math.min(to,(post+.18-travelled)/length);
      if(end>start)rail(barriers[kind],blend(a,b,start),blend(a,b,end),offset,0,profile.bottom,.16);
     }
    }
   }
  }
  travelled+=length;
 }
 const rails=Object.entries(barriers).map(([kind,vertices])=>[vertices,barrierMaterials[kind],'roadBarrier']);
 for(const [vertices,material,role] of [[pavement,preview?draftSurface:asphalt,'roadSurface'],[borders,edges],[line,street?edges:centre],...rails,[walk,paving]]){
  if(!vertices.length)continue;
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
  const mesh=new T.Mesh(geometry,material);
  if(role)mesh.userData[role]=true;
  group.add(mesh);
 }
 return group;
}

export function createRoadView(scene){
 const saved=new T.Group(),draft=new T.Group(),snapGuide=new T.Group(),signals=new T.Group();
 signals.name='automatic-traffic-signals';
 scene.add(saved,draft,snapGuide,signals);
 const snapDot=new T.SphereGeometry(.29,10,6);
 const snapMaterial=new T.MeshBasicMaterial({color:0x4595a0,depthTest:false,depthWrite:false});
 const activeMaterial=new T.MeshBasicMaterial({color:0x39e5d0,depthTest:false,depthWrite:false});
 const dots=Array.from({length:9},()=>{
  const dot=new T.Mesh(snapDot,snapMaterial);dot.renderOrder=5;snapGuide.add(dot);return dot;
 });
 snapGuide.visible=false;
 let stamp='',roads=[],half=30,draftId=null,draftStamp='',previewIndex=null;
 function clear(group){for(const model of [...group.children]){group.remove(model);model.traverse(child=>{if(child.isMesh&&child.geometry!==pegShape)child.geometry.dispose();});}}
 function showSaved(currentDraft){
  clear(saved);
  const visible=roads.filter(road=>road.id!==draftId);
  const active=currentDraft?[...visible,currentDraft]:visible;
  const sections=createRoadSectionQuery(active),openings=createRoadOpenings(active,half,sections);
  for(const road of roads){const model=roadMesh(road,half,false,openings,sections(road));model.visible=road.id!==draftId;model.userData.roadId=road.id;saved.add(model);}
  return {openings,sections};
 }
 function previewOpenings(){
  if(previewIndex?.id!==draftId)previewIndex={id:draftId,openings:createRoadOpenings(roads.filter(road=>road.id!==draftId),half)};
  for(const model of saved.children)model.visible=model.userData.roadId!==draftId;
  return previewIndex.openings;
 }
 const highlightMaterial=new T.MeshBasicMaterial({color:0xe2646b,transparent:true,opacity:.7,depthWrite:false,side:T.DoubleSide});
 const eraseLine=new T.Mesh(new T.BufferGeometry(),highlightMaterial);
 eraseLine.visible=false;scene.add(eraseLine);
 let highlightedPath=null,highlightedIndex=-1,highlightedEnd=-1;
 return {
  showSegment(segment,color=0xe2646b){
   eraseLine.visible=!!segment;
   if(!segment)return;
   highlightMaterial.color.setHex(color);
   const {path,index,endIndex=index}=segment;
   if(highlightedPath===path&&highlightedIndex===index&&highlightedEnd===endIndex)return;
   highlightedPath=path;highlightedIndex=index;highlightedEnd=endIndex;
   const vertices=[];
   for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i];
    if(b.incomingSegment<index||b.incomingSegment>endIndex)continue;
    const span=Math.hypot(b.x-a.x,b.z-a.z);
    if(span<.0001)continue;
    const halfWidth=endIndex===index ? .275 : .5;
    const dx=(b.z-a.z)*halfWidth/span,dz=(a.x-b.x)*halfWidth/span;
    const l=[a.x+dx,(a.y||0)+.09,a.z+dz],r=[a.x-dx,(a.y||0)+.09,a.z-dz];
    const m=[b.x+dx,(b.y||0)+.09,b.z+dz],n=[b.x-dx,(b.y||0)+.09,b.z-dz];
    vertices.push(...l,...r,...m,...r,...n,...m);
   }
   eraseLine.geometry.dispose();eraseLine.geometry=new T.BufferGeometry();
   eraseLine.geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  },
  surfaces(){return saved.children.filter(model=>model.visible).flatMap(model=>model.children.filter(mesh=>mesh.userData.roadSurface));},
  handles(){return draft.children.filter(mesh=>Number.isInteger(mesh.userData.roadHandle));},
  sync(next,extent){
   const key=JSON.stringify([next||[],extent]);if(key===stamp)return;
   stamp=key;roads=next||[];half=extent;draftStamp='';previewIndex=null;showSaved();
   signals.clear();
   const junctions=createRoadNetwork(roads).junctions;
   const footprint=junctions.length?createRoadFootprintQuery(roads,half):null;
   for(const junction of junctions){
    const model=makeJunctionSignal(junction,signalSupportSite(junction,half,footprint));
    for(const head of model.userData.signalHeads){
     const {rotation,phaseOffset}=head.userData.roadSignal;
     updateTrafficSignal(head,rotation,0,phaseOffset);
    }
    signals.add(model);
   }
  },
  updateSignals(time){
   for(const model of signals.children)for(const head of model.userData.signalHeads){
    const {rotation,phaseOffset}=head.userData.roadSignal;
    updateTrafficSignal(head,rotation,time,phaseOffset);
   }
  },
  showSnap(sites,point){
   snapGuide.visible=sites.length>0;
   for(const [index,dot] of dots.entries()){
    const site=sites[index];dot.visible=!!site;if(!site)continue;
    const active=site.x===point?.x&&site.z===point?.z;
    dot.position.set(site.x,(site.y??point?.y??0)+.25,site.z);dot.material=active?activeMaterial:snapMaterial;dot.scale.setScalar(active?1.7:1);
   }
  },
  showDraft(road,selected=-1,transient=false){
   const key=JSON.stringify([road,transient]);
   if(key!==draftStamp){
    clear(draft);draftId=road?.id||null;draftStamp=key;
    const context=transient?null:showSaved(road);
    if(road){
     const sections=context?.sections??createRoadSectionQuery([...roads.filter(saved=>saved.id!==draftId),road],road);
     const openings=context?.openings??previewOpenings();
     const ownOpenings=transient?createRoadOpenings([road],half,sections):openings;
     draft.add(roadMesh(road,half,true,openings,sections(road),ownOpenings));
     road.points.forEach((point,index)=>{const peg=new T.Mesh(pegShape,pegMaterial);peg.position.set(point.x,(point.y||0)+.34,point.z);peg.userData.roadHandle=index;peg.renderOrder=6;draft.add(peg);});
    }
   }
   for(const peg of draft.children)if(Number.isInteger(peg.userData.roadHandle))peg.material=peg.userData.roadHandle===selected?pickedMaterial:pegMaterial;
  }
 };
}
