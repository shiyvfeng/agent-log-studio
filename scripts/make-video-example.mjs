// The CLI and workbench share the example presets, preparation and export API.
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {readCSV} from '../src/model.js';
import {getVideoExample} from '../src/video-examples.js';
import {baseURL} from './test-support.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
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

export async function makeVideoExample(id){
  const example=getVideoExample(id),{settings,source,fps}=example;
  const output=path.join(root,'output/examples',id);
  const csv=await readFile(path.join(root,'public',example.file.replace(/^\//,'')),'utf8');
  const rows=readCSV(csv),duration=(example.composition.sourceEnd-example.composition.sourceStart)/settings.speed;
  await mkdir(output,{recursive:true});
  if(process.argv.includes('--compose-only'))console.log('The shared web export now regenerates the complete composition.');
  const health=await api('/api/health');
  if(!health.composition||!health.browser||!health.encoder)throw Error('Start the latest Agent Log Studio server with Chrome and FFmpeg before exporting.');
  const asset=await api(`/api/media/examples/${id}`,{method:'POST'});
  const media=await wait(`/api/media/${asset.id}`,'ready');
  const composition={...example.composition,mediaId:media.id};
  const job=await api('/api/exports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rows,settings,composition,format:'mp4',fps,start:0,duration})});
  const complete=await wait(`/api/exports/${job.id}`,'done');
  const response=await fetch(`${baseURL}/api/exports/${job.id}/download`);
  if(!response.ok)throw Error('Cannot download the exported example.');
  const finalPath=path.join(output,`${id}.mp4`);
  await writeFile(finalPath,Buffer.from(await response.arrayBuffer()));
  await writeFile(path.join(output,`${id}.csv`),csv);
  await writeFile(path.join(output,'settings.json'),JSON.stringify(settings,null,2)+'\n');
  await writeFile(path.join(output,'source.json'),JSON.stringify(source,null,2)+'\n');
  await writeFile(path.join(output,'verification.json'),JSON.stringify({source,media,rows:rows.length,composition,job:complete,fps,duration},null,2)+'\n');
  console.log(`Created ${finalPath} (${duration}s, ${fps} fps, ${settings.width}×${settings.height}).`);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  await makeVideoExample(process.argv[2]||'cat-vla');
}
