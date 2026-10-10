import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import {APP_ID,APP_NAME,STORAGE_KEY} from '../src/config.js';
import {readCSV,writeCSV} from '../src/model.js';
import {samples} from '../src/samples.js';
import {baseURL,executablePath} from './test-support.mjs';

const output='output/qa';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath,headless:true});
try {
  const page=await browser.newPage({baseURL,viewport:{width:1440,height:960}});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
  // A namespaced draft must not read or overwrite another application's data.
  await page.addInitScript(()=>localStorage.setItem('unrelated-app-draft','preserve-me'));
  await page.goto('/');
  await page.waitForSelector('.log-row');
  assert.equal(await page.title(),APP_NAME);
  // Tabs expose the selected panel and support manual keyboard activation.
  await page.locator('[data-tab=content]').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('[data-tab=composition]').evaluate(el=>el===document.activeElement),true);
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('[data-tab=composition]').getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('#compositionTab').isVisible(),true);
  await page.keyboard.press('Home');await page.keyboard.press('Space');
  assert.equal(await page.locator('[data-tab=content]').getAttribute('aria-selected'),'true');
  const health=await (await page.request.get('/api/health')).json();
  assert.equal(health.app,APP_ID);
  assert.ok(health.browser&&health.encoder,'Chrome and FFmpeg are available');
  const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY);
  const fixtures=[];
  for(const sample of samples){
    const expected=readCSV(await readFile(`public${sample.file}`,'utf8'));
    fixtures.push(expected);
    await page.locator('#sample').selectOption(sample.id);
    await page.waitForFunction(({key,scene})=>JSON.parse(localStorage.getItem(key))?.rows[0].scene===scene,{key:STORAGE_KEY,scene:expected[0].scene});
    assert.deepEqual((await saved()).rows,expected);
  }
  // Multi-scene import, edit, scene switch and refresh use the new app storage.
  const combined=fixtures.slice(0,2).flat();
  await page.locator('#csvFile').setInputFiles({name:'agents.csv',mimeType:'text/csv',buffer:Buffer.from(writeCSV(combined))});
  await page.waitForSelector('#multiScene:not(.hidden)');
  await page.locator('.log-row').first().click();
  await page.locator('#editEn').fill('[feed] Edited request preserved.');
  await page.locator('#rowForm button[type=submit]').click();
  await page.locator('#importedScene').selectOption('workflow');
  await page.reload();
  await page.waitForSelector('.log-row');
  assert.equal((await saved()).rows[0].scene,'workflow');
  await page.locator('#importedScene').selectOption('research');
  assert.equal((await saved()).rows[0].en,'[feed] Edited request preserved.');

  await page.locator('[data-tab=settings]').click();
  await page.locator('[data-lang=both]').click();
  await page.locator('#typeHex-feed').fill('#b0a8a0');
  await page.locator('#typeHex-feed').dispatchEvent('change');
  await page.reload();
  await page.waitForSelector('.log-row');
  assert.equal((await saved()).settings.language,'both');
  assert.equal((await saved()).settings.typeColors.feed,'#b0a8a0');
  assert.equal(await page.evaluate(()=>localStorage.getItem('unrelated-app-draft')),'preserve-me');

  const downloadPromise=page.waitForEvent('download');
  await page.locator('#downloadCSV').click();
  const download=await downloadPromise;
  assert.equal(download.suggestedFilename(),`${APP_ID}-script.csv`);
  await download.saveAs(`${output}/roundtrip.csv`);
  assert.deepEqual(readCSV(await readFile(`${output}/roundtrip.csv`,'utf8')),(await saved()).rows);

  await page.locator('#scrubber').fill('4.5');
  const state=await saved();
  const preview=await page.locator('#preview').evaluate(canvas=>canvas.toDataURL().split(',')[1]);
  const exportPage=await browser.newPage();
  await exportPage.goto(`${baseURL}/export.html`);
  await exportPage.waitForFunction(()=>window.exportReady);
  assert.equal(await exportPage.evaluate(({rows,settings})=>window.renderExport(rows,settings,4.5),state),preview,'preview and export pixels match');
  await page.screenshot({path:`${output}/desktop.png`});

  await page.locator('#exportOpen').click();
  await page.locator('#exportRange').selectOption('preview');
  await page.locator('#exportFPS').selectOption('24');
  await page.locator('#startExport').click();
  await page.waitForSelector('#downloadVideo:not(.hidden)',{timeout:120000});
  const video=await page.request.get(await page.locator('#downloadVideo').getAttribute('href'));
  assert.equal(video.status(),200);
  assert.ok(video.headers()['content-disposition'].includes(`${APP_ID}-`));
  const videoPath=`${output}/preview.mp4`;
  await writeFile(videoPath,await video.body());
  const progress=execFileSync(ffmpeg,['-v','error','-i',videoPath,'-progress','pipe:1','-nostats','-f','null','-'],{encoding:'utf8',maxBuffer:5e6});
  const frames=Number([...progress.matchAll(/^frame=(\d+)/gm)].at(-1)[1]);
  assert.equal(frames,120,'5 seconds at 24 fps decodes to 120 frames');
  await page.locator('[data-close=exportDialog]').click();
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'mobile page fits viewport');
  await page.screenshot({path:`${output}/mobile.png`});
  assert.deepEqual(errors,[]);
  await writeFile(`${output}/verification.json`,JSON.stringify({app:APP_ID,samples:samples.length,frames,fps:24,seconds:5,checks:['multi-scene editing','draft persistence','CSV roundtrip','palette persistence','preview/export pixel parity','MP4 decoding','mobile layout'],errors},null,2));
  console.log('Passed: generic samples, independent drafts, multi-scene edit/reload, CSV download, palette, pixel parity, 5-second MP4 / 120 frames, mobile layout.');
} finally {await browser.close();}
