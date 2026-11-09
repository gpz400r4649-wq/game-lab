let activeFinish=null;
export const isLiveRangeEditing=()=>activeFinish!==null;
export function closeLiveRangeEditor(){activeFinish?.();}
// All three range editors share the same stage-visible sidebar and lifecycle.
export function mountLiveRangeEditor(panel,onClose){
 closeLiveRangeEditor();
 globalThis.window?.dispatchEvent(new Event('enemy-range-open'));
 const aside=document.querySelector('aside'),main=aside.closest('main'),scrollTop=aside.scrollTop;
 const actions=document.querySelector('#range-actions3'),more=document.querySelector('#range-more3'),dock=document.querySelector('#range-dock3');
 const finish=()=>{if(activeFinish!==finish)return;activeFinish=null;if(actions){actions.replaceChildren();actions.hidden=true;}if(more){more.hidden=true;more.open=false;}onClose?.();panel.remove();aside.classList.remove('is-range-editing');main.classList.remove('range-editing');aside.scrollTop=scrollTop;queueMicrotask(()=>{if(!activeFinish)globalThis.window?.dispatchEvent(new Event('enemy-range-close'));});};
 panel.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();finish();}};
 activeFinish=finish;aside.append(panel);aside.classList.add('is-range-editing');main.classList.add('range-editing');aside.scrollTop=0;
 if(actions){
  actions.replaceChildren();
  const heading=panel.querySelector('.range-live-heading');
  const done=heading?.querySelector('button');
  const title=heading?.querySelector('h2');
  const bar=document.createElement('div');bar.className='range-session-heading';
  const controls=document.createElement('div');controls.className='range-session-controls';
  if(title)bar.append(title);
  if(panel.dataset.rangeKey==='attackRange'){
   const legend=document.createElement('span');legend.className='attack-context-legend';
   const vision=document.createElement('span'),attack=document.createElement('span');
   vision.textContent='黄色のわく：気づく範囲';attack.textContent='赤いマス：攻撃する範囲';legend.append(vision,attack);controls.append(legend);
  }

  const modes=panel.querySelector('.stage-range-tools');
  const top=panel.querySelector('.range-top-action');
  if(done)bar.append(done);
  actions.append(bar,controls);
  if(modes)controls.append(modes);
  if(top)bar.insertBefore(top,done||null);
  const fan=panel.querySelector('.fan-controls');
  if(fan)controls.prepend(fan);

  if(dock){dock.replaceChildren(panel);more.hidden=false;more.open=false;}

  actions.hidden=false;
  actions.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();finish();}};
 }
 return finish;
}
