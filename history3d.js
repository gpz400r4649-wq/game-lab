// Snapshots are session-only; cap both count and UTF-16 storage for large maps.
export function createEditHistory(initial,{limit=50,maxBytes=24*1024*1024}={}){
 let states=[JSON.stringify(initial)],index=0;
 return {
  record(project){const next=JSON.stringify(project);if(next===states[index])return false;states=states.slice(0,index+1);states.push(next);index++;let bytes=states.reduce((n,s)=>n+s.length*2,0);while(states.length>1&&(states.length>limit+1||bytes>maxBytes)){bytes-=states.shift().length*2;index--;}return true;},
  undo(){return index>0?JSON.parse(states[--index]):null;},
  redo(){return index<states.length-1?JSON.parse(states[++index]):null;},
  get canUndo(){return index>0;},get canRedo(){return index<states.length-1;}
 };
}
