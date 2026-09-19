import {experienceCopy as copy} from './experience-copy.js';
import {moving,chime} from './scene-controls.js';
const finePointer = matchMedia('(hover:hover) and (pointer:fine)');
document.querySelectorAll('[data-copy]').forEach(node => { node.textContent = copy[node.dataset.copy]; });

const card = document.getElementById('discovery-card');
const grid = document.getElementById('animal-grid');
const question = document.getElementById('discovery-question');
const feedback = document.getElementById('discovery-feedback');
const progress = document.getElementById('discovery-progress');
const counter = document.getElementById('discovery-counter');
const next = document.getElementById('quiz-next');
let questionIndex = 0;
let answered = false;
const answers = [1,3,2];
const positions = ['0% 0%','100% 0%','0% 80%','100% 80%'];
const animalButtons = copy.animals.map((name,index) => {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'animal-choice'; button.dataset.animal = String(index);
  const portrait = document.createElement('span'); portrait.className = 'animal-portrait';
  portrait.setAttribute('aria-hidden','true'); portrait.style.setProperty('--animal-position',positions[index]);
  const label = document.createElement('span'); label.className = 'animal-name'; label.textContent = name;
  button.append(portrait,label); grid.append(button);
  button.addEventListener('click',() => {
    if (answered) return;
    animalButtons.forEach(item => { delete item.dataset.result; });
    if (index !== answers[questionIndex]) {
      button.dataset.result = 'wrong'; feedback.textContent = copy.wrong; chime(); return;
    }
    answered = true; button.dataset.result = 'correct';
    animalButtons.forEach(item => item.setAttribute('aria-disabled','true'));
    progress.value = questionIndex + 1;
    feedback.textContent = questionIndex === 2 ? copy.complete : copy.correct;
    next.hidden = false; next.textContent = questionIndex === 2 ? copy.replay : copy.next;
    card.dataset.complete = String(questionIndex === 2);
    chime(true); celebrate();
  });
  return button;
});
function renderQuestion() {
  answered = false;
  question.textContent = copy.questions[questionIndex];
  counter.textContent = `0${questionIndex + 1} / 03`;
  progress.value = questionIndex;
  feedback.textContent = copy.hint;
  next.hidden = true;
  delete card.dataset.complete;
  animalButtons.forEach(button => { delete button.dataset.result; button.removeAttribute('aria-disabled'); });
}
next.addEventListener('click',() => {
  questionIndex = (questionIndex + 1) % 3;
  renderQuestion();
  // Announce the changed question, then leave focus on the first answer.
  feedback.textContent = `${copy.questions[questionIndex]} ${copy.hint}`;
  animalButtons[0].focus({preventScroll:true});
});
function celebrate() {
  if (!moving()) return;
  for (let i=0;i<12;i++) {
    const spark = document.createElement('i'); spark.className = 'quiz-spark'; spark.setAttribute('aria-hidden','true');
    const angle = i * Math.PI / 6;
    spark.style.setProperty('--spark-x',`${Math.cos(angle)*130}px`);
    spark.style.setProperty('--spark-y',`${Math.sin(angle)*120}px`);
    spark.style.setProperty('--spark-color',['var(--scene-cyan)','var(--scene-violet)','var(--scene-blue)'][i%3]);
    card.append(spark); setTimeout(() => spark.remove(),850);
  }
}
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
renderQuestion();
document.addEventListener('atelier-motion-change',resetTilt);
