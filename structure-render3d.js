import * as T from './vendor/three.module.min.js';
import {MAX_PARTS} from './limits3d.js?v=20261113c';
export const BATCH_TYPES=new Set(['wall','floor','roof','ramp','box','platform']);
export const isBatchedStructure=o=>BATCH_TYPES.has(o.type);
const batchKey=o=>o.rampStyle?'ramp:'+o.rampStyle:o.wallStyle?'wall:'+o.wallStyle:o.type;
// Logical meshes remain available for precise selection and raycasts on layer 1.
// Visible copies share a draw call per shape on layer 2, independent of part count.
export function createStructureRenderer(scene,materials,geometries){
 const batches=new Map(),stamp=new Map(),matrix=new T.Matrix4(),white=new T.Color('white');
 for(const type of [...BATCH_TYPES,...Object.keys(geometries).filter(key=>key.includes(':'))]){const material=new T.MeshStandardMaterial({color:'white',roughness:.9}),batch=new T.InstancedMesh(geometries[type]||geometries.box,material,MAX_PARTS);batch.count=0;batch.layers.set(2);batch.frustumCulled=false;batch.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(batch);batches.set(type,batch);stamp.set(type,[]);}
 return {mark(mesh){mesh.traverse(child=>child.layers.set(1));},sync(objects,meshes,time=0){
  const counts=new Map();for(const o of objects){if(!isBatchedStructure(o)||o.hidden||o.collected)continue;const kind=batchKey(o),batch=batches.get(kind),i=counts.get(kind)||0;counts.set(kind,i+1);const source=meshes.get(o.id);if(!source)continue;
   const hit=o.hitUntil>time,key=[o.id,o.x,o.y,o.z,o.w,o.h,o.d,o.rotation||0,hit].join(':');if(stamp.get(kind)[i]===key)continue;stamp.get(kind)[i]=key;source.updateMatrixWorld(true);const shape=source.children[0];matrix.copy(shape.matrixWorld);batch.setMatrixAt(i,matrix);batch.setColorAt(i,hit?white:materials[o.type].color);batch.instanceMatrix.needsUpdate=true;if(batch.instanceColor)batch.instanceColor.needsUpdate=true;
  }
  for(const [type,batch]of batches)batch.count=counts.get(type)||0;
 }};
}
