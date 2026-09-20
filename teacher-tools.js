import {workspace,ready} from './account.js';
import {localDay} from './attendance-model.js';
import {gradeLabels,grades,validAssessment,validMaterial,validLesson,safeLink,chronological,supportReason} from './teacher-records.js';
import {acceptedFiles,uploadLessonFile,downloadLessonFile} from './lesson-files.js';

const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>localDay();
const dateLabel=date=>/^\d{4}-\d{2}-\d{2}$/.test(date)?date.split('-').reverse().join('.'):'Fără dată';
const records=()=>workspace.read('assessments').entries;
const materials=()=>workspace.read('materials').items;
const lessons=()=>workspace.read('calendars').events;
const groups=()=>workspace.read('attendance').groups;
const button=(action,label,id='',className='button button-soft')=>`<button type="button" class="${className}" data-tool-action="${action}" data-id="${e(id)}">${label}</button>`;
const option=(value,label,current)=>`<option value="${e(value)}" ${String(value)===String(current)?'selected':''}>${e(label)}</option>`;
const field=(label,control)=>`<label class="tool-field">${label}${control}</label>`;
const input=(name,value='',extra='')=>`<input name="${name}" value="${e(value)}" ${extra} />`;
const empty=(title,description,action='')=>`<div class="tool-empty"><h3>${title}</h3><p>${description}</p>${action}</div>`;
const state={tab:'grades',group:'',subject:'',support:false,child:'',archivedGrades:false,materialQuery:'',archivedMaterials:false,calendarGroup:'',day:today(),month:today().slice(0,7),edit:null,pendingUpload:null};
let busy=false;
const dialog=document.createElement('dialog');dialog.className='tool-dialog';dialog.setAttribute('aria-labelledby','teacher-tools-title');
dialog.innerHTML=`<header class="tool-header"><div><p class="overline">SPAȚIUL PROFESORULUI</p><h2 id="teacher-tools-title">Organizează clasa</h2></div>${button('close','×','','tool-close')}</header><nav class="tool-tabs" aria-label="Instrumentele profesorului">${button('tab','Calificative','grades')}${button('tab','Materiale pentru lecții','materials')}${button('tab','Calendar','calendar')}</nav><p id="tool-message" role="status" aria-live="polite"></p><div id="tool-content"></div><p class="tool-hint"><span data-storage-status></span> · <button type="button" class="text-button" data-account-open>Cont și sincronizare</button></p>`;
dialog.querySelector('.tool-close').setAttribute('aria-label','Închide instrumentele');document.body.append(dialog);
const content=dialog.querySelector('#tool-content');
function message(value){dialog.querySelector('#tool-message').textContent=value;}
function groupOptions(value,blank='') {return (blank?option('',blank,value):'')+groups().map(g=>option(g.id,g.name,value)).join('');}
function allGradeGroups(){const result=groups().map(g=>({...g}));for(const a of records())if(!result.some(g=>g.id===a.groupId))result.push({id:a.groupId,name:a.groupName+' (arhivă)',children:[]});return result;}
function editorFooter(){return `<div class="tool-form-actions">${button('cancel-edit','Renunță')}<button type="submit" class="button button-primary">Salvează</button></div>`;}
function focusEditor(){content.querySelector('#tool-editor input, #tool-editor select')?.focus();}
function render(){
  dialog.querySelectorAll('[data-tool-action="tab"]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.id===state.tab));});
  if(['error','loading'].includes(workspace.status)){content.innerHTML=empty('Datele nu sunt disponibile',e(workspace.problem||'Așteaptă încărcarea contului.'),'<button class="button button-soft" data-account-open>Deschide contul</button>');return;}
  if(state.tab==='grades')renderGrades();else if(state.tab==='materials')renderMaterials();else renderCalendar();
}
function resetEditor(){state.edit=null;state.pendingUpload=null;}
function open(tab){state.tab=tab;resetEditor();message('');render();if(!dialog.open)dialog.showModal();dialog.scrollTop=0;}
async function run(operation,success){
  if(busy)return;
  if(['loading','error','conflict'].includes(workspace.status)){message(workspace.problem||'Reîncarcă datele din cont înainte să continui.');return;}
  const epoch=workspace.epoch;busy=true;workspace.pending++;workspace.emit('status');
  dialog.querySelectorAll('button,input,select,textarea').forEach(n=>n.disabled=true);message('Se salvează…');
  try {await operation();if(workspace.epoch!==epoch)return;message(success);resetEditor();render();}
  catch(error){if(workspace.epoch===epoch)message(error.message||'Operațiunea nu a reușit. Formularul este păstrat.');}
  finally{busy=false;workspace.pending--;workspace.emit('status');dialog.querySelectorAll('button,input,select,textarea').forEach(n=>n.disabled=false);renderSummary();}
}
async function saveRecord(kind,field,record){const doc=workspace.read(kind),index=doc[field].findIndex(a=>a.id===record.id);if(index<0)doc[field].push(record);else doc[field][index]=record;await workspace.save(kind,doc);}
function renderSummary(){
  const nodes=document.querySelectorAll('[data-tool-summary]');
  const counts={grades:`${records().filter(a=>!a.archived).length} evaluări înregistrate`,materials:`${materials().filter(a=>!a.archived).length} materiale pregătite`,calendar:`${lessons().filter(a=>!a.archived&&a.date>=today()).length} lecții și evenimente viitoare`};
  nodes.forEach(n=>n.textContent=counts[n.dataset.toolSummary]);
}

function gradeRows(){
  const group=allGradeGroups().find(g=>g.id===state.group);if(!group)return [];
  const children=group.children.map(c=>({...c}));for(const a of records().filter(a=>a.groupId===group.id))if(!children.some(c=>c.id===a.childId))children.push({id:a.childId,name:a.childName+' (arhivă)'});
  return children.map(child=>{const entries=chronological(records().filter(a=>a.groupId===group.id&&a.childId===child.id&&!a.archived&&(!state.subject||a.subject===state.subject)));return {child,entries,reason:supportReason(entries,today())};});
}
function renderGrades(){
  const available=allGradeGroups();if(!available.some(g=>g.id===state.group))state.group=available[0]?.id||'';
  if(!available.length){content.innerHTML=empty('Începe cu lista clasei','Calificativele folosesc elevii introduși la prezență. Creează acolo grupa sau clasa, apoi revino aici.','<a class="button button-primary" href="prezenta.html">Adaugă elevii la prezență →</a>');return;}
  const subjects=[...new Set(records().filter(a=>a.groupId===state.group&&!a.archived).map(a=>a.subject))].sort();
  if(!subjects.includes(state.subject))state.subject='';
  const rows=gradeRows(),shown=state.support?rows.filter(r=>r.reason):rows;
  const activeGroup=groups().find(g=>g.id===state.group);
  content.innerHTML=`<div class="tool-toolbar">${field('Clasa sau grupa',`<select data-tool-filter="group">${available.map(g=>option(g.id,g.name,state.group)).join('')}</select>`)}${field('Materia',`<select data-tool-filter="subject">${option('','Toate materiile',state.subject)}${subjects.map(s=>option(s,s,state.subject)).join('')}</select>`)}<label class="tool-check"><input type="checkbox" data-tool-filter="support" ${state.support?'checked':''} /> Doar de sprijinit</label>${activeGroup?.children.length?button('new-grade','+ Adaugă o evaluare'):''}</div>
    <div class="tool-stats"><span><strong>${rows.length}</strong> elevi</span><span><strong>${rows.filter(r=>r.reason).length}</strong> de sprijinit</span><span><strong>${rows.filter(r=>!r.entries.length).length}</strong> fără evaluări</span></div>
    <p class="tool-hint">„De sprijinit” arată marcajele tale și ultimul rezultat S/I sau o notă sub 6 la o materie, din ultimele 30 de zile. Vezi istoricul și observațiile înainte să alegi următorul pas.</p>
    ${shown.length?`<div class="tool-table-wrap"><table class="tool-table"><thead><tr><th>Elev</th><th>Ultima evaluare</th><th>Evidență</th><th>Istoric</th></tr></thead><tbody>${shown.map(({child,entries,reason})=>`<tr><th scope="row">${e(child.name)}</th><td>${entries[0]?`<span class="grade-badge">${e(entries[0].grade)}</span> ${e(entries[0].subject)}<small>${dateLabel(entries[0].date)}</small>`:'Fără evaluări'}</td><td>${reason?`<span class="support-tag">${e(reason)}</span>`:`${entries.length} evaluări`}</td><td>${button('child','Vezi istoricul',child.id,'text-button')}</td></tr>`).join('')}</tbody></table></div>`:empty('Niciun elev în acest filtru','Schimbă materia sau dezactivează filtrul „De sprijinit”.')}
    ${state.child?gradeHistory():''}${state.edit?gradeEditor():''}`;
}
function gradeHistory(){
  const row=gradeRows().find(r=>r.child.id===state.child);if(!row)return '';
  const entries=chronological(records().filter(a=>a.groupId===state.group&&a.childId===state.child&&(!state.subject||a.subject===state.subject)&&(state.archivedGrades||!a.archived)));
  return `<section class="tool-history"><div class="tool-row"><h3>Istoric · ${e(row.child.name)}</h3>${button('close-history','Închide istoricul','','text-button')}</div><label class="tool-check"><input type="checkbox" data-tool-filter="archivedGrades" ${state.archivedGrades?'checked':''}/> Arată și evaluările arhivate</label>${entries.length?entries.map(a=>`<article class="record-card ${a.archived?'is-archived':''}"><div class="tool-row"><h4><span class="grade-badge">${e(a.grade)}</span> ${e(a.subject)}</h4><small>${dateLabel(a.date)}${a.archived?' · Arhivat':''}</small></div>${a.skill?`<p><strong>Ce am urmărit:</strong> ${e(a.skill)}</p>`:''}${a.note?`<p class="preserve-lines">${e(a.note)}</p>`:''}${a.nextStep?`<p class="preserve-lines"><strong>Următorul pas:</strong> ${e(a.nextStep)}</p>`:''}${a.support?'<p class="support-tag">Sprijin marcat de profesor</p>':''}<div class="tool-row-actions">${!a.archived?button('edit-grade','Editează',a.id,'text-button'):''}${button('archive-grade',a.archived?'Restabilește':'Arhivează',a.id,'text-button')}</div></article>`).join(''):'<p>Nu există încă evaluări pentru această selecție.</p>'}</section>`;
}
function gradeEditor(){
  const a=records().find(a=>a.id===state.edit)||{},group=groups().find(g=>g.id===state.group);
  const children=[...(group?.children||[])];if(a.childId&&!children.some(c=>c.id===a.childId))children.push({id:a.childId,name:a.childName});
  return `<form id="tool-editor" data-tool-form="grade" class="tool-form"><h3>${a.id?'Editează evaluarea':'O evaluare nouă'}</h3><div class="tool-form-grid">${field('Elev',`<select name="childId" required>${children.map(c=>option(c.id,c.name,a.childId||state.child)).join('')}</select>`)}${field('Data',input('date',a.date||today(),'type="date" required'))}${field('Materia',input('subject',a.subject||state.subject,'maxlength="80" required placeholder="Ex.: Matematică" list="grade-subjects"'))}<datalist id="grade-subjects">${[...new Set(records().map(a=>a.subject))].map(s=>option(s,s)).join('')}</datalist>${field('Calificativ sau notă',`<select name="grade" required>${option('','Alege un calificativ sau o notă',a.grade||'')}${grades.map(g=>option(g,gradeLabels[g]?`${g} · ${gradeLabels[g]}`:g,a.grade||'')).join('')}</select>`)}</div>${field('Competența sau lecția urmărită',input('skill',a.skill||'','maxlength="160" placeholder="Ex.: Adunări cu trecere peste ordin"'))}${field('Observații',`<textarea name="note" rows="3" maxlength="1500" placeholder="Ce a reușit? Unde întâmpină dificultăți?">${e(a.note)}</textarea>`)}${field('Următorul pas',`<textarea name="nextStep" rows="2" maxlength="500" placeholder="Ex.: 10 minute de lucru cu materiale concrete">${e(a.nextStep)}</textarea>`)}<label class="tool-check"><input name="support" type="checkbox" ${a.support?'checked':''}/> Vreau să urmăresc nevoia de sprijin</label><p class="tool-hint">Poți scoate ulterior marcajul din această evaluare. Calificativele nu sunt transformate în medii numerice.</p>${editorFooter()}</form>`;
}

function materialRows(){const query=state.materialQuery.trim().toLocaleLowerCase('ro');return materials().filter(a=>(state.archivedMaterials||!a.archived)&&[a.title,a.subject,a.lesson,a.groupName].join(' ').toLocaleLowerCase('ro').includes(query)).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));}
function materialSize(size){return size>=1048576?`${(size/1048576).toFixed(1)} MB`:`${Math.ceil(size/1024)} KB`;}
function materialOpen(a){return a.type==='link'&&safeLink(a.url)?`<a class="button button-soft" href="${e(a.url)}" target="_blank" rel="noopener noreferrer">Deschide linkul ↗</a>`:a.type==='file'?button('download','Descarcă',a.id):'';}
function renderMaterials(){
  const items=materialRows();
  content.innerHTML=`<div class="tool-toolbar">${field('Caută materiale',input('material-search',state.materialQuery,'type="search" data-tool-filter="materialQuery" placeholder="Titlu, materie, lecție sau clasă"'))}${button('new-material','+ Adaugă material')}<label class="tool-check"><input type="checkbox" data-tool-filter="archivedMaterials" ${state.archivedMaterials?'checked':''}/> Arată arhiva</label></div><p class="tool-hint">Fișiere de până la 20 MB: PDF, Word, PowerPoint, Excel, imagini, TXT, MP3 și MP4. Poți adăuga și un link către un material.</p>${!workspace.user?'<p class="tool-notice">Linkurile se pot salva în acest browser. Pentru încărcarea fișierelor și acces de pe alte dispozitive, <button type="button" class="text-button" data-account-open>intră în cont</button>.</p>':''}${state.edit?materialEditor():''}<div class="material-list">${items.length?items.map(a=>`<article class="record-card ${a.archived?'is-archived':''}"><div class="tool-row"><h3>${e(a.title)}</h3><span class="file-type">${a.type==='file'?e(a.name.split('.').pop().toUpperCase()):'LINK'}${a.archived?' · Arhivat':''}</span></div><p class="tool-hint">${[a.subject,a.lesson,a.groupName].filter(Boolean).map(e).join(' · ')||'Fără categorie'}${a.type==='file'?' · '+materialSize(a.size):''}</p>${a.note?`<p class="preserve-lines">${e(a.note)}</p>`:''}<div class="tool-row-actions">${materialOpen(a)}${button('edit-material','Editează detaliile',a.id,'text-button')}${button('archive-material',a.archived?'Restabilește':'Arhivează',a.id,'text-button')}</div></article>`).join(''):empty('Loc pentru următoarea lecție','Adaugă o fișă, o prezentare, o imagine sau un link. Le vei putea lega de o lecție din calendar.')}</div>`;
}
function materialEditor(){
  const a=materials().find(a=>a.id===state.edit)||{},type=a.type||(workspace.user?'file':'link');
  return `<form id="tool-editor" class="tool-form" data-tool-form="material"><h3>${a.id?'Detaliile materialului':'Material nou'}</h3>${field('Titlu',input('title',a.title||'','maxlength="120" required'))}${!a.id?field('Cum îl adaugi?',`<select name="type" data-material-type>${option('file','Încarcă un fișier',type)}${option('link','Adaugă un link',type)}</select>`):input('type',type,'type="hidden"')}${type==='file'&&a.id?`<p>${e(a.name)} · ${materialSize(a.size)}</p>`:`<div data-file-field ${type!=='file'?'hidden':''}>${field('Fișier · maximum 20 MB','<input name="file" type="file" accept="'+acceptedFiles+'" />')}<p class="tool-hint">Fișierul încărcat rămâne privat în contul tău.</p></div>`}<div data-link-field ${type!=='link'?'hidden':''}>${field('Link către material',input('url',a.url||'','type="url" maxlength="2048" placeholder="https://…"'))}</div><div class="tool-form-grid">${field('Materia',input('subject',a.subject||'','maxlength="80"'))}${field('Lecția sau tema',input('lesson',a.lesson||'','maxlength="120"'))}${field('Clasa / grupa',`<select name="groupId">${groupOptions(a.groupId||'','Pentru orice clasă')}${a.groupId&&!groups().some(g=>g.id===a.groupId)?option(a.groupId,a.groupName+' (arhivă)',a.groupId):''}</select>`)}</div>${field('Notițe pentru lecție',`<textarea name="note" rows="3" maxlength="1500">${e(a.note)}</textarea>`)}${editorFooter()}</form>`;
}

function eventsForDay(day){return lessons().filter(a=>!a.archived&&a.date===day&&(!state.calendarGroup||a.groupId===state.calendarGroup)).sort((a,b)=>(a.time||'').localeCompare(b.time||''));}
function renderCalendar(){
  const [year,month]=state.month.split('-').map(Number),first=new Date(year,month-1,1,12),days=new Date(year,month,0).getDate(),offset=(first.getDay()+6)%7;
  const slots=Math.ceil((offset+days)/7)*7;
  const monthTitle=new Intl.DateTimeFormat('ro-RO',{month:'long',year:'numeric'}).format(first);
  content.innerHTML=`<div class="tool-toolbar">${field('Clasa / grupa',`<select data-tool-filter="calendarGroup">${groupOptions(state.calendarGroup,'Toate clasele')}</select>`)}${button('new-event','+ Lecție sau eveniment')}${button('calendar-today','Astăzi')}</div><div class="calendar-layout"><section><div class="tool-row calendar-heading">${button('month','←','-1')}<h3>${e(monthTitle)}</h3>${button('month','→','1')}</div><div class="class-calendar" role="group" aria-label="Calendarul clasei">${['Lu','Ma','Mi','Jo','Vi','Sâ','Du'].map(d=>`<span class="calendar-weekday">${d}</span>`).join('')}${Array.from({length:slots},(_,i)=>{const n=i-offset+1;if(n<1||n>days)return '<span></span>';const date=`${state.month}-${String(n).padStart(2,'0')}`,count=eventsForDay(date).length;return `<button type="button" class="calendar-day ${date===today()?'is-today':''}" data-tool-action="day" data-id="${date}" aria-label="${dateLabel(date)}, ${count} evenimente" aria-pressed="${date===state.day}"><span>${n}</span>${count?`<small>${count}</small>`:''}</button>`;}).join('')}</div></section><section class="calendar-agenda"><h3>${dateLabel(state.day)}</h3>${eventsForDay(state.day).length?eventsForDay(state.day).map(eventCard).join(''):empty('Zi liberă în calendar','Adaugă o lecție, o evaluare sau un moment important.')}</section></div>${state.edit?eventEditor():''}<details class="tool-archive"><summary>Evenimente arhivate</summary>${lessons().filter(a=>a.archived).map(a=>`<p>${e(a.title)} · ${dateLabel(a.date)} ${button('archive-event','Restabilește',a.id,'text-button')}</p>`).join('')||'<p>Niciun eveniment arhivat.</p>'}</details>`;
}
function eventCard(a){return `<article class="record-card"><div class="tool-row"><h4>${e(a.title||'Eveniment')}</h4><span>${e(a.time||'Toată ziua')}</span></div><p class="tool-hint">${[a.groupName,a.subject].filter(Boolean).map(e).join(' · ')}</p>${a.note?`<p class="preserve-lines">${e(a.note)}</p>`:''}${(a.materialIds||[]).map(id=>{const m=materials().find(m=>m.id===id);return m?`<div class="lesson-attachment"><span>${e(m.title)}${m.archived?' (arhivat)':''}</span>${materialOpen(m)}</div>`:'<p>Material indisponibil</p>';}).join('')}<div class="tool-row-actions">${button('edit-event','Editează',a.id,'text-button')}${button('archive-event','Arhivează',a.id,'text-button')}</div></article>`;}
function eventEditor(){
  const a=lessons().find(a=>a.id===state.edit)||{},available=materials().filter(m=>!m.archived||(a.materialIds||[]).includes(m.id));
  return `<form id="tool-editor" class="tool-form" data-tool-form="event"><h3>${a.id?'Editează lecția':'Lecție sau eveniment nou'}</h3>${field('Titlu',input('title',a.title||'','maxlength="120" required placeholder="Ex.: Fracții prin joc"'))}<div class="tool-form-grid">${field('Data',input('date',a.date||state.day,'type="date" required'))}${field('Ora (opțional)',input('time',a.time||'','type="time"'))}${field('Clasa / grupa',`<select name="groupId">${groupOptions(a.groupId||state.calendarGroup,'Fără clasă anume')}${a.groupId&&!groups().some(g=>g.id===a.groupId)?option(a.groupId,a.groupName+' (arhivă)',a.groupId):''}</select>`)}${field('Materia',input('subject',a.subject||'','maxlength="80"'))}</div>${field('Plan sau notițe',`<textarea name="note" maxlength="1500" rows="3">${e(a.note)}</textarea>`)}<fieldset class="lesson-material-picker"><legend>Materiale pentru această lecție</legend>${available.length?available.map(m=>`<label class="tool-check"><input type="checkbox" name="materialIds" value="${e(m.id)}" ${(a.materialIds||[]).includes(m.id)?'checked':''}/> ${e(m.title)}${m.archived?' (arhivat)':''}</label>`).join(''):'<p>Adaugă mai întâi fișiere sau linkuri în „Materiale pentru lecții”.</p>'}</fieldset>${editorFooter()}</form>`;
}

async function submitGrade(values){
  const existing=records().find(a=>a.id===state.edit),group=groups().find(g=>g.id===state.group),child=group?.children.find(c=>c.id===values.childId);
  if(!child&&!existing)throw new Error('Alege un elev din clasa curentă.');
  const record={...existing,id:existing?.id||state.edit,groupId:state.group,groupName:group?.name||existing.groupName,childId:values.childId,childName:child?.name||existing.childName,date:values.date,subject:values.subject.trim(),skill:values.skill.trim(),grade:values.grade,note:values.note.trim(),nextStep:values.nextStep.trim(),support:values.support==='on',archived:false,updatedAt:Date.now()};
  if(!validAssessment(record))throw new Error('Completează elevul, data, materia și calificativul.');
  await saveRecord('assessments','entries',record);state.child=record.childId;
}
async function submitMaterial(values){
  const epoch=workspace.epoch,existing=materials().find(a=>a.id===state.edit),group=groups().find(g=>g.id===values.groupId);
  let attachment=existing?{type:existing.type,path:existing.path,name:existing.name,size:existing.size,url:existing.url}:null;
  if(values.type==='link') {if(!safeLink(values.url.trim()))throw new Error('Adaugă un link complet care începe cu https://.');attachment={type:'link',url:values.url.trim()};}
  else if(!existing){
    if(!workspace.user)throw new Error('Intră în cont pentru a încărca fișiere. Poți salva un link fără cont.');
    const file=values.file;if(!file?.size)throw new Error('Alege fișierul pe care vrei să îl încarci.');
    message('Se încarcă fișierul…');
    if(!state.pendingUpload || state.pendingUpload.file!==file)state.pendingUpload={file,attachment:await uploadLessonFile(file)};
    attachment=state.pendingUpload.attachment;
  }
  if(workspace.epoch!==epoch)throw new Error('Contul s-a schimbat. Redeschide materialele.');
  const record={...existing,...attachment,id:existing?.id||state.edit,title:values.title.trim(),subject:values.subject.trim(),lesson:values.lesson.trim(),groupId:values.groupId,groupName:group?.name||(values.groupId?existing?.groupName||'':''),note:values.note.trim(),archived:existing?.archived||false,updatedAt:Date.now()};
  if(!validMaterial(record))throw new Error('Verifică titlul și fișierul sau linkul materialului.');
  await saveRecord('materials','items',record);
}
async function submitEvent(values){
  const existing=lessons().find(a=>a.id===state.edit),group=groups().find(g=>g.id===values.groupId);
  const record={...existing,schema:2,id:existing?.id||state.edit,title:values.title.trim(),date:values.date,time:values.time,groupId:values.groupId,groupName:group?.name||(values.groupId?existing?.groupName||'':''),subject:values.subject.trim(),note:values.note.trim(),materialIds:values.materialIds,archived:false,updatedAt:Date.now()};
  if(!validLesson(record))throw new Error('Completează titlul și o dată validă. Poți atașa cel mult 30 de materiale.');
  await saveRecord('calendars','events',record);state.day=record.date;state.month=record.date.slice(0,7);
}
dialog.addEventListener('submit',event=>{
  const form=event.target.closest('[data-tool-form]');if(!form)return;event.preventDefault();
  // Snapshot before disabling controls: disabled inputs are excluded by FormData.
  const data=new FormData(form),values=Object.fromEntries(data);values.materialIds=data.getAll('materialIds');
  const formType=form.dataset.toolForm;
  const operation=()=>formType==='grade'?submitGrade(values):formType==='material'?submitMaterial(values):submitEvent(values);
  run(operation,formType==='grade'?'Evaluarea a fost salvată.':formType==='material'?'Materialul este pregătit pentru lecție.':'Lecția a fost salvată în calendar.');
});
dialog.addEventListener('change',event=>{
  const target=event.target;
  if(target.matches('[data-material-type]')){content.querySelector('[data-file-field]').hidden=target.value!=='file';content.querySelector('[data-link-field]').hidden=target.value!=='link';return;}
  const key=target.dataset.toolFilter;if(!key)return;
  if(key==='materialQuery'&&state.edit)return;
  state[key]=target.type==='checkbox'?target.checked:target.value;resetEditor();
  if(key==='group'){state.child='';state.subject='';}
  render();
});
dialog.addEventListener('input',event=>{
  if(event.target.dataset.toolFilter!=='materialQuery')return;
  const start=event.target.selectionStart,end=event.target.selectionEnd;
  state.materialQuery=event.target.value;
  // Do not destroy a material draft while typing in the separate search control.
  if(state.edit)return;
  renderMaterials();const search=content.querySelector('[data-tool-filter="materialQuery"]');search.focus();try{search.setSelectionRange(start,end);}catch{}
});
dialog.addEventListener('click',event=>{
  const target=event.target.closest('[data-tool-action]');if(!target||busy)return;
  const action=target.dataset.toolAction,id=target.dataset.id;
  if(action==='close'){dialog.close();return;}
  if(action==='tab'){state.tab=id;resetEditor();message('');render();return;}
  if(action==='cancel-edit'){resetEditor();render();return;}
  if(action==='child'){state.child=id;resetEditor();render();content.querySelector('.tool-history')?.scrollIntoView({block:'start'});return;}
  if(action==='close-history'){state.child='';render();return;}
  if(['new-grade','new-material','new-event','edit-grade','edit-material','edit-event'].includes(action)){
    resetEditor();state.edit=action.startsWith('new')?crypto.randomUUID():id;render();focusEditor();return;
  }
  if(action==='day'){state.day=id;resetEditor();render();return;}
  if(action==='calendar-today'){state.day=today();state.month=state.day.slice(0,7);resetEditor();render();return;}
  if(action==='month'){const [year,month]=state.month.split('-').map(Number),next=new Date(year,month-1+Number(id),1,12);state.month=localDay(next).slice(0,7);state.day=state.month+'-01';resetEditor();render();return;}
  if(action==='download'){const item=materials().find(m=>m.id===id);if(item)run(()=>downloadLessonFile(item),'Descărcarea este pregătită.');return;}
  const location={'archive-grade':['assessments','entries'],'archive-material':['materials','items'],'archive-event':['calendars','events']}[action];
  if(location){const [kind,field]=location,item=workspace.read(kind)[field].find(a=>a.id===id);if(item)run(()=>saveRecord(kind,field,{...item,archived:!item.archived,updatedAt:Date.now()}),item.archived?'Element restabilit.':'Element arhivat. Îl poți restabili din arhivă.');}
});
dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
dialog.addEventListener('close',()=>{if(!busy){resetEditor();content.replaceChildren();message('');}});
document.addEventListener('click',event=>{const button=event.target.closest('[data-open-tool]');if(button)open(button.dataset.openTool);});
await ready;
renderSummary();
workspace.subscribe(event=>{
  if(event.type==='identity'){
    if(dialog.open)dialog.close();content.replaceChildren();message('');resetEditor();state.child='';state.group='';state.subject='';state.materialQuery='';state.calendarGroup='';
  }
  if(['loaded','saved','identity'].includes(event.type))renderSummary();
  if(event.type==='loaded'&&dialog.open)render();
});
