import * as T from './vendor/three.module.min.js';
import {FURNITURE_SIZES,furniturePieces} from './furniture3d.js?v=20261118l';
const cube=new T.BoxGeometry(1,1,1).toNonIndexed(),cache=new Map();
export function furnitureGeometry(kind){
 if(cache.has(kind))return cache.get(kind);const size=FURNITURE_SIZES[kind],positions=[],colors=[],source=cube.getAttribute('position');
 for(const p of furniturePieces(kind)){const color=new T.Color(p.color);for(let i=0;i<source.count;i++){positions.push((source.getX(i)*p.w+p.x)/size.w,(source.getY(i)*p.h+p.y)/size.h,(source.getZ(i)*p.d+p.z)/size.d);colors.push(color.r,color.g,color.b);}}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();geometry.computeBoundingBox();cache.set(kind,geometry);return geometry;
}
export function makeFurnitureModel(o,material){const root=new T.Group(),size=FURNITURE_SIZES[o.furnitureKind],mesh=new T.Mesh(furnitureGeometry(o.furnitureKind),material);root.rotation.y=(o.rotation||0)*Math.PI/180;mesh.scale.set(size.w,size.h,size.d);root.add(mesh);return root;}
