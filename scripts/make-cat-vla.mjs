// The CLI and the web workbench use the same media preparation and export API.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {readCSV} from '../src/model.js';
import {catVLASource,catVLASettings,catVLAComposition} from '../src/cat-vla.js';
import {baseURL} from './test-support.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'output/examples/cat-vla');
const csv=await readFile(path.join(root,'public/samples/cat-vla.csv'),'utf8');
const rows=readCSV(csv),fps=30,duration=catVLAComposition.sourceEnd;
await mkdir(output,{recursive:true});
if(process.argv.includes('--compose-only'))console.log('The shared web export now regenerates the complete composition.');
async function api(route,options){
  const response=await fetch(baseURL+route,options),data=await response.json();
  if(!response.ok)throw Error(data.error||'Export service unavailable');return data;
}
async function wait(route,ready){
  const deadline=Date.now()+15*60*1000;let last=-10;
  while(Date.now()<deadline){
    const item=await api(route);
    if(item.progress>=last+10){console.log(`${item.message} (${item.progress}%)`);last=item.progress;}
    if(item.status===ready)return item;if(['error','cancelled'].includes(item.status))throw Error(item.message);
    await new Promise(resolve=>setTimeout(resolve,700));
  }
  await api(route,{method:'DELETE'});throw Error('Example export timed out and was cancelled.');
}
const health=await api('/api/health');
if(!health.composition||!health.browser||!health.encoder)throw Error('Start the latest Agent Log Studio server with Chrome and FFmpeg before exporting.');
const asset=await api('/api/media/examples/cat-vla',{method:'POST'});
const media=await wait(`/api/media/${asset.id}`,'ready');
const composition={...catVLAComposition,mediaId:media.id};
const job=await api('/api/exports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rows,settings:catVLASettings,composition,format:'mp4',fps,start:0,duration})});
const complete=await wait(`/api/exports/${job.id}`,'done');
const response=await fetch(`${baseURL}/api/exports/${job.id}/download`);
if(!response.ok)throw Error('Cannot download the exported example.');
const finalPath=path.join(output,'cat-vla.mp4');
await writeFile(finalPath,Buffer.from(await response.arrayBuffer()));
await writeFile(path.join(output,'cat-vla.csv'),csv);
await writeFile(path.join(output,'settings.json'),JSON.stringify(catVLASettings,null,2)+'\n');
await writeFile(path.join(output,'source.json'),JSON.stringify(catVLASource,null,2)+'\n');
await writeFile(path.join(output,'verification.json'),JSON.stringify({source:catVLASource,media,rows:rows.length,composition,job:complete,fps,duration},null,2)+'\n');
console.log(`Created ${finalPath} (${duration}s, ${fps} fps, 1920×1080).`);
