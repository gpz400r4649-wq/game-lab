import {saveRangeAsset,saveEnemyAsset,applyRangeAsset,applyEnemyAsset,ASSET_LIMITS} from './assets3d.js?v=20261029o';
import {setReadingText} from './readings3d.js?v=20261029o';
const labels={enemy:'敵',moveRange:'移動はんい',searchRange:'探すはんい',attackRange:'攻撃はんい'};
export function openAssetShelf(p,o,kind,{save,rebuild,inspect}){
 const d=document.createElement('dialog');d.className='asset-dialog';const h=document.createElement('h2'),note=document.createElement('p'),name=document.createElement('input'),add=document.createElement('button'),list=document.createElement('div'),status=document.createElement('p'),close=document.createElement('button');
 const key=kind==='enemy'?'enemies':'ranges',items=()=>p.library?.[key]||[];setReadingText(h,labels[kind]+'の素材');setReadingText(note,kind==='enemy'?'体力・動き・攻撃・はんいをまとめて保存するよ。パレットの敵ボタンから、保存した敵をえらんで置けるよ。':'この作品の中で使う素材だよ。素材を削除しても置いた敵やはんいは残るよ。使ったあとは、その敵だけで調整できるよ。移動はんいは同じマップの場所を使い、探す・攻撃はんいは使う敵が中心になるよ。');
 name.maxLength=32;name.setAttribute('aria-label','素材の名前');name.placeholder='素材の名前';name.value=labels[kind]+String(items().length+1);status.setAttribute('role','status');setReadingText(add,'今の設定を素材に保存');add.className='primary';add.disabled=kind!=='enemy'&&!o[kind];
 const finish=()=>{d.close();d.remove();};
 function render(){list.replaceChildren();const entries=items().filter(a=>kind==='enemy'||a.kind===kind);if(!entries.length){const empty=document.createElement('p');setReadingText(empty,'まだ素材がありません。名前をつけて保存しよう。');list.append(empty);}
  for(const asset of entries){const row=document.createElement('div'),title=document.createElement('b'),use=document.createElement('button'),del=document.createElement('button');row.className='asset-row';title.textContent=asset.name;setReadingText(use,'この敵に使う');use.onclick=()=>{if(kind==='enemy')applyEnemyAsset(o,asset);else applyRangeAsset(o,asset,kind);save();rebuild();finish();inspect();};setReadingText(del,'素材を削除');del.onclick=()=>{if(del.dataset.armed!=='yes'){del.dataset.armed='yes';setReadingText(del,'もう一度押すと削除');return;}const all=items();all.splice(all.findIndex(a=>a.id===asset.id),1);save();render();};row.append(title,use,del);list.append(row);}
 }
 add.onclick=()=>{try{const asset=kind==='enemy'?saveEnemyAsset(p,o,name.value):saveRangeAsset(p,o,kind,name.value);save();render();setReadingText(status,`「${asset.name}」を保存しました。この作品と一緒にファイルにも保存されます。`);}catch(e){setReadingText(status,e.message);}};
 setReadingText(close,'もどる');close.onclick=finish;d.oncancel=()=>d.remove();const limit=document.createElement('p');setReadingText(limit,kind==='enemy'?`敵の素材は${ASSET_LIMITS.enemies}個まで。`:`はんいの素材は合計${ASSET_LIMITS.ranges}個まで。`);d.append(h,note,name,add,status,list,limit,close);document.body.append(d);render();d.showModal();
}
