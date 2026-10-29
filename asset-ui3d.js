import {saveEnemyAsset} from './assets3d.js?v=20261029r';
import {setReadingText} from './readings3d.js?v=20261029r';
export function openSaveEnemy(p,o,{save,onSaved}){
 const d=document.createElement('dialog');d.className='asset-dialog';const title=document.createElement('h2'),note=document.createElement('p'),name=document.createElement('input'),status=document.createElement('p'),submit=document.createElement('button'),cancel=document.createElement('button');
 setReadingText(title,'この敵を保存');setReadingText(note,'名前をつけて保存すると「キャラクター・アイテム」に追加されるよ。体力・動き・攻撃・はんいも一緒に保存するよ。');name.maxLength=32;name.setAttribute('aria-label','敵の名前');name.value=`ロボット${(p.library?.enemies.length||0)+1}`;status.setAttribute('role','status');setReadingText(submit,'保存する');submit.className='primary';setReadingText(cancel,'もどる');
 const close=()=>{d.close();d.remove();};submit.onclick=()=>{try{const asset=saveEnemyAsset(p,o,name.value);save();close();onSaved(asset);}catch(error){setReadingText(status,error.message);}};cancel.onclick=close;name.onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();submit.click();}};d.oncancel=()=>d.remove();d.append(title,note,name,status,submit,cancel);document.body.append(d);d.showModal();
}
