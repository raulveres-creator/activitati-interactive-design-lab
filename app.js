import {workspace, ready} from './account.js';
import {applyTranslations, t} from './i18n.js';
await ready;

(() => {
  'use strict';

  let savingActivity = false;
  const MAX_ITEMS = 24;
  const TYPES = {
    quiz:{ label:'Quiz', desc:'Întrebări cu variante', tone:'green' },
    match:{ label:'Potrivire', desc:'Leagă perechile corecte', tone:'coral' },
    sort:{ label:'Sortare', desc:'Pune lucrurile la locul lor', tone:'yellow' },
    order:{ label:'Ordonare', desc:'Așază pașii în ordine', tone:'lavender' },
    memory:{ label:'Memory', desc:'Găsește perechile', tone:'blue' }
  };
  const seeds = [
    { id:'seed-quiz', type:'quiz', title:'Forme în jurul nostru', instructions:'Alege răspunsul potrivit pentru fiecare întrebare.', age:'4–6 ani', subject:'Matematică', isSeed:true, questions:[
      { id:'q1', prompt:'Ce formă are ceasul de pe perete?', options:[{id:'a',text:'Cerc'},{id:'b',text:'Triunghi'},{id:'c',text:'Pătrat'}], correctId:'a' },
      { id:'q2', prompt:'Ce formă are tabla din clasă?', options:[{id:'a',text:'Dreptunghi'},{id:'b',text:'Cerc'},{id:'c',text:'Triunghi'}], correctId:'a' }
    ]},
    { id:'seed-match', type:'match', title:'Animale și puii lor', instructions:'Unește fiecare animal cu puiul său.', age:'4–7 ani', subject:'Științe', isSeed:true, pairs:[{id:'p1',left:'Câine',right:'Cățeluș'},{id:'p2',left:'Pisică',right:'Pisoi'},{id:'p3',left:'Găină',right:'Pui'}] },
    { id:'seed-sort', type:'sort', title:'Unde locuiesc animalele?', instructions:'Alege categoria potrivită pentru fiecare animal.', age:'5–8 ani', subject:'Științe', isSeed:true, categories:[{id:'c1',name:'Apă'},{id:'c2',name:'Uscat'},{id:'c3',name:'Cuib'}], items:[{id:'i1',text:'Delfin',categoryId:'c1'},{id:'i2',text:'Pasăre',categoryId:'c3'},{id:'i3',text:'Vulpe',categoryId:'c2'},{id:'i4',text:'Arici',categoryId:'c2'}] },
    { id:'seed-order', type:'order', title:'Semința devine floare', instructions:'Așază etapele în ordinea corectă.', age:'6–9 ani', subject:'Natură', isSeed:true, items:[{id:'o1',text:'Punem sămânța în pământ'},{id:'o2',text:'Apare lăstarul'},{id:'o3',text:'Crește planta'},{id:'o4',text:'Se deschide floarea'}] },
    { id:'seed-memory', type:'memory', title:'Perechi din natură', instructions:'Întoarce câte două cartonașe și găsește ideile asociate: Soare–Lumină, Ploaie–Umbrelă, Floare–Albină.', age:'5–8 ani', subject:'Natură', isSeed:true, pairs:[{id:'m1',textA:'Soare',textB:'Lumină'},{id:'m2',textA:'Ploaie',textB:'Umbrelă'},{id:'m3',textA:'Floare',textB:'Albină'}] }
  ];

  let userActivities = loadActivities();
  let selectedType = 'quiz';
  let activePlayer = null;
  let resourceFilter = 'all';
  let resourceQuery = '';
  let returnFocus = null;
  let editorPreview = null;
  const art = window.atelierArt;

  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];

  function uid(prefix='id') { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`; }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function allActivities() { return [...seeds, ...userActivities]; }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char])); }
  function loadActivities() { return workspace.read('activities').filter(validateActivity); }
  async function persist(next) { await workspace.save('activities',next); userActivities = next; renderLibrary(); }
  function toast(message) { const node=$('#toast'); node.textContent=message; node.classList.add('show'); window.clearTimeout(toast.timer); toast.timer=window.setTimeout(()=>node.classList.remove('show'),2600); }
  function validateActivity(activity) {
    if (!activity || typeof activity !== 'object' || !TYPES[activity.type] || typeof activity.title !== 'string' || !activity.title.trim()) return false;
    if (activity.type==='quiz') return Array.isArray(activity.questions) && activity.questions.length > 0 && activity.questions.every(q => q && q.prompt && Array.isArray(q.options) && q.options.length >= 2 && q.options.filter(o=>o.id===q.correctId).length===1);
    if (activity.type==='match') return Array.isArray(activity.pairs) && activity.pairs.length >= 2 && activity.pairs.every(p=>p.left && p.right);
    if (activity.type==='sort') return Array.isArray(activity.categories) && activity.categories.length >= 2 && Array.isArray(activity.items) && activity.items.length >= 2 && activity.items.every(i=>i.text && activity.categories.some(c=>c.id===i.categoryId));
    if (activity.type==='order') return Array.isArray(activity.items) && activity.items.length >= 2 && activity.items.every(i=>i.text);
    return Array.isArray(activity.pairs) && activity.pairs.length >= 2 && activity.pairs.every(p=>p.textA && p.textB);
  }
  function toBase64Url(text) { const bytes=new TextEncoder().encode(text); let binary=''; bytes.forEach(byte=>binary+=String.fromCharCode(byte)); return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
  function fromBase64Url(value) { const binary=atob(value.replace(/-/g,'+').replace(/_/g,'/') + '='.repeat((4-value.length%4)%4)); const bytes=Uint8Array.from(binary, ch=>ch.charCodeAt(0)); return new TextDecoder().decode(bytes); }
  function shareUrl(activity) { return `${location.href.split('#')[0]}#share=${toBase64Url(JSON.stringify(activity))}`; }
  function parseSharedActivity() { const match=location.hash.match(/^#share=([^&]+)/); if (!match) return null; try { const value=JSON.parse(fromBase64Url(match[1])); return validateActivity(value) ? value : null; } catch { return null; } }

  function renderTemplates() {
    $('#template-grid').innerHTML = Object.entries(TYPES).map(([type, info]) => `<button class="template-card tone-${info.tone}" data-action="template" data-type="${type}" aria-label="Creează: ${t(info.label)}">${art.model(type)}<span class="format-copy"><strong class="format-name">${t(info.label)}</strong><span class="format-description">${t(info.desc)}</span></span><span class="template-arrow" aria-hidden="true">↗</span></button>`).join('');
    applyTranslations($('#template-grid'));
  }
  function renderExamples() {
    const normal = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const filtered = seeds.filter(a => (resourceFilter === 'all' || a.type === resourceFilter) && normal(a.title + ' ' + a.subject + ' ' + TYPES[a.type].label).includes(normal(resourceQuery)));
    $('#example-count').textContent = filtered.length === 1 ? `1 ${t('model editabil')}` : `${filtered.length} ${t('modele editabile')}`;
    $('#search-empty').hidden = filtered.length > 0;
    $('#example-grid').innerHTML = filtered.map(activity => `<article class="example-card"><button class="example-picture" data-action="play" data-id="${activity.id}" data-type="${activity.type}" aria-label="${t('Încearcă')}: ${escapeHtml(activity.title)}"><span class="picture-label">${t(TYPES[activity.type].label)}</span>${art.scene(activity.type)}<span class="preview-hint">${t('Previzualizează ↗')}</span></button><div class="example-info"><h3>${escapeHtml(activity.title)}</h3><span class="example-meta">${escapeHtml(activity.subject)} <span aria-hidden="true">·</span> ${escapeHtml(activity.age)}</span></div><div class="example-actions"><button data-action="template" data-type="${activity.type}">${t('Folosește modelul')} <span aria-hidden="true">→</span></button><button data-action="play" data-id="${activity.id}">${t('Încearcă')}</button></div></article>`).join('');
    applyTranslations($('#example-grid'));
    applyTranslations($('#example-count'));
  }
  function renderLibrary() {
    const list=$('#library-list');
    $('#nav-library-count').textContent = userActivities.length;
    if (!userActivities.length) { list.innerHTML='<div class="library-empty"><span class="empty-book">' + art.icon('folder') + '</span><div><strong>Aici prind rădăcini ideile tale.</strong>Salvează prima activitate și revino la ea oricând.</div><button class="button button-soft" data-action="open-create">Creează prima activitate →</button></div>'; applyTranslations(list); return; }
    list.innerHTML=userActivities.map(activity => `<article class="library-row"><div class="library-row-icon">${art.scene(activity.type)}<span class="library-type-icon">${art.icon(activity.type)}</span></div><div><h3>${escapeHtml(activity.title)}</h3><p>${t(TYPES[activity.type].label)} · ${escapeHtml(activity.age || t('Fără grupă de vârstă'))} · ${workspace.user ? t('în contul tău') : t('salvat în browser')}</p></div><div class="library-actions"><button class="icon-button" title="${t('Joacă')}" data-action="play" data-id="${activity.id}">▶</button><button class="icon-button" title="${t('Editează')}" data-action="edit" data-id="${activity.id}">✎</button><button class="icon-button" title="${t('Copiază linkul')}" data-action="share" data-id="${activity.id}">↗</button><button class="icon-button danger" title="${t('Șterge')}" data-action="delete" data-id="${activity.id}">×</button></div></article>`).join('');
    applyTranslations(list);
  }

  function openModal(content) { const backdrop=$('#modal-backdrop'); if(backdrop.hidden) returnFocus=document.activeElement; $('#modal').innerHTML=content; applyTranslations($('#modal')); backdrop.hidden=false; document.body.style.overflow='hidden'; $('.sidebar').inert=true; $('.workspace').inert=true; const close=$('.modal-close'); if(close) close.focus(); }
  function closeModal() {
    if(editorPreview) {
      const {draft, editingId}=editorPreview;
      editorPreview=null; activePlayer=null;
      openModal(editorContent(draft,draft.type));
      $('[data-action="save-activity"]').dataset.editingId=editingId;
      return;
    }
    $('#modal-backdrop').hidden=true; document.body.style.overflow=''; activePlayer=null;
    $('.sidebar').inert=false; $('.workspace').inert=false;
    if(returnFocus?.isConnected) returnFocus.focus();
  }
  function editorContent(activity=null, type=selectedType) {
    const editing=!!activity && userActivities.some(item=>item.id===activity.id); selectedType=type;
    return `<div class="modal-header"><div><p class="eyebrow">${editing?'Editează activitatea':'Activitate nouă pentru clasă'}</p><h2 id="modal-title">${editing?'Dă-i o formă mai bună':'Alege un format și începe'}</h2><p>${workspace.user ? 'Conținutul se salvează în contul tău.' : 'Conținutul se salvează în acest browser. Intră în cont pentru acces de pe alte dispozitive.'}</p></div><button class="modal-close" data-action="close" aria-label="Închide">×</button></div><div class="modal-body"><div class="type-picker">${Object.entries(TYPES).map(([key,info])=>`<button class="type-option ${key===type?'selected':''}" data-action="switch-type" data-type="${key}"><span>${art.icon(key)}</span>${info.label}</button>`).join('')}</div><div id="editor-fields">${editorFields(activity,type)}</div></div>`;
  }
  function editorFields(activity,type) {
    const a=activity || seedForType(type);
    const editing=!!activity && userActivities.some(item=>item.id===activity.id);
    const common=`<div class="form-grid"><div class="form-row"><div class="field"><label for="activity-title">Titlu</label><input id="activity-title" value="${escapeHtml(a.title)}" maxlength="100" /></div><div class="field"><label for="activity-age">Vârsta</label><input id="activity-age" value="${escapeHtml(a.age || '')}" placeholder="ex. 6–8 ani" maxlength="30" /></div></div><div class="form-row"><div class="field"><label for="activity-subject">Subiect</label><input id="activity-subject" value="${escapeHtml(a.subject || '')}" placeholder="ex. Natură" maxlength="40" /></div><div class="field"><label for="activity-instructions">Instrucțiuni</label><input id="activity-instructions" value="${escapeHtml(a.instructions || '')}" maxlength="140" /></div></div></div>`;
    let specific='';
    if(type==='quiz') specific=`<div class="editor-section"><div class="editor-item-head"><span>Întrebări</span><button class="text-button" data-action="add-question">+ Adaugă întrebare</button></div><div id="question-editor">${a.questions.map((q,index)=>questionEditor(q,index)).join('')}</div></div>`;
    if(type==='match') specific=`<div class="editor-section"><div class="editor-item-head"><span>Perechi</span><button class="text-button" data-action="add-pair">+ Adaugă pereche</button></div><div id="pair-editor">${a.pairs.map((p,index)=>pairEditor(p,index)).join('')}</div></div>`;
    if(type==='sort') specific=`<div class="editor-section"><div class="editor-item-head"><span>Categorii</span></div><div class="field"><input id="sort-categories" value="${escapeHtml(a.categories.map(c=>c.name).join(', '))}" placeholder="Apă, Uscat" /></div><div class="editor-item-head sort-items-head"><span>Elemente</span><button class="text-button" data-action="add-sort-item">+ Adaugă element</button></div><div id="sort-editor">${a.items.map((item,index)=>sortEditor(item,index,a.categories)).join('')}</div></div>`;
    if(type==='order') specific=`<div class="editor-section"><div class="editor-item-head"><span>Pași în ordinea corectă</span><button class="text-button" data-action="add-order-item">+ Adaugă pas</button></div><div id="order-editor">${a.items.map((item,index)=>orderEditor(item,index)).join('')}</div></div>`;
    if(type==='memory') specific=`<div class="editor-section"><div class="editor-item-head"><span>Perechi de cartonașe</span><button class="text-button" data-action="add-memory-pair">+ Adaugă pereche</button></div><div id="memory-editor">${a.pairs.map((p,index)=>memoryEditor(p,index)).join('')}</div></div>`;
    return `${common}${specific}<div class="validation" id="editor-validation"></div><div class="modal-footer"><button class="button button-ghost" data-action="close">Anulează</button><div class="right"><button class="button button-soft" data-action="preview-draft">Previzualizează</button><button class="button button-primary" data-action="save-activity" data-editing-id="${editing?a.id:''}">Salvează activitatea</button></div></div>`;
  }
  function seedForType(type) { return clone(seeds.find(a=>a.type===type)); }
  function questionEditor(q,index) { return `<div class="editor-item question-item" data-index="${index}"><div class="editor-item-head"><span>Întrebarea ${index+1}</span>${index>0?'<button class="text-button" data-action="remove-question">Elimină</button>':''}</div><div class="field"><label>Întrebare</label><input data-field="prompt" value="${escapeHtml(q.prompt)}" maxlength="140" /></div><div class="choices-editor">${q.options.map(o=>`<div class="choice-line"><input data-field="option" data-option-id="${o.id}" value="${escapeHtml(o.text)}" maxlength="70" /><label class="correct-toggle"><input type="radio" name="correct-${index}" data-field="correct" value="${o.id}" ${o.id===q.correctId?'checked':''}/> corect</label></div>`).join('')}</div></div>`; }
  function pairEditor(p,index) { return `<div class="editor-item pair-item-editor" data-index="${index}"><div class="editor-item-head"><span>Perechea ${index+1}</span>${index>1?'<button class="text-button" data-action="remove-pair">Elimină</button>':''}</div><div class="form-row"><div class="field"><label>Stânga</label><input data-field="left" value="${escapeHtml(p.left)}" maxlength="60" /></div><div class="field"><label>Dreapta</label><input data-field="right" value="${escapeHtml(p.right)}" maxlength="60" /></div></div></div>`; }
  function sortEditor(item,index,categories) { return `<div class="editor-item sort-item-editor" data-index="${index}"><div class="editor-item-head"><span>Elementul ${index+1}</span>${index>1?'<button class="text-button" data-action="remove-sort-item">Elimină</button>':''}</div><div class="form-row"><div class="field"><label>Text</label><input data-field="text" value="${escapeHtml(item.text)}" maxlength="60" /></div><div class="field"><label>Categorie</label><select data-field="categoryId">${categories.map(c=>`<option value="${c.id}" ${c.id===item.categoryId?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}</select></div></div></div>`; }
  function orderEditor(item,index) { return `<div class="editor-item order-item-editor" data-index="${index}"><div class="editor-item-head"><span>Pasul ${index+1}</span>${index>1?'<button class="text-button" data-action="remove-order-item">Elimină</button>':''}</div><div class="field"><input data-field="text" value="${escapeHtml(item.text)}" maxlength="100" /></div></div>`; }
  function memoryEditor(p,index) { return `<div class="editor-item memory-item-editor" data-index="${index}"><div class="editor-item-head"><span>Perechea ${index+1}</span>${index>1?'<button class="text-button" data-action="remove-memory-pair">Elimină</button>':''}</div><div class="form-row"><div class="field"><label>Cartonaș A</label><input data-field="textA" value="${escapeHtml(p.textA)}" maxlength="50" /></div><div class="field"><label>Cartonaș B</label><input data-field="textB" value="${escapeHtml(p.textB)}" maxlength="50" /></div></div></div>`; }

  function readEditor(type) {
    const title=$('#activity-title')?.value.trim(), age=$('#activity-age')?.value.trim(), subject=$('#activity-subject')?.value.trim(), instructions=$('#activity-instructions')?.value.trim();
    const result={id:uid('activity'),type,title,age,subject,instructions};
    if(type==='quiz') result.questions=$$('.question-item').map((node,index)=>({id:uid('q'),prompt:$('.field input[data-field="prompt"]',node).value.trim(),options:$$('input[data-field="option"]',node).map(input=>({id:input.dataset.optionId,text:input.value.trim()})),correctId:$('input[data-field="correct"]:checked',node)?.value}));
    if(type==='match') result.pairs=$$('.pair-item-editor').map(node=>({id:uid('p'),left:$('[data-field="left"]',node).value.trim(),right:$('[data-field="right"]',node).value.trim()}));
    if(type==='sort') { const names=$('#sort-categories').value.split(',').map(name=>name.trim()).filter(Boolean); result.categories=names.map((name,index)=>({id:`c${index+1}`,name})); result.items=$$('.sort-item-editor').map(node=>({id:uid('i'),text:$('[data-field="text"]',node).value.trim(),categoryId:$('[data-field="categoryId"]',node).value})); }
    if(type==='order') result.items=$$('.order-item-editor').map(node=>({id:uid('o'),text:$('[data-field="text"]',node).value.trim()}));
    if(type==='memory') result.pairs=$$('.memory-item-editor').map(node=>({id:uid('m'),textA:$('[data-field="textA"]',node).value.trim(),textB:$('[data-field="textB"]',node).value.trim()}));
    return result;
  }
  function showValidation(message) { const node=$('#editor-validation'); if(node){node.textContent=message; node.classList.add('visible');} }
  function openEditor(activity=null,type=activity?.type || 'quiz') { openModal(editorContent(activity,type)); }

  function playerMarkup(activity) { return `<div class="player" data-player-type="${activity.type}"><div class="player-top"><div><span class="player-kicker">${TYPES[activity.type].label} · ${escapeHtml(activity.age || '')}</span><h2 id="modal-title">${escapeHtml(activity.title)}</h2></div><button class="modal-close" data-action="close" aria-label="Închide">×</button></div><p class="player-instructions">${escapeHtml(activity.instructions || 'Hai să vedem ce știi!')}</p><div id="player-content"></div></div>`; }
  function openPlayer(activity) { activePlayer={activity:clone(activity)}; openModal(playerMarkup(activity)); renderPlayer(); }
  function renderPlayer() {
    const {activity}=activePlayer, root=$('#player-content');
    if(activity.type==='quiz') renderQuiz(root,activity);
    if(activity.type==='match') renderMatch(root,activity);
    if(activity.type==='sort') renderSort(root,activity);
    if(activity.type==='order') renderOrder(root,activity);
    if(activity.type==='memory') renderMemory(root,activity);
    applyTranslations(root);
  }
  function renderQuiz(root,activity) {
    const state=activePlayer.state || (activePlayer.state={index:0,score:0,answered:false}); if(state.done) { root.innerHTML=`<div class="result"><strong>${state.score}/${activity.questions.length}</strong>Răspunsuri corecte. Bravo, ai încercat!</div><div class="player-actions"><button class="button button-soft" data-action="replay">Joacă din nou</button><button class="button button-primary" data-action="close">Înapoi</button></div>`; return; }
    const q=activity.questions[state.index]; root.innerHTML=`<div class="player-progress">Întrebarea ${state.index+1} din ${activity.questions.length}</div><h3 class="player-question">${escapeHtml(q.prompt)}</h3><div class="quiz-options">${q.options.map(o=>`<button class="quiz-option ${state.selected===o.id?'selected':''} ${state.answered && o.id===q.correctId?'correct':''} ${state.answered && state.selected===o.id && o.id!==q.correctId?'wrong':''}" data-action="answer-quiz" data-option="${o.id}">${escapeHtml(o.text)}</button>`).join('')}</div><div class="feedback">${state.answered?(state.selected===q.correctId?'Da! Ai ales foarte bine.':'Nu-i nimic, data viitoare va fi mai ușor.') : ''}</div><div class="player-actions"><span></span>${state.answered?`<button class="button button-primary" data-action="next-quiz">${state.index===activity.questions.length-1?'Vezi rezultatul':'Următoarea'} →</button>`:''}</div>`;
  }
  function renderMatch(root,activity) { const state=activePlayer.state || (activePlayer.state={matched:[],selectedLeft:null,selectedRight:null}); if(state.matched.length===activity.pairs.length){root.innerHTML=`<div class="result"><strong>Bravo!</strong>Ai găsit toate perechile.</div><div class="player-actions"><button class="button button-soft" data-action="replay">Joacă din nou</button><button class="button button-primary" data-action="close">Înapoi</button></div>`;return;} const left=activity.pairs, right=clone(activity.pairs).sort(()=>Math.random()-.5); root.innerHTML=`<div class="player-progress">Găsite ${state.matched.length} din ${activity.pairs.length}</div><div class="pair-grid"><div class="pair-column">${left.map(p=>`<button class="pair-item ${state.matched.includes(p.id)?'matched':''} ${state.selectedLeft===p.id?'selected':''}" data-action="select-left" data-id="${p.id}" ${state.matched.includes(p.id)?'disabled':''}>${escapeHtml(p.left)}</button>`).join('')}</div><div class="pair-column">${right.map(p=>`<button class="pair-item ${state.matched.includes(p.id)?'matched':''} ${state.selectedRight===p.id?'selected':''}" data-action="select-right" data-id="${p.id}" ${state.matched.includes(p.id)?'disabled':''}>${escapeHtml(p.right)}</button>`).join('')}</div></div><div class="feedback">${state.feedback || 'Alege un element din fiecare coloană.'}</div>`; }
  function renderSort(root,activity) { const state=activePlayer.state || (activePlayer.state={index:0,score:0}); if(state.done){root.innerHTML=`<div class="result"><strong>${state.score}/${activity.items.length}</strong>Ai terminat sortarea.</div><div class="player-actions"><button class="button button-soft" data-action="replay">Joacă din nou</button><button class="button button-primary" data-action="close">Înapoi</button></div>`;return;} const item=activity.items[state.index]; root.innerHTML=`<div class="player-progress">Elementul ${state.index+1} din ${activity.items.length}</div><h3 class="player-question">Unde intră „${escapeHtml(item.text)}”?</h3><div class="category-zone">${activity.categories.map(c=>`<button class="category-name" data-action="answer-sort" data-category="${c.id}">${escapeHtml(c.name)}</button>`).join('')}</div><div class="feedback">${state.feedback || ''}</div>`; }
  function renderOrder(root,activity) { const state=activePlayer.state || (activePlayer.state={items:clone(activity.items),done:false}); if(state.done){const correct=state.items.every((item,index)=>item.id===activity.items[index].id);root.innerHTML=`<div class="result"><strong>${correct?'Perfect!':'Aproape!'}</strong>${correct?'Ai așezat toate etapele corect.':'Ordinea poate fi îmbunătățită. Mai încearcă!'}</div><div class="player-actions"><button class="button button-soft" data-action="replay">Joacă din nou</button><button class="button button-primary" data-action="close">Înapoi</button></div>`;return;} root.innerHTML=`<div class="player-progress">Așază pașii, apoi verifică răspunsul.</div><div class="order-list">${state.items.map((item,index)=>`<div class="order-row"><span>${escapeHtml(item.text)}</span><button data-action="move-order" data-index="${index}" data-direction="up" aria-label="Mută în sus">↑</button><button data-action="move-order" data-index="${index}" data-direction="down" aria-label="Mută în jos">↓</button></div>`).join('')}</div><div class="feedback"></div><div class="player-actions"><span></span><button class="button button-primary" data-action="check-order">Verifică</button></div>`; }
  function renderMemory(root,activity) { const state=activePlayer.state || (activePlayer.state={cards:clone(activity.pairs).flatMap(p=>[{id:p.id,side:'a',text:p.textA},{id:p.id,side:'b',text:p.textB}]).sort(()=>Math.random()-.5),flipped:[],matched:[],locked:false}); if(state.matched.length===activity.pairs.length){root.innerHTML=`<div class="result"><strong>Găsite toate!</strong>Ai o memorie grozavă.</div><div class="player-actions"><button class="button button-soft" data-action="replay">Joacă din nou</button><button class="button button-primary" data-action="close">Înapoi</button></div>`;return;} root.innerHTML=`<div class="player-progress">Găsite ${state.matched.length} din ${activity.pairs.length}</div><div class="memory-grid">${state.cards.map((card,index)=>`<button class="memory-card ${state.flipped.includes(index)||state.matched.includes(card.id)?'flipped':''} ${state.matched.includes(card.id)?'matched':''}" data-action="flip-memory" data-index="${index}" ${state.matched.includes(card.id)?'disabled':''}>${state.flipped.includes(index)||state.matched.includes(card.id)?escapeHtml(card.text):'?'}</button>`).join('')}</div><div class="feedback">${state.feedback || 'Întoarce două cartonașe.'}</div>`; }

  async function handleAction(action,target) {
    if(action==='close') closeModal();
    if(action==='open-create') openEditor();
    if(action==='template') openEditor(null,target.dataset.type);
    if(action==='play-seed') openPlayer(seeds[0]);
    if(action==='play') { const item=allActivities().find(a=>a.id===target.dataset.id); if(item) openPlayer(item); }
    if(action==='edit') { const item=userActivities.find(a=>a.id===target.dataset.id); if(item) openEditor(item,item.type); }
    if(action==='delete') { if(confirm(workspace.user ? 'Ștergi această activitate din cont?' : 'Ștergi această activitate din browser?')) { await persist(userActivities.filter(a=>a.id!==target.dataset.id)); toast('Activitatea a fost ștearsă.'); } }
    if(action==='share') { const item=userActivities.find(a=>a.id===target.dataset.id); if(item) copyShare(item); }
    if(action==='focus-library') $('#activitatile-mele').scrollIntoView({behavior:'smooth'});
    if(action==='switch-type') {
      const current=readEditor(selectedType), editingId=$('[data-action="save-activity"]').dataset.editingId;
      if(target.dataset.type === selectedType) return;
      const draft={...seedForType(target.dataset.type),title:current.title,age:current.age,subject:current.subject};
      $('#modal').innerHTML=editorContent(draft,target.dataset.type);
      $('[data-action="save-activity"]').dataset.editingId=editingId;
      $('[data-action="switch-type"][data-type="'+target.dataset.type+'"]').focus();
    }
    if(action==='add-question') { const node=$('#question-editor'); const q={prompt:'',options:[{id:'a',text:''},{id:'b',text:''},{id:'c',text:''}],correctId:'a'}; node.insertAdjacentHTML('beforeend',questionEditor(q,$$('.question-item').length)); }
    if(action==='remove-question') { target.closest('.question-item').remove(); }
    if(action==='add-pair') { const node=$('#pair-editor'); node.insertAdjacentHTML('beforeend',pairEditor({left:'',right:''},$$('.pair-item-editor').length)); }
    if(action==='remove-pair') target.closest('.pair-item-editor').remove();
    if(action==='add-sort-item') { const node=$('#sort-editor'); const cats=$('#sort-categories').value.split(',').map((name,index)=>({id:`c${index+1}`,name:name.trim()})).filter(c=>c.name); node.insertAdjacentHTML('beforeend',sortEditor({text:'',categoryId:cats[0]?.id||'c1'},$$('.sort-item-editor').length,cats)); }
    if(action==='remove-sort-item') target.closest('.sort-item-editor').remove();
    if(action==='add-order-item') { const node=$('#order-editor'); node.insertAdjacentHTML('beforeend',orderEditor({text:''},$$('.order-item-editor').length)); }
    if(action==='remove-order-item') target.closest('.order-item-editor').remove();
    if(action==='add-memory-pair') { const node=$('#memory-editor'); node.insertAdjacentHTML('beforeend',memoryEditor({textA:'',textB:''},$$('.memory-item-editor').length)); }
    if(action==='remove-memory-pair') target.closest('.memory-item-editor').remove();
    if(action==='save-activity') await saveFromEditor(target.dataset.editingId || null);
    if(action==='preview-draft') {
      const draft=readEditor(selectedType);
      if(validateActivity(draft)) {
        editorPreview={draft,editingId:$('[data-action="save-activity"]').dataset.editingId};
        openPlayer(draft);
        const close=$('.modal-close'); close.textContent='←'; close.setAttribute('aria-label','Înapoi la editor'); close.title='Înapoi la editor';
      } else showValidation(validationMessage(selectedType));
    }
    if(action==='answer-quiz') answerQuiz(target.dataset.option);
    if(action==='next-quiz') { activePlayer.state.index++; activePlayer.state.selected=null; activePlayer.state.answered=false; if(activePlayer.state.index>=activePlayer.activity.questions.length) activePlayer.state.done=true; renderPlayer(); }
    if(action==='select-left') { activePlayer.state.selectedLeft=target.dataset.id; resolveMatch(); }
    if(action==='select-right') { activePlayer.state.selectedRight=target.dataset.id; resolveMatch(); }
    if(action==='answer-sort') answerSort(target.dataset.category);
    if(action==='move-order') { const state=activePlayer.state; const index=Number(target.dataset.index), next=target.dataset.direction==='up'?index-1:index+1; if(next>=0&&next<state.items.length){[state.items[index],state.items[next]]=[state.items[next],state.items[index]];renderPlayer();} }
    if(action==='check-order') { activePlayer.state.done=true; renderPlayer(); }
    if(action==='flip-memory') flipMemory(Number(target.dataset.index));
    if(action==='replay') { activePlayer.state=null; renderPlayer(); }
  }
  function validationMessage(type) { if(type==='quiz') return 'Completează întrebările și marchează câte un răspuns corect pentru fiecare.'; if(type==='match'||type==='memory') return 'Ai nevoie de cel puțin două perechi completate.'; if(type==='sort') return 'Adaugă cel puțin două categorii și elemente cu o categorie validă.'; return 'Adaugă cel puțin doi pași cu text.'; }
  async function saveFromEditor(editingId) {
    if(savingActivity) return;
    const draft=readEditor(selectedType);
    if(!draft.title) return showValidation('Scrie un titlu pentru activitate.');
    if(!validateActivity(draft)) return showValidation(validationMessage(selectedType));
    if(editingId && !userActivities.some(item=>item.id===editingId)) return showValidation('Materialul nu mai există în această listă. Redeschide editorul.');
    if(editingId) draft.id=editingId;
    const next=editingId ? userActivities.map(item=>item.id===editingId?draft:item) : [draft,...userActivities];
    const button=$('[data-action="save-activity"]');
    savingActivity=true; button.disabled=true; button.textContent='Se salvează…';
    try {
      await persist(next); closeModal();
      toast(workspace.user ? 'Activitatea a fost salvată în cont.' : 'Activitatea a fost salvată în browser.');
    } catch(error) { if($('#editor-validation')) showValidation(error.message); else toast(error.message); }
    finally { savingActivity=false; if(button.isConnected) {button.disabled=false;button.textContent='Salvează activitatea';} }
  }
  async function copyShare(activity) { const url=shareUrl(activity); try { await navigator.clipboard.writeText(url); toast('Linkul complet a fost copiat.'); } catch { openModal(`<div class="modal-header"><div><p class="eyebrow">Link de partajare</p><h2 id="modal-title">Copiază linkul</h2><p>Oricine are linkul poate juca această activitate.</p></div><button class="modal-close" data-action="close" aria-label="Închide">×</button></div><div class="modal-body"><div class="field"><label for="share-url">Link</label><textarea id="share-url" readonly>${escapeHtml(url)}</textarea></div><div class="modal-footer"><button class="button button-primary" data-action="close">Gata</button></div></div>`); $('#share-url').select(); } }
  function answerQuiz(option) { const state=activePlayer.state; if(state.answered) return; const q=activePlayer.activity.questions[state.index]; state.selected=option; state.answered=true; if(option===q.correctId) state.score++; renderPlayer(); }
  function resolveMatch() { const state=activePlayer.state; if(!state.selectedLeft||!state.selectedRight) { renderPlayer(); return; } if(state.selectedLeft===state.selectedRight){state.matched.push(state.selectedLeft);state.feedback='Pereche corectă!';}else state.feedback='Mai încearcă o dată.'; state.selectedLeft=null;state.selectedRight=null;renderPlayer(); }
  function answerSort(category) { const state=activePlayer.state,item=activePlayer.activity.items[state.index]; if(category===item.categoryId){state.score++;state.feedback='Corect!';state.index++;if(state.index>=activePlayer.activity.items.length)state.done=true;}else state.feedback='Nu se potrivește aici. Încearcă din nou.'; renderPlayer(); }
  function flipMemory(index) { const state=activePlayer.state; if(state.locked||state.flipped.includes(index)||state.matched.includes(state.cards[index].id)) return; state.flipped.push(index); if(state.flipped.length===2){ state.locked=true; const [a,b]=state.flipped; if(state.cards[a].id===state.cards[b].id){state.matched.push(state.cards[a].id);state.feedback='Pereche găsită!';state.flipped=[];state.locked=false;renderPlayer();}else {state.feedback='Nu sunt pereche. Mai încearcă.';renderPlayer();setTimeout(()=>{state.flipped=[];state.locked=false;renderPlayer();},800);} } else renderPlayer(); }

  document.addEventListener('click', event => { const target=event.target.closest('[data-action]'); if(target) handleAction(target.dataset.action,target).catch(error=>toast(error.message || 'Operațiunea nu a reușit.')); });
  document.addEventListener('keydown', event => {
    const target=event.target.closest('[role="button"][data-action]');
    if(target && (event.key==='Enter'||event.key===' ')) { event.preventDefault(); target.click(); }
    if($('#modal-backdrop').hidden) return;
    if(event.key==='Escape') { event.preventDefault(); closeModal(); }
    if(event.key==='Tab') {
      const controls=$$('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]', $('#modal')).filter(el => el.getClientRects().length);
      const first=controls[0], last=controls[controls.length-1];
      if(event.shiftKey && document.activeElement===first) { event.preventDefault(); last?.focus(); }
      else if(!event.shiftKey && document.activeElement===last) { event.preventDefault(); first?.focus(); }
    }
  });
  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
    resourceFilter=button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active', b===button);b.setAttribute('aria-pressed',String(b===button));});
    renderExamples();
  }));
  $('#resource-search').addEventListener('input',event=>{resourceQuery=event.target.value;renderExamples();});
  $('#reset-filters').addEventListener('click',()=>{
    resourceQuery='';$('#resource-search').value='';
    $('[data-filter="all"]').click();$('#resource-search').focus();
  });
  window.addEventListener('hashchange',()=>{ const shared=parseSharedActivity(); if(shared) openPlayer(shared); else if(location.hash.startsWith('#share=')) toast('Linkul nu conține o activitate validă.'); });
  workspace.subscribe(event => {
    if(event.type==='identity') { editorPreview=null; closeModal(); }
    if(['identity','loaded','saved'].includes(event.type)) { userActivities=loadActivities();renderLibrary(); }
  });
  renderTemplates(); renderExamples(); renderLibrary(); applyTranslations();
  const shared=parseSharedActivity(); if(shared) window.setTimeout(()=>openPlayer(shared),100);
})();

