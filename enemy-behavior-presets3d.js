import {chaseGraceSeconds} from './enemy-ai3d.js?v=20261111d';
import {defaultPatrolRoute,placeAtRouteStart} from './patrol-route3d.js?v=20261111d';
import {defaultEnemyRanges} from './enemy-range3d.js?v=20261111d';
// Examples combine existing actions, pursuit rules and speed. No runtime preset IDs are saved.
export const ENEMY_BEHAVIOR_EXAMPLES={
 still:{name:'その場で待つ',icon:'●',program:[],flow:'置いた場所で待つ。自分からは動かないよ。'},
 patrol:{name:'行ったり来たり',icon:'↔',program:[{action:'patrol',speed:2}],flow:'ルートのはじめへ → おわりへ → はじめへ。プレイヤーは追いかけないよ。'},
 slowPatrol:{name:'ゆっくり、行ったり来たり',icon:'🐢',program:[{action:'patrol',speed:1}],flow:'行ったり来たりする速さを、ゆっくりにした見本だよ。'},
 chaseAlways:{name:'はじめから追いかける',icon:'👣',program:[{action:'chase',speed:2}],chaseMode:'always',flow:'はじめから追いかける。気づくマスに入らなくても追うよ。'},
 chaseInside:{name:'近づくと追いかける',icon:'◎',program:[{action:'chase',speed:2}],chaseMode:'inside',flow:'待つ → 気づくマスで見つける → 追う。見失っても、設定した時間は追うよ。'},
 chaseRemember:{name:'見つけたら追い続ける',icon:'！',program:[{action:'chase',speed:2}],chaseMode:'remember',flow:'待つ → 見つける → 追い続ける。気づくマスを出ても追うよ。'},
 searchInside:{name:'歩いて探し、探し直す',icon:'🔎',program:[{action:'search',speed:2}],chaseMode:'inside',flow:'歩き回る → 見つける → 追う。見失った後、設定した時間がたつと、また歩いて探すよ。'},
 searchRemember:{name:'歩いて探し、追い続ける',icon:'🔍',program:[{action:'search',speed:2}],chaseMode:'remember',flow:'歩き回る → 見つける → その後は追い続けるよ。'},
 fastChase:{name:'すばやく追いかける',icon:'⚡',program:[{action:'chase',speed:4}],chaseMode:'inside',flow:'気づくマスに入ったら、速く追いかける。見失っても、設定した時間は追うよ。'}
};
export function basicEnemyBehavior(o){if(!o.program.length)return 'still';return o.program.length===1&&['chase','patrol','search'].includes(o.program[0].action)?o.program[0].action:'custom';}
export function enemyBehaviorExampleKey(o){if(o.routine)return 'custom';return Object.keys(ENEMY_BEHAVIOR_EXAMPLES).find(key=>{const example=ENEMY_BEHAVIOR_EXAMPLES[key];return o.program.length===example.program.length&&o.program.every((block,i)=>block.action===example.program[i].action&&block.speed===example.program[i].speed)&&(example.chaseMode===undefined||(o.chaseMode||'always')===example.chaseMode);})||'custom';}
export function applyEnemyBehaviorExample(o,key){
 const example=ENEMY_BEHAVIOR_EXAMPLES[key];if(!Object.hasOwn(ENEMY_BEHAVIOR_EXAMPLES,key))return false;
 if(example.program[0]?.action==='patrol'){o.patrolRoute??=defaultPatrolRoute(o);placeAtRouteStart(o,o.patrolRoute);}
 delete o.routine;if(o.characterOverrides&&example.program[0])o.movementSpeed=example.program[0].speed;o.program=structuredClone(example.program);if(example.chaseMode!==undefined)o.chaseMode=example.chaseMode;
 if(o.program.length){const defaults=defaultEnemyRanges(o);o.moveRange??=defaults.moveRange;if(example.chaseMode!==undefined)o.searchRange??=defaults.searchRange;}
 return true;
}
export function enemyBehaviorFlow(o){
 const action=basicEnemyBehavior(o),mode=o.chaseMode||'always';if(action==='still')return ENEMY_BEHAVIOR_EXAMPLES.still.flow;if(action==='patrol')return ENEMY_BEHAVIOR_EXAMPLES.patrol.flow;
 if(action==='chase')return ENEMY_BEHAVIOR_EXAMPLES[{always:'chaseAlways',inside:'chaseInside',remember:'chaseRemember'}[mode]||'chaseAlways'].flow;
 if(action==='search')return ENEMY_BEHAVIOR_EXAMPLES[{always:'chaseAlways',inside:'searchInside',remember:'searchRemember'}[mode]||'searchInside'].flow;
 return '動きを組み合わせた設定だよ。「さらに工夫する」で、動きのブロックを確認しよう。';
}

// Legacy programs are only translated when the child explicitly changes a choice.
export function enemyRoutine(o){
 if(o.routine)return {...o.routine};
 const action=basicEnemyBehavior(o);if(action==='custom')return null;
 return {idle:action==='patrol'?'patrol':action==='search'?'roam':'wait',notice:['search','chase'].includes(action)?((o.chaseMode||'always')==='always'?'always':'near'):'none',lost:o.chaseMode==='remember'?'continue':'resume'};
}
export function setEnemyRoutine(o,changes){
 const r={...(enemyRoutine(o)||{idle:'wait',notice:'none',lost:'resume'}),...changes};
 const speed=o.program[0]?.speed||2;o.routine=r;
 o.program=r.idle==='wait'&&r.notice==='none'?[]:[{action:'search',speed}];
}
export function routineFlow(o){
 const r=enemyRoutine(o);if(!r)return enemyBehaviorFlow(o);
 const idle={wait:'その場で待つ',patrol:'行ったり来たり',path:'コースにそってあるく',roam:'歩き回る'}[r.idle];
 return (r.notice==='always'?'はじめから追いかける':idle+(r.notice==='near'?' → 気づくマスに入ったら追いかける → 見失ったら'+(r.lost!=='continue'&&chaseGraceSeconds(o)>0?chaseGraceSeconds(o)+'秒追ってから、':'')+Object.fromEntries(lostChoiceLabels(r.idle,!!o.patrolRoute))[r.lost]:''))+(o.attackEnabled?'。攻撃するマスに入ったら撃つ。':'。攻撃しない。');
}

// Display always-chasing as the normal action; keep saved runtime rules compatible.
export function enemyRoutineChoices(o){
 const r=enemyRoutine(o);if(!r)return null;
 return {...r,idle:r.notice==='always'?'chase':r.idle};
}
export function setEnemyRoutineChoice(o,changes){
 const current=enemyRoutine(o);if(changes.idle==='patrol')o.patrolRoute??=defaultPatrolRoute(o);if(changes.idle==='path'){o.waypoints??=structuredClone(o.patrolRoute||defaultPatrolRoute(o));o.routeEnd??='loop';}
 if(changes.idle==='patrol')placeAtRouteStart(o,o.patrolRoute);if(changes.idle==='path')placeAtRouteStart(o,o.waypoints);
 if(changes.idle==='chase')setEnemyRoutine(o,{notice:'always'});
 else setEnemyRoutine(o,{...(changes.idle&&current?.notice==='always'?{notice:'none'}:{}),...changes});
}
export function lostChoiceLabels(idle,route=false){return [
 ['resume',idle==='path'?'コースにもどって続ける':idle==='wait'?'その場で止まる':idle==='patrol'?(route?'往復ルートにもどって続ける':'その場で、行ったり来たりを続ける'):'その場所から歩き回る'],
 ['continue','追い続ける'],
 ['return',idle==='path'?'コースのはじめにもどって歩く':idle==='wait'?'元の場所にもどって待つ':idle==='patrol'?(route?'ルートのはじめにもどって、行ったり来たり':'元の場所にもどって、行ったり来たり'):'元の場所にもどって歩き回る']
];}
