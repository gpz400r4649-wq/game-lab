// Shared by editor, gameplay and placement preview. No browser dependency.
export const BUILD_TYPES={wall:'壁',floor:'床',roof:'屋根'};
export const TOOL_EFFECTS={shoot:'弾を撃つ',wall:'壁を出す',floor:'床を出す',roof:'屋根を出す'};
const defaults={speed:24,interval:.25,damage:1,spread:1};
export function makeTool(effect='shoot',name){return {id:crypto.randomUUID(),name:name||(effect==='shoot'?'ブラスター':BUILD_TYPES[effect]+'を出す建築銃'),effect,...defaults};}
export function defaultLoadout(weapon=defaults){const gun=makeTool();Object.assign(gun,weapon);return [gun];}
export function validTool(t){return !!t&&typeof t.id==='string'&&typeof t.name==='string'&&t.name.trim().length>0&&t.name.length<=32&&Object.hasOwn(TOOL_EFFECTS,t.effect)&&Number.isFinite(t.speed)&&t.speed>=5&&t.speed<=60&&Number.isFinite(t.interval)&&t.interval>=.1&&t.interval<=2&&Number.isInteger(t.damage)&&t.damage>=1&&t.damage<=10&&[1,3,5].includes(t.spread);}
export function constructionPart(type,x=0,z=0,y=0,rotation=0){
  const turned=rotation%180!==0;
  return {id:crypto.randomUUID(),type,x,y,z,rotation:turned?90:0,
    w:type==='wall'?(turned?.25:4):type==='floor'?3.75:4,
    h:type==='wall'?3:type==='floor'?.25:1.5,
    d:type==='wall'?(turned?4:.25):type==='floor'?3.75:4,hp:3,program:[],
    settings:{axis:'x',distance:3,speed:2,value:1,condition:'touch',required:1}};
}
export function rotatePiece(o){if(!Object.hasOwn(BUILD_TYPES,o.type))return;[o.w,o.d]=[o.d,o.w];o.rotation=o.rotation===90?0:90;}
export function topAt(o,x,z){
  if(o.type!=='roof')return o.y+o.h;
  const turned=o.rotation===90,offset=turned?z-o.z:x-o.x,width=turned?o.d:o.w;
  return o.y+o.h*Math.max(0,1-Math.abs(offset)/(width/2));
}
function intersects(a,b){return Math.abs(a.x-b.x)<(a.w+b.w)/2-.015&&Math.abs(a.z-b.z)<(a.d+b.d)/2-.015&&a.y<b.y+b.h-.015&&a.y+a.h>b.y+.015;}
export function placement(g,tool,point,rotation=0,level=0){
  if(!tool||!Object.hasOwn(BUILD_TYPES,tool.effect)||!point||!['x','y','z'].every(k=>Number.isFinite(point[k]))||![0,90].includes(rotation)||!Number.isInteger(level)||Math.abs(level)>4)return {piece:null,valid:false,reason:'建築する場所をえらぼう'};
  const rotated=rotation%180!==0;
  let x=Math.round(point.x/4)*4,z=Math.round(point.z/4)*4;
  if(tool.effect==='wall'){if(rotated)x=Math.round((point.x-2)/4)*4+2;else z=Math.round((point.z-2)/4)*4+2;}
  const base=Math.floor((Math.max(0,point.y)+.08)/3)*3;
  const y=base+level*3+(tool.effect==='roof'?3:0),piece=constructionPart(tool.effect,x,z,y,rotated?90:0);
  const no=reason=>({piece,valid:false,reason});
  if(g.objects.length>=150)return no('部品は全部で150個まで置けます');
  if(Math.abs(x)+piece.w/2>30||Math.abs(z)+piece.d/2>30||y<0||y>12)return no('ステージの中に置こう');
  if(Math.hypot(x-g.player.x,y-g.player.y,z-g.player.z)>12)return no('もう少し近づこう');
  const p=g.player;if(Math.abs(x-p.x)<piece.w/2+.35&&Math.abs(z-p.z)<piece.d/2+.35&&p.y<y+piece.h&&p.y+1.7>y)return no('自分に重ならない場所に置こう');
  for(const o of g.objects){
    if(o.open||!['wall','floor','roof','box','platform','moving','door'].includes(o.type)||!intersects(piece,o))continue;
    // Perpendicular wall ends can join to form a house corner.
    if(piece.type==='wall'&&o.type==='wall'&&piece.rotation!==(o.rotation||0)){
      const overlapX=(piece.w+o.w)/2-Math.abs(x-o.x),overlapZ=(piece.d+o.d)/2-Math.abs(z-o.z);
      if(overlapX<=.26&&overlapZ<=.26)continue;
    }
    return no('ここには部品があるよ。向き・高さ・場所を変えよう');
  }
  return {piece,valid:true,reason:'発射ボタンで置く'};
}
export function equipTool(g,p,index){if(!Number.isInteger(index)||index<0||index>=p.loadout.length)return false;g.equipped=index;g.cooldown=0;return true;}
export function placeStructure(g,p,input){
  const tool=p.loadout?.[g.equipped];
  const result=placement(g,tool,input.buildPoint,input.buildRotation||0,input.buildLevel||0);
  if(!result.valid){g.message=result.reason;g.messageId++;return result;}
  const o=result.piece;o.origin={x:o.x,y:o.y,z:o.z};o.built=true;g.objects.push(o);g.buildings.push(o);g.message=BUILD_TYPES[o.type]+'を建てた！';g.messageId++;return result;
}
export function undoStructure(g){const o=g.buildings.pop();if(!o)return false;g.objects=g.objects.filter(x=>x.id!==o.id);g.message='最後の建築をもどしたよ';g.messageId++;return true;}
export function keepStructures(p,g){
  const ids=new Set(p.objects.map(o=>o.id)),available=Math.max(0,150-p.objects.length),pieces=g.buildings.filter(o=>!ids.has(o.id)).slice(0,available).map(o=>{const {built,origin,...piece}=o;return structuredClone(piece);});
  p.objects.push(...pieces);return pieces.length;
}
