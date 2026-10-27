// Safari also sends Touch/Gesture events alongside Pointer events. Cancel its
// page gestures on the game surface, while leaving ordinary UI clicks intact.
export function installGameTouchGuard(view,isPlaying){
  const doc=view.ownerDocument,active=new Set();
  const cancel=e=>{if(e.cancelable)e.preventDefault();};
  const direct=e=>!!e.target?.closest?.('canvas, #stick3, #fire3, #jump3');
  function touch(e){
    if(!isPlaying())return;
    if(e.type==='touchstart')for(const t of e.changedTouches||[])active.add(t.identifier);
    if(direct(e)||(e.touches?.length||0)>1)cancel(e);
  }
  for(const type of ['touchstart','touchmove','touchend'])view.addEventListener(type,touch,{passive:false});
  function end(e){for(const t of e.changedTouches||[])active.delete(t.identifier);}
  for(const type of ['touchend','touchcancel'])doc.addEventListener(type,end,{passive:true});
  for(const type of ['gesturestart','gesturechange','gestureend'])doc.addEventListener(type,e=>{
    if(isPlaying()&&(active.size||view.contains(e.target)))cancel(e);
  },{passive:false,capture:true});
  for(const type of ['contextmenu','dblclick'])view.addEventListener(type,e=>{if(isPlaying())cancel(e);},{passive:false});
  return ()=>active.clear();
}

// One held button may receive several fingers; only the last release stops it.
export function bindHeldButton(button,press,release){
  const pointers=new Set();
  button.addEventListener('pointerdown',e=>{
    e.preventDefault();if(pointers.has(e.pointerId))return;
    pointers.add(e.pointerId);button.setPointerCapture(e.pointerId);press();
  });
  function up(e){if(!pointers.delete(e.pointerId))return;if(!pointers.size)release();}
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,up);
  return ()=>{pointers.clear();release();};
}
