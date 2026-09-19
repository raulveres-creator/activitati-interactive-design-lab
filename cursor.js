// Decorative only: no captured input, preventDefault, or continuous pointer loop.
const root = document.documentElement;
const mouse = matchMedia('(pointer:fine) and (hover:hover) and (forced-colors:none)');
const reducedMotion = matchMedia('(prefers-reduced-motion:reduce)');
const flashes = new Set();

function updateCursor() {
  if (!mouse.matches) { delete root.dataset.studioCursor; return; }
  const theme = getComputedStyle(root);
  const accent = theme.getPropertyValue('--green').trim() || '#38624d';
  const surface = theme.getPropertyValue('--white').trim() || '#fffefa';
  const cursor = active => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M5 3L6 24L11.5 18.5L16 28L20 26L15.5 17L24 16Z" fill="${active ? accent : surface}" stroke="${active ? surface : accent}" stroke-width="1.7" stroke-linejoin="round"/><circle cx="25" cy="6" r="${active ? 3 : 2}" fill="${accent}" stroke="${surface}" stroke-width="1"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 5 3`;
  };
  root.style.setProperty('--studio-cursor', cursor(false));
  root.style.setProperty('--studio-pointer', cursor(true));
  root.dataset.studioCursor = '';
}

function clearFlashes() {
  for (const flash of flashes) flash.remove();
  flashes.clear();
}

document.addEventListener('pointerdown', event => {
  if (!mouse.matches || event.pointerType !== 'mouse' || event.button !== 0 || root.dataset.motion === 'off') return;
  if (flashes.size >= 6) { const oldest = flashes.values().next().value; oldest.remove(); flashes.delete(oldest); }
  const flash = document.createElement('span');
  flash.className = 'cursor-flash';
  flash.setAttribute('aria-hidden', 'true');
  // A modal dialog is in the top layer, above ordinary page overlays.
  const target = event.target instanceof Element ? event.target : null;
  const dialog = target?.closest('dialog[open]');
  if (dialog) {
    // Absolute coordinates remain correct inside the animated top-layer dialog.
    const rect = dialog.getBoundingClientRect();
    flash.style.position = 'absolute';
    flash.style.left = `${(event.clientX - rect.left) * dialog.offsetWidth / rect.width + dialog.scrollLeft}px`;
    flash.style.top = `${(event.clientY - rect.top) * dialog.offsetHeight / rect.height + dialog.scrollTop}px`;
  } else {
    flash.style.left = `${event.clientX}px`; flash.style.top = `${event.clientY}px`;
  }
  (dialog || document.body).append(flash);
  flashes.add(flash);
  setTimeout(() => { flash.remove(); flashes.delete(flash); }, reducedMotion.matches ? 160 : 680);
}, {passive:true, capture:true});

new MutationObserver(updateCursor).observe(root, {attributes:true, attributeFilter:['data-mode','data-palette','data-theme']});
mouse.addEventListener('change', updateCursor);
window.addEventListener('blur', clearFlashes);
document.addEventListener('visibilitychange', () => { if (document.hidden) clearFlashes(); });
updateCursor();
