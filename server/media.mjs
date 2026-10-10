import path from 'node:path';
import {createReadStream,createWriteStream} from 'node:fs';
import {mkdir,readFile,writeFile,stat,unlink,rename} from 'node:fs/promises';
import {pipeline} from 'node:stream/promises';
import {Transform} from 'node:stream';
import {spawn} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import ffmpeg from 'ffmpeg-static';
import {MAX_MEDIA_BYTES} from '../src/composition.js';
import {getVideoExample} from '../src/video-examples.js';

export function createMediaStore(root){
  const directory=path.join(root,'output','media'),items=new Map();
  const file=id=>path.join(directory,`${id}.mp4`);
  const jsonFile=id=>path.join(directory,`${id}.json`);
  async function get(id){
    if(!/^[a-f0-9-]{36}$/.test(id))throw Error('视频素材不存在');
    if(items.has(id))return items.get(id);
    const item=JSON.parse(await readFile(jsonFile(id),'utf8'));await stat(file(id));items.set(id,item);return item;
  }
  function publicItem(item){const {encoder,...data}=item;return {...data,url:`/api/media/${item.id}/file`};}
  function command(item,args,onData){
    return new Promise((resolve,reject)=>{
      const child=spawn(ffmpeg,args,{stdio:['ignore','ignore','pipe']});item.encoder=child;let output='';
      child.stderr.on('data',chunk=>{output=(output+chunk).slice(-12000);onData?.(output);});
      child.on('error',reject);child.on('close',code=>{delete item.encoder;code===0?resolve(output):reject(Error('无法处理该视频，请确认文件能够播放，或换用 MP4、MOV、WebM 文件。',{cause:output.slice(-1800)}));});
    });
  }
  async function probe(item,input){
    const text=await command(item,['-hide_banner','-i',input,'-map','0:v:0','-frames:v','1','-f','null','-']);
    const d=/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(text);
    const video=[...text.matchAll(/Video:[^\n]*?\b(\d{2,5})x(\d{2,5})\b/g)].at(-1);
    if(!d||!video)throw Error('无法读取视频时长或尺寸，请使用有效的视频文件');
    return {duration:+d[1]*3600 + +d[2]*60 + +d[3],width:+video[1],height:+video[2],hasAudio:/Audio:/.test(text),aac:/Audio: aac/.test(text)};
  }
  async function prepare(item,input){
    try{
      item.message='正在准备视频预览…';const info=await probe(item,input);
      if(info.duration<=0||info.duration>1200)throw Error('原视频时长须大于 0 且不超过 20 分钟');
      if(item.cancelled)throw Error('cancelled');
      const args=['-y','-hide_banner','-i',input,'-map','0:v:0','-map','0:a:0?',
        '-vf',"scale=w='min(1920,iw)':h='min(1920,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1",
        '-c:v','libx264','-crf','18','-preset','fast','-pix_fmt','yuv420p','-threads','4',
        '-c:a',info.aac?'copy':'aac','-movflags','+faststart',file(item.id)];
      await command(item,args,text=>{const t=[...text.matchAll(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/g)].at(-1);if(t)item.progress=Math.min(98,Math.round((+t[1]*3600 + +t[2]*60 + +t[3])/info.duration*98));});
      if(item.cancelled)throw Error('cancelled');
      const prepared=await probe(item,file(item.id));Object.assign(item,prepared,{status:'ready',progress:100,message:'视频已就绪'});
      await writeFile(jsonFile(item.id),JSON.stringify(publicItem(item))+'\n');
    }catch(error){item.status=item.cancelled?'cancelled':'error';item.message=item.cancelled?'已取消':`视频处理失败：${error.message}`;await unlink(file(item.id)).catch(()=>{});}
    finally{await unlink(input).catch(()=>{});}
  }
  async function create(input,name){
    await mkdir(directory,{recursive:true});
    const item={id:randomUUID(),name:name.slice(0,160),status:'processing',progress:0,message:'正在读取视频…'};items.set(item.id,item);
    void prepare(item,input);return publicItem(item);
  }
  async function upload(req){
    await mkdir(directory,{recursive:true});const incoming=path.join(directory,`${randomUUID()}.upload`);let bytes=0;
    try{
      const limit=new Transform({transform(chunk,encoding,callback){bytes+=chunk.length;callback(bytes>MAX_MEDIA_BYTES?Error('视频最大支持 200 MB'):null,chunk);}});
      await pipeline(req,limit,createWriteStream(incoming,{flags:'wx'}));
      if(!bytes)throw Error('视频文件为空');
      return await create(incoming,decodeURIComponent(req.headers['x-file-name']||'video.mp4').replaceAll('\\','/').split('/').at(-1));
    }catch(error){await unlink(incoming).catch(()=>{});throw error;}
  }
  async function example(id='cat-vla'){
    // The identifier selects a fixed public source, never a client-supplied URL.
    const preset=getVideoExample(id),source=preset.source;
    await mkdir(directory,{recursive:true});
    const input=path.join(directory,`${randomUUID()}.upload`);
    const cached=path.join(root,'output','examples',preset.id,source.filename||'source.mp4');let data;
    try{data=await readFile(cached);}catch(error){if(error.code!=='ENOENT')throw error;}
    if(!data){
      // curl uses the environment's HTTPS proxy and CA configuration.
      await new Promise((resolve,reject)=>{
        const child=spawn('curl',['--fail','--location','--silent','--show-error','--max-time','60','--max-filesize',String(MAX_MEDIA_BYTES),'--output',input,source.url],{stdio:['ignore','ignore','pipe']});
        let message='';child.stderr.on('data',d=>message=(message+d).slice(-1000));child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error('示例素材下载失败，请检查网络后重试。',{cause:message})));
      }).catch(async error=>{await unlink(input).catch(()=>{});throw error;});data=await readFile(input);
    }
    if(createHash('sha256').update(data).digest('hex')!==source.sha256){await unlink(input).catch(()=>{});throw Error('示例素材校验失败');}
    await mkdir(path.dirname(cached),{recursive:true});
    const cacheTemp=`${cached}.${randomUUID()}.download`;
    try{await writeFile(cacheTemp,data);await rename(cacheTemp,cached);}finally{await unlink(cacheTemp).catch(()=>{});}
    await writeFile(input,data);return create(input,preset.mediaName);
  }
  async function send(req,res,item){
    if(item.status!=='ready')throw Error('视频尚未准备完成');
    const info=await stat(file(item.id));let start=0,end=info.size-1,status=200;
    const headers={'Content-Type':'video/mp4','Accept-Ranges':'bytes','Cache-Control':'private, max-age=3600'};
    if(req.headers.range){
      const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if(!m||(!m[1]&&!m[2])){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return;}
      if(!m[1])start=Math.max(0,info.size-Number(m[2]));else{start=Number(m[1]);if(m[2])end=Math.min(end,Number(m[2]));}
      if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=info.size){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return;}
      status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;
    }
    headers['Content-Length']=end-start+1;res.writeHead(status,headers);
    if(req.method==='HEAD')res.end();else createReadStream(file(item.id),{start,end}).pipe(res);
  }
  return {get,publicItem,file,upload,example,send,cancel(item){item.cancelled=true;item.encoder?.kill('SIGTERM');}};
}
