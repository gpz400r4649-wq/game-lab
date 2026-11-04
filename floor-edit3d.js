import * as T from './vendor/three.module.min.js';
export function enemyEditHeight(enemy){return Number.isFinite(enemy?.y)?enemy.y:0;}
export function createFloorRangeView(renderer,grid){
 const ceiling=new T.Plane(new T.Vector3(0,-1,0),0),planes=[ceiling],normalColor=grid.material.color.clone(),editColor=new T.Color(0x597b9d),originalPlanes=renderer.clippingPlanes||[];
 return {update(active,enemy){
  const enabled=active&&enemy?.type==='enemy',height=enemyEditHeight(enemy);
  ceiling.constant=height+Math.max(2.3,(enemy?.h||2)+.3);renderer.clippingPlanes=enabled?planes:originalPlanes;
  grid.position.y=enabled?height+.045:.008;grid.material.color.copy(enabled?editColor:normalColor);
 }};
}
