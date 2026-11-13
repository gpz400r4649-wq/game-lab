export const RAMP_PRESETS={ramp:'まっすぐのスロープ',inner:'角のスロープ・うちがわ',outer:'角のスロープ・そとがわ'};
export const FENCE_PRESETS={wall:'ふつうのかべ',fence:'さく・かべと同じ高さ',fenceHalf:'さく・半分の高さ'};
export function configureBuildingPart(o,key){if(o.type==='ramp'){if(key==='inner'||key==='outer')o.rampStyle=key;else delete o.rampStyle;}if(o.type==='wall'){if(key==='fence'||key==='fenceHalf'){o.wallStyle=key;o.h=key==='fenceHalf'?1.5:3;}else delete o.wallStyle;}return o;}
export function validArchitecture(o){return (o.rampStyle===undefined||o.type==='ramp'&&['inner','outer'].includes(o.rampStyle))&&(o.wallStyle===undefined||o.type==='wall'&&['fence','fenceHalf'].includes(o.wallStyle));}
export function architectureIcon(key){
 let shape='';
 if(key==='wall')shape='<rect x="10" y="12" width="64" height="44" fill="#d8b587"/><path d="M10 27H74M10 42H74M30 12V27M54 27V42M30 42V56"/>';
 else if(['ramp','inner','outer'].includes(key))shape=key==='ramp'?'<path d="M14 56L68 18V56Z" fill="#8dc5bc"/>':key==='outer'?'<path d="M12 56L40 14L72 56Z" fill="#8dc5bc"/><path d="M40 14V56"/>':'<path d="M12 16L40 38L72 16V56H12Z" fill="#8dc5bc"/><path d="M40 38V56"/>';
 else if(key.startsWith('fence'))shape=`<g transform="translate(0 ${key==='fenceHalf'?24:0}) scale(1 ${key==='fenceHalf'?.6:1})"><path d="M14 14V58M28 14V58M42 14V58M56 14V58M70 14V58M10 26H74M10 46H74" stroke-width="5"/></g>`;
 else {const window=key.startsWith('window'),wide=key==='fusuma',frame=key==='frame'||key==='windowFrame';shape=`<rect x="${wide?4:12}" y="10" width="${wide?76:60}" height="48" fill="#e1c59e" stroke-width="4"/><rect x="${wide?9:18}" y="${window?21:15}" width="${wide?66:48}" height="${window?26:40}" fill="${frame?'#eef4fa':window?'#b6dfef':key==='fusuma'?'#fff9e9':'#b58b66'}"/>${!frame?'<path d="M42 16V54"/>':''}${['doubleSlide','fusuma','slide','keyslide'].includes(key)?'<path d="M18 34H32m15 0h15M28 30l4 4-4 4m30-8 4 4-4 4"/>':['double','windowSwing'].includes(key)?'<path d="M34 29l-7 5 7 5m16-10 7 5-7 5"/>':''}`;}
 return `<svg viewBox="0 0 84 68" aria-hidden="true"><g stroke="#756654" stroke-width="2" stroke-linejoin="round" fill="none">${shape}</g></svg>`;
}

export function fenceSolids(o){
 const turned=o.rotation===90,width=turned?o.d:o.w,depth=turned?o.w:o.d,parts=[];
 const add=(x,y,w,h)=>parts.push({...o,type:'box',id:o.id+':bar:'+parts.length,sourceBlockId:o.id,wallStyle:undefined,open:false,x:o.x+(turned?0:x),z:o.z+(turned?-x:0),y:o.y+y,w:turned?depth:w,d:turned?w:depth,h});
 for(let i=0;i<=8;i++)add(-width/2+.1+(width-.2)*i/8,0,.16,o.h);for(const y of [.25,.75])add(0,o.h*y-.07,width,.14);return parts;
}
