import {makeTool} from './building3d.js?v=20261114c';
import {dropPickup} from './loot3d.js?v=20261114c';
export function validEnemyLoot(o){return (o.dropHeldWeapon===undefined||o.type==='enemy'&&typeof o.dropHeldWeapon==='boolean')&&(o.enemyDrops===undefined||o.type==='enemy'&&Array.isArray(o.enemyDrops)&&o.enemyDrops.length<=6&&o.enemyDrops.every(d=>d&&['weapon','experience','key','star','heal'].includes(d.type)&&(d.type!=='weapon'||typeof d.weaponId==='string'&&d.weaponId.length<=100)));}
export function dropEnemyLoot(g,o){
 if(o.lootDropped)return;o.lootDropped=true;const entries=[...(o.dropHeldWeapon?[{type:'weapon',weaponId:o.enemyWeaponId}]:[]),...(o.enemyDrops||[])];
 for(const [i,d]of entries.entries()){if(d.type==='weapon'&&d.weaponId!=='@random'&&!g.toolCatalog?.some(t=>t.id===d.weaponId))continue;const angle=i*2.399963,source={...o,x:o.x+Math.cos(angle)*.6,z:o.z+Math.sin(angle)*.6};dropPickup(g,d.type==='experience'?'star':d.type,source,d.type==='weapon'?{weaponId:d.weaponId}:{});}
}

// Only called when creating a new enemy, never while loading a saved one.
export function prepareEnemyDropWeapon(project,enemy){
 if(enemy.type!=='enemy'||!enemy.dropHeldWeapon||project.loadout.some(t=>t.id===enemy.enemyWeaponId&&t.effect==='shoot'))return;
 let gun=project.loadout.find(t=>t.effect==='shoot'&&t.pickupOnly&&t.appearance?.shape==='robot');
 if(!gun&&project.loadout.length<8){gun=makeTool('shoot','ロボットブラスター');Object.assign(gun,{pickupOnly:true,speed:(enemy.attackSpeed||3)+5,interval:1.4,appearance:{shape:'robot',color:'#7d62dd',accent:'#ee91a5',barrel:1}});project.loadout.push(gun);}
 gun??=project.loadout.find(t=>t.effect==='shoot');
 if(gun){enemy.enemyWeaponId=gun.id;if(enemy.characterOverrides&&!enemy.characterOverrides.includes('enemyWeaponId'))enemy.characterOverrides.push('enemyWeaponId');}
}
