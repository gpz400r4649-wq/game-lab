import * as T from './vendor/three.module.min.js';
import {ROAD_BARRIERS,ROAD_DECK_DEPTH,createRoadOpenings,roadBarrierOffset,roadRunBarrier,roadSections,roadVertex,sampleRoad} from './road3d.js?v=20261125d';

const asphalt=new T.MeshStandardMaterial({color:0x333c4e,roughness:.98,side:T.DoubleSide});
const edges=new T.MeshBasicMaterial({color:0xe2e6ef,side:T.DoubleSide});
const centre=new T.MeshBasicMaterial({color:0xf3d88b,side:T.DoubleSide});
const paving=new T.MeshStandardMaterial({color:0xb6b3ad,roughness:.95,side:T.DoubleSide});
const barrierMaterials={mini:0xd26755,highway:0xb3b9bf,guardrail:0x94a6b8};
for(const [kind,color] of Object.entries(barrierMaterials))barrierMaterials[kind]=new T.MeshStandardMaterial({color,roughness:.8,side:T.DoubleSide});
const draftSurface=new T.MeshStandardMaterial({color:0x404c6f,roughness:.95,side:T.DoubleSide});
const pegShape=new T.SphereGeometry(.65,12,8),pegMaterial=new T.MeshBasicMaterial({color:0xa88bff,depthTest:false}),pickedMaterial=new T.MeshBasicMaterial({color:0xffde88,depthTest:false});

function roadMesh(road,half,preview,openings){
 const shape=road.closed&&road.points.length<3?{...road,closed:false}:road;
 const path=roadSections(sampleRoad(shape,true),shape.closed),group=new T.Group();
 const pavement=[],borders=[],line=[],barriers={mini:[],highway:[],guardrail:[]},walk=[];
 const street=road.markings==='street';
 const at=(point,offset,height)=>{
  const {x,y,z}=roadVertex(point,offset,half);
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
 const blend=(a,b,t)=>Object.fromEntries(['x','y','z','nx','nz'].map(key=>[key,(a[key]||0)+((b[key]||0)-(a[key]||0))*t]));
 function visibleRuns(a,b,offset){return openings(road.id,roadVertex(a,offset,half),roadVertex(b,offset,half));}
 let travelled=0;
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],length=Math.hypot(a.x-b.x,a.z-b.z),radius=road.width/2;
  if(length<.0001)continue;
  const kind=roadRunBarrier(road,b),profile=ROAD_BARRIERS[kind];
  strip(pavement,a,b,-radius,radius,height);
  if(a.y>0||b.y>0){
   for(const offset of [-radius,radius]){
    const p=at(a,offset,height),q=at(b,offset,height),r=at(b,offset,height-ROAD_DECK_DEPTH),s=at(a,offset,height-ROAD_DECK_DEPTH);
    pavement.push(...p,...q,...r,...p,...r,...s);
   }
   strip(pavement,b,a,-radius,radius,height-ROAD_DECK_DEPTH);
  }
  const edgeInset=profile?.thickness ? profile.thickness/2+.19 : .16;
  for(const [side,sideName] of [[-1,'left'],[1,'right']])if(road.sidewalk==='both'||road.sidewalk===sideName){
   for(const [start,end] of visibleRuns(a,b,side*(radius+1))){
    const l=blend(a,b,start),r=blend(a,b,end),inner=side*radius,outer=side*(radius+2);
    strip(walk,l,r,Math.min(inner,outer),Math.max(inner,outer),height+.13);
    for(const offset of [inner,outer]){
     const p=at(l,offset,height),q=at(r,offset,height),s=at(l,offset,height+.13),t=at(r,offset,height+.13);
     walk.push(...p,...q,...t,...p,...t,...s);
    }
   }
  }
  for(const edge of [-radius+edgeInset+.055,radius-edgeInset-.055]){
   for(const [start,end] of visibleRuns(a,b,edge))strip(borders,blend(a,b,start),blend(a,b,end),edge-.055,edge+.055,height+.008);
  }
  if(!street||road.width>=8)for(const [from,to] of visibleRuns(a,b,0)){
   for(let mark=Math.floor((travelled+from*length)/5)*5;mark<travelled+to*length;mark+=5){
    const start=Math.max(from,(mark-travelled)/length),end=Math.min(to,(mark+2.4-travelled)/length);
    if(end>start)strip(line,blend(a,b,start),blend(a,b,end),-.065,.065,height+.009);
   }
  }
  if(profile)for(const side of [-1,1]){
   const offset=roadBarrierOffset(road,side);
   for(const [from,to] of visibleRuns(a,b,offset)){
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
 const saved=new T.Group(),draft=new T.Group(),snapGuide=new T.Group();scene.add(saved,draft,snapGuide);
 const snapDot=new T.SphereGeometry(.29,10,6);
 const snapMaterial=new T.MeshBasicMaterial({color:0x4595a0,depthTest:false,depthWrite:false});
 const activeMaterial=new T.MeshBasicMaterial({color:0x39e5d0,depthTest:false,depthWrite:false});
 const dots=Array.from({length:9},()=>{
  const dot=new T.Mesh(snapDot,snapMaterial);dot.renderOrder=5;snapGuide.add(dot);return dot;
 });
 snapGuide.visible=false;
 let stamp='',roads=[],half=30,draftId=null,draftStamp='';
 function clear(group){for(const model of [...group.children]){group.remove(model);model.traverse(child=>{if(child.isMesh&&child.geometry!==pegShape)child.geometry.dispose();});}}
 function showSaved(currentDraft){
  clear(saved);
  const visible=roads.filter(road=>road.id!==draftId);
  const openings=createRoadOpenings(currentDraft?[...visible,currentDraft]:visible,half);
  for(const road of roads){const model=roadMesh(road,half,false,openings);model.visible=road.id!==draftId;model.userData.roadId=road.id;saved.add(model);}
  return openings;
 }
 const eraseLine=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial({color:0xe2646b,transparent:true,opacity:.7,depthWrite:false}));
 eraseLine.visible=false;scene.add(eraseLine);
 const eraseDirection=new T.Vector3(),forward=new T.Vector3(0,0,1);
 return {
  showSegment(segment,color=0xe2646b){
   eraseLine.visible=!!segment;
   if(!segment)return;
   eraseLine.material.color.setHex(color);
   const {a,b}=segment,ay=a.y||0,by=b.y||0;
   eraseDirection.set(b.x-a.x,by-ay,b.z-a.z);
   eraseLine.position.set((a.x+b.x)/2,(ay+by)/2+.075,(a.z+b.z)/2);
   eraseLine.scale.set(.45,.045,eraseDirection.length());
   eraseLine.quaternion.setFromUnitVectors(forward,eraseDirection.normalize());
  },
  surfaces(){return saved.children.filter(model=>model.visible).flatMap(model=>model.children.filter(mesh=>mesh.userData.roadSurface));},
  handles(){return draft.children.filter(mesh=>Number.isInteger(mesh.userData.roadHandle));},
  sync(next,extent){
   const key=JSON.stringify([next||[],extent]);if(key===stamp)return;
   stamp=key;roads=next||[];half=extent;draftStamp='';showSaved();
  },
  showSnap(sites,point){
   snapGuide.visible=sites.length>0;
   for(const [index,dot] of dots.entries()){
    const site=sites[index];dot.visible=!!site;if(!site)continue;
    const active=site.x===point?.x&&site.z===point?.z;
    dot.position.set(site.x,(point?.y||0)+.25,site.z);dot.material=active?activeMaterial:snapMaterial;dot.scale.setScalar(active?1.7:1);
   }
  },
  showDraft(road,selected=-1){
   const key=JSON.stringify(road);
   if(key!==draftStamp){
    clear(draft);draftId=road?.id||null;draftStamp=key;
    const openings=showSaved(road);
    if(road){
     draft.add(roadMesh(road,half,true,openings));
     road.points.forEach((point,index)=>{const peg=new T.Mesh(pegShape,pegMaterial);peg.position.set(point.x,(point.y||0)+.34,point.z);peg.userData.roadHandle=index;peg.renderOrder=6;draft.add(peg);});
    }
   }
   for(const peg of draft.children)if(Number.isInteger(peg.userData.roadHandle))peg.material=peg.userData.roadHandle===selected?pickedMaterial:pegMaterial;
  }
 };
}
