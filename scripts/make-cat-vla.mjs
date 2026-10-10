// The footage and generated videos stay in ignored output/, never in source control.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdir,readFile,writeFile,rename,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {chromium} from 'playwright-core';
import {readCSV,defaults,validateSettings} from '../src/model.js';
import {baseURL,executablePath} from './test-support.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'output/examples/cat-vla');
const fps=30,duration=45.6;
const layout={
  style:'Geist',reference:'https://vercel.com/geist/brands',
  video:{x:64,y:228,width:432,height:768},
  log:{x:704,y:228,width:1152,height:768},
};
const source={
  creator:'超级无敌大开门',
  douyinAccount:'dakaimenPYQ',
  mirror:'https://github.com/Sean-Jian/xiaokaimen',
  commit:'03e34f48b85bfc32e593ab3ae58bf94f8758cc21',
  url:'https://raw.githubusercontent.com/Sean-Jian/xiaokaimen/03e34f48b85bfc32e593ab3ae58bf94f8758cc21/pictures%26audio/xiaokaimen.mp4',
  sha256:'97b4b658717419166bec11dd6405fd661ddc017ef0d5a8b69a33416040bd98a9',
  originalDuration:49.2,
  retainedRange:[0,duration],
};
const sourcePath=path.join(output,'source.mp4');
const logPath=path.join(output,'cat-vla-log.mp4');
const finalPath=path.join(output,'cat-vla.mp4');
const csv=await readFile(path.join(root,'public/samples/cat-vla.csv'),'utf8');
const rows=readCSV(csv);
const settings={...defaults,width:layout.log.width,height:layout.log.height,padding:32,mainSize:30,actionSize:26,
  language:'zh',showLogo:false,showTimestamp:false,collapse:false,tail:2,
  glowColor:'#ffffff',glowStrength:0,
  typeColors:{think:'#ededed',feed:'#a1a1a1',action:'#ededed',instruction:'#ffffff'}};
validateSettings(settings);
const hash=data=>createHash('sha256').update(data).digest('hex');
const renderKey=hash(JSON.stringify({rows,settings,fps,duration}));
const phases=[
  {time:0,title:'语言指令已入队',detail:'target=萝卜；actuator=前爪'},
  {time:1.7,title:'探索性接触：纸巾',detail:'正在验证纸巾是否也能被称为萝卜'},
  {time:3.3,title:'人类拒绝语义别名',detail:'重复指令触发策略回滚'},
  {time:4.2,title:'前爪路径重规划',detail:'回滚纸巾分支，转向橙色目标'},
  {time:4.6,title:'奖励信号已接收',detail:'真棒与食物组成多模态监督'},
  {time:8.2,title:'上下文切换：纸巾',detail:'清理萝卜缓存，重建目标索引'},
  {time:11.2,title:'推理超时，口令重发',detail:'确认不是网络重传；重新定位'},
  {time:12.1,title:'纸巾目标接触中',detail:'左侧路径生效，前爪获得读写权限'},
  {time:14.0,title:'奖励写入胃部缓存',detail:'本轮纠错样本可食用，已成功摄入'},
  {time:17.2,title:'命中萝卜目标缓存',detail:'复用已验证的橙色长条表征'},
  {time:18.8,title:'前爪执行缓存策略',detail:'萝卜接触确认；预期奖励即将返回'},
  {time:19.6,title:'奖励服务返回 200',detail:'反馈稳定，继续最大化真棒'},
  {time:22.0,title:'检测到目标迁移',detail:'人类移动萝卜；旧坐标租约失效'},
  {time:24.7,title:'启用萝卜接触预取',detail:'跟踪新坐标，提前建立前爪连接'},
  {time:26.0,title:'目标热切换：纸巾',detail:'取消萝卜预取，保留奖励会话'},
  {time:27.0,title:'多目标调度成功',detail:'纸巾事务已提交，食物完成结算'},
  {time:30.4,title:'进入萝卜熟悉领域',detail:'不加载纸巾分支，直接执行短路径'},
  {time:31.8,title:'启动胃部反向传播',detail:'食物包已接收，参数朝饱腹方向更新'},
  {time:33.3,title:'测试旋转不变表征',detail:'萝卜朝向改变，奖励语义保持不变'},
  {time:35.2,title:'复用旋转不变策略',detail:'横着竖着都能换粮，身份匹配完成'},
  {time:36.8,title:'策略持续获得奖励',detail:'奖励通道畅通，暂不支持下班'},
  {time:41.2,title:'目标切换：纸巾',detail:'连续萝卜任务结束；旧缓存待清理'},
  {time:42.8,title:'检测到缓存污染',detail:'口令为纸巾，前爪仍执行萝卜策略'},
  {time:43.4,title:'执行纸巾回退策略',detail:'失效旧缓存，前爪提交热修复'},
  {time:45.0,title:'任务闭环，开始消化',detail:'最终奖励到账；胃部接管后处理'},
].map(phase=>{
  const instruction=rows.filter(row=>row.type==='instruction'&&row.time<=phase.time).at(-1);
  const command=instruction?.zh.match(/target\s*=\s*(萝卜|纸巾)/)?.[1];
  if(!command)throw Error(`Missing target in the instruction at ${phase.time}s.`);
  return {...phase,command};
});
await mkdir(output,{recursive:true});

function run(command,args){
  return new Promise((resolve,reject)=>{
    const child=spawn(command,args,{cwd:root,stdio:['ignore','inherit','inherit']});
    child.on('error',reject);
    child.on('exit',(code,signal)=>code===0?resolve():reject(Error(`${command} failed: ${signal||code}`)));
  });
}

// curl reuses the cloud's HTTPS proxy and CA configuration. TLS verification stays enabled.
try{await stat(sourcePath);}catch(error){
  if(error.code!=='ENOENT')throw error;
  const temporary=sourcePath+'.part';
  console.log('Downloading the carrot/tissue footage from the pinned GitHub mirror.');
  await run('curl',['--fail','--location','--silent','--show-error','--max-time','60','--output',temporary,source.url]);
  if(hash(await readFile(temporary))!==source.sha256)throw Error('Source checksum mismatch; refusing to use the download.');
  await rename(temporary,sourcePath);
}
if(hash(await readFile(sourcePath))!==source.sha256)throw Error('Existing source.mp4 differs from the pinned carrot/tissue source.');
const sourceProbe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','stream=codec_type,width,height:format=duration','-of','json',sourcePath],{encoding:'utf8'}));
if(!sourceProbe.streams.some(stream=>stream.codec_type==='audio'))throw Error('The source must retain its original spoken prompts.');
if(Number(sourceProbe.format.duration)<duration)throw Error('The source is shorter than the retained example range.');
await writeFile(path.join(output,'source.json'),JSON.stringify(source,null,2)+'\n');
await writeFile(path.join(output,'settings.json'),JSON.stringify(settings,null,2)+'\n');
await writeFile(path.join(output,'cat-vla.csv'),csv);

if(process.argv.includes('--compose-only')){
  const previous=JSON.parse(await readFile(path.join(output,'log-export.json'),'utf8'));
  if(previous.renderKey!==renderKey)throw Error('CSV or render settings changed; run without --compose-only to regenerate the log layer.');
  await stat(logPath);
}else{
  const healthResponse=await fetch(`${baseURL}/api/health`);
  const health=await healthResponse.json();
  if(!healthResponse.ok||!health.ok||!health.browser||!health.encoder)throw Error('Start Agent Log Studio with Chrome and FFmpeg before exporting.');
  const response=await fetch(`${baseURL}/api/exports`,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({rows,settings,format:'mp4',fps,start:0,duration})});
  const job=await response.json();
  if(!response.ok)throw Error(job.error||`Export request failed: ${response.status}`);
  let previousProgress=-10,complete=false;
  const deadline=Date.now()+10*60*1000;
  while(Date.now()<deadline){
    const statusResponse=await fetch(`${baseURL}/api/exports/${job.id}`);
    const status=await statusResponse.json();
    if(!statusResponse.ok)throw Error(status.error||'Cannot read export status.');
    if(status.progress>=previousProgress+10){console.log(`Project log export: ${status.progress}%`);previousProgress=status.progress;}
    if(['error','cancelled'].includes(status.status))throw Error(status.message);
    if(status.status==='done'){
      const download=await fetch(`${baseURL}/api/exports/${job.id}/download`);
      if(!download.ok)throw Error(`Log download failed: ${download.status}`);
      await writeFile(logPath,Buffer.from(await download.arrayBuffer()));
      await writeFile(path.join(output,'log-export.json'),JSON.stringify({renderKey,job:status,fps,duration},null,2)+'\n');
      complete=true;break;
    }
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  if(!complete){
    await fetch(`${baseURL}/api/exports/${job.id}`,{method:'DELETE'});
    throw Error('Log export exceeded ten minutes and was cancelled.');
  }
}

const browser=await chromium.launch({executablePath,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1920,height:1080}});
  await page.setContent('<!doctype html><html lang="zh-CN"><body style="margin:0"><canvas width="1920" height="1080"></canvas></body></html>');
  const fonts=await Promise.all([
    {family:'Geist',weight:'400',file:'Geist-Regular.ttf'},
    {family:'Geist',weight:'600',file:'Geist-SemiBold.ttf'},
    {family:'Geist Mono',weight:'400',file:'GeistMono-Regular.ttf'},
  ].map(async font=>({...font,data:(await readFile(path.join(root,'public/fonts/geist',font.file))).toString('base64')})));
  await page.evaluate(async fonts=>{
    for(const font of fonts){
      const face=new FontFace(font.family,`url(data:font/ttf;base64,${font.data})`,{weight:font.weight});
      document.fonts.add(await face.load());
    }
    await document.fonts.ready;
  },fonts);
  const png=await page.evaluate(({layout,rowCount})=>{
    const canvas=document.querySelector('canvas'),c=canvas.getContext('2d');
    const sans='Geist, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
    const mono='"Geist Mono", "Noto Sans CJK SC", monospace';
    const box=(x,y,w,h,r,fill,stroke)=>{c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}};
    const text=(value,x,y,size,color='#171717',weight=400,font=sans)=>{c.font=`${weight} ${size}px ${font}`;c.fillStyle=color;c.fillText(value,x,y);};
    c.fillStyle='#ffffff';c.fillRect(0,0,1920,1080);
    text('Agent Log Studio',64,57,26,'#171717',600);
    text('EXAMPLE 01 / CAT VLA',1550,55,19,'#666666',400,mono);
    c.fillStyle='#eaeaea';c.fillRect(64,84,1792,1);
    text('猫咪 VLA',64,166,64,'#000000',600);
    text('萝卜？纸巾？真棒！',415,156,29,'#666666');
    text('Vision → Language → Action',704,156,28,'#171717');
    text('口令',1614,150,20,'#666666');
    box(1694,110,162,64,6,'#ffffff','#eaeaea');
    text('01 / Vision',64,208,18,'#666666',400,mono);
    text('视觉输入',230,208,18,'#666666');
    text('02 / Agent log',704,208,18,'#666666',400,mono);
    text('运行日志',936,208,18,'#666666');
    text(`${rowCount} EVENTS / 30 FPS`,1610,208,18,'#666666',400,mono);
    box(layout.video.x-1,layout.video.y-1,layout.video.width+2,layout.video.height+2,0,'#000000','#eaeaea');
    box(layout.log.x-1,layout.log.y-1,layout.log.width+2,layout.log.height+2,0,'#000000','#eaeaea');
    text('来源：超级无敌大开门 · 抖音 dakaimenPYQ',64,1049,18,'#666666');
    c.fillStyle='#eaeaea';c.fillRect(64,1077,1792,2);
    return canvas.toDataURL('image/png').split(',')[1];
  },{layout,rowCount:rows.length});
  await writeFile(path.join(output,'layout.png'),Buffer.from(png,'base64'));
}finally{await browser.close();}

const font=process.env.CAT_VLA_FONT||'/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc';
await stat(font);
const filterPath=value=>value.replaceAll('\\','/').replaceAll(':','\\:').replaceAll("'","'\\''");
let titles='';
for(const [i,phase] of phases.entries()){
  const end=phases[i+1]?.time??duration;
  const titleFile=path.join(output,`phase-${i}-title.txt`),detailFile=path.join(output,`phase-${i}-detail.txt`),commandFile=path.join(output,`phase-${i}-command.txt`);
  await writeFile(titleFile,phase.title);await writeFile(detailFile,phase.detail);await writeFile(commandFile,phase.command);
  const enabled=`gte(t,${phase.time})*lt(t,${end})`;
  titles+=`,drawtext=fontfile='${filterPath(font)}':textfile='${filterPath(commandFile)}':expansion=none:fontcolor=0x171717:fontsize=36:x=1736:y=124:enable='${enabled}'`;
  titles+=`,drawtext=fontfile='${filterPath(font)}':textfile='${filterPath(titleFile)}':expansion=none:fontcolor=0x171717:fontsize=26:x=704:y=1025:enable='${enabled}'`;
  titles+=`,drawtext=fontfile='${filterPath(font)}':textfile='${filterPath(detailFile)}':expansion=none:fontcolor=0x666666:fontsize=20:x=1144:y=1031:enable='${enabled}'`;
}
const filters=`[0:v]fps=${fps},scale=${layout.video.width}:${layout.video.height},setsar=1,trim=duration=${duration},setpts=PTS-STARTPTS[cat];`+
  `[1:v]setpts=PTS-STARTPTS,hue=s=0[log];[2:v][cat]overlay=${layout.video.x}:${layout.video.y}:shortest=1[vision];`+
  `[vision][log]overlay=${layout.log.x}:${layout.log.y}:shortest=1${titles}[v];`+
  `color=c=black:s=1792x2:r=${fps}:d=${duration},format=rgba,geq=r=0:g=0:b=0:a='if(lte(X,1792*T/${duration}),255,0)'[progress];`+
  `[v][progress]overlay=64:1077:shortest=1,format=yuv420p[out]`;
await writeFile(path.join(output,'compose-filter.txt'),filters+'\n');
console.log('Composing the carrot/tissue footage with original audio and the project-generated log animation.');
await run(process.env.CAT_VLA_FFMPEG||'ffmpeg',['-y','-hide_banner','-loglevel','warning','-filter_complex_threads','2',
  '-i',sourcePath,'-i',logPath,'-loop','1','-framerate',String(fps),'-i',path.join(output,'layout.png'),
  '-filter_complex',filters,
  '-map','[out]','-map','0:a:0','-t',String(duration),'-r',String(fps),'-c:v','libx264','-crf','18','-preset','medium','-threads','4',
  '-c:a','copy','-movflags','+faststart',finalPath]);
const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_entries',
  'stream=codec_name,width,height,r_frame_rate,nb_read_frames:format=duration,size','-of','json',finalPath],{encoding:'utf8'}));
const video=probe.streams.find(stream=>stream.codec_name==='h264');
const frameCount=Math.round(fps*duration);
if(!video||video.width!==1920||video.height!==1080||Number(video.nb_read_frames)!==frameCount||!probe.streams.some(stream=>stream.codec_name==='aac'))throw Error('Final video dimensions, decoded frame count, or original audio do not match the example.');
await writeFile(path.join(output,'verification.json'),JSON.stringify({source,sourceProbe,layout,renderKey,rows:rows.length,phases,audio:'Original AAC packets copied without re-encoding',probe},null,2)+'\n');
await run(process.env.CAT_VLA_FFMPEG||'ffmpeg',['-y','-hide_banner','-loglevel','error','-ss','12.5','-i',finalPath,'-frames:v','1',path.join(output,'poster.png')]);
console.log(`Created ${finalPath} (${duration}s, ${fps} fps, 1920×1080, ${frameCount} decoded frames).`);
