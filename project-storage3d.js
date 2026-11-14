import {MAX_PARTS,MAX_PROJECT_BYTES} from './limits3d.js?v=20261114e';
const FORMAT='game-lab-3d-storage';
// Share repeated part definitions in browser storage; exported project JSON stays ordinary.
export function stringifyStoredProject(project){
 const normal=JSON.stringify(project);if(normal.length<100000||project.kind!=='game-lab-3d'||!Array.isArray(project.objects))return normal;
 const {objects,...base}=project,templates=[],indices=new Map(),rows=[];
 for(const object of objects){const {id,x,y,z,...definition}=object,key=JSON.stringify(definition);let index=indices.get(key);if(index===undefined){index=templates.length;templates.push(definition);indices.set(key,index);}rows.push([index,id,x,y,z]);}
 const packed=JSON.stringify({format:FORMAT,version:1,base,templates,parts:rows});return packed.length<normal.length?packed:normal;
}
export function parseStoredProject(text){
 if(typeof text!=='string'||text.length>MAX_PROJECT_BYTES)throw Error('保存した作品の大きさを確認してください');const data=JSON.parse(text);if(data?.kind==='game-lab-3d'||data?.format!==FORMAT)return data;
 if(data.version!==1||!data.base||typeof data.base!=='object'||Array.isArray(data.base)||!Array.isArray(data.templates)||data.templates.length>MAX_PARTS||!Array.isArray(data.parts)||data.parts.length>MAX_PARTS)throw Error('保存した作品を確認してください');
 let expanded=JSON.stringify(data.base).length;const sizes=data.templates.map(t=>JSON.stringify(t).length);
 for(const row of data.parts){if(!Array.isArray(row)||row.length!==5||!Number.isInteger(row[0])||row[0]<0||row[0]>=sizes.length)throw Error('保存したパーツを確認してください');expanded+=sizes[row[0]]+JSON.stringify(row).length;if(expanded>MAX_PROJECT_BYTES)throw Error('保存した作品が大きすぎます');}
 const objects=data.parts.map(row=>{if(!Array.isArray(row)||row.length!==5||!Number.isInteger(row[0])||row[0]<0||row[0]>=data.templates.length)throw Error('保存したパーツを確認してください');const template=data.templates[row[0]];if(!template||typeof template!=='object'||Array.isArray(template))throw Error('保存したパーツを確認してください');return {...structuredClone(template),id:row[1],x:row[2],y:row[3],z:row[4]};});
 return {...data.base,objects};
}
