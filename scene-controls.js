import {experienceCopy as copy} from './experience-copy.js';
import {applyAppearance} from './account.js';

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion:reduce)');
let sound = false; // Sound always needs an explicit gesture in this visit.
let audioContext;
export const moving = () => !reduced.matches;

const icons = {
  sound:'<path d="M11 4 6 8H3v8h3l5 4V4Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  theme:'<path d="M20 15A8 8 0 0 1 9 4a8 8 0 1 0 11 11Z"/>'
};
const controls = document.getElementById('experience-controls');
for (const kind of ['sound','theme']) {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'experience-control'; button.id = `experience-${kind}`;
  button.setAttribute('aria-label',copy[kind]); button.title = copy[kind];
  button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[kind]}</svg>`;
  controls.append(button);
}
const soundButton = document.getElementById('experience-sound');
const themeButton = document.getElementById('experience-theme');
soundButton.setAttribute('aria-pressed','false');
function updateMotion() {
  root.dataset.motion = moving() ? 'on' : 'off';
  document.dispatchEvent(new Event('atelier-motion-change'));
}
reduced.addEventListener('change', updateMotion);
themeButton.addEventListener('click',() => applyAppearance(root.dataset.mode === 'dark' ? 'light' : 'dark', root.dataset.palette || 'sage'));

export function chime(success = false) {
  if (!sound || !audioContext || document.hidden) return;
  const now = audioContext.currentTime;
  for (const [i, frequency] of (success ? [523.25,659.25,783.99] : [440]).entries()) {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = frequency;
    const start = now + i * .075;
    gain.gain.setValueAtTime(0,start);
    gain.gain.linearRampToValueAtTime(.025,start + .012);
    gain.gain.exponentialRampToValueAtTime(.001,start + .17);
    oscillator.connect(gain); gain.connect(audioContext.destination);
    oscillator.start(start); oscillator.stop(start + .18);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
}
soundButton.addEventListener('click', async () => {
  try {
    if (!audioContext) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      audioContext = new Audio();
    }
    sound = !sound;
    soundButton.setAttribute('aria-pressed',String(sound));
    if (sound) { await audioContext.resume(); chime(true); }
    else await audioContext.suspend();
  } catch { sound = false; soundButton.setAttribute('aria-pressed','false'); }
});
document.addEventListener('click', event => {
  if (event.target.closest('button,a[href]') && !event.target.closest('.animal-choice,#experience-sound')) chime();
});

updateMotion();
