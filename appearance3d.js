export const GUN_SHAPES={blaster:'ブラスター',robot:'ロボットブラスター',pistol:'ピストル',smg:'サブマシンガン',rifle:'ライフル',sniper:'スナイパーライフル',shotgun:'ショットガン',grenade:'グレネードランチャー',launcher:'ランチャー',powerLauncher:'パワーランチャー'};
export const GUN_COLORS={'#6ec3c0':'みずいろ','#7d62dd':'むらさき','#ee91a5':'ピンク','#eeb35f':'オレンジ','#6eae76':'みどり','#557ac0':'あお','#9ca3af':'グレー','#edf1f7':'しろ','#46516b':'くろ'};
export const DEFAULT_APPEARANCE=Object.freeze({shape:'blaster',color:'#6ec3c0',accent:'#46516b',barrel:1,suppressor:false});
export function appearanceFor(tool){const a=tool?.appearance||{};return {shape:Object.hasOwn(GUN_SHAPES,a.shape)?a.shape:'blaster',color:Object.hasOwn(GUN_COLORS,a.color)?a.color:DEFAULT_APPEARANCE.color,accent:Object.hasOwn(GUN_COLORS,a.accent)?a.accent:DEFAULT_APPEARANCE.accent,barrel:Number.isFinite(a.barrel)?Math.max(1,Math.min(1.8,a.barrel)):1,suppressor:a.suppressor===true};}
export function validAppearance(a){return a===undefined||!!a&&Object.hasOwn(GUN_SHAPES,a.shape)&&Object.hasOwn(GUN_COLORS,a.color)&&Object.hasOwn(GUN_COLORS,a.accent)&&Number.isFinite(a.barrel)&&a.barrel>=1&&a.barrel<=1.8&&(a.suppressor===undefined||typeof a.suppressor==='boolean');}
// A single layout drives both the side preview and the 3D model. Forward is -Z.
export function gunLayout(tool){const a=appearanceFor(tool),parts=[],dark='#27334a';
 const box=(role,x,y,z,w,h,d,color=a.accent)=>parts.push({type:'box',role,x,y,z,w,h,d,color});
 const tube=(role,x,y,rear,length,radius,color=a.accent)=>{const p={type:'tube',role,x,y,z:rear-length/2,length,radius,color};parts.push(p);return {x,y,z:rear-length,radius};};
 // The original robot gun is a single straight rectangular barrel.
 if(a.shape==='robot'){
  const rear=.235/.6,length=(.65/.6)*a.barrel;
  box('body',0,0,.25,.15/.6,.17/.6,.28,a.color);
  box('grip',0,-.1,.25,.12,.12,.12);
  box('barrel',0,0,rear-length/2,.15/.6,.17/.6,length,a.color);
  let muzzle={x:0,y:0,z:rear-length,radius:.075};
  if(a.suppressor)muzzle=tube('suppressor',0,0,muzzle.z+.025,.34,.11);
  return {parts,muzzle};
 }
 const long=['rifle','sniper','shotgun'].includes(a.shape),bodyLength=long?.85:a.shape==='powerLauncher'?.72:a.shape==='pistol'?.42:.55;
 box('body',0,0,0,a.shape==='powerLauncher'?.42:.28,a.shape==='pistol'?.17:.24,bodyLength,a.color);
 box('grip',0,-.24,.12,.15,.31,.18);
 if(long||a.shape==='grenade'||a.shape==='powerLauncher')box('stock',0,-.015,bodyLength/2+.19,.2,.24,.4);
 let length=.5,radius=.065,rear=-bodyLength/2+.035,y=.025;
 switch(a.shape){
  case 'pistol':length=.23;radius=.045;box('slide',0,.09,-.02,.21,.09,.44,a.color);break;
  case 'smg':length=.32;radius=.055;box('magazine',0,-.32,-.12,.13,.38,.16);box('stock',0,0,.42,.12,.14,.3);break;
  case 'rifle':length=.65;box('magazine',0,-.26,-.15,.14,.28,.2);box('sight',0,.2,-.16,.08,.13,.12);break;
  case 'sniper':length=1;radius=.045;box('scopeMount',0,.19,-.08,.12,.15,.28);tube('scope',0,.3,.18,.64,.085);box('magazine',0,-.23,-.12,.13,.24,.22);break;
  case 'shotgun':length=.76;radius=.075;box('pump',0,-.1,-.57,.22,.17,.4,a.color);tube('magazineTube',0,-.07,-.4,.6,.045);break;
  case 'grenade':length=.48;radius=.13;parts.push({type:'drum',role:'drum',axis:'z',x:0,y:-.19,z:-.03,length:.3,radius:.22,color:a.accent});box('grip',0,-.24,.3,.14,.3,.17);break;
  case 'launcher':length=.86;radius=.22;rear=-.15;y=.05;box('sight',0,y+radius+.05-.02,-.3,.11,.1,.22,a.color);break;
  case 'powerLauncher':length=1.08;radius=.28;rear=-.2;y=.08;box('brace',0,y+radius+.06-.02,-.42,.16,.12,.4,a.color);box('sidePlate',0,-.02,-.12,.54,.18,.3,a.color);break;
 }
 const barrel=tube('barrel',0,y,rear,length*a.barrel,radius);
 let muzzle=barrel;
 if(a.suppressor)muzzle=tube('suppressor',barrel.x,barrel.y,barrel.z+.025,.34,Math.max(.08,radius*1.28));
 return {parts,muzzle};}
export function gunPreviewSVG(tool){const {parts}=gunLayout(tool);let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 for(const p of parts){const d=p.type==='box'?p.d:p.type==='drum'&&p.axis!=='z'?p.radius*2:p.length,h=p.type==='box'?p.h:p.radius*2;minX=Math.min(minX,-p.z-d/2);maxX=Math.max(maxX,-p.z+d/2);minY=Math.min(minY,p.y-h/2);maxY=Math.max(maxY,p.y+h/2);}
 const scale=Math.min(310/(maxX-minX),125/(maxY-minY)),ox=(360-(maxX-minX)*scale)/2,oy=(170-(maxY-minY)*scale)/2,X=z=>ox+(-z-minX)*scale,Y=y=>oy+(maxY-y)*scale;
 let shapes='';for(const p of parts){if(p.type==='box')shapes+=`<rect x="${X(p.z+p.d/2)}" y="${Y(p.y+p.h/2)}" width="${p.d*scale}" height="${p.h*scale}" rx="2" fill="${p.color}"/>`;else if(p.type==='drum'){if(p.axis==='z'){const front=X(p.z-p.length/2),cy=Y(p.y),r=p.radius*scale;shapes+=`<rect x="${X(p.z+p.length/2)}" y="${cy-r}" width="${p.length*scale}" height="${r*2}" fill="${p.color}"/><ellipse cx="${front}" cy="${cy}" rx="${Math.min(6,r*.25)}" ry="${r}" fill="${p.color}" stroke="#27334a" stroke-width="1"/>`;}else shapes+=`<circle cx="${X(p.z)}" cy="${Y(p.y)}" r="${p.radius*scale}" fill="${p.color}"/>`;}else{const front=p.z-p.length/2,cx=X(front),cy=Y(p.y),r=p.radius*scale,rx=Math.min(6,r*.25);shapes+=`<rect x="${X(p.z+p.length/2)}" y="${cy-r}" width="${p.length*scale}" height="${r*2}" fill="${p.color}"/><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${r}" fill="${p.color}" stroke="#27334a" stroke-width="1"/><ellipse cx="${cx+.3}" cy="${cy}" rx="${rx*.62}" ry="${r*.65}" fill="#27334a"/>`;}}
 return `<svg viewBox="0 0 360 170" role="img" aria-label="銃の見た目のプレビュー"><rect width="360" height="170" rx="12" fill="#60748a"/><g stroke="#263348" stroke-width="1" stroke-linejoin="round">${shapes}</g></svg>`;}
