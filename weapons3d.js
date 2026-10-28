export const LIMITS=Object.freeze({bullets:96,effects:16,pellets:8,minInterval:.08,maxInterval:2,minSize:.1,maxSize:1.2,maxDamage:30,maxSpeed:60,maxBlast:6,maxBlockHp:200});
export const PROJECTILES={ball:'まるい弾',rocket:'ロケット弾'};
export const IMPACTS={damage:'当たった相手にダメージ',explode:'爆発して、まわりにもダメージ',bounce:'ブロックで２回まで跳ね返る'};
export const SHOT_DEFAULTS=Object.freeze({projectile:'ball',impact:'damage',size:.2,spreadAngle:20,blastRadius:3,structureHp:20});
export const DESTRUCTIBLE_TYPES=new Set(['box','platform','moving','wall','floor','roof','ramp']);
export function upgradeTool(t){if(!t||typeof t!=='object')return t;for(const [key,value] of Object.entries(SHOT_DEFAULTS))if(t[key]===undefined)t[key]=value;return t;}
const bounded=(n,min,max,fallback)=>Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
export function safeShot(t={}){return {speed:bounded(t.speed,5,60,24),damage:Math.round(bounded(t.damage,1,30,1)),count:Math.round(bounded(t.spread,1,8,1)),interval:bounded(t.interval,.08,2,.25),radius:bounded(t.size,.1,1.2,.2)/2,angle:bounded(t.spreadAngle,0,45,20)*Math.PI/180,impacts:impactEffects(t),projectile:Object.hasOwn(PROJECTILES,t.projectile)?t.projectile:'ball',impact:Object.hasOwn(IMPACTS,t.impact)?t.impact:'damage',blastRadius:bounded(t.blastRadius,1,6,3)};}

// New projects can combine effects; the legacy single effect keeps its behavior.
export function validImpacts(value){return Array.isArray(value)&&value.length<=3&&new Set(value).size===value.length&&value.every(v=>Object.hasOwn(IMPACTS,v));}
export function impactEffects(tool={}){if(validImpacts(tool.impacts))return [...tool.impacts];return tool.impact==='bounce'?['damage','bounce']:[Object.hasOwn(IMPACTS,tool.impact)?tool.impact:'damage'];}
export function weaponPresetKey(tool,presets){
 const effects=impactEffects(tool).sort().join(',');
 return Object.keys(presets).find(key=>Object.entries(presets[key]).every(([field,value])=>field==='name'||(field==='impact'?impactEffects(presets[key]).sort().join(',')===effects:tool[field]===value)))||'custom';
}
