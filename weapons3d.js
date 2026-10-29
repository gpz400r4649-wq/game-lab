export const LIMITS=Object.freeze({bullets:96,effects:16,pellets:8,minInterval:.08,maxInterval:2,minSize:.1,maxSize:1.2,maxDamage:30,maxSpeed:60,maxBlast:6,maxBlockHp:200,maxRange:60,maxRecoil:6,maxJitter:12,maxLife:18});
export const PROJECTILES={ball:'まるい弾',rocket:'ロケット弾'};
export const SHOT_PATTERNS={fan:'横に広がる',cone:'丸く広がる'};
export const IMPACTS={damage:'当たった相手にダメージ',explode:'爆発して、まわりにもダメージ',bounce:'ブロックで２回まで跳ね返る'};
export const SHOT_DEFAULTS=Object.freeze({projectile:'ball',impact:'damage',size:.2,spreadAngle:20,blastRadius:3,structureHp:20,range:60,recoil:0,aimJitter:0,pattern:'fan'});
export const DESTRUCTIBLE_TYPES=new Set(['box','platform','moving','wall','floor','roof','ramp']);
export function upgradeTool(t){if(!t||typeof t!=='object')return t;if(t.appearance&&Number.isFinite(t.appearance.barrel)&&t.appearance.barrel>=.5&&t.appearance.barrel<1)t.appearance.barrel=1;for(const [key,value] of Object.entries(SHOT_DEFAULTS))if(t[key]===undefined)t[key]=value;return t;}
const bounded=(n,min,max,fallback)=>Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
export function safeShot(t={}){return {range:bounded(t.range,2,60,60),recoil:bounded(t.recoil,0,6,0),jitter:bounded(t.aimJitter,0,12,0),pattern:Object.hasOwn(SHOT_PATTERNS,t.pattern)?t.pattern:'fan',speed:bounded(t.speed,5,60,24),damage:Math.round(bounded(t.damage,1,30,1)),count:Math.round(bounded(t.spread,1,8,1)),interval:bounded(t.interval,.08,2,.25),radius:bounded(t.size,.1,1.2,.2)/2,angle:bounded(t.spreadAngle,0,45,20)*Math.PI/180,impacts:impactEffects(t),projectile:Object.hasOwn(PROJECTILES,t.projectile)?t.projectile:'ball',impact:Object.hasOwn(IMPACTS,t.impact)?t.impact:'damage',blastRadius:bounded(t.blastRadius,1,6,3)};}

// New projects can combine effects; the legacy single effect keeps its behavior.
export function validImpacts(value){return Array.isArray(value)&&value.length<=3&&new Set(value).size===value.length&&value.every(v=>Object.hasOwn(IMPACTS,v));}
export function impactEffects(tool={}){if(validImpacts(tool.impacts))return [...tool.impacts];return tool.impact==='bounce'?['damage','bounce']:[Object.hasOwn(IMPACTS,tool.impact)?tool.impact:'damage'];}
export function weaponPresetKey(tool,presets){
 const effects=impactEffects(tool).sort().join(',');
 return Object.keys(presets).find(key=>Object.entries(presets[key]).every(([field,value])=>field==='name'||(field==='impact'?impactEffects(presets[key]).sort().join(',')===effects:tool[field]===value)))||'custom';
}

export function validHandling(t){return ['range','recoil','aimJitter'].every(key=>t[key]===undefined||(Number.isFinite(t[key])&&t[key]>=(key==='range'?2:0)&&t[key]<=(key==='range'?60:key==='recoil'?6:12)))&&(t.pattern===undefined||Object.hasOwn(SHOT_PATTERNS,t.pattern));}
export function cadenceHandling(interval){
 const n=bounded(interval,.08,2,.25);let t,recoil,aimJitter;
 if(n>=.25){t=Math.max(0,(.8-n)/.55);recoil=.2+.8*t;aimJitter=.3+.7*t;}
 else{t=(.25-n)/.17;recoil=1+3*t;aimJitter=1+4*t;}
 return {recoil:Math.round(recoil*100)/100,aimJitter:Math.round(aimJitter*100)/100};
}
