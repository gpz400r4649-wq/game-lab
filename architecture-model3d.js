import {ROOF_SHELL_RATIO,diagonalPolygon} from './architecture3d.js?v=20261114b';
import * as T from './vendor/three.module.min.js';
const cube=new T.BoxGeometry(1,1,1);
export function makeCornerRampGeometry(style){
 const vertices=[],add=(a,b,c)=>vertices.push(...a,...b,...c),height=(x,z)=>style==='inner'?Math.max(.5-x,.5-z):Math.min(.5-x,.5-z);
 const corners=[[-.5,0,-.5],[.5,0,-.5],[.5,0,.5],[-.5,0,.5]],top=corners.map(([x,,z])=>[x,height(x,z),z]);
 add(top[0],top[2],top[1]);add(top[0],top[3],top[2]);add(corners[0],corners[1],corners[2]);add(corners[0],corners[2],corners[3]);
 for(let i=0;i<4;i++){const j=(i+1)%4;add(corners[i],top[i],top[j]);add(corners[i],top[j],corners[j]);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();geometry.computeBoundingBox();return geometry;
}
const fenceGeometries=new Map(),expandedCube=cube.toNonIndexed();
export function fenceGeometry(height=3,width=4){
 const h=height===1.5?1.5:3,key=h+':'+width;if(fenceGeometries.has(key))return fenceGeometries.get(key);
 const positions=[],source=expandedCube.getAttribute('position');
 const bar=(x,y,w,h)=>{for(let i=0;i<source.count;i++)positions.push(source.getX(i)*w+x,source.getY(i)*h+y,source.getZ(i));};
 const count=Math.max(1,Math.round(width/.5));for(let i=0;i<=count;i++)bar(-.5+.1/width+(1-.2/width)*i/count,.5,.16/width,1);for(const y of [.25,.75])bar(0,y,1,.14/h);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingBox();fenceGeometries.set(key,geometry);return geometry;
}
export function makeFenceModel(o,material){
 const root=new T.Group(),turned=o.rotation===90,w=turned?o.d:o.w,d=turned?o.w:o.d;root.rotation.y=(o.rotation||0)*Math.PI/180;
 const mesh=new T.Mesh(fenceGeometry(o.wallStyle==='fenceHalf'?1.5:3,w),material);mesh.scale.set(w,o.h,d);root.add(mesh);return root;
}

function heightPrism(topHeight,bottomHeight=()=>0){
 const vertices=[],add=(a,b,c)=>vertices.push(...a,...b,...c),corners=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]],top=corners.map(([x,z])=>[x,topHeight(x,z),z]),bottom=corners.map(([x,z])=>[x,bottomHeight(x,z),z]);
 add(top[0],top[2],top[1]);add(top[0],top[3],top[2]);add(bottom[0],bottom[1],bottom[2]);add(bottom[0],bottom[2],bottom[3]);for(let i=0;i<4;i++){const j=(i+1)%4;add(bottom[i],top[i],top[j]);add(bottom[i],top[j],bottom[j]);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();geometry.computeBoundingBox();return geometry;
}
export function makeRoofSlopeGeometry(){return heightPrism((x,z)=>.5-z,(x,z)=>(.5-z)*(1-ROOF_SHELL_RATIO));}
export function makeGableGeometry(style){return heightPrism(x=>style==='gableLeft'?.5+x:.5-x);}

export function makeDiagonalWallGeometry(){
 const polygon=diagonalPolygon({x:0,z:0,w:4,d:4,rotation:0}).map(([x,z])=>[x/4,z/4]),vertices=[],add=(a,b,c)=>vertices.push(...a,...b,...c),top=polygon.map(([x,z])=>[x,1,z]),bottom=polygon.map(([x,z])=>[x,0,z]);
 for(let i=1;i<polygon.length-1;i++){add(top[0],top[i],top[i+1]);add(bottom[0],bottom[i+1],bottom[i]);}
 for(let i=0;i<polygon.length;i++){const j=(i+1)%polygon.length;add(bottom[i],top[i],top[j]);add(bottom[i],top[j],bottom[j]);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();geometry.computeBoundingBox();return geometry;
}

export function makeHalfFloorGeometries(){return {'floor:halfLow':new T.BoxGeometry(1,1,.5).translate(0,0,-.25),'floor:halfHigh':new T.BoxGeometry(1,1,.5).translate(0,0,.25)};}
