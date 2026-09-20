export const extraTypes = {
  math:{label:'Calcule',desc:'Exerciții noi la fiecare rundă',tone:'blue'},
  truefalse:{label:'Adevărat sau fals',desc:'Verifică idei și afirmații',tone:'green'},
  blanks:{label:'Completează',desc:'Găsește cuvântul lipsă',tone:'coral'},
  scramble:{label:'Litere amestecate',desc:'Reconstruiește cuvintele',tone:'lavender'},
  wordsearch:{label:'Caută cuvinte',desc:'Descoperă cuvinte în grilă',tone:'yellow'}
};
export const extraSeeds = [
  {id:'seed-math',type:'math',title:'Misiunea numerelor',instructions:'Rezolvă calculele. La fiecare joc primești o rundă nouă.',subject:'Matematică',age:'6–9 ani',operation:'mixed',max:20,count:8},
  {id:'seed-truefalse',type:'truefalse',title:'Detectivii naturii',instructions:'Citește fiecare afirmație și alege adevărat sau fals.',subject:'Științe',age:'6–10 ani',items:[{text:'Delfinul este un pește.',answer:false},{text:'Plantele au nevoie de lumină.',answer:true},{text:'Păianjenul are opt picioare.',answer:true},{text:'Toate păsările pot zbura.',answer:false}]},
  {id:'seed-blanks',type:'blanks',title:'Cuvântul care lipsește',instructions:'Scrie cuvântul care completează fiecare propoziție.',subject:'Limba română',age:'6–9 ani',items:[{text:'Soarele răsare la ___.',answer:'est'},{text:'Cartea se citește pagină cu ___.',answer:'pagină'},{text:'Albina adună ___ din flori.',answer:'nectar'}]},
  {id:'seed-scramble',type:'scramble',title:'Atelierul de cuvinte',instructions:'Apasă literele în ordinea potrivită. Folosește indiciul dacă ai nevoie.',subject:'Limba română',age:'6–10 ani',items:[{word:'FLUTURE',hint:'Insectă cu aripi colorate'},{word:'CARTE',hint:'Are pagini și povești'},{word:'SOARE',hint:'Ne aduce lumină și căldură'}]},
  {id:'seed-wordsearch',type:'wordsearch',title:'Exploratorii grilei',instructions:'Apasă prima și ultima literă a unui cuvânt. Cuvintele sunt pe orizontală sau verticală.',subject:'Vocabular',age:'7–11 ani',words:['FLUTURE','CARTE','SOARE','PĂDURE','NOR','FLOARE']}
];
export function shuffle(items) {
  const result = [...items];
  for (let i=result.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [result[i],result[j]]=[result[j],result[i]]; }
  return result;
}
export function shuffledDifferent(items) {
  const result=shuffle(items);
  if(result.length>1 && result.every((item,i)=>item===items[i])) result.push(result.shift());
  return result;
}
export const normalized = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleUpperCase('ro');
export const letters = value => Array.from(String(value).normalize('NFC').toLocaleUpperCase('ro'));
const text = (v,max=180) => typeof v==='string' && v.trim().length>0 && v.length<=max;
const word = (v,max=18) => text(v,max) && v.length>=2 && /^[A-Za-zĂÂÎȘȚăâîșț]+$/.test(v);
export function validateExtra(a) {
  if(!a || !Object.hasOwn(extraTypes,a.type)) return false;
  if(a.type==='math') return ['add','subtract','mixed','multiply'].includes(a.operation) && Number.isInteger(a.max) && a.max>=5 && a.max<=100 && Number.isInteger(a.count) && a.count>=3 && a.count<=20;
  if(a.type==='wordsearch') return Array.isArray(a.words) && a.words.length>=2 && a.words.length<=12 && a.words.every(w=>word(w,12)) && new Set(a.words.map(normalized)).size===a.words.length;
  if(!Array.isArray(a.items) || a.items.length<1 || a.items.length>24) return false;
  if(a.type==='truefalse') return a.items.every(i=>i && text(i.text) && typeof i.answer==='boolean');
  if(a.type==='blanks') return a.items.every(i=>i && text(i.text) && i.text.split('___').length===2 && text(i.answer,60) && i.answer.split('/').some(answer=>answer.trim().length>0));
  return a.items.every(i=>i && word(i.word) && typeof i.hint==='string' && i.hint.length<=160);
}
export function mathRound(config) {
  const seen=new Set(), result=[];
  for(let i=0;i<config.count;i++) {
    let task;
    for(let attempt=0;attempt<100;attempt++) {
      let a=1+Math.floor(Math.random()*config.max), b=1+Math.floor(Math.random()*config.max);
      const op=config.operation==='mixed'?(Math.random()<.5?'add':'subtract'):config.operation;
      if(op==='subtract' && b>a) [a,b]=[b,a];
      const answer=op==='multiply'?a*b:op==='subtract'?a-b:a+b;
      task={text:`${a} ${op==='multiply'?'×':op==='subtract'?'−':'+'} ${b}`,answer};
      if(!seen.has(task.text)) break;
    }
    seen.add(task.text); const options=new Set([task.answer]);
    while(options.size<4) { const n=task.answer+Math.floor(Math.random()*15)-7; if(n>=0) options.add(n); }
    result.push({...task,options:shuffle([...options])});
  }
  return result;
}
export function wordGrid(words) {
  const size=Math.max(8,...words.map(w=>letters(w).length),words.length);
  let grid=Array(size*size).fill(''), paths=[], failed=false;
  for(const word of [...words].sort((a,b)=>b.length-a.length)) {
    const chars=letters(word); let placed=false;
    for(let attempt=0;attempt<180;attempt++) {
      const vertical=Math.random()<.5;
      const row=Math.floor(Math.random()*(vertical?size-chars.length+1:size));
      const col=Math.floor(Math.random()*(vertical?size:size-chars.length+1));
      const cells=chars.map((_,i)=>(row+(vertical?i:0))*size+col+(vertical?0:i));
      if(cells.every((cell,i)=>!grid[cell]||grid[cell]===chars[i])) { cells.forEach((cell,i)=>grid[cell]=chars[i]);paths.push({word,cells});placed=true;break; }
    }
    if(!placed){failed=true;break;}
  }
  // A bounded fallback guarantees every requested word exists, even in a crowded grid.
  if(failed) { grid=Array(size*size).fill('');paths=[];shuffle(words).forEach((word,row)=>{const chars=letters(word),col=Math.floor(Math.random()*(size-chars.length+1));const cells=chars.map((_,i)=>row*size+col+i);cells.forEach((cell,i)=>grid[cell]=chars[i]);paths.push({word,cells});}); }
  const alphabet='ABCDEFGHIJKLMNOPRSTUVZ';
  return {size,paths,grid:grid.map(char=>char||alphabet[Math.floor(Math.random()*alphabet.length)])};
}
