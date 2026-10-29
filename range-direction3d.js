import {setReadingText} from './readings3d.js?v=20261029u';
export const RANGE_DIRECTIONS=[{key:'front',label:'まえ',x:0,z:-1,color:'#e59336'},{key:'right',label:'みぎ',x:1,z:0,color:'#508dc1'},{key:'back',label:'うしろ',x:0,z:1,color:'#8793a5'},{key:'left',label:'ひだり',x:-1,z:0,color:'#508dc1'}];
export function directionFrame(grid){
 const frame=document.createElement('div');frame.className='range-direction-frame';
 for(const [key,text]of [['front','↑ まえ（マップのおく）'],['left','← ひだり'],['right','みぎ →'],['back','↓ うしろ（マップのてまえ）']]){const badge=document.createElement('span');badge.className='range-direction-'+key;setReadingText(badge,text);frame.append(badge);}
 frame.append(grid);return frame;
}
export function markRobotCell(button,robot){button.classList.toggle('range-robot-cell',robot);if(robot)button.title='敵のまえは ↑';else button.removeAttribute('title');}
export function stageDirections(T){
 const group=new T.Group();
 for(const side of RANGE_DIRECTIONS){
  const arrow=new T.ArrowHelper(new T.Vector3(side.x,0,side.z),new T.Vector3(side.x*.65,.05,side.z*.65),3,side.color,.8,.55);for(const mesh of [arrow.line,arrow.cone]){mesh.material.depthTest=false;mesh.renderOrder=8;}group.add(arrow);
  const canvas=document.createElement('canvas');canvas.width=192;canvas.height=80;const ctx=canvas.getContext('2d');ctx.fillStyle=side.color;ctx.fillRect(0,0,192,80);ctx.fillStyle='#fff';ctx.font='bold 48px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(side.label,96,40);
  const sprite=new T.Sprite(new T.SpriteMaterial({map:Object.assign(new T.CanvasTexture(canvas),{colorSpace:T.SRGBColorSpace}),depthTest:false,depthWrite:false}));sprite.position.set(side.x*4.6,.35,side.z*4.6);sprite.scale.set(4.2,1.75,1);sprite.renderOrder=10;group.add(sprite);
 }
 group.traverse(child=>child.layers.set(2));group.visible=false;return group;
}
