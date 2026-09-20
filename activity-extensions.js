import {extraTypes,shuffle,shuffledDifferent,normalized,letters,mathRound,wordGrid} from './activity-rules.js';
import {escape as e,imageMarkup} from './activity-media.js';

const field = (label,content) => `<div class="field"><label>${label}${content}</label></div>`;
export function editorExtra(a) {
  if(a.type==='math') return `<div class="editor-section form-grid">${field('Operații',`<select id="math-operation">${[['mixed','Adunare și scădere'],['add','Adunare'],['subtract','Scădere'],['multiply','Înmulțire']].map(([id,label])=>`<option value="${id}" ${a.operation===id?'selected':''}>${label}</option>`).join('')}</select>`)}<div class="form-row">${field('Numere între 1 și',`<input id="math-max" type="number" min="5" max="100" value="${a.max}" />`)}${field('Exerciții pe rundă',`<input id="math-count" type="number" min="3" max="20" value="${a.count}" />`)}</div><p class="editor-help">Exercițiile se generează din nou la fiecare joc. Scăderile au rezultate pozitive sau zero.</p></div>`;
  const details={
    truefalse:{label:'O afirmație pe rând',hint:'Separă afirmația de răspuns prin |. Folosește adevărat sau fals.',value:a.type==='truefalse'?a.items.map(i=>`${i.text} | ${i.answer?'adevărat':'fals'}`).join('\n'):''},
    blanks:{label:'O propoziție pe rând',hint:'Scrie ___ în locul cuvântului lipsă, apoi | și răspunsul. Pentru alternative folosește / între răspunsuri.',value:a.type==='blanks'?a.items.map(i=>`${i.text} | ${i.answer}`).join('\n'):''},
    scramble:{label:'Un cuvânt pe rând',hint:'Scrie cuvântul, apoi | și un indiciu opțional. Maximum 18 litere, fără spații.',value:a.type==='scramble'?a.items.map(i=>`${i.word} | ${i.hint}`).join('\n'):''},
    wordsearch:{label:'Cuvintele de găsit',hint:'2–12 cuvinte, unul pe rând. Maximum 12 litere pe cuvânt, fără spații. Grila se reconstruiește la fiecare joc.',value:a.type==='wordsearch'?a.words.join('\n'):''}
  }[a.type];
  return `<div class="editor-section">${field(details.label,`<textarea id="extra-content" rows="8" maxlength="6000" spellcheck="false">${e(details.value)}</textarea>`)}<p class="editor-help">${details.hint}</p></div>`;
}
export function readExtra(type,root) {
  if(type==='math') return {operation:root.querySelector('#math-operation').value,max:Number(root.querySelector('#math-max').value),count:Number(root.querySelector('#math-count').value)};
  const lines=root.querySelector('#extra-content').value.split('\n').map(s=>s.trim()).filter(Boolean);
  if(type==='wordsearch') return {words:lines.map(s=>s.toLocaleUpperCase('ro'))};
  return {items:lines.map(line=>{
    const split=line.indexOf('|'),text=(split<0?line:line.slice(0,split)).trim(),answer=split<0?'':line.slice(split+1).trim();
    if(type==='truefalse') return {text,answer:['ADEVARAT','TRUE'].includes(normalized(answer))?true:['FALS','FALSE'].includes(normalized(answer))?false:null};
    if(type==='scramble') return {word:text.toLocaleUpperCase('ro'),hint:answer};
    return {text,answer};
  })};
}
export function extraValidation(type) {
  return {math:'Alege 3–20 exerciții și numere între 5 și 100.',truefalse:'Scrie 1–24 de afirmații, fiecare urmată de | adevărat sau | fals.',blanks:'Scrie 1–24 de propoziții cu un singur ___ și un răspuns după |.',scramble:'Scrie 1–24 de cuvinte cu 2–18 litere, fără spații.',wordsearch:'Scrie 2–12 cuvinte diferite, fiecare cu maximum 12 litere, fără spații.'}[type];
}
const action=(name,label,extra='',disabled=false)=>`<button class="button button-soft" data-action="ext-${name}" ${extra} ${disabled?'disabled':''}>${label}</button>`;
const done=(score,total)=>`<div class="result"><strong>${score} / ${total}</strong>Ai terminat runda!</div><div class="player-actions"><button class="button button-primary" data-action="replay">Joacă din nou</button><button class="button button-soft" data-action="close">Înapoi</button></div>`;
function prepare(a) {
  if(a.type==='wordsearch') return {...wordGrid(a.words),found:[],start:null,feedback:''};
  const tasks=a.type==='math'?mathRound(a):shuffle(a.items);
  return {tasks,index:0,score:0,answered:false,feedback:'',input:'',selection:[]};
}
export function renderExtra(root,player) {
  const a=player.activity,s=player.state||(player.state=prepare(a));
  if(a.type==='wordsearch') {
    if(s.found.length===s.paths.length){root.innerHTML=done(s.found.length,s.paths.length);return;}
    const foundCells=new Set(s.paths.filter((_,i)=>s.found.includes(i)).flatMap(p=>p.cells));
    root.innerHTML=`<div class="player-progress">${s.found.length} / ${s.paths.length} cuvinte găsite</div><div class="word-grid" style="--grid-size:${s.size}" role="group" aria-label="Grilă de litere">${s.grid.map((char,i)=>`<button class="word-cell ${foundCells.has(i)?'is-found':''} ${s.start===i?'is-start':''}" data-action="ext-cell" data-index="${i}" aria-label="${e(char)}, rând ${Math.floor(i/s.size)+1}, coloană ${i%s.size+1}" aria-pressed="${s.start===i}">${e(char)}</button>`).join('')}</div><ul class="word-list">${s.paths.map((p,i)=>`<li class="${s.found.includes(i)?'is-found':''}">${s.found.includes(i)?'✓ ':''}${e(p.word)}</li>`).join('')}</ul><p class="feedback" role="status">${e(s.feedback||'Alege prima literă, apoi ultima literă a cuvântului.')}</p>`;return;
  }
  if(s.index>=s.tasks.length){root.innerHTML=done(s.score,s.tasks.length);return;}
  const task=s.tasks[s.index];let content='';
  if(a.type==='math') content=`<h3 class="calculation">${e(task.text)} = ?</h3><div class="calculation-options">${task.options.map(n=>action('answer',n,`data-answer="${n}"`,s.answered)).join('')}</div>`;
  if(a.type==='truefalse') content=`<h3 class="player-question">${e(task.text)}</h3><div class="calculation-options">${action('answer','✓ Adevărat','data-answer="true"',s.answered)}${action('answer','✕ Fals','data-answer="false"',s.answered)}</div>`;
  if(a.type==='blanks') content=`<h3 class="player-question">${e(task.text)}</h3><div class="field"><label for="blank-answer">Cuvântul lipsă</label><input id="blank-answer" data-extra-answer value="${e(s.input)}" maxlength="60" autocomplete="off" ${s.answered?'disabled':''} /></div>${action('check','Verifică','',s.answered)}`;
  if(a.type==='scramble') {
    if(!s.letters) s.letters=shuffledDifferent(letters(task.word));
    content=`<p class="word-hint">${e(task.hint||'Recompune cuvântul din litere.')}</p><div class="spelled-word" aria-label="Cuvântul tău">${e(s.selection.map(i=>s.letters[i]).join(''))||'…'}</div><div class="letter-bank">${s.letters.map((char,i)=>action('letter',e(char),`data-index="${i}"`,s.answered||s.selection.includes(i))).join('')}</div><div class="player-actions">${action('undo','Șterge ultima literă','',s.answered||!s.selection.length)}${action('check','Verifică','',s.answered||s.selection.length!==s.letters.length)}</div>`;
  }
  root.innerHTML=`<div class="player-progress">${s.index+1} / ${s.tasks.length} · ${s.score} răspunsuri corecte</div>${content}<p class="feedback" role="status">${e(s.feedback)}</p>${s.answered?`<div class="player-actions"><span></span>${action('next',s.index+1===s.tasks.length?'Vezi rezultatul':'Următoarea →')}</div>`:''}`;
}
export function handleExtra(actionName,target,player,root) {
  if(!actionName.startsWith('ext-') || !player || !Object.hasOwn(extraTypes,player.activity.type)) return false;
  const a=player.activity,s=player.state,name=actionName.slice(4);
  if(!s) return true;
  if(name==='cell') {
    const index=Number(target.dataset.index);if(!Number.isInteger(index)||index<0||index>=s.grid.length)return true;
    if(s.start===null){s.start=index;s.feedback='Acum alege ultima literă.';}
    else { const p=s.paths.findIndex(path=>{const first=path.cells[0],last=path.cells.at(-1);return (s.start===first&&index===last)||(s.start===last&&index===first);});
      if(p>=0&&!s.found.includes(p)){s.found.push(p);s.feedback=`Ai găsit ${s.paths[p].word}!`;}else s.feedback=p>=0?'Ai găsit deja acest cuvânt.':'Nu este un cuvânt din listă. Mai încearcă.';s.start=null; }
    renderExtra(root,player);return true;
  }
  if(name==='next' && s.answered){s.index++;s.answered=false;s.feedback='';s.selection=[];s.letters=null;s.input='';}
  if(!s.answered && s.index<s.tasks.length) {
    if(name==='letter'){const i=Number(target.dataset.index);if(Number.isInteger(i)&&i>=0&&i<s.letters.length&&!s.selection.includes(i))s.selection.push(i);}
    if(name==='undo')s.selection.pop();
    if(name==='answer'||name==='check') {
      const task=s.tasks[s.index];let correct=false;
      if(a.type==='math')correct=Number(target.dataset.answer)===task.answer;
      if(a.type==='truefalse')correct=(target.dataset.answer==='true')===task.answer;
      if(a.type==='blanks'){s.input=root.querySelector('[data-extra-answer]').value.trim();if(!s.input)return true;correct=task.answer.split('/').some(answer=>normalized(answer)===normalized(s.input));}
      if(a.type==='scramble')correct=normalized(s.selection.map(i=>s.letters[i]).join(''))===normalized(task.word);
      if(correct)s.score++;
      s.answered=true;
      const solution=a.type==='scramble'?task.word:a.type==='truefalse'?(task.answer?'adevărat':'fals'):task.answer;
      s.feedback=correct?'Corect!':`Răspunsul corect: ${solution}.`;
    }
  }
  renderExtra(root,player);return true;
}

export function activityPreview(a) {
  if(a.type==='memory')return `<span class="sample-memory">${a.pairs.slice(0,2).map(p=>`<span>${imageMarkup(p.image,p.textA)||e(p.textA)}</span><span class="sample-back">?</span>`).join('')}</span>`;
  if(a.type==='quiz')return `<strong>${e(a.questions[0].prompt)}</strong><span class="sample-options">${a.questions[0].options.slice(0,3).map(o=>`<span>${imageMarkup(o.image,o.text)}${e(o.text)}</span>`).join('')}</span>`;
  if(a.type==='match')return `<span class="sample-pairs">${a.pairs.slice(0,2).map(p=>`<span>${e(p.left)}</span><b>↔</b><span>${e(p.right)}</span>`).join('')}</span>`;
  if(a.type==='sort')return `<strong>${e(a.items[0].text)}</strong><span class="sample-options">${a.categories.map(c=>`<span>${e(c.name)}</span>`).join('')}</span>`;
  if(a.type==='order')return `<span class="sample-options">${shuffledDifferent(a.items).slice(0,4).map(i=>`<span>${e(i.text)}</span>`).join('')}</span><small>Mută elementele în ordinea corectă</small>`;
  if(a.type==='math')return '<strong class="sample-equation">7 + 5 = ?</strong><span class="sample-options"><span>10</span><span>12</span><span>14</span></span><small>O rundă nouă la fiecare joc</small>';
  if(a.type==='truefalse')return `<strong>${e(a.items[0].text)}</strong><span class="sample-options"><span>✓ Adevărat</span><span>✕ Fals</span></span>`;
  if(a.type==='blanks')return `<strong>${e(a.items[0].text)}</strong><span class="sample-input">Scrie răspunsul…</span>`;
  if(a.type==='scramble')return `<strong>${e(a.items[0].hint)}</strong><span class="sample-options">${shuffledDifferent(letters(a.items[0].word)).map(c=>`<span>${e(c)}</span>`).join('')}</span>`;
  return `<span class="sample-word-grid" aria-hidden="true">${letters('CARTEFLORINORLUNASOARECERAPĂDURE').slice(0,25).map(c=>`<span>${e(c)}</span>`).join('')}</span><small>${a.words.length} cuvinte de descoperit</small>`;
}
