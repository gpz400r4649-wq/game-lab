// A fixed menu of one-shot events: no scripts, loops or new object allocation.
export const EVENT_TYPES=new Set(['star','key','heal','door','checkpoint','goal']);
export const EVENT_LIMIT=6;
export const ACTION_NAMES={addStar:'星の数をふやす',addKey:'カギの数をふやす',addScore:'得点をふやす',heal:'体力を回復する',openDoor:'ドアのカギをあける',giveTool:'設定した銃をひろう',spawnEnemy:'待機中の敵を出現させる',checkpoint:'ここをセーブポイントにする',win:'ステージクリアにする'};
export const AMOUNT_ACTIONS=new Set(['addScore','heal']);
export const TARGET_ACTIONS=new Set(['openDoor','giveTool','spawnEnemy']);
export function defaultActions(o){
  switch(o.type){
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
export function newAction(type,o){return {type,...(AMOUNT_ACTIONS.has(type)?{amount:1}:{}),...(TARGET_ACTIONS.has(type)?{target:type==='openDoor'&&o.type==='door'?o.id:''}:{})};}
export function validEvents(o){
  if(o.startsHidden!==undefined&&(o.type!=='enemy'||typeof o.startsHidden!=='boolean'))return false;
  if(o.events===undefined)return true;
  return EVENT_TYPES.has(o.type)&&Array.isArray(o.events)&&o.events.length<=EVENT_LIMIT&&o.events.every(a=>a&&Object.hasOwn(ACTION_NAMES,a.type)&&(!AMOUNT_ACTIONS.has(a.type)||(Number.isInteger(a.amount)&&a.amount>=1&&a.amount<=20))&&(!TARGET_ACTIONS.has(a.type)||(typeof a.target==='string'&&a.target.length<=100)));
}
export function fireEvents(g,p,o,tell){
  if(o.triggered)return;
  o.triggered=true;
  const messages=[];
  for(const a of actionsFor(o)){
    switch(a.type){
      case 'addStar':g.stars++;messages.push('星を見つけた！');break;
      case 'addKey':g.keys++;messages.push('カギを手に入れた！');break;
      case 'addScore':g.score+=a.amount;messages.push(`得点 ＋${a.amount}`);break;
      case 'heal':g.player.hp=Math.min(5,g.player.hp+a.amount);messages.push('体力を回復した！');break;
      case 'openDoor':{const door=g.objects.find(x=>x.id===a.target&&x.type==='door');if(door){door.open=true;messages.push('ドアのカギがあいた！');}break;}
      case 'giveTool':{const index=p.loadout.findIndex(t=>t.id===a.target);if(index>=0){const tool=p.loadout[index];if(!g.inventory.includes(tool.id))g.inventory.push(tool.id);g.equipped=index;g.cooldown=0;g.recoilPitch=0;messages.push(tool.name+'をひろった！');}break;}
      case 'spawnEnemy':{const enemy=g.objects.find(x=>x.id===a.target&&x.type==='enemy'&&x.hidden&&x.hp>0);if(enemy){enemy.hidden=false;messages.push('敵が出現した！');}break;}
      case 'checkpoint':g.checkpoint={id:o.id,x:o.x,y:o.y,z:o.z};messages.push('セーブポイントを記録したよ');break;
      case 'win':if(g.player.hp>0){g.state='won';messages.push('ステージクリア！');}break;
    }
  }
  tell(messages.join(' / ')||(['star','key','heal'].includes(o.type)?'アイテムをひろった！':'イベントが起きた！'));
}
