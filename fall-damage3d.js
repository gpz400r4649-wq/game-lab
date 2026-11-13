export const FALL_BLOCK_HEIGHT=3;
export const FALL_DEFAULTS=Object.freeze({enabled:false,minBlocks:3,damage:1});
export function validFallDamage(rule){return rule===undefined||!!rule&&typeof rule==='object'&&typeof rule.enabled==='boolean'&&Number.isInteger(rule.minBlocks)&&rule.minBlocks>=1&&rule.minBlocks<=20&&Number.isInteger(rule.damage)&&rule.damage>=1&&rule.damage<=10;}
export function fallDamageForDistance(distance,rule){
 if(!rule?.enabled||!Number.isFinite(distance)||distance+1e-6<rule.minBlocks*FALL_BLOCK_HEIGHT)return 0;
 return Math.min(100,rule.damage*(1+Math.floor((distance-rule.minBlocks*FALL_BLOCK_HEIGHT+1e-6)/FALL_BLOCK_HEIGHT)));
}
export function resetPlayerFall(player){player.fallPeakY=player.y;player.fallAirborne=false;}
export function updatePlayerFall(player,before,rule,cushioned=false){
 const peak=Math.max(player.fallPeakY??before.y,before.y,player.y),airborne=!!player.fallAirborne||!before.grounded||!player.grounded;
 if(!player.grounded){player.fallPeakY=peak;player.fallAirborne=true;return 0;}
 const distance=Math.max(0,peak-player.y);resetPlayerFall(player);const damage=airborne&&!cushioned?fallDamageForDistance(distance,rule):0;
 if(damage){player.hp=Math.max(0,player.hp-damage);player.invincible=Math.max(player.invincible||0,.35);}return damage;
}
