export const ROOF_SHELL_RATIO=1/12;
export const ROOF_PRESETS={roof:'小さな三角屋根・１マス',roofSlope:'ななめの屋根',gableLeft:'屋根の三角かべ・左がひくい',gableRight:'屋根の三角かべ・右がひくい'};
export const RAMP_PRESETS={ramp:'まっすぐのスロープ',inner:'角のスロープ・うちがわ',outer:'角のスロープ・そとがわ'};
export const FENCE_PRESETS={wall:'ふつうのかべ',diagonal:'ななめのかべ・１マス',halfVertical:'たてハーフ・はばが半分',halfHorizontal:'よこハーフ・高さが半分',fence:'さく・かべと同じ高さ',fenceHalf:'さく・半分の高さ'};
export function configureBuildingPart(o,key){
 if(o.type==='ramp'){if(key==='inner'||key==='outer')o.rampStyle=key;else delete o.rampStyle;}
 if(o.type==='roof'){if(key==='roofSlope'){o.roofStyle='slope';o.h=3;}else delete o.roofStyle;}
 if(o.type==='wall'){delete o.wallStyle;delete o.wallHalf;delete o.wallGable;const turned=o.rotation===90,width=key==='halfVertical'?2:4;o.w=turned?.25:width;o.d=turned?width:.25;o.h=['fenceHalf','halfHorizontal'].includes(key)?1.5:3;
  if(key==='diagonal'){o.wallStyle='diagonal';o.w=o.d=4;}if(key==='fence'||key==='fenceHalf')o.wallStyle=key;if(key==='halfVertical'||key==='halfHorizontal')o.wallHalf=key;if(['gableLeft','gableRight'].includes(key))o.wallGable=key;
 }return o;
}
export function validArchitecture(o){return (o.rampStyle===undefined||o.type==='ramp'&&['inner','outer'].includes(o.rampStyle))&&(o.wallStyle===undefined||o.type==='wall'&&['fence','fenceHalf','diagonal'].includes(o.wallStyle)&&!(o.wallStyle==='diagonal'&&(o.wallHalf!==undefined||o.wallGable!==undefined||Math.abs(o.w-4)>.001||Math.abs(o.d-4)>.001)))&&(o.roofStyle===undefined||o.type==='roof'&&o.roofStyle==='slope')&&(o.wallGable===undefined||o.type==='wall'&&['gableLeft','gableRight'].includes(o.wallGable)&&o.wallStyle===undefined&&o.wallHalf===undefined)&&(o.wallHalf===undefined||o.type==='wall'&&['halfVertical','halfHorizontal'].includes(o.wallHalf)&&o.wallStyle===undefined);}
export function architectureIcon(key){
 let shape='';
 if(key==='roofSlope')shape='<path d="M10 48L59 12L75 23L26 59Z" fill="#ac8270"/><path d="M10 48V54L26 64V59M26 64L75 28V23"/>';
 else if(key==='roof')shape='<path d="M10 48L42 12L74 48Z" fill="#ac8270"/>';
 else if(key==='gableLeft'||key==='gableRight')shape=key==='gableLeft'?'<path d="M10 58L74 12V58Z" fill="#d8b587"/>':'<path d="M10 12L74 58H10Z" fill="#d8b587"/>';
 else if(key==='diagonal')shape='<path d="M12 52L64 12L72 17L20 57Z" fill="#d8b587"/><path d="M12 52V25L64 0V12M20 57V30L72 5V17"/><path d="M12 25L20 30L72 5L64 0Z" fill="#eed5ae"/>';
 else if(key==='wall')shape='<rect x="10" y="12" width="64" height="44" fill="#d8b587"/><path d="M10 27H74M10 42H74M30 12V27M54 27V42M30 42V56"/>';
 else if(key==='halfVertical'||key==='halfHorizontal')shape=`<rect x="10" y="12" width="64" height="44" stroke-dasharray="4 3" stroke="#b9af9f"/><rect x="10" y="${key==='halfHorizontal'?34:12}" width="${key==='halfVertical'?32:64}" height="${key==='halfHorizontal'?22:44}" fill="#d8b587"/>`;
 else if(['ramp','inner','outer'].includes(key))shape=key==='ramp'?'<path d="M14 56L68 18V56Z" fill="#8dc5bc"/>':key==='outer'?'<path d="M12 56L40 14L72 56Z" fill="#8dc5bc"/><path d="M40 14V56"/>':'<path d="M12 16L40 38L72 16V56H12Z" fill="#8dc5bc"/><path d="M40 38V56"/>';
 else if(key.startsWith('fence'))shape=`<g transform="translate(0 ${key==='fenceHalf'?24:0}) scale(1 ${key==='fenceHalf'?.6:1})"><path d="M14 14V58M28 14V58M42 14V58M56 14V58M70 14V58M10 26H74M10 46H74" stroke-width="5"/></g>`;
 else {const window=key.startsWith('window'),glass=key.startsWith('glass'),single=['key','swing','frame','glassSwing'].includes(key),wide=['fusuma','glassFusuma'].includes(key),frame=key==='frame'||key==='windowFrame';shape=`<rect x="${wide?4:12}" y="10" width="${wide?76:60}" height="48" fill="#e1c59e" stroke-width="4"/><rect x="${wide?9:single?16:18}" y="${window?21:15}" width="${wide?66:single?24:48}" height="${window?26:40}" fill="${frame?'#eef4fa':window||glass?'#b6dfef':key==='fusuma'?'#fff9e9':'#b58b66'}"/>${!frame&&!single?(wide?'<path d="M25 16V54M42 16V54M59 16V54"/>':'<path d="M42 16V54"/>'):''}${['doubleSlide','fusuma','slide','keyslide','glassSlide','glassFusuma'].includes(key)?'<path d="M18 34H32m15 0h15M28 30l4 4-4 4m30-8 4 4-4 4"/>':['double','windowSwing','glassDouble'].includes(key)?'<path d="M34 29l-7 5 7 5m16-10 7 5-7 5"/>':''}`;}
 return `<svg viewBox="0 0 84 68" aria-hidden="true"><g stroke="#756654" stroke-width="2" stroke-linejoin="round" fill="none">${shape}</g></svg>`;
}

export function fenceSolids(o){
 const turned=o.rotation===90,width=turned?o.d:o.w,depth=turned?o.w:o.d,parts=[];
 const add=(x,y,w,h)=>parts.push({...o,type:'box',id:o.id+':bar:'+parts.length,sourceBlockId:o.id,wallStyle:undefined,open:false,x:o.x+(turned?0:x),z:o.z+(turned?-x:0),y:o.y+y,w:turned?depth:w,d:turned?w:depth,h});
 for(let i=0;i<=8;i++)add(-width/2+.1+(width-.2)*i/8,0,.16,o.h);for(const y of [.25,.75])add(0,o.h*y-.07,width,.14);return parts;
}

export const DIAGONAL_THICKNESS=.25;
export const isDiagonal=o=>o?.type==='wall'&&o.wallStyle==='diagonal';
export function diagonalPolygon(o){
 const t=DIAGONAL_THICKNESS/Math.SQRT2/4,points=[[-.5,-.5],[-.5,-.5+t],[.5-t,.5],[.5,.5],[.5,.5-t],[-.5+t,-.5]],turned=o.rotation===90;
 return points.map(([x,z])=>[o.x+(turned?z:x)*o.w,o.z+(turned?-x:z)*o.d]);
}
export function diagonalInterval(o,axis,other,radius=0){
 const sign=o.rotation===90?-1:1,otherKey=axis==='x'?'z':'x',center=o[axis]+sign*(other-o[otherKey]),band=DIAGONAL_THICKNESS/Math.SQRT2+Math.SQRT2*radius;
 if(Math.abs(other-o[otherKey])>(otherKey==='x'?o.w:o.d)/2+radius)return [Infinity,-Infinity];
 const half=(axis==='x'?o.w:o.d)/2+radius;return [Math.max(o[axis]-half,center-band),Math.min(o[axis]+half,center+band)];
}
export function diagonalContains(o,x,z,radius=0){const [lo,hi]=diagonalInterval(o,'x',z,radius);return x>=lo&&x<=hi;}
export function diagonalDistance(o,point){
 if(diagonalContains(o,point.x,point.z))return 0;const polygon=diagonalPolygon(o);let best=Infinity;
 for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((point.x-a[0])*dx+(point.z-a[1])*dz)/(dx*dx+dz*dz)));best=Math.min(best,Math.hypot(point.x-a[0]-t*dx,point.z-a[1]-t*dz));}return best;
}
export function footprintsIntersect(a,b,margin=.015){
 const polygon=o=>isDiagonal(o)?diagonalPolygon(o):[[o.x-o.w/2,o.z-o.d/2],[o.x+o.w/2,o.z-o.d/2],[o.x+o.w/2,o.z+o.d/2],[o.x-o.w/2,o.z+o.d/2]],pa=polygon(a),pb=polygon(b);
 for(const p of [pa,pb])for(let i=0;i<p.length;i++){const next=p[(i+1)%p.length],dx=next[0]-p[i][0],dz=next[1]-p[i][1],len=Math.hypot(dx,dz),project=q=>(q[0]*dz-q[1]*dx)/len,aa=pa.map(project),bb=pb.map(project);if(Math.min(...aa)>=Math.max(...bb)-margin||Math.min(...bb)>=Math.max(...aa)-margin)return false;}return true;
}
