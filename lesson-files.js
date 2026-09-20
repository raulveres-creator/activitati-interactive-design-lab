import {fileAccess,workspace} from './account.js';
import {backendConfig} from './backend-config.js';

export const fileTypes = {
  pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',txt:'text/plain',
  doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  odt:'application/vnd.oasis.opendocument.text',odp:'application/vnd.oasis.opendocument.presentation',mp3:'audio/mpeg',mp4:'video/mp4'
};
export const acceptedFiles = Object.keys(fileTypes).map(ext=>'.'+ext).join(',');
function endpoint(path) {return backendConfig.supabaseUrl.replace(/\/$/,'')+'/storage/v1/object/lesson-materials/'+path.split('/').map(encodeURIComponent).join('/');}
function current(access) {if(workspace.epoch!==access.epoch || workspace.user?.id!==access.owner)throw new Error('Contul s-a schimbat. Redeschide materialele.');}
export async function uploadLessonFile(file) {
  const ext=file.name.split('.').pop().toLowerCase();
  if(!Object.hasOwn(fileTypes,ext))throw new Error('Alege PDF, document Office, imagine, TXT, MP3 sau MP4.');
  if(!file.size || file.size>20971520)throw new Error('Fișierul trebuie să aibă între 1 octet și 20 MB.');
  const access=await fileAccess(),path=`${access.owner}/${crypto.randomUUID()}.${ext}`;
  const response=await fetch(endpoint(path),{method:'POST',headers:{...access.headers,'Content-Type':fileTypes[ext],'x-upsert':'false'},body:file,signal:AbortSignal.timeout(120000)});
  if(!response.ok)throw new Error('Fișierul nu a putut fi încărcat. Verifică legătura la internet și încearcă din nou.');
  current(access);
  return {type:'file',path,name:file.name.slice(0,200),size:file.size};
}
export async function downloadLessonFile(item) {
  const access=await fileAccess();
  if(!item.path.startsWith(access.owner+'/'))throw new Error('Fișierul nu aparține acestui cont.');
  const response=await fetch(endpoint(item.path),{headers:access.headers,cache:'no-store',signal:AbortSignal.timeout(120000)});
  if(!response.ok)throw new Error('Fișierul nu poate fi descărcat acum. Încearcă din nou.');
  const blob=await response.blob();current(access);
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=item.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
