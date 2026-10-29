import {topAt} from './building3d.js?v=20261029h';
export const LOOT_LIMIT=64;
export function makePickup(type,x=0,y=0,z=0,extra={}){return {id:crypto.randomUUID(),type,x,y,z,w:1,h:1,d:1,hp:1,program:[],settings:{axis:'x',distance:3,speed:2,value:type==='star'?5:1,condition:'touch',required:1},...extra};}
export function dropPickup(g,type,source,extra={}){
  g.drops??=[];
  if(g.drops.filter(o=>!o.collected).length>=LOOT_LIMIT){g.message='落ちているアイテムは64個まで。先に拾おう';g.messageId++;return null;}
  const item=makePickup(type,source.x,source.y+Math.min(.8,source.h/2),source.z,{...extra,pickupAt:(g.time||0)+.25,fallSpeed:0});g.drops.push(item);return item;
}
export function settleLoot(g,dt){
  for(const o of g.drops||[]){
    if(o.collected)continue;const before=o.y;o.fallSpeed=(o.fallSpeed||0)-12*dt;let y=Math.max(0,o.y+o.fallSpeed*dt);
    for(const s of g.objects)if(['box','platform','moving','wall','floor','roof','ramp','door'].includes(s.type)&&!s.open&&s.hp>0&&Math.abs(o.x-s.x)<=s.w/2&&Math.abs(o.z-s.z)<=s.d/2){const top=topAt(s,o.x,o.z);if(top<=before+.02&&top>=y)y=top;}
    if(y===0||y>o.y+o.fallSpeed*dt+.00001)o.fallSpeed=0;o.y=y;
  }
}
