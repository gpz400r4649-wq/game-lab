import * as T from './vendor/three.module.min.js';
import {sampleRoad} from './road3d.js?v=20261119c';

const asphalt=new T.MeshStandardMaterial({color:0x333c4e,roughness:.98,side:T.DoubleSide});
const edges=new T.MeshBasicMaterial({color:0xe2e6ef,side:T.DoubleSide});
const centre=new T.MeshBasicMaterial({color:0xf3d88b,side:T.DoubleSide});
const draftSurface=new T.MeshStandardMaterial({color:0x404c6f,roughness:.95,side:T.DoubleSide});
const pegShape=new T.SphereGeometry(.65,12,8),pegMaterial=new T.MeshBasicMaterial({color:0xa88bff,depthTest:false}),pickedMaterial=new T.MeshBasicMaterial({color:0xffde88,depthTest:false});

function bearing(a,b){
 const x=b.x-a.x,z=b.z-a.z,length=Math.hypot(x,z);
 return length<.0001?null:{x:-z/length,z:x/length};
}
function ranges(path,closed){
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

function roadMesh(road,half,preview){
 const shape=road.closed&&road.points.length<3?{...road,closed:false}:road;
 const path=ranges(sampleRoad(shape),shape.closed),group=new T.Group();
 const pavement=[],borders=[],line=[];
 const inside=value=>Math.max(-half,Math.min(half,value));
 const at=(point,offset,height)=>[inside(point.x+point.nx*offset),height,inside(point.z+point.nz*offset)];
 const height=preview ? .051 : .025;
 function strip(buffer,a,b,min,max,level){
  const p=at(a,min,level),q=at(a,max,level),r=at(b,max,level),s=at(b,min,level);
  buffer.push(...p,...q,...r,...p,...r,...s);
 }
 const blend=(a,b,t)=>Object.fromEntries(['x','z','nx','nz'].map(key=>[key,a[key]+(b[key]-a[key])*t]));
 let travelled=0;
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],length=Math.hypot(a.x-b.x,a.z-b.z),radius=road.width/2;
  if(length<.0001)continue;
  strip(pavement,a,b,-radius,radius,height);
  strip(borders,a,b,-radius+.16,-radius+.27,height+.008);
  strip(borders,a,b,radius-.27,radius-.16,height+.008);
  for(let mark=Math.floor(travelled/5)*5;mark<travelled+length;mark+=5){
   const start=Math.max(0,(mark-travelled)/length),end=Math.min(1,(mark+2.4-travelled)/length);
   if(end>start)strip(line,blend(a,b,start),blend(a,b,end),-.065,.065,height+.009);
  }
  travelled+=length;
 }
 for(const [vertices,material] of [[pavement,preview?draftSurface:asphalt],[borders,edges],[line,centre]]){
  if(!vertices.length)continue;
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
  group.add(new T.Mesh(geometry,material));
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
  sync(next,extent){
   const key=JSON.stringify([next||[],extent]);if(key===stamp)return;
   stamp=key;roads=next||[];half=extent;showSaved();
  },
  showSnap(sites,point){
   snapGuide.visible=sites.length>0;
   for(const [index,dot] of dots.entries()){
    const site=sites[index];dot.visible=!!site;if(!site)continue;
    const active=site.x===point?.x&&site.z===point?.z;
    dot.position.set(site.x,.25,site.z);dot.material=active?activeMaterial:snapMaterial;dot.scale.setScalar(active?1.7:1);
   }
  },
  showDraft(road,selected=-1){
   clear(draft);draftId=road?.id||null;
   for(const model of saved.children)model.visible=model.userData.roadId!==draftId;
   if(!road)return;
   draft.add(roadMesh(road,half,true));
   road.points.forEach((point,index)=>{const peg=new T.Mesh(pegShape,index===selected?pickedMaterial:pegMaterial);peg.position.set(point.x,.34,point.z);peg.renderOrder=6;draft.add(peg);});
  }
 };
}
