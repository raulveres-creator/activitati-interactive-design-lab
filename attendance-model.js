export const storageKey = 'teacher.attendance.v1';
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function childNames(text) {
  const names = text.split(/\r?\n/).map(name => name.trim()).filter(Boolean);
  if (!names.length || names.length > 100) throw new Error('Adaugă între 1 și 100 de copii.');
  if (names.some(name => name.length > 60)) throw new Error('Folosește nume de cel mult 60 de caractere.');
  if (new Set(names.map(name => name.toLocaleLowerCase('ro'))).size !== names.length) throw new Error('Două nume sunt identice. Adaugă o inițială pentru a le deosebi.');
  return names;
}
export function setPresence(store, groupId, day, childId, present) {
  const next = structuredClone(store);
  const group = next.groups.find(item => item.id === groupId);
  if (!group || !group.children.some(child => child.id === childId)) throw new Error('Copilul nu există în această grupă.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Alege o dată validă.');
  const ids = new Set(group.days[day] || []);
  if (present) ids.add(childId); else ids.delete(childId);
  group.days[day] = [...ids];
  if (group.absent?.[day]) group.absent[day] = group.absent[day].filter(id => id !== childId);
  return next;
}
export function setAbsence(store, groupId, day, childId, absent) {
  const next = structuredClone(store);
  const group = next.groups.find(item => item.id === groupId);
  if (!group || !group.children.some(child => child.id === childId)) throw new Error('Copilul nu există în această grupă.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Alege o dată validă.');
  group.absent ??= {};
  const ids = new Set(group.absent[day] || []);
  if (absent) ids.add(childId); else ids.delete(childId);
  group.absent[day] = [...ids];
  if (absent) group.days[day] = (group.days[day] || []).filter(id => id !== childId);
  return next;
}
