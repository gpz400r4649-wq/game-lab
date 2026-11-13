import {createPatrolOverlay} from './patrol-ui3d.js?v=20261113b';
import {usesPatrolRoute,usesWaypoints,activeRoute} from './patrol-route3d.js?v=20261113b';
import * as T from './vendor/three.module.min.js';
import {rangeWorldCells,MOVE_MAX_CELLS} from './enemy-range3d.js?v=20261113b';
import {setReadingText} from './readings3d.js?v=20261113b';
export function playRangeCells(enemy,key){
 if(!enemy||enemy.hp<=0||enemy.hidden||!enemy[key])return [];
 return rangeWorldCells(enemy[key],key==='moveRange'?(enemy.origin||enemy):enemy).slice(0,MOVE_MAX_CELLS);
}
export function createPlayRanges(scene){
 const patrol=createPatrolOverlay(scene);
 const panel=document.querySelector('#play-ranges3'),select=panel.querySelector('.setting-choices'),note=panel.querySelector('p'),checks=[...panel.querySelectorAll('[data-range-layer]')],enabledControl=panel.querySelector('#enemy-ranges-enabled3'),summary=panel.querySelector('summary');
 const specs=[['moveRange',0x469edf,3.85],['searchRange',0xdcb52b,3.35],['attackRange',0xed7890,2.85]],matrix=new T.Matrix4();let target='',stamp='',last=0;
 const meshes=specs.map(([key,color,size])=>{const mesh=new T.InstancedMesh(new T.PlaneGeometry(size,size).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color,transparent:true,opacity:.42,depthWrite:false,side:T.DoubleSide}),MOVE_MAX_CELLS);mesh.layers.set(2);mesh.frustumCulled=false;mesh.visible=false;scene.add(mesh);return mesh;});
 const marker=new T.Mesh(new T.RingGeometry(.95,1.1,32),new T.MeshBasicMaterial({color:0x6b51c5,side:T.DoubleSide,depthWrite:false}));marker.rotation.x=-Math.PI/2;marker.visible=false;scene.add(marker);
 function syncToggle(){if(summary){setReadingText(summary,enabledControl?.checked?'はんいを見る：オン':'はんいを見る');summary.classList?.toggle('range-is-on',!!enabledControl?.checked);}}
 if(enabledControl)enabledControl.onchange=()=>{last=0;syncToggle();};
 select.onchange=()=>{target=select.value;last=0;};checks.forEach(check=>check.onchange=()=>{if(enabledControl)enabledControl.checked=true;last=0;syncToggle();});
 function start(objects,selected){const enemies=objects.filter(o=>o.type==='enemy');select.replaceChildren();for(const [i,e]of enemies.entries()){const option=document.createElement('option');option.value=e.id;option.textContent=`てき ${i+1}`;select.add(option);}target=enemies.some(e=>e.id===selected)?selected:enemies.some(e=>e.id===target)?target:enemies[0]?.id||'';select.value=target;stamp='';last=0;panel.open=false;syncToggle();}
 function update(game,playing,time){
  panel.hidden=!playing;if(!playing){marker.visible=false;patrol.show(null);meshes.forEach(m=>m.visible=false);return;}
  if(last&&time-last<50)return;last=time;
  const enemy=game.objects.find(o=>o.id===target),missing=[],show=enabledControl?enabledControl.checked:true;marker.visible=!!(show&&enemy&&!enemy.hidden&&enemy.hp>0);if(marker.visible){marker.position.set(enemy.x,(enemy.y||0)+.08,enemy.z);marker.scale.setScalar(Math.max(1,enemy.enemyScale||1));}patrol.show(show&&enemy&&!enemy.hidden&&enemy.hp>0&&checks[0].checked&&(usesPatrolRoute(enemy)||usesWaypoints(enemy))?activeRoute(enemy):null,enemy?.y||0,usesWaypoints(enemy||{})&&(enemy?.routeEnd||'loop')==='loop');
  for(const [i,[key,,size]]of specs.entries()){
   const mesh=meshes[i],enabled=show&&checks[i].checked&&!(key==='moveRange'&&enemy&&(usesPatrolRoute(enemy)||usesWaypoints(enemy))&&(enemy.routine?.notice==='none'||!enemy.routine)),cells=enabled?playRangeCells(enemy,key):[];mesh.visible=cells.length>0;mesh.count=cells.length;
   if(enabled&&enemy&&!enemy[key])missing.push(['動ける','気づく','攻撃する'][i]);
   const half=game.worldSize/2;
   cells.forEach(([x,z],n)=>{const left=Math.max(-half,x*4-size/2),right=Math.min(half,x*4+size/2),front=Math.max(-half,z*4-size/2),back=Math.min(half,z*4+size/2);matrix.makeScale(Math.max(0,right-left)/size,1,Math.max(0,back-front)/size).setPosition((left+right)/2,(enemy.y||0)+.04+i*.012,(front+back)/2);mesh.setMatrixAt(n,matrix);});if(cells.length)mesh.instanceMatrix.needsUpdate=true;
  }
  const text=!enemy?'敵を置くと、はんいを見られるよ。':enemy.hidden||enemy.hp<=0?'この敵は、今はステージにいないよ。':missing.length?missing.join('・')+'マスは未設定。つくる画面でマスを設定してね。':!show?'「はんいを表示する」をオンにしよう。':'紫の輪の敵を表示中。青＝うごく・黄＝気づく・赤＝こうげき。';
  if(text!==stamp){setReadingText(note,text);stamp=text;}
 }
 function showTarget(id,{toggle=false}={}){
  if(!id)return false;const turnOff=toggle&&target===id&&enabledControl?.checked&&checks.some(check=>check.checked);target=id;select.value=id;
  if(!turnOff&&!checks.some(check=>check.checked))checks.forEach(check=>check.checked=true);
  if(enabledControl)enabledControl.checked=!turnOff;panel.open=false;last=0;syncToggle();return true;
 }
 return {start,update,showTarget,getTarget:()=>target};
}
