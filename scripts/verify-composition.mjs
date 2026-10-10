import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright-core';
import ffmpeg from 'ffmpeg-static';
import {baseURL,executablePath} from './test-support.mjs';
import {STORAGE_KEY} from '../src/config.js';
import {compositionLayout} from '../src/composition.js';

const output='output/qa/composition';await mkdir(output,{recursive:true});
const fixture=`${output}/source.mp4`;
execFileSync(ffmpeg,['-y','-v','error','-f','lavfi','-i','testsrc2=size=640x360:rate=30','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','8','-c:v','libx264','-preset','fast','-threads','2','-pix_fmt','yuv420p','-c:a','aac',fixture]);
const browser=await chromium.launch({executablePath,headless:true});
try{
 const page=await browser.newPage({baseURL,viewport:{width:1600,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.waitForSelector('.log-row');
 await page.locator('[data-tab=composition]').click();await page.locator('#loadCatVideo').click();
 await page.waitForFunction(()=>document.querySelector('#mediaStatus').textContent.includes('25 段'),{},{timeout:120000});
 const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY);
 let saved=await state();assert.equal(saved.rows.length,44);assert.equal(saved.composition.phases.length,25);assert.equal(saved.composition.sourceEnd,45.6);
 assert.ok(saved.media.hasAudio);assert.equal(await page.locator('#exportOpen').innerText(),'导出完整视频');
 await page.locator('#scrubber').fill('4.6');
 await page.waitForFunction(()=>Math.abs(document.querySelector('#sourceVideo').currentTime-4.6)<.01&&!document.querySelector('#sourceVideo').seeking);
 const exportPage=await browser.newPage();await exportPage.goto(`${baseURL}/export.html`);await exportPage.waitForFunction(()=>window.exportReady);
 const v=compositionLayout(saved.settings.width,saved.settings.height,saved.media).video;
 const preview=await page.locator('#preview').evaluate((canvas,v)=>{const copy=document.createElement('canvas');copy.width=canvas.width;copy.height=canvas.height;const ctx=copy.getContext('2d');ctx.drawImage(canvas,0,0);ctx.clearRect(v.x,v.y,v.width,v.height);return copy.toDataURL();},v);
 const exported=await exportPage.evaluate(({saved,v})=>{window.renderExport(saved.rows,saved.settings,4.6,'transparent',{...saved.composition,media:saved.media,fps:30});const canvas=document.getElementById('export');canvas.getContext('2d').clearRect(v.x,v.y,v.width,v.height);return canvas.toDataURL();},{saved,v});
 assert.equal(exported,preview,'preview and export share the complete UI and log pixels');
 // The ASCII header must never consume or reflow log output, even in old drafts.
 const logoLayouts=[[1920,1080],[1280,720],[1080,1920],[1080,1080],[320,240]].map(([width,height])=>({width,height,...compositionLayout(width,height,saved.media)}));
 const logoChecks=await exportPage.evaluate(({saved,layouts})=>layouts.map(layout=>{
  const settings={...saved.settings,width:layout.width,height:layout.height},canvas=document.getElementById('export');
  const logPixels=()=>{
   const copy=document.createElement('canvas');copy.width=layout.log.width;copy.height=layout.log.height;
   copy.getContext('2d').drawImage(canvas,layout.log.x,layout.log.y,copy.width,copy.height,0,0,copy.width,copy.height);return copy.toDataURL();
  };
  const composition={...saved.composition,media:saved.media};
  const withLogo=window.renderExport(saved.rows,settings,4.6,'transparent',{...composition,showLogo:true});
  const logs=logPixels();
  const withoutLogo=window.renderExport(saved.rows,{...settings,showLogo:true},4.6,'transparent',{...composition,showLogo:false});
  const unchanged=logs===logPixels();
  window.renderExport(saved.rows,settings,4.6,'transparent',{...composition,logo:'CUSTOM ASCII\n>_ AGENT'});
  return {width:layout.width,height:layout.height,headerChanges:withLogo!==withoutLogo,unchanged,customUnchanged:logs===logPixels()};
 }),{saved,layouts:logoLayouts});
 assert.ok(logoChecks.every(check=>check.headerChanges&&check.unchanged&&check.customUnchanged),JSON.stringify(logoChecks));
 await page.screenshot({path:`${output}/web-workbench.png`});
 await page.locator('#play').click();await page.waitForFunction(()=>document.querySelector('#sourceVideo').currentTime>4.85);
 await page.locator('#play').click();assert.equal(await page.locator('#sourceVideo').evaluate(video=>video.paused),true);
 const seekResponse=await page.request.get(saved.media.url,{headers:{Range:'bytes=0-511'}});assert.equal(seekResponse.status(),206);assert.equal((await seekResponse.body()).length,512);
 async function exportVideo(name,frames,audio,preview=false){
  await page.locator('#exportOpen').click();await page.locator('#exportFPS').selectOption('24');await page.locator('#exportRange').selectOption(preview?'preview':'all');
  assert.equal(await page.locator('#exportFormat').isDisabled(),true);await page.locator('#startExport').click();
  await page.waitForSelector('#downloadVideo:not(.hidden)',{timeout:120000});
  const response=await page.request.get(await page.locator('#downloadVideo').getAttribute('href'));assert.equal(response.status(),200);const file=`${output}/${name}.mp4`;await writeFile(file,await response.body());
  const info=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_entries','stream=codec_name,width,height,nb_read_frames:format=duration','-of','json',file],{encoding:'utf8'}));
  const video=info.streams.find(s=>s.codec_name==='h264');assert.equal(Number(video.nb_read_frames),frames);assert.equal(video.width,1920);assert.equal(video.height,1080);assert.equal(info.streams.some(s=>s.codec_name==='aac'),audio);
  await page.locator('[data-close=exportDialog]').click();return info;
 }
 await page.locator('#scrubber').fill('0');const catExport=await exportVideo('cat-preview',120,true,true);
 // Upload a different aspect ratio, trim, shift log timing, edit captions and persist.
 await page.locator('#videoFile').setInputFiles(fixture);await page.waitForFunction(()=>document.querySelector('#mediaStatus').textContent.startsWith('视频已就绪'),{},{timeout:120000});
 await page.locator('#sourceStart').fill('1');await page.locator('#sourceStart').dispatchEvent('change');
 await page.locator('#sourceEnd').fill('4');await page.locator('#sourceEnd').dispatchEvent('change');
 await page.locator('#logOffset').fill('.5');await page.locator('#logOffset').dispatchEvent('change');
 await page.locator('#compositionTitle').fill('前爪推理服务');await page.locator('#compositionTitle').dispatchEvent('change');
 await page.locator('[data-phase="0"]').click();await page.locator('#phaseTitle').fill('任务已绑定');await page.locator('#phaseForm button[type=submit]').click();
 await page.reload();await page.waitForSelector('.log-row');await page.waitForFunction(()=>document.querySelector('#mediaStatus').textContent.includes('已恢复'));
 saved=await state();assert.equal(saved.media.width,640);assert.equal(saved.media.height,360);assert.equal(saved.composition.sourceStart,1);assert.equal(saved.composition.sourceEnd,4);assert.equal(saved.composition.logOffset,.5);assert.equal(saved.composition.phases[0].title,'任务已绑定');assert.equal(saved.composition.credit,'');
 await page.locator('[data-tab=composition]').click();await page.locator('#keepAudio').uncheck();const silentExport=await exportVideo('trim-silent',72,false);
 await page.locator('#keepAudio').check();await page.locator('[data-tab=settings]').click();await page.locator('#speed').fill('2');await page.locator('#speed').dispatchEvent('change');const speedExport=await exportVideo('trim-speed',36,true);
 // Start a new export, then cancel it while the renderer is starting.
 await page.locator('#exportOpen').click();await page.locator('#startExport').click();await page.waitForSelector('#cancelExport:not(.hidden)');await page.locator('#cancelExport').click();
 await page.waitForFunction(()=>document.querySelector('#exportStatus').textContent.includes('已取消'),{},{timeout:30000});assert.equal(await page.locator('#downloadVideo').isVisible(),false);await page.locator('[data-close=exportDialog]').click();
 // The API rejects clip overflow and non-MP4 compositions.
 const input={rows:saved.rows,settings:saved.settings,composition:{...saved.composition,mediaId:saved.media.id},fps:24,start:0,duration:4,format:'mp4'};
 assert.equal((await page.request.post('/api/exports',{data:input})).status(),400);assert.equal((await page.request.post('/api/exports',{data:{...input,duration:1,format:'mov'}})).status(),400);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.locator('[data-tab=composition]').click();await page.screenshot({path:`${output}/mobile.png`});
 assert.deepEqual(errors,[]);
 await writeFile(`${output}/verification.json`,JSON.stringify({checks:['cat sample and HEVC preview','shared preview/export pixels','video playback and pause','range seeking','raw upload','trim and log delay','caption editing and draft restore','original audio','silent export','2x speed with audio','cancellation','invalid export ranges','mobile layout'],catExport,silentExport,speedExport,errors},null,2)+'\n');
 console.log('Passed: complete web composition, upload, timeline, captions, original audio, speed, cancellation, pixel parity and mobile layout.');
}finally{await browser.close();}
