export function halfWidthNumber(value){return String(value).normalize('NFKC').replace(/[−‐‑‒–—ー]/g,'-').trim();}
export function parseDecimal(value){const text=halfWidthNumber(value);return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)&&Number.isFinite(Number(text))?Number(text):null;}

// Text storage keeps full-width input available until it can be normalized;
// native number inputs can discard it before an input handler can read it.
export function configureNumericInput(input,{value,min,max,step,onValue,onCommit}){
  let composing=false,last=value;
  Object.assign(input,{type:'text',inputMode:step===1?'numeric':'decimal',value:String(value),autocomplete:'off',autocapitalize:'off',spellcheck:false,enterKeyHint:'done',lang:'en'});
  input.dataset.numeric='';input.setAttribute('role','spinbutton');input.setAttribute('aria-valuemin',min);input.setAttribute('aria-valuemax',max);input.setAttribute('aria-valuenow',value);
  function normalize(){const next=halfWidthNumber(input.value);if(next!==input.value){const start=input.selectionStart,end=input.selectionEnd;input.value=next;if(start!==null)input.setSelectionRange(Math.min(start,next.length),Math.min(end??start,next.length));}}
  function apply(n){const result=onValue(n);last=Number.isFinite(result)?result:n;input.setAttribute('aria-valuenow',last);return last;}
  input.oninput=e=>{if(composing||e?.isComposing)return;normalize();const n=parseDecimal(input.value);if(n!==null&&n>=min&&n<=max)apply(n);};
  input.oncompositionstart=()=>composing=true;
  input.oncompositionend=()=>{composing=false;input.oninput();};
  input.onchange=()=>{if(composing)return;normalize();const n=parseDecimal(input.value),next=n===null?last:Math.max(min,Math.min(max,n));input.value=apply(next);onCommit();};
  input.onkeydown=e=>{
    if(composing||e.isComposing)return;
    if(e.key==='Enter'){e.preventDefault();input.onchange();input.blur();}
    if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();input.value=Number(((parseDecimal(input.value)??last)+(e.key==='ArrowUp'?step:-step)).toFixed(8));input.onchange();}
  };
  return ()=>{input.value=-(parseDecimal(input.value)??last);input.onchange();};
}
