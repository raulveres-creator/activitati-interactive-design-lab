import { localDay, childNames, setPresence, setAbsence } from './attendance-model.js';
import {editAvatar} from './avatar.js';

import {workspace, ready} from './account.js';
import {applyTranslations, t} from './i18n.js';
await ready;
let savingPresence = false;

const $ = id => document.getElementById(id);
let store = {version:1, groups:[]};
let groupId = '';
let childView = false;
let readable = true;
const symbols = [
  {id:'flower', icon:'🌸', label:'Floare de cireș'},
  {id:'sunflower', icon:'🌻', label:'Floarea-soarelui'},
  {id:'tulip', icon:'🌷', label:'Lalea'},
  {id:'blossom', icon:'🌼', label:'Margaretă'},
  {id:'ladybug', icon:'🐞', label:'Buburuză'},
  {id:'butterfly', icon:'🦋', label:'Fluture'},
];
const symbolFor = group => symbols.find(symbol => symbol.id === group?.symbol) || symbols[0];
for (const id of ['group-symbol', 'new-group-symbol']) {
  $(id).replaceChildren(...symbols.map(symbol => new Option(`${symbol.icon} ${t(symbol.label)}`,symbol.id)));
}
function message(text) { $('attendance-message').textContent = t(text); }
store = workspace.read('attendance');
readable = !['error','loading'].includes(workspace.status);
if(!readable) message(workspace.problem);
groupId = store.groups[0]?.id || '';
$('attendance-date').value = localDay();
async function save(next) {
  if (!readable || savingPresence) { message('Așteaptă finalizarea salvării sau reîncarcă datele.'); return false; }
  savingPresence=true; render();
  try { await workspace.save('attendance',next); store=next; return true; }
  catch(error) { message(error.message); return false; }
  finally { savingPresence=false; render(); }
}
function render() {
  document.querySelectorAll('#teacher-controls button,#teacher-controls input,#teacher-controls textarea,#teacher-controls select').forEach(control=>control.disabled=savingPresence || !readable);
  const group = store.groups.find(g => g.id === groupId);
  $('group-select').replaceChildren(...store.groups.map(g => new Option(g.name, g.id)));
  $('group-select').value = groupId;
  $('group-select').disabled = !group || savingPresence || !readable;
  $('group-symbol').disabled = !group || !readable || savingPresence;
  $('group-symbol').value = symbolFor(group).id;
  $('children-mode').disabled = !group || !readable || savingPresence;
  $('add-child-form').hidden = !group;
  $('teacher-controls').hidden = childView;
  $('children-toolbar').hidden = !childView;
  document.body.classList.toggle('children-view', childView);
  const day = $('attendance-date').value;
  const present = new Set(group?.days[day] || []);
  const absent = new Set(group?.absent?.[day] || []);
  $('group-title').textContent = group ? `${group.name} · ${day.split('-').reverse().join('.')}` : 'Creează prima grupă';
  $('attendance-count').textContent = group ? `${group.children.filter(c=>present.has(c.id)).length} din ${group.children.length} copii au bifat prezența${absent.size ? ` · ${absent.size} ${absent.size === 1 ? 'absent' : 'absenți'}` : ''}` : 'Adaugă lista de copii pentru a începe.';
  $('attendance-cards').replaceChildren();
  for (const child of (group?.children || [])) {
    const arrived = present.has(child.id);
    const card = document.createElement('article');
    card.className = `child-card${arrived ? ' is-present' : ''}${absent.has(child.id) ? ' is-absent' : ''}`;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'child-arrival';
    button.disabled = (!childView && arrived) || !readable || savingPresence;
    button.setAttribute('aria-label', `${child.name}: ${arrived ? 'prezență bifată' : 'bifează prezența'}`);
    for (const [tag,text] of [['span',symbolFor(group).icon],['strong',child.name],['span',absent.has(child.id) ? 'Absent' : arrived ? 'Prezență bifată' : 'Am ajuns!']]) {
      const element = document.createElement(tag); element.textContent = text; button.append(element);
    }
    if(child.avatar) { const photo=document.createElement('img');photo.className='child-avatar';photo.src=child.avatar;photo.alt='';button.firstElementChild.replaceWith(photo); }
    button.addEventListener('click', async () => {
      // A children screen left open overnight always records the current local day.
      const targetDay = childView ? localDay() : $('attendance-date').value;
      const nextPresence = childView ? !arrived : true;
      const saved = absent.has(child.id)
        ? await save(setAbsence(store, groupId, targetDay, child.id, false))
        : await save(setPresence(store, groupId, targetDay, child.id, nextPresence));
      if (saved) {
        $('attendance-date').value = targetDay;
        render();
        if (nextPresence && !absent.has(child.id)) message(`Bine ai venit, ${child.name}!`);
      }
    });
    card.append(button);
    if (childView) {
      const actions = document.createElement('div');
      actions.className = 'attendance-child-actions';
      const absenceButton = document.createElement('button');
      absenceButton.type = 'button'; absenceButton.className = 'attendance-absent'; absenceButton.textContent = absent.has(child.id) ? 'Anulează absența' : 'Absent';
      absenceButton.disabled = savingPresence || !readable;
      absenceButton.addEventListener('click', async () => {
        if (await save(setAbsence(store, groupId, localDay(), child.id, !absent.has(child.id)))) {
          $('attendance-date').value = localDay(); render(); message('');
        }
      });
      actions.append(absenceButton);
      card.append(actions);
    }
    if(!childView) {
      const upload=document.createElement('input');upload.type='file';upload.accept='image/jpeg,image/png';upload.hidden=true;
      const choose=document.createElement('button');choose.className='text-button';choose.textContent=child.avatar?'Schimbă poza':'Adaugă poză';choose.disabled=savingPresence||!readable;
      choose.onclick=()=>upload.click();
      upload.onchange=async()=>{
        const owner=workspace.user?.id, epoch=workspace.epoch, targetGroup=group.id;
        try {
          if(!upload.files[0]) return;
          const avatar=await editAvatar(upload.files[0]);
          if(!avatar) return;
          if(workspace.user?.id!==owner || workspace.epoch!==epoch) throw new Error('Contul s-a schimbat. Redeschide grupa.');
          const next=structuredClone(store), target=next.groups.find(g=>g.id===targetGroup)?.children.find(c=>c.id===child.id);
          if(!target) throw new Error('Copilul nu mai este în această grupă.');
          target.avatar=avatar;
          if(new Blob([JSON.stringify(next)]).size>4800000) throw new Error('Spațiul pentru fotografii este plin. Elimină o poză înainte să adaugi alta.');
          if(await save(next)) message('Avatarul a fost salvat.');
        } catch(error) {message(error.message);} finally {upload.value='';}
      };
      card.append(choose,upload);
      if(child.avatar) {const remove=document.createElement('button');remove.className='text-button';remove.textContent='Elimină poza';remove.disabled=savingPresence||!readable;remove.onclick=async()=>{const next=structuredClone(store);delete next.groups.find(g=>g.id===group.id).children.find(c=>c.id===child.id).avatar;await save(next);};card.append(remove);}
    }
    if (arrived && !childView) {
      const undo = document.createElement('button'); undo.type='button'; undo.className='text-button'; undo.textContent='Corectează bifarea';
      undo.disabled=savingPresence || !readable;
      undo.addEventListener('click',async ()=>{ if(await save(setPresence(store,groupId,day,child.id,false))) {render();message(`Bifarea pentru ${child.name} a fost anulată.`);} });
      card.append(undo);
    }
    $('attendance-cards').append(card);
  }
  applyTranslations(document.querySelector('.attendance'));
}
$('new-group').addEventListener('click',()=>{ $('group-form').hidden=false; $('group-name').focus(); });
$('cancel-group').addEventListener('click',()=>{ $('group-form').hidden=true; });
$('group-form').addEventListener('submit',async event=>{
  event.preventDefault();
  try {
    const name=$('group-name').value.trim(); if(!name) throw new Error('Scrie numele grupei.');
    const names=childNames($('group-children').value);
    const group={id:crypto.randomUUID(),name,symbol:$('new-group-symbol').value,children:names.map(name=>({id:crypto.randomUUID(),name})),days:{},absent:{}};
    if(await save({...store,groups:[...store.groups,group]})) { groupId=group.id; $('group-form').reset(); $('group-form').hidden=true;render();message('Grupa este pregătită. Copiii își pot bifa sosirea!'); }
  } catch(error) { message(error.message); }
});
$('add-child-form').addEventListener('submit',async event=>{
  event.preventDefault();
  try {
    const group=store.groups.find(g=>g.id===groupId);
    const name=$('child-name').value.trim();
    if(!name) throw new Error('Scrie numele copilului.');
    childNames([...group.children.map(c=>c.name),name].join('\n'));
    const next=structuredClone(store);next.groups.find(g=>g.id===groupId).children.push({id:crypto.randomUUID(),name});
    if(await save(next)) {$('add-child-form').reset();render();message(`${name} a fost adăugat în grupă.`);}
  } catch(error) {message(error.message);}
});
$('group-select').addEventListener('change',()=>{groupId=$('group-select').value;render();message('');});
$('group-symbol').addEventListener('change',async ()=>{
  const next=structuredClone(store);
  const group=next.groups.find(g=>g.id===groupId);
  if(!group) return;
  group.symbol=$('group-symbol').value;
  if(await save(next)) { render(); message('Simbolul a fost actualizat pentru întreaga grupă.'); }
  else $('group-symbol').value=symbolFor(store.groups.find(g=>g.id===groupId)).id;
});
$('attendance-date').addEventListener('change',()=>{if(!$('attendance-date').value) $('attendance-date').value=localDay();render();message('');});
$('children-mode').addEventListener('click',()=>{childView=true;$('attendance-date').value=localDay();render();message('Bună dimineața! Găsește cartonașul cu numele tău.');});
$('teacher-mode').addEventListener('click',()=>{childView=false;render();message('');});
workspace.subscribe(event=>{
  if(!['identity','loaded','saved'].includes(event.type)) return;
  store=workspace.read('attendance');
  readable=!['error','loading'].includes(workspace.status);
  if(!store.groups.some(group=>group.id===groupId)) groupId=store.groups[0]?.id || '';
  if(event.type==='identity') { childView=false; $('group-form').reset(); $('add-child-form').reset(); message(''); }
  if(event.type==='loaded' && !store.groups.length) $('group-form').hidden=false;
  render();
});
render();
if(!store.groups.length) $('group-form').hidden=false;
