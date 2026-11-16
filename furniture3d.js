export const FURNITURE_PRESETS={box:'ふつうのブロック',schoolDesk:'がくしゅうづくえ・１人用',longTable:'ながづくえ・３人用',chair:'いす'};
export const FURNITURE_SIZES={schoolDesk:{w:2,h:1.2,d:2},longTable:{w:6,h:1.2,d:2},chair:{w:2,h:1.3,d:2}};
export const isFurniture=o=>o?.type==='box'&&Object.hasOwn(FURNITURE_SIZES,o.furnitureKind);
export const isDesk=o=>isFurniture(o)&&o.furnitureKind!=='chair';
export function configureFurniture(o,key){
 delete o.furnitureKind;const size=FURNITURE_SIZES[key];if(!size){o.w=4;o.h=3;o.d=4;return o;}o.furnitureKind=key;const turned=(o.rotation||0)%180===90;o.w=turned?size.d:size.w;o.d=turned?size.w:size.d;o.h=size.h;return o;
}
export function validFurniture(o){if(o.furnitureKind===undefined)return true;if(!isFurniture(o)||o.wallStyle!==undefined||o.wallHalf!==undefined||o.floorHalf!==undefined)return false;const s=FURNITURE_SIZES[o.furnitureKind],turned=(o.rotation||0)%180===90;return Math.abs(o.w-(turned?s.d:s.w))<.001&&Math.abs(o.d-(turned?s.w:s.d))<.001&&Math.abs(o.h-s.h)<.001;}
const cache=new Map();
export function furniturePieces(kind){
 if(cache.has(kind))return cache.get(kind);const pieces=[],wood='#d8b27a',metal='#7b8897',add=(role,x,y,z,w,h,d,color)=>pieces.push({role,x,y,z,w,h,d,color});
 if(kind==='chair'){
  add('seat',0,.58,0,1.28,.12,1.26,wood);add('back',0,1.05,.57,1.28,.5,.12,wood);
  for(const x of [-.53,.53]){for(const z of [-.5,.5])add('leg',x,.26,z,.1,.52,.1,metal);add('back-post',x,.9,.54,.1,.8,.1,metal);}
 }else if(kind==='schoolDesk'||kind==='longTable'){
  const w=FURNITURE_SIZES[kind].w;add('top',0,1.14,0,w,.12,2,wood);
  for(const x of [-w/2+.18,w/2-.18])for(const z of [-.78,.78])add('leg',x,.54,z,.12,1.08,.12,metal);
  if(kind==='schoolDesk'){add('book-tray',0,.87,-.2,1.62,.06,1.2,metal);add('tray-back',0,.98,-.77,1.62,.16,.06,metal);for(const x of [-.82,.82])add('brace',x,.25,0,.12,.1,1.68,metal);}
  else add('beam',0,1,0,w-.36,.12,.14,metal);
 }
 cache.set(kind,pieces);return pieces;
}
export function furnitureSolids(o){
 const a=(o.rotation||0)*Math.PI/180,c=Math.round(Math.cos(a)),s=Math.round(Math.sin(a)),turned=(o.rotation||0)%180===90;
 return furniturePieces(o.furnitureKind).map((p,i)=>({...o,id:o.id+':furniture:'+i,sourceBlockId:o.id,furnitureKind:undefined,type:'box',open:false,x:o.x+c*p.x+s*p.z,y:o.y+p.y-p.h/2,z:o.z-s*p.x+c*p.z,w:turned?p.d:p.w,h:p.h,d:turned?p.w:p.d}));
}
export function furnitureTopAt(o,x,z){const parts=furnitureSolids(o).filter(p=>Math.abs(x-p.x)<=p.w/2+.001&&Math.abs(z-p.z)<=p.d/2+.001);return parts.length?Math.max(...parts.map(p=>p.y+p.h)):o.y;}
export function furnitureIcon(key){
 const chair=key==='chair',wide=key==='longTable';const shape=chair?'<path d="M22 39V12H58V39M22 12L29 8H65V35L58 39" fill="#d8b27a"/><path d="M18 44L27 36H64L55 44Z" fill="#d8b27a"/><path d="M18 44V61M55 44V61M27 36V53M64 36V53" stroke="#7b8897" stroke-width="4"/>':`<path d="M${wide?5:15} 30L${wide?20:30} 16H${wide?79:69}L${wide?64:54} 30Z" fill="#d8b27a"/><path d="M${wide?5:15} 30V35H${wide?64:54}L${wide?79:69} 21V16M${wide?64:54} 30V35" fill="#bd925f"/><path d="M${wide?10:20} 35V60M${wide?60:50} 35V60M${wide?24:34} 23V48M${wide?74:64} 23V48" stroke="#7b8897" stroke-width="4"/>${wide?'':'<path d="M23 42H51L63 32" stroke="#7b8897" stroke-width="4"/>'}`;
 return `<svg viewBox="0 0 84 68" aria-hidden="true"><g stroke="#756654" stroke-width="2" stroke-linejoin="round">${shape}</g></svg>`;
}
