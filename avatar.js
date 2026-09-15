export function editAvatar(file) {
  return new Promise(async (resolve, reject) => {
    if (!['image/jpeg','image/png'].includes(file.type) || file.size > 8*1024*1024) { reject(new Error('Alege o imagine JPG sau PNG de maximum 8 MB.')); return; }
    const url = URL.createObjectURL(file);
    const photo = new Image();
    try { photo.src=url; await photo.decode(); } catch { URL.revokeObjectURL(url); reject(new Error('Imaginea nu poate fi citită.')); return; }
    const dialog=document.createElement('dialog'); dialog.className='account-dialog avatar-editor';
    dialog.innerHTML='<h2>Avatarul copilului</h2><p>Centrează fața cu glisoarele. Se salvează doar decupajul mic, nu fotografia originală.</p><canvas width="256" height="256" aria-label="Previzualizare avatar"></canvas><label>Zoom<input data-crop="zoom" type="range" min="1" max="4" step="0.01" value="1"></label><label>Stânga / dreapta<input data-crop="x" type="range" min="0" max="1" step="0.01" value="0.5"></label><label>Sus / jos<input data-crop="y" type="range" min="0" max="1" step="0.01" value="0.5"></label><p>Fundalul rămâne în interiorul cercului.</p><div class="avatar-actions"><button class="button button-soft" data-cancel>Anulează</button><button class="button button-primary" data-save>Salvează avatarul</button></div>';
    document.body.append(dialog);
    const canvas=dialog.querySelector('canvas'), ctx=canvas.getContext('2d');
    const value=id=>Number(dialog.querySelector('[data-crop="'+id+'"]').value);
    function draw(){ const size=Math.min(photo.width,photo.height)/value('zoom'); ctx.clearRect(0,0,256,256);ctx.drawImage(photo,(photo.width-size)*value('x'),(photo.height-size)*value('y'),size,size,0,0,256,256); }
    function finish(result){ dialog.close();dialog.remove();URL.revokeObjectURL(url);resolve(result); }
    dialog.addEventListener('input',draw);dialog.addEventListener('cancel',event=>{event.preventDefault();finish(null);});
    dialog.querySelector('[data-cancel]').onclick=()=>finish(null);
    dialog.querySelector('[data-save]').onclick=()=>{ const output=document.createElement('canvas');output.width=192;output.height=192;output.getContext('2d').drawImage(canvas,0,0,192,192);const data=output.toDataURL('image/jpeg',.72);if(data.length>60000){reject(new Error('Imaginea este prea complexă. Încearcă alt decupaj.'));finish(null);}else finish(data); };
    draw();dialog.showModal();
  });
}
