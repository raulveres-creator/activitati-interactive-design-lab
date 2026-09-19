import {workspace, ready} from './account.js';
import {applyTranslations, language, t} from './i18n.js';
await ready;

(() => {
  document.querySelectorAll('[data-icon]').forEach(node => { node.innerHTML = window.atelierArt.icon(node.dataset.icon); });
  const bannerArt = document.getElementById('banner-art');
  if (bannerArt) bannerArt.innerHTML = window.atelierArt.hero;
  const today = new Date();
  const time = document.getElementById('today-label');
  time.dateTime = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
  const locale = {ro:'ro-RO',en:'en-GB',hu:'hu-HU',it:'it-IT',es:'es-ES',fr:'fr-FR'}[language] || 'ro-RO';
  time.textContent = new Intl.DateTimeFormat(locale, {weekday:'long',day:'numeric',month:'long'}).format(today);
  const summary = document.getElementById('arrival-summary');
  function refreshArrival() {
    try {
      const groups = workspace.read('attendance').groups;
    summary.textContent=t('Un bun venit pentru fiecare copil.');
    if(Array.isArray(groups) && groups.length) summary.textContent = groups.length === 1 ? t('Grupa ta este pregătită pentru o nouă zi.') : `${groups.length} ${t('grupe pregătite pentru o nouă zi.')}`;
    } catch { /* Attendance page provides recovery feedback for unavailable storage. */ }
  }
  refreshArrival();
  applyTranslations();
  workspace.subscribe(refreshArrival);
  const nav = [...document.querySelectorAll('.nav-item[data-section]')];
  function highlightNavigation() {
    let active = nav[0];
    for(const link of nav) {
      const section = document.getElementById(link.dataset.section);
      if(section && section.getBoundingClientRect().top < 170) active = link;
    }
    nav.forEach(link => {
      link.classList.toggle('active', link===active);
      if(link===active) link.setAttribute('aria-current','location'); else link.removeAttribute('aria-current');
    });
  }
  let pending = false;
  window.addEventListener('scroll',()=>{
    if(pending) return;
    pending = true;
    requestAnimationFrame(()=>{highlightNavigation();pending=false;});
  }, {passive:true});
  highlightNavigation();
})();
