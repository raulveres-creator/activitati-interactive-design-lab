import {experienceCopy as copy} from './experience-copy.js';
import {moving} from './scene-controls.js';
import './mini-workshop.js';
const finePointer = matchMedia('(hover:hover) and (pointer:fine)');
document.querySelectorAll('[data-copy]').forEach(node => { node.textContent = copy[node.dataset.copy]; });

const card = document.getElementById('discovery-card');
let tiltFrame = 0;
function resetTilt() {
  if (!card) return;
  cancelAnimationFrame(tiltFrame); tiltFrame = 0;
  card.style.removeProperty('--tilt-x'); card.style.removeProperty('--tilt-y');
}
card.addEventListener('pointermove',event => {
  if (!moving() || !finePointer.matches || tiltFrame) return;
  const {clientX,clientY} = event;
  tiltFrame = requestAnimationFrame(() => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--tilt-x',`${Math.max(-3,Math.min(3,((clientY-rect.top)/rect.height-.5)*-6))}deg`);
    card.style.setProperty('--tilt-y',`${Math.max(-3,Math.min(3,((clientX-rect.left)/rect.width-.5)*6))}deg`);
    tiltFrame = 0;
  });
},{passive:true});
card.addEventListener('pointerleave', resetTilt);
window.addEventListener('blur', resetTilt);

document.addEventListener('atelier-motion-change',resetTilt);
