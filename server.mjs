import http from 'node:http';
import {APP_ID,APP_NAME,DEFAULT_PORT} from './src/config.js';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,mkdir,stat,unlink} from 'node:fs/promises';
import {createReadStream,existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import ffmpeg from 'ffmpeg-static';
import {chromium} from 'playwright-core';
import {validateRows,validateSettings,endTime} from './src/model.js';
const root=path.dirname(fileURLToPath(import.meta.url));const port=Number(process.env.PORT||DEFAULT_PORT);const origin=`http://127.0.0.1:${port}`;
const production=process.argv.includes('--production');const jobs=new Map();
const exportsDir=path.join(root,'output','exports');await mkdir(exportsDir,{recursive:true});
const browserPaths=[process.env.CHROME_PATH,'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser',process.env.LOCALAPPDATA&&path.join(process.env.LOCALAPPDATA,'Google/Chrome/Application/chrome.exe'),process.env.PROGRAMFILES&&path.join(process.env.PROGRAMFILES,'Google/Chrome/Application/chrome.exe')].filter(Boolean);
const executablePath=browserPaths.find(p=>existsSync(p));
const vite=production?null:await (await import('vite')).createServer({root,server:{middlewareMode:true,host:'127.0.0.1',hmr:{port:port+1}},appType:'mpa'});
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
async function body(req){let bytes=0;const chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>8e6)throw Error('请求过大');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString());}
async function runExport(job,input){let browser,encoder;const {rows,settings,format,fps,start,duration}=input;const total=Math.ceil(duration*fps);
 try{
  job.message='启动逐帧渲染…';browser=await chromium.launch({executablePath,headless:true,args:['--disable-background-timer-throttling']});job.browser=browser;if(job.cancelled)throw Error('cancelled');
  const page=await browser.newPage({viewport:{width:settings.width,height:settings.height},deviceScaleFactor:1});await page.goto(`${origin}/export.html`);await page.waitForFunction(()=>window.exportReady);await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(({rows,settings,format})=>{window.exportRows=rows;window.exportSettings=settings;window.exportBackground=format==='mp4'?'black':'transparent';},{rows,settings,format});
  const codecs={
    mp4:['-c:v','libx264','-crf','12','-preset','medium','-pix_fmt','yuv420p','-movflags','+faststart'],
    mov:['-c:v','prores_ks','-profile:v','4','-pix_fmt','yuva444p10le','-alpha_bits','16','-vendor','apl0'],
    webm:['-c:v','libvpx-vp9','-pix_fmt','yuva420p','-b:v','0','-crf','20','-deadline','good','-cpu-used','4','-auto-alt-ref','0']
  };
  const codec=codecs[format];
  encoder=spawn(ffmpeg,['-y','-hide_banner','-loglevel','error','-f','image2pipe','-vcodec','png','-framerate',String(fps),'-i','pipe:0','-an',...codec,'-threads','4',job.file],{stdio:['pipe','ignore','pipe']});job.encoder=encoder;
  let stderr='',failure;encoder.stderr.on('data',d=>{stderr=(stderr+d).slice(-3000);});encoder.stdin.on('error',e=>{failure=e;});
  const done=new Promise(resolve=>{encoder.on('error',e=>{failure=e;resolve(-1);});encoder.on('close',code=>resolve(code));});
  for(let i=0;i<total;i++){
    if(job.cancelled)throw Error('cancelled');if(failure)throw failure;
    const frame=await page.evaluate(t=>window.renderExport(window.exportRows,window.exportSettings,t,window.exportBackground),start+i/fps*settings.speed);
    if(!encoder.stdin.write(Buffer.from(frame,'base64')))await once(encoder.stdin,'drain');
    job.progress=Math.round((i+1)/total*96);job.message=`正在渲染 ${i+1} / ${total} 帧 · ${job.progress}%`;
  }
  encoder.stdin.end();job.message='正在封装视频…';const code=await done;if(code!==0)throw Error(stderr||`编码失败（${code}）`);if(job.cancelled)throw Error('cancelled');
  const file=await stat(job.file);job.status='done';job.progress=100;job.message=`导出完成 · ${(file.size/1024/1024).toFixed(1)} MB · ${format.toUpperCase()} · ${duration.toFixed(2)} 秒`;
 }catch(error){job.status=job.cancelled?'cancelled':'error';job.message=job.cancelled?'已取消导出':`导出失败：${error.message}`;encoder?.kill('SIGTERM');await unlink(job.file).catch(()=>{});}
 finally{await browser?.close().catch(()=>{});delete job.browser;delete job.encoder;}
}
const server=http.createServer(async(req,res)=>{
 try{
  const host=req.headers.host;if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(host))return json(res,403,{error:'仅允许本机访问'});
  if(req.headers.origin&&![origin,`http://localhost:${port}`].includes(req.headers.origin))return json(res,403,{error:'跨站请求被拒绝'});
  const url=new URL(req.url,origin);
  if(url.pathname==='/api/health')return json(res,200,{ok:true,app:APP_ID,browser:!!executablePath,encoder:!!ffmpeg&&existsSync(ffmpeg)});
  if(url.pathname==='/api/exports'&&req.method==='POST'){
    if(!req.headers['content-type']?.includes('application/json'))return json(res,415,{error:'请提交 JSON'});
    if([...jobs.values()].some(j=>j.status==='running'))return json(res,409,{error:'已有导出正在进行，请等待完成或取消'});
    if(!executablePath)throw Error('未找到 Chrome。请安装 Google Chrome，或设置 CHROME_PATH 后重启。');
    const input=await body(req);validateRows(input.rows);validateSettings(input.settings);
    if(new Set(input.rows.map(r=>r.scene)).size!==1)throw Error('每次仅导出一个场景');
    if(!['mp4','webm','mov'].includes(input.format)||![24,30,60].includes(input.fps))throw Error('导出格式或帧率无效');
    if(!Number.isFinite(input.start)||input.start<0||!Number.isFinite(input.duration)||input.duration<=0)throw Error('导出范围无效');
    if(input.start+input.duration*input.settings.speed>endTime(input.rows,input.settings)+.02)throw Error('导出范围超出脚本');
    if(input.duration>1200||Math.ceil(input.duration*input.fps)>36000)throw Error('单次导出最多 20 分钟 / 36000 帧。请先压缩长等待、提高倍率，或选择 5 秒样片。');
    const id=randomUUID();const job={id,status:'running',progress:0,message:'准备渲染…',file:path.join(exportsDir,`${APP_ID}-${id}.${input.format}`)};jobs.set(id,job);json(res,202,{id});void runExport(job,input);return;
  }
  const match=/^\/api\/exports\/([a-f0-9-]+)(\/download)?$/.exec(url.pathname);
  if(match){const job=jobs.get(match[1]);if(!job)return json(res,404,{error:'导出任务不存在'});
    if(req.method==='DELETE'){if(job.status==='running'){job.cancelled=true;job.encoder?.kill('SIGTERM');void job.browser?.close().catch(()=>{});}return json(res,200,{ok:true});}
    if(match[2]){if(job.status!=='done')return json(res,409,{error:'视频尚未完成'});const info=await stat(job.file);const contentType={'.mp4':'video/mp4','.mov':'video/quicktime','.webm':'video/webm'}[path.extname(job.file)];res.writeHead(200,{'Content-Type':contentType,'Content-Length':info.size,'Content-Disposition':`attachment; filename="${path.basename(job.file)}"`});createReadStream(job.file).pipe(res);return;}
    return json(res,200,{id:job.id,status:job.status,progress:job.progress,message:job.message});
  }
  if(url.pathname.startsWith('/api/'))return json(res,404,{error:'接口不存在'});
  if(vite){vite.middlewares(req,res,()=>{res.writeHead(404);res.end('Not found');});return;}
  const pathname=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);const file=path.resolve(root,'dist','.'+pathname);if(!file.startsWith(path.join(root,'dist')+path.sep)){res.writeHead(403);res.end();return;}
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.csv':'text/csv; charset=utf-8','.svg':'image/svg+xml'};
  const data=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(data);
 }catch(e){json(res,e.code==='ENOENT'?404:400,{error:e.message});}
});
server.listen(port,'127.0.0.1',()=>console.log(`${APP_NAME} → ${origin}\n视频导出：Chrome ${executablePath?'ready':'missing'} · FFmpeg ${ffmpeg?'ready':'missing'}`));
