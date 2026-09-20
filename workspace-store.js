import {extraTypes, validateExtra} from './activity-rules.js';
import {documentFields,validAssessment,validMaterial,validLesson} from './teacher-records.js';
export const guestKeys = Object.freeze({
  activities: 'activitati-interactive:v1',
  attendance: 'teacher.attendance.v1',
  assessments: 'teacher.assessments.v1',
  materials: 'teacher.materials.v1',
  calendars: 'teacher.calendars.v1',
});
const empty = kind => kind === 'activities' ? [] : {version:1, [documentFields[kind]]:[]};
const copy = value => structuredClone(value);
const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 200;
const uniqueIds = list => list.every(item => item && validId(item.id)) && new Set(list.map(item => item.id)).size === list.length;
const text = value => typeof value === 'string' && value.trim().length > 0;
function validActivity(a) {
  if(!a || !text(a.title)) return false;
  if(Object.hasOwn(extraTypes,a.type)) return validateExtra(a);
  if(a.type === 'quiz') return Array.isArray(a.questions) && a.questions.length > 0 && a.questions.every(q =>
    q && text(q.prompt) && Array.isArray(q.options) && q.options.length >= 2 && uniqueIds(q.options) && q.options.every(o=>text(o.text)) && q.options.some(o=>o.id===q.correctId));
  if(a.type === 'match') return Array.isArray(a.pairs) && a.pairs.length >= 2 && uniqueIds(a.pairs) && a.pairs.every(p=>text(p.left)&&text(p.right));
  if(a.type === 'memory') return Array.isArray(a.pairs) && a.pairs.length >= 2 && uniqueIds(a.pairs) && a.pairs.every(p=>text(p.textA)&&text(p.textB));
  if(a.type === 'order') return Array.isArray(a.items) && a.items.length >= 2 && uniqueIds(a.items) && a.items.every(i=>text(i.text));
  if(a.type === 'sort') return Array.isArray(a.categories) && a.categories.length >= 2 && uniqueIds(a.categories) && a.categories.every(c=>text(c.name)) &&
    Array.isArray(a.items) && a.items.length >= 2 && uniqueIds(a.items) && a.items.every(i=>text(i.text)&&a.categories.some(c=>c.id===i.categoryId));
  return false;
}
export function validDocument(kind, value) {
  if (kind === 'activities') return Array.isArray(value) && uniqueIds(value) && value.every(validActivity);
  if (kind === 'attendance') return value?.version === 1 && Array.isArray(value.groups) && uniqueIds(value.groups) && value.groups.every(g =>
    typeof g.name === 'string' && Array.isArray(g.children) && uniqueIds(g.children) && g.children.every(c => typeof c.name === 'string' && (c.avatar === undefined || typeof c.avatar === 'string' && c.avatar.length <= 60000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(c.avatar))) &&
    g.days && typeof g.days === 'object' && !Array.isArray(g.days) && Object.entries(g.days).every(([day,ids]) =>
      /^\d{4}-\d{2}-\d{2}$/.test(day) && Array.isArray(ids) && ids.every(id => g.children.some(c => c.id === id))) &&
    (g.absent === undefined || (typeof g.absent === 'object' && !Array.isArray(g.absent) && Object.entries(g.absent).every(([day,ids]) =>
      /^\d{4}-\d{2}-\d{2}$/.test(day) && Array.isArray(ids) && ids.every(id => g.children.some(c => c.id === id))))));
  if (kind === 'assessments') return value?.version===1 && Array.isArray(value.entries) && uniqueIds(value.entries) && value.entries.every(validAssessment);
  if (kind === 'materials') return value?.version===1 && Array.isArray(value.items) && uniqueIds(value.items) && value.items.every(validMaterial);
  if (kind === 'calendars') return value?.version === 1 && Array.isArray(value.events) && uniqueIds(value.events) && value.events.every(e=>e.schema!==2 || validLesson(e));
  return false;
}

export class WorkspaceError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

// Account documents live only in memory. Guest documents keep their original keys.
// Saves are acknowledged only after the database accepts the expected revision.
export class WorkspaceStore {
  constructor({storage, remote = null}) {
    this.storage = storage;
    this.remote = remote;
    this.user = null;
    this.status = 'loading';
    this.documents = new Map();
    this.listeners = new Set();
    this.epoch = 0;
    this.pending = 0;
    this.tail = Promise.resolve();
    this.problem = '';
  }
  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  emit(type) { for (const listener of this.listeners) listener({type, status:this.status, user:this.user, problem:this.problem}); }
  read(kind) { return copy(this.documents.get(kind)?.payload ?? empty(kind)); }
  guest(kind) {
    let value;
    try { value = JSON.parse(this.storage.getItem(guestKeys[kind]) || 'null') ?? empty(kind); }
    catch { throw new WorkspaceError('storage', 'Datele din browser nu pot fi citite. Nu le-am înlocuit.'); }
    if (!validDocument(kind,value)) throw new WorkspaceError('storage', 'Datele din browser nu pot fi citite. Nu le-am înlocuit.');
    return value;
  }
  guestCounts() {
    return {activities:this.guest('activities').length, groups:this.guest('attendance').groups.length, events:this.guest('calendars').events.length, assessments:this.guest('assessments').entries.length, materials:this.guest('materials').items.length};
  }
  async activate(user) {
    const epoch = ++this.epoch;
    this.user = user || null;
    this.status = 'loading'; this.problem = ''; this.documents.clear(); this.emit('identity');
    try {
      const rows = user ? await this.remote.load(user.id) : Object.keys(guestKeys).map(kind => ({kind,payload:this.guest(kind),revision:0}));
      if (epoch !== this.epoch) return;
      for (const row of rows) {
        if (user && row.owner_id !== user.id) throw new WorkspaceError('owner', 'Contul nu a putut fi verificat.');
        if (!validDocument(row.kind,row.payload)) throw new WorkspaceError('data', 'Unele date salvate nu pot fi citite. Nu le-am înlocuit.');
        this.documents.set(row.kind,copy(row));
      }
      this.status = user ? 'synced' : 'guest';
    } catch (error) {
      if (epoch !== this.epoch) return;
      this.documents.clear(); this.status = 'error';
      this.problem = error instanceof WorkspaceError ? error.message : 'Nu am putut încărca datele din cont. Verifică legătura la internet și încearcă din nou.';
    }
    this.emit('loaded');
  }
  save(kind, payload) {
    if (!validDocument(kind,payload)) return Promise.reject(new WorkspaceError('data','Conținutul nu poate fi salvat în această formă.'));
    if (this.status === 'loading' || this.status === 'error') return Promise.reject(new WorkspaceError('unavailable', this.problem || 'Așteaptă încărcarea datelor.'));
    const epoch = this.epoch, user = this.user, snapshot = copy(payload);
    const expectedRevision = this.documents.get(kind)?.revision || 0;
    this.pending++;
    const operation = this.tail.then(async () => {
      if (epoch !== this.epoch) throw new WorkspaceError('identity','Contul s-a schimbat. Deschide din nou materialul.');
      // A queued stale snapshot must not replace another save from this page.
      if ((this.documents.get(kind)?.revision || 0) !== expectedRevision) throw new WorkspaceError('conflict','Datele s-au schimbat între timp. Deschide din nou materialul înainte să salvezi.');
      this.status = user ? 'saving' : 'guest'; this.problem = ''; this.emit('status');
      let row;
      try {
        if (user) row = await this.remote.save(user.id,kind,snapshot,expectedRevision);
        else {
          this.storage.setItem(guestKeys[kind],JSON.stringify(snapshot));
          row = {kind,payload:snapshot,revision:expectedRevision+1};
        }
      } catch (error) {
        if (epoch !== this.epoch) throw new WorkspaceError('identity','Contul s-a schimbat.');
        const conflict = error.code === '40001' || error.code === 'conflict';
        this.status = conflict ? 'conflict' : (user ? 'save-error' : 'guest');
        this.problem = conflict
          ? 'Există o versiune mai nouă în cont. Copiază modificările nesalvate și reîncarcă datele înainte să continui.'
          : (user ? 'Salvarea în cont nu a reușit. Modificările din formular sunt încă aici; încearcă din nou.' : 'Nu am putut salva în browser. Verifică spațiul disponibil.');
        this.emit('status');
        throw new WorkspaceError(conflict ? 'conflict' : 'save',this.problem);
      }
      if (epoch !== this.epoch || (user && row.owner_id !== user.id)) throw new WorkspaceError('identity','Contul s-a schimbat.');
      this.documents.set(kind,copy(row)); this.status = user ? 'synced' : 'guest'; this.problem = '';
      this.emit('saved');
      return copy(snapshot);
    });
    this.tail = operation.catch(() => {});
    return operation.finally(() => { this.pending--; this.emit('status'); });
  }
  async importGuest() {
    if (!this.user) throw new WorkspaceError('auth','Intră în cont înainte de import.');
    const epoch = this.epoch;
    const groupIds=new Map(), materialIds=new Map();
    for (const kind of Object.keys(guestKeys)) {
      if (epoch !== this.epoch) throw new WorkspaceError('identity','Contul s-a schimbat.');
      const local = this.guest(kind), current = this.read(kind);
      const field = documentFields[kind] || null;
      const source = field ? local[field] : local, target = field ? current[field] : current;
      let changed = false;
      for (const sourceItem of source) {
        const item=copy(sourceItem);
        if(item.groupId) item.groupId=groupIds.get(item.groupId)||item.groupId;
        if(Array.isArray(item.materialIds))item.materialIds=item.materialIds.map(id=>materialIds.get(id)||id);
        const existing = target.find(candidate => candidate.id === item.id);
        let targetId=item.id;
        if (!existing) { target.push(copy(item)); changed = true; }
        else if (JSON.stringify(existing) !== JSON.stringify(item)) {
          // Stable duplicate IDs make retries after a partial import idempotent.
          const importedId = 'local-' + item.id;
          targetId=importedId;
          if (!target.some(candidate => candidate.id === importedId)) { target.push({...copy(item),id:importedId}); changed = true; }
        }
        if(kind==='attendance')groupIds.set(sourceItem.id,targetId);
        if(kind==='materials')materialIds.set(sourceItem.id,targetId);
      }
      if (changed) await this.save(kind,current);
    }
  }
}
