import * as T from './vendor/three.module.min.js';
import {ROAD_BARRIERS,ROAD_DECK_DEPTH,roadBarrierOffset,roadSections,roadVertex,sampleRoad} from './road3d.js?v=20261120a';

const asphalt=new T.MeshStandardMaterial({color:0x333c4e,roughness:.98,side:T.DoubleSide});
const edges=new T.MeshBasicMaterial({color:0xe2e6ef,side:T.DoubleSide});
const centre=new T.MeshBasicMaterial({color:0xf3d88b,side:T.DoubleSide});
const barrierMaterials={mini:0xd26755,highway:0xb3b9bf,guardrail:0x94a6b8};
for(const [kind,color] of Object.entries(barrierMaterials))barrierMaterials[kind]=new T.MeshStandardMaterial({color,roughness:.8,side:T.DoubleSide});
const draftSurface=new T.MeshStandardMaterial({color:0x404c6f,roughness:.95,side:T.DoubleSide});
const pegShape=new T.SphereGeometry(.65,12,8),pegMaterial=new T.MeshBasicMaterial({color:0xa88bff,depthTest:false}),pickedMaterial=new T.MeshBasicMaterial({color:0xffde88,depthTest:false});

function roadMesh(road,half,preview){
 const shape=road.closed&&road.points.length<3?{...road,closed:false}:road;
 const path=roadSections(sampleRoad(shape),shape.closed),group=new T.Group();
 const pavement=[],borders=[],line=[],barriers=[];
 const profile=ROAD_BARRIERS[road.barrier],street=road.markings==='street';
 const at=(point,offset,height)=>{
  const {x,y,z}=roadVertex(point,offset,half);
  return [x,y+height,z];
 };
 const height=preview ? .051 : .025;
 function strip(buffer,a,b,min,max,level){
  const p=at(a,min,level),q=at(a,max,level),r=at(b,max,level),s=at(b,min,level);
  buffer.push(...p,...q,...r,...p,...r,...s);
 }
 function rail(a,b,offset,base,top,thickness){
  const left=offset-thickness/2,right=offset+thickness/2;
  strip(barriers,a,b,left,right,height+top);
  for(const side of [left,right]){
   const p=at(a,side,height+base),q=at(b,side,height+base),r=at(b,side,height+top),s=at(a,side,height+top);
   barriers.push(...p,...q,...r,...p,...r,...s);
  }
 }
 const blend=(a,b,t)=>Object.fromEntries(['x','y','z','nx','nz'].map(key=>[key,(a[key]||0)+((b[key]||0)-(a[key]||0))*t]));
 let travelled=0;
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],length=Math.hypot(a.x-b.x,a.z-b.z),radius=road.width/2;
  if(length<.0001)continue;
  strip(pavement,a,b,-radius,radius,height);
  if(a.y>0||b.y>0){
   for(const offset of [-radius,radius]){
    const p=at(a,offset,height),q=at(b,offset,height),r=at(b,offset,height-ROAD_DECK_DEPTH),s=at(a,offset,height-ROAD_DECK_DEPTH);
    pavement.push(...p,...q,...r,...p,...r,...s);
   }
   strip(pavement,b,a,-radius,radius,height-ROAD_DECK_DEPTH);
  }
  const edgeInset=profile?.thickness ? profile.thickness/2+.19 : .16;
  strip(borders,a,b,-radius+edgeInset,-radius+edgeInset+.11,height+.008);
  strip(borders,a,b,radius-edgeInset-.11,radius-edgeInset,height+.008);
  for(let mark=Math.floor(travelled/5)*5;mark<travelled+length;mark+=5){
   const start=Math.max(0,(mark-travelled)/length),end=Math.min(1,(mark+2.4-travelled)/length);
   if(end>start&&(!street||road.width>=8))strip(line,blend(a,b,start),blend(a,b,end),-.065,.065,height+.009);
  }
  if(profile)for(const side of [-1,1]){
   const offset=roadBarrierOffset(road,side);
   rail(a,b,offset,profile.bottom,profile.height,profile.thickness);
   if(road.barrier==='guardrail'){
    for(let post=Math.floor(travelled/4)*4;post<travelled+length;post+=4){
     const start=Math.max(0,(post-travelled)/length),end=Math.min(1,(post+.18-travelled)/length);
     if(end>start)rail(blend(a,b,start),blend(a,b,end),offset,0,profile.bottom,.16);
    }
   }
  }
  travelled+=length;
 }
 for(const [index,[vertices,material]] of [[pavement,preview?draftSurface:asphalt],[borders,edges],[line,street?edges:centre],[barriers,barrierMaterials[road.barrier]]].entries()){
  if(!vertices.length)continue;
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
  const mesh=new T.Mesh(geometry,material);
  if(index===0)mesh.userData.roadSurface=true;
  if(index===3)mesh.userData.roadBarrier=true;
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
 let stamp='',roads=[],half=30,draftId=null;
 function clear(group){for(const model of [...group.children]){group.remove(model);model.traverse(child=>{if(child.isMesh&&child.geometry!==pegShape)child.geometry.dispose();});}}
 function showSaved(){
  clear(saved);
  for(const road of roads){const model=roadMesh(road,half,false);model.visible=road.id!==draftId;model.userData.roadId=road.id;saved.add(model);}
 }
 return {
  surfaces(){return saved.children.filter(model=>model.visible).flatMap(model=>model.children.filter(mesh=>mesh.userData.roadSurface));},
  handles(){return draft.children.filter(mesh=>Number.isInteger(mesh.userData.roadHandle));},
  sync(next,extent){
   const key=JSON.stringify([next||[],extent]);if(key===stamp)return;
   stamp=key;roads=next||[];half=extent;showSaved();
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
   clear(draft);draftId=road?.id||null;
   for(const model of saved.children)model.visible=model.userData.roadId!==draftId;
   if(!road)return;
   draft.add(roadMesh(road,half,true));
   road.points.forEach((point,index)=>{const peg=new T.Mesh(pegShape,index===selected?pickedMaterial:pegMaterial);peg.position.set(point.x,(point.y||0)+.34,point.z);peg.userData.roadHandle=index;peg.renderOrder=6;draft.add(peg);});
  }
 };
}
