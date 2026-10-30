let activeFinish=null;
export const isLiveRangeEditing=()=>activeFinish!==null;
export function closeLiveRangeEditor(){activeFinish?.();}
// All three range editors share the same stage-visible sidebar and lifecycle.
export function mountLiveRangeEditor(panel,onClose){
 closeLiveRangeEditor();
 const aside=document.querySelector('aside'),main=aside.closest('main'),scrollTop=aside.scrollTop;
 const finish=()=>{if(activeFinish!==finish)return;activeFinish=null;onClose?.();panel.remove();aside.classList.remove('is-range-editing');main.classList.remove('range-editing');aside.scrollTop=scrollTop;};
 panel.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();finish();}};
 activeFinish=finish;aside.append(panel);aside.classList.add('is-range-editing');main.classList.add('range-editing');aside.scrollTop=0;
 return finish;
}
