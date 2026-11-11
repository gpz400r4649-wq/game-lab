import {setReadingText} from './readings3d.js?v=20261111v';

// A visible single-choice control. Programmatic value changes never save settings.
export function createChoiceControl(){return enhanceChoiceControl(document.createElement('div'));}
export function enhanceChoiceControl(group){
 let value='',disabled=false;
 group.classList.toggle('setting-choices',true);group.setAttribute('role','group');
 function mark(button){const active=button.value===value;button.setAttribute('aria-pressed',String(active));button.classList.toggle('active',active);}
 function sync(){for(const button of group.children)mark(button);}
 function bind(button){button.type='button';button.onclick=()=>{if(button.disabled||button.value===value)return;group.value=button.value;group.onchange?.();};}
 Object.defineProperties(group,{
  value:{get:()=>value,set:next=>{value=String(next);sync();}},
  disabled:{get:()=>disabled,set:next=>{disabled=!!next;group.setAttribute('aria-disabled',String(disabled));for(const button of group.children)button.disabled=disabled;}},
  options:{get:()=>[...group.children]}
 });
 group.add=option=>{const button=document.createElement('button');button.value=String(option.value);button.dataset.choice=button.value;Object.assign(button.dataset,option.dataset);setReadingText(button,option.textContent);if(/^#[0-9a-f]{6}$/i.test(button.value)){button.classList.toggle('color-choice',true);button.style.setProperty('--choice-color',button.value);}bind(button);button.disabled=disabled;mark(button);group.append(button);group.classList.toggle('numeric-choices',group.children.length>4&&[...group.children].every(b=>/^\d+(?:\.\d+)?$/.test(b.value)));};
 for(const button of group.children)bind(button);
 if(group.children.length)value=group.children[0].value;
 sync();return group;
}
