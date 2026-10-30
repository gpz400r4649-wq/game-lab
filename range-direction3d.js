import {setReadingText} from './readings3d.js?v=20261030j';
export function directionFrame(grid,{facing=false}={}){
 const frame=document.createElement('div');frame.className='range-direction-frame';
 for(const [key,text]of [['front',facing?'↑ まえ（敵の顔の向き）':'↑ まえ（マップのおく）'],['left','← ひだり'],['right','みぎ →'],['back','↓ うしろ（マップのてまえ）']]){const badge=document.createElement('span');badge.className='range-direction-'+key;setReadingText(badge,text);frame.append(badge);}
 frame.append(grid);return frame;
}
export function markRobotCell(button,robot){button.classList.toggle('range-robot-cell',robot);if(robot)button.title='敵のまえは ↑';else button.removeAttribute('title');}
