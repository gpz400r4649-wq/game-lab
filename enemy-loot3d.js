import {dropPickup} from './loot3d.js?v=20261105h';
export function validEnemyLoot(o){return (o.dropHeldWeapon===undefined||o.type==='enemy'&&typeof o.dropHeldWeapon==='boolean')&&(o.enemyDrops===undefined||o.type==='enemy'&&Array.isArray(o.enemyDrops)&&o.enemyDrops.length<=6&&o.enemyDrops.every(d=>d&&['weapon','experience','key','star','heal'].includes(d.type)&&(d.type!=='weapon'||typeof d.weaponId==='string'&&d.weaponId.length<=100)));}
export function dropEnemyLoot(g,o){
 if(o.lootDropped)return;o.lootDropped=true;const entries=[...(o.dropHeldWeapon?[{type:'weapon',weaponId:o.enemyWeaponId}]:[]),...(o.enemyDrops||[])];
 for(const [i,d]of entries.entries()){if(d.type==='weapon'&&d.weaponId!=='@random'&&!g.toolCatalog?.some(t=>t.id===d.weaponId))continue;const angle=i*2.399963,source={...o,x:o.x+Math.cos(angle)*.6,z:o.z+Math.sin(angle)*.6};dropPickup(g,d.type==='experience'?'star':d.type,source,d.type==='weapon'?{weaponId:d.weaponId}:{});}
}
