import {renderFrame} from './render.js';

export const compositionDefaults={enabled:false,title:'Agent 思维链',subtitle:'Vision → Language → Action',credit:'',sourceStart:0,sourceEnd:0,logOffset:0,keepAudio:true,monochrome:false,fit:'contain',phases:[]};
export const MAX_MEDIA_BYTES=200*1024*1024;
export function validateComposition(c,media){
  if(!c||typeof c!=='object'||!media)throw Error('请先选择原视频');
  for(const [key,max] of [['title',80],['subtitle',120],['credit',160]])if(typeof c[key]!=='string'||c[key].length>max)throw Error('标题或署名过长');
  if(!Number.isFinite(c.sourceStart)||!Number.isFinite(c.sourceEnd)||c.sourceStart<0||c.sourceEnd<=c.sourceStart||c.sourceEnd>media.duration+.02)throw Error('视频片段须位于原视频范围内，结束时间须大于开始时间');
  if(!Number.isFinite(c.logOffset)||Math.abs(c.logOffset)>1200)throw Error('日志延迟须在 -1200 至 1200 秒之间');
  if(!['contain','cover'].includes(c.fit)||typeof c.keepAudio!=='boolean')throw Error('视频显示或音频设置无效');
  if(c.monochrome!==undefined&&typeof c.monochrome!=='boolean')throw Error('日志配色设置无效');
  if(!Array.isArray(c.phases)||c.phases.length>200)throw Error('阶段字幕最多 200 条');
  let previous=-1;
  for(const p of c.phases){
    if(!Number.isFinite(p.time)||p.time<0||p.time<previous||typeof p.title!=='string'||typeof p.detail!=='string'||p.title.length>80||p.detail.length>160)throw Error('阶段字幕需按非负秒数排列，标题最多 80 字，说明最多 160 字');
    previous=p.time;
  }
  return c;
}

export function compositionLayout(width,height,media){
  const scale=Math.min(width/1920,height/1080),margin=Math.round(64*scale),top=Math.round(228*scale),gap=Math.round(64*scale);
  const contentHeight=height-top-Math.round(84*scale);
  if(width/height<1.2){
    const videoHeight=Math.round(contentHeight*.43),logY=top+videoHeight+gap;
    return {scale,margin,video:{x:margin,y:top,width:width-2*margin,height:videoHeight},log:{x:margin,y:logY,width:width-2*margin,height:height-logY-Math.round(84*scale)}};
  }
  const videoWidth=Math.max(2,Math.round(Math.min(contentHeight*media.width/media.height,(width-2*margin)*.4)/2)*2);
  const logX=Math.max(margin+videoWidth+gap,Math.round(width*11/30));
  return {scale,margin,video:{x:margin,y:top,width:videoWidth,height:contentHeight},log:{x:logX,y:top,width:width-margin-logX,height:contentHeight}};
}

// The browser preview and server export paint the same layer. The transparent
// video rectangle is filled by a decoded video frame or the FFmpeg input.
export function renderComposition(canvas,rows,settings,time,c,media,video=null,fps=30){
  const {width,height}=settings;
  if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
  const ctx=canvas.getContext('2d'),layout=compositionLayout(width,height,media),{scale,margin,log}=layout;
  ctx.clearRect(0,0,width,height);ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);
  const sans='Geist, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
  const mono='"Geist Mono", "Noto Sans CJK SC", monospace';
  function text(value,x,y,size,color='#171717',weight=400,font=sans,maxWidth=width-margin-x){
    if(maxWidth<=0)return;
    ctx.font=`${weight} ${size*scale}px ${font}`;ctx.fillStyle=color;ctx.textBaseline='alphabetic';
    let copy=value;while(copy&&ctx.measureText(copy).width>maxWidth)copy=copy.slice(0,-1);
    if(copy!==value)copy=copy.slice(0,-1)+'…';ctx.fillText(copy,x,y);
  }
  text('Agent Log Studio',margin,57*scale,26,'#171717',600);
  text('VISION / LANGUAGE / ACTION',width-margin-320*scale,55*scale,17,'#666666',400,mono);
  ctx.fillStyle='#eaeaea';ctx.fillRect(margin,84*scale,width-2*margin,scale);
  text(c.title,margin,166*scale,64,'#000000',600,sans,width/height<1.2?width-2*margin-190*scale:351*scale);
  text(c.subtitle,width/height<1.2?margin:415*scale,width/height<1.2?198*scale:156*scale,29,'#666666',400,sans,width/height<1.2?width-2*margin:log.x-440*scale);
  if(width/height>=1.2)text('Vision → Language → Action',log.x,156*scale,28,'#171717',400,sans,width-margin-log.x-240*scale);
  const logTime=time-c.logOffset;
  const instruction=rows.filter(row=>row.type==='instruction'&&row.time<=logTime).at(-1);
  const command=(instruction?.[settings.language==='en'?'en':'zh']||instruction?.en||'').match(/target\s*=\s*([^；;，,\s]+)/i)?.[1]||'';
  const badgeX=width-margin-162*scale;
  ctx.strokeStyle='#eaeaea';ctx.lineWidth=scale;ctx.beginPath();ctx.roundRect(badgeX,110*scale,162*scale,64*scale,6*scale);ctx.stroke();
  text(command||'—',badgeX+22*scale,153*scale,32,'#171717',400,sans,118*scale);
  const v=layout.video;
  text('01 / Vision',v.x,v.y-20*scale,18,'#666666',400,mono,v.width);
  text('02 / Agent log',log.x,log.y-20*scale,18,'#666666',400,mono,log.width);
  text(`${rows.length} EVENTS / ${fps} FPS`,width-margin-245*scale,log.y-20*scale,18,'#666666',400,mono);
  ctx.clearRect(v.x,v.y,v.width,v.height);
  if(video?.readyState>=2){
    ctx.fillStyle='#000';ctx.fillRect(v.x,v.y,v.width,v.height);
    const ratio=c.fit==='cover'?Math.max(v.width/media.width,v.height/media.height):Math.min(v.width/media.width,v.height/media.height);
    const w=media.width*ratio,h=media.height*ratio;
    ctx.save();ctx.beginPath();ctx.rect(v.x,v.y,v.width,v.height);ctx.clip();ctx.drawImage(video,v.x+(v.width-w)/2,v.y+(v.height-h)/2,w,h);ctx.restore();
  }
  ctx.strokeStyle='#eaeaea';ctx.strokeRect(v.x-scale,v.y-scale,v.width+2*scale,v.height+2*scale);
  // Keep the log renderer independent of the composition canvas size.
  const logCanvas=canvas._logCanvas??=document.createElement('canvas');
  const logSettings={...settings,width:log.width,height:log.height,padding:Math.min(settings.padding,Math.floor(log.width/5),Math.floor(log.height/5))};
  const info=renderFrame(logCanvas,rows,logSettings,logTime);
  ctx.fillStyle='#000';ctx.fillRect(log.x,log.y,log.width,log.height);ctx.save();if(c.monochrome)ctx.filter='grayscale(1)';ctx.drawImage(logCanvas,log.x,log.y);ctx.restore();
  const phase=c.phases.filter(p=>p.time<=logTime).at(-1);
  text(c.credit,margin,height-(width/height<1.2?54:31)*scale,18,'#666666',400,sans,width/height<1.2?width-2*margin:log.x-margin-20*scale);
  if(phase){text(phase.title,log.x,height-29*scale,26,'#171717',400,sans,Math.min(420*scale,log.width*.45));text(phase.detail,log.x+440*scale,height-29*scale,20,'#666666',400,sans,log.width-440*scale);}
  ctx.fillStyle='#eaeaea';ctx.fillRect(margin,height-3*scale,width-2*margin,2*scale);
  ctx.fillStyle='#000';ctx.fillRect(margin,height-3*scale,(width-2*margin)*Math.max(0,Math.min(1,time/(c.sourceEnd-c.sourceStart))),2*scale);
  return {...info,layout};
}
