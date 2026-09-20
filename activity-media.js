export const imageCatalog = [
  {id:'lion', label:'Leu', position:'0% 0%'},
  {id:'elephant', label:'Elefant', position:'100% 0%'},
  {id:'giraffe', label:'Girafă', position:'0% 80%'},
  {id:'zebra', label:'Zebră', position:'100% 80%'}
];
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function validImage(value) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  if (imageCatalog.some(image => value === 'asset:' + image.id)) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}
export function imageMarkup(value, label = '') {
  if (!validImage(value)) return '';
  const asset = imageCatalog.find(image => value === 'asset:' + image.id);
  if (asset) return `<span class="game-image animal-portrait" style="--animal-position:${asset.position}" role="img" aria-label="${escape(label || asset.label)}"></span>`;
  return `<img class="game-image external-game-image" src="${escape(value)}" alt="${escape(label)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" />`;
}
export function imageField(value = '', field = 'image', label = 'Imagine') {
  const asset=imageCatalog.some(a=>value==='asset:'+a.id);
  return `<div class="field image-field"><input type="hidden" data-field="${field}" value="${escape(value)}" /><label>${escape(label)}<select data-image-choice><option value="">Alege o imagine</option>${imageCatalog.map(a=>`<option value="asset:${a.id}" ${value==='asset:'+a.id?'selected':''}>${a.label}</option>`).join('')}<option value="url" ${value&&!asset?'selected':''}>Dintr-un link</option></select></label><label class="image-url-field" ${asset||!value?'hidden':''}>Link direct către imagine<input data-image-url type="url" value="${asset?'':escape(value)}" placeholder="https://…/fluture.jpg" maxlength="2048" /></label><span class="image-field-preview">${imageMarkup(value)}</span></div>`;
}
// Failed external links leave their text labels available; no third-party search or tracking API.
document.addEventListener('error', event => {
  if (event.target.matches?.('.external-game-image')) {
    const fallback = document.createElement('span'); fallback.className = 'game-image image-unavailable';
    fallback.textContent = event.target.alt || 'Imagine indisponibilă'; event.target.replaceWith(fallback);
  }
}, true);
function updateImage(event) {
  const node=event.target.closest?.('.image-field');if(!node)return;
  const choice=node.querySelector('[data-image-choice]').value;
  const urlField=node.querySelector('.image-url-field');urlField.hidden=choice!=='url';
  const value=choice==='url'?node.querySelector('[data-image-url]').value.trim():choice;
  node.querySelector('input[type="hidden"]').value=value;
  if(event.type==='change')node.querySelector('.image-field-preview').innerHTML=imageMarkup(value);
}
document.addEventListener('change',updateImage);
document.addEventListener('input',updateImage);
