import {backendConfig} from './backend-config.js';
import {WorkspaceStore, guestKeys} from './workspace-store.js';
import {LANGUAGES, t, applyTranslations, setLanguage} from './i18n.js';

let client = null, bootError = '', busy = false, googleAvailable = false;
const configured = Boolean(backendConfig.supabaseUrl && backendConfig.supabasePublishableKey);
const storage = {getItem:key => localStorage.getItem(key), setItem:(key,value) => localStorage.setItem(key,value)};
export const workspace = new WorkspaceStore({storage});
const MODE_KEY = 'atelier.mode';
const PALETTE_KEY = 'atelier.palette';
const MODES = [
  {id:'light', label:'Lumină', hint:'clar şi aerisit'},
  {id:'dark', label:'Noapte', hint:'contrast confortabil'},
];
const PALETTES = [
  {id:'sage', label:'Sage', hint:'verde echilibrat'},
  {id:'lavender', label:'Lavandă', hint:'violet liniştit'},
  {id:'rose', label:'Roz', hint:'cald şi optimist'},
  {id:'ocean', label:'Ocean', hint:'albastru calm'},
  {id:'mint', label:'Mentă', hint:'proaspăt şi luminos'},
  {id:'sunset', label:'Apus', hint:'coral şi auriu'},
  {id:'berry', label:'Fructe de pădure', hint:'violet intens'},
  {id:'amber', label:'Chihlimbar', hint:'auriu şi energic'},
];
function currentAppearance() {
  try {
    const legacy = localStorage.getItem('atelier.theme');
    const mode = MODES.some(item => item.id === localStorage.getItem(MODE_KEY)) ? localStorage.getItem(MODE_KEY) : legacy === 'dark' ? 'dark' : 'light';
    const legacyPalette = legacy === 'aurora' ? 'ocean' : legacy && legacy !== 'light' && legacy !== 'dark' ? legacy : 'sage';
    const palette = PALETTES.some(item => item.id === localStorage.getItem(PALETTE_KEY)) ? localStorage.getItem(PALETTE_KEY) : PALETTES.some(item => item.id === legacyPalette) ? legacyPalette : 'sage';
    return {mode,palette};
  } catch { return {mode:'light',palette:'sage'}; }
}
export function applyAppearance(mode, palette, persist = true) {
  const nextMode = MODES.some(item => item.id === mode) ? mode : 'light';
  const nextPalette = PALETTES.some(item => item.id === palette) ? palette : 'sage';
  document.documentElement.dataset.mode = nextMode;
  document.documentElement.dataset.palette = nextPalette;
  document.documentElement.dataset.theme = nextMode === 'dark' ? 'dark' : nextPalette === 'sage' ? 'light' : nextPalette;
  if (persist) {
    try { localStorage.setItem(MODE_KEY, nextMode); localStorage.setItem(PALETTE_KEY, nextPalette); } catch { /* Appearance is a local preference. */ }
  }
  document.querySelectorAll('[data-mode-option]').forEach(button => {
    const selected = button.dataset.modeOption === nextMode;
    button.classList.toggle('is-selected', selected); button.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });
  document.querySelectorAll('[data-palette-option]').forEach(button => {
    const selected = button.dataset.paletteOption === nextPalette;
    button.classList.toggle('is-selected', selected); button.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });
}
const initialAppearance = currentAppearance();
applyAppearance(initialAppearance.mode, initialAppearance.palette, false);
const dialog = document.createElement('dialog');
dialog.className = 'account-dialog'; dialog.id = 'account-dialog';
dialog.setAttribute('aria-labelledby','account-title');
dialog.innerHTML = `<button class="account-close" data-account-action="close" aria-label="Închide contul">×</button>
  <div class="account-illustration" aria-hidden="true">▤</div>
  <p class="account-kicker">SPAȚIUL TĂU DE PROFESOR</p><h2 id="account-title">Ideile tale, oriunde ai nevoie.</h2>
  <p id="account-description">Intră cu Google și regăsește materialele și grupele tale pe orice dispozitiv.</p>
  <div id="account-profile" hidden><span class="account-avatar" id="account-avatar"></span><div><strong id="account-name"></strong><span id="account-email"></span></div></div>
  <section class="account-settings" aria-labelledby="account-settings-title"><div><p class="settings-kicker">PERSONALIZEAZĂ</p><h3 id="account-settings-title">Cum arată atelierul tău?</h3><p>Alege separat lumina şi paleta de culori.</p></div><div class="appearance-block"><p class="appearance-label">Mod de afişare</p><div class="mode-options" role="group" aria-label="Alege modul de afişare">${MODES.map(mode => `<button type="button" class="mode-option" data-mode-option="${mode.id}" aria-pressed="false"><span class="mode-icon mode-icon-${mode.id}" aria-hidden="true"></span><span><strong>${mode.label}</strong><small>${mode.hint}</small></span></button>`).join('')}</div></div><div class="appearance-block"><p class="appearance-label">Paleta de culori</p><div class="palette-options" role="group" aria-label="Alege paleta de culori">${PALETTES.map(palette => `<button type="button" class="palette-option" data-palette-option="${palette.id}" aria-pressed="false"><span class="palette-swatch palette-swatch-${palette.id}" aria-hidden="true"></span><span><strong>${palette.label}</strong><small>${palette.hint}</small></span></button>`).join('')}</div></div><div class="appearance-block language-block"><p class="appearance-label">Limbă</p><div class="language-options" role="group" aria-label="Alege limba">${LANGUAGES.map(item => `<button type="button" class="language-option" data-language-option="${item.id}"><span>${item.flag}</span><span>${item.label}</span></button>`).join('')}</div></div></section>
  <p id="account-feedback" role="status" aria-live="polite"></p>
  <button class="google-sign-in" data-account-action="login">Continuă cu Google <span aria-hidden="true">→</span></button>
  <div id="account-import" hidden><strong>Adu cu tine ce ai creat deja</strong><p id="account-import-count"></p><p>Se copiază în contul afișat mai sus. Datele din browser rămân disponibile.</p><button class="button button-soft" data-account-action="import">Adu în cont datele din acest browser</button></div>
  <button class="button button-soft" data-account-action="refresh" hidden>Reîncarcă datele din cont</button>
  <button class="account-sign-out" data-account-action="logout" hidden>Ieși din cont</button>
  <p class="account-small" id="account-footnote">Contul se creează la prima conectare. Copiii nu au nevoie de cont.</p>`;
document.body.append(dialog);
applyTranslations(dialog);
const settingsDialog = document.createElement('dialog');
settingsDialog.className = 'account-dialog settings-dialog'; settingsDialog.id = 'settings-dialog';
settingsDialog.setAttribute('aria-labelledby','account-settings-title');
settingsDialog.innerHTML = '<button type="button" class="account-close" data-settings-close aria-label="Închide">×</button>';
settingsDialog.append(dialog.querySelector('.account-settings'));
document.body.append(settingsDialog);
applyTranslations(settingsDialog);
export function openSettings() {
  if(dialog.open) dialog.close();
  applyTranslations(settingsDialog);
  settingsDialog.showModal(); settingsDialog.scrollTop = 0;
}
settingsDialog.addEventListener('click', event => {
  if(event.target.closest('[data-settings-close]')) { settingsDialog.close(); return; }
  const mode = event.target.closest('[data-mode-option]');
  if(mode) applyAppearance(mode.dataset.modeOption,document.documentElement.dataset.palette);
  const palette = event.target.closest('[data-palette-option]');
  if(palette) applyAppearance(document.documentElement.dataset.mode,palette.dataset.paletteOption);
  const locale = event.target.closest('[data-language-option]');
  if(locale) { setLanguage(locale.dataset.languageOption); location.reload(); }
});

const statusLabels = {loading:'Se încarcă…', guest:'Salvat în browser', synced:'Salvat în cont', saving:'Se salvează…', 'save-error':'Salvare nereușită', conflict:'Versiune nouă în cont', error:'Date indisponibile'};
function feedback(text) { dialog.querySelector('#account-feedback').textContent = text; }
function renderAccount() {
  const user = workspace.user;
  document.querySelectorAll('.account-header [data-account-open]').forEach(button => {
    const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Profesor';
    const shortName = name.split(/\s+/)[0];
    button.replaceChildren();
    if (user) {
      const avatar = document.createElement('span');
      avatar.className = 'account-trigger-avatar';
      avatar.textContent = shortName.slice(0,1).toLocaleUpperCase('ro');
      const label = document.createElement('span');
      label.className = 'account-trigger-name';
      label.textContent = shortName;
      const chevron = document.createElement('span');
      chevron.className = 'account-trigger-chevron';
      chevron.textContent = '⌄';
      chevron.setAttribute('aria-hidden','true');
      button.append(avatar,label,chevron);
    } else {
      button.textContent = t('Intră în cont');
    }
    button.setAttribute('aria-label',user ? `Deschide contul lui ${name}` : 'Intră în cont cu Google');
  });
  document.querySelectorAll('[data-storage-status]').forEach(node => {
    node.textContent = t(statusLabels[workspace.status] || 'Salvat în browser');
    node.dataset.state = workspace.status;
  });
  document.querySelectorAll('[data-storage-description]').forEach(node => {
    node.textContent = user ? t('Materiale private în contul tău') : t('Materiale salvate în acest browser');
  });
  dialog.querySelector('#account-title').textContent = t(user ? 'Bine ai venit în atelierul tău.' : 'Ideile tale, oriunde ai nevoie.');
  dialog.querySelector('#account-description').textContent = t(user ? 'Materialele și grupele sunt legate de acest cont.' : 'Intră cu Google și regăsește materialele și grupele tale pe orice dispozitiv.');
  dialog.querySelector('#account-profile').hidden = !user;
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Profesor';
  dialog.querySelector('#account-name').textContent = name;
  dialog.querySelector('#account-email').textContent = user?.email || '';
  dialog.querySelector('#account-avatar').textContent = name.slice(0,1).toLocaleUpperCase('ro');
  dialog.querySelector('[data-account-action="login"]').hidden = !!user;
  dialog.querySelector('[data-account-action="login"]').disabled = !client || !googleAvailable || busy || workspace.status === 'loading';
  dialog.querySelector('[data-account-action="logout"]').hidden = !user;
  dialog.querySelector('[data-account-action="refresh"]').hidden = !user;
  dialog.querySelector('#account-footnote').textContent = t(user ? 'Pe un dispozitiv comun, ieși din cont când ai terminat.' : 'Contul se creează la prima conectare. Copiii nu au nevoie de cont.');
  let counts = null;
  try { counts = workspace.guestCounts(); } catch { /* Import stays unavailable; original data is preserved. */ }
  dialog.querySelector('#account-import').hidden = !user || !counts || !Object.values(counts).some(Boolean);
  if (counts) dialog.querySelector('#account-import-count').textContent = `${counts.activities} activități · ${counts.groups} grupe · ${counts.events} evenimente salvate în acest browser.`;
  dialog.querySelectorAll('[data-account-action="logout"],[data-account-action="import"],[data-account-action="refresh"]').forEach(button => {
    button.disabled = busy || workspace.pending > 0 || workspace.status === 'loading';
  });
  const notice = document.getElementById('account-sync-notice');
  if (notice) { notice.hidden = !workspace.problem; notice.querySelector('span').textContent = workspace.problem; }
  if (bootError || workspace.problem) feedback(bootError || workspace.problem);
  else if (!configured || !googleAvailable) feedback(t('Conectarea cu Google este în pregătire. Poți continua să lucrezi în browser.'));
  applyAppearance(document.documentElement.dataset.mode || initialAppearance.mode, document.documentElement.dataset.palette || initialAppearance.palette, false);
  applyTranslations(dialog);
}
workspace.subscribe(renderAccount);
document.addEventListener('click', event => {
  if (event.target.closest('[data-account-open]')) { renderAccount(); dialog.showModal(); dialog.scrollTop = 0; }
});
dialog.addEventListener('click', async event => {
  const button = event.target.closest('[data-account-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.accountAction;
  if (action === 'close') { dialog.close(); return; }
  busy = true; feedback(''); renderAccount();
  try {
    if (action === 'login') {
      if (!client || !googleAvailable) return;
      sessionStorage.setItem('teacher.auth-return',location.pathname.endsWith('/prezenta.html') ? 'prezenta.html' : '');
      const {error} = await client.auth.signInWithOAuth({provider:'google',options:{
        redirectTo:new URL('./',location.href).href,
        queryParams:{prompt:'select_account'},
      }});
      if (error) throw error;
    }
    if (action === 'logout') {
      const {error} = await client.auth.signOut({scope:'local'});
      if (error) throw error;
      await workspace.activate(null); dialog.close();
    }
    if (action === 'import') {
      await workspace.importGuest();
      feedback('Datele au fost aduse în cont. Copia din browser este păstrată.');
    }
    if (action === 'refresh') {
      await workspace.activate(workspace.user);
      feedback(workspace.problem || 'Datele din cont sunt actualizate.');
    }
  } catch (error) {
    feedback(error.code && ['save','conflict','identity','storage','unavailable'].includes(error.code) ? error.message : 'Nu am putut finaliza operațiunea. Încearcă din nou.');
  } finally { busy = false; renderAccount(); }
});
window.addEventListener('beforeunload', event => {
  if (workspace.pending) { event.preventDefault(); event.returnValue = ''; }
});
// Guest tabs refresh only when no editor is open. Account data never enters guest storage.
window.addEventListener('storage', event => {
  if (!workspace.user && Object.values(guestKeys).includes(event.key) && !workspace.pending && !document.querySelector('#modal-backdrop:not([hidden])')) workspace.activate(null);
});

async function initialize() {
  if (!configured) { await workspace.activate(null); renderAccount(); return; }
  try {
    const url = new URL(backendConfig.supabaseUrl);
    const key = backendConfig.supabasePublishableKey;
    let allowedKey = key.startsWith('sb_publishable_');
    if (key.startsWith('eyJ')) {
      try { const body = key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'); allowedKey = JSON.parse(atob(body)).role === 'anon'; } catch { /* Reject invalid keys. */ }
    }
    if (url.protocol !== 'https:' || !allowedKey) throw new Error('Invalid public configuration');
    const {createClient} = await import('./vendor/supabase.js');
    client = createClient(url.href,key,{
      auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},
      global:{fetch:(input,init = {}) => fetch(input,{...init,signal:AbortSignal.any([...(init.signal ? [init.signal] : []),AbortSignal.timeout(15000)])})},
    });
    workspace.remote = {
      async load(owner) {
        const {data,error} = await client.from('teacher_documents').select('owner_id,kind,payload,revision,updated_at').eq('owner_id',owner);
        if (error) throw error;
        return data;
      },
      async save(owner,kind,payload,revision) {
        const {data:sessionData,error:sessionError} = await client.auth.getSession();
        if(sessionError || sessionData.session?.user.id !== owner) throw new Error('Session changed');
        // Pin this request to the identity that edited the document, even if another tab signs in.
        const {data,error} = await client.rpc('save_teacher_document',{p_kind:kind,p_payload:payload,p_expected_revision:revision})
          .setHeader('Authorization','Bearer ' + sessionData.session.access_token);
        if (error) throw error;
        if (!data?.[0] || data[0].owner_id !== owner) throw new Error('Unexpected owner');
        return data[0];
      },
    };
    const hadCode = new URL(location.href).searchParams.has('code');
    const {data,error} = await client.auth.getSession();
    if (error) throw error;
    try {
      const providerResponse = await fetch(new URL('/auth/v1/settings',url),{
        headers:{apikey:key},signal:AbortSignal.timeout(15000),
      });
      if(!providerResponse.ok) throw new Error('Provider settings unavailable');
      googleAvailable = (await providerResponse.json()).external?.google === true;
    } catch {
      // A provider-discovery outage must not turn a signed-in workspace into guest mode.
      bootError = 'Conectarea cu Google nu este disponibilă momentan. Încearcă să reîncarci pagina.';
    }
    await workspace.activate(data.session?.user || null);
    let authEvent = 0;
    client.auth.onAuthStateChange((_event,session) => {
      const eventId = ++authEvent;
      const user = session?.user || null;
      // Do not call Supabase from inside its synchronous auth lock.
      setTimeout(() => {
        if(eventId === authEvent && user?.id !== workspace.user?.id) workspace.activate(user);
      },0);
    });
    if (hadCode) {
      const clean = new URL(location.href); clean.searchParams.delete('code');
      history.replaceState(null,'',clean.pathname + clean.search + clean.hash);
      const destination = sessionStorage.getItem('teacher.auth-return'); sessionStorage.removeItem('teacher.auth-return');
      if (data.session && destination === 'prezenta.html') location.replace(new URL('prezenta.html',location.href).href);
      else if (!data.session) { bootError = 'Conectarea nu a fost finalizată. Încearcă din nou cu Google.'; dialog.showModal(); }
    }
    const params = new URLSearchParams(location.hash.slice(1));
    if (params.has('error') || new URL(location.href).searchParams.has('error')) {
      bootError = 'Conectarea a fost anulată sau nu a putut fi finalizată. Poți încerca din nou.';
      history.replaceState(null,'',location.pathname); dialog.showModal();
    }
  } catch {
    bootError = 'Conectarea la cont nu este disponibilă momentan. Datele salvate în browser sunt păstrate.';
    client = null; await workspace.activate(null);
  }
  renderAccount();
}
export const ready = initialize();
