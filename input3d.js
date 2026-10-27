// Use document capture so Safari cannot turn a second finger's quick taps into
// a page gesture after touchend leaves only the joystick finger on the screen.
export function installGameTouchGuard(view,isPlaying){
  const doc=view.ownerDocument,active=new Map();let lastTouchAt=-Infinity;
  const cancel=e=>{if(e.cancelable)e.preventDefault();};
  const direct=target=>!!target?.closest?.('canvas, #stick3, #fire3, #jump3');
  function touch(e){
    if(!isPlaying())return;
    const changed=Array.from(e.changedTouches||[]),inside=view.contains(e.target)||changed.some(t=>active.has(t.identifier));
    if(!inside)return;
    cancel(e);lastTouchAt=Date.now();
    if(e.type==='touchstart')for(const t of changed){
      const target=t.target||e.target;
      active.set(t.identifier,{x:t.clientX,y:t.clientY,lastX:t.clientX,moved:false,target,button:direct(target)?null:target.closest?.('button'),bar:target.closest?.('#hotbar3')});
    }
    if(e.type==='touchmove')for(const t of changed){
      const a=active.get(t.identifier);if(!a)continue;
      if(Math.hypot(t.clientX-a.x,t.clientY-a.y)>10)a.moved=true;
      if(a.bar)a.bar.scrollLeft+=a.lastX-t.clientX;
      a.lastX=t.clientX;
    }
    if(e.type==='touchend'||e.type==='touchcancel')for(const t of changed){
      const a=active.get(t.identifier);active.delete(t.identifier);
      // Native mouse clicks are suppressed with the touch event. Keep ordinary
      // game buttons working once per tap, without interpreting a drag as a tap.
      if(a&&e.type==='touchend'&&!a.moved&&Math.hypot(t.clientX-a.x,t.clientY-a.y)<=10&&a.button&&!a.button.disabled&&view.contains(a.button))a.button.click();
    }
  }
  for(const type of ['touchstart','touchmove','touchend','touchcancel'])doc.addEventListener(type,touch,{passive:false,capture:true});
  doc.addEventListener('click',e=>{if(isPlaying()&&view.contains(e.target)&&e.isTrusted&&Date.now()-lastTouchAt<700){cancel(e);e.stopImmediatePropagation();}},{capture:true});
  for(const type of ['gesturestart','gesturechange','gestureend'])doc.addEventListener(type,e=>{
    if(isPlaying()&&(active.size||view.contains(e.target)))cancel(e);
  },{passive:false,capture:true});
  for(const type of ['contextmenu','dblclick'])doc.addEventListener(type,e=>{if(isPlaying()&&view.contains(e.target))cancel(e);},{passive:false,capture:true});
  return ()=>active.clear();
}

export function createGamePageMode(doc){
  const meta=doc.querySelector('meta[name="viewport"]'),original=meta?.getAttribute('content')||'width=device-width, initial-scale=1';
  return playing=>{
    doc.documentElement.classList.toggle('playing3d',playing);
    // This is an additional hint; Safari versions can ignore scale restrictions.
    meta?.setAttribute('content',playing?original+', minimum-scale=1, maximum-scale=1, user-scalable=no':original);
  };
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
