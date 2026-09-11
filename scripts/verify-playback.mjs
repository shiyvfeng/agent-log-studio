import {chromium} from 'playwright-core';
import {baseURL,executablePath} from './test-support.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath,headless:true});
try {
 const page=await browser.newPage({viewport:{width:1366,height:768}});
 await page.goto(baseURL);await page.waitForSelector('.log-row');
 const position=()=>page.locator('#play svg:visible').boundingBox();
 const time=async()=>Number(await page.locator('#scrubber').inputValue());
 for(const delay of [120,250,50]){
  await page.locator('#play').click();const started=await time();await page.waitForFunction(start=>Number(document.querySelector('#scrubber').value)>start,started,{timeout:5000});assert.ok(await time()>started,'play advances the timeline');
  const svg=await position();await page.mouse.move(svg.x+svg.width/3,svg.y+svg.height/2);await page.mouse.down();await page.waitForTimeout(delay);await page.mouse.up();
  const paused=await time();const pixels=await page.locator('#preview').evaluate(c=>c.toDataURL());await page.waitForTimeout(450);
  assert.equal(await time(),paused,`pause must stop after a ${delay} ms pointer click on the icon`);
  assert.equal(await page.locator('#preview').evaluate(c=>c.toDataURL()),pixels,'paused loading and shimmer stay still');
  console.log(`Pause/resume passed: ${delay} ms pointer press`);
 }
 await page.locator('#play').focus();await page.keyboard.press('Space');const started=await time();await page.waitForFunction(start=>Number(document.querySelector('#scrubber').value)>start,started,{timeout:5000});assert.ok(await time()>started);await page.keyboard.press('Space');const paused=await time();await page.waitForTimeout(200);assert.equal(await time(),paused);console.log('Keyboard play/pause passed');
 await page.evaluate(()=>document.querySelector('#previewPanel').requestFullscreen=()=>Promise.reject(new Error('embedded browser')));await page.locator('#previewFullscreen').click();await page.locator('#play').click();await page.waitForTimeout(120);const svg=await position();await page.mouse.click(svg.x+svg.width/3,svg.y+svg.height/2,{delay:120});const focusedPaused=await time();await page.waitForTimeout(200);assert.equal(await time(),focusedPaused);console.log('Expanded preview pause passed');
}finally{await browser.close();}
