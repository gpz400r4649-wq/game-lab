import * as T from './vendor/three.module.min.js';
import {detectsPlayer} from './enemy-ai3d.js?v=20261111j';
export function enemyMessageState(enemy,player){
 const observes=enemy.routine?enemy.routine.notice==='near':enemy.program.some(b=>['search','chase'].includes(b.action))&&(enemy.chaseMode||'always')!=='always';
 const action=enemy.program.length?(enemy.debugAction||'wait'):'wait';
 return {action,text:({outside:'おいかけるマスのそとにいるよ',disconnected:'マスがつながっていないよ',edge:'うごけるマスのはしだよ',obstacle:'かべ・ブロックですすめないよ'}[enemy.debugBlocked])||{wait:'まっている',patrol:'いったりきたりしている',path:'コースをあるいている',roam:'あるきまわっている',chase:'おいかけている',return:'もどっている'}[action]||'まっている',detected:observes?detectsPlayer(enemy,player):null};
}
export function createMessageTracker(){
 let id=null,detected=null,event='',until=0;
 return {reset(){id=null;detected=null;event='';until=0;},read(enemy,player,time){
  const state=enemyMessageState(enemy,player);
  if(id!==enemy.id){id=enemy.id;detected=null;event='';until=0;}
  if(state.detected!==null&&state.detected!==detected){
   if(state.detected||detected!==null){event=state.detected?'！ きづいた':'？ みうしなった';until=time+1600;}
  }
  detected=state.detected;return {...state,event:time<until?event:''};
 }};
}
export function createEnemyMessages(){
 const root=document.querySelector('#enemy-message3'),state=root.querySelector('.enemy-message-state'),bubble=root.querySelector('.enemy-message-event'),toggle=document.querySelector('#enemy-messages-toggle3'),viewport=document.querySelector('#viewport'),tracker=createMessageTracker(),point=new T.Vector3();
 function update(game,playing,target,camera,time){
  const enemy=playing?game.objects.find(o=>o.id===target):null;
  if(!playing||!toggle.checked||!enemy||enemy.hidden||enemy.hp<=0){root.hidden=true;tracker.reset();return;}
  const message=tracker.read(enemy,game.player,time);state.textContent=message.text;bubble.textContent=message.event;bubble.hidden=!message.event;
  camera.updateMatrixWorld();point.set(enemy.x,enemy.y+(enemy.h||2)+.65,enemy.z).project(camera);
  // Keep labels attached to the enemy; do not pin off-screen labels to screen edges.
  root.hidden=point.z<-1||point.z>1||Math.abs(point.x)>.94||Math.abs(point.y)>.9;
  if(!root.hidden){root.style.left=((point.x+1)*viewport.clientWidth/2)+'px';root.style.top=((1-point.y)*viewport.clientHeight/2)+'px';}
 }
 return {update,reset:()=>tracker.reset()};
}
