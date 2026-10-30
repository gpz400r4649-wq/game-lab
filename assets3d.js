import {validAttackRange,validMoveRange,worldMoveRange} from './enemy-range3d.js?v=20261030b';
export const ASSET_LIMITS={ranges:64,enemies:32};
const keys=['hp','program','attackEnabled','attackSpeed','attackRange','searchRange','moveRange','chaseMode'];
const named=a=>a&&typeof a.id==='string'&&a.id.length>0&&a.id.length<=80&&typeof a.name==='string'&&a.name.trim().length>0&&a.name.length<=32;
const number=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
export function validEnemyConfig(c){return !!c&&Number.isInteger(c.hp)&&number(c.hp,1,20)&&Array.isArray(c.program)&&c.program.length<=8&&c.program.every(b=>b&&['chase','patrol','search'].includes(b.action)&&number(b.speed,.5,8))&&(c.attackEnabled===undefined||typeof c.attackEnabled==='boolean')&&(c.attackSpeed===undefined||number(c.attackSpeed,.5,8))&&(c.chaseMode===undefined||['always','inside','remember'].includes(c.chaseMode))&&validAttackRange(c.attackRange)&&validAttackRange(c.searchRange)&&validMoveRange(c.moveRange);}
export function validLibrary(lib){
 if(lib===undefined)return true;if(!lib||!Array.isArray(lib.ranges)||!Array.isArray(lib.enemies)||lib.ranges.length>ASSET_LIMITS.ranges||lib.enemies.length>ASSET_LIMITS.enemies)return false;
 const all=[...lib.ranges,...lib.enemies];if(!all.every(named)||new Set(all.map(a=>a.id)).size!==all.length)return false;
 return lib.ranges.every(a=>['moveRange','searchRange','attackRange'].includes(a.kind)&&a.range!==undefined&&(a.kind==='moveRange'?a.range.space==='world'&&validMoveRange(a.range):validAttackRange(a.range)))&&lib.enemies.every(a=>validEnemyConfig(a.config));
}
function collection(p,key){return (p.library??={ranges:[],enemies:[]})[key];}
function add(p,key,name,value){const text=name.trim();if(!text||text.length>32)throw Error('素材の名前を1〜32文字でつけよう');const list=collection(p,key);if(list.length>=ASSET_LIMITS[key])throw Error(`この素材は${ASSET_LIMITS[key]}個まで保存できます`);const asset={id:crypto.randomUUID(),name:text,...structuredClone(value)};list.push(asset);return asset;}
export function saveRangeAsset(p,o,kind,name){if(!['moveRange','searchRange','attackRange'].includes(kind))throw Error('はんいの種類を確認してください');if(!o[kind])throw Error('先にはんいを設定しよう');const range=kind==='moveRange'?worldMoveRange(o[kind],o):structuredClone(o[kind]);if(!(kind==='moveRange'?validMoveRange(range):validAttackRange(range)))throw Error('はんいを確認してください');return add(p,'ranges',name,{kind,range});}
export function saveEnemyAsset(p,o,name){const config=Object.fromEntries(keys.filter(k=>o[k]!==undefined).map(k=>[k,structuredClone(o[k])]));if(config.moveRange)config.moveRange=worldMoveRange(config.moveRange,o);if(!validEnemyConfig(config))throw Error('敵の設定を確認してください');return add(p,'enemies',name,{config});}
export function applyRangeAsset(o,asset,kind){if(asset.kind!==kind)throw Error('違う種類のはんいです');o[kind]=structuredClone(asset.range);}
export function applyEnemyAsset(o,asset){for(const key of keys)delete o[key];Object.assign(o,structuredClone(asset.config));return o;}
