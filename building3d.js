import {ROOF_SHELL_RATIO,isDiagonal,diagonalContains,footprintsIntersect} from './architecture3d.js?v=20261113m';
import {inheritNewCharacter} from './character-defaults3d.js?v=20261113m';
import {DEFAULT_APPEARANCE,validAppearance} from './appearance3d.js?v=20261113m';
import {MAX_PARTS,MAX_BUILD_Y,MAX_BUILD_LEVEL} from './limits3d.js?v=20261113m';
import {worldHalf,coordinateLimit} from './world3d.js?v=20261113m';
import {SHOT_DEFAULTS,LIMITS,PROJECTILES,IMPACTS,DESTRUCTIBLE_TYPES,validImpacts,validHandling} from './weapons3d.js?v=20261113m';
// Shared by editor, gameplay and placement preview. No browser dependency.
export const BUILD_TYPES={wall:'壁',floor:'床',roof:'屋根',ramp:'スロープ',diagonal:'ななめの壁',halfFloor:'ハーフの床'};
export const GRID={cell:4,layer:3,size:60};
export const GRID_PARTS=new Set(['box','platform','moving','bounce','hazard','door','wall','floor','roof','ramp']);
const snap=(value,step=GRID.cell,offset=0)=>Math.round((value-offset)/step)*step+offset;
function boundedGrid(value,extent,offset=0,world=60,step=4){extent=Math.max(step/2,extent);const lo=Math.ceil((-worldHalf(world)+extent-offset)/step)*step+offset,hi=Math.floor((worldHalf(world)-extent-offset)/step)*step+offset;return Math.max(lo,Math.min(hi,snap(value,step,offset)));}
export function alignPiece(o,world=60){
 if(!GRID_PARTS.has(o.type))return o;if(o.floorHalf){const turned=o.rotation===90;o.x=boundedGrid(o.x,o.w/2,turned?0:1,world,turned?4:2);o.z=boundedGrid(o.z,o.d/2,turned?1:0,world,turned?2:4);return o;}const bordered=['wall','door'].includes(o.type)&&!isDiagonal(o),turned=bordered&&o.rotation===90,half=o.wallHalf==='halfVertical',longOffset=half?1:o.type==='door'&&(turned?o.d:o.w)>=7.9?2:0;
 o.x=boundedGrid(o.x,o.w/2,turned?2:longOffset,world,half&&!turned?2:4);o.z=boundedGrid(o.z,o.d/2,bordered&&!turned?2:longOffset,world,half&&turned?2:4);return o;
}
export function gridStep(o,axis){if(o.floorHalf&&axis===(o.rotation===90?'z':'x'))return 2;if(o.wallHalf==='halfVertical'&&axis===(o.rotation===90?'z':'x'))return 2;if(o.wallHalf==='halfHorizontal'&&axis==='y')return 1.5;return GRID_PARTS.has(o.type)?axis==='y'?(['box','wall','floor','roof','ramp','door'].includes(o.type)?3:.5):4:axis==='y'?.5:1;}
const borderPart=o=>o&&['wall','door'].includes(o.type)&&!isDiagonal(o);
function orientBorder(o,rotation){if((o.rotation||0)!==rotation)[o.w,o.d]=[o.d,o.w];o.rotation=rotation;}
function rampFloorAnchor(ramp,normal,floor,point=null){
 const angle=(ramp.rotation||0)*Math.PI/180,high={x:-Math.sin(angle),z:-Math.cos(angle)},dot=(normal?.x||0)*high.x+(normal?.z||0)*high.z,side=normal&&Math.abs(normal.y)<.5;
 const low=side&&dot<-.5,dir=side&&Math.abs(dot)<.5?normal:low?{x:-high.x,z:-high.z}:high;
 return {x:snap(floor.w===2&&!dir.x&&point?point.x:ramp.x+dir.x*(ramp.w+floor.w)/2,floor.w===2?2:4,floor.w===2?1:0),z:snap(floor.d===2&&!dir.z&&point?point.z:ramp.z+dir.z*(ramp.d+floor.d)/2,floor.d===2?2:4,floor.d===2?1:0),y:snap(low?ramp.y:ramp.y+ramp.h,3)};
}
export function snapEditorPiece(o,point,target=null,normal=null,world=60){
  o.x=point.x;o.z=point.z;
  if(isDiagonal(o)){
   if(isDiagonal(target)){o.rotation=target.rotation||0;if(normal?.y>.5||normal?.y<-.5){o.x=target.x;o.z=target.z;o.y=normal.y>0?target.y+target.h:Math.max(0,target.y-o.h);}else{const sign=target.rotation===90?-1:1,direction=Math.sign(point.x-target.x+sign*(point.z-target.z))||1;o.x=target.x+direction*4;o.z=target.z+direction*sign*4;o.y=target.y;}}
   else o.y=target&&normal?.y>.5?Math.round(topAt(target,point.x,point.z)/3)*3:target?.y||0;
   return alignPiece(o,world);
  }
  if(o.wallGable&&target?.roofStyle==='slope'){
    const acrossX=(target.rotation||0)%180===90;orientBorder(o,acrossX?0:90);o.y=target.y;o.h=target.h;o.x=target.x;o.z=target.z;
    if(acrossX)o.z+=((Math.sign(point.z-target.z)||1)*target.d/2);else o.x+=((Math.sign(point.x-target.x)||1)*target.w/2);
    const angle=(target.rotation||0)*Math.PI/180,rise=acrossX?-Math.sin(angle):Math.cos(angle);o.wallGable=rise>0?'gableLeft':'gableRight';return alignPiece(o,world);
  }
  if(o.roofStyle==='slope'&&target?.wallGable){
    o.x=target.x-(target.rotation===90?2:0);o.z=target.z-(target.rotation===90?0:2);o.y=target.y;o.h=target.h;o.rotation=target.rotation===90?(target.wallGable==='gableLeft'?0:180):(target.wallGable==='gableLeft'?270:90);return alignPiece(o,world);
  }
  if(o.roofStyle==='slope'&&target?.roofStyle==='slope'){
    const dx=point.x-target.x,dz=point.z-target.z,axis=Math.abs(dx)/(target.w/2)>Math.abs(dz)/(target.d/2)?'x':'z',offset=point[axis]-target[axis],extent=target[axis==='x'?'w':'d']/2;
    if(Math.abs(offset)>=extent*.5){const direction=Math.sign(offset)||1,angle=(target.rotation||0)*Math.PI/180,high=axis==='x'?-Math.sin(angle):-Math.cos(angle),alongSlope=Math.abs(high)>.5,atPeak=alongSlope&&direction*high>0;o.x=target.x;o.z=target.z;o[axis]+=direction*(target[axis==='x'?'w':'d']+o[axis==='x'?'w':'d'])/2;o.y=target.y-(alongSlope&&!atPeak?target.h:0);o.rotation=atPeak?((target.rotation||0)+180)%360:target.rotation||0;return alignPiece(o,world);}
  }
  // A floor's broad top edge is easier to aim at than its 25 cm side.
  if(o.type==='floor'&&target?.type==='floor'&&normal?.y>.5){
    const dx=point.x-target.x,dz=point.z-target.z,edgeX=Math.abs(dx)/ (target.w/2),edgeZ=Math.abs(dz)/(target.d/2);
    if(Math.max(edgeX,edgeZ)>=.5){o.x=target.x;o.z=target.z;o.y=target.y;if(edgeX>edgeZ)o.x+=Math.sign(dx)*(target.w+o.w)/2;else o.z+=Math.sign(dz)*(target.d+o.d)/2;return alignPiece(o,world);}
  }
  // Walls, doors and windows share the same edge of the grid.
  // Use the existing piece's orientation instead of guessing from a thin frame's hit point.
  if(borderPart(o)&&borderPart(target)&&normal&&Math.abs(normal.y)>.5){
    orientBorder(o,target.rotation||0);const axis=o.rotation===90?'z':'x',other=axis==='x'?'z':'x',room=Math.max(0,(target[axis==='x'?'w':'d']-o[axis==='x'?'w':'d'])/2);
    o[axis]=target[axis]+Math.max(-room,Math.min(room,point[axis]-target[axis]));o[other]=target[other];o.y=Math.max(0,Math.min(MAX_BUILD_Y,normal.y>0?target.y+target.h:target.y-o.h));return alignPiece(o,world);
  }
  if(borderPart(o)&&borderPart(target)&&normal&&Math.abs(normal.y)<.5){
    orientBorder(o,target.rotation||0);const axis=o.rotation===90?'z':'x',other=axis==='x'?'z':'x',size=axis==='x'?'w':'d',direction=Math.abs(normal[axis])>.5?Math.sign(normal[axis]):Math.sign(point[axis]-target[axis])||1;
    o[axis]=target[axis]+direction*(target[size]+o[size])/2;o[other]=target[other];o.y=target.y;return alignPiece(o,world);
  }
  if(o.type==='floor'&&target?.type==='ramp'){Object.assign(o,rampFloorAnchor(target,normal,o,point));return alignPiece(o,world);}
  if(!GRID_PARTS.has(o.type)){o.x=Math.max(-coordinateLimit(world),Math.min(coordinateLimit(world),Math.round(o.x)));o.z=Math.max(-coordinateLimit(world),Math.min(coordinateLimit(world),Math.round(o.z)));if(target&&normal?.y>.5)o.y=Math.max(0,Math.min(MAX_BUILD_Y,topAt(target,point.x,point.z)));return o;}
  const side=target&&normal&&Math.abs(normal.y)<.5;
  if(borderPart(o)){
    orientBorder(o,side?(Math.abs(normal.x)>.5?90:0):Math.abs(point.x-snap(point.x,4,2))<Math.abs(point.z-snap(point.z,4,2))?90:0);
    if(side){o.x=target.x+normal.x*target.w/2;o.z=target.z+normal.z*target.d/2;}
  }else if(side){
    if(Math.abs(normal.x)>.5)o.x=target.x+normal.x*(target.w+o.w)/2;
    if(Math.abs(normal.z)>.5)o.z=target.z+normal.z*(target.d+o.d)/2;
  }
  if(target&&normal?.y>.5){
    if(borderPart(target)&&['floor','roof'].includes(o.type)){o.x=target.x-(target.rotation===90?2:0);o.z=target.z-(target.rotation!==90?2:0);}
    const top=topAt(target,point.x,point.z);
    o.y=o.type==='wall'&&target.type==='ramp'?Math.floor((target.y+.05)/3)*3:o.type==='roof'?(target.type==='floor'?snap(target.y,3)+3:Math.ceil((top-.02)/3)*3):['wall','floor','door'].includes(o.type)?snap(top,3):top;
  }else if(target&&normal?.y<-.5)o.y=Math.max(0,target.y-o.h);
  else if(side)o.y=target.y;
  else o.y=o.type==='roof'?3:['wall','floor','box'].includes(o.type)?0:o.y;
  o.y=Math.max(0,Math.min(MAX_BUILD_Y,o.y));return alignPiece(o,world);
}
function joins(a,b){
  if(!intersects(a,b))return true;
  if(isDiagonal(a)||isDiagonal(b)){
   if((a.type==='floor'||b.type==='floor')&&Math.abs(a.y-b.y)<.02)return true;
   const diagonal=isDiagonal(a)?a:b,other=diagonal===a?b:a;
   if(borderPart(other)){const turned=other.rotation===90,axis=turned?'x':'z',extent=turned?diagonal.w:diagonal.d;if(Math.abs(other[axis]-diagonal[axis])>=extent/2-.02)return true;}
   return !footprintsIntersect(a,b);
  }
  if(borderPart(a)&&borderPart(b)&&(a.rotation||0)!==(b.rotation||0)){const tx=a.rotation===90?a.w:b.w,tz=a.rotation===90?b.d:a.d;return (a.w+b.w)/2-Math.abs(a.x-b.x)<=Math.max(.26,tx/2+.02)&&(a.d+b.d)/2-Math.abs(a.z-b.z)<=Math.max(.26,tz/2+.02);}
  const wall=borderPart(a)?a:borderPart(b)?b:null,other=wall===a?b:a;
  if((wall||a.type==='door'||b.type==='door')&&(a.type==='floor'||b.type==='floor')&&Math.abs(a.y-b.y)<.02)return true;
  if(wall&&(other.type==='ramp'||other.roofStyle==='slope')){
    // Walls occupy the border of a cell; a ramp may fill that cell's interior.
    const thickness=wall.rotation===90?wall.w:wall.d;
    const penetration=wall.rotation===90?(wall.w+other.w)/2-Math.abs(wall.x-other.x):(wall.d+other.d)/2-Math.abs(wall.z-other.z);
    if(penetration<=thickness/2+.02)return true;
  }
  const ramp=a.type==='ramp'?a:b.type==='ramp'?b:null,floor=ramp===a?b:a;
  if(ramp&&floor.type==='floor'&&Math.abs(ramp.y-floor.y)<.02)return true;
  if(wall&&other.type==='box'){const penetration=wall.rotation===90?(wall.w+other.w)/2-Math.abs(wall.x-other.x):(wall.d+other.d)/2-Math.abs(wall.z-other.z);const thickness=wall.rotation===90?wall.w:wall.d;if(penetration<=Math.max(.15,thickness/2+.02))return true;}
  return false;
}
export function editorPlacementReason(piece,objects,spawn,world=60){
  if(objects.length>=MAX_PARTS)return '部品は2000個まで置けます';
  if(!Number.isFinite(piece.y)||piece.y<0||piece.y>MAX_BUILD_Y)return `高さは0〜${MAX_BUILD_Y}mの中に置こう`;
  if(!GRID_PARTS.has(piece.type))return '';
  if(Math.abs(piece.x)>coordinateLimit(world)||Math.abs(piece.z)>coordinateLimit(world)||Math.abs(piece.x)+piece.w/2>worldHalf(world)||Math.abs(piece.z)+piece.d/2>worldHalf(world))return 'ステージの中に置こう';
  if(spawn&&(!isDiagonal(piece)||diagonalContains(piece,spawn.x,spawn.z,.35))&&Math.abs(piece.x-spawn.x)<piece.w/2+.35&&Math.abs(piece.z-spawn.z)<piece.d/2+.35&&piece.y<spawn.y+1.7&&piece.y+piece.h>spawn.y)return 'スタートに重ならない場所に置こう';
  if(objects.some(o=>['wall','floor','roof','box','platform','moving','door','ramp'].includes(o.type)&&!joins(piece,o)))return '部品が重なるよ。別の面やマスをえらぼう';
  return '';
}
export const TOOL_EFFECTS={shoot:'弾を撃つ',wall:'壁を出す',floor:'床を出す',roof:'屋根を出す',ramp:'スロープを出す',diagonal:'ななめの壁を出す',halfFloor:'ハーフの床を出す'};
const defaults={speed:24,interval:.25,damage:1,spread:1};
export function makeTool(effect='shoot',name){return {id:crypto.randomUUID(),name:name||(effect==='shoot'?'ブラスター':BUILD_TYPES[effect]+'を出す建築銃'),effect,...defaults,...SHOT_DEFAULTS,...(effect==='shoot'?{recoil:1,aimJitter:1,appearance:{...DEFAULT_APPEARANCE,suppressor:true}}:{})};}
export function defaultLoadout(weapon=defaults){const gun=makeTool();Object.assign(gun,weapon);return [gun];}
export function validTool(t){return !!t&&validAppearance(t.appearance)&&validBuildChoices(t)&&validHandling(t)&&(t.impacts===undefined||validImpacts(t.impacts))&&(t.pickupOnly===undefined||typeof t.pickupOnly==='boolean')&&typeof t.id==='string'&&typeof t.name==='string'&&t.name.trim().length>0&&t.name.length<=32&&Object.hasOwn(TOOL_EFFECTS,t.effect)&&Number.isFinite(t.speed)&&t.speed>=5&&t.speed<=60&&Number.isFinite(t.interval)&&t.interval>=LIMITS.minInterval&&t.interval<=2&&Number.isInteger(t.damage)&&t.damage>=1&&t.damage<=LIMITS.maxDamage&&Number.isInteger(t.spread)&&t.spread>=1&&t.spread<=LIMITS.pellets&&Object.hasOwn(PROJECTILES,t.projectile)&&Object.hasOwn(IMPACTS,t.impact)&&Number.isFinite(t.size)&&t.size>=LIMITS.minSize&&t.size<=LIMITS.maxSize&&Number.isFinite(t.spreadAngle)&&t.spreadAngle>=0&&t.spreadAngle<=45&&Number.isFinite(t.blastRadius)&&t.blastRadius>=1&&t.blastRadius<=6&&Number.isInteger(t.structureHp)&&t.structureHp>=1&&t.structureHp<=200;}
export function constructionPart(type,x=0,z=0,y=0,rotation=0){
  if(type==='halfFloor')return {...constructionPart('floor',x,z,y,rotation),floorHalf:true,w:rotation%180===90?4:2,d:rotation%180===90?2:4};
  if(type==='diagonal')return {...constructionPart('wall',x,z,y,rotation),wallStyle:'diagonal',w:4,d:4};
  const turned=rotation%180!==0;
  return {id:crypto.randomUUID(),type,x,y,z,rotation:type==='ramp'?rotation%360:turned?90:0,
    w:type==='wall'?(turned?.25:4):4,
    h:type==='wall'||type==='ramp'?3:type==='floor'?.25:1.5,
    d:type==='wall'?(turned?4:.25):4,hp:20,destructible:true,destroyEvents:[{type:'dropSelf'}],program:[],
    settings:{axis:'x',distance:3,speed:2,value:1,condition:'touch',required:1}};
}
export function rotatePiece(o,world=60){if(o.floorHalf){const turned=o.rotation===90,cx=turned?o.x:snap(o.x),cz=turned?snap(o.z):o.z,dx=o.x-cx,dz=o.z-cz;o.x=cx+dz;o.z=cz-dx;[o.w,o.d]=[o.d,o.w];o.rotation=turned?0:90;alignPiece(o,world);return;}if(isDiagonal(o)){o.rotation=o.rotation===90?0:90;alignPiece(o,world);return;}if(o.wallHalf==='halfVertical'){const turned=o.rotation===90,cx=turned?o.x-2:snap(o.x),cz=turned?snap(o.z):o.z-2,offset=turned?-(o.z-cz):o.x-cx;[o.w,o.d]=[o.d,o.w];o.rotation=turned?0:90;o.x=turned?cx+offset:cx+2;o.z=turned?cz+2:cz-offset;alignPiece(o,world);return;}if(!Object.hasOwn(BUILD_TYPES,o.type)&&o.type!=='door')return;const anchor={x:o.x-(['wall','door'].includes(o.type)&&o.rotation===90?2:0),z:o.z-(['wall','door'].includes(o.type)&&o.rotation!==90?2:0)};[o.w,o.d]=[o.d,o.w];o.rotation=o.type==='ramp'||o.roofStyle==='slope'?((o.rotation||0)+90)%360:o.rotation===90?0:90;if(['wall','door'].includes(o.type)&&!(o.type==='door'&&Math.max(o.w,o.d)>=7.9)){o.x=anchor.x+(o.rotation===90?2:0);o.z=anchor.z+(o.rotation===0?2:0);}alignPiece(o,world);}
export function topAt(o,x,z){
  if(o.roofStyle==='slope'){const angle=(o.rotation||0)*Math.PI/180,localZ=Math.sin(angle)*(x-o.x)+Math.cos(angle)*(z-o.z),depth=(o.rotation||0)%180===90?o.w:o.d;return o.y+o.h*Math.max(0,Math.min(1,.5-localZ/depth));}
  if(o.wallGable){const angle=(o.rotation||0)*Math.PI/180,localX=Math.cos(angle)*(x-o.x)-Math.sin(angle)*(z-o.z),width=(o.rotation||0)%180===90?o.d:o.w;return o.y+o.h*Math.max(0,Math.min(1,.5+(o.wallGable==='gableLeft'?1:-1)*localX/width));}
  if(o.type==='ramp'){const angle=(o.rotation||0)*Math.PI/180,localZ=Math.sin(angle)*(x-o.x)+Math.cos(angle)*(z-o.z),localX=Math.cos(angle)*(x-o.x)-Math.sin(angle)*(z-o.z),turned=(o.rotation||0)%180===90,depth=turned?o.w:o.d,width=turned?o.d:o.w,u=Math.max(0,Math.min(1,.5-localZ/depth)),v=Math.max(0,Math.min(1,.5-localX/width));return o.y+o.h*(o.rampStyle==='inner'?Math.max(u,v):o.rampStyle==='outer'?Math.min(u,v):u);}if(o.type!=='roof')return o.y+o.h;
  const turned=o.rotation===90,offset=turned?z-o.z:x-o.x,width=turned?o.d:o.w;
  return o.y+o.h*Math.max(0,1-Math.abs(offset)/(width/2));
}
export function bottomAt(o,x,z){return o.roofStyle==='slope'?o.y+(topAt(o,x,z)-o.y)*(1-ROOF_SHELL_RATIO):o.y;}
function intersects(a,b){return Math.abs(a.x-b.x)<(a.w+b.w)/2-.015&&Math.abs(a.z-b.z)<(a.d+b.d)/2-.015&&a.y<b.y+b.h-.015&&a.y+a.h>b.y+.015;}
// Camera yaw and ramps share the same forward vector (-sin(yaw), -cos(yaw)).
// The wall's matching edge is the near edge, facing the player.
export function facingBuildRotation(yaw,offset=0){
 const angle=Number.isFinite(yaw)?yaw:0;
 return ((Math.round(angle/(Math.PI/2))*90+offset)%360+360)%360;
}
export function placement(g,tool,point,rotation=0,level=0){
  tool=activeBuildTool(g,tool);
  if(!tool||!Object.hasOwn(BUILD_TYPES,tool.effect)||!point||!['x','y','z'].every(k=>Number.isFinite(point[k]))||![0,90,180,270].includes(rotation)||!Number.isInteger(level)||Math.abs(level)>MAX_BUILD_LEVEL)return {piece:null,valid:false,reason:'建築する場所をえらぼう'};
  const rotated=rotation%180!==0;
  let x=Math.round(point.x/4)*4,z=Math.round(point.z/4)*4;
  if(point.surface?.type==='wall'&&point.normal?.y>.5&&['floor','halfFloor','roof'].includes(tool.effect)){x=point.surface.x-(point.surface.rotation===90?2:0);z=point.surface.z-(point.surface.rotation!==90?2:0);}
  if(tool.effect==='halfFloor'){if(rotated)z=snap(point.z,2,1);else x=snap(point.x,2,1);}
  // Rotate around the aimed cell, including the opposite two edges.
  if(tool.effect==='wall'){if(rotated)x+=rotation===90?2:-2;else z+=rotation===0?2:-2;}
  const base=tool.effect==='wall'&&point.surface?.type==='ramp'?Math.floor((point.surface.y+.05)/3)*3:Math.floor((Math.max(0,point.y)+.08)/3)*3;
  const roofOffset=tool.effect==='roof'&&!(point.surface?.type==='wall'&&point.normal?.y>.5)?3:0;
  const rampBase=tool.effect==='ramp'&&point.surface?.type==='floor'&&point.normal?.y>.5?point.surface.y+point.surface.h:base;
  let y=rampBase+level*3+roofOffset;
  if(['floor','halfFloor'].includes(tool.effect)&&point.surface?.type==='ramp'){const anchor=rampFloorAnchor(point.surface,point.normal,{w:tool.effect==='halfFloor'&&!rotated?2:4,d:tool.effect==='halfFloor'&&rotated?2:4},point);x=anchor.x;z=anchor.z;y=anchor.y+level*3;}
  const piece=constructionPart(tool.effect,x,z,y,tool.effect==='ramp'?rotation:rotated?90:0);
  const no=reason=>({piece,valid:false,reason});
  if(g.objects.length>=MAX_PARTS)return no('部品は全部で2000個まで置けます');
  if(Math.abs(x)>coordinateLimit(g)||Math.abs(z)>coordinateLimit(g)||Math.abs(x)+piece.w/2>worldHalf(g)||Math.abs(z)+piece.d/2>worldHalf(g)||y<0||y>MAX_BUILD_Y)return no('ステージの中に置こう');
  if(Math.hypot(x-g.player.x,y-g.player.y,z-g.player.z)>12)return no('もう少し近づこう');
  const p=g.player;if((!isDiagonal(piece)||diagonalContains(piece,p.x,p.z,.35))&&Math.abs(x-p.x)<piece.w/2+.35&&Math.abs(z-p.z)<piece.d/2+.35&&p.y<y+piece.h&&p.y+1.7>y)return no('自分に重ならない場所に置こう');
  for(const o of g.objects){
    if(o.open||!['wall','floor','roof','box','platform','moving','door','ramp'].includes(o.type)||joins(piece,o))continue;
    // Perpendicular wall ends can join to form a house corner.
    if(piece.type==='wall'&&o.type==='wall'&&piece.rotation!==(o.rotation||0)){
      const overlapX=(piece.w+o.w)/2-Math.abs(x-o.x),overlapZ=(piece.d+o.d)/2-Math.abs(z-o.z);
      if(overlapX<=.26&&overlapZ<=.26)continue;
    }
    return no('ここには部品があるよ。向き・高さ・場所を変えよう');
  }
  return {piece,valid:true,reason:'発射ボタンで置く'};
}
export function equipTool(g,p,index){if(!Number.isInteger(index)||index<0||index>=p.loadout.length||(g.inventory&&!g.inventory.includes(p.loadout[index].id)))return false;g.equipped=index;g.blockEquipped=null;g.cooldown=0;g.recoilPitch=0;return true;}
export function placeStructure(g,p,input){
  const tool=p.loadout?.[g.equipped];
  const result=placement(g,tool,input.buildPoint,input.buildRotation||0,input.buildLevel||0);
  if(!result.valid){g.message=result.reason;g.messageId++;return result;}
  const o=inheritNewCharacter(p,result.piece);o.maxHp=o.hp;o.origin={x:o.x,y:o.y,z:o.z};o.built=true;g.objects.push(o);g.buildings.push(o);g.message=BUILD_TYPES[o.type]+'を建てた！';g.messageId++;return result;
}
export function undoStructure(g){const o=g.buildings.at(-1);if(!o)return false;if(o.fromBlockItem&&!giveBlock(g,blockTemplate(o))){g.message='ブロックの持ちものがいっぱいです';g.messageId++;return false;}g.buildings.pop();g.objects=g.objects.filter(x=>x.id!==o.id);g.message='最後の建築をもどしたよ';g.messageId++;return true;}
export function keepStructures(p,g){
  const ids=new Set(p.objects.map(o=>o.id)),available=Math.max(0,MAX_PARTS-p.objects.length),pieces=g.buildings.filter(o=>!ids.has(o.id)).slice(0,available).map(o=>{const {built,origin,maxHp,hitUntil,fromBlockItem,...piece}=o;if(maxHp)piece.hp=maxHp;if(p.characterDefaults?.block){if(fromBlockItem)piece.characterOverrides=['hp','destructible'];else inheritNewCharacter(p,piece);}return structuredClone(piece);});
  p.objects.push(...pieces);return pieces.length;
}

export function blockTemplate(o){
 const turned=(o.rotation||0)%180===90;
 return {type:o.type,w:turned?o.d:o.w,h:o.h,d:turned?o.w:o.d,rotation:0,...(o.rampStyle?{rampStyle:o.rampStyle}:{}),...(o.wallStyle?{wallStyle:o.wallStyle}:{}),...(o.wallHalf?{wallHalf:o.wallHalf}:{}),...(o.floorHalf?{floorHalf:true}:{}),...(o.wallGable?{wallGable:o.wallGable}:{}),...(o.roofStyle?{roofStyle:o.roofStyle}:{}),hp:Math.max(1,Math.min(200,o.maxHp||o.hp||1)),destructible:o.destructible!==false,program:structuredClone(o.program||[]),settings:structuredClone(o.settings),destroyEvents:structuredClone(o.destroyEvents||[])};
}
export function giveBlock(g,template){
 g.blockInventory??=[];const key=JSON.stringify(template);let stack=g.blockInventory.find(s=>s.key===key);
 if(stack&&stack.count>=99)return false;
 if(!stack){g.blockInventory=g.blockInventory.filter(s=>s.count>0);if(g.blockInventory.length>=8)return false;stack={id:crypto.randomUUID(),key,template:structuredClone(template),count:0};g.blockInventory.push(stack);}
 stack.count++;g.blockEquipped=stack.id;g.equipped=-1;g.recoilPitch=0;return true;
}
export function equipBlock(g,id){const stack=g.blockInventory?.find(s=>s.id===id&&s.count>0);if(!stack)return false;g.blockEquipped=id;g.equipped=-1;g.cooldown=0;g.recoilPitch=0;return true;}
export function blockPlacement(g,point,rotation=0,level=0){
 const stack=g.blockInventory?.find(s=>s.id===g.blockEquipped),no=reason=>({piece:null,valid:false,reason});
 if(!stack||stack.count<=0)return no('拾ったブロックがありません');
 if(!point||!['x','y','z'].every(k=>Number.isFinite(point[k]))||![0,90,180,270].includes(rotation)||!Number.isInteger(level)||Math.abs(level)>MAX_BUILD_LEVEL)return no('置く場所をえらぼう');
 const t=stack.template;let piece;
 if(Object.hasOwn(BUILD_TYPES,t.type)){
  const result=placement(g,{effect:isDiagonal(t)?'diagonal':t.floorHalf?'halfFloor':t.type},point,rotation,level);if(!result.piece)return result;
  const turned=rotation%180!==0;piece={...structuredClone(t),id:crypto.randomUUID(),x:result.piece.x,y:result.piece.y,z:result.piece.z,rotation:result.piece.rotation,w:turned?t.d:t.w,d:turned?t.w:t.d};
  if(t.roofStyle==='slope')piece.rotation=rotation;
  if(t.wallHalf){if(t.wallHalf==='halfVertical')piece[rotation%180===90?'z':'x']=point[rotation%180===90?'z':'x'];else{const surface=point.surface,onTop=surface&&point.normal?.y>.5;piece.y=(onTop?(surface.type==='floor'?surface.y:topAt(surface,point.x,point.z)):Math.floor((Math.max(0,point.y)+.08)/1.5)*1.5)+level*1.5;}alignPiece(piece,g);}
 }else{
  piece=snapEditorPiece({...structuredClone(t),id:crypto.randomUUID(),x:0,y:0,z:0},point,point.surface,point.normal,g);piece.y+=level*3;
  if(rotation%180!==0)[piece.w,piece.d]=[piece.d,piece.w];piece.rotation=rotation%180;
 }
 let reason=editorPlacementReason(piece,g.objects,g.player,g);
 if(piece.y<0||piece.y>MAX_BUILD_Y)reason='ステージの中に置こう';
 if(Math.hypot(piece.x-g.player.x,piece.y-g.player.y,piece.z-g.player.z)>12)reason='もう少し近づこう';
 return {piece,valid:!reason,reason:reason||'発射ボタンで拾ったブロックを置く'};
}
export function placeBlock(g,input){
 const result=blockPlacement(g,input.buildPoint,input.buildRotation||0,input.buildLevel||0);
 if(!result.valid){g.message=result.reason;g.messageId++;return result;}
 const stack=g.blockInventory.find(s=>s.id===g.blockEquipped),o=result.piece;stack.count--;o.maxHp=o.hp;o.origin={x:o.x,y:o.y,z:o.z};o.built=true;o.fromBlockItem=true;g.objects.push(o);g.buildings.push(o);g.message='拾ったブロックを置いたよ';g.messageId++;return result;
}

export function validBuildChoices(tool){return tool.buildChoices===undefined||(tool.effect!=='shoot'&&Array.isArray(tool.buildChoices)&&tool.buildChoices.length>=1&&tool.buildChoices.length<=6&&new Set(tool.buildChoices).size===tool.buildChoices.length&&tool.buildChoices.includes(tool.effect)&&tool.buildChoices.every(t=>Object.hasOwn(BUILD_TYPES,t)));}
export function buildChoices(tool){return tool&&Object.hasOwn(BUILD_TYPES,tool.effect)?tool.buildChoices||[tool.effect]:[];}
export function activeBuildTool(g,tool){const selected=g?.buildSelection?.[tool?.id];return selected&&buildChoices(tool).includes(selected)?{...tool,effect:selected}:tool;}
export function selectBuildType(g,p,type){const tool=p.loadout?.[g.equipped];if(g.blockEquipped||!buildChoices(tool).includes(type)||(g.inventory&&!g.inventory.includes(tool.id)))return false;g.buildSelection??={};g.buildSelection[tool.id]=type;return true;}
export function cycleBuildType(g,p){const tool=p.loadout?.[g.equipped],choices=buildChoices(tool);if(choices.length<2||g.blockEquipped)return false;return selectBuildType(g,p,choices[(choices.indexOf(activeBuildTool(g,tool).effect)+1)%choices.length]);}
