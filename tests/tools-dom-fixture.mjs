// Minimal DOM for exercising the actual settings editors without a rendering surface.
export function toolsDOM(){
 const doc={activeElement:null};
 function simple(node,selector){
  if(!node.tagName)return false;const tag=selector.match(/^[a-z]+/i)?.[0];if(tag&&node.tagName!==tag)return false;
  for(const item of selector.matchAll(/\.([\w-]+)/g))if(!node.className.split(/\s+/).includes(item[1]))return false;
  for(const item of selector.matchAll(/#([\w-]+)/g))if(node.id!==item[1])return false;
  for(const item of selector.matchAll(/\[([\w-]+)(?:=["']?([^"'\]]+)["']?)?\]/g)){const actual=node.getAttribute(item[1]);if(actual===null||(item[2]!==undefined&&actual!==item[2]))return false;}
  return true;
 }
 function matches(node,selector){return selector.split(',').some(part=>{const bits=part.trim().match(/(?:\[[^\]]*\]|[^\s\[])+/g)||[];if(!simple(node,bits.pop()))return false;let parent=node.parentElement;while(bits.length){const next=bits.pop();while(parent&&!simple(parent,next))parent=parent.parentElement;if(!parent)return false;parent=parent.parentElement;}return true;});}
 class Element extends EventTarget{
  constructor(tag){super();this.tagName=tag;this.ownerDocument=doc;this.children=[];this.className='';this.dataset={};this.attributes={};this.style={setProperty(key,value){this[key]=value;}};this.value='';this.scrollTop=0;this.hidden=false;this.classList={toggle:(name,on)=>{const classes=new Set(this.className.split(/\s+/).filter(Boolean));if(on)classes.add(name);else classes.delete(name);this.className=[...classes].join(' ');},contains:name=>this.className.split(/\s+/).includes(name)};}
  append(...nodes){for(let n of nodes){if(typeof n==='string')n=doc.createTextNode(n);n.remove?.();n.parentElement=this;this.children.push(n);}}
  prepend(...nodes){const old=[...this.children];this.replaceChildren(...nodes,...old);}
  replaceChildren(...nodes){for(const n of this.children)n.parentElement=null;this.children=[];this.append(...nodes);}
  remove(){if(this.parentElement){this.parentElement.children=this.parentElement.children.filter(n=>n!==this);this.parentElement=null;}}
  replaceWith(node){const parent=this.parentElement,index=parent.children.indexOf(this);node.remove?.();parent.children[index]=node;node.parentElement=parent;this.parentElement=null;}
  getBoundingClientRect(){return {left:0,top:0,width:100,height:100};}
  get lastElementChild(){return this.children.at(-1);}
  get firstChild(){return this.children[0];}get options(){return this.children;}add(option){this.append(option);}
  set textContent(value){this.replaceChildren(doc.createTextNode(String(value)));}get textContent(){return this.children.map(n=>n.textContent).join('');}
  set innerHTML(value){this.replaceChildren();this.markup=value;}get innerHTML(){return this.markup||'';}
  setAttribute(key,value){this.attributes[key]=String(value);if(key==='class')this.className=String(value);if(key==='id')this.id=String(value);}
  getAttribute(key){if(key==='id')return this.id??null;if(key==='class')return this.className;if(key.startsWith('data-')){const name=key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());if(name in this.dataset)return String(this.dataset[name]);}return this.attributes[key]??null;}
  contains(child){let node=child;while(node){if(node===this)return true;node=node.parentElement;}return false;}
  matches(selector){return matches(this,selector);}closest(selector){let n=this;while(n){if(matches(n,selector))return n;n=n.parentElement;}return null;}
  querySelectorAll(selector){return this.children.flatMap(child=>[...(matches(child,selector)?[child]:[]),...(child.querySelectorAll?.(selector)||[])]);}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  focus(){doc.activeElement=this;}showModal(){this.open=true;}close(){this.open=false;this.dispatchEvent(new Event('close'));}setPointerCapture(){}
 }
 doc.createElement=tag=>new Element(tag);doc.createTextNode=text=>({textContent:text,parentElement:null,remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(n=>n!==this);this.parentElement=null;}});doc.body=doc.createElement('body');doc.querySelector=selector=>doc.body.querySelector(selector);doc.querySelectorAll=selector=>doc.body.querySelectorAll(selector);
 return {doc,Element,Option:function(text,value){const node=doc.createElement('option');node.textContent=text;node.value=value;return node;}};
}
