export const documentFields = {attendance:'groups', assessments:'entries', materials:'items', calendars:'events'};
export const gradeLabels = {FB:'Foarte bine', B:'Bine', S:'Suficient', I:'Insuficient', OBS:'Doar observație'};
export const grades = [...Object.keys(gradeLabels), ...Array.from({length:10},(_,i)=>String(i+1))];
export const text = (value,max,required=false) => typeof value==='string' && value.length<=max && (!required || !!value.trim());
export const validDay = value => typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value;
export function safeLink(value) {
  try {const url=new URL(value);return value.length<=2048 && url.protocol==='https:' && !url.username && !url.password;} catch {return false;}
}
export function validAssessment(a) {
  return a && text(a.groupId,200,true) && text(a.childId,200,true) && text(a.groupName,100,true) && text(a.childName,100,true)
    && validDay(a.date) && text(a.subject,80,true) && text(a.skill,160) && grades.includes(a.grade)
    && text(a.note,1500) && text(a.nextStep,500) && typeof a.support==='boolean' && typeof a.archived==='boolean';
}
export function validMaterial(a) {
  return a && text(a.title,120,true) && text(a.subject,80) && text(a.lesson,120) && text(a.note,1500)
    && text(a.groupId,200) && text(a.groupName,100) && typeof a.archived==='boolean'
    && (a.type==='link' ? safeLink(a.url) : a.type==='file' && text(a.name,200,true) && text(a.path,400,true)
      && /^[a-f\d-]+\/[a-f\d-]+\.[a-z\d]+$/i.test(a.path) && Number.isInteger(a.size) && a.size>0 && a.size<=20971520);
}
export function validLesson(a) {
  return a && text(a.title,120,true) && validDay(a.date) && /^$|^([01]\d|2[0-3]):[0-5]\d$/.test(a.time)
    && text(a.groupId,200) && text(a.groupName,100) && text(a.subject,80) && text(a.note,1500)
    && Array.isArray(a.materialIds) && a.materialIds.length<=30 && a.materialIds.every(id=>text(id,200,true)) && typeof a.archived==='boolean';
}
export const chronological = entries => [...entries].sort((a,b)=>b.date.localeCompare(a.date)||(b.updatedAt||0)-(a.updatedAt||0));
// An explicit aid to review recorded work, not a ranking or a diagnosis of a child.
export function supportReason(entries,today) {
  const active=chronological(entries.filter(e=>!e.archived && e.date<=today));
  if(active.some(e=>e.support)) return 'Sprijin marcat de profesor';
  const since=new Date(today+'T12:00:00');since.setDate(since.getDate()-30);
  const latest=new Map();
  for(const entry of active) { const key=entry.subject.trim().toLocaleLowerCase('ro');if(entry.grade!=='OBS'&&!latest.has(key))latest.set(key,entry); }
  const attention=[...latest.values()].find(e=>new Date(e.date+'T12:00:00')>=since && (['S','I'].includes(e.grade)||Number(e.grade)>0&&Number(e.grade)<6));
  return attention ? `${attention.subject}: ${attention.grade} recent` : '';
}
