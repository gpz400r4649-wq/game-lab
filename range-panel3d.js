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
  const done=panel.querySelector('.range-live-heading')?.querySelector('button');
  const modes=panel.querySelector('.stage-range-tools');
  const top=panel.querySelector('.range-top-action');
  if(done)actions.append(done);
  if(modes)actions.append(modes);
  if(top)actions.append(top);
  const fan=panel.querySelector('.fan-controls');
  if(fan)actions.append(fan);
  const mode=panel.querySelector('.range-mode-controls');
  if(mode)actions.append(mode);
  if(dock){dock.replaceChildren(panel);more.hidden=false;more.open=false;}

  actions.hidden=false;
  actions.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();finish();}};
 }
 return finish;
}
