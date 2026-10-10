import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright-core';
import {baseURL,executablePath} from './test-support.mjs';
import {videoExamples} from '../src/video-examples.js';
import {readCSV} from '../src/model.js';
import {compositionLayout} from '../src/composition.js';
import {STORAGE_KEY} from '../src/config.js';

const output='output/qa/video-examples';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath,headless:true});
try{
  const page=await browser.newPage({baseURL,viewport:{width:1440,height:900}}),errors=[],checks=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');await page.waitForSelector('.log-row');
  await page.locator('[data-tab=composition]').click();
  let saved;
  for(const example of videoExamples){
    await page.locator('#'+example.buttonId).click();
    await page.waitForFunction(subject=>document.querySelector('#mediaStatus').textContent.startsWith(subject+'素材、'),example.subject,{timeout:120000});
    saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY);
    const rows=readCSV(await readFile('public'+example.file,'utf8'));
    assert.deepEqual(saved.rows,rows);assert.deepEqual(saved.settings,example.settings);
    assert.deepEqual(saved.composition,example.composition);assert.equal(saved.media.status,'ready');
    assert.equal(await page.locator('#sample').inputValue(),example.id);
    assert.equal(await page.locator('#exportFPS').inputValue(),String(example.fps));
    assert.equal(await page.locator('#exportOpen').innerText(),'导出完整视频');
    assert.ok(rows.every(row=>row.time<example.composition.sourceEnd-example.composition.sourceStart));
    const time=4.6;await page.locator('#scrubber').fill(String(time));
    await page.waitForFunction(t=>Math.abs(document.querySelector('#sourceVideo').currentTime-t)<.01&&!document.querySelector('#sourceVideo').seeking,time);
    const exportPage=await browser.newPage();await exportPage.goto(baseURL+'/export.html');await exportPage.waitForFunction(()=>window.exportReady);
    const v=compositionLayout(saved.settings.width,saved.settings.height,saved.media).video;
    const preview=await page.locator('#preview').evaluate((canvas,v)=>{const copy=document.createElement('canvas');copy.width=canvas.width;copy.height=canvas.height;const ctx=copy.getContext('2d');ctx.drawImage(canvas,0,0);ctx.clearRect(v.x,v.y,v.width,v.height);return copy.toDataURL();},v);
    const exported=await exportPage.evaluate(({saved,v,time})=>{window.renderExport(saved.rows,saved.settings,time,'transparent',{...saved.composition,media:saved.media,fps:30});const canvas=document.getElementById('export');canvas.getContext('2d').clearRect(v.x,v.y,v.width,v.height);return canvas.toDataURL();},{saved,v,time});
    assert.equal(exported,preview,example.id+' preview/export pixels');await exportPage.close();
    await page.screenshot({path:output+'/'+example.id+'-workbench.png'});
    await page.locator('#play').click();await page.waitForFunction(t=>document.querySelector('#sourceVideo').currentTime>t+.2,time);
    await page.locator('#play').click();assert.equal(await page.locator('#sourceVideo').evaluate(video=>video.paused),true);
    checks.push({id:example.id,rows:rows.length,phases:saved.composition.phases.length,media:saved.media,pixelParity:true});
  }
  // The last preset also exercises download through the workbench, not just the API.
  await page.locator('#scrubber').fill('0');await page.locator('#exportOpen').click();
  await page.locator('#exportRange').selectOption('preview');await page.locator('#startExport').click();
  await page.waitForSelector('#downloadVideo:not(.hidden)',{timeout:120000});
  const response=await page.request.get(await page.locator('#downloadVideo').getAttribute('href'));
  assert.equal(response.status(),200);const file=output+'/preview.mp4';await writeFile(file,await response.body());
  const info=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_entries','stream=codec_name,width,height,nb_read_frames:format=duration','-of','json',file],{encoding:'utf8'}));
  const video=info.streams.find(stream=>stream.codec_name==='h264');
  assert.equal(Number(video.nb_read_frames),150);assert.equal(video.width,1920);assert.equal(video.height,1080);
  assert.equal(info.streams.some(stream=>stream.codec_name==='aac'),saved.media.hasAudio);
  await page.locator('[data-close=exportDialog]').click();
  await page.reload();await page.waitForFunction(()=>document.querySelector('#mediaStatus').textContent.includes('已恢复'));
  assert.equal(await page.locator('#compositionTitle').inputValue(),saved.composition.title);
  await page.locator('[data-tab=composition]').click();await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  for(const example of videoExamples){const box=await page.locator('#'+example.buttonId).boundingBox();assert.ok(box.x>=0&&box.x+box.width<=390);}
  await page.screenshot({path:output+'/mobile.png',fullPage:true});
  assert.equal((await page.request.post('/api/media/examples/not-a-preset')).status(),400);
  assert.deepEqual(errors,[]);
  await writeFile(output+'/verification.json',JSON.stringify({checks,preview:info,mobile:true,unknownPresetRejected:true,errors},null,2)+'\n');
  console.log('Passed: all video presets, playback, pixel parity, web MP4 export, draft restore and mobile example buttons.');
}finally{await browser.close();}
