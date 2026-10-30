import {DESTRUCTIBLE_TYPES} from './weapons3d.js?v=20261030j';
import {blockTemplate} from './building3d.js?v=20261030j';
import {dropPickup} from './loot3d.js?v=20261030j';
// A fixed menu of one-shot events. Item creation is bounded by the loot limit.
export const EVENT_TYPES=new Set(['weapon','star','key','heal','door','checkpoint','goal']);
export const EVENT_LIMIT=6;
export const ACTION_NAMES={dropSelf:'このブロックをアイテムにする',dropWeapon:'銃アイテムを落とす',dropItem:'星・カギ・回復を落とす',addStar:'星の数をふやす',addKey:'カギの数をふやす',addScore:'得点をふやす',heal:'体力を回復する',openDoor:'ドアのカギをあける',giveTool:'設定した銃をひろう',spawnEnemy:'待機中の敵を出現させる',checkpoint:'ここをセーブポイントにする',win:'ステージクリアにする'};
export const AMOUNT_ACTIONS=new Set(['addScore','heal']);
export const TARGET_ACTIONS=new Set(['openDoor','giveTool','spawnEnemy','dropWeapon','dropItem']);
export function defaultActions(o){
  switch(o.type){
    case 'weapon':return [{type:'giveTool',target:o.weaponId||''}];
    case 'star':return [{type:'addStar'},{type:'addScore',amount:o.settings?.value||5}];
    case 'key':return [{type:'addKey'}];
    case 'heal':return [{type:'heal',amount:o.settings?.value||1}];
    case 'door':return [{type:'openDoor',target:o.id}];
    case 'checkpoint':return [{type:'checkpoint'}];
    case 'goal':return [{type:'win'}];
    default:return [];
  }
}
export const actionsFor=o=>o.events===undefined?defaultActions(o):o.events;
export function newAction(type,o){return {type,...(AMOUNT_ACTIONS.has(type)?{amount:1}:{}),...(TARGET_ACTIONS.has(type)?{target:type==='openDoor'&&o.type==='door'?o.id:type==='dropItem'?'star':''}:{})};}
export function validEvents(o){
  if(o.startsHidden!==undefined&&(o.type!=='enemy'||typeof o.startsHidden!=='boolean'))return false;
  if(o.weaponId!==undefined&&(o.type!=='weapon'||typeof o.weaponId!=='string'||o.weaponId.length>100))return false;
  const validList=(list,destroy)=>Array.isArray(list)&&list.length<=EVENT_LIMIT&&list.every(a=>a&&Object.hasOwn(ACTION_NAMES,a.type)&&(a.type!=='dropSelf'||destroy)&&(!AMOUNT_ACTIONS.has(a.type)||(Number.isInteger(a.amount)&&a.amount>=1&&a.amount<=20))&&(!TARGET_ACTIONS.has(a.type)||(typeof a.target==='string'&&a.target.length<=100))&&(a.type!=='dropItem'||['','star','key','heal'].includes(a.target)));
  if(o.events!==undefined&&(!EVENT_TYPES.has(o.type)||!validList(o.events,false)))return false;
  if(o.destroyEvents!==undefined&&(!DESTRUCTIBLE_TYPES.has(o.type)||!validList(o.destroyEvents,true)))return false;
  return true;
}
function runActions(g,p,o,actions,tell){
  const messages=[];
  for(const a of actions){
    switch(a.type){
      case 'dropSelf':if(dropPickup(g,'blockItem',o,{blockTemplate:blockTemplate(o)}))messages.push('ブロックがアイテムになった！');else messages.push('落ちているアイテムがいっぱいです。先に拾おう');break;
      case 'dropWeapon':if(p.loadout.some(t=>t.id===a.target)){if(dropPickup(g,'weapon',o,{weaponId:a.target}))messages.push('銃アイテムが落ちた！');else messages.push('落ちているアイテムがいっぱいです。先に拾おう');}break;
      case 'dropItem':if(['star','key','heal'].includes(a.target)){if(dropPickup(g,a.target,o))messages.push('アイテムが落ちた！');else messages.push('落ちているアイテムがいっぱいです。先に拾おう');}break;
      case 'addStar':g.stars++;messages.push('星を見つけた！');break;
      case 'addKey':g.keys++;messages.push('カギを手に入れた！');break;
      case 'addScore':g.score+=a.amount;messages.push(`得点 ＋${a.amount}`);break;
      case 'heal':g.player.hp=Math.min(5,g.player.hp+a.amount);messages.push('体力を回復した！');break;
      case 'openDoor':{const door=g.objects.find(x=>x.id===a.target&&x.type==='door');if(door){door.open=true;messages.push(door.doorMode==='free'?'ドアがあいた！':'ドアのカギがあいた！');}break;}
      case 'giveTool':{const index=p.loadout.findIndex(t=>t.id===a.target);if(index>=0){const tool=p.loadout[index];g.inventoryCounts??=Object.fromEntries(g.inventory.map(id=>[id,1]));const count=g.inventoryCounts[tool.id]||0;if(count>=99){messages.push('同じ銃は99こまで持てます');break;}if(!g.inventory.includes(tool.id))g.inventory.push(tool.id);g.inventoryCounts[tool.id]=count+1;g.equipped=index;g.blockEquipped=null;g.cooldown=0;g.recoilPitch=0;messages.push(tool.name+'をひろった！');}break;}
      case 'spawnEnemy':{const enemy=g.objects.find(x=>x.id===a.target&&x.type==='enemy'&&x.hidden&&x.hp>0);if(enemy){enemy.hidden=false;messages.push('敵が出現した！');}break;}
      case 'checkpoint':g.checkpoint={id:o.id,x:o.x,y:o.y,z:o.z};messages.push('セーブポイントを記録したよ');break;
      case 'win':if(g.player.hp>0){g.state='won';messages.push('ステージクリア！');}break;
    }
  }
  tell(messages.join(' / ')||(['star','key','heal'].includes(o.type)?'アイテムをひろった！':'イベントが起きた！'));
}

export function fireEvents(g,p,o,tell){if(o.triggered)return;o.triggered=true;runActions(g,p,o,actionsFor(o),tell);}
export function fireDestructionEvents(g,o){
 if(o.destroyedTriggered)return;o.destroyedTriggered=true;
 const actions=o.destroyEvents||[];if(!actions.length)return;
 runActions(g,{loadout:g.toolCatalog||[]},o,actions,message=>{g.message=message;g.messageId++;});
}
