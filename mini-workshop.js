import {workspace,ready} from './account.js';
import {mathRound,shuffle,shuffledDifferent} from './activity-rules.js';
import {imageCatalog,imageMarkup,escape as e} from './activity-media.js';
import {chime} from './scene-controls.js';
import {t,applyTranslations} from './i18n.js';

const root=document.getElementById('mini-workshop');
let mode='math',state,showGames=false;
function reset() {
  if(mode==='math')state={...mathRound({operation:'mixed',max:10,count:1})[0],done:false};
  if(mode==='memory')state={cards:shuffle(shuffle(imageCatalog).slice(0,2).flatMap(a=>[{...a},{...a}])),flipped:[],matched:[],locked:false};
  if(mode==='order'){const values=new Set();while(values.size<4)values.add(1+Math.floor(Math.random()*30));state={values:shuffledDifferent([...values].sort((a,b)=>a-b)),chosen:[]};}
  state.message='';
}
function recentActivity(){return workspace.user?[...workspace.read('activities')].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0]:null;}
function render() {
  const recent=recentActivity();
  if(recent&&!showGames){root.innerHTML=`<div class="mini-resume"><span class="overline">CONTINUĂ DE UNDE AI RĂMAS</span><h3>${e(recent.title)}</h3><p>Activitatea ta este pregătită în atelier.</p><button class="button button-primary" data-action="edit" data-id="${e(recent.id)}">Continuă activitatea →</button><button class="button button-soft" data-action="open-create">Creează ceva nou</button><button class="text-button" data-mini="show">Încearcă un joc</button></div>`;applyTranslations(root);return;}
  const tabs=`<div class="mini-tabs" role="group" aria-label="Alege un joc">${[['math','Calcule'],['memory','Memory'],['order','Ordonare']].map(([id,label])=>`<button data-mini="mode" data-mode="${id}" aria-pressed="${mode===id}">${t(label)}</button>`).join('')}</div>`;
  let content='',done=false;
  if(mode==='math'){done=state.done;content=`<p class="mini-prompt">Alege rezultatul</p><h3 class="calculation">${e(state.text)} = ?</h3><div class="calculation-options">${state.options.map(n=>`<button class="button button-soft" data-mini="answer" data-value="${n}" ${done?'disabled':''}>${n}</button>`).join('')}</div>`;}
  if(mode==='memory'){done=state.matched.length===2;content=`<p class="mini-prompt">Găsește cele două perechi</p><div class="mini-memory">${state.cards.map((a,i)=>{const visible=state.flipped.includes(i)||state.matched.includes(a.id);return `<button data-mini="flip" data-index="${i}" aria-label="${visible?e(a.label):'Cartonaș '+(i+1)}" ${state.matched.includes(a.id)?'disabled':''}>${visible?imageMarkup('asset:'+a.id,a.label):'<span aria-hidden="true">✦</span>'}</button>`;}).join('')}</div>`;}
  if(mode==='order'){done=state.chosen.length===4;content=`<p class="mini-prompt">Alege numerele de la mic la mare</p><div class="mini-number-line">${state.chosen.map(n=>`<span>${n}</span>`).join('')||'<span>?</span>'}</div><div class="calculation-options">${state.values.map(n=>`<button class="button button-soft" data-mini="order" data-value="${n}" ${state.chosen.includes(n)?'disabled':''}>${n}</button>`).join('')}</div>`;}
  root.innerHTML=`${tabs}<div class="mini-stage">${content}<p class="feedback" role="status">${e(state.message)}</p></div><div class="mini-actions"><button class="text-button" data-mini="reset">${done?'Joacă din nou':'Altă rundă'}</button><button class="button button-primary" data-action="template" data-type="${mode}">Creează un joc ca acesta →</button></div>${recent?'<button class="text-button mini-back" data-mini="resume">Înapoi la activitatea mea</button>':''}`;
  applyTranslations(root);
}
root.addEventListener('click',event=>{
  const button=event.target.closest('[data-mini]');if(!button||button.disabled)return;
  const action=button.dataset.mini;
  if(action==='show'){showGames=true;reset();}
  if(action==='resume')showGames=false;
  if(action==='mode'){mode=button.dataset.mode;reset();}
  if(action==='reset')reset();
  if(action==='answer'&&!state.done){state.done=Number(button.dataset.value)===state.answer;state.message=state.done?'Corect! Poți încerca altă rundă.':'Mai încearcă.';if(state.done)chime(true);}
  if(action==='order'){const n=Number(button.dataset.value),next=Math.min(...state.values.filter(v=>!state.chosen.includes(v)));if(n===next){state.chosen.push(n);state.message=state.chosen.length===4?'Perfect! Numerele sunt în ordine.':'Bine! Alege numărul următor.';chime(true);}else state.message='Caută cel mai mic număr rămas.';}
  if(action==='flip'){
    const i=Number(button.dataset.index);if(state.locked||state.flipped.includes(i))return;
    state.flipped.push(i);
    if(state.flipped.length===2){const [a,b]=state.flipped;if(state.cards[a].id===state.cards[b].id){state.matched.push(state.cards[a].id);state.flipped=[];state.message=state.matched.length===2?'Ai găsit toate perechile!':'Pereche găsită!';chime(true);}else{state.locked=true;state.message='Privește, apoi încearcă din nou.';const previous=state;setTimeout(()=>{if(state!==previous)return;state.flipped=[];state.locked=false;render();},950);}}
  }
  render();
});
await ready;reset();render();
workspace.subscribe(event=>{if(['identity','loaded','saved'].includes(event.type)){if(event.type==='identity'){showGames=false;reset();}render();}});
