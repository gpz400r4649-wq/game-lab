// World area is independent of object and projectile budgets.
export const WORLD_SIZES=[60,240,480,960];
export function worldSize(world){const n=typeof world==='number'?world:world?.worldSize;return WORLD_SIZES.includes(n)?n:60;}
export const worldHalf=world=>worldSize(world)/2;
export const coordinateLimit=world=>worldHalf(world)-2;
export function resizeReason(project,size){
 if(!WORLD_SIZES.includes(size))return 'ひろさをえらぼう';
 const half=size/2,limit=half-2;
 if(Math.abs(project.spawn.x)>limit||Math.abs(project.spawn.z)>limit||project.objects.some(o=>Math.abs(o.x)>limit||Math.abs(o.z)>limit||Math.abs(o.x)+o.w/2>half||Math.abs(o.z)+o.d/2>half))return '外にはみ出す部品やスタートがあります。先に内側へ動かそう。';
 return '';
}
export function spawnReason(project,x,z){
 if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>coordinateLimit(project)||Math.abs(z)>coordinateLimit(project))return 'マップの中をえらぼう';
 if(project.objects.some(o=>['box','wall','floor','roof','ramp','door','platform','moving','hazard'].includes(o.type)&&Math.abs(x-o.x)<o.w/2+.35&&Math.abs(z-o.z)<o.d/2+.35&&o.y<1.7))return '部品に重ならない地面をえらぼう';
 return '';
}
// Keep every displayed movement cell inside the map, including edge pages.
export function moveGridWindow(world,x=0,z=0){
 const limit=Math.floor(worldHalf(world)/4),count=Math.min(17,limit*2+1),half=Math.floor(count/2),low=-limit+half,high=limit-half;
 const centerX=Math.max(low,Math.min(high,Math.round(x))),centerZ=Math.max(low,Math.min(high,Math.round(z)));
 return {limit,count,centerX,centerZ,minX:centerX-half,maxX:centerX+half,minZ:centerZ-half,maxZ:centerZ+half};
}
export function moveGridPages(world){
 const {limit,count}=moveGridWindow(world),half=Math.floor(count/2),first=-limit+half,last=limit-half,centers=[];
 for(let center=first;center<=last;center+=count)centers.push(center);if(centers.at(-1)!==last)centers.push(last);return centers;
}
